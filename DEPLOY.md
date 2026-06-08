# Bounce PASS — Deploy to bouncepass.net (Cloudflare)

Deploy **frontend** on Vercel, **backend** on Render, **DNS** on Cloudflare.

## Architecture

```
bouncepass.net      → Cloudflare DNS → Vercel (Next.js)
api.bouncepass.net  → Cloudflare DNS → Render (FastAPI)
```

The frontend proxies API calls through `/api/backend/*` so the password never appears in the browser.

---

## Step 1 — Push code to GitHub

From the project root:

```bash
cd /Users/adrianjaucian/ADVstats
git init
git add .
git commit -m "Prepare Bounce PASS for production deploy"
```

Create a new GitHub repo (e.g. `bouncepass`) and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/bouncepass.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy backend (Render)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render detects `render.yaml` at the repo root
4. When prompted for **ACCESS_PASSWORD**, enter your site password
5. After deploy, open the service → **Settings** → **Custom Domains**
6. Add **`api.bouncepass.net`**
7. Note Render’s CNAME target (e.g. `bouncepass-api.onrender.com`)

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
| `ACCESS_PASSWORD` | Same password as backend |
| `API_URL` | `https://api.bouncepass.net` |
| `AUTH_SECRET` | Any long random string |

Deploy:

```bash
npx vercel --prod
```

Add domain: **Settings** → **Domains** → add `bouncepass.net` and `www.bouncepass.net`. Vercel shows the DNS records you need.

---

## Step 4 — Cloudflare DNS

In [Cloudflare](https://dash.cloudflare.com) → **bouncepass.net** → **DNS** → **Records**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `www` | `cname.vercel-dns.com` (use value from Vercel) | Proxied (orange) |
| A or CNAME | `@` | Vercel’s root record (from Vercel domain setup) | Proxied |
| CNAME | `api` | `bouncepass-api.onrender.com` (your Render host) | **DNS only** (grey cloud) |

**SSL/TLS** → set mode to **Full**.

Wait a few minutes for DNS to propagate, then visit **https://bouncepass.net** — you should see the login page.

---

## Environment variables summary

### Backend (Render)

```
ACCESS_PASSWORD=<your-password>
ALLOWED_ORIGINS=https://bouncepass.net,https://www.bouncepass.net
```

### Frontend (Vercel)

```
ACCESS_PASSWORD=<your-password>
API_URL=https://api.bouncepass.net
AUTH_SECRET=<random-string>
```

### Local dev (already in `.env` / `.env.local`, not committed)

---

## Verify

1. **https://bouncepass.net** → login page
2. Enter password → upload page loads
3. Upload a sample CSV → results appear
4. Export works

If uploads fail with 401, confirm `ACCESS_PASSWORD` matches on **both** Vercel and Render, and `API_URL` on Vercel points to `https://api.bouncepass.net`.

---

## Helper script

```bash
./scripts/deploy-bouncepass.sh
```

Prints a checklist if CLI tokens are not configured.
