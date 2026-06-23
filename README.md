# Multi-Project M&E Dashboard

This repository contains two independent applications:

- `frontend/` - the existing React/Vite dashboard.
- `backend/` - the Node.js, TypeScript, Express, and Supabase API.

Employees have one organization-wide Supabase Auth account and profile. Access inside a project is determined by `project_members`, allowing the same employee to hold different roles and district scopes in different projects. The API verifies the browser's Bearer token, loads the active organization profile, resolves project membership for project-scoped routes, and performs trusted database operations with the server-only service-role key.

## Changes implemented

- Added `projects` and `project_members` with per-project employee roles and district scopes.
- Replaced organization-wide profile roles with `is_org_admin` and organization identity fields.
- Moved operational routes under `/api/projects/:projectId/`.
- Added project-access middleware that returns 404 when membership is missing.
- Added organization user, project, and project-membership management routes.
- Added email-based onboarding of existing employees into projects.
- Added `project_id` scoping to all domain reads, writes, reports, and audit details.
- Replaced flat-role RLS policies with membership-aware project policies.
- Added a legacy-project backfill for existing single-project installations.
- Prefixed generated report Storage objects with the project UUID.
- Added a sidebar project switcher with role-gated create and safe removal controls.
- Removed dashboard mock metrics; all views now load records for the selected project and show an empty-state prompt until data is entered.
- Connected Data Entry forms to activity, progress, challenge, beneficiary, and financial API endpoints with automatic metric refresh.

## Setup

### Prerequisites

- Node.js 20 LTS or newer
- npm
- A Supabase project
- Supabase CLI, or access to the Supabase SQL editor

### Environment

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REPORT_URL_TTL_SECONDS=3600
```

`FRONTEND_URL` is the only browser origin accepted by CORS. The service-role key must never be placed in frontend code or a `VITE_` environment variable.

### Apply migrations

For a new installation, apply all migrations in order. For an existing installation, apply every pending migration. Migration `0002` creates a legacy project for old single-project data; migration `0003` enables safe profile creation during employee signup.

Using the Supabase CLI from `backend/`:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The files are:

1. `backend/supabase/migrations/0001_init.sql`
2. `backend/supabase/migrations/0002_multi_project.sql`
3. `backend/supabase/migrations/0003_user_signup.sql`
4. `backend/supabase/migrations/0004_project_switcher_management.sql`

When using the SQL editor, run them in that order. Migration `0002` creates `projects` and `project_members`, adds and backfills every `project_id`, replaces the v1 RLS policies, and upgrades profiles to organization-wide identities. Migration `0003` adds the Auth trigger required by the Create Account screen. Migration `0004` authorizes project admins and supervisors to manage projects from the switcher while keeping removal non-destructive.

For a completely new installation, create the first Supabase Auth user and bootstrap its profile after both migrations:

```sql
insert into public.profiles (id, email, full_name, is_org_admin, active)
values ('AUTH_USER_UUID', 'admin@example.org', 'System Administrator', true, true);
```

That organization administrator can create additional employee accounts through `POST /api/users` and projects through `POST /api/projects`.

### Run applications

```bash
cd backend
npm install
npm run dev
```

The API starts on `http://localhost:3000`; `GET /health` is unauthenticated. For production:

```bash
npm run build
npm start
```

Run the existing frontend separately:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set the frontend environment values before starting it:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The frontend anon key is public by design; never use the service-role key here. With these values configured, employees can create an account, confirm their email when confirmation is enabled, sign in, and log out. Without them, the signed-out screen offers an explicit demo-mode entry for local UI work.

In Supabase Dashboard, ensure Authentication > Providers > Email is enabled. Configure the Site URL and redirect URLs for the frontend address, such as `http://localhost:5173`, so email confirmation links return to the application.

## Testing

Use a development or staging Supabase project first. Back up production before applying pending migrations.

### 1. Compile and start

```bash
cd backend
npm install
npm run typecheck
npm run build
npm run dev
```

In another terminal:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

Verify the frontend still builds separately:

```bash
cd frontend
npm install
npm run build
```

### 2. Verify the migration

After `supabase db push`, run this in the Supabase SQL editor:

```sql
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'activities', 'progress_updates', 'challenges',
    'beneficiaries', 'financial_entries', 'reports'
  )
  and column_name = 'project_id';

select 'activities' as table_name, count(*) as unscoped from public.activities where project_id is null
union all select 'progress_updates', count(*) from public.progress_updates where project_id is null
union all select 'challenges', count(*) from public.challenges where project_id is null
union all select 'beneficiaries', count(*) from public.beneficiaries where project_id is null
union all select 'financial_entries', count(*) from public.financial_entries where project_id is null
union all select 'reports', count(*) from public.reports where project_id is null;

select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'projects', 'project_members', 'profiles', 'activities',
    'progress_updates', 'challenges', 'beneficiaries',
    'financial_entries', 'reports', 'audit_log'
  )
group by tablename
order by tablename;
```

All six `project_id` columns must report `NO`, every `unscoped` count must be `0`, and every listed table must have policies.

### 3. Prepare test identities

Create test accounts for an organization admin, project supervisor, officer, finance employee, and an employee who is not a member of the test project. Obtain their Supabase access tokens through the frontend login or Supabase Auth.

Set local variables without committing them:

```bash
export API_URL=http://localhost:3000/api
export ADMIN_TOKEN='organization-admin-access-token'
export SUPERVISOR_TOKEN='supervisor-access-token'
export OFFICER_TOKEN='officer-access-token'
export FINANCE_TOKEN='finance-access-token'
export NON_MEMBER_TOKEN='non-member-access-token'
```

Test self-registration before creating the remaining role-specific users:

1. Open the frontend and select **Create account**.
2. Enter a full name, optional phone, email, and a password of at least eight characters.
3. If email confirmation is enabled, follow the link sent by Supabase and then sign in.
4. Confirm a matching non-admin profile was created:

```sql
select id, email, full_name, phone, is_org_admin, active
from public.profiles
where email = 'new.employee@example.org';
```

`is_org_admin` must be `false`. The employee will have no project access until an organization administrator adds their email to a project.

### 4. Test project setup and onboarding

Confirm the current administrator and memberships:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "$API_URL/users/me"
```

Create a project and save the returned `id` as `PROJECT_ID`:

```bash
curl -X POST "$API_URL/projects" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Environment Project","sector":"environment","district":"Chobe","status":"active"}'
```

The response must include the creator's automatic `admin` membership. Add an existing employee:

```bash
curl -X POST "$API_URL/projects/$PROJECT_ID/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@example.org","role":"officer","district":"Chobe"}'
```

Repeat for supervisor and finance accounts. An unknown email must return 404; adding the same employee twice must return 409.

### 5. Test project isolation and role enforcement

Use a non-member token against the project:

```bash
curl -i -H "Authorization: Bearer $NON_MEMBER_TOKEN" \
  "$API_URL/projects/$PROJECT_ID/activities"
```

Expected result: `404 Project not found`, not 403.

Verify this role matrix:

- An officer cannot create an activity; a supervisor can.
- An officer only sees activities and beneficiaries in their membership district.
- An assigned officer can update only `status` and `progress_pct` on their activity.
- An officer cannot edit another officer's progress, challenge, beneficiary, or financial entry.
- Only finance/admin can approve or reject pending financial entries.
- Sending `project_id` in a domain request body returns 400.
- Using a record UUID belonging to another project returns 404.

Example supervisor activity creation:

```bash
curl -X POST "$API_URL/projects/$PROJECT_ID/activities" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST-ACT-001","name":"Test Activity","category":"Monitoring","district":"Chobe","responsible_officer":"OFFICER_PROFILE_UUID","start_date":"2026-01-01","end_date":"2026-12-31","status":"active","progress_pct":0}'
```

The same activity can be created from **Data Entry > New Activity**. After saving it, confirm it immediately appears in Overview and Work Plan. Then submit progress, challenge, beneficiary, and financial entries and confirm the relevant charts refresh. A new project with no records must display **Enter data in Data Entry to get metrics** instead of sample values.

### 6. Test financial review and reports

After creating a pending financial entry, approve it with the finance token:

```bash
curl -X PATCH "$API_URL/projects/$PROJECT_ID/financial-entries/ENTRY_UUID/approve" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Verify `status`, `approved_by`, and `approved_at` are set. A second review attempt must return 409.

Generate a report as a supervisor/admin:

```bash
curl -X POST "$API_URL/projects/$PROJECT_ID/reports/generate" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"pdf","start_date":"2026-01-01","end_date":"2026-12-31"}'
```

Confirm the response contains a signed `url`, its Storage path starts with the project UUID, and the `reports` row has the same `project_id`.

### 7. Verify audit records and RLS

Confirm successful mutations produced audit rows containing `project_id` in `details`:

```sql
select action, table_name, record_id, details, created_at
from public.audit_log
order by created_at desc
limit 25;
```

The Express API uses the service-role client, so API tests exercise controller authorization rather than RLS execution. Test RLS separately through Supabase REST with an employee token and the public anon key:

```bash
curl "$SUPABASE_URL/rest/v1/activities?project_id=eq.$PROJECT_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $OFFICER_TOKEN"
```

Repeat with users from different projects and districts. Each response must contain only rows permitted by that user's `project_members` entry.

## Authentication and project context

Every `/api` request requires `Authorization: Bearer <supabase-access-token>`. Every domain route also requires membership in `:projectId`. A missing membership returns 404 so the API does not disclose whether the project exists.

Organization administrators manage employee identities and create projects. They still need a `project_members` row with role `admin` to access or manage a project's internal data. Project creators receive that membership automatically.

## API routes

| Method | Route | Access |
|---|---|---|
| GET | `/api/users/me` | Any active employee; includes memberships and projects |
| GET/POST | `/api/users` | Organization admin |
| PATCH/DELETE | `/api/users/:id` | Organization admin |
| GET | `/api/projects` | Current employee's projects |
| POST | `/api/projects` | Organization admin, or selected-project admin/supervisor; creator becomes project admin |
| GET | `/api/projects/:projectId` | Project member |
| PATCH | `/api/projects/:projectId` | Project admin |
| DELETE | `/api/projects/:projectId` | Selected-project admin/supervisor; archives instead of deleting data |
| GET | `/api/projects/:projectId/members` | Project admin |
| POST | `/api/projects/:projectId/members` | Project admin/manager |
| PATCH/DELETE | `/api/projects/:projectId/members/:memberId` | Project admin/manager |
| GET | `/api/projects/:projectId/activities` | Project member; officer district scope applies |
| POST | `/api/projects/:projectId/activities` | Project supervisor/admin |
| PATCH | `/api/projects/:projectId/activities/:id` | Assigned officer, supervisor, admin |
| DELETE | `/api/projects/:projectId/activities/:id` | Project admin |
| GET/POST/PATCH/DELETE | `/api/projects/:projectId/progress-updates` | Project officer/supervisor/admin; ownership enforced |
| GET/POST/PATCH/DELETE | `/api/projects/:projectId/challenges` | Project officer/supervisor/admin; ownership enforced |
| GET/POST/PATCH/DELETE | `/api/projects/:projectId/beneficiaries` | Project officer/supervisor/admin; district and ownership enforced |
| GET/POST | `/api/projects/:projectId/financial-entries` | Project members according to financial role rules |
| PATCH | `/api/projects/:projectId/financial-entries/:id` | Pending-entry editing rules apply |
| PATCH | `/api/projects/:projectId/financial-entries/:id/approve` | Project finance/admin |
| PATCH | `/api/projects/:projectId/financial-entries/:id/reject` | Project finance/admin |
| DELETE | `/api/projects/:projectId/financial-entries/:id` | Officer/supervisor/admin according to ownership/status rules |
| GET | `/api/projects/:projectId/reports` | Project supervisor/admin |
| POST | `/api/projects/:projectId/reports/generate` | Project supervisor/admin |

Add an existing employee to a project by email:

```json
POST /api/projects/PROJECT_UUID/members
{
  "email": "employee@example.org",
  "role": "officer",
  "district": "Chobe"
}
```

If the employee account does not exist, the API returns 404 and does not create an account implicitly.

## Frontend contract

The frontend now:

1. Calls `GET /api/users/me` after login and loads active memberships.
2. Shows a project picker under **Projectt Tracker** and retains the selected project ID for the session.
3. Shows Add/Remove controls only to organization admins or the selected project's admin/supervisor, with backend enforcement.
4. Prefixes project-domain calls with `/api/projects/:projectId/`.
5. Rebuilds role-dependent state whenever the selected project changes, because roles are per-project.

## Assumptions

- The route list under “New project & membership management routes” was empty, so conventional list/create/read/update/delete routes were provided.
- `profiles.email` is persisted, normalized to lowercase, and unique so onboarding can perform an indexed email lookup without exposing the Auth user list. Existing profiles are backfilled from `auth.users`; an unreachable fallback address is used only if an old Auth row has no email.
- Employees may self-register through the Create Account screen, or organization administrators may create them through `POST /api/users`. Self-registration always creates a non-admin profile with no project memberships. Adding a project member never auto-creates an account and returns 404 when the email is unknown.
- Project admins/managers may add existing employees, change project roles and district scopes, or remove memberships. These permissions apply only inside the selected project.
- A project admin may edit project metadata. Project admins and supervisors may remove the selected project from active use; removal sets `status='cancelled'` and preserves all historical data.
- Migration `0002` creates one legacy project for all existing v1 data and converts every old profile role/district into membership on that project. Existing v1 admins become organization administrators.
- All six domain `project_id` columns become non-null after the legacy backfill. Cross-project record IDs return 404 through project-scoped lookups.
- `project_id` comes exclusively from the URL context and is never accepted from request bodies, preventing callers from moving records between projects.
- Activity `code` remains globally unique and beneficiary `national_id` remains globally unique because the original schema declared those constraints and this extension did not request changing their uniqueness scope.
- Reports remain buffered in memory. Storage object names are prefixed with the project UUID, and `reports.file_url` stores the stable object path while generation returns a temporary signed URL.
- The v1 `audit_log` table has no `project_id`; project-scoped audit events therefore include `project_id` in `details`. Only organization administrators may query audit rows directly.
- Supabase REST mutations and audit inserts are separate requests, not a single transaction. Strict atomic auditing would require database RPC functions.
- The service-role client bypasses RLS, so controllers enforce membership, project scope, roles, ownership, and district restrictions independently. RLS provides a second boundary for any direct authenticated Supabase access.
- No frontend source was changed. Only the required frontend integration contract is documented.
