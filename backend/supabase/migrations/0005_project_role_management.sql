begin;

drop policy if exists project_members_select_project_admin on public.project_members;
drop policy if exists project_members_insert_org_project_admin on public.project_members;
drop policy if exists project_members_update_org_project_admin on public.project_members;
drop policy if exists project_members_delete_org_project_admin on public.project_members;

create policy project_members_select_project_management on public.project_members
for select to authenticated
using (public.project_role(project_id) in ('admin', 'supervisor'));

create policy project_members_insert_project_admin on public.project_members
for insert to authenticated
with check (public.project_role(project_id) = 'admin');

create policy project_members_update_project_admin on public.project_members
for update to authenticated
using (public.project_role(project_id) = 'admin')
with check (public.project_role(project_id) = 'admin');

create policy project_members_delete_project_admin on public.project_members
for delete to authenticated
using (public.project_role(project_id) = 'admin');

commit;
