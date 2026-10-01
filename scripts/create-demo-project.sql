-- Run after creating/authenticating your organizer account.
-- Replace ORGANIZER_USER_UUID with auth.users.id.

insert into public.projects (
  slug,
  title,
  subject_name,
  description,
  event_date,
  status,
  created_by
) values (
  'depart-demo',
  'Une histoire à plusieurs voix',
  'Prénom Nom',
  'Quelques mots, souvenirs et images pour célébrer ce parcours.',
  current_date + 30,
  'open',
  'ORGANIZER_USER_UUID'::uuid
)
returning id;

-- Then use the returned project id below.
-- insert into public.project_members(project_id, user_id, role)
-- values ('PROJECT_UUID'::uuid, 'ORGANIZER_USER_UUID'::uuid, 'organizer');
