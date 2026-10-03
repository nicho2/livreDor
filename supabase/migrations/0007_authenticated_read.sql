-- Consultation requires a LivreDor OTP session, not a ChatGPT account.
-- No data deletion, no write/organizer policy changes. Published != anonymous.
begin;
alter policy "projects readable" on public.projects to authenticated
using (auth.uid() is not null and (status <> 'draft' or public.is_project_organizer(id)));
alter policy "content readable" on public.guestbook_entries to authenticated;
alter policy "content readable" on public.memories to authenticated;
alter policy "media readable" on public.media_assets to authenticated;

-- Preserve the helper signature used by policies, but do not leak project
-- visibility through a direct anonymous RPC call.
create or replace function public.is_project_public(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and exists (select 1 from public.projects
    where id = p_project_id and status in ('open', 'closed', 'archived'));
$$;
commit;
