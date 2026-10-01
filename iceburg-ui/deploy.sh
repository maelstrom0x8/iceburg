#!/usr/bin/env bash
set -euo pipefail

# Deploys the app to Vercel as a Preview deployment, then re-points the
# stable iceburg-app.vercel.app alias at it. Vercel's own domain
# auto-promotion only applies to --prod deploys (see `vercel deploy
# --skip-domain` help text), so a plain preview deploy never updates that
# alias on its own — without this step the stable URL silently keeps
# serving whatever was last aliased, no matter how many times this
# script runs.
#
# Usage:
#   ./deploy.sh
#
# Always deploys --target preview. Production is intentionally not wired
# up here — that's reserved for when this goes to mainnet, not something
# this script should make one flag away from happening by accident.
#
# Picks up VERCEL_ICEBURG_TOKEN from the environment if set (CI), otherwise
# relies on an interactively-logged-in local Vercel CLI session.

cd "$(dirname "$0")"

ALIAS_HOST="${VITE_APP_ALIAS:-iceburg-app.vercel.app}"

VERCEL_ARGS=(--scope iohaus)
if [[ -n "${VERCEL_ICEBURG_TOKEN:-}" ]]; then
  VERCEL_ARGS+=(--token "$VERCEL_ICEBURG_TOKEN")
fi

DEPLOY_OUTPUT=$(vercel deploy \
  --project iceburg-app \
  --target preview \
  --yes \
  --json \
  "${VERCEL_ARGS[@]}")

DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | jq -r '.deployment.url // .url')
DEPLOYMENT_URL="${DEPLOYMENT_URL#https://}"

if [[ -z "$DEPLOYMENT_URL" || "$DEPLOYMENT_URL" == "null" ]]; then
  echo "Deploy succeeded but couldn't parse the deployment URL out of:" >&2
  echo "$DEPLOY_OUTPUT" >&2
  exit 1
fi

echo "Deployed: https://${DEPLOYMENT_URL}"

vercel alias set "https://${DEPLOYMENT_URL}" "$ALIAS_HOST" "${VERCEL_ARGS[@]}"

echo "Aliased: https://${ALIAS_HOST}"
