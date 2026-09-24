#!/usr/bin/env bash
set -euo pipefail

# Deploys the marketing site or the app to Vercel as a Preview deployment.
#
# Usage:
#   ./deploy.sh app
#   ./deploy.sh marketing
#
# Always deploys --target preview. Production is intentionally not wired
# up here — that's reserved for when this goes to mainnet, not something
# this script should make one flag away from happening by accident.
#
# Each side needs to know the other's real URL to cross-link correctly
# (see src/config/urls.ts) — override with env vars if the deployed URLs
# ever change:
#   VITE_MARKETING_URL=https://... VITE_APP_URL=https://... ./deploy.sh app

TARGET="${1:-}"

if [[ "$TARGET" != "app" && "$TARGET" != "marketing" ]]; then
  echo "Usage: $0 <app|marketing>" >&2
  exit 1
fi

cd "$(dirname "$0")"

MARKETING_URL="${VITE_MARKETING_URL:-https://iceburg-marketing.vercel.app}"
APP_URL="${VITE_APP_URL:-https://iceburg-app.vercel.app}"

if [[ "$TARGET" == "app" ]]; then
  vercel deploy \
    --local-config vercel.app.json \
    --project iceburg-app \
    --target preview \
    --build-env "VITE_MARKETING_URL=${MARKETING_URL}" \
    --yes
else
  vercel deploy \
    --local-config vercel.marketing.json \
    --project iceburg-marketing \
    --target preview \
    --build-env "VITE_APP_URL=${APP_URL}" \
    --yes
fi
