#!/usr/bin/env python3
from pathlib import Path
import json,shutil,zipfile
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/mnt/data')
w=json.loads((ROOT/'src/world.json').read_text());q=json.loads((ROOT/'research/global-quality-report.json').read_text());browser=json.loads((ROOT/'tests/global-browser-results.json').read_text());static=json.loads((ROOT/'tests/static-results.json').read_text());manifest=json.loads((ROOT/'dist/route-manifest.json').read_text());c=q['counts']
assert q['passed'] and browser['passed'] and static['passed'];assert len(manifest)==472
md=['# Fishing Atlas Global Edition 003 — content and quality audit','', 'Build date: 2026-09-13','',
'## Delivered content','',
f'- **{c["tripProfiles"]} trip profiles**: {c["detailedGuides"]} retained detailed guides and {c["newTripBriefs"]} new source-linked briefs.',
f'- **{c["countriesExcludingFreeAssociatedStates"]} countries**, plus **Cook Islands and Niue**, giving {c["countryJurisdictionCollections"]} country/jurisdiction collections.',
f'- **{len(manifest)} static pages total**. This count includes navigation, tools and research pages; it is not a count of researched articles.',
'- **12 environment guides** and **6 retained preparation articles**.',
f'- **{c["sourceRecords"]} source records**, of which {c["sourcesUsed"]} are cited in the trip/environment library.',
'', '## Research depth — important distinction','',
'All 29 longer source-checked guides from the prior edition remain. The 280 additions are structured trip briefs, not an assertion that 280 complete local guides have been deeply vetted.',
'',f'Of the new briefs, **{c["newBriefEvidenceDepth"]["Inspected source text"]}** are supported by inspected source page text and **{c["newBriefEvidenceDepth"]["Inspected search excerpt"]}** by inspected search-result excerpts. The site discloses this on each brief and in the source register. Most profiles cite one source; **{c["multiSourceProfiles"]}** profiles have multiple sources. No independent local expert has reviewed this release.',
'',f'**{c["profilesWithTargetStillUnconfirmed"]}** profiles leave the target fish unconfirmed rather than assigning a species from the country or habitat. **{c["profilesWithDocumentedMonths"]}** profiles have explicit documented month windows. Other pages retain qualitative discussion or state that dates still need confirmation.',
'', 'The country count is not universal coverage. Missing countries remain research gaps, not evidence that fishing is absent. A profile can describe a regional or operator program; multiple trip scenarios can share an island or broader waterbody. The 309 distinct displayed place labels should not be interpreted as 309 independent waterbodies.',
'', '## Original content versus shared preparation','',
f'Each new brief includes an attributed source statement and an original local planning decision. Those original decisions total **{c["originalLocalDecisionWordsNewBriefs"]:,} words**. Preparation modules, seasonal-uncertainty language and requirement patterns are intentionally reusable; they are not counted as additional original local research.',
'', 'The QA pass identified repeated decisions in several regional batches. Those were revised in `scripts/catalog/quality_edits.py`, and the resulting decision paragraphs pass exact-duplicate and high-similarity checks. This establishes text integrity, not factual correctness.',
'', '## Regional coverage','', '| Region | Trip profiles |','|---|---:|']
md += [f'| {r} | {n} |' for r,n in c['byRegion'].items()]
md += ['', '## Functionality','',
'Country and regional collections, species browsing, water/environment/method filters, an evidence-depth filter, documented-month filtering and paginated trip results are wired into the working site. All 309 trip profiles open their own planner requirements. The three original broad planner profiles are retained in addition, so the planner contains 312 selectable entries.',
'', 'Each trip has four equipment decisions. Shopping links are category-level Amazon searches, not exact-model reviews. No Associates tag is configured. Confirm-before-buying requirements do not invent a compatible product variant. No booking availability, prices, payments, escrow or operator partnership is fabricated.',
'', '## Checks actually completed','',
'- Catalog integrity: stable unique IDs, unique titles and original decision text, valid source references, complete four-item requirement sets, related links and qualified seasons.',
f'- Static HTML: **{static["routes_checked"]} routes** passed one-H1, nonempty-description and internal-link checks.',
'- Planning engine: **26 tests passed**, including per-trip requirements, owned/provided gear, climate/access separation, quantities and cross-trip state isolation.',
f'- Browser: **{browser["viewportChecks"]} route/viewport checks** across {browser["routeCount"]} routes at 1440px and 390px, plus search, pagination, combined filters, country navigation, depth notices and planner interaction.',
'- No JavaScript runtime errors or horizontal overflow was observed in that browser run.',
'', '**Browser harness limitation:** direct file-origin navigation is blocked by the execution environment. Tests used an in-memory rendered document and a localStorage shim. Storage serialization and remount were tested; real hosted persistence, external retailer navigation, email, payments and production hosting were not.',
'', '## Publishing status','',
'The standalone HTML is a browser preview, not a publicly hosted website. The source includes all rendered pages and the rebuild tools. The default configuration intentionally omits a canonical production origin and does not claim the preview is indexed. Set a real site origin to generate production canonical URLs, a sitemap and indexing directives.',
'', '## Rebuild and test','',
'```sh\npython3 scripts/compile_catalog.py\npython3 scripts/build.py\npython3 scripts/global_quality_audit.py\npython3 tests/static_test.py\nnode --test tests/engine.test.cjs tests/world-engine.test.cjs\npython3 tests/global_browser_test.py\n```',
'', '## Country and jurisdiction register','', '| Collection | Profiles |','|---|---:|']
md += [f'| {name} | {n} |' for name,n in q['countries'].items()]
md += ['', '## Trip register','', '| Country / jurisdiction | Place / program | Depth |','|---|---|---|']
md += [f'| {t["country"]} | {t["place"]} | {"Detailed guide" if t["contentTier"]=="detailed-guide" else "Brief — "+t["evidenceDepth"].lower()} |' for t in sorted(w['trips'],key=lambda t:(t['country'],t['place']))]
text='\n'.join(md)+'\n';(ROOT/'research/GLOBAL-AUDIT.md').write_text(text);(OUT/'Fishing-Atlas-Global-Audit.md').write_text(text)
# Mark prior reports as historical rather than leaving misleading current pass summaries.
legacy=ROOT/'research/legacy-world-edition';legacy.mkdir(exist_ok=True)
for name in ['QUALITY-REPORT.md','quality-report.json']:
 p=ROOT/'research'/name
 if p.exists() and not (legacy/name).exists():shutil.copy2(p,legacy/name)
(ROOT/'research/QUALITY-REPORT.md').write_text(text)
(ROOT/'research/quality-report.json').write_text(json.dumps(q,ensure_ascii=False,indent=2))
readme=f'''# Fishing Atlas — Global Edition 003

{c['tripProfiles']} trip profiles across {c['countriesExcludingFreeAssociatedStates']} countries plus Cook Islands and Niue. This extends the existing website; it does not replace the 29 detailed guides with shallow generated articles.

## What is included

- 29 retained detailed trip guides, 280 new explicitly authored source-linked briefs.
- 118 country/jurisdiction hubs, six regions, 12 environment guides, six preparation articles.
- {len(manifest)} static pages with titles, descriptions, source references and internal links.
- Interactive search, combined filters, research-depth selection and 24-at-a-time results.
- All trip profiles connected to the owned/provided/needed equipment planner.
- Complete structured data, source registry, rebuild scripts and tests.

## Run the site locally

The `dist/` directory is deployable static output. Serve it from this project:

```sh
python3 -m http.server 8080 --directory dist
```

Then open localhost:8080 in a browser. A separate single-file preview is also supplied alongside the source archive.

## Rebuild

```sh
python3 scripts/compile_catalog.py
python3 scripts/build.py
```

The compiler uses the explicit records in `scripts/catalog/`. It does not manufacture combinations of countries, species and months. Retained source material is in `src/world-base.json`; the combined catalog is `src/world.json`. Per-record corrections live in `scripts/catalog/quality_edits.py`.

Configure `siteUrl` in `config.json` with the actual production origin before publishing for search. The build generates canonical URLs and a sitemap when a real origin is configured. Configure `amazonTag` only with your actual Associates tag. No tag, hosted form collector, analytics account, booking inventory or payment service is connected by default.

## Test

```sh
python3 scripts/global_quality_audit.py
python3 tests/static_test.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs
python3 tests/global_browser_test.py
```

Browser tests require Playwright and Chromium. The bundled browser test uses an in-memory document with a storage shim because the execution environment blocks file-origin navigation. Do not mistake this for a production integration test.

## Content quality

See `research/GLOBAL-AUDIT.md`. The 280 additions are trip briefs: 54 cite inspected page text and 226 inspected search excerpts. None has independent local-expert sign-off. A source supports its attributed statement, not every editorial planning category or gear suggestion. Shared environment modules are clearly separated from original local decisions.

114 trip profiles leave their targets unresolved; 13 profiles contain documented month windows. Missing data is not filled with invented species, best-month claims or availability. Country coverage is not exhaustive. Gear links are Amazon category searches, not exact product reviews.

The older World Edition reports are preserved as historical records under `research/legacy-world-edition/`; current checks are `research/global-quality-report.json`, `tests/static-results.json`, `tests/global-browser-results.json` and `tests/global-engine-results.txt`.
'''
(ROOT/'README.md').write_text(readme)
shutil.copy2(ROOT.parent/'Fishing-Atlas-World-Preview.html',OUT/'Fishing-Atlas-Global-Preview.html')
shutil.copy2(ROOT/'src/world.json',OUT/'Fishing-Atlas-Global-Catalog.json')
shutil.copy2(ROOT.parent/'Fishing-Atlas-Global-Desktop.png',OUT/'Fishing-Atlas-Global-Desktop.png')
shutil.copy2(ROOT.parent/'Fishing-Atlas-Global-Mobile.png',OUT/'Fishing-Atlas-Global-Mobile.png')
# Store current preview and audit in the project for a self-contained source archive.
(ROOT/'PREVIEW-NOTE.txt').write_text('Open the separately supplied Fishing-Atlas-Global-Preview.html, or serve dist/ locally. The full preview can be regenerated by scripts/build.py.\n')
zip_path=OUT/'Fishing-Atlas-Global-Source.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in ROOT.rglob('*'):
  if not f.is_file() or any(x in f.parts for x in ('__pycache__','.git','node_modules')):continue
  z.write(f,Path('fishing-atlas-global')/f.relative_to(ROOT))
for f in [OUT/'Fishing-Atlas-Global-Preview.html',zip_path,OUT/'Fishing-Atlas-Global-Catalog.json',OUT/'Fishing-Atlas-Global-Audit.md']:
 print(f, f.stat().st_size)
