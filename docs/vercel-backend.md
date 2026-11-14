# Vercel backend deployment

The frontend and Express API ship together using Vercel Services. Public
requests to `/_/backend/*` select the backend before the frontend catch-all.
The backend's own rewrite strips `/_/backend`, so Express receives `/health`
or `/api/users/me`. Frontend deep links continue to resolve to `index.html`.
The existing overdue-notification cron path and schedule remain unchanged.

## Entrypoint and packaging

`backend/src/app.ts` imports Express and exports the application as the default
export. `src/server.ts` remains the local listener. The backend service explicitly
selects the Express framework and the source app entrypoint. It runs `npm ci`
and `npm run typecheck`; Vercel handles TypeScript compilation and dependency
tracing. The local `npm run build` command still emits `dist` for local use.

Keep the package and TypeScript configuration in ESM/NodeNext mode. Do not point
Vercel at a generated CommonJS bundle or deploy the old diagnostic handler.
Node is pinned to 24.x to match the project's runtime setting.

Request logs include only request ID, method, path, response status and media
type. Headers, query strings and response bodies are deliberately omitted;
Vercel injects credential-bearing headers even on unauthenticated requests.

## Checks before release

Run from the repository root:

```sh
npm ci --prefix backend
npm run typecheck --prefix backend
npm run build --prefix backend
node backend/scripts/test-deployment.mjs
npm run test:frontend-lib --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
```

The deployment smoke test imports the compiled app with nonfunctional test
configuration, performs real HTTP requests and checks JSON responses and log
privacy. It does not connect to Supabase or mutate data.

On the exact preview commit, verify:

1. `GET /_/backend/health`: 200, JSON `{ "status": "ok" }`.
2. `GET /_/backend/api/users/me` without Authorization: 401, JSON
   `{ "error": "Missing Bearer token" }`.
3. A frontend deep link: 200 HTML with the app shell.
4. Sign in with an approved Supabase test account. In browser Network, verify
   `/users/me` returns 200 JSON with the account and project memberships.
5. Select an existing project and verify its API requests succeed and the
   project loads. Use reads only; do not create test users, projects or migrations.
6. Inspect logs for the exact deployment: correct paths, status/media type,
   no invocation failures, no module/dependency errors, no credentials.

Keep Deployment Protection enabled. An application 401 must be distinguished
from a Vercel access-control 401. The Vercel fetch connector can misclassify the
application's 401; use an authenticated Vercel CLI/browser and correlate the
credential-free backend status/media-type logs.

The repair branch initially had a dummy `SUPABASE_SERVICE_ROLE_KEY` and no
frontend Supabase variables for Preview. Those settings support routing smoke
tests only. Authenticated verification requires an approved test Supabase
configuration and account, supplied through Vercel settings, never through
committed files or chat. Do not copy production secrets into Preview.

Do not merge to main until authenticated account and project checks pass.
Review the final diff to exclude diagnostic handlers and bundling experiments.
After merge, verify health, unauthenticated account JSON, authenticated project
loading and runtime logs again on production. No database migration is needed.
