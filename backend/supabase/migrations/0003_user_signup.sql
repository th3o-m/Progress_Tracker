begin;

-- Create the organization profile in the same transaction as a new Auth user.
-- Public signup can never grant organization-admin privileges or project access.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    is_org_admin,
    active
  )
  values (
    new.id,
    lower(coalesce(new.email, new.id::text || '@invalid.local')),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Employee'), '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    false,
    true
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
