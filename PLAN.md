# Castward: implementation and distribution plan

Updated 2026-11-09. Build-first, North America-first. Reuse the existing atlas rather than restarting the product or creating another planning budget.

## Product

A comprehensive fishing guide that connects destination, season, species, technique, suitable equipment, personal preparation and guide bookings. Customers can start with a destination, a fish, their available dates, or an already-booked trip. The primary journey is discover → select a trip → customize a preparation list → shop only missing suitable items → request/book an experience.

The long-term scope is worldwide freshwater, saltwater and brackish water: inshore, offshore, flats, surf, estuaries, reefs, rivers, streams, spring-fed waters, lakes, reservoirs, alpine and glacier-influenced systems, tropical floodplains and ice fishing. Habitat, landscape, water type, access and method are independent dimensions.

## Current baseline, not a completion claim

- 796 worldwide profiles, 550 in the broader North America collection.
- 507 individually planned U.S./Canada/Mexico experiences integrated into the catalog: 357 / 100 / 50.
- All 50 U.S. states, 13 Canadian provinces/territories and 15 selected Mexican states represented.
- 38 source-checked guides, 279 shorter source-linked briefs, 479 research-pending frameworks.
- Search, regional navigation, browser-local saved plans, owned/provided gear states, printable lists and shared snapshots exist.
- Generic Amazon search links exist; exact-product recommendations and an owner tracking ID are not configured.
- Native reservations, payments, escrow, live inventory, email capture and centralized analytics are not connected.
- One managed hosted build has succeeded, but anonymous access must be verified separately from deployment status.

## P0 — Publish a genuinely accessible MVP

Keep the current static architecture. Establish one canonical Git source and a repeatable deployment. Prefer the existing Vercel-ready configuration once the owner's hosting connection is available. Do not require a Next.js rewrite.

Acceptance: a clean signed-out browser opens the homepage, a direct deep article URL, the trip catalog and planner without a provider login; assets load; a saved plan survives reload; the sitemap contains the actual canonical origin; research-pending pages remain noindex; no fake booking or successful-submission messages occur.

If using a temporary single-file review host, label it a public MVP/review link rather than claiming native production routing or full SEO distribution. The hosted deployment, its source commit, a public accessibility test and pending integrations must all be recorded separately.

## P1 — Make the first guides customer-ready

Begin with the individually researched Southeast and Texas guides, then release regional batches across all 50 states. The first 100 U.S. guides (two per state) are only the first batch, not the entire scope. Complete another 257 U.S. candidates, then 100 Canada and 50 Mexico. Continue with the existing Europe, South America, Africa, Asia and Oceania queues using the same evidence process.

U.S. regional order to test: Southeast; South Central/Gulf; Appalachia; Great Lakes/Upper Midwest; Northeast; Mid-Atlantic; Rockies; Pacific Northwest; Alaska; Pacific/Desert Southwest; Great Plains; Hawaii. This is an editorial operating order, not measured search-demand ranking.

For every publishable guide resolve: who the trip suits; actual fishery and access; target and method; evidence-backed seasonal context; practical logistics; compatible equipment system; clothing and quantities; owned, operator-provided, rent and buy needs; useful operator questions; local mistakes; sources and revision history. Unknown species, availability and months remain unknown. An article should change a visitor's decisions, not just contain more words.

Use a claim/source ledger with geographic scope and checked dates. A search excerpt is a research lead, not a completed source inspection. Preserve source-checked, expert-reviewed and field-tested as distinct statuses. Automated duplicate/link/structure checks are not proof of fishing accuracy. Do not generate every possible place × fish × month URL.

See the complete North America playbook and CSV in docs for every candidate, research question and gear framework.

## P2 — Useful affiliate shopping

Model trip requirement → compatible product/model/variant → retailer offer. Configure the owner's actual Amazon Associates tracking ID centrally. Start with a small curated catalog of exact products covering the finished guides; product-data API access is a later dependency, not a launch blocker.

Each recommendation must explain why it fits, exact variant, compatibility, quantity, lower-cost or portable alternatives when useful, and when to skip it. Do not recommend another item when existing equipment is suitable or the operator has confirmed provision. Treat shopping marketplace separately from fishing destination. No invented current price, stock, product test or commission report.

Acceptance: different trip methods generate materially different shopping needs; owned/provided items are suppressed; product substitutions preserve compatibility; unconfigured tracking is visible rather than pretending commissions work.

## P3 — Measurement and real inquiries

Track article → planner start → saved plan → shopping click → qualified inquiry → confirmed and completed booking. Keep clicks separate from sales, inquiries separate from reservations, and gross booking value separate from revenue.

Add a real stored inquiry, customer acknowledgment, internal notification and response status. Keep the button as a request until inventory and confirmation are dependable. Add an optional emailed checklist without blocking useful guides behind a sign-up. Store sensitive data outside the public catalog and repository.

## P4 — Distribution alongside each release

1. Operator preparation pages: select a small initial group of guides, lodges, captains and shops in the active region. Encode what each supplies and ask them to send the checklist with existing bookings. Measure repeated sending and actual customer use, not directory sign-ups alone.
2. Search: publish distinct researched guides and useful state/region hubs. Use real reader questions and search performance to prioritize supporting seasonal, technique and gear content. Do not buy traffic against thin, unverified pages.
3. Short demonstrations: show what travelers forget, what they overbuy, and what the guide supplies. Link each creative to its exact useful checklist, not a generic homepage.
4. Saved-plan follow-up: resolve outstanding preparation decisions and request post-trip feedback on used, missing and unnecessary gear.

Do not send outreach, buy ads or launch an ongoing campaign merely because copy exists; those require the owner's operational authorization and connected accounts. No recurring publication process is currently running.

## P5 — Marketplace and payment protection

Progress from responsive operators and request-to-book to accepted quotes, deposits/balances, booking status, weather/change handling, completion and operator payout milestones. Add group contributions and operator tools after the basic service works. Track customer funds separately. Any true escrow offering requires an actual supporting provider; a delayed payout should not be presented as escrow.

## Frigatebird / Orca

Reuse the same catalog, IDs, evidence tiers and planner. Inspect the real Frigatebird workspace, current branch/commit, account and storage contracts before integration. No duplicate catalog, second login or assumptions about an uninspected repository. No integration is installed today.

## Release discipline

- Preserve unrelated projects and the helper main branch.
- Keep credentials, real customer data, payments and tokens out of Git and static output.
- Keep work bounded and report exact commits, executed tests, actual deployed URLs and unresolved blockers.
- Treat a successful host build as different from signed-out public access.
- Do not replace evidence quality with page count.
- Do not call unfinished commerce features working.
