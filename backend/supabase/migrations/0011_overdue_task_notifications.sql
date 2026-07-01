begin;

create table if not exists public.overdue_task_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  notification_type text not null check (notification_type in ('activity', 'challenge')),
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text
);

create index if not exists overdue_task_notifications_lookup_idx
  on public.overdue_task_notifications(project_id, task_id, user_id, notification_type, sent_at desc);

create index if not exists overdue_task_notifications_project_sent_idx
  on public.overdue_task_notifications(project_id, sent_at desc);

alter table public.overdue_task_notifications enable row level security;

create policy overdue_task_notifications_select_project_admin
  on public.overdue_task_notifications
  for select
  to authenticated
  using (public.project_role(project_id) = 'admin');

commit;
