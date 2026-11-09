# Castward deployment record

Verified on November 9, 2026.

## Live website

https://castward.higgsfield.app

Host: Higgsfield's connected website hosting (Cloudflare Worker/static assets). This is not a Vercel deployment.

Managed website ID: `377f49c4-ebce-4a9d-8828-1b9b9cb7a860`.
Managed deployment source commit: `a695c14e582eef0455aa2a572b78ca4ed0f1fc10`.
Provider status: deployed; community listing enabled. The provider's initial login redirect stopped appearing after publication propagated.

## Signed-out HTTP verification

Requests had no account credentials or login cookies. Every checked URL returned HTTP 200 and stayed on `castward.higgsfield.app`, rather than returning a provider sign-in page.

| Path | Result |
| --- | --- |
| `/` | Actual Castward homepage HTML and title |
| `/trips/` | Trip catalog HTML with search and geographic/method filters |
| `/north-america/` | North America collection HTML |
| `/north-america/united-states/texas/` | Texas collection HTML |
| `/plan/` | Planner HTML |
| `/assets/app.js` | JavaScript asset, correct content type |
| `/sitemap.xml` | XML sitemap containing 96 URLs |
| `/castward-release.json` | JSON release metadata identifying 796 profiles and 550 North America profiles |

HTTP verification is not a full hosted browser-interaction test. The current editing runtime did not have an available Playwright browser, so no such test is claimed. The standalone planner engine was exercised across 799 choices (796 profiles plus three broad retained profiles). Gear scope isolation and owned status checks passed. All 479 research-pending profiles retained noindex metadata. The Node deployment assembler hash-verified all 1,613 HTML files, which include redirects and a duplicate 404 document, not 1,613 articles.

## GitHub handoff

Repository: `owensto/helper`.
Branch: `castward-launch`.
Source: `website/`.
Implementation/distribution plan: `PLAN.md`.
Detailed regional playbook and 507-experience backlog: `docs/`.
Import/test run: https://github.com/owensto/helper/actions/runs/42711701222

The GitHub branch contains the portable authoring source from the previously prepared Vercel-ready archive. It is not the platform-managed deployment repository and is not wired for continuous deployment to the current live site. Changes to this branch must be intentionally deployed through the selected hosting pipeline. The unrelated helper main branch remains unchanged.

## Current product boundaries

- 38 source-checked guides, 279 source-linked briefs and 479 research-pending preparation frameworks.
- Browser-local saved plans, not cloud accounts or collaborative live documents.
- Category shopping links; owner Amazon tracking ID and exact product catalog are not configured.
- Bookings, payments/escrow, live operator inventory, email delivery and central analytics are not connected.
- No completed Frigatebird/Orca integration.
- No custom Castward domain purchase or Vercel deployment is implied.

Next product work is prioritized in PLAN.md. This record reports an actual deployment and executed checks, not completion of the entire business roadmap.
