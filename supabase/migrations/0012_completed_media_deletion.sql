-- Completed or already removed media must not delay explicit author deletion.
begin;
create or replace function public.begin_memory_deletion(p_memory_id uuid,p_actor uuid) returns public.memories
language plpgsql security definer set search_path='' as $$
declare m public.memories; p public.projects;
begin
  select * into m from public.memories where id=p_memory_id;
  if m.id is null or m.author_id<>p_actor or not public.is_project_member(m.project_id,p_actor) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  select * into p from public.projects where id=m.project_id for update;
  select * into m from public.memories where id=p_memory_id for update;
  if m.id is null then raise exception 'Memory unavailable' using errcode='42501'; end if;
  if p.deletion_started_at is not null then raise exception 'PROJECT_DELETION_IN_PROGRESS' using errcode='23514'; end if;
  if m.deletion_started_at is null then
    if not public.is_project_organizer(p.id,p_actor) and
      (p.status<>'open' or (p.opens_at is not null and p.opens_at>now()) or (p.closes_at is not null and p.closes_at<=now())) then
      raise exception 'COLLECTION_CLOSED' using errcode='42501';
    end if;
    -- Only unfinished recent uploads can still be transferring bytes.
    if exists(select 1 from public.media_assets where memory_id=m.id and status='draft'
      and created_at>clock_timestamp()-interval '10 minutes') then
      raise exception 'RECENT_UPLOADS_WAIT' using errcode='23514';
    end if;
    update public.memories set deletion_started_at=clock_timestamp(),status='hidden' where id=m.id returning * into m;
  end if;
  return m;
end $$;
revoke all on function public.begin_memory_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_memory_deletion(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
