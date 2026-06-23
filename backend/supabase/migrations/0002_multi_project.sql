begin;

alter table public.profiles add column email text;
alter table public.profiles add column is_org_admin boolean not null default false;

update public.profiles p
set email = lower(coalesce(u.email, p.id::text || '@invalid.local'))
from auth.users u
where u.id = p.id;
update public.profiles set email = id::text || '@invalid.local' where email is null;
update public.profiles set is_org_admin = true where role = 'admin';
alter table public.profiles alter column email set not null;
alter table public.profiles add constraint profiles_email_key unique (email);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  district text,
  sector text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'on_hold', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('officer', 'supervisor', 'finance', 'admin')),
  district text,
  added_at timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table public.activities add column project_id uuid references public.projects(id) on delete cascade;
alter table public.progress_updates add column project_id uuid references public.projects(id) on delete cascade;
alter table public.challenges add column project_id uuid references public.projects(id) on delete cascade;
alter table public.beneficiaries add column project_id uuid references public.projects(id) on delete cascade;
alter table public.financial_entries add column project_id uuid references public.projects(id) on delete cascade;
alter table public.reports add column project_id uuid references public.projects(id) on delete cascade;

-- Preserve the old single-project installation as one project and carry each
-- employee's former role/district into its initial membership.
do $$
declare
  legacy_project_id uuid;
begin
  if exists (select 1 from public.profiles) then
    insert into public.projects (name, description, status, created_by)
    values (
      'Legacy ABS Phase II / NBSAP Project',
      'Automatically created by migration 0002 for pre-migration records.',
      'active',
      (select id from public.profiles order by (role = 'admin') desc, created_at asc limit 1)
    )
    returning id into legacy_project_id;

    insert into public.project_members (project_id, user_id, role, district)
    select legacy_project_id, id, role, district from public.profiles;

    update public.activities set project_id = legacy_project_id where project_id is null;
    update public.progress_updates set project_id = legacy_project_id where project_id is null;
    update public.challenges set project_id = legacy_project_id where project_id is null;
    update public.beneficiaries set project_id = legacy_project_id where project_id is null;
    update public.financial_entries set project_id = legacy_project_id where project_id is null;
    update public.reports set project_id = legacy_project_id where project_id is null;
  end if;
end $$;

alter table public.activities alter column project_id set not null;
alter table public.progress_updates alter column project_id set not null;
alter table public.challenges alter column project_id set not null;
alter table public.beneficiaries alter column project_id set not null;
alter table public.financial_entries alter column project_id set not null;
alter table public.reports alter column project_id set not null;

create index project_members_user_idx on public.project_members(user_id, project_id);
create index projects_created_by_idx on public.projects(created_by);
create index activities_project_idx on public.activities(project_id);
create index progress_updates_project_idx on public.progress_updates(project_id);
create index challenges_project_idx on public.challenges(project_id);
create index beneficiaries_project_idx on public.beneficiaries(project_id);
create index financial_entries_project_idx on public.financial_entries(project_id);
create index reports_project_idx on public.reports(project_id);

-- Remove all v1 policies before dropping the old profile role columns.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'activities', 'progress_updates', 'challenges', 'beneficiaries', 'financial_entries', 'reports', 'audit_log')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;

  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'reports_storage_%'
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

drop function if exists public.current_user_role();
alter table public.profiles drop column role;
alter table public.profiles drop column district;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- These helpers are used only where querying the policy's own table would
-- recurse. They execute as the migration owner and expose no row data.
create or replace function public.is_org_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_org_admin from public.profiles where id = auth.uid() and active), false) $$;
revoke all on function public.is_org_admin() from public;
grant execute on function public.is_org_admin() to authenticated;

create or replace function public.project_role(target_project_id uuid)
returns text language sql stable security definer set search_path = public
as $$
  select pm.role
  from public.project_members pm
  join public.profiles p on p.id = pm.user_id
  where pm.project_id = target_project_id and pm.user_id = auth.uid() and p.active
$$;
revoke all on function public.project_role(uuid) from public;
grant execute on function public.project_role(uuid) to authenticated;

-- Profiles: organization identity is visible to self and organization admins.
create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_org_admin on public.profiles for select to authenticated using (public.is_org_admin());
create policy profiles_insert_org_admin on public.profiles for insert to authenticated with check (public.is_org_admin());
create policy profiles_update_org_admin on public.profiles for update to authenticated using (public.is_org_admin()) with check (public.is_org_admin());
create policy profiles_delete_org_admin on public.profiles for delete to authenticated using (public.is_org_admin());

-- Projects and membership.
create policy projects_select_member on public.projects for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_id = projects.id and pm.user_id = auth.uid())
);
create policy projects_insert_org_admin on public.projects for insert to authenticated with check (public.is_org_admin() and created_by = auth.uid());
create policy projects_update_project_admin on public.projects for update to authenticated using (public.project_role(id) = 'admin') with check (public.project_role(id) = 'admin');
create policy projects_delete_org_project_admin on public.projects for delete to authenticated using (public.is_org_admin() and public.project_role(id) = 'admin');

create policy project_members_select_self on public.project_members for select to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
);
create policy project_members_select_project_admin on public.project_members for select to authenticated using (public.project_role(project_id) = 'admin');
create policy project_members_insert_org_project_admin on public.project_members for insert to authenticated with check (public.is_org_admin() and public.project_role(project_id) = 'admin');
create policy project_members_update_org_project_admin on public.project_members for update to authenticated using (public.is_org_admin() and public.project_role(project_id) = 'admin') with check (public.is_org_admin() and public.project_role(project_id) = 'admin');
create policy project_members_delete_org_project_admin on public.project_members for delete to authenticated using (public.is_org_admin() and public.project_role(project_id) = 'admin');

-- Activities.
create policy activities_select_officer on public.activities for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_id = activities.project_id and pm.user_id = auth.uid() and pm.role = 'officer' and pm.district = activities.district)
);
create policy activities_select_staff on public.activities for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_id = activities.project_id and pm.user_id = auth.uid() and pm.role in ('supervisor', 'finance', 'admin'))
);
create policy activities_insert_management on public.activities for insert to authenticated with check (
  exists (select 1 from public.project_members pm where pm.project_id = activities.project_id and pm.user_id = auth.uid() and pm.role in ('supervisor', 'admin'))
);
create policy activities_update_officer on public.activities for update to authenticated using (
  responsible_officer = auth.uid() and exists (select 1 from public.project_members pm where pm.project_id = activities.project_id and pm.user_id = auth.uid() and pm.role = 'officer')
) with check (responsible_officer = auth.uid() and public.project_role(project_id) = 'officer');
create policy activities_update_management on public.activities for update to authenticated using (public.project_role(project_id) in ('supervisor', 'admin')) with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy activities_delete_admin on public.activities for delete to authenticated using (public.project_role(project_id) = 'admin');

-- Progress updates.
create policy progress_select_officer on public.progress_updates for select to authenticated using (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy progress_select_management on public.progress_updates for select to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'));
create policy progress_insert_officer on public.progress_updates for insert to authenticated with check (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy progress_insert_management on public.progress_updates for insert to authenticated with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy progress_update_officer on public.progress_updates for update to authenticated using (officer_id = auth.uid() and public.project_role(project_id) = 'officer') with check (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy progress_update_management on public.progress_updates for update to authenticated using (public.project_role(project_id) in ('supervisor', 'admin')) with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy progress_delete_owner_or_admin on public.progress_updates for delete to authenticated using ((officer_id = auth.uid() and public.project_role(project_id) = 'officer') or public.project_role(project_id) in ('supervisor', 'admin'));

-- Challenges.
create policy challenges_select_officer on public.challenges for select to authenticated using (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy challenges_select_management on public.challenges for select to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'));
create policy challenges_insert_officer on public.challenges for insert to authenticated with check (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy challenges_insert_management on public.challenges for insert to authenticated with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy challenges_update_officer on public.challenges for update to authenticated using (officer_id = auth.uid() and public.project_role(project_id) = 'officer') with check (officer_id = auth.uid() and public.project_role(project_id) = 'officer');
create policy challenges_update_management on public.challenges for update to authenticated using (public.project_role(project_id) in ('supervisor', 'admin')) with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy challenges_delete_owner_or_admin on public.challenges for delete to authenticated using ((officer_id = auth.uid() and public.project_role(project_id) = 'officer') or public.project_role(project_id) in ('supervisor', 'admin'));

-- Beneficiaries.
create policy beneficiaries_select_officer on public.beneficiaries for select to authenticated using (
  exists (select 1 from public.project_members pm where pm.project_id = beneficiaries.project_id and pm.user_id = auth.uid() and pm.role = 'officer' and pm.district = beneficiaries.district)
);
create policy beneficiaries_select_management on public.beneficiaries for select to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'));
create policy beneficiaries_insert_officer on public.beneficiaries for insert to authenticated with check (
  registered_by = auth.uid() and exists (select 1 from public.project_members pm where pm.project_id = beneficiaries.project_id and pm.user_id = auth.uid() and pm.role = 'officer' and pm.district = beneficiaries.district)
);
create policy beneficiaries_insert_management on public.beneficiaries for insert to authenticated with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy beneficiaries_update_officer on public.beneficiaries for update to authenticated using (registered_by = auth.uid() and public.project_role(project_id) = 'officer') with check (registered_by = auth.uid() and exists (select 1 from public.project_members pm where pm.project_id = beneficiaries.project_id and pm.user_id = auth.uid() and pm.role = 'officer' and pm.district = beneficiaries.district));
create policy beneficiaries_update_management on public.beneficiaries for update to authenticated using (public.project_role(project_id) in ('supervisor', 'admin')) with check (public.project_role(project_id) in ('supervisor', 'admin'));
create policy beneficiaries_delete_owner_or_admin on public.beneficiaries for delete to authenticated using ((registered_by = auth.uid() and public.project_role(project_id) = 'officer') or public.project_role(project_id) in ('supervisor', 'admin'));

-- Financial entries.
create policy financial_select_officer on public.financial_entries for select to authenticated using (submitted_by = auth.uid() and public.project_role(project_id) = 'officer');
create policy financial_select_staff on public.financial_entries for select to authenticated using (public.project_role(project_id) in ('supervisor', 'finance', 'admin'));
create policy financial_insert_member on public.financial_entries for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending' and public.project_role(project_id) in ('officer', 'supervisor', 'finance', 'admin'));
create policy financial_update_finance on public.financial_entries for update to authenticated using (public.project_role(project_id) = 'finance') with check (approved_by = auth.uid() and approved_at is not null and status in ('approved', 'rejected') and public.project_role(project_id) = 'finance');
create policy financial_update_admin on public.financial_entries for update to authenticated using (public.project_role(project_id) = 'admin') with check (public.project_role(project_id) = 'admin');
create policy financial_delete_owner_pending on public.financial_entries for delete to authenticated using ((submitted_by = auth.uid() and status = 'pending') or public.project_role(project_id) = 'admin');

-- Reports.
create policy reports_select_management on public.reports for select to authenticated using (public.project_role(project_id) in ('supervisor', 'admin'));
create policy reports_insert_management on public.reports for insert to authenticated with check (generated_by = auth.uid() and public.project_role(project_id) in ('supervisor', 'admin'));
create policy reports_update_admin on public.reports for update to authenticated using (public.project_role(project_id) = 'admin') with check (public.project_role(project_id) = 'admin');
create policy reports_delete_admin on public.reports for delete to authenticated using (public.project_role(project_id) = 'admin');

-- Audit log remains organization-scoped because its v1 schema has no project_id.
create policy audit_select_org_admin on public.audit_log for select to authenticated using (public.is_org_admin());
create policy audit_insert_self on public.audit_log for insert to authenticated with check (user_id = auth.uid());

-- New report object keys begin with the project UUID.
create policy reports_storage_select_member on storage.objects for select to authenticated using (
  bucket_id = 'reports' and public.project_role(
    case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end
  ) in ('supervisor', 'admin')
);
create policy reports_storage_insert_management on storage.objects for insert to authenticated with check (
  bucket_id = 'reports' and public.project_role(
    case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid else null end
  ) in ('supervisor', 'admin')
);

commit;
