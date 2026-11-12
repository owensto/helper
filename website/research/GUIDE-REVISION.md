# Castward guide revision — 11 November 2026

The seven requested guides now use the rich template. Five separate fly lessons contain eight illustrated steps each. The original fly article is the lesson hub. No deployment occurred.

## Content

- Added subject-specific heroes, quick answers, key facts, normal page navigation, comparison tables, size charts, steps, callouts, checklists, product cards, and FAQs.
- Reworked the wader guide with measurements, selected Simms and Orvis chart rows, fit checks, safety, care, leak repair, a repair kit, and three product tiers.
- Reworked the merino guide with material comparisons, micron and fabric-weight advice, fit, certifications, care, service-life limits, product picks, and warranty terms.
- Reworked the layer, gear-tier, beginner, and kit guides into shorter sections.
- Added original tool and material identification plates.
- Added Article image metadata and HowTo data. Kept FAQPage data.
- Used brand-and-product Amazon searches with `mediaatlas08-20`. Product cards link to their primary specification sources.

The revision uses 46 primary sources with check dates of 11 November 2026. The audit is in `guide-rich-source-checks.json`. Unverified rain-suit specifications were removed from the picks. The sock guarantee text reflects the manufacturer's current terms.

## Changed source files

| File | Change |
| --- | --- |
| `src/guides.json` | Seven rewrites, five tutorials, rich schema, source records, image records |
| `src/shopping-lists.json` | Seven product lists with tiers, specifications, and citations |
| `scripts/guides.py` | Rich rendering, responsive images, tables, steps, FAQs, HowTo data, dynamic dates |
| `scripts/clean_copy.py` | Product cards, affiliate links, and disclosure in the rich layout |
| `scripts/build.py` | Rich stylesheet and Article image metadata |
| `public/assets/guide-rich.css` | Phone and desktop layouts, cards, charts, steps, focus states, reduced-motion rules |
| `public/assets/motion.js` | Native-scroll guard for rich articles; shared menu behavior stays active |

## Added files

- `public/media/guides/`: 54 original images in three WebP widths; 162 files; 11.79 MiB total.
- `scripts/prepare_guide_image.py`: image conversion at 640, 1200, and 1600 pixels.
- `tests/guide-rich.test.cjs`: content, source, metadata, image, media-budget, and product checks.
- `tests/guide-rich-browser.cjs`: browser checks and screenshot capture.
- `research/guide-rich-baseline.json`: the seven original articles and shopping lists for review.
- `research/guide-rich-source-checks.json`: source audit.
- `research/guide-image-prompts.json`: image prompts and art-direction records.
- `research/guide-image-corrections.json`: three image correction prompts.
- `research/guide-tutorials.json`: the tutorial planning record.
- `research/dr-slick-catalog.txt`: extracted manufacturer catalog evidence.
- `../GUIDE-STANDARD.md`: the future article standard, schema examples, source rules, and release checks.

The build refreshed `dist/`, the chat index, compiled catalog files, and the local preview. Raw generated PNGs were deleted after conversion. The main site and other jobs were not edited.

## Added routes

- `/guides/how-to-tie-a-woolly-bugger/`
- `/guides/how-to-tie-a-pheasant-tail-nymph/`
- `/guides/how-to-tie-an-elk-hair-caddis/`
- `/guides/how-to-tie-a-zebra-midge/`
- `/guides/how-to-tie-a-san-juan-worm/`

## Validation

- Production static build: passed; 2,478 routes.
- Static route checks: passed.
- Node tests: 48 passed.
- Browser checks: 12 pages at 390px and 1440px; 24 page/viewport checks passed.
- Browser checks cover image loading, page overflow, phone card width, FAQs, anchors, affiliate tags, menu behavior, and native scroll.
- All 40 step illustrations were visually checked. Three incorrect material details were corrected.
- Final page screenshots were opened and inspected. Hero crops, table hints, phone cards, and the phone chat button were refined.

## Screenshots

All screenshots are in:

`/Users/oven/orca/workspaces/castward/jobs/guides/shots/`

Each article has `<slug>-390.png`, `<slug>-1440.png`, and matching `-full.png` files. Key examples:

- `fishing-waders-buying-guide-390.png`
- `fishing-waders-buying-guide-1440.png`
- `fishing-waders-buying-guide-size-chart-390.png`
- `fishing-waders-buying-guide-shopping-list-1440.png`
- `merino-wool-fishing-base-layers-shopping-list-390.png`
- `how-to-tie-a-woolly-bugger-steps-390.png`
- `how-to-tie-a-woolly-bugger-steps-1440.png`
- `guide-review-390-1.jpg` and `guide-review-390-2.jpg`
- `guide-review-1440-1.jpg` and `guide-review-1440-2.jpg`

The five `<pattern>-illustrations.jpg` files show all eight stages for each fly. The browser report is `test-results/guide-rich-browser.json`.
