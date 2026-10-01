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
# Runs from the repo root, not iceburg-ui/ — the "iceburg" Vercel project
# has its own Root Directory set to iceburg-ui, so the upload needs to
# actually contain an iceburg-ui/ folder for that to resolve. The repo
# root's .vercelignore keeps that upload scoped to what's needed (skips
# contracts/, docs/, etc.) rather than the whole monorepo.

cd "$(dirname "$0")/.."

ALIAS_HOST="${VITE_APP_ALIAS:-iceburg.iohaus.vercel.app}"

SCOPE_ARGS=()
DEPLOY_ARGS=()
if [[ -z "${VERCEL_ORG_ID:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  SCOPE_ARGS+=(--scope iohaus)
  DEPLOY_ARGS+=(--scope iohaus --project iceburg)
fi

DEPLOY_OUTPUT=$(vercel deploy \
  --target preview \
  --yes \
  --json \
  "${DEPLOY_ARGS[@]}")

DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | jq -r '.deployment.url // .url')
DEPLOYMENT_URL="${DEPLOYMENT_URL#https://}"

if [[ -z "$DEPLOYMENT_URL" || "$DEPLOYMENT_URL" == "null" ]]; then
  echo "Deploy succeeded but couldn't parse the deployment URL out of:" >&2
  echo "$DEPLOY_OUTPUT" >&2
  exit 1
fi

echo "Deployed: https://${DEPLOYMENT_URL}"

vercel alias set "https://${DEPLOYMENT_URL}" "$ALIAS_HOST" "${SCOPE_ARGS[@]}"

echo "Aliased: https://${ALIAS_HOST}"
