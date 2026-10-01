#!/usr/bin/env bash
set -euo pipefail

# Deploys the marketing site or the app to Vercel as a Preview deployment,
# then re-points the stable iceburg-marketing.vercel.app / iceburg-app.vercel.app
# alias at it. Vercel's own domain auto-promotion only applies to --prod
# deploys (see `vercel deploy --skip-domain` help text), so a plain preview
# deploy never updates that alias on its own — without this step the stable
# URL silently keeps serving whatever was last aliased, no matter how many
# times this script runs.
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
  PROJECT="iceburg-app"
  LOCAL_CONFIG="vercel.app.json"
  ALIAS_HOST="${APP_URL#https://}"
  BUILD_ENV="VITE_MARKETING_URL=${MARKETING_URL}"
else
  PROJECT="iceburg-marketing"
  LOCAL_CONFIG="vercel.marketing.json"
  ALIAS_HOST="${MARKETING_URL#https://}"
  BUILD_ENV="VITE_APP_URL=${APP_URL}"
fi

DEPLOY_OUTPUT=$(vercel deploy \
  --local-config "$LOCAL_CONFIG" \
  --project "$PROJECT" \
  --target preview \
  --build-env "$BUILD_ENV" \
  --yes \
  --json)

DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | jq -r '.deployment.url // .url')
DEPLOYMENT_URL="${DEPLOYMENT_URL#https://}"

if [[ -z "$DEPLOYMENT_URL" || "$DEPLOYMENT_URL" == "null" ]]; then
  echo "Deploy succeeded but couldn't parse the deployment URL out of:" >&2
  echo "$DEPLOY_OUTPUT" >&2
  exit 1
fi

echo "Deployed: https://${DEPLOYMENT_URL}"

vercel alias set "https://${DEPLOYMENT_URL}" "$ALIAS_HOST"

echo "Aliased: https://${ALIAS_HOST}"
