# Requires PostgreSQL tools on PATH. Never connects to Supabase or an existing DB.
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('livredor-rls-' + [guid]::NewGuid())
$testData = Join-Path $testRoot 'data'
New-Item -ItemType Directory -Path $testRoot | Out-Null
$testListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$testListener.Start()
$testPort = $testListener.LocalEndpoint.Port
$testListener.Stop()
$testStarted = $false
try {
    & initdb -D $testData -U postgres -A trust --encoding=UTF8 --no-locale
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
    & pg_ctl -D $testData -l (Join-Path $testRoot 'postgres.log') -o "-h 127.0.0.1 -p $testPort" -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed' }
    $testStarted = $true
    & psql -X -h 127.0.0.1 -p $testPort -U postgres -d postgres -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot '../tests/sql/local-bootstrap.sql')
    if ($LASTEXITCODE -ne 0) { throw 'RLS tests failed' }
} finally {
    if ($testStarted) { & pg_ctl -D $testData -m fast -w stop }
    Write-Host "Temporary test files retained at $testRoot"
}
