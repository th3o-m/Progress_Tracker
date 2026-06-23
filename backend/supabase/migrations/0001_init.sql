create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('officer', 'supervisor', 'finance', 'admin')),
  district text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  district text not null,
  responsible_officer uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  status text not null,
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  officer_id uuid not null references public.profiles(id),
  progress_pct integer not null check (progress_pct between 0 and 100),
  status text not null,
  narrative text not null,
  report_date date not null,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  officer_id uuid not null references public.profiles(id),
  challenge_type text not null,
  description text not null,
  mitigation_plan text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  national_id text not null unique,
  beneficiary_type text not null,
  district text not null,
  contact_number text,
  notes text,
  registered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  expense_category text not null,
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  receipt_url text,
  submitted_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null check (report_type in ('pdf', 'excel')),
  file_url text not null,
  generated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activities_district_idx on public.activities(district);
create index activities_officer_idx on public.activities(responsible_officer);
create index progress_activity_idx on public.progress_updates(activity_id);
create index progress_officer_idx on public.progress_updates(officer_id);
create index challenges_activity_idx on public.challenges(activity_id);
create index beneficiaries_district_idx on public.beneficiaries(district);
create index financial_activity_idx on public.financial_entries(activity_id);
create index financial_status_idx on public.financial_entries(status);
create index audit_user_created_idx on public.audit_log(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.progress_updates enable row level security;
alter table public.challenges enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.financial_entries enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- SECURITY DEFINER avoids recursive RLS evaluation only when a policy on
-- profiles itself needs the caller's role. Policies on all other tables use
-- the explicit profiles subquery requested by the application contract.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- Profiles
create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_management on public.profiles for select to authenticated using (public.current_user_role() in ('supervisor', 'admin'));
create policy profiles_insert_admin on public.profiles for insert to authenticated with check (public.current_user_role() = 'admin');
create policy profiles_update_admin on public.profiles for update to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy profiles_delete_admin on public.profiles for delete to authenticated using (public.current_user_role() = 'admin');

-- Activities
create policy activities_select_officer on public.activities for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and district = (select district from public.profiles where id = auth.uid()));
create policy activities_select_staff on public.activities for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'finance', 'admin'));
create policy activities_insert_management on public.activities for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy activities_update_officer on public.activities for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and responsible_officer = auth.uid()) with check (responsible_officer = auth.uid());
create policy activities_update_management on public.activities for update to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin')) with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy activities_delete_admin on public.activities for delete to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Progress updates
create policy progress_select_officer on public.progress_updates for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid());
create policy progress_select_management on public.progress_updates for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy progress_insert_officer on public.progress_updates for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid());
create policy progress_insert_management on public.progress_updates for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy progress_update_officer on public.progress_updates for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid()) with check (officer_id = auth.uid());
create policy progress_update_management on public.progress_updates for update to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin')) with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy progress_delete_owner_or_admin on public.progress_updates for delete to authenticated using (officer_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));

-- Challenges
create policy challenges_select_officer on public.challenges for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid());
create policy challenges_select_management on public.challenges for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy challenges_insert_officer on public.challenges for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid());
create policy challenges_insert_management on public.challenges for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy challenges_update_officer on public.challenges for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and officer_id = auth.uid()) with check (officer_id = auth.uid());
create policy challenges_update_management on public.challenges for update to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin')) with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy challenges_delete_owner_or_admin on public.challenges for delete to authenticated using (officer_id = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));

-- Beneficiaries
create policy beneficiaries_select_officer on public.beneficiaries for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and district = (select district from public.profiles where id = auth.uid()));
create policy beneficiaries_select_management on public.beneficiaries for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy beneficiaries_insert_officer on public.beneficiaries for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) = 'officer' and registered_by = auth.uid() and district = (select district from public.profiles where id = auth.uid()));
create policy beneficiaries_insert_management on public.beneficiaries for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy beneficiaries_update_officer on public.beneficiaries for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and registered_by = auth.uid()) with check (registered_by = auth.uid() and district = (select district from public.profiles where id = auth.uid()));
create policy beneficiaries_update_management on public.beneficiaries for update to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin')) with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy beneficiaries_delete_owner_or_admin on public.beneficiaries for delete to authenticated using (registered_by = auth.uid() or (select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));

-- Financial entries
create policy financial_select_officer on public.financial_entries for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'officer' and submitted_by = auth.uid());
create policy financial_select_staff on public.financial_entries for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'finance', 'admin'));
create policy financial_insert_staff on public.financial_entries for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('officer', 'supervisor', 'finance', 'admin') and submitted_by = auth.uid() and status = 'pending');
create policy financial_update_finance on public.financial_entries for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'finance') with check (approved_by = auth.uid() and approved_at is not null and status in ('approved', 'rejected'));
create policy financial_update_admin on public.financial_entries for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy financial_delete_owner_pending on public.financial_entries for delete to authenticated using ((submitted_by = auth.uid() and status = 'pending') or (select role from public.profiles where id = auth.uid()) = 'admin');

-- Reports
create policy reports_select_management on public.reports for select to authenticated using ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy reports_insert_management on public.reports for insert to authenticated with check ((select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin') and generated_by = auth.uid());
create policy reports_update_admin on public.reports for update to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy reports_delete_admin on public.reports for delete to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Audit log is append-only for normal users.
create policy audit_select_admin on public.audit_log for select to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy audit_insert_self on public.audit_log for insert to authenticated with check (user_id = auth.uid() and (select role from public.profiles where id = auth.uid()) in ('officer', 'supervisor', 'finance', 'admin'));

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do update set public = excluded.public;

create policy reports_storage_select_management on storage.objects for select to authenticated
using (bucket_id = 'reports' and (select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
create policy reports_storage_insert_management on storage.objects for insert to authenticated
with check (bucket_id = 'reports' and (select role from public.profiles where id = auth.uid()) in ('supervisor', 'admin'));
