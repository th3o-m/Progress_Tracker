begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  severity text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications
  drop constraint if exists notifications_user_project_entity_key;

alter table public.notifications
  add constraint notifications_user_project_entity_key
  unique (user_id, project_id, type, entity_type, entity_id);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_project_idx on public.notifications(project_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_insert_own_project_member on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = notifications.project_id
        and pm.user_id = auth.uid()
    )
  );

create policy notifications_insert_own_project_member on public.notifications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = notifications.project_id
        and pm.user_id = auth.uid()
    )
  );

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';

commit;
