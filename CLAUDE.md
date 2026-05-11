# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (Express/Node)
```bash
cd server
npm run dev      # start with --watch (auto-restart on changes)
npm start        # production start
npm run import:sheet  # one-off Google Sheet import script
```

### Client (Vue 3/Vite)
```bash
cd client
npm run dev      # Vite dev server
npm run build    # production build → client/dist/
npm run preview  # preview the production build locally
```

### Environment (server/.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv
CORS_ORIGIN=*              # or comma-separated origins in prod
NODE_ENV=development
```

Client reads `VITE_API_URL` at build time (set in `client/.env.local` for local dev, or in Vercel env vars for prod).

## Architecture

This is a single-user-per-deployment personal finance tracker with two halves:

```
client/   Vue 3 SPA (Vite, Pinia, Vue Router, Chart.js, Leaflet)
server/   Express REST API (Node ESM, Mongoose, JWT auth)
DB        MongoDB Atlas
```

### Server structure (`server/src/`)
- `index.js` — bootstraps Express, mounts all routes under `/api/*`, global error handler
- `middleware/auth.js` — `authRequired` middleware (JWT Bearer) + `signToken`; attaches `req.userId`
- `models/` — Mongoose schemas: `User`, `Expense`, `Income`, `Budget`, `Backup`, `ExchangeRate`
- `routes/` — one file per resource; all protected routes use `router.use(authRequired)` at the top
- `services/exchangeRateService.js` — fetches GBP→THB history from `frankfurter.app`, caches in DB for 12h
- `services/exportService.js` — PDF export via pdfkit
- `services/emailService.js` — email via Resend
- `utils/currency.js` — shared currency constants; **fixed rate: 45 THB = 1 GBP** used for all budget math

### Client structure (`client/src/`)
- `api/client.js` — thin `fetch` wrapper (`api()` and `download()`); reads token from localStorage; base URL from `VITE_API_URL`
- `stores/` — Pinia stores: `auth`, `expenses`, `income`, `budget`, `exchangeRate`, `backups`, `toast`, `ui`
- `stores/ui.js` — global modal state, theme (dark/light persisted to localStorage), `preferredEntryType`, `preferredEntryDate`, `editingItem`
- `router/index.js` — all routes under `/` require auth via `meta: { requiresAuth: true }`; `auth.bootstrap()` called on every navigation
- `views/` — one view per page; `MapView` is lazy-loaded (pulls Leaflet ~150KB only when needed)
- `layouts/AppLayout.vue` — shell wrapping the sidebar + `<router-view>`

### Key data model decisions
- `Expense` stores amounts in three fields: `amountGBP`, `amountTHB`, and `amountOriginal` (in the entry currency). `currency` field tracks which currency was entered.
- `externalId` on Expense is used to deduplicate Google Sheet imports; unique compound index `(user, source, externalId)` with a partial filter so nulls don't collide.
- `Backup` stores full document arrays (`expenses`, `incomes`) as plain objects; list endpoint excludes those fields for performance.
- Exchange rate shown in the UI is live from frankfurter.app; **budget calculations use the fixed 45 THB/GBP constant** (`EXCHANGE_RATE_THB_PER_GBP` in `utils/currency.js`).

### Auth flow
JWT tokens are 30-day, stored in `localStorage` under key `uk-tracker-token`. The app is designed for a single user (first-run setup creates the one account).

### Deployment
- Frontend → Vercel (static, reads `VITE_API_URL` at build time)
- Backend → Render free tier (sleeps after 15 min idle; ping `/api/health` to keep warm)
- DB → MongoDB Atlas M0 free tier
