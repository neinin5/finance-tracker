# Deployment guide

This app has three pieces. The recommended free hosting combo is:

| Piece | Service | Free tier |
|---|---|---|
| Database | **MongoDB Atlas** | 512 MB cluster (M0), no time limit |
| Backend (Node/Express) | **Render** | Web Service, sleeps after 15 min idle, ~30 s cold start |
| Frontend (Vue/Vite) | **Vercel** | Static SPA hosting, fast CDN, GitHub auto-deploy |

Total cost: **£0**. Once configured, every `git push` to `main` redeploys both halves automatically.

---

## 0. Prerequisites

- A [GitHub](https://github.com) account
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account
- A [Render](https://render.com) account (sign in with GitHub)
- A [Vercel](https://vercel.com) account (sign in with GitHub)

---

## 1. Push the project to GitHub

From the project root (`finance-tracker/`):

```bash
git init
git add .
git commit -m "Initial commit"

# Create the repo on GitHub first (https://github.com/new), then:
git branch -M main
git remote add origin https://github.com/<your-username>/uk-finance-tracker.git
git push -u origin main
```

The two `.gitignore` files inside `client/` and `server/` already exclude `node_modules`, `.env`, and build output.

> ⚠️ **Important**: confirm `server/.env` is NOT being committed (`git status` should not list it). It contains your JWT secret and DB URI.

---

## 2. Set up MongoDB Atlas

1. Sign in at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Build a Database** → choose the free **M0 Sandbox** tier → pick the region closest to where Render will run (e.g. Frankfurt for EU).
3. Once the cluster is ready, go to **Database Access** → **Add New Database User**: pick a username, generate a strong password, role *Read and write to any database*. Save them.
4. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). This is acceptable because your DB user has a strong password; Render's egress IPs aren't fixed on the free tier.
5. **Database → Connect → Drivers → Node.js**. Copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Append your DB name before the `?`: `…mongodb.net/uk_finance_tracker?retryWrites=…`. Keep this URI handy for step 3.

---

## 3. Deploy the backend on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** → connect your GitHub repo.
2. Fill in:
   - **Name**: `uk-finance-tracker-api` (anything)
   - **Region**: same as your Atlas cluster
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
3. Under **Environment**, add these variables (use the **Add Environment Variable** button):

   | Key | Value |
   |---|---|
   | `MONGO_URI` | the URI from step 2.6 |
   | `JWT_SECRET` | a long random string — generate with `openssl rand -hex 32` |
   | `GOOGLE_SHEET_CSV_URL` | `https://docs.google.com/spreadsheets/d/1TV3NqU5uO0h-ilAnRQtNUe0BGGSRrpklKA46QQYBoJA/export?format=csv` |
   | `CORS_ORIGIN` | leave as `*` for now — we'll lock it down in step 5 |
   | `NODE_ENV` | `production` |

4. Click **Create Web Service**. Render builds and starts the server (~3 min). When it finishes, copy the URL — it'll look like `https://uk-finance-tracker-api.onrender.com`.
5. Test: visit `https://uk-finance-tracker-api.onrender.com/api/health` — you should see `{"ok":true}`.

---

## 4. Deploy the frontend on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** your GitHub repo.
2. **Configure Project** screen:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: click *Edit* and set to `client`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | the Render URL from step 3.4, e.g. `https://uk-finance-tracker-api.onrender.com` |

4. Click **Deploy**. Vercel builds (~1 min) and gives you a URL like `https://uk-finance-tracker.vercel.app`.

---

## 5. Lock down CORS

By default `CORS_ORIGIN=*` lets any origin call your API. Once Vercel has given you a stable URL, restrict it:

1. Render dashboard → your API service → **Environment** → edit `CORS_ORIGIN`:
   ```
   https://uk-finance-tracker.vercel.app
   ```
   (Use multiple comma-separated origins if you also want preview branches: `https://uk-finance-tracker.vercel.app,https://uk-finance-tracker-git-main-yourname.vercel.app`)
2. Save — Render auto-redeploys (~30 s).

---

## 6. First-run setup

1. Open your Vercel URL.
2. Complete the first-run setup form (creates your one user account).
3. Sidebar → **Tools → Import Data → Import Now** to pull your Google Sheet history.
4. Sidebar → **Markets → Exchange Rate** to trigger the first GBP/THB fetch from frankfurter.app (cached for 12h afterwards).

---

## Auto-deploy from GitHub

This is already wired up:

- **Vercel**: every push to `main` redeploys the frontend. Pull requests get preview URLs automatically.
- **Render**: every push to `main` triggers a backend redeploy. You can also click *Manual Deploy* from the dashboard.

To deploy a change:

```bash
git add .
git commit -m "your change"
git push
```

Watch deployments in real time at vercel.com/dashboard and dashboard.render.com.

---

## Cold-start tip

Render's free tier sleeps the API after 15 min of inactivity. The first request after a sleep takes ~30 s to wake up. Two options if that's annoying:

1. **Upgrade to Render's $7/mo Starter** — no sleep.
2. **Cron ping** — use a free service like [cron-job.org](https://cron-job.org) to GET `/api/health` every 10 min. Keeps it warm.

---

## Alternatives

- **Netlify** can replace Vercel — nearly identical UX. Set the publish directory to `client/dist` and use the same `VITE_API_URL` variable.
- **Render Static Site** can replace Vercel if you want everything on one platform. Build command `npm run build`, publish dir `dist`, root `client`.
- **Railway** / **Fly.io** can replace Render for the API but they're not 100% free anymore.
- **MongoDB Atlas** is the only sensible free DB; Render's PostgreSQL free tier wouldn't fit our schema without a rewrite.

---

## Production environment recap

```
client/  → Vercel  → reads VITE_API_URL at build time
server/  → Render  → reads MONGO_URI, JWT_SECRET, CORS_ORIGIN, GOOGLE_SHEET_CSV_URL at runtime
DB       → MongoDB Atlas (free M0)
```
