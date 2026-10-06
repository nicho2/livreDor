begin;
create function pg_temp.memory_denied(q text) returns void language plpgsql as $$
begin
  begin execute q; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'Expected memory refusal: %',q;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('cb000000-0000-4000-8000-000000000001','organizer@example.test',now()),
('cb000000-0000-4000-8000-000000000002','author@example.test',now()),
('cb000000-0000-4000-8000-000000000003','other@example.test',now());
insert into public.projects(id,slug,title,subject_name,status,created_by) values
('cb100000-0000-4000-8000-000000000001','memory-delete-test','TEST','TEST','open','cb000000-0000-4000-8000-000000000001');
insert into public.project_members(project_id,user_id,role) values
('cb100000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001','organizer'),
('cb100000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002','contributor');
insert into public.memories(id,project_id,author_id,display_name,body,status) values
('cb200000-0000-4000-8000-000000000001','cb100000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002','TEST','TEST','published');
insert into public.media_assets(id,project_id,memory_id,owner_id,kind,object_key,original_filename,mime_type,size_bytes,status,created_at) values
('cb300000-0000-4000-8000-000000000001','cb100000-0000-4000-8000-000000000001','cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002','image','test','test.png','image/png',68,'published',now());
select pg_temp.memory_denied($q$select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000003')$q$);
select pg_temp.memory_denied($q$select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002')$q$);
delete from public.media_assets where id='cb300000-0000-4000-8000-000000000001';
insert into public.media_assets(id,project_id,memory_id,owner_id,kind,object_key,original_filename,mime_type,size_bytes,status,created_at) values
('cb300000-0000-4000-8000-000000000001','cb100000-0000-4000-8000-000000000001','cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002','image','test','test.png','image/png',68,'published',now()-interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','cb000000-0000-4000-8000-000000000002',true);
select pg_temp.memory_denied($q$select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002')$q$);
select pg_temp.memory_denied($q$update public.memories set deletion_started_at=now() where id='cb200000-0000-4000-8000-000000000001'$q$);
reset role;
update public.projects set status='closed' where slug='memory-delete-test';
select pg_temp.memory_denied($q$select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002')$q$);
update public.projects set status='open' where slug='memory-delete-test';
select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002');
select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002');
select pg_temp.memory_denied($q$update public.memories set status='published' where id='cb200000-0000-4000-8000-000000000001'$q$);
select pg_temp.memory_denied($q$update public.media_assets set status='published' where id='cb300000-0000-4000-8000-000000000001'$q$);
set local role authenticated;
select set_config('request.jwt.claim.sub','cb000000-0000-4000-8000-000000000002',true);
do $$ begin if not exists(select 1 from public.memories where id='cb200000-0000-4000-8000-000000000001') then raise exception 'Author lost retry access'; end if; end $$;
reset role;
update public.projects set status='closed' where slug='memory-delete-test';
select public.begin_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002');
select public.finish_memory_deletion('cb200000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000002');
do $$ begin
  if exists(select 1 from public.memories where id='cb200000-0000-4000-8000-000000000001') or exists(select 1 from public.media_assets where id='cb300000-0000-4000-8000-000000000001') then raise exception 'Deletion incomplete'; end if;
  if not exists(select 1 from public.projects where slug='memory-delete-test') then raise exception 'Project deleted'; end if;
end $$;
rollback;
