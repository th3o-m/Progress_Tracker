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

alter table public.project_report_imports
  add column if not exists warnings jsonb default '[]'::jsonb,
  add column if not exists raw_preview_json jsonb default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'financial_entries'
      and constraint_name = 'financial_entries_amount_check'
  ) then
    alter table public.financial_entries drop constraint financial_entries_amount_check;
  end if;
end $$;

alter table public.financial_entries
  add constraint financial_entries_amount_check check (amount >= 0);

commit;
