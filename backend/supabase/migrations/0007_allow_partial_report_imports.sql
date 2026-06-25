begin;

alter table public.project_report_imports
  alter column reporting_period drop not null,
  alter column project_name drop not null,
  alter column project_manager drop not null,
  alter column start_date drop not null,
  alter column completion_date drop not null,
  alter column budget drop not null,
  alter column executive_summary drop not null,
  alter column progress_achieved drop not null,
  alter column percentage_completion drop not null;

commit;
