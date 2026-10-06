-- Private contributor requests, outside guestbook, memories and every export.
begin;
create table public.organizer_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  category text not null check (category in ('help','media','rights')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  notification_sent_at timestamptz
);
create index organizer_messages_project_created on public.organizer_messages(project_id, created_at desc);
create index organizer_messages_author_created on public.organizer_messages(author_id, project_id, created_at);
alter table public.organizer_messages enable row level security;
revoke all on public.organizer_messages from anon, authenticated;
grant select on public.organizer_messages to authenticated;
grant select, update on public.organizer_messages to service_role;
create policy "private organizer messages" on public.organizer_messages
for select to authenticated using (author_id=auth.uid() or public.is_project_organizer(project_id));

create function public.send_organizer_message(p_project_id uuid,p_display_name text,p_category text,p_body text,p_request_id uuid default gen_random_uuid())
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid(); p public.projects; message_id uuid; existing public.organizer_messages;
begin
  if caller is null or not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then
    raise exception 'Connexion confirmée requise.' using errcode='42501';
  end if;
  select * into p from public.projects where id=p_project_id for update;
  if p.id is null or not public.is_project_member(p_project_id,caller)
    or (p.status='draft' and not public.is_project_organizer(p_project_id,caller)) then
    raise exception 'Accès au projet refusé.' using errcode='42501';
  end if;
  if p.deletion_started_at is not null then raise exception 'Projet en cours de suppression.' using errcode='23514'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 120
    or p_body is null or char_length(btrim(p_body)) not between 1 and 5000
    or p_category is null or p_category not in ('help','media','rights') then
    raise exception 'Message invalide.' using errcode='23514';
  end if;
  if p_request_id is null then raise exception 'Identifiant invalide.' using errcode='23514'; end if;
  select * into existing from public.organizer_messages where id=p_request_id;
  if existing.id is not null then
    if existing.author_id<>caller or existing.project_id<>p_project_id or existing.display_name<>btrim(p_display_name)
      or existing.category<>p_category or existing.body<>btrim(p_body) then
      raise exception 'Identifiant déjà utilisé.' using errcode='23514';
    end if;
    return existing.id;
  end if;
  -- Project lock makes the per-account limit atomic, including concurrent requests.
  if (select count(*) from public.organizer_messages where project_id=p_project_id
    and author_id=caller and created_at>now()-interval '24 hours') >= 5 then
    raise exception 'Cinq messages maximum par 24 heures. Réessayez plus tard.' using errcode='23514';
  end if;
  insert into public.organizer_messages(id,project_id,author_id,display_name,category,body)
    values(p_request_id,p_project_id,caller,btrim(p_display_name),p_category,btrim(p_body)) returning id into message_id;
  return message_id;
end;
$$;
create function public.mark_organizer_message_read(p_message_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.organizer_messages m set read_at=coalesce(m.read_at,now())
    where m.id=p_message_id and auth.uid() is not null and public.is_project_organizer(m.project_id)
      and exists(select 1 from public.projects p where p.id=m.project_id and p.deletion_started_at is null);
  if not found then raise exception 'Accès au message refusé.' using errcode='42501'; end if;
end;
$$;
revoke all on function public.send_organizer_message(uuid,text,text,text,uuid) from public, anon;
revoke all on function public.mark_organizer_message_read(uuid) from public, anon;
grant execute on function public.send_organizer_message(uuid,text,text,text,uuid) to authenticated;
grant execute on function public.mark_organizer_message_read(uuid) to authenticated;
commit;
