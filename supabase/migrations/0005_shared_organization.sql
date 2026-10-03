-- Invitation emails are technical/private: never include this table in public export.
begin;
create table public.project_organizer_invites (
  project_id uuid primary key references public.projects(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.project_organizer_invites enable row level security;
revoke all on public.project_organizer_invites from anon, authenticated;
grant select on public.project_organizer_invites to authenticated;
create policy "organizers read private invitations" on public.project_organizer_invites
for select to authenticated using (public.is_project_organizer(project_id));

create or replace function public.invite_project_organizer(p_project_id uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); normalized text := lower(btrim(p_email));
begin
  if caller is null or not public.is_project_organizer(p_project_id, caller) then
    raise exception 'Organizer required' using errcode = '42501';
  end if;
  -- Lock project: concurrent invitations/acceptances cannot exceed two organizers.
  perform id from public.projects where id = p_project_id for update;
  if normalized is null or char_length(normalized) > 254
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email' using errcode = '23514';
  end if;
  if exists (select 1 from auth.users where id = caller and lower(email) = normalized) then
    raise exception 'Invite another address' using errcode = '23514';
  end if;
  if (select count(*) from public.project_members where project_id = p_project_id and role = 'organizer') >= 2 then
    raise exception 'Two organizers already assigned' using errcode = '23514';
  end if;
  insert into public.project_organizer_invites(project_id, email, invited_by)
  values (p_project_id, normalized, caller)
  on conflict (project_id) do update set email = excluded.email, invited_by = caller, created_at = now();
end;
$$;

create or replace function public.accept_project_organizer_invite(p_project_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); verified_email text; invitation public.project_organizer_invites;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select lower(email) into verified_email from auth.users where id = caller and email_confirmed_at is not null;
  if verified_email is null then return false; end if;
  -- No return value exposes whether an unrelated email has an invitation.
  if not exists (select 1 from public.project_organizer_invites where project_id = p_project_id and email = verified_email) then return false; end if;
  perform id from public.projects where id = p_project_id for update;
  select * into invitation from public.project_organizer_invites where project_id = p_project_id and email = verified_email;
  if not found then return false; end if;
  if invitation.accepted_by is not null then return invitation.accepted_by = caller; end if;
  if (select count(*) from public.project_members where project_id = p_project_id and role = 'organizer') >= 2 then
    raise exception 'Two organizers already assigned' using errcode = '23514';
  end if;
  insert into public.project_members(project_id, user_id, role) values (p_project_id, caller, 'organizer')
  on conflict (project_id, user_id) do update set role = 'organizer';
  update public.project_organizer_invites set accepted_by = caller where project_id = p_project_id;
  return true;
end;
$$;

create or replace function public.cancel_project_organizer_invite(p_project_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_project_organizer(p_project_id) then
    raise exception 'Organizer required' using errcode = '42501';
  end if;
  perform id from public.projects where id = p_project_id for update;
  if exists (select 1 from public.project_organizer_invites where project_id = p_project_id and accepted_by is not null) then
    raise exception 'Invitation already accepted' using errcode = '23514';
  end if;
  delete from public.project_organizer_invites where project_id = p_project_id;
end;
$$;
revoke all on function public.invite_project_organizer(uuid, text), public.accept_project_organizer_invite(uuid), public.cancel_project_organizer_invite(uuid) from public, anon;
grant execute on function public.invite_project_organizer(uuid, text), public.accept_project_organizer_invite(uuid), public.cancel_project_organizer_invite(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
