// Explicit schema installation only. Never deletes a memory or schedules cleanup.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const database = new URL(process.env.DATABASE_URL);
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
assert.equal(database.hostname, `db.${project}.supabase.co`, "Unexpected database host");
const env = { ...process.env, PGHOST: database.hostname, PGPORT: database.port || "5432",
  PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password),
  PGDATABASE: database.pathname.slice(1), PGSSLMODE: "verify-full",
  PGSSLROOTCERT: resolve(".sites-runtime/supabase-root.crt"), PGCONNECT_TIMEOUT: "15" };
function sql(input) {
  const result = spawnSync("psql", ["-X", "-Atq", "-v", "ON_ERROR_STOP=1"], { input, env, encoding: "utf8", windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error("Database operation failed; no credentials logged");
  return result.stdout.trim();
}
const installed = sql("begin read only; select exists(select 1 from information_schema.columns where table_schema='public' and table_name='memories' and column_name='deletion_started_at'); rollback;");
if (process.argv.includes("--fix-completed-uploads")) {
  assert.equal(installed, "t", "Install migration 0011 first");
  sql(readFileSync("supabase/migrations/0012_completed_media_deletion.sql", "utf8"));
  console.log("Migration 0012 applied. No contribution deleted; no scheduled purge.");
}
else if (installed === "t") console.log("Migration 0011 already present; no change.");
else {
  assert.equal(installed, "f");
  sql(readFileSync("supabase/migrations/0011_memory_deletion.sql", "utf8"));
  console.log("Migration 0011 applied. No contribution deleted; no scheduled purge.");
}
