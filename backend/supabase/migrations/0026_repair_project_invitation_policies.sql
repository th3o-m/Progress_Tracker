begin;

alter table public.project_invitations enable row level security;

-- Recreate the intended defense-in-depth policies in case an older deployment
-- created the table but lost its policy definitions.
drop policy if exists project_invitations_select_project_admin
  on public.project_invitations;
create policy project_invitations_select_project_admin
  on public.project_invitations
  for select
  to authenticated
  using (private.project_role(project_id) = 'admin');

drop policy if exists project_invitations_insert_project_admin
  on public.project_invitations;
create policy project_invitations_insert_project_admin
  on public.project_invitations
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and private.project_role(project_id) = 'admin'
  );

drop policy if exists project_invitations_update_project_admin
  on public.project_invitations;
create policy project_invitations_update_project_admin
  on public.project_invitations
  for update
  to authenticated
  using (private.project_role(project_id) = 'admin')
  with check (private.project_role(project_id) = 'admin');

commit;
