begin;

create table public.project_report_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_file_name text not null,
  source_sheet_name text not null,
  reporting_period date not null,
  project_name text not null,
  project_manager text not null,
  start_date date not null,
  completion_date date not null,
  budget numeric(14,2) not null check (budget >= 0),
  executive_summary text not null,
  milestones text[] not null default '{}',
  progress_achieved text not null,
  percentage_completion integer not null check (percentage_completion between 0 and 100),
  remarks text,
  risks text,
  mitigation text,
  status text check (status is null or status in ('Not Started', 'In Progress', 'Completed', 'On Hold')),
  imported_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reporting_period),
  check (completion_date >= start_date)
);

create index project_report_imports_project_idx on public.project_report_imports(project_id, reporting_period desc);
alter table public.project_report_imports enable row level security;

create policy project_report_imports_select_management on public.project_report_imports
for select to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'));

create policy project_report_imports_insert_management on public.project_report_imports
for insert to authenticated with check (imported_by = auth.uid() and public.project_role(project_id) in ('supervisor', 'admin'));

create policy project_report_imports_update_management on public.project_report_imports
for update to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'))
with check (imported_by = auth.uid() and public.project_role(project_id) in ('supervisor', 'admin'));

create policy project_report_imports_delete_admin on public.project_report_imports
for delete to authenticated using (public.project_role(project_id) = 'admin');

commit;
