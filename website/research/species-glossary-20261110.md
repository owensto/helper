# Species and glossary research — 2026-11-10

The catalog contains 705 fish species and 62 broader fish groups. Scientific names identify species. Group records do not claim a single scientific identity.

All 801 destinations have a research record. Sources support target lists at 475 destinations. The other 326 records remain unverified with empty target lists. Country occurrence alone does not establish a destination target. Season and method fields stay unverified unless a cited source supports them. This release does not claim complete verified destination coverage.

The glossary contains 1,380 terms and 1,839 definitions. It keeps all 82 original terms and their anchors. It includes 102 added method, equipment and boat definitions, plus regional fish names. Each definition has sources and related species or trip references where the evidence supports them.

Canonical source files:
- `src/species-catalog.json`: FishBase v26.06 taxonomy, recorded regional names, agency references and supported seasonal notes.
- `src/destination-species.json`: destination targets, evidence, source URLs and explicit review status.
- `src/glossary.json`: definitions, regions, species IDs and trip links.

The compiler joins these records to `world.json` and `compiled-data.json`. The page builder uses the same IDs for species pages, trip sections, the glossary, search and the sitemap. Species references do not change the destination publication tier, access checks or legal status.

The research archive is `seo-reports/runs/castward-species/`. It contains 801 saved destination searches, 275 follow-up searches, manual claim reviews, source downloads and a list of unverified destinations. No catch totals, reviews or regulation limits were invented. Regulation links point to the relevant agencies.
