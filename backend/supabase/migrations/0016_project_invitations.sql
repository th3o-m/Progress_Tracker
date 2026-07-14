begin;

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  role text not null default 'officer' check (role in ('officer', 'supervisor', 'finance', 'admin')),
  expires_at timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Expired', 'Revoked')),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_invitations_project_idx on public.project_invitations(project_id, created_at desc);
create index project_invitations_created_by_idx on public.project_invitations(created_by);
create index project_invitations_expires_idx on public.project_invitations(expires_at);

alter table public.project_invitations enable row level security;

create policy project_invitations_select_project_admin on public.project_invitations
for select to authenticated
using (public.project_role(project_id) = 'admin');

create policy project_invitations_insert_project_admin on public.project_invitations
for insert to authenticated
with check (created_by = auth.uid() and public.project_role(project_id) = 'admin');

create policy project_invitations_update_project_admin on public.project_invitations
for update to authenticated
using (public.project_role(project_id) = 'admin')
with check (public.project_role(project_id) = 'admin');

commit;
