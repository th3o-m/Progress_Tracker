begin;

alter table public.project_financial_reports
  add column if not exists amount_spent numeric(14,2) not null default 0
  check (amount_spent >= 0);

alter table public.project_financial_reports
  drop constraint if exists project_financial_reports_project_id_reporting_date_key;

with ordered_reports as (
  select
    id,
    cumulative_expenditure,
    lag(cumulative_expenditure, 1, 0) over (
      partition by project_id
      order by reporting_date asc, created_at asc, id asc
    ) as previous_total
  from public.project_financial_reports
)
update public.project_financial_reports reports
set amount_spent = greatest(ordered_reports.cumulative_expenditure - ordered_reports.previous_total, 0)
from ordered_reports
where reports.id = ordered_reports.id;

create index if not exists project_financial_reports_history_idx
  on public.project_financial_reports(project_id, reporting_date asc, created_at asc);

commit;
