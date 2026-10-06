// Read-only verification of the configured Supabase. Never applies migrations or fixtures.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const database = new URL(process.env.DATABASE_URL);
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
assert.equal(database.hostname, `db.${project}.supabase.co`, "Unexpected database host");
const env = {
  ...process.env, PGHOST: database.hostname, PGPORT: database.port || "5432",
  PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password),
  PGDATABASE: database.pathname.slice(1) || "postgres", PGSSLMODE: "verify-full",
  PGSSLROOTCERT: resolve(".sites-runtime/supabase-root.crt"), PGCONNECT_TIMEOUT: "15",
};
const sql = `begin read only;
do $$ begin
  if not exists(select 1 from pg_stat_ssl where pid=pg_backend_pid() and ssl) then raise exception 'TLS required'; end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('projects','project_members','profiles','guestbook_entries','memories','media_assets','project_organizer_invites','organizer_messages') and c.relrowsecurity) <> 8 then raise exception 'Missing RLS'; end if;
  if (select count(*) from pg_policies where schemaname='public' and ((tablename='projects' and policyname='projects readable') or (tablename in ('guestbook_entries','memories') and policyname='content readable') or (tablename='media_assets' and policyname='media readable')) and roles=array['authenticated']::name[]) <> 4 then raise exception 'Read policies differ'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_project_limited','create_project_with_organizer','confirm_project_export','begin_project_deletion','finish_project_deletion','begin_memory_deletion','finish_memory_deletion')) <> 7 then raise exception 'Missing administrative RPC'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_project_limited','create_project_with_organizer','confirm_project_export','begin_project_deletion','finish_project_deletion','begin_memory_deletion','finish_memory_deletion') and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then raise exception 'Client administrative privilege'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('send_organizer_message','mark_organizer_message_read') and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')) <> 2 then raise exception 'Contact RPC privileges'; end if;
  if has_table_privilege('anon','public.organizer_messages','SELECT') or has_table_privilege('authenticated','public.organizer_messages','INSERT') or has_table_privilege('authenticated','public.organizer_messages','UPDATE') then raise exception 'Contact table privileges'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='memories' and column_name='deletion_started_at') then raise exception 'Memory deletion field missing'; end if;
  if not exists(select 1 from pg_proc p where p.oid='public.begin_memory_deletion(uuid,uuid)'::regprocedure and pg_get_functiondef(p.oid) like '%status=''draft''%') then raise exception 'Completed media correction missing'; end if;
end $$;
set local role anon;
select json_build_object('projects',(select count(*) from public.projects),'guestbook_entries',(select count(*) from public.guestbook_entries),'memories',(select count(*) from public.memories),'media_assets',(select count(*) from public.media_assets));
rollback;`;
const result = spawnSync("psql", ["-X", "-Atq", "-v", "ON_ERROR_STOP=1"], {
  input: sql, env, encoding: "utf8", windowsHide: true, timeout: 60000,
});
if (result.status !== 0) { console.error("FAIL: read-only Supabase RLS audit; inspect configuration, TLS and policies."); process.exit(1); }
const counts = JSON.parse(result.stdout.trim());
assert.ok(Object.values(counts).every(count => count === 0), "Anonymous reads exposed rows");
console.log(JSON.stringify({ verifiedTls: true, readOnly: true, rlsTables: 8, authenticatedReadPolicies: 4, serverOnlyRpcs: 7, privateContactRpcs: 2, completedMediaCorrection: true, anonymousCounts: counts }));
