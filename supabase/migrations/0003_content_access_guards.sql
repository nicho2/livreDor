-- Public content follows the project's visibility; contributors follow its window.
-- Organizers retain moderation rights after closure. Identity/linkage is immutable.
begin;

create function public.is_project_public(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.projects
    where id = p_project_id and status in ('open', 'closed', 'archived'));
$$;

create function public.can_contribute(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and public.is_project_member(p_project_id)
    and exists (select 1 from public.projects where id = p_project_id
      and status = 'open'
      and (opens_at is null or opens_at <= now())
      and (closes_at is null or closes_at >= now()));
$$;

revoke all on function public.is_project_public(uuid) from public;
revoke all on function public.can_contribute(uuid) from public;
grant execute on function public.is_project_public(uuid) to anon, authenticated;
grant execute on function public.can_contribute(uuid) to authenticated;

-- WITH CHECK cannot compare OLD and NEW. A trigger prevents moving a row to
-- another project or assigning its ownership to another user (even an organizer).
create function public.guard_content_identity()
returns trigger language plpgsql set search_path = public
as $$
declare column_name text;
begin
  foreach column_name in array tg_argv loop
    if to_jsonb(new)->column_name is distinct from to_jsonb(old)->column_name then
      raise exception 'Content identity cannot be changed' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

create trigger guestbook_identity_guard before update on public.guestbook_entries
for each row execute function public.guard_content_identity('id', 'project_id', 'author_id');
create trigger memories_identity_guard before update on public.memories
for each row execute function public.guard_content_identity('id', 'project_id', 'author_id');
create trigger media_identity_guard before update on public.media_assets
for each row execute function public.guard_content_identity('id', 'project_id', 'owner_id', 'memory_id', 'object_key');

drop policy "guestbook published read" on public.guestbook_entries;
drop policy "guestbook insert member" on public.guestbook_entries;
drop policy "guestbook owner update" on public.guestbook_entries;
drop policy "memories published read" on public.memories;
drop policy "memories insert member" on public.memories;
drop policy "memories owner update" on public.memories;

do $$
declare content_table text;
begin
  foreach content_table in array array['guestbook_entries', 'memories'] loop
    execute format('create policy "content readable" on public.%I for select to anon, authenticated
      using ((status = ''published'' and public.is_project_public(project_id))
        or author_id = auth.uid() or public.is_project_organizer(project_id))', content_table);
    execute format('create policy "content insert" on public.%I for insert to authenticated
      with check (author_id = auth.uid() and public.can_contribute(project_id))', content_table);
    execute format('create policy "content update" on public.%I for update to authenticated
      using ((author_id = auth.uid() and public.can_contribute(project_id))
        or public.is_project_organizer(project_id))
      with check ((author_id = auth.uid() and public.can_contribute(project_id))
        or public.is_project_organizer(project_id))', content_table);
  end loop;
end;
$$;

drop policy "media published read metadata" on public.media_assets;
drop policy "media insert owner" on public.media_assets;
drop policy "media owner update" on public.media_assets;
create policy "media readable" on public.media_assets for select to anon, authenticated
using (
  (status = 'published' and public.is_project_public(project_id)
    and (memory_id is null or exists (select 1 from public.memories m
      where m.id = memory_id and m.project_id = media_assets.project_id and m.status = 'published')))
  or owner_id = auth.uid() or public.is_project_organizer(project_id)
);
create policy "media insert" on public.media_assets for insert to authenticated
with check (owner_id = auth.uid() and public.can_contribute(project_id)
  and (memory_id is null or exists (select 1 from public.memories m
    where m.id = memory_id and m.project_id = media_assets.project_id and m.author_id = auth.uid())));
create policy "media update" on public.media_assets for update to authenticated
using ((owner_id = auth.uid() and public.can_contribute(project_id)) or public.is_project_organizer(project_id))
with check ((owner_id = auth.uid() and public.can_contribute(project_id)) or public.is_project_organizer(project_id));

commit;
