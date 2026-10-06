begin;
insert into auth.users(id,email,email_confirmed_at) values ('cc000000-0000-4000-8000-000000000001','test@example.test',now());
insert into public.projects(id,slug,title,subject_name,status,created_by) values
('cc100000-0000-4000-8000-000000000001','completed-media-delete-test','TEST','TEST','open','cc000000-0000-4000-8000-000000000001');
insert into public.project_members(project_id,user_id,role) values ('cc100000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000001','contributor');
do $$ declare memory_id uuid; asset_id uuid; media_status public.publication_status;
begin
  foreach media_status in array array['draft','published','hidden'] loop
    insert into public.memories(project_id,author_id,display_name,body,status) values
      ('cc100000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000001','TEST','TEST','published') returning id into memory_id;
    insert into public.media_assets(project_id,memory_id,owner_id,kind,object_key,original_filename,mime_type,size_bytes,status) values
      ('cc100000-0000-4000-8000-000000000001',memory_id,'cc000000-0000-4000-8000-000000000001','image','test-' || media_status::text,'test.png','image/png',68,media_status) returning id into asset_id;
    if media_status='draft' then
      begin
        perform public.begin_memory_deletion(memory_id,'cc000000-0000-4000-8000-000000000001');
        raise exception 'Unfinished upload accepted';
      exception when check_violation then
        if sqlerrm<>'RECENT_UPLOADS_WAIT' then raise; end if;
      end;
      if exists(select 1 from public.memories where id=memory_id and deletion_started_at is not null) then raise exception 'Waiting changed memory'; end if;
    else
      perform public.begin_memory_deletion(memory_id,'cc000000-0000-4000-8000-000000000001');
      if not public.finish_memory_deletion(memory_id,'cc000000-0000-4000-8000-000000000001') then raise exception 'Deletion failed'; end if;
      if exists(select 1 from public.media_assets where id=asset_id) then raise exception 'Asset remains'; end if;
    end if;
  end loop;
end $$;
rollback;
