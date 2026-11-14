# Progress Tracker

Progress Tracker is a full-stack project monitoring and evaluation platform for managing multiple projects, tracking work plans, recording progress and challenges, reviewing imported spreadsheet data, generating reports, and presenting project updates in a dedicated presentation view.

The repository is split into a Vite React frontend and an Express + TypeScript backend, with Supabase used for authentication, persistence, and scheduled reminder workflows.

## Project Structure

```txt
Progress_Tracker/
- frontend/
  - src/
    - app/ - main app shell, pages, and UI components
    - lib/ - API and Supabase helpers
    - styles/ - global styles and theme files
    - imports/ - sample uploaded assets
  - guidelines/ - design guidance used by the frontend
  - scripts/ - frontend helper scripts
  - package.json
- backend/
  - src/
    - controllers/ - route handlers
    - routes/ - API route definitions
    - middleware/ - auth, access control, and error handling
    - services/ - email, reports, access, and audit logic
    - schemas/ - shared validation schemas
    - config/ - environment and Supabase clients
    - types/ - Express and domain typings
  - supabase/
    - migrations/ - database migrations
    - functions/ - Supabase Edge Functions
  - scripts/ - maintenance and diagnostic scripts
  - package.json
- vercel.json
- README.md
```

Generated build output such as `frontend/dist/` and `backend/dist/` is intentionally omitted from the tree.

## What The App Covers

- Multi-project management and project switching
- Dashboard overview and summary cards
- Work plans and activity tracking
- Progress updates and status reporting
- Challenges and mitigation tracking
- Project financial reporting by reporting date
- Spreadsheet import and import review
- Report generation and chart views
- Role-based access control
- Notifications and overdue reminders
- Presentation mode for meetings and executive reviews
- Invitation-based project joining

## Frontend

The frontend lives in [`frontend/`](./frontend) and is built with Vite and React.

Key entry points:

- [`frontend/src/main.tsx`](./frontend/src/main.tsx)
- [`frontend/src/app/App.tsx`](./frontend/src/app/App.tsx)
- [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts)
- [`frontend/src/lib/supabase.ts`](./frontend/src/lib/supabase.ts)

Important client routes:

- `/` - main application shell
- `/invite/:token` - invitation acceptance flow
- `/projects/:projectId/presentation` - presentation mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured, the frontend falls back to a local demo mode.

## Product Roadmap and Future Predictive Intelligence

The multi-purpose SaaS evolution is outlined in the [Project Tracker 2.0 product roadmap](./docs/product-roadmap.md). It includes a **planned future Predictive Intelligence module** for KPI forecasting, evidence-based early warnings, and versioned model outputs. See the [Predictive Intelligence technical blueprint](./docs/predictive-intelligence.md) for the data-collection requirements, modular ML architecture, evaluation criteria and security boundaries. These features are **not yet implemented**; the current priority is building reliable, tenant-scoped historical KPI records and reporting.

## UI and HCI Design Standard

All frontend features should follow [Project Tracker UI Rules](./frontend/guidelines/Guidelines.md) for the existing navy/teal palette, semantic theme tokens, premium SaaS typography, responsive grids, Nielsen-based usability, and WCAG 2.2 AA accessibility checks. Frontend pull requests use the [UI/HCI checklist](./.github/PULL_REQUEST_TEMPLATE.md) to review these requirements.

## Backend

The backend lives in [`backend/`](./backend) and exposes the REST API used by the frontend.

Key entry points:

- [`backend/src/server.ts`](./backend/src/server.ts)
- [`backend/src/app.ts`](./backend/src/app.ts)
- [`backend/src/routes/index.ts`](./backend/src/routes/index.ts)

API layout:

- `/health` - health check
- `/api/users`
- `/api/projects`
- `/api/invitations`
- `/api/notifications`
- `/api/projects/:projectId/members`
- `/api/projects/:projectId/activities`
- `/api/projects/:projectId/progress-updates`
- `/api/projects/:projectId/challenges`
- `/api/projects/:projectId/financial-entries`
- `/api/projects/:projectId/financial-reports`
- `/api/projects/:projectId/reports`
- `/api/projects/:projectId/report-imports`
- `/api/projects/:projectId/notifications`

The backend also exposes the overdue reminder endpoint used by the cron job:

- `POST /api/notifications/overdue-tasks/run`

## Prerequisites

- Node.js 20 or newer
- A Supabase project
- A Resend account if you want email notifications to send successfully

## Installation

Install dependencies separately in each workspace:

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Environment Variables

### Frontend

Create `frontend/.env` with:

```bash
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`VITE_API_URL` is optional. If omitted, the frontend defaults to `http://localhost:3000/api`.

### Backend

Create `backend/.env` with:

```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REPORT_URL_TTL_SECONDS=3600
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="Project Tracker <noreply@example.com>"
CRON_SECRET=your_long_secret_value
```

Notes:

- `RESEND_API_KEY` is optional for local development, but required for email delivery.
- `EMAIL_FROM` controls the sender address used by the backend email service.
- `CRON_SECRET` protects the cron-triggered reminder endpoint.

### Supabase Edge Function Secrets

The `send-overdue-reminders` Edge Function uses Supabase runtime secrets. Set these in Supabase before deploying or invoking the function:

```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set FROM_EMAIL="Project Tracker <noreply@example.com>"
supabase secrets set APP_URL="https://your-frontend.example.com"
supabase secrets set REMINDER_CRON_SECRET="use-a-long-random-value"
```

`REMINDER_CRON_SECRET` is used only by the scheduled GitHub Actions invocation. Never expose it in frontend code or logs.

### Scheduled overdue reminders

The `send-overdue-reminders` Edge Function supports authenticated manual mode and scheduler-only scheduled mode. Apply the project reminder settings migration, deploy the function, and configure the GitHub repository secrets before enabling schedules:

```bash
supabase db push
supabase functions deploy send-overdue-reminders
gh workflow run send-overdue-reminders.yml
```

Required GitHub repository secrets:

- `SUPABASE_URL`
- `REMINDER_CRON_SECRET`
- `SUPABASE_ANON_KEY` is not required by this function because the scheduler authenticates with `X-Cron-Secret`.

Managers can enable automatic email reminders and choose manual, daily, every 3 days, weekly, biweekly, or monthly frequency in project settings. Scheduled comparisons and the monthly calendar calculation use UTC. GitHub Actions scheduled workflows use UTC and may run later than the exact scheduled minute.

Resend requires a verified sending domain or sender identity. Set `FROM_EMAIL` to a sender accepted by that verified domain. `RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`, and `REMINDER_CRON_SECRET` are Supabase Edge Function secrets; do not commit their values.

## StackBlitz development: signed in but account does not load

Supabase sign-in and the Express API are separate. Signing in successfully only proves that Supabase Auth accepted the credentials. The frontend must also reach the **Express API** to retrieve `GET /api/users/me`.

If you are developing the frontend on StackBlitz but your backend is deployed elsewhere, set these variables in the frontend environment (do not commit actual values):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_API_URL=https://YOUR_DEPLOYED_BACKEND/_/backend/api
```

The `VITE_API_URL` above is for the repository's Vercel configuration (`vercel.json`, which mounts the backend at `/_/backend`). For a separately hosted Express backend that mounts the router at `/api`, use `https://YOUR_BACKEND_HOST/api` instead. **Do not point `VITE_API_URL` to the React frontend URL**.

- Restart the StackBlitz Vite dev server after editing environment variables.
- In the browser Developer Tools → Network, check `GET .../users/me`. It must return HTTP 200 with JSON containing an `id` and `projects` array. HTTP 200 with HTML usually indicates a frontend fallback, not a working backend.
- A network/CORS error means the preview origin cannot reach the backend. The current backend CORS configuration permits the single origin in `FRONTEND_URL`; configure it for the preview origin or serve the frontend and API from an authorized same origin.
- HTTP 401 means the API rejected the bearer token or the application user profile. Confirm both frontend and backend use the same Supabase project, and that the profile is present and active.
- Do not add `SUPABASE_SERVICE_ROLE_KEY` to the frontend, StackBlitz public configuration, or a `VITE_*` variable.

On a deployed Vercel frontend, when `VITE_API_URL` is absent, the client defaults to the same-origin `/_/backend/api` route. In local development, the fallback remains `http://localhost:3000/api`.

To run API response and project-membership tests:

```bash
cd backend
npm install
npm run test:frontend-lib
```

## Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

## Scripts

### Frontend

- `npm run dev` - start the Vite development server
- `npm run build` - build the frontend for production

### Backend

- `npm run dev` - start the API in watch mode
- `npm run build` - compile TypeScript into `dist/`
- `npm run start` - run the compiled server
- `npm run typecheck` - run TypeScript without emitting files

## Database And Supabase

Database changes are managed through [`backend/supabase/migrations/`](./backend/supabase/migrations).

The backend uses Supabase for:

- Authentication
- Project membership and access control
- Project data storage
- Notifications and reminder tracking
- Invitation workflows

## Deployment

The root [`vercel.json`](./vercel.json) configures:

- `frontend/` as the Vite frontend root
- `backend/` as the API root
- backend routing under `/_/backend`
- a cron schedule that hits `/_/backend/api/notifications/overdue-tasks/run` daily at 06:00

When deploying, make sure the backend `FRONTEND_URL` matches the live frontend origin and that the Supabase, Resend, and scheduler secrets are set in the target environment. The older backend cron endpoint remains available for compatibility, but GitHub Actions should invoke the Edge Function for scheduled project reminders.

## Maintenance Scripts

The backend includes a few utility scripts in [`backend/scripts/`](./backend/scripts):

- `diagnose-supabase.mjs`
- `backfill-missing-profiles.mjs`
- `test-signup-trigger.mjs`

These are for maintenance and diagnostics rather than normal app startup.

## Notes

- The frontend has dedicated presentation and invitation routes outside the main dashboard shell.
- The backend protects project-scoped routes with auth and project access middleware.
- The repo does not define a formal automated test suite yet, so `build` and `typecheck` are the main validation steps.
