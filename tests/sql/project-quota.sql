-- Disposable local database only. All fixtures roll back.
begin;
create function pg_temp.quota_assert(ok boolean, label text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end; $$;
create function pg_temp.quota_denied(query text, expected text, label text) returns void language plpgsql as $$
begin
  begin execute query;
  exception when others then
    if sqlstate = expected then raise notice 'PASS: %',label; return; end if;
    raise;
  end;
  raise exception 'FAIL: % (accepted)',label;
end; $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('c0000000-0000-4000-8000-000000000001','quota@example.test',now()),
 ('c0000000-0000-4000-8000-000000000002','unverified-quota@example.test',null);
set local role authenticated;
select pg_temp.quota_denied($q$select public.create_project('bypass','TEST','TEST')$q$,'42501','old RPC cannot bypass quota');
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',9999,'bypass','TEST','TEST')$q$,'42501','browser cannot choose actor or limit');
reset role;
set local role anon;
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'bypass','TEST','TEST')$q$,'42501','anonymous cannot create');
reset role;
set local role service_role;
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000002',3,'unverified','TEST','TEST')$q$,'42501','unverified actor refused');
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',-1,'invalid','TEST','TEST')$q$,'23514','negative limit refused');
select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'quota-one','TEST','TEST');
select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'quota-two','TEST','TEST');
select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'quota-three','TEST','TEST');
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'quota-four','TEST','TEST')$q$,'P0001','fourth project refused');
reset role;
select pg_temp.quota_assert((select count(*)=3 from public.projects),'exactly three projects');
select pg_temp.quota_assert((select count(*)=3 from public.project_members),'no orphan membership after refusal');
update public.projects set status='archived' where slug='quota-one';
set local role service_role;
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',3,'still-full','TEST','TEST')$q$,'P0001','archived project still counts');
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',0,'paused','TEST','TEST')$q$,'P0001','zero pauses creation');
select pg_temp.quota_denied($q$select public.create_project_limited('c0000000-0000-4000-8000-000000000001',1,'lowered','TEST','TEST')$q$,'P0001','lowered limit preserves existing projects');
select public.create_project_limited('c0000000-0000-4000-8000-000000000001',4,'quota-four','TEST','TEST');
reset role;
select pg_temp.quota_assert((select count(*)=4 from public.projects),'raised limit permits next project');
rollback;
