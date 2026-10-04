begin;
alter table public.projects
  add column theme text not null default 'album' check (theme in ('album','classic','retirement','birthday','wedding','departure','birth','memory')),
  add column content_revision bigint not null default 0,
  add column archive_exported_at timestamptz,
  add column deletion_started_at timestamptz;

create function public.guard_project_lifecycle() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.deletion_started_at is not null then raise exception 'PROJECT_DELETION_IN_PROGRESS' using errcode='23514'; end if;
  if current_user not in ('service_role','postgres','supabase_admin') and
    (new.archive_exported_at is distinct from old.archive_exported_at or new.deletion_started_at is distinct from old.deletion_started_at
      or new.content_revision is distinct from old.content_revision) then
    raise exception 'Protected archive fields' using errcode='42501';
  end if;
  if new.status='archived' and old.status not in ('closed','archived') then raise exception 'CLOSE_BEFORE_ARCHIVING' using errcode='23514'; end if;
  if new.status='archived' and old.status<>'archived' and old.archive_exported_at is null then raise exception 'EXPORT_BEFORE_ARCHIVING' using errcode='23514'; end if;
  if (new.title,new.subject_name,new.description,new.event_date,new.theme,new.opens_at,new.closes_at)
    is distinct from (old.title,old.subject_name,old.description,old.event_date,old.theme,old.opens_at,old.closes_at)
    or (new.status='open' and old.status<>'open') then
    new.content_revision := old.content_revision+1;
    new.archive_exported_at := null;
  end if;
  return new;
end;
$$;
create trigger project_lifecycle_guard before update on public.projects for each row execute function public.guard_project_lifecycle();
-- A client must not backdate uploads to bypass the cleanup grace period.
create trigger media_created_at_guard before update on public.media_assets
for each row execute function public.guard_content_identity('created_at');

-- Content mutations lock the project and invalidate proof of a prior export.
create function public.invalidate_project_archive() returns trigger language plpgsql security definer set search_path = '' as $$
declare project_id uuid; locked public.projects;
begin
  project_id := case when tg_op='DELETE' then old.project_id else new.project_id end;
  select * into locked from public.projects where id=project_id for update;
  if locked.id is null then return case when tg_op='DELETE' then old else new end; end if;
  if locked.deletion_started_at is not null then raise exception 'PROJECT_DELETION_IN_PROGRESS' using errcode='23514'; end if;
  update public.projects set content_revision=content_revision+1, archive_exported_at=null where id=project_id;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['guestbook_entries','memories','media_assets'] loop
    execute format('create trigger archive_invalidation before insert or update or delete on public.%I for each row execute function public.invalidate_project_archive()',t);
  end loop;
end $$;

create function public.confirm_project_export(p_project_id uuid,p_revision bigint) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update public.projects set archive_exported_at=clock_timestamp()
    where id=p_project_id and content_revision=p_revision and status in ('closed','archived') and deletion_started_at is null;
  return found;
end;
$$;

create function public.begin_project_deletion(p_project_id uuid,p_actor uuid,p_slug text) returns public.projects
language plpgsql security definer set search_path='' as $$
declare p public.projects;
begin
  select * into p from public.projects where id=p_project_id for update;
  if p.id is null or not public.is_project_organizer(p_project_id,p_actor) then raise exception 'Access denied' using errcode='42501'; end if;
  if p.slug<>p_slug or p.status<>'archived' or p.archive_exported_at is null then raise exception 'ARCHIVED_EXPORT_REQUIRED' using errcode='23514'; end if;
  if exists(select 1 from public.media_assets where project_id=p.id and created_at>clock_timestamp()-interval '10 minutes') then
    raise exception 'RECENT_UPLOADS_WAIT' using errcode='23514';
  end if;
  if p.deletion_started_at is null then update public.projects set deletion_started_at=clock_timestamp() where id=p.id returning * into p; end if;
  return p;
end;
$$;

create function public.finish_project_deletion(p_project_id uuid,p_actor uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_project_organizer(p_project_id,p_actor) then raise exception 'Access denied' using errcode='42501'; end if;
  delete from public.projects where id=p_project_id and status='archived' and deletion_started_at is not null;
  return found;
end;
$$;
revoke all on function public.confirm_project_export(uuid,bigint),public.begin_project_deletion(uuid,uuid,text),public.finish_project_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_project_export(uuid,bigint),public.begin_project_deletion(uuid,uuid,text),public.finish_project_deletion(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
