param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [Parameter(Mandatory = $true)][string]$ProjectSlug,
  [string]$EnvFile = '.env.local',
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$seedUri = $null
if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$seedUri)) { throw 'Origine du site invalide.' }
$seedLocal = $seedUri.Host -in @('localhost', '127.0.0.1', '[::1]', '::1')
if ($seedUri.UserInfo -or $seedUri.Query -or $seedUri.Fragment -or $seedUri.AbsolutePath -ne '/' -or
    ($seedUri.Scheme -ne 'https' -and -not ($seedLocal -and $seedUri.Scheme -eq 'http'))) { throw 'Origine HTTPS attendue (HTTP seulement pour localhost), sans chemin ni identifiants.' }
if ($ProjectSlug -cnotmatch '^test-[a-z0-9][a-z0-9-]{0,74}$') { throw 'Lien de test attendu : test-...' }
$seedRepo = Split-Path -Parent $PSScriptRoot
$seedArgs = @('--experimental-strip-types')
if ($Apply) {
  $seedEnvPath = if ([IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $seedRepo $EnvFile }
  if (-not (Test-Path -LiteralPath $seedEnvPath -PathType Leaf)) { throw 'Fichier de configuration local manquant.' }
  Write-Host "Cible : $BaseUrl/p/$ProjectSlug"
  Write-Host 'Projet TEST dédié uniquement. Création de comptes fictifs et upload R2 ; aucun email fictif. Un OTP sera envoyé à votre compte organisateur.'
  $seedConfirmation = Read-Host 'Recopiez exactement le lien du projet pour confirmer'
  if ($seedConfirmation -cne $ProjectSlug) { throw 'Confirmation incorrecte : aucun envoi.' }
  $seedArgs += "--env-file=$seedEnvPath"
}
$seedArgs += @((Join-Path $PSScriptRoot 'seed-project.mjs'), '--url', $BaseUrl, '--slug', $ProjectSlug)
if ($Apply) { $seedArgs += @('--apply', '--confirm-slug', $seedConfirmation) }
& node @seedArgs
if ($LASTEXITCODE -ne 0) { throw 'Alimentation non terminée. Aucun secret ne doit être copié dans le chat.' }
