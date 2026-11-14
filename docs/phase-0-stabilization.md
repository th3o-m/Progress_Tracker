# Phase 0 stabilization

Status: IN PROGRESS. Do not merge or promote this branch while a gate below is
unverified or failing. Existing production routing is already repaired.

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
- Local suite: 15 HTTP integration cases; existing 11 frontend regressions.
- Authentication code uses Supabase getUser(token), then requires an active profile.
- Membership middleware constrains both project ID and authenticated user ID;
  nested record lookup additionally constrains project_id. Org admin does not bypass it.
- Hosted isolated staging: blocked on test project/credentials and test sign-in.
- Dependency security: unresolved baseline advisories block completion.
- Hosted CI results must be checked on the pushed commit; local success is not CI success.
