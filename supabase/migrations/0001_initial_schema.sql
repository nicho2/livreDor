-- LivreDor initial schema
-- Apply from the Supabase SQL editor or CLI.

create extension if not exists pgcrypto;

create type public.project_status as enum ('draft', 'open', 'closed', 'archived');
create type public.project_role as enum ('organizer', 'contributor');
create type public.publication_status as enum ('draft', 'published', 'hidden');
create type public.media_kind as enum ('image', 'video', 'audio', 'document');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null check (char_length(title) between 1 and 160),
  subject_name text not null check (char_length(subject_name) between 1 and 120),
  description text,
  event_date date,
  opens_at timestamptz,
  closes_at timestamptz,
  status public.project_status not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opens_at is null or closes_at is null or opens_at <= closes_at)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'contributor',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 5000),
  formatting jsonb not null default '{"font":"sans","size":"md","align":"left","color":"ink","bold":false,"italic":false}'::jsonb,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  title text check (title is null or char_length(title) <= 120),
  body text not null check (char_length(body) between 1 and 8000),
  occurred_on date,
  year_from integer check (year_from is null or year_from between 1900 and 2200),
  year_to integer check (year_to is null or year_to between 1900 and 2200),
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (year_from is null or year_to is null or year_from <= year_to)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind public.media_kind not null,
  object_key text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index guestbook_project_status_idx on public.guestbook_entries(project_id, status, created_at desc);
create index memories_project_status_idx on public.memories(project_id, status);
create index memories_timeline_idx on public.memories(project_id, occurred_on, year_from, year_to);
create index media_project_idx on public.media_assets(project_id, memory_id);
create index project_members_user_idx on public.project_members(user_id, project_id);

-- Helper functions
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = p_user_id
  );
$$;

create or replace function public.is_project_organizer(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = p_user_id and pm.role = 'organizer'
  );
$$;

-- Anyone authenticated with the project link may join an open project.
create or replace function public.join_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into p from public.projects where id = p_project_id;
  if p.id is null then raise exception 'Project not found'; end if;
  if p.status <> 'open' then raise exception 'Project is not open'; end if;
  if p.opens_at is not null and now() < p.opens_at then raise exception 'Project is not open yet'; end if;
  if p.closes_at is not null and now() > p.closes_at then raise exception 'Project is closed'; end if;

  insert into public.project_members(project_id, user_id, role)
  values (p_project_id, auth.uid(), 'contributor')
  on conflict (project_id, user_id) do nothing;
end;
$$;

grant execute on function public.join_project(uuid) to authenticated;

-- Profile bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.guestbook_entries enable row level security;
alter table public.memories enable row level security;
alter table public.media_assets enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Project metadata is readable when open/closed/archived. Drafts are organizer-only.
create policy "projects readable" on public.projects for select to anon, authenticated
using (status <> 'draft' or public.is_project_organizer(id));
create policy "projects organizer update" on public.projects for update to authenticated
using (public.is_project_organizer(id)) with check (public.is_project_organizer(id));

create policy "members read own or organizer" on public.project_members for select to authenticated
using (user_id = auth.uid() or public.is_project_organizer(project_id));

-- Public published book entries. Owners/organizers can also read unpublished entries.
create policy "guestbook published read" on public.guestbook_entries for select to anon, authenticated
using (status = 'published' or author_id = auth.uid() or public.is_project_organizer(project_id));
create policy "guestbook insert member" on public.guestbook_entries for insert to authenticated
with check (author_id = auth.uid() and public.is_project_member(project_id));
create policy "guestbook owner update" on public.guestbook_entries for update to authenticated
using (author_id = auth.uid() or public.is_project_organizer(project_id))
with check (author_id = auth.uid() or public.is_project_organizer(project_id));
create policy "guestbook organizer delete" on public.guestbook_entries for delete to authenticated
using (public.is_project_organizer(project_id));

create policy "memories published read" on public.memories for select to anon, authenticated
using (status = 'published' or author_id = auth.uid() or public.is_project_organizer(project_id));
create policy "memories insert member" on public.memories for insert to authenticated
with check (author_id = auth.uid() and public.is_project_member(project_id));
create policy "memories owner update" on public.memories for update to authenticated
using (author_id = auth.uid() or public.is_project_organizer(project_id))
with check (author_id = auth.uid() or public.is_project_organizer(project_id));
create policy "memories organizer delete" on public.memories for delete to authenticated
using (public.is_project_organizer(project_id));

create policy "media published read metadata" on public.media_assets for select to anon, authenticated
using (status = 'published' or owner_id = auth.uid() or public.is_project_organizer(project_id));
create policy "media insert owner" on public.media_assets for insert to authenticated
with check (owner_id = auth.uid() and public.is_project_member(project_id));
create policy "media owner update" on public.media_assets for update to authenticated
using (owner_id = auth.uid() or public.is_project_organizer(project_id))
with check (owner_id = auth.uid() or public.is_project_organizer(project_id));
create policy "media organizer delete" on public.media_assets for delete to authenticated
using (public.is_project_organizer(project_id));

-- Organizer bootstrap is intentionally not exposed as a public RPC.
-- Create the first project + organizer with the seed script or SQL editor.
