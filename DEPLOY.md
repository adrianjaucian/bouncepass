# Bounce PASS — Deploy to bouncepass.net (Cloudflare)

Deploy **frontend** on Vercel, **backend** on Render (with PostgreSQL), **DNS** on Cloudflare.

## Architecture

```
bouncepass.net      → Cloudflare DNS → Vercel (Next.js)
api.bouncepass.net  → Cloudflare DNS → Render (FastAPI + PostgreSQL)
```

Users sign in with email and password. The frontend stores a JWT in an httpOnly cookie and proxies API calls through `/api/backend/*` with an `Authorization: Bearer` header.

---

## Step 1 — Push code to GitHub

From the project root:

```bash
cd /Users/adrianjaucian/ADVstats
git add .
git commit -m "Multi-user auth and PostgreSQL"
git push origin main
```

---

## Step 2 — Deploy backend (Render)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render detects `render.yaml` at the repo root (creates **bouncepass-api** web service and **bouncepass-db** PostgreSQL)
4. When prompted, set:
   - **JWT_SECRET** — long random string (use the same value as `AUTH_SECRET` on Vercel)
   - **ADMIN_EMAIL** — `demo@bouncepass.net`; orphan demo games are assigned to this account after migration
5. After deploy, open the service → **Settings** → **Custom Domains** → add **`api.bouncepass.net`**

`DATABASE_URL` is wired automatically from the Postgres addon in `render.yaml`.

---

## Step 3 — Deploy frontend (Vercel)

```bash
cd frontend
npx vercel login
npx vercel link
```

In the [Vercel dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables** (Production):

| Name | Value |
|------|-------|
| `API_URL` | `https://api.bouncepass.net` (or `https://bouncepass-api.onrender.com` until DNS is ready) |
| `AUTH_SECRET` | Same value as Render `JWT_SECRET` |

Remove legacy `ACCESS_PASSWORD` from Vercel if still set.

Deploy:

```bash
npx vercel --prod
```

Add domain: **Settings** → **Domains** → add `bouncepass.net` and `www.bouncepass.net`.

---

## Step 4 — Cloudflare DNS

In [Cloudflare](https://dash.cloudflare.com) → **bouncepass.net** → **DNS** → **Records**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `www` | `cname.vercel-dns.com` (use value from Vercel) | Proxied (orange) |
| A or CNAME | `@` | Vercel’s root record (from Vercel domain setup) | Proxied |
| CNAME | `api` | `bouncepass-api.onrender.com` (your Render host) | **DNS only** (grey cloud) |

**SSL/TLS** → set mode to **Full**.

---

## Step 5 — Seed demo data (first deploy)

1. Visit **https://bouncepass.net/register** and create the account matching `ADMIN_EMAIL`.
2. On Render (or locally against production DB), run the orphan-assignment script:

```bash
cd backend
ADMIN_EMAIL=demo@bouncepass.net DATABASE_URL=<render-postgres-url> python ../scripts/assign_orphan_games.py
```

Or re-upload local games authenticated as your user:

```bash
AUTH_EMAIL=demo@bouncepass.net AUTH_PASSWORD=your-password \
  PRODUCTION_API_URL=https://bouncepass-api.onrender.com \
  python scripts/upload_local_games_to_production.py
```

New users start with an empty game library.

---

## Environment variables summary

### Backend (Render)

```
DATABASE_URL=<auto from Postgres addon>
JWT_SECRET=<random-string>
ADMIN_EMAIL=demo@bouncepass.net
ALLOWED_ORIGINS=https://bouncepass.net,https://www.bouncepass.net
```

### Frontend (Vercel)

```
API_URL=https://api.bouncepass.net
AUTH_SECRET=<same as JWT_SECRET>
```

### Local dev

Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env.local`.

```bash
# backend/.env
JWT_SECRET=dev-secret
ALLOWED_ORIGINS=http://localhost:3000

# frontend/.env.local
API_URL=http://127.0.0.1:8000
AUTH_SECRET=dev-secret
```

Register a local account, then assign existing SQLite games:

```bash
ADMIN_EMAIL=demo@bouncepass.net python scripts/assign_orphan_games.py
```

---

## Verify

1. **https://bouncepass.net** → login page
2. Register or sign in → home page loads
3. Saved games and dashboards show only your games
4. Menu shows your email and **Log out**

If API calls fail with 401, confirm `AUTH_SECRET` on Vercel matches `JWT_SECRET` on Render.

---

## Helper script

```bash
./scripts/deploy-bouncepass.sh
```

Prints a checklist if CLI tokens are not configured.
