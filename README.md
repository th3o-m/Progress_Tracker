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
- Financial entry tracking
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

When deploying, make sure the backend `FRONTEND_URL` matches the live frontend origin and that the Supabase and Resend secrets are set in the target environment.

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
