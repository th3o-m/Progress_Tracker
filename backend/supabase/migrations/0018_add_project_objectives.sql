begin;

alter table public.projects
  add column if not exists objectives text;

notify pgrst, 'reload schema';

commit;
