-- One transaction: only the verified caller becomes organizer of a NEW project.
-- No user ID or existing project ID is accepted as an argument.
begin;
create or replace function public.create_project(
  p_slug text, p_title text, p_subject_name text,
  p_description text default null, p_event_date date default null
) returns public.projects
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result public.projects;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$'
    or p_title is null or char_length(btrim(p_title)) not between 1 and 160
    or p_subject_name is null or char_length(btrim(p_subject_name)) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 3000 then
    raise exception 'Invalid project details' using errcode = '23514';
  end if;
  insert into public.projects(slug, title, subject_name, description, event_date, status, created_by)
  values (p_slug, btrim(p_title), btrim(p_subject_name), nullif(btrim(p_description), ''), p_event_date, 'open', caller)
  returning * into result;
  insert into public.project_members(project_id, user_id, role)
  values (result.id, caller, 'organizer');
  return result;
end;
$$;
revoke all on function public.create_project(text, text, text, text, date) from public, anon;
grant execute on function public.create_project(text, text, text, text, date) to authenticated;

-- Public links and creator identity remain stable, including for organizers.
create or replace function public.guard_project_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.slug is distinct from old.slug
    or new.created_by is distinct from old.created_by then
    raise exception 'Project identity cannot be changed' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger projects_identity_guard before update on public.projects
for each row execute function public.guard_project_identity();
notify pgrst, 'reload schema';
commit;
