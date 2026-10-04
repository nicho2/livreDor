begin;
create function pg_temp.lifecycle_denied(q text) returns void language plpgsql as $$
begin
  begin execute q; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'Expected refusal: %',q;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('d0000000-0000-4000-8000-000000000001','organizer@example.test',now()),
('d0000000-0000-4000-8000-000000000002','reader@example.test',now());
insert into public.projects(id,slug,title,subject_name,status,created_by) values
('e0000000-0000-4000-8000-000000000001','lifecycle-test','TEST','TEST','open','d0000000-0000-4000-8000-000000000001');
insert into public.project_members(project_id,user_id,role) values
('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','organizer');
set local role authenticated;
select set_config('request.jwt.claim.sub','d0000000-0000-4000-8000-000000000001',true);
update public.projects set theme='wedding' where slug='lifecycle-test';
select pg_temp.lifecycle_denied($q$update public.projects set theme='arbitrary' where slug='lifecycle-test'$q$);
select pg_temp.lifecycle_denied($q$update public.projects set archive_exported_at=now() where slug='lifecycle-test'$q$);
select pg_temp.lifecycle_denied($q$update public.projects set deletion_started_at=now() where slug='lifecycle-test'$q$);
select pg_temp.lifecycle_denied($q$update public.projects set status='archived' where slug='lifecycle-test'$q$);
update public.projects set status='closed' where slug='lifecycle-test';
select pg_temp.lifecycle_denied($q$update public.projects set status='archived' where slug='lifecycle-test'$q$);
select pg_temp.lifecycle_denied($q$select public.confirm_project_export('e0000000-0000-4000-8000-000000000001',1)$q$);
select pg_temp.lifecycle_denied($q$select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','lifecycle-test')$q$);
reset role;
do $$ begin
  if public.confirm_project_export('e0000000-0000-4000-8000-000000000001',999) then raise exception 'stale export accepted'; end if;
end $$;
select public.confirm_project_export(id,content_revision) from public.projects where slug='lifecycle-test';
update public.projects set status='archived' where slug='lifecycle-test';
select pg_temp.lifecycle_denied($q$select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','lifecycle-test')$q$);
select pg_temp.lifecycle_denied($q$select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','wrong-slug')$q$);
insert into public.memories(project_id,author_id,display_name,body,status) values
('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','TEST','TEST','published');
do $$ begin if exists(select 1 from public.projects where slug='lifecycle-test' and archive_exported_at is not null) then raise exception 'content did not invalidate export'; end if; end $$;
select pg_temp.lifecycle_denied($q$select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','lifecycle-test')$q$);
select public.confirm_project_export(id,content_revision) from public.projects where slug='lifecycle-test';
insert into public.media_assets(id,project_id,owner_id,kind,object_key,original_filename,mime_type,size_bytes) values
('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','image','test-key','test.png','image/png',68);
select public.confirm_project_export(id,content_revision) from public.projects where slug='lifecycle-test';
select pg_temp.lifecycle_denied($q$select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','lifecycle-test')$q$);
select pg_temp.lifecycle_denied($q$update public.media_assets set created_at=now()-interval '1 day' where id='f0000000-0000-4000-8000-000000000001'$q$);
delete from public.media_assets where id='f0000000-0000-4000-8000-000000000001';
select public.confirm_project_export(id,content_revision) from public.projects where slug='lifecycle-test';
select public.begin_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','lifecycle-test');
select pg_temp.lifecycle_denied($q$update public.projects set status='open' where slug='lifecycle-test'$q$);
select pg_temp.lifecycle_denied($q$update public.memories set body='changed' where project_id='e0000000-0000-4000-8000-000000000001'$q$);
select public.finish_project_deletion('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001');
do $$ begin
  if exists(select 1 from public.projects where slug='lifecycle-test') or exists(select 1 from public.memories where project_id='e0000000-0000-4000-8000-000000000001') then raise exception 'project cascade incomplete'; end if;
  if not exists(select 1 from auth.users where id='d0000000-0000-4000-8000-000000000001') then raise exception 'account removed'; end if;
end $$;
rollback;
