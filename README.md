# Newsletter Tool - Frontend

React + TypeScript SPA for the Newsletter Tool, built with Vite. Talks to
the Laravel API in the parent directory over Sanctum's cookie-based SPA
auth (no tokens).

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
- `npm test` - Vitest + React Testing Library + MSW
- `npm run lint` - ESLint
- `npm run format` - Prettier
