-- Shared invitations are private technical credentials, never archive content.
begin;
create table public.project_shared_invites (
  project_id uuid primary key references public.projects(id) on delete cascade,
  token text not null check (token ~ '^[a-f0-9]{64}$'),
  renewed_at timestamptz not null default now()
);
alter table public.project_shared_invites enable row level security;
revoke all on public.project_shared_invites from public, anon, authenticated;
grant all on public.project_shared_invites to service_role;

-- Server-only: retain the same link until the organizer explicitly renews it.
create function public.shared_project_invitation(p_project_id uuid, p_actor uuid, p_token text, p_renew boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare result text;
begin
  perform 1 from public.projects where id = p_project_id and deletion_started_at is null for update;
  if not found or not public.is_project_organizer(p_project_id, p_actor) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  insert into public.project_shared_invites(project_id, token) values(p_project_id, p_token)
    on conflict (project_id) do nothing;
  if p_renew then
    update public.project_shared_invites set token = p_token, renewed_at = now() where project_id = p_project_id;
  end if;
  select token into result from public.project_shared_invites where project_id = p_project_id;
  return result;
end;
$$;
revoke all on function public.shared_project_invitation(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.shared_project_invitation(uuid, uuid, text, boolean) to service_role;

create function public.accept_shared_project_invitation(p_slug text, p_token text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare project public.projects; caller uuid := auth.uid();
begin
  if caller is null or not exists (select 1 from auth.users where id = caller and email_confirmed_at is not null) then
    return false;
  end if;
  select * into project from public.projects where slug = p_slug and deletion_started_at is null for update;
  if not found then return false; end if;
  -- Preserve the separate, email-verified organizer invitation flow before RLS reads.
  perform public.accept_project_organizer_invite(project.id);
  if public.is_project_member(project.id) then return true; end if;
  -- Invitations grant reading before scheduled opening, but not after closure.
  if project.status <> 'open' or (project.closes_at is not null and project.closes_at <= now()) then return false; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists (
    select 1 from public.project_shared_invites where project_id = project.id and token = p_token
  ) then return false; end if;
  insert into public.project_members(project_id, user_id, role) values(project.id, caller, 'contributor')
    on conflict (project_id, user_id) do nothing;
  return true;
end;
$$;
revoke all on function public.accept_shared_project_invitation(text, text) from public, anon;
grant execute on function public.accept_shared_project_invitation(text, text) to authenticated;

-- Legacy callers may verify membership, never self-enroll using a project UUID.
create or replace function public.join_project(p_project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_project_member(p_project_id) then
    raise exception 'Use the invitation link to join this project' using errcode = '42501';
  end if;
end;
$$;
alter policy "projects readable" on public.projects using (
  public.is_project_member(id) and (status <> 'draft' or public.is_project_organizer(id))
);
create or replace function public.is_project_public(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.is_project_member(p_project_id) and exists (
    select 1 from public.projects where id = p_project_id and status in ('open', 'closed', 'archived')
  );
$$;
alter policy "content readable" on public.guestbook_entries using (
  public.is_project_member(project_id) and ((status = 'published' and public.is_project_public(project_id))
  or author_id = auth.uid() or public.is_project_organizer(project_id))
);
alter policy "content readable" on public.memories using (
  public.is_project_member(project_id) and ((status = 'published' and public.is_project_public(project_id))
  or author_id = auth.uid() or public.is_project_organizer(project_id))
);
alter policy "media readable" on public.media_assets using (
  public.is_project_member(project_id) and (
    (status = 'published' and public.is_project_public(project_id) and (memory_id is null or exists (
      select 1 from public.memories m where m.id = memory_id and m.project_id = media_assets.project_id and m.status = 'published'
    ))) or owner_id = auth.uid() or public.is_project_organizer(project_id)
  )
);
notify pgrst, 'reload schema';
commit;
