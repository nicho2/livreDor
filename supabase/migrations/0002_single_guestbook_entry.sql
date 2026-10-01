-- A contributor has one main guestbook message per project.
-- Memories remain separate and can be created multiple times.

create unique index guestbook_one_entry_per_author_idx
on public.guestbook_entries(project_id, author_id);
