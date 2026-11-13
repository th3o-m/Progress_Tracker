begin;

-- Redeem an invitation in one PostgreSQL transaction. The FOR UPDATE lock
-- serializes attempts to accept the same token, including competing users.
-- Execute only from the trusted backend using the service-role client.
create or replace function public.accept_project_invitation(
  p_token text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invitation public.project_invitations%rowtype;
  v_project public.projects%rowtype;
  v_membership public.project_members%rowtype;
  v_now timestamptz;
begin
  select *
    into v_invitation
    from public.project_invitations
   where token = p_token
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('outcome', 'not_found');
  end if;

  -- Use wall-clock time after taking the lock: a waiting request may expire.
  v_now := pg_catalog.clock_timestamp();
  if v_invitation.status = 'Pending' and v_invitation.expires_at <= v_now then
    update public.project_invitations
       set status = 'Expired', updated_at = v_now
     where id = v_invitation.id;
    return pg_catalog.jsonb_build_object('outcome', 'expired');
  end if;

  if v_invitation.status = 'Revoked' then
    return pg_catalog.jsonb_build_object('outcome', 'revoked');
  elsif v_invitation.status = 'Expired' then
    return pg_catalog.jsonb_build_object('outcome', 'expired');
  elsif v_invitation.status = 'Accepted' then
    return pg_catalog.jsonb_build_object('outcome', 'already_accepted');
  end if;

  select *
    into v_project
    from public.projects
   where id = v_invitation.project_id;

  if not found or v_project.status = 'cancelled' then
    return pg_catalog.jsonb_build_object('outcome', 'project_not_found');
  end if;

  -- The API already verifies this, but do not grant membership to an inactive
  -- profile even if the function is called by another privileged service.
  if not exists (
    select 1
      from public.profiles
     where id = p_user_id and active = true
  ) then
    return pg_catalog.jsonb_build_object('outcome', 'inactive_user');
  end if;

  -- Unique (project_id, user_id) also handles concurrent membership creation
  -- through another invitation or an administrative request.
  insert into public.project_members (project_id, user_id, role, district)
  values (v_invitation.project_id, p_user_id, v_invitation.role, null)
  on conflict (project_id, user_id) do nothing
  returning * into v_membership;

  if v_membership.id is null then
    select *
      into v_membership
      from public.project_members
     where project_id = v_invitation.project_id and user_id = p_user_id;

    if not found then
      raise exception 'Membership could not be resolved after conflict';
    end if;

    -- Preserve existing API behavior: existing members do not consume tokens.
    return pg_catalog.jsonb_build_object(
      'outcome', 'already_member',
      'project', pg_catalog.jsonb_build_object(
        'id', v_project.id, 'name', v_project.name, 'role', v_membership.role
      ),
      'membership', pg_catalog.jsonb_build_object(
        'id', v_membership.id, 'role', v_membership.role
      )
    );
  end if;

  update public.project_invitations
     set status = 'Accepted',
         accepted_by = p_user_id,
         accepted_at = v_now,
         updated_at = v_now
   where id = v_invitation.id and status = 'Pending';

  if not found then
    raise exception 'Invitation state changed during redemption';
  end if;

  -- Audit logging is in the same transaction as membership + acceptance.
  insert into public.audit_log (user_id, action, table_name, record_id, details)
  values (
    p_user_id,
    'create',
    'project_members',
    v_membership.id,
    pg_catalog.jsonb_build_object(
      'project_id', v_invitation.project_id,
      'role', v_invitation.role,
      'invitation_id', v_invitation.id
    )
  );

  return pg_catalog.jsonb_build_object(
    'outcome', 'accepted',
    'project', pg_catalog.jsonb_build_object(
      'id', v_project.id, 'name', v_project.name, 'role', v_invitation.role
    ),
    'membership', pg_catalog.to_jsonb(v_membership)
  );
end;
$$;

-- The RPC takes a user ID, so it MUST NOT be callable with an ordinary user's
-- JWT. Only the backend's service-role client may execute it.
revoke all on function public.accept_project_invitation(text, uuid)
  from public, anon, authenticated;
grant execute on function public.accept_project_invitation(text, uuid)
  to service_role;

commit;
