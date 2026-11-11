# Castward atlas and trip styles — 2026-11-10

Status: Complete. Production is live. All release checks pass.

## Release

- Source commit: `d989f31f42cfafbfa3f416fd1e7bb1795478cff0`.
- Branch: `castward-launch` in `owensto/helper`.
- Separate worktree: `/Users/oven/orca/workspaces/castward/castward-atlas-types-20261110`.
- Production: https://castward.app/
- Atlas: https://castward.app/atlas/
- Trip styles: https://castward.app/trip-types/
- Local classics: https://castward.app/local-classics/
- Deployment: `dpl_ELvUqETjvPBGaZQKP7T29AssHhde`.
- Deployment URL: https://castward-o6jzfnq0q-owens-projects-f5c36e9a.vercel.app

The release retains the concurrent image, species, and glossary changes through `97e012da`. The image catalog has 145 trip scenes. The build has 2,452 routes. Each push and deployment used a fresh fetch, rebase, and production build. The post-deploy fetch showed no missing commits.

## Atlas

The home section and `/atlas/` use the same catalog of 801 destinations. The sage palette and existing page design remain.

The map uses self-hosted Natural Earth 110m geography and a bundled D3 module. No API key, paid tiles, or live geocoder is required. The code, geography, and catalog load near the viewport.

The map has clusters, wheel and pinch zoom, drag and keyboard pan, zoom buttons, and reset. Region buttons move the map to Alaska, Florida, Norway, or Australia. The route animation is a short introduction. Reduced motion removes the animation.

Water, trip style, month, three-month windows, and species/place search share one result set. Counts update with the filters. Cards show the trip image, region, supported species, location scope, and trip link. Shared coordinates expose each trip. The accessible list has all 801 destinations. All links also work without JavaScript on `/atlas/`.

The home statistics show 801 destinations and 118 country or jurisdiction collections. The old three-species statistic is removed.

## Location evidence

The starting data had coordinates for three original profiles. It had none for the other 798 profiles. The release adds a source register for all 801 records.

There are 602 place-area references, 192 regional references, and seven country references. The map identifies their scope. These points do not claim an exact departure site.

The sources are OpenStreetMap (786), GeoNames (9), the retained catalog (3), USGS (1), Wikidata (1), and a published Pluma River study (1).

The seven country references are Mongolia taimen, both Monaco records, Lithuanian Baltic coast, Norway summer sea, Gambia lodge jetty, and Singapore charter waters. Their cards state the limitation.

Source register: https://castward.app/media/atlas/locations.json

The month filter uses only documented season windows. Missing months do not mean that a trip is unavailable. Candidate species remain distinct from supported species. Existing scene illustrations remain labeled as illustrations.

## Information architecture

`/trip-types/` now has 16 trip styles. Each style explains the activity, suitable visitors, boats, gear, and seasons. Each page lists every matching destination from the catalog and its local classics.

The 41 named hubs are now Local classics. Their detail URLs remain unchanged. The new directory is `/local-classics/`. Style pages, destination pages, and `/trips/` link to these classics. Existing planner presets and saved-plan identities remain intact.

The header has Trips, Atlas, Trip styles, Waters, Field guides, Films, and one My fishing plan link. The build updates canonical links, breadcrumbs, schema, and the sitemap. No existing detail URL moved. Existing redirects remain.

## Checks

- Production build: `python3 scripts/build_vercel.py` passed.
- Release checks: 816 assertions passed.
- Static checks: all 2,452 routes passed heading, description, and internal-link checks.
- JavaScript tests: 33 passed.
- Vercel tests: 10 passed.
- Species and glossary tests: five passed.
- Guide checks: 21 passed.
- Image checks: 145 trip scenes, 653 fallback heroes, and 1,503 scene uses passed.
- Video contract test passed.
- Local-classic browser checks: 92 route and viewport checks passed.
- Species and glossary browser checks: 16 passed.
- Atlas browser checks: 12 groups passed locally and on production.
- Atlas checks include filters, empty results, pagination, region controls, wheel, drag, keyboard, touch pinch, reduced motion, and no-JavaScript access.
- Automated WCAG A/AA checks found no violations on the tested atlas, style, and local-classic pages.
- Browser checks found no script errors or horizontal overflow.
- Six live pages matched the local build byte for byte, including the home, atlas, styles, classics, species, and glossary pages.

## Mobile Lighthouse

Both runs used mobile emulation and Lighthouse simulated throttling on production.

| Page | Performance | Accessibility | Best practices | SEO | LCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 100 | 100 | 100 | 100 | 1.7 s |
| `/atlas/` | 100 | 100 | 100 | 100 | 1.5 s |

The home performance score exceeds the required 90. Full JSON reports and a short summary are in `runs/castward-atlas/`. Scores describe these measured runs.

## Interaction videos

Both clips show actual interactions on the live atlas. Each clip is exactly 20 seconds. Both use VP9 WebM at 20 frames per second. The clips have no audio.

- [Desktop clip](../castward-atlas/atlas-desktop-20s.webm): 960 × 676, 376,317 bytes.
- [Phone clip](../castward-atlas/atlas-phone-20s.webm): 390 × 844, 380,032 bytes.

The clips show region changes, a trip card, zoom or pinch, and filters. Frame checks confirm the map, card image, and controls are visible. `video-verification.json` records the codec, dimensions, duration, and file size.

## Files

- Implementation notes: `website/research/ATLAS-2026-11-10.md`.
- Source register: `website/src/atlas-locations.json`.
- Style catalog: `website/src/trip-styles.json`.
- Readable map source: `website/client/atlas-map.js`.
- Build integration: `website/scripts/interactive_atlas.py` and `website/scripts/trip_styles.py`.
- Checks and evidence: `runs/castward-atlas/`.
