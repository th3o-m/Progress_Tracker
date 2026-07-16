begin;

drop policy if exists overdue_task_notifications_select_project_admin
  on public.overdue_task_notifications;

create policy overdue_task_notifications_select_project_management
  on public.overdue_task_notifications
  for select
  to authenticated
  using (public.project_role(project_id) in ('admin', 'supervisor'));

notify pgrst, 'reload schema';

commit;
