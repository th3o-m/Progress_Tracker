begin;

create table public.project_reminder_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email_enabled boolean not null default false,
  frequency text not null default 'manual' check (frequency in ('manual', 'daily', 'every_3_days', 'weekly', 'biweekly', 'monthly')),
  last_sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index project_reminder_settings_due_idx
  on public.project_reminder_settings(email_enabled, frequency, last_sent_at);

alter table public.project_reminder_settings enable row level security;

create policy project_reminder_settings_select_management
  on public.project_reminder_settings for select to authenticated
  using (public.project_role(project_id) in ('admin', 'supervisor'));

create policy project_reminder_settings_insert_management
  on public.project_reminder_settings for insert to authenticated
  with check (public.project_role(project_id) in ('admin', 'supervisor') and created_by = auth.uid());

create policy project_reminder_settings_update_management
  on public.project_reminder_settings for update to authenticated
  using (public.project_role(project_id) in ('admin', 'supervisor'))
  with check (public.project_role(project_id) in ('admin', 'supervisor'));

create or replace function public.set_project_reminder_settings_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create trigger project_reminder_settings_updated_at
before update on public.project_reminder_settings
for each row execute function public.set_project_reminder_settings_updated_at();

commit;
