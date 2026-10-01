#!/usr/bin/env bash
set -euo pipefail

# Deploys the app to Vercel as a Preview deployment, then re-points the
# stable iceburg.iohaus.vercel.app alias at it. Vercel's own domain
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
# Picks up Vercel CLI's own native VERCEL_TOKEN / VERCEL_ORG_ID /
# VERCEL_PROJECT_ID from the environment when all three are set (CI) —
# the CLI reads these itself, no flags needed. Otherwise falls back to
# --scope/--project against an interactively-logged-in local CLI session.
#
# Must run with the "iceburg" Vercel project's own Root Directory setting
# cleared (Settings -> General -> Root Directory -> blank) — this script
# already cd's into iceburg-ui and uploads from there, so a Root Directory
# of "iceburg-ui" on top of that resolves to a path that doesn't exist.

cd "$(dirname "$0")"

ALIAS_HOST="${VITE_APP_ALIAS:-iceburg.iohaus.vercel.app}"

VERCEL_ARGS=()
if [[ -z "${VERCEL_ORG_ID:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  VERCEL_ARGS+=(--scope iohaus --project iceburg)
fi

DEPLOY_OUTPUT=$(vercel deploy \
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
