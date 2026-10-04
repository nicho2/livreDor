begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('c9000000-0000-4000-8000-000000000001','manager@example.test',now()),
 ('c9000000-0000-4000-8000-000000000002','outsider@example.test',now());
do $$ declare p public.projects; accepted boolean;
begin
  p := public.create_project_with_organizer('c9000000-0000-4000-8000-000000000001',100,'designated-test','TEST','TEST',' Future@EXAMPLE.test ');
  if not exists(select 1 from public.project_organizer_invites where project_id=p.id and email='future@example.test' and accepted_by is null) then raise exception 'Missing normalized pending invitation'; end if;
  perform set_config('request.jwt.claim.sub','c9000000-0000-4000-8000-000000000002',true);
  if public.accept_project_organizer_invite(p.id) then raise exception 'Unrelated user accepted'; end if;
  -- The invited person may create their account only after project creation.
  insert into auth.users(id,email,email_confirmed_at) values('c9000000-0000-4000-8000-000000000003','future@example.test',null);
  perform set_config('request.jwt.claim.sub','c9000000-0000-4000-8000-000000000003',true);
  if public.accept_project_organizer_invite(p.id) then raise exception 'Unverified user accepted'; end if;
  update auth.users set email_confirmed_at=now() where id='c9000000-0000-4000-8000-000000000003';
  if not public.accept_project_organizer_invite(p.id) then raise exception 'Verified designee rejected'; end if;
  if (select count(*) from public.project_members where project_id=p.id and role='organizer')<>2 then raise exception 'Incorrect organizer roles'; end if;
  begin
    perform public.create_project_with_organizer('c9000000-0000-4000-8000-000000000001',100,'invalid-mail-test','TEST','TEST','invalid');
    raise exception 'Invalid email accepted';
  exception when check_violation then null; end;
  if exists(select 1 from public.projects where slug='invalid-mail-test') then raise exception 'Partial creation'; end if;
  if has_function_privilege('authenticated','public.create_project_with_organizer(uuid,integer,text,text,text,text,text,date)','EXECUTE') or has_function_privilege('anon','public.create_project_with_organizer(uuid,integer,text,text,text,text,text,date)','EXECUTE') then raise exception 'Client creation privilege'; end if;
  raise notice 'PASS: designated organizer, future account, verified email and server-only creation';
end $$;
rollback;
