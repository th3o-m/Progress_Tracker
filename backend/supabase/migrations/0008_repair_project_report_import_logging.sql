begin;

create table if not exists public.project_report_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  imported_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_report_imports
  add column if not exists reporting_period text,
  add column if not exists import_type text default 'excel',
  add column if not exists selected_project_id uuid,
  add column if not exists selected_sheet text,
  add column if not exists imported_rows_count integer default 0,
  add column if not exists blocking_errors jsonb default '[]'::jsonb,
  add column if not exists source_file_name text,
  add column if not exists source_sheet_name text,
  add column if not exists project_name text,
  add column if not exists project_manager text,
  add column if not exists start_date date,
  add column if not exists completion_date date,
  add column if not exists budget numeric(14,2),
  add column if not exists executive_summary text,
  add column if not exists milestones text[] default '{}',
  add column if not exists progress_achieved text,
  add column if not exists percentage_completion integer,
  add column if not exists remarks text,
  add column if not exists risks text,
  add column if not exists mitigation text,
  add column if not exists status text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_report_imports'
      and column_name = 'reporting_period'
      and data_type <> 'text'
  ) then
    alter table public.project_report_imports
      alter column reporting_period type text using reporting_period::text;
  end if;
end $$;

do $$
declare
  target_column text;
begin
  foreach target_column in array array[
    'project_id',
    'imported_by',
    'created_at',
    'updated_at',
    'reporting_period',
    'source_file_name',
    'source_sheet_name',
    'project_name',
    'project_manager',
    'start_date',
    'completion_date',
    'budget',
    'executive_summary',
    'milestones',
    'progress_achieved',
    'percentage_completion'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'project_report_imports'
        and columns.column_name = target_column
        and is_nullable = 'NO'
    ) then
      execute format('alter table public.project_report_imports alter column %I drop not null', target_column);
    end if;
  end loop;
end $$;

alter table public.project_report_imports
  alter column import_type set default 'excel',
  alter column imported_rows_count set default 0,
  alter column blocking_errors set default '[]'::jsonb,
  alter column milestones set default '{}';

create index if not exists project_report_imports_project_idx
on public.project_report_imports(project_id);

commit;
