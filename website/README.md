> **Hosting target: Vercel.** Read `START-HERE.md` for the current deployment flow. `publish.sh` targets Vercel; older Netlify guidance below is historical. No public Vercel deployment was made by this package.

> **Publishing update — 9 November 2026:** See [START-HERE.md](START-HERE.md). A separate `fishing-atlas` Netlify project now exists but has zero verified deployments. This local Git repository has not been uploaded. The earlier deployment paragraph below describes the September release, not the current account state.

# Fishing Atlas — Continental Edition 004

A working static fishing atlas, with **all 507 North America production records integrated** and a reusable continent-by-continent editorial workflow.

## Counts that mean different things

- **796 unique trip profiles worldwide** after matching existing opportunities and consolidating an overlapping Great Bear Lake pair.
- **550 broad North America profiles**: 357 planned U.S. experiences, 100 Canadian, 50 Mexican, plus 43 retained Central American, Caribbean and broad regional profiles.
- **38 source-checked planning guides**, **279 retained source-linked briefs**, and **479 preparation frameworks awaiting local research**.
- **50 U.S. state**, **13 Canadian province/territory**, and **15 Mexican state** landing pages.
- **1,093 non-redirect pages** plus **519 legacy redirects**. There are not 1,612 researched articles.
- Ten guides received individual source-page research in this edition. None is claimed to be independently expert-reviewed or personally field-tested.

The other continents retain their actual catalogs: South America 31, Europe 102, Africa 34, Asia 44, Oceania 35. Each now has editorial regional navigation and a production queue. These counts are not newly researched additions. Antarctica has no recreational trip product in the catalog.

## Start

Serve the supplied static files:

```sh
python3 -m http.server 8080 --directory dist
```

The separately supplied `Fishing-Atlas-Continental-Preview.html` is a self-contained browser preview, including working queue exports. Open it in a normal browser; mobile file viewers may disable JavaScript. Plans save in that browser, not a cloud account.

## Rebuild in one pass

```sh
python3 scripts/compile_release.py
python3 scripts/build.py
```

Or run `npm run build` (no npm dependencies are needed to build). The Netlify build configuration uses the same two commands.

Primary inputs:

- `src/north-america-plan.json`: the actual 507-entry production backlog.
- `src/world-before-na.json`: the preserved 309-profile global catalog.
- `src/release-enrichment.json`: ten separately authored, source-checked guide updates and 15 inspected source records.
- `src/continent-regions.json`: explicit editorial region assignments.
- `scripts/compile_release.py`: matching, merge, scenario import and evidence-tier gating.
- `scripts/continental_extension.py`: canonical routes, state/province hubs, continental browsing and editorial queues.

Do not use the historical `compile_catalog.py` as the release compiler; it reconstructs the earlier global edition.

## Publishing status

**This package has not been publicly deployed.** The connected Netlify account contains only an unrelated yacht project. A new Fishing Atlas project needs owner confirmation; the existing yacht site was not modified.

The `dist/` folder is a static hosting payload. Supply the actual production origin through `SITE_URL`, `config.json`'s `siteUrl`, or the hosting provider's `URL` environment variable. No domain has been invented or registered.

With a real origin, the build emits canonical URLs and a sitemap. Preparation frameworks and insufficiently reviewed briefs stay `noindex,follow` and out of the sitemap. Alias routes receive both HTML fallback redirects and static-host 301 rules in `_redirects`. Without an origin, the output remains a non-indexable preview.

## Content and shopping

Every profile has a planner with four scoped equipment decisions plus reusable personal preparation requirements. Unconfirmed local targets remain candidates; no new best-month calendars or live conditions are invented.

Amazon links are category searches. Configure only a real owner-supplied `AMAZON_ASSOCIATE_TAG` to add tracking. Exact models, variants, prices and stock are not vetted or connected. Booking inquiries are drafts, not reservations. No native booking, payment, escrow, email collection or centralized analytics integration was implemented in this release.

Public articles load a roughly 113 KB navigation dataset instead of the full roughly 2.4 MB gear dataset. The full dataset loads for the planner and standalone preview.

## Continental production queues

`research/continent-queues/` contains JSON and CSV for all six populated continents. Each record contains its local research decision, target status, access, gear question, operator provision question, distribution angle and acceptance gate. The same files are exposed in `dist/downloads/` and in the standalone preview.

The workflow is: inspect full sources -> resolve local decisions -> check gear -> publish eligible content -> distribute the matching checklist. There is no automatic ongoing research agent or publishing schedule running.

## Verify

```sh
python3 tests/static_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
python3 tests/release_test.py
python3 tests/continental_browser_test.py
```

The browser test needs Playwright and Chromium. In this execution environment, file/localhost navigation is blocked; tests therefore use the actual standalone HTML in an in-memory document, with a localStorage shim. They test UI behavior, not live hosting, actual retailer conversion, payment or email delivery.

Current reports:

- `tests/static-results.json`
- `tests/continental-engine-results.txt`
- `tests/continental-release-results.json`
- `tests/continental-browser-results.json`
- `research/CONTINENTAL-RELEASE.md`

Earlier research material is retained for provenance. Older edition test results are historical, not evidence for this release.
