// Local disposable PostgreSQL fixture only. Never uses .env.local or Supabase.
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const port = process.argv[2];
if (!/^[0-9]{1,5}$/.test(port ?? "")) throw new Error("Local test port required");
const args = ["-X", "-h", "127.0.0.1", "-p", port, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA"];
function sql(input) {
  const p = spawnSync("psql", args, { input, encoding: "utf8", windowsHide: true });
  assert.equal(p.status, 0, p.stderr);
  return p.stdout.trim();
}
assert.equal(sql("select count(*) from information_schema.columns where table_schema='auth' and table_name='users';"), "3", "Not the disposable Auth fixture");
assert.equal(sql("select count(*) from public.projects;"), "0", "Test database must be empty");
const actor = "d0000000-0000-4000-8000-000000000001";
sql(`insert into auth.users(id,email,email_confirmed_at) values('${actor}','parallel@example.test',now());`);
function create(slug) {
  return new Promise((resolve) => {
    const p = spawn("psql", args, { windowsHide: true });
    let stderr = "";
    p.stdout.on("data", () => {}); p.stderr.on("data", (chunk) => { stderr += chunk; });
    p.on("close", (status) => resolve({ status, stderr }));
    p.stdin.end(`begin; set local role service_role; select public.create_project_limited('${actor}',1,'${slug}','TEST','TEST'); select pg_sleep(0.5); commit;`);
  });
}
try {
  const results = await Promise.all([create("parallel-one"), create("parallel-two")]);
  assert.equal(results.filter((r) => r.status === 0).length, 1);
  assert.equal(results.filter((r) => r.stderr.includes("PROJECT_LIMIT_REACHED")).length, 1);
  assert.equal(sql("select count(*) from public.projects;"), "1");
  assert.equal(sql("select count(*) from public.project_members;"), "1");
  console.log("PASS: simultaneous creations allocate exactly one remaining slot");
} finally {
  sql(`delete from public.projects where created_by='${actor}' and slug in ('parallel-one','parallel-two'); delete from auth.users where id='${actor}';`);
}
