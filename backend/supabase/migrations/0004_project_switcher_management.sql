begin;

drop policy if exists projects_insert_org_admin on public.projects;
drop policy if exists projects_update_project_admin on public.projects;
drop policy if exists projects_delete_org_project_admin on public.projects;

-- Organization admins and existing project admins/supervisors may create a
-- project. The API separately verifies the selected source project.
create policy projects_insert_authorized_manager on public.projects
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_org_admin()
    or exists (
      select 1
      from public.project_members pm
      where pm.user_id = auth.uid()
        and pm.role in ('admin', 'supervisor')
    )
  )
);

-- Removal is implemented as status='cancelled', preserving project history.
create policy projects_update_manager on public.projects
for update to authenticated
using (public.project_role(id) in ('admin', 'supervisor'))
with check (public.project_role(id) in ('admin', 'supervisor'));

-- Physical deletion remains unavailable to authenticated clients.

commit;
