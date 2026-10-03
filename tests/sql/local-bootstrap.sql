-- Local disposable PostgreSQL only: minimal Supabase auth emulation, not production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
\ir ../../supabase/migrations/0001_initial_schema.sql
\ir ../../supabase/migrations/0002_single_guestbook_entry.sql
\ir ../../supabase/migrations/0003_content_access_guards.sql
\ir content-access.sql
