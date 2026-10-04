begin;
-- Creation and the private invitation are atomic: no project without its
-- designated organizer if invitation persistence fails. Existing quota lock
-- and verified creator checks remain in create_project_limited.
create function public.create_project_with_organizer(
  p_actor uuid, p_limit integer, p_slug text, p_title text, p_subject_name text,
  p_organizer_email text, p_description text default null, p_event_date date default null
) returns public.projects language plpgsql security definer set search_path='' as $$
declare result public.projects; target_email text;
begin
  target_email := lower(btrim(p_organizer_email));
  if target_email is null or char_length(target_email)>254 or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid organizer email' using errcode='23514';
  end if;
  result := public.create_project_limited(p_actor,p_limit,p_slug,p_title,p_subject_name,p_description,p_event_date);
  -- An invitation to the creator's own verified address adds no second role.
  if not exists(select 1 from auth.users where id=p_actor and lower(email)=target_email) then
    insert into public.project_organizer_invites(project_id,email,invited_by)
      values(result.id,target_email,p_actor);
  end if;
  return result;
end;
$$;
revoke all on function public.create_project_with_organizer(uuid,integer,text,text,text,text,text,date) from public,anon,authenticated;
grant execute on function public.create_project_with_organizer(uuid,integer,text,text,text,text,text,date) to service_role;
notify pgrst,'reload schema';
commit;
