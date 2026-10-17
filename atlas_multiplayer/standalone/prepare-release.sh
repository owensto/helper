#!/bin/sh
# Run in atlas_multiplayer on an authorized registry-capable build host.
set -eu
npm install --package-lock-only --ignore-scripts --omit=optional --no-audit --no-fund
npm ci --omit=optional --ignore-scripts --no-audit --no-fund
node scripts/verify-dependency.mjs
npm audit --omit=dev --omit=optional
npm run test:standalone-suite
npm run build:standalone
