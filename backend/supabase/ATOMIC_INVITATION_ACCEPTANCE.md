# Atomic invitation acceptance: deployment and verification

## Deploy order

1. Review and merge the migration and API change together.
2. Apply database migrations **before** deploying the new backend, since the new handler calls `accept_project_invitation`:
   ```bash
   cd backend
   supabase db push
   ```
3. Deploy the backend. The frontend API contract for a successful acceptance is unchanged.
4. Verify the RPC grants: the function accepts a user ID, so **only** `service_role` may execute it. Never grant execute to `anon` or `authenticated`.

Do not paste service-role credentials into StackBlitz's public frontend workspace.

## Expected behavior

| Situation | HTTP | Result |
| --- | --- | --- |
| Valid pending invitation for new member | 201 | Member added, invitation Accepted, audit recorded atomically |
| Existing member with pending invitation | 200 | Existing role retained, invitation stays Pending |
| Reused Accepted invitation | 409 | No extra membership |
| Revoked / expired invitation | 410 | No membership created |
| Invalid token | 400 or 404 | No membership created |
| Cancelled or deleted project | 404 | No membership created |
| Missing / inactive user | 401 | No membership created |

The function uses `SELECT ... FOR UPDATE` on the token's invitation row. Concurrent accepts queue behind the lock; once the first transaction commits, another request sees the updated state.

## Tests to run against a disposable Supabase test project

- Create a pending invitation to a test project and two test users who are not members. Send two simultaneous `POST /api/invitations/:token/accept` requests using each user's access token (for example, from two logged-in browsers). Confirm exactly **one** 201 response and one 409 response, one membership, one Accepted invitation, and one audit record.
- Trigger two simultaneous accepts from the **same** authenticated user. Confirm exactly one membership, and no duplicated audit record.
- Create an invitation expiring immediately, try acceptance after expiry and confirm HTTP 410 and no membership.
- Revoke a pending invitation while attempting acceptance. Whichever transaction wins determines the terminal state, but membership and invitation state must agree.
- Make the audit insertion fail in an isolated test transaction (using a deliberate test-only constraint or a rolled-back test fixture); verify no membership and no Accepted status survive.
- Verify an already-member request leaves the invitation pending and preserves the existing member role.
- Verify a non-admin authenticated client cannot invoke `public.accept_project_invitation(text, uuid)` directly.

## Scope note

The token validation (`GET /api/invitations/:token`) is a preview and not the authoritative check. The accepting RPC rechecks status and expiry under the row lock. Database schema migrations still need to be run against the deployed project, and concurrent integration tests have not been executed in this review.
