#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
BACKEND="$ROOT/backend"

echo "=== Bounce PASS deploy helper ==="
echo ""

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Frontend (Vercel):"
  echo "  1. cd frontend && npx vercel login"
  echo "  2. npx vercel link"
  echo "  3. Set env vars in Vercel dashboard (Production):"
  echo "       ACCESS_PASSWORD=<your-site-password>"
  echo "       API_URL=https://api.bouncepass.net"
  echo "       AUTH_SECRET=<random-string>"
  echo "  4. npx vercel --prod"
  echo "  5. Add bouncepass.net in Vercel → Settings → Domains"
  echo ""
else
  echo "Deploying frontend to Vercel..."
  cd "$FRONTEND"
  npx vercel deploy --prod --token "$VERCEL_TOKEN" --yes
fi

echo ""
echo "Backend (Render):"
echo "  1. Push this repo to GitHub"
echo "  2. Render → New Blueprint → connect repo → use backend/render.yaml"
  echo "  3. Set ACCESS_PASSWORD when prompted (same value as Vercel)"
echo "  4. Add custom domain api.bouncepass.net in Render"
echo ""
echo "Cloudflare DNS (bouncepass.net):"
echo "  @    CNAME  cname.vercel-dns.com   (or A records from Vercel)"
echo "  www  CNAME  cname.vercel-dns.com"
echo "  api  CNAME  <your-service>.onrender.com  (DNS only / grey cloud)"
echo ""
echo "Cloudflare SSL/TLS mode: Full"
