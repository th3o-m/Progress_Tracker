begin;

alter table public.projects
  add column if not exists project_code text,
  add column if not exists project_manager text,
  add column if not exists planned_start_date date,
  add column if not exists actual_start_date date,
  add column if not exists planned_completion_date date,
  add column if not exists actual_completion_date date,
  add column if not exists estimated_budget numeric(14,2),
  add column if not exists allocated_budget numeric(14,2);

alter table public.activities
  add column if not exists import_id uuid references public.project_report_imports(id) on delete set null,
  add column if not exists description text,
  add column if not exists status_color text,
  add column if not exists remarks text,
  add column if not exists actual_completion_date date;

alter table public.progress_updates
  add column if not exists import_id uuid references public.project_report_imports(id) on delete set null,
  add column if not exists executive_summary text,
  add column if not exists status_color text,
  add column if not exists remarks text,
  add column if not exists reporting_period text;

alter table public.challenges
  add column if not exists import_id uuid references public.project_report_imports(id) on delete set null,
  add column if not exists status_color text,
  add column if not exists responsible_officer uuid references public.profiles(id),
  add column if not exists due_date date;

alter table public.financial_entries
  add column if not exists import_id uuid references public.project_report_imports(id) on delete set null,
  add column if not exists approved_budget numeric(14,2),
  add column if not exists balance numeric(14,2),
  add column if not exists percentage_utilised numeric(7,2),
  add column if not exists remarks text;

create index if not exists activities_import_idx on public.activities(import_id);
create index if not exists progress_updates_import_idx on public.progress_updates(import_id);
create index if not exists challenges_import_idx on public.challenges(import_id);
create index if not exists financial_entries_import_idx on public.financial_entries(import_id);

notify pgrst, 'reload schema';

commit;
