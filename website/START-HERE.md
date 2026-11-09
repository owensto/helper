# Castward — Vercel deployment edition

Prepared 9 November 2026. **Not deployed. No Vercel project or GitHub repository has been created by this package.**

This keeps the existing Fishing Atlas content and interface; it changes the deployment adapter, not the product scope. The original Netlify command is now named `publish-netlify-legacy.sh`. `publish.sh` now targets Vercel exclusively.

## From this chat

Vercel account connection is missing. Use the Vercel connection card already offered in the conversation and complete authorization. No password or token needs to be pasted into chat. Availability of a write/deployment tool must be checked after connection; connecting is not itself a deployment.

## From an authenticated local terminal

From this `castward` directory, run `bash publish.sh`. It runs local tests and invokes Vercel's standard CLI production deploy. Login and project/team selection are interactive. Use a dedicated Castward project; do not select an unrelated application. No paid upgrade or domain purchase is included. GitHub is optional for this direct deployment. This source package does not contain Git history or create a remote repository.

`bash publish.sh --check` runs local build/tests without an upload. Python 3 and Node/npm are needed. The Vercel build uses Python's standard library and no npm dependencies.

## Vercel project setup

Framework: Other (`framework: null`). Build: `python3 scripts/build_vercel.py`. Output: `dist`. `vercel.json` records these settings, security headers and the 519 legacy redirects. No catch-all rewrite: unknown pages should be true 404s. Ensure system environment variables are enabled; the build resolves its production origin from `VERCEL_PROJECT_PRODUCTION_URL`. An explicit HTTPS `SITE_URL` can override it for a verified custom domain. No unassigned domain is assumed. The old Netlify canonical origin is rejected.

Preview builds keep every page noindex and omit the sitemap. Production builds preserve the existing research-based indexing gates. Netlify-only form collection is explicitly disabled; email, analytics, affiliate configuration, native bookings and Frigatebird integration are not newly connected.

When redirect mappings change, run `python3 scripts/build_vercel.py --sync-routing` locally and commit the regenerated `vercel.json` before deploying. The remote build fails on a stale redirect map instead of silently losing routes.

## Verification still needed after upload

Check the returned production URL in a logged-out browser: homepage, `/trips/`, `/plan/`, a Texas guide, a legacy redirect, a missing URL, and `/sitemap.xml`. Confirm actual canonical host, working checklist persistence and no login wall. Local tests cannot establish Vercel/CDN behavior or a successful public launch.

## Official references

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/environment-variables/system-environment-variables
- https://vercel.com/docs/cli/deploy
