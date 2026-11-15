# Phase 0 stabilization

Status: READY FOR MERGE. Staging, CI and production database prerequisites are
verified. Run the post-deployment production application checks below after the
tested commit is released. Existing production routing is already repaired.

## Reproducible verification

Use Node 24. Run `npm ci --include=dev` in frontend and backend, then:

```
npm run typecheck --prefix backend
npm run typecheck --prefix frontend
npm run test:integration --prefix backend
node backend/scripts/test-deployment.mjs
npm run test:frontend-lib --prefix backend
npm run build --prefix frontend
```

Integration tests start the real compiled Express app and the real Supabase SDK,
with an ephemeral loopback HTTP fixture replacing Supabase Auth and PostgREST.
All environment credentials are overridden with nonfunctional fixtures. Tests
exercise token forwarding/verification, active-profile requirements, relationship
handling, project membership filters, role restrictions and nested-record project
scoping. They do not prove Supabase's cryptographic JWT validation or production
RLS: those require the separate hosted staging checks below. No test contacts or
modifies the production database.

## Isolated hosted staging configuration

Use a separate test Supabase project and test account with at least two projects
and distinct memberships. Do not reuse production service-role credentials or
copy live users/data. A paid Supabase branch has not been authorized; none is
created by this work. If no free/existing test project is available, this gate is
BLOCKED, not passed. Local HTTP fixtures are not a hosted staging environment.

Configure Vercel Preview variables scoped to `stabilization/phase-0-20261114`:

| Variable | Value/source |
| --- | --- |
| SUPABASE_URL | Test project URL |
| SUPABASE_SERVICE_ROLE_KEY | Test project server key, Sensitive/Secret |
| VITE_SUPABASE_URL | Same test project URL |
| VITE_SUPABASE_ANON_KEY | Test publishable/anon key only |
| VITE_API_URL | /_/backend/api |
| FRONTEND_URL | Protected preview's branch origin |
| NODE_ENV | production |

Keep email/scheduler secrets absent in staging. Keep Deployment Protection on.
Use an authenticated browser or Vercel CLI; never commit a bypass link or token.
Redeploy after configuring variables. Test the exact commit: health 200 JSON,
missing token 401 JSON, valid sign-in/account memberships, project selector,
report/presentation loading and cross-project 404/403. Check actual runtime logs
for JSON statuses and module/invocation failures. Do not create diagnostic API
handlers or weaken middleware to pass tests.

## CI and production release criteria

The Stabilization workflow runs both typechecks, both builds, backend integration
and log-privacy tests, frontend regressions, and independent dependency security
jobs. No production secrets are used. Require all jobs and live staging checks
before merging. Repository administrators should make these required branch
checks; adding a workflow alone does not enforce branch protection.

Initial audit found critical backend and high frontend dependency advisories.
Security jobs intentionally fail on high/critical findings until remediation or
a documented, explicitly approved risk decision. Do not add continue-on-error or
lower the severity threshold to make CI green. Re-run audits for current details.

Release only the tested commit after staging sign-off. Vercel Git integration
builds main with Production variables. Confirm build READY and alias assignment,
then repeat health, unauthenticated JSON, sign-in, project and reporting checks.
A successful build alone is insufficient. Preserve the cron in vercel.json.

## Rollback

Record the current production deployment ID before releasing. On regression,
use Vercel Instant Rollback to that known-good production deployment, or
`vercel rollback <deployment-url-or-id>` with the existing authenticated CLI and
correct project/team. Verify the production alias and API responses afterward.
Rollback can disable automatic assignment: inspect the setting and restore normal
promotion deliberately after a corrected build passes. Do not restore databases
or run migrations as part of this code-only rollback. Revert the offending Git
commit separately so the next main deployment does not reintroduce the defect.

## Current evidence and gaps

- Existing production: direct health 200 JSON and unauthenticated account 401 JSON.
- Local suite: 15 HTTP integration cases plus 6 validation regressions; 16
  frontend regressions including 5 binary workbook import tests.
- Authentication code uses Supabase getUser(token), then requires an active profile.
- Membership middleware constrains both project ID and authenticated user ID;
  nested record lookup additionally constrains project_id. Org admin does not bypass it.
- Hosted isolated staging: passed on 15 November 2026 against a separate free
  Supabase project and the exact stabilization preview.
- Dependency security: high/critical findings remediated; two moderate ExcelJS/uuid findings remain below the unchanged CI threshold.
- Hosted CI passed on the pushed commit before release.

### Audit follow-up

Compatible backend lockfile updates remove the critical findings. The unused
frontend react-router dependency is removed. Zod is pinned to 4.6.7, addressing
GHSA-mrhx-c7xc-m3w5. Validation regressions cover create defaults, omitted PATCH
fields, coercion, money/progress bounds, nullable imports, records, dates, roles,
and the API 400 error contract. Defaults are explicitly removed from optional
PATCH fields so updating a name cannot reset status, progress or resolution.

SheetJS is pinned to the official upstream 0.20.3 tarball, with SHA-512 integrity
in package-lock.json. The npm registry's 0.18.5 release is not used. Source:
https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
This release is beyond the patched versions for GHSA-4r6h-8v6p-xvw6 (0.19.3)
and GHSA-5pgg-2g8v-p4x9 (0.20.2). Tests write actual XLSX bytes, read them using
the UI options and run the application parser for project/milestone/risk/finance
sections, dates, formatted numbers, sheet selection, empty/invalid cells and
truncated archives. Nonnumeric money cells now remain blank with a warning,
instead of silently becoming zero. These automated tests do not replace hosted
browser upload verification. New tests run in the existing CI commands.

Local production dependency audits pass at the unchanged high threshold:
frontend has zero findings; backend has two moderate findings through ExcelJS's
uuid. No force downgrade, advisory suppression or severity reduction was used.

The final staging preview uses branch-scoped Preview variables and the isolated
Progress_Tracker_Staging project. Production variable metadata remained
unchanged. Health returned 200 JSON and unauthenticated account requests returned
401 JSON. A confirmed active account signed in successfully, loaded only its
project and received JSON 404 responses for a foreign project, its activities,
and its import endpoint. Officer-only role checks returned JSON 403 responses.
Missing and invalid tokens returned JSON 401 responses. Foreign project PATCH
and import POST attempts returned JSON 404 and created no records.

A synthetic XLSX file was uploaded through the deployed browser UI. The import
created one report snapshot, activity at 50 percent, progress update, orange risk,
financial entry (1000 budget, 250 spent, 750 balance), and financial report. The
database matched every expected value with no blocking errors or warnings.
During this check an orange color code exposed a parser bug that truncated risk
rows; the fix has a regression test and the same live import passed afterward.

Runtime logs for the final preview contain no 500 responses, missing environment
configuration, missing modules, or function invocation failures. The temporary
automation account was disabled and its Vercel access link revoked after testing.

Migration 0025 moves the three SECURITY DEFINER helpers out of the exposed
public schema. Anonymous execution is revoked, authenticated execution remains
only where RLS needs it, and the Auth trigger retains its function dependency.
After applying it to staging, the Supabase function-permission warnings cleared
and RLS still returned one accessible project and zero foreign projects. The only
remaining security-advisor warning is leaked-password protection, which Supabase
documents as available on Pro plans and above; this project is on the Free plan.
Use strong generated passwords and revisit the setting if the plan changes.

On 16 November 2026, production received the already-tested database
prerequisites before code release. Migration 0024 installed atomic invitation
redemption with execution limited to `service_role`; migration 0025 hardened
the privileged helpers; and migration 0026 restored three missing invitation RLS
policies detected as schema drift. No application rows were changed. Production
RLS still returned the signed-in member's project, the Auth trigger retained its
private function dependency, and the Supabase security advisor cleared both the
function and policy findings.

If database rollback is required, restore the three helper functions to the
`public` schema with their prior grants only after rolling application traffic
back, and remove the invitation policies only if restoring the exact prior
database state is necessary. Prefer keeping the tightened grants and policies
when the incident is unrelated to authorization.
