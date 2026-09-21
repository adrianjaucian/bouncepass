#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Bounce PASS deploy helper ==="
echo ""

missing=()
[[ -z "${VERCEL_TOKEN:-}" ]] && missing+=("VERCEL_TOKEN")
[[ -z "${RENDER_API_KEY:-}" ]] && missing+=("RENDER_API_KEY")
[[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && missing+=("CLOUDFLARE_API_TOKEN")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing tokens: ${missing[*]}"
  echo ""
  echo "Add them, then rerun: ./scripts/deploy-bouncepass.sh"
  echo ""
  echo "Frontend (Vercel):"
  echo "  Create a token at https://vercel.com/account/tokens (scope adrianjaucian-s-projects / bouncepass)"
  echo ""
  echo "Backend (Render):"
  echo "  Create an API key at https://dashboard.render.com/u/settings#api-keys"
  echo ""
  echo "DNS (Cloudflare):"
  echo "  Create a token with Zone.Zone Read + Zone.DNS Edit for bouncepass.net"
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  echo ""
  echo "Expected production topology:"
  echo "  bouncepass.net / www.bouncepass.net  -> Vercel"
  echo "  api.bouncepass.net                   -> Render (DNS only)"
  exit 1
fi

exec python3 "$ROOT/scripts/redeploy_production.py"
