begin;

-- Keep privileged helpers out of the exposed public Data API schema. The
-- functions retain their object identities, so existing policies and the Auth
-- trigger continue to reference them after the schema move.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, supabase_auth_admin;

alter function public.handle_new_auth_user() set schema private;
alter function public.is_org_admin() set schema private;
alter function public.project_role(uuid) set schema private;

-- All table references are schema-qualified, so an empty search path is safe.
alter function private.is_org_admin() set search_path = '';
alter function private.project_role(uuid) set search_path = '';

-- The signup trigger runs as Supabase Auth. It is not a client-callable RPC.
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin, service_role;

-- RLS policies execute these helpers for signed-in users. The private schema
-- is not exposed through the Data API, which prevents direct RPC calls.
revoke all on function private.is_org_admin() from public, anon;
grant execute on function private.is_org_admin() to authenticated, service_role;

revoke all on function private.project_role(uuid) from public, anon;
grant execute on function private.project_role(uuid) to authenticated, service_role;

commit;
