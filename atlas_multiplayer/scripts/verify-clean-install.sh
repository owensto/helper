#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Run only with permitted registry access. Review and commit npm's resulting lockfile.
npm install --package-lock-only --ignore-scripts --omit=optional --no-fund --fetch-retries=0 --fetch-timeout=15000
npm ci --ignore-scripts --omit=optional --no-fund --fetch-retries=0 --fetch-timeout=15000
node scripts/verify-dependency.mjs
npm audit --omit=dev --json
npm test
