begin;
-- Browser callers must not choose the deployment limit or impersonate a creator.
revoke all on function public.create_project(text,text,text,text,date) from public, anon, authenticated, service_role;
create function public.create_project_limited(
  p_actor uuid, p_limit integer, p_slug text, p_title text, p_subject_name text,
  p_description text default null, p_event_date date default null
) returns public.projects
language plpgsql security definer set search_path = '' as $$
declare result public.projects;
begin
  if p_actor is null or not exists(select 1 from auth.users where id = p_actor and email_confirmed_at is not null) then
    raise exception 'Verified user required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 0 and 10000
    or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$'
    or p_title is null or char_length(btrim(p_title)) not between 1 and 160
    or p_subject_name is null or char_length(btrim(p_subject_name)) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 3000 then
    raise exception 'Invalid project details or limit' using errcode = '23514';
  end if;
  -- Shared across ALL users; lock held until commit. The subsequent count at
  -- READ COMMITTED observes the preceding creation before allocating a slot.
  perform pg_catalog.pg_advisory_xact_lock(742619031);
  if exists(select 1 from public.projects where slug = p_slug) then
    raise exception 'Project slug exists' using errcode = '23505';
  end if;
  if (select count(*) from public.projects) >= p_limit then
    raise exception 'PROJECT_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  insert into public.projects(slug,title,subject_name,description,event_date,status,created_by)
  values(p_slug,btrim(p_title),btrim(p_subject_name),nullif(btrim(p_description),''),p_event_date,'open',p_actor)
  returning * into result;
  insert into public.project_members(project_id,user_id,role) values(result.id,p_actor,'organizer');
  return result;
end;
$$;
revoke all on function public.create_project_limited(uuid,integer,text,text,text,text,date) from public, anon, authenticated;
grant execute on function public.create_project_limited(uuid,integer,text,text,text,text,date) to service_role;
notify pgrst, 'reload schema';
commit;
