# Beacon - Frontend

React + TypeScript SPA for Beacon, built with Vite. Talks to the Laravel
API in the parent directory over Sanctum's cookie-based SPA auth (no
tokens).

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` in `.env` must point at the running Laravel backend
(defaults to `http://localhost:8000`, i.e. `php artisan serve`'s default).

## Scripts

- `npm run dev` - Vite dev server (defaults to port 5173; the backend's
  `FRONTEND_URL`/`SANCTUM_STATEFUL_DOMAINS` must match whatever port this
  actually runs on)
- `npm run build` - typecheck + production build
- `npm test` - Vitest + React Testing Library + MSW (unit/component tests)
- `npm run test:e2e` - Playwright end-to-end tests (see below) - deliberately
  separate from `npm test`, since it needs two live servers instead of jsdom
- `npm run lint` - ESLint
- `npm run format` - Prettier

## End-to-end tests

Real, checked-in Playwright E2E specs in `e2e/`, covering the public landing
page plus the full authenticated app (login, subscribers, all three campaign
content modes, send/schedule, dashboard). This replaces the ad-hoc
scratch-directory Playwright installs used for manual QA in earlier
sessions (see `PROJECT_NOTES.md`) - `@playwright/test` is now a real
`devDependency` of this project.

### One-time setup

```bash
npx playwright install chromium
```

System-level browser dependencies (`libnspr4`, `libnss3`, etc.) must already
be installed - see `PROJECT_NOTES.md`'s Day 16 entry if
`npx playwright install-deps chromium --dry-run` reports anything missing.

### Prerequisites before running `npm run test:e2e`

Playwright's own `webServer` config starts `npm run dev` (the Vite dev
server on :5173) automatically. Everything else must already be running:

1. **The Laravel backend**, in the sibling `newsletter-tool` repo:

    ```bash
    php artisan serve
    ```

    on its default port (`:8000`), matching `VITE_API_URL` in `.env`.

2. **Queue processing**, for the Send Now spec specifically. A dispatched
   `SendCampaignJob` sits unprocessed forever against `php artisan serve`
   alone - this exact gotcha is documented in `PROJECT_NOTES.md`'s Day 12
   entry from manual QA. Either:
    - set `QUEUE_CONNECTION=sync` in the backend's `.env` (simplest for a
      local E2E run - jobs run inline, no worker needed), or
    - run a worker alongside `php artisan serve`:
        ```bash
        php artisan queue:work
        ```

    Without one of these, `send-now.spec.ts` will time out polling for the
    campaign to reach `Sent`, not fail fast.

3. The backend must be a non-production environment (`APP_ENV` anything but
   `production`). Every spec creates and tears down its own dedicated staff
   user via real HTTP calls to `POST`/`DELETE /api/testing/users` - an
   endpoint that only exists outside production (see the backend repo's
   `RestrictToNonProduction` middleware). There is no registration flow
   anywhere else in this app; this is the one deliberate exception, and it
   404s entirely in production.

### Running

```bash
npm run test:e2e
```

Runs fully serially (`workers: 1`, `fullyParallel: false`) - Dashboard
stats are computed globally with no per-user scoping, so parallel specs
creating/sending campaigns at the same time could make each other's
dashboard-delta assertions flaky. No automatic retries either: a spec that
only passes on retry is the exact "flaky and gets ignored over time" failure
mode this suite exists to avoid, not something to paper over.

Each spec creates its own fixtures (a staff user, plus whatever
subscribers/campaigns it needs) via direct, authenticated API calls in
setup, and tears them down afterward regardless of pass/fail - never
tinker, never assuming a clean DB, never leaving data behind, the same
discipline every manual QA session in `PROJECT_NOTES.md` already used.

The sample-newsletter spec (`landing.spec.ts`) submits the real form against
the real backend endpoint, which is IP-rate-limited to 3/hour
(`RateLimiter::for('sample-newsletter')`) - running the full suite more than
a few times in quick succession can trip that limiter and fail just that one
test (a real 429, not a bug - clear it locally with `php artisan cache:clear`
if it happens mid-development). It does not exercise the 429 path itself
(already covered by the backend's own Pest suite). It also can't use an
`@example.com` recipient - Resend rejects that domain outright - so it and
the Send Now spec both send to `delivered@resend.dev`, Resend's own
documented test address: a real send that simulates success without landing
in anyone's actual inbox.
