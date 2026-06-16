# Roster — Deployment Setup Guide

This file explains everything you need to configure before deploying Roster on **Vercel** (frontend) + a server host (API) + **Supabase** (database).

---

## Architecture Overview

```
Browser
  │
  ├── Roster Web App  →  Vercel (static frontend)
  │
  └── /api/* calls   →  Railway / Render / Fly.io (Express API server)
                              │
                         Supabase (PostgreSQL database)
```

> **Why not 100% Vercel?**  
> The API server (`artifacts/api-server`) is a persistent Express.js process.  
> Vercel is serverless and not designed for long-running servers.  
> Use **Railway**, **Render**, or **Fly.io** for the API — all have generous free tiers.

---

## 1. Supabase (Database)

### Create a project
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to your users
3. Set a strong database password (save it!)

### Get the connection string
1. In your Supabase project → **Settings → Database**
2. Under **Connection string**, select **URI** mode
3. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your actual password

### Run database migrations
In your local workspace (or CI), run:
```bash
DATABASE_URL="postgresql://postgres:..." pnpm --filter @workspace/db run push
```
This creates all tables (employees, announcements, announcement_reads, leave, payroll, etc.).

---

## 2. Clerk (Authentication)

Clerk is already provisioned via Replit (development keys are set automatically).

For **production**:
1. Replit auto-upgrades to production Clerk keys when you publish via Replit Deploy.
2. The `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` env vars are managed by Replit — you do **not** need to touch them manually.

If deploying **outside Replit** (e.g. to Vercel + Railway):
1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create an application → copy `Publishable Key` and `Secret Key`
3. Add them to your environment variables (see below)

---

## 3. API Server on Railway / Render / Fly.io

### Railway (recommended — simplest)
1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Select this repo, set the **root directory** to `artifacts/api-server`
3. Set **build command**: `pnpm install && pnpm run build`
4. Set **start command**: `pnpm run start`
5. Add environment variables (see table below)
6. Note the public URL Railway gives you (e.g. `https://roster-api.up.railway.app`)

### Environment variables for the API server

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres` | From Supabase |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Clerk dashboard |
| `CLERK_SECRET_KEY` | `sk_live_...` | From Clerk dashboard |
| `SESSION_SECRET` | Any long random string | Generate with `openssl rand -hex 32` |
| `NODE_ENV` | `production` | Required |
| `PORT` | `8080` | Railway sets this automatically |

---

## 4. Frontend on Vercel

### Connect the repo
1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Select this repo

### Configure the project
In Vercel project settings:

- **Framework Preset**: Vite
- **Root Directory**: `artifacts/roster`
- **Build Command**: `pnpm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `pnpm install`

### Environment variables for the frontend

| Variable | Value | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Clerk dashboard |
| `VITE_CLERK_PROXY_URL` | _(leave blank or set to your API URL)_ | Optional |
| `BASE_PATH` | `/` | Required by the Vite config |
| `PORT` | `3000` | Required by the Vite config (Vercel ignores it but the build needs it) |

### Rewrite `/api/*` to your API server

Create a `vercel.json` at the repo root (or in `artifacts/roster/`):

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-RAILWAY-API-URL.up.railway.app/api/:path*"
    }
  ]
}
```

Replace `YOUR-RAILWAY-API-URL` with the Railway URL from Step 3.

---

## 5. PWA / Installable App

The Roster web app is a **Progressive Web App (PWA)**.  
After deploying to Vercel, users can install it directly from their browser:

- **Desktop (Windows / Mac / Linux)**: Click the install icon in the browser address bar (Chrome, Edge)
- **Android**: Chrome shows an "Add to Home Screen" / "Install App" prompt
- **iOS (Safari)**: Tap Share → "Add to Home Screen"

No app store required. The app works offline for cached pages.

---

## 6. Quick Checklist

- [ ] Created Supabase project and copied `DATABASE_URL`
- [ ] Ran `pnpm --filter @workspace/db run push` against Supabase
- [ ] Deployed API server to Railway/Render with all env vars set
- [ ] Created Clerk app (if not using Replit-managed Clerk) and copied keys
- [ ] Deployed frontend to Vercel with all env vars set
- [ ] Added `/api/*` rewrite rule in `vercel.json` pointing to your API server
- [ ] Tested login flow end-to-end in production
- [ ] Verified announcements, employees, and other features work

---

## Local Development (no changes needed)

Everything in development is already wired up:
- Database: set `DATABASE_URL` in your local `.env` (Replit manages this automatically)
- Clerk: dev keys are provisioned automatically by Replit
- API runs on port 8080, frontend on port 23979, routed via the Replit proxy
