# Fishing Atlas World Edition — Research and QA audit

Reviewed: 2026-09-13

## Completed content

- trip guides: **29**
- environment guides: **12**
- authored article words excluding shared UI: **15874**
- countries: **16**
- regions: **6**
- inspected source records: **37**
- sources linked to new guides: **36**
- single source trip guides: **21**
- multi source trip guides: **8**
- qualified seasonal trip guides: **10**
- recorded research exclusions or qualifications: **7**

## Automated integrity checks

- Unique article IDs and titles
- Attributed evidence and valid source records
- No unsupported independent-review or field-test labels
- Habitat and related-trip references resolve
- Every kit decision explains its requirement and reason
- Seasonal windows retain scope labels and source IDs
- No exact duplicated authored paragraphs
- Five-word-shingle near-duplicate body check

**Result:** PASS

These are structural and text-integrity checks, not a substitute for subject-matter expertise.

## Remaining editorial limitations

- 21 of 29 local trip guides rely on one cited source; they are not independently triangulated.
- All articles still need independent subject-matter review before being called expert-vetted.
- Category shopping links have not been converted to exact-model product reviews.
- A linked source is not proof of every editorial recommendation; only explicit attributed claims are represented as sourced.
- No current-condition, weather, retailer-availability or booking-inventory feed is connected.

## Research decisions actually made

- **Excluded — Far East Anglers — Japan fly-fishing lodge:** Source paired 40 inches with 60 cm. Those measurements are inconsistent. Omitted the numeric fish-size claim and promotional strike-frequency estimate.
- **Excluded — Blue Safari — Giant trevally on fly:** The operator species index had duplicated text in an unrelated species description. Used the dedicated giant-trevally page; did not copy the index text.
- **Excluded — ADF&G — Delta Clearwater River:** Some agency structured begin/end date strings were malformed. Used the readable seasonal prose, not broken date tokens.
- **Qualified — ADF&G — Tanana report, June 26, 2026:** A seasonal river observation is dated June 26, 2026. Retained observation date and historical status; no live-conditions claim.
- **Qualified — Zambia Tourism — Lower Zambezi tiger fishing:** Local seasonal story dates to 2020. Label historical seasonal background; keep current-condition checks unresolved.
- **Excluded — Amazon Xtreme Fishing — Rio Negro programs:** Promotional copy generalized insect conditions and fishing outcomes. Did not use those assertions as trip facts.
- **Qualified — Tasmanian Inland Fisheries Service — Yingina / Great Lake:** Different named subwaters have distinct access/management context. No lake-wide inference from one bay or one listed opening.

## Guide register

| Guide | Type | Original article words | Cited sources |
|---|---|---:|---:|
| situk-coho-river | trip | 518 | 1 |
| yakutat-halibut | trip | 477 | 1 |
| delta-clearwater-grayling | trip | 483 | 1 |
| tanana-glacial-system | trip | 426 | 2 |
| rocky-mountain-alpine | trip | 404 | 1 |
| texas-inshore-redfish | trip | 397 | 2 |
| cape-hatteras-surf | trip | 462 | 1 |
| keys-flats | trip | 424 | 2 |
| keys-offshore | trip | 403 | 1 |
| andros-bonefish | trip | 406 | 1 |
| belize-permit | trip | 432 | 2 |
| belize-reef | trip | 369 | 1 |
| quepos-offshore | trip | 383 | 1 |
| costa-caribbean-canals | trip | 392 | 1 |
| rio-negro-peacock | trip | 433 | 2 |
| northern-patagonia-trout | trip | 444 | 2 |
| norway-skrei | trip | 408 | 1 |
| norway-summer-sea | trip | 390 | 1 |
| finland-ice-fishing | trip | 434 | 1 |
| soca-fly-fishing | trip | 395 | 1 |
| lower-zambezi-tiger | trip | 401 | 1 |
| cosmoledo-gt | trip | 490 | 2 |
| mongolia-taimen | trip | 435 | 2 |
| hokkaido-char | trip | 414 | 1 |
| gangwon-streams | trip | 406 | 1 |
| top-end-barramundi | trip | 385 | 1 |
| tasmania-great-lake | trip | 425 | 1 |
| mataura-trout | trip | 390 | 1 |
| eglinton-river | trip | 398 | 1 |
| rivers-streams | environment | 333 | 1 |
| spring-fed | environment | 332 | 1 |
| glacier-influenced | environment | 298 | 1 |
| lakes-reservoirs | environment | 314 | 1 |
| alpine-lakes | environment | 304 | 1 |
| estuaries-mangroves | environment | 301 | 1 |
| saltwater-flats | environment | 288 | 1 |
| surf-beaches | environment | 309 | 1 |
| reef-bottom | environment | 290 | 1 |
| offshore | environment | 291 | 1 |
| ice-fishing | environment | 297 | 1 |
| tropical-floodplains | environment | 293 | 1 |

## Browser and runtime checks

The companion test reports describe document-level desktop/mobile behavior, static links and pure planner rules. The browser harness uses an in-memory document and a localStorage shim. Public hosting, real retailer conversions, live forms, native downloads and payment integrations have not been tested.

## How to reproduce

```sh
python3 scripts/build.py
python3 scripts/quality_audit.py
python3 tests/static_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
python3 tests/world_browser_test.py
```