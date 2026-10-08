-- Disposable/development database only. Everything is rolled back.
begin;
create function pg_temp.invite_check(q text, expected bigint, label text)
returns void language plpgsql as $$
declare actual bigint;
begin
  execute q into actual;
  if actual is distinct from expected then raise exception '%: expected %, got %', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end $$;
create function pg_temp.invite_denied(q text) returns void language plpgsql as $$
begin
  begin execute q; exception when insufficient_privilege then return; end;
  raise exception 'Expected denial: %', q;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('a1300000-0000-4000-8000-000000000001','owner@example.test',now()),
('a1300000-0000-4000-8000-000000000002','reader@example.test',now()),
('a1300000-0000-4000-8000-000000000003','outsider@example.test',now()),
('a1300000-0000-4000-8000-000000000004','unverified@example.test',null),
('a1300000-0000-4000-8000-000000000005','organizer@example.test',now());
insert into public.projects(id,slug,title,subject_name,status,created_by) values
('b1300000-0000-4000-8000-000000000001','invitation-first','TEST','TEST','open','a1300000-0000-4000-8000-000000000001'),
('b1300000-0000-4000-8000-000000000002','invitation-other','TEST','TEST','open','a1300000-0000-4000-8000-000000000001');
insert into public.project_members(project_id,user_id,role)
select id,'a1300000-0000-4000-8000-000000000001','organizer' from public.projects where slug like 'invitation-%';
insert into public.memories(project_id,author_id,display_name,body,status)
select id,'a1300000-0000-4000-8000-000000000001','TEST','TEST','published' from public.projects where slug like 'invitation-%';
insert into public.guestbook_entries(project_id,author_id,display_name,message,status)
select id,'a1300000-0000-4000-8000-000000000001','TEST','TEST','published' from public.projects where slug like 'invitation-%';
insert into public.media_assets(project_id,owner_id,kind,object_key,original_filename,mime_type,size_bytes,status)
select id,'a1300000-0000-4000-8000-000000000001','image',id || '/test.png','test.png','image/png',68,'published' from public.projects where slug like 'invitation-%';
select public.shared_project_invitation('b1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000001',repeat('a',64));
select pg_temp.invite_check($q$select (public.shared_project_invitation('b1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000001',repeat('b',64))=repeat('a',64))::int$q$,1,'same shared link retained');
set local role anon;
select pg_temp.invite_denied($q$select public.accept_shared_project_invitation('invitation-first',repeat('a',64))$q$);
select pg_temp.invite_check('select count(*) from public.projects',0,'anonymous metadata denied');
reset role;
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('a',64))::int$q$,0,'unconfirmed email refused');
reset role;
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.invite_check('select count(*) from public.projects',0,'connected stranger sees no projects');
select pg_temp.invite_denied('select * from public.project_shared_invites');
select pg_temp.invite_denied($q$select public.shared_project_invitation('b1300000-0000-4000-8000-000000000001',auth.uid(),repeat('a',64))$q$);
select pg_temp.invite_denied($q$select public.join_project('b1300000-0000-4000-8000-000000000001')$q$);
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('f',64))::int$q$,0,'wrong token refused');
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-other',repeat('a',64))::int$q$,0,'token cannot join another project');
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('a',64))::int$q$,1,'invitation creates reading membership');
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first')::int$q$,1,'member can return without token');
select pg_temp.invite_check('select count(*) from public.projects',1,'only joined project listed');
select pg_temp.invite_check('select count(*) from public.memories',1,'other memories isolated');
select pg_temp.invite_check('select count(*) from public.guestbook_entries',1,'other guestbook isolated');
select pg_temp.invite_check('select count(*) from public.media_assets',1,'other media isolated');
select pg_temp.invite_check($q$select public.is_project_public('b1300000-0000-4000-8000-000000000002')::int$q$,0,'helper does not leak other project');
reset role;
select public.shared_project_invitation('b1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000001',repeat('b',64),true);
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('a',64))::int$q$,0,'renewal invalidates old link');
reset role;
update public.projects set opens_at=now()+interval '1 day' where slug='invitation-first';
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('b',64))::int$q$,1,'reading before opening permitted');
select pg_temp.invite_check($q$select public.can_contribute('b1300000-0000-4000-8000-000000000001')::int$q$,0,'contribution window respected');
reset role;
update public.projects set status='closed' where slug='invitation-first';
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first')::int$q$,1,'renewal and closure preserve members');
select pg_temp.invite_check('select count(*) from public.memories',1,'closed project remains readable');
reset role;
update auth.users set email_confirmed_at=now() where id='a1300000-0000-4000-8000-000000000004';
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-first',repeat('b',64))::int$q$,0,'closed collection denies new members');
reset role;
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.invite_project_organizer('b1300000-0000-4000-8000-000000000002','organizer@example.test');
reset role;
update public.projects set status='draft' where slug='invitation-other';
select set_config('request.jwt.claim.sub','a1300000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.invite_check($q$select public.accept_shared_project_invitation('invitation-other')::int$q$,1,'email organizer invitation works before metadata read');
select pg_temp.invite_check($q$select count(*) from public.project_members where user_id=auth.uid() and role='organizer'$q$,1,'organizer keeps correct role');
select pg_temp.invite_check('select count(*) from public.projects',1,'invited organizer sees draft');
reset role;
rollback;
