-- Run entire file on a DEVELOPMENT database after 0001-0005. All fixtures roll back.
begin;
create function pg_temp.check_count(query text, expected bigint, label text)
returns void language plpgsql as $$
declare actual bigint;
begin
  execute query into actual;
  if actual <> expected then raise exception '%: expected %, got %', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function pg_temp.check_denied(query text, label text)
returns void language plpgsql as $$
begin
  begin execute query;
  exception when insufficient_privilege or check_violation or unique_violation then
    raise notice 'PASS: %', label; return;
  end;
  raise exception 'FAIL: % (accepted)', label;
end;
$$;
insert into auth.users(id, email, email_confirmed_at) values
 ('a0000000-0000-4000-8000-000000000001', 'creator@example.test', now()),
 ('a0000000-0000-4000-8000-000000000002', 'second@example.test', now()),
 ('a0000000-0000-4000-8000-000000000003', 'outsider@example.test', now()),
 ('a0000000-0000-4000-8000-000000000004', 'unverified@example.test', null);
set local role anon;
select pg_temp.check_denied($q$select public.create_project('onboarding-test', 'TEST', 'TEST')$q$, 'anonymous creation denied');
select pg_temp.check_denied($q$select public.accept_project_organizer_invite('b0000000-0000-4000-8000-000000000001')$q$, 'anonymous invitation acceptance denied');
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.create_project('onboarding-test', ' TEST ', ' Marie Martin ', '', '2026-10-03');
select pg_temp.check_count($q$select count(*) from public.projects where slug='onboarding-test' and created_by=auth.uid() and title='TEST' and subject_name='Marie Martin' and status='open'$q$, 1, 'creator owns normalized new project');
select pg_temp.check_count($q$select count(*) from public.project_members where project_id=(select id from public.projects where slug='onboarding-test') and user_id=auth.uid() and role='organizer'$q$, 1, 'organizer assigned atomically');
select pg_temp.check_denied($q$select public.create_project('onboarding-test','Other','Other')$q$, 'duplicate slug never claims existing project');
select pg_temp.check_denied($q$select public.create_project('bad-link',' ','Other')$q$, 'invalid project rejected by RPC');
select pg_temp.check_count($q$select count(*) from public.projects where slug='bad-link'$q$, 0, 'rejected creation leaves no orphan');
select pg_temp.check_denied($q$update public.projects set slug='changed-link' where slug='onboarding-test'$q$, 'project link immutable');
select pg_temp.check_denied($q$update public.projects set created_by='a0000000-0000-4000-8000-000000000003' where slug='onboarding-test'$q$, 'creator identity immutable');
select public.invite_project_organizer((select id from public.projects where slug='onboarding-test'), ' SECOND@example.test ');
select pg_temp.check_count($q$select count(*) from public.project_organizer_invites where email='second@example.test' and accepted_by is null$q$, 1, 'private pending invitation normalized');
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select pg_temp.check_count('select count(*) from public.project_organizer_invites', 0, 'unrelated account cannot read invitation email');
select pg_temp.check_count($q$select public.accept_project_organizer_invite((select id from public.projects where slug='onboarding-test'))::int$q$, 0, 'wrong verified address gets no rights');
select pg_temp.check_denied($q$select public.invite_project_organizer((select id from public.projects where slug='onboarding-test'),'outsider@example.test')$q$, 'non-organizer cannot invite itself');
update public.projects set title='Intrusion' where slug='onboarding-test';
select pg_temp.check_count($q$select count(*) from public.projects where title='Intrusion'$q$, 0, 'outsider cannot change details');
select pg_temp.check_denied($q$insert into public.project_members(project_id,user_id,role) values ((select id from public.projects where slug='onboarding-test'),auth.uid(),'organizer')$q$, 'direct self-promotion denied');
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select pg_temp.check_count($q$select public.accept_project_organizer_invite((select id from public.projects where slug='onboarding-test'))::int$q$, 1, 'invited verified account accepts');
select pg_temp.check_count($q$select public.accept_project_organizer_invite((select id from public.projects where slug='onboarding-test'))::int$q$, 1, 'acceptance is idempotent');
select pg_temp.check_count($q$select count(*) from public.project_members where project_id=(select id from public.projects where slug='onboarding-test') and role='organizer'$q$, 2, 'exactly two organizers');
update public.projects set title='Changed by second', event_date=null where slug='onboarding-test';
select pg_temp.check_count($q$select count(*) from public.projects where title='Changed by second' and event_date is null$q$, 1, 'second organizer updates project details');
select pg_temp.check_denied($q$select public.invite_project_organizer((select id from public.projects where slug='onboarding-test'),'third@example.test')$q$, 'third organizer invitation refused');
select pg_temp.check_denied($q$select public.cancel_project_organizer_invite((select id from public.projects where slug='onboarding-test'))$q$, 'accepted invitation cannot be accidentally revoked');
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.create_project('invitation-cancel-test', 'TEST', 'TEST');
select public.invite_project_organizer((select id from public.projects where slug='invitation-cancel-test'),'future@example.test');
select pg_temp.check_count($q$select count(*) from public.project_organizer_invites where email='future@example.test'$q$, 1, 'invitation possible before account exists');
select public.cancel_project_organizer_invite((select id from public.projects where slug='invitation-cancel-test'));
select pg_temp.check_count($q$select count(*) from public.project_organizer_invites where email='future@example.test'$q$, 0, 'pending invitation cancellation');
select public.invite_project_organizer((select id from public.projects where slug='invitation-cancel-test'),'unverified@example.test');
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select pg_temp.check_count($q$select public.accept_project_organizer_invite((select id from public.projects where slug='invitation-cancel-test'))::int$q$, 0, 'unconfirmed email cannot accept invitation');
reset role;
set local role anon;
select pg_temp.check_denied('select * from public.project_organizer_invites', 'anonymous invitation email access denied');
reset role;
rollback;
