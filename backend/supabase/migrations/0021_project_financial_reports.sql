begin;

create table public.project_financial_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reporting_date date not null,
  cumulative_expenditure numeric(14,2) not null check (cumulative_expenditure >= 0),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (project_id, reporting_date)
);

create index project_financial_reports_project_idx on public.project_financial_reports(project_id, reporting_date desc, created_at desc);

alter table public.project_financial_reports enable row level security;

create policy project_financial_reports_select_member on public.project_financial_reports
  for select to authenticated
  using (exists (
    select 1
    from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = project_financial_reports.project_id
      and pm.user_id = auth.uid()
      and p.active
  ));

create policy project_financial_reports_insert_management on public.project_financial_reports
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.project_role(project_id) in ('supervisor', 'finance', 'admin')
  );

do $$
declare
  project_row record;
  report_row record;
  report_creator uuid;
  running_total numeric(14,2);
begin
  for project_row in
    select id, created_by
    from public.projects
  loop
    running_total := 0;
    report_creator := project_row.created_by;

    if report_creator is null then
      select pm.user_id
      into report_creator
      from public.project_members pm
      where pm.project_id = project_row.id
      order by case pm.role
        when 'admin' then 1
        when 'supervisor' then 2
        when 'finance' then 3
        else 4
      end, pm.added_at asc
      limit 1;
    end if;

    if report_creator is null then
      continue;
    end if;

    for report_row in
      select
        created_at::date as reporting_date,
        round(sum(amount)::numeric, 2) as daily_total
      from public.financial_entries
      where project_id = project_row.id
      group by created_at::date
      order by created_at::date
    loop
      running_total := round(running_total + coalesce(report_row.daily_total, 0), 2);
      insert into public.project_financial_reports (
        project_id,
        reporting_date,
        cumulative_expenditure,
        notes,
        created_by,
        created_at
      )
      values (
        project_row.id,
        report_row.reporting_date,
        running_total,
        'Backfilled from legacy financial entries',
        report_creator,
        now()
      )
      on conflict (project_id, reporting_date)
      do update set
        cumulative_expenditure = excluded.cumulative_expenditure,
        notes = excluded.notes,
        created_by = excluded.created_by,
        created_at = excluded.created_at;
    end loop;
  end loop;
end $$;

commit;
