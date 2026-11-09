# Fishing Atlas — Continental release 004

Build date: 13 September 2026. Status: **built and tested; not publicly deployed**.

## What was integrated

The 507-row North America production plan is now part of the actual website, not merely an attached spreadsheet. Each row has a canonical trip page, state/province collection, preparation checklist, and an editorial-queue record. Existing matched guides are retained. One overlapping Great Bear Lake pair is consolidated; the new worldwide count is **796**, not 816.

North America has **550 profiles**: **357 U.S. + 100 Canada + 50 Mexico = 507** planned experiences, plus **43** retained broader, Caribbean and Central American profiles. These are trip experiences, not 550 unique waterbodies.

All **50 U.S. states**, **13 Canadian provinces/territories**, and **15 Mexican states** have landing pages. Other continents have regional/country navigation and JSON/CSV research queues populated from their existing records.

| Collection | Profiles | Source-checked guides | Source-linked briefs | Research-pending preparation frameworks |
|---|---:|---:|---:|---:|
| North America | 550 | 23 | 48 | 479 |
| South America | 31 | 2 | 29 | 0 |
| Europe | 102 | 4 | 98 | 0 |
| Africa | 34 | 2 | 32 | 0 |
| Asia | 44 | 3 | 41 | 0 |
| Oceania | 35 | 4 | 31 | 0 |
| **Total** | **796** | **38** | **279** | **479** |

Antarctica has no Atlas trip inventory or booking product; it is not included in the six populated collections.

## What these numbers do not claim

The import did not turn the entire backlog into researched articles. **479 pages still have no checked local sources.** Their species remain candidates, seasons remain unverified, and access/method labels are explicitly preparation scenarios. They are noindex and omitted from the production sitemap.

The 279 source-linked briefs are retained lower-depth work; many rely on inspected search excerpts. All profiles lack independent local-expert sign-off. A source supports its attributed claims, not every editorial suggestion. No new fabricated current-condition, booking-price or availability data was added.

## Ten individually source-checked guide updates

These received full source-page inspection and authored local decision guidance in this release. Nine replace newly imported preparation frameworks; Cape Hatteras upgrades a retained guide. Thus the total source-checked guide count increases from 29 to 38, not 39.

| Production ID | Guide | Cited source records |
|---|---|---:|
| US-NC-001 | Cape Hatteras surf fishing: beach access, setups and a lighter packing list | 1 |
| US-NC-002 | Oregon Inlet offshore fishing: choose the charter before buying tackle | 2 |
| US-SC-001 | Charleston inshore redfish: choose the habitat and fish size before the kit | 2 |
| US-SC-002 | Beaufort and Port Royal Sound redfish: boat choice, access and preparation | 2 |
| US-GA-001 | Lake Lanier fishing: choose striped bass or a black-bass plan first | 2 |
| US-GA-002 | Chattahoochee trout below Buford Dam: pick the reach and check releases | 3 |
| US-FL-001 | Islamorada flats fishing: bonefish, permit and the right personal kit | 2 |
| US-FL-002 | Lake Okeechobee bass fishing: choose the sector, cover and access first | 2 |
| US-TX-002 | Lake Fork bass fishing: cover, launch choice and a compatible setup | 2 |
| US-TX-001 | Port Aransas bay fishing: separate skiff, kayak and shore preparation | 1 |

Port Aransas is a single-source local overview, explicitly identified as such. The Georgia naming difference between older spotted-bass wording and the current forecast’s Alabama-bass label is not silently resolved. The Lake Okeechobee June 2026 observation is not presented as a live September water level. South Carolina spawning context is not promoted into a blanket best-season recommendation. No unsupported monthly calendars were generated for the new guides.

The full source register contains **217 records representing 211 distinct URL strings**. Fifteen records were inspected for this guide-update batch; some URLs also appear in retained editions. A source-record count is not a unique-source or freshly researched-page count.

## Navigation and preparation

Country -> editorial region -> state/province -> actual trip -> customizable plan. The same workflow is present across each populated continent. Editorial geographic groupings are explicitly not asserted to be an official classification.

Search supports country, state/province, editorial region, water type, environment, method, evidence depth and documented months. Candidate species may be used to find an explicitly unverified preparation profile; only confirmed species feed the species index.

Each trip has four scoped gear decisions. Owned, packed and confirmed guide-provided items affect the remaining checklist. Technical compatibility is kept as a confirmation step rather than filled with arbitrary Amazon products. Exact product selection and affiliate tracking remain unconfigured.

## Search and performance

There are **1,093 non-redirect pages plus 519 legacy redirect routes**, or 1,612 generated routes in total. These are not 1,612 articles. Legacy URLs redirect to canonical regional paths; redirect pages are not indexed.

Production-metadata tests use a deliberately nonpublic `.invalid` origin. **36 trip guides** qualify for indexing under the current gate; two broad retained guide scopes remain held. Including eligible navigation and other pages, the simulated sitemap has **96 URLs**. No sitemap exists in the final preview output because no real site origin has been configured. An actual origin is required before search publishing.

Public article pages use a lightweight navigation dataset of 115,187 bytes. The full 2,479,376-byte planner dataset is reserved for the planner and standalone preview.

## Tests actually run

- **1,612 static routes:** one H1, nonempty description, and internal links that resolve.
- **26 planner/unit tests:** destination normalization, dates, scoped gear, ownership/provision, quantities, access and category-shopping behavior.
- **814 structural release assertions:** counts, unique routes, evidence status, canonical migration, state coverage, continental queues and publication gates.
- **3,224 browser route/viewport checks:** all generated routes at 1,440px and 390px.
- Interactive tests: combined filters, 24-at-a-time pagination, preserved global search, all 78 subnational collections, legacy redirects, three-claim source rendering, trip-to-planner navigation, equipment-state remount, pending-research labels, queue expansion, and actual CSV export.
- No JavaScript runtime errors or horizontal overflow in that browser run.

The environment blocks file/localhost browser navigation. Browser tests used the actual standalone HTML in an in-memory document and a storage shim, plus the actual lightweight article scripts with execution order preserved. **No production hosting, real retailer conversion, payment, email or live inventory integration was tested.** Structural testing is not independent fishing-expertise vetting.

## Deployment and remaining commercial connections

The connected Netlify account was inspected. It contains only the unrelated yacht project. A separate new Fishing Atlas project requires confirmation; the yacht site was not modified. The package contains the built static payload and build configuration, not a public deployment.

Amazon links remain untagged category searches unless the owner configures a real Associates tag. Native bookings, payments, escrow, operator inventory, centralized analytics and email collection are not connected. Saved plans are local-browser records; share links are snapshots rather than collaborative cloud documents.

No ongoing automated research or background publishing service is running. The continent queues contain executable editorial work, not promises of scheduled completion.

## Reproduce

```sh
python3 scripts/compile_release.py
python3 scripts/build.py
python3 tests/static_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
python3 tests/release_test.py
python3 tests/continental_browser_test.py
```

See README.md for source inputs, deployment settings, queue exports and limitations.
