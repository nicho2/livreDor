begin;
create function pg_temp.contact_denied(q text) returns void language plpgsql as $$
begin
  begin execute q; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'Expected contact refusal: %',q;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
('ca000000-0000-4000-8000-000000000001','organizer@example.test',now()),
('ca000000-0000-4000-8000-000000000002','author@example.test',now()),
('ca000000-0000-4000-8000-000000000003','other@example.test',now());
insert into public.projects(id,slug,title,subject_name,status,created_by) values
('ca100000-0000-4000-8000-000000000001','contact-test','TEST','TEST','open','ca000000-0000-4000-8000-000000000001');
insert into public.project_members(project_id,user_id,role) values
('ca100000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001','organizer'),
('ca100000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002','contributor');
set local role anon;
select pg_temp.contact_denied($q$select * from public.organizer_messages$q$);
select pg_temp.contact_denied($q$select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','TEST')$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','rights','Retrait de photo','ca200000-0000-4000-8000-000000000001');
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','rights','Retrait de photo','ca200000-0000-4000-8000-000000000001');
select pg_temp.contact_denied($q$select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','rights','Texte modifié','ca200000-0000-4000-8000-000000000001')$q$);
do $$ begin
  if (select count(*) from public.organizer_messages)<>1 then raise exception 'Author cannot see own request'; end if;
end $$;
select pg_temp.contact_denied($q$insert into public.organizer_messages(project_id,author_id,display_name,category,body) values('ca100000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000003','spoof','help','spoof')$q$);
select pg_temp.contact_denied($q$select public.mark_organizer_message_read((select id from public.organizer_messages limit 1))$q$);
select pg_temp.contact_denied($q$update public.organizer_messages set notification_sent_at=now()$q$);
select pg_temp.contact_denied($q$select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','public','TEST')$q$);
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000003',true);
do $$ begin if exists(select 1 from public.organizer_messages) then raise exception 'Third party reads request'; end if; end $$;
select pg_temp.contact_denied($q$select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','TEST')$q$);
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000001',true);
select public.mark_organizer_message_read(id) from public.organizer_messages;
do $$ begin if exists(select 1 from public.organizer_messages where read_at is null) then raise exception 'Read receipt not set'; end if; end $$;
update public.projects set status='closed' where slug='contact-test';
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','rights','Après clôture');
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','3');
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','4');
select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','5');
select pg_temp.contact_denied($q$select public.send_organizer_message('ca100000-0000-4000-8000-000000000001','TEST','help','6')$q$);
reset role;
delete from public.projects where slug='contact-test';
do $$ begin if exists(select 1 from public.organizer_messages) then raise exception 'Private messages survive project deletion'; end if; end $$;
rollback;
\echo PASS: private contact, RLS, no spoofing, organizer acknowledgement, closed project, rate limit and cascade
