-- Run after migrations on a development database only. Fixtures are rolled back.
-- Tests use real anon/authenticated roles, not the service-role bypass.
begin;
create function pg_temp.assert_count(query text, expected bigint, label text)
returns void language plpgsql as $$
declare actual bigint;
begin
  execute query into actual;
  if actual <> expected then raise exception '%: expected %, got %', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end;
$$;
create function pg_temp.assert_denied(query text, label text)
returns void language plpgsql as $$
begin
  begin
    execute query;
  exception when insufficient_privilege or check_violation or unique_violation then
    raise notice 'PASS: %', label;
    return;
  end;
  raise exception 'FAIL: % (write accepted)', label;
end;
$$;

insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'), -- organizer
  ('10000000-0000-4000-8000-000000000002'), -- contributor A
  ('10000000-0000-4000-8000-000000000003'); -- contributor B
insert into public.projects(id, slug, title, subject_name, created_by, status) values
  ('20000000-0000-4000-8000-000000000001', 'rls-test-open', 'TEST', 'TEST', '10000000-0000-4000-8000-000000000001', 'open'),
  ('20000000-0000-4000-8000-000000000002', 'rls-test-draft', 'TEST', 'TEST', '10000000-0000-4000-8000-000000000001', 'draft');
insert into public.project_members(project_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'organizer'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'organizer');
insert into public.memories(id, project_id, author_id, display_name, body, status) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TEST A', 'draft', 'draft'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TEST A', 'published', 'published'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'TEST A', 'private project', 'published');
insert into public.guestbook_entries(project_id, author_id, display_name, message, status)
values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'TEST A', 'private project', 'published');
insert into public.media_assets(project_id, memory_id, owner_id, kind, object_key, original_filename, mime_type, size_bytes, status)
values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'image', 'test/private.jpg', 'test.jpg', 'image/jpeg', 10, 'published');

set local role anon;
select pg_temp.assert_count('select count(*) from public.memories', 1, 'anon: only published content of public project');
select pg_temp.assert_count('select count(*) from public.guestbook_entries', 0, 'anon: draft project guestbook private');
select pg_temp.assert_count('select count(*) from public.media_assets', 0, 'anon: media attached to draft memory private');
select pg_temp.assert_denied($q$insert into public.memories(project_id, author_id, display_name, body) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TEST', 'anonymous')$q$, 'anon cannot write');
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.join_project('20000000-0000-4000-8000-000000000001');
select pg_temp.assert_count('select count(*) from public.memories', 3, 'author reads own drafts');
insert into public.memories(project_id, author_id, display_name, body)
values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST A', 'new draft');
select pg_temp.assert_count($q$select count(*) from public.memories where body = 'new draft'$q$, 1, 'member creates memory draft');
insert into public.guestbook_entries(project_id, author_id, display_name, message)
values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST A', 'message');
select pg_temp.assert_denied($q$insert into public.guestbook_entries(project_id, author_id, display_name, message) values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST A', 'duplicate')$q$, 'one message per project');
select pg_temp.assert_denied($q$update public.memories set project_id = '20000000-0000-4000-8000-000000000002' where id = '30000000-0000-4000-8000-000000000001'$q$, 'project cannot be changed');
select pg_temp.assert_denied($q$update public.memories set author_id = '10000000-0000-4000-8000-000000000003' where id = '30000000-0000-4000-8000-000000000001'$q$, 'author cannot be changed');
select pg_temp.assert_denied($q$insert into public.media_assets(project_id, memory_id, owner_id, kind, object_key, original_filename, mime_type, size_bytes) values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', auth.uid(), 'image', 'test/cross.jpg', 'test.jpg', 'image/jpeg', 10)$q$, 'media cannot reference another project');
update public.memories set body = 'edited', status = 'published' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_count($q$select count(*) from public.memories where body = 'edited'$q$, 1, 'author edits and publishes');
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select pg_temp.assert_denied($q$insert into public.memories(project_id, author_id, display_name, body) values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST B', 'not joined')$q$, 'non-member cannot write');
select public.join_project('20000000-0000-4000-8000-000000000001');
select pg_temp.assert_count('select count(*) from public.memories', 2, 'other contributor cannot read private drafts');
update public.memories set body = 'intrusion' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_count('select count(*) from public.memories where body = ''intrusion''', 0, 'other contributor cannot edit');
select pg_temp.assert_denied($q$insert into public.media_assets(project_id, memory_id, owner_id, kind, object_key, original_filename, mime_type, size_bytes) values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', auth.uid(), 'image', 'test/other.jpg', 'test.jpg', 'image/jpeg', 10)$q$, 'cannot attach media to another author');
reset role;

-- Expired window and closed status independently block contributor writes.
update public.projects set opens_at = now() + interval '1 day' where slug = 'rls-test-open';
set local role authenticated;
select pg_temp.assert_denied($q$insert into public.memories(project_id, author_id, display_name, body) values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST', 'too early')$q$, 'future opening blocks insert');
reset role;
update public.projects set opens_at = null where slug = 'rls-test-open';
update public.projects set closes_at = now() - interval '1 minute' where slug = 'rls-test-open';
set local role authenticated;
select pg_temp.assert_denied($q$insert into public.memories(project_id, author_id, display_name, body) values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'TEST', 'expired')$q$, 'expired window blocks insert');
reset role;
update public.projects set status = 'closed', closes_at = null where slug = 'rls-test-open';
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
update public.memories set body = 'closed edit' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_count($q$select count(*) from public.memories where body = 'closed edit'$q$, 0, 'closed project blocks owner update');
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
update public.memories set status = 'hidden' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_count($q$select count(*) from public.memories where status = 'hidden'$q$, 1, 'organizer moderates closed project');
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select pg_temp.assert_count('select count(*) from public.memories', 1, 'hidden memory excluded from public reads');
select pg_temp.assert_count('select count(*) from public.media_assets', 0, 'hidden parent hides media');
reset role;
rollback;
