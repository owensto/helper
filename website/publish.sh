#!/usr/bin/env bash
# Vercel only. Account/team selection remains interactive; no secret is embedded.
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:---prod}"
case "$MODE" in --check|--prod|--deploy-only) ;; *) echo 'Usage: bash publish.sh [--check|--prod|--deploy-only]' >&2; exit 2;; esac
command -v python3 >/dev/null
command -v node >/dev/null
python3 tests/vercel_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
if [ "$MODE" = --check ]; then
  VERCEL_ENV=preview python3 scripts/build_vercel.py
  python3 tests/static_test.py
  echo 'Local Vercel checks passed. No remote deployment was attempted.'
  exit 0
fi
command -v npx >/dev/null
printf '\nChoose the intended Vercel team and a dedicated Castward project in the CLI prompts.\n'
printf 'No GitHub repository, domain purchase, or plan upgrade is performed by this script.\n'
# No --yes is passed to Vercel: review the account/project rather than silently using defaults.
npx --yes vercel@latest deploy --prod
printf '\nThe Vercel command completed. Inspect the returned URL and public access before calling the launch verified.\n'
