# Cast & Catch 3.0 — realism pass 2

This pass works in `jobs/game6/website`. No commit or deployment was made.
The previous pass and its measurements remain below as an archive.

## Current rendering

- Trees use generated alpha textures for needle clusters, broad leaves, mangrove leaves, palm fronds, and Spanish moss.
- Instanced crossed cards carry the foliage. A vertex shader moves their upper edges in the wind.
- Grass and reeds use the same card path. Each plant group has varied heights, angles, and tints.
- Three distant canopy layers use distance haze. Mangroves have curved prop roots.
- Four displaced stone meshes replace the repeated boulder shape. Each instance has a different size, rotation, and tint.
- Rock shaders darken the wet edge and add mineral detail and moss to upper faces.
- The banks have separate mud, gravel, and sand bands. Generated surface textures add ground detail.
- Ice shelves have irregular edges, surface cracks, and frost texture.
- Water uses Fresnel sky and scene reflections, a sun glint path, shore depth tint, and shallow caustics.
- River normal samples move with the current. Pooled rings mark the float and fish rises.
- The sky uses layered procedural cloud noise. Distant terrain has finer ridges and surface variation.
- The angler has roughly eight-head proportions, a close cap, a vest, and waders.
- Rounded limb meshes replace the large body blocks. The chest has subtle idle motion.
- The cast has a back cast, a forward stop, and a damped rod bend. The camera sits nearer the shoulder.
- Fish use smooth body profiles, generated scales and markings, curved fin outlines, fin rays, and a wet clear coat.
- Rainbow trout have a pink band and dark spots. Redfish have a bronze body and a tail spot.
- Bass and snook have distinct lateral markings. Salmon retain an adipose fin and upper-body spots.
- The renderer also supports striped bass markings. The species review labels that model as a reference; it adds no catch ID.
- The catch card holds a gentle three-quarter view with neutral key and rim lights.
- Tropical waters use an open skiff with flared sides, a bow deck, benches, gunwales, and an outboard.
- Dock boards and cabin walls use generated wood grain. The skiff uses aluminium material settings.

No bitmap downloads are required for this art. Canvas textures are generated locally.
Phone auto quality uses the realistic-light path: capped DPR, small reflection targets, and no shadow or bloom pass.
Desktop auto quality uses the high path. Manual quality settings remain available.
Reduced motion stops foliage sway, breathing, body bend, and surface-rise animation.

## Species facts and phone controls

The catch card now shows one short habitat or food fact for each of the 34 catch species.
The pass removes the Field Edition label, the catch slogan, and the water-level joke text.

The data path is:

| Source | Boundary | Consumer |
| --- | --- | --- |
| `game-engine.js` fact map | Canonical species ID | `species[].fact` |
| Species list | `Water` species pool and hooked fish | Catch card `#catch-note` |
| Catch event | Existing ID, name, size, and water record | Save, journal, career, and share image |
| Restored record | Existing species ID lookup | Current species definition |

Facts are display data. Saves retain their existing format and do not store a copy of a fact.
The journal and share image retain their size records and species IDs.
The unit check covers fact coverage and the restored-ID lookup.

The phone fight has a 16 px tension bar, larger labels, and an opaque instruction panel.
Unused water tabs, spot controls, and tutorial panels hide during the fight so the reel stays closer to the scene.
The full-view touch controls retain their 48 px minimum targets.

Fact and identification checks include:

- [Ontario: rainbow trout](https://www.ontario.ca/page/rainbow-trout)
- [Ontario: walleye](https://www.ontario.ca/page/walleye)
- [NOAA: Atlantic salmon](https://www.fisheries.noaa.gov/species/atlantic-salmon)
- [FWC: red drum](https://myfwc.com/wildlifehabitats/profiles/saltwater/drums/red-drum/)
- [FWC: Tampa Bay sport fish habitats](https://gis.myfwc.com/boating_guides/tampa_bay/pages/sport_fish.html)

The existing species catalogue and the source links in the archive retain the wider species context.
No new record-size or legal-limit claim was added.

## Current verification

The production build passes. All 2,671 static routes and all 92 unit tests pass.
All eleven game browser suites pass, including the two new realism checks.
The final four visual and touch suites passed again after the last UI change.
No browser page errors or shader errors occurred.

The phone results use Chromium 158.0.8127.18 on Apple M3 Pro / ANGLE Metal.
Both profiles use a cold cache, gzip, 1.6 Mbps download speed, and 150 ms network latency.
These are emulated phone profiles on the host GPU, not physical-phone measurements.

| Profile | CPU slowdown | Bank FPS | Fight FPS | Cast controls ready | 3D scene ready |
| --- | ---: | ---: | ---: | ---: | ---: |
| iPhone 13 | 4× | 60.0 | 60.0 | 1.84 s | 3.82 s |
| iPhone 13 | 6× | 60.2 | 59.1 | 1.86 s | 4.12 s |
| Pixel 7 | 4× | 60.2 | 59.5 | 1.83 s | 3.76 s |
| Pixel 7 | 6× | 59.2 | 60.0 | 1.86 s | 4.05 s |

The 4× runs exceed the 55 FPS average target for both bank and fight views.
The cast-ready measure means the controls accept a cast. The 2D scene remains available while the 3D scene loads.
It does not mean that the full 3D scene loads in less than 2.5 seconds.

The final bank samples use 57 draw calls and about 90,824 triangles per frame, including reflection work.
The first-load transfer is 537 KB. The measured JS heap is 16.4–19.9 MB.
The adaptive scale remains at 1.0. The 95th-percentile frame interval is 16.7–16.8 ms.

The six-water benchmark passes all 14 scene/view combinations at 4× CPU slowdown.
The lowest average is 59.3 FPS. The longest isolated frame is 83.3 ms.
These results establish an average-FPS target, not a minimum rate for every frame.

The first benchmark used the default headless shell and SwiftShader software rendering.
It failed the FPS target, with 24.3–31.4 bank FPS. Its report remains in `software-renderer/`.
The GPU-backed rerun uses full Chromium, as the previous pass did.

Reports:

- `test-results/game6-build.log`
- `test-results/game6-static.log`
- `test-results/game6-unit.log`
- `test-results/game6-browser.json`
- `test-results/game6-final-visual.json`
- `shots-game6/performance/mobile-performance.json`
- `shots-game6/performance/game-performance-4x.json`


## Current screenshot review

All review artifacts are under `/Users/oven/orca/workspaces/castward/jobs/shots-game6/`.

- `before/` and `after/`: the same six waters at 390 and 1440 px, plus the fight and catch card.
- `before-waters-review.jpg` and `after-waters-review.jpg`: contact sheets for the twelve matching water views.
- `after/fight-hud-390.png`: the phone fight instructions and tension control.
- `after/species-markings-1440.png`: the seven requested fish marking references.
- `checks/`: the full-view phone cast, fight, bow, net, release, landscape, settings, and career captures.
- `performance/`: final GPU-backed reports and device screenshots.
- `software-renderer/`: the initial SwiftShader result, retained separately.

The visual review found flat pine tips, faint trout markings, large triangular fins, and unused phone fight controls.
The pass corrected those points and repeated the captures.
The second review added irregular ice edges, corrected distant mangrove height, and softened the catch lights.
The result remains a procedural real-time scene. The review does not establish a human realism-rating score.

### Reproduce the current pass

```sh
VERCEL_ENV=production SITE_URL=https://castward.app python3 scripts/build_vercel.py
python3 tests/static_test.py
node --test tests/*.test.cjs

# Use full Chromium with the host GPU, rather than the software-only headless shell.
export PLAYWRIGHT_MODULE="$PWD/.cache/browser/node_modules/playwright"
export CHROMIUM_PATH="$(node -e 'console.log(require(process.env.PLAYWRIGHT_MODULE).chromium.executablePath())')"
export SCREENSHOT_DIR="/Users/oven/orca/workspaces/castward/jobs/shots-game6/recheck"
python3 -m http.server 8057 --bind 127.0.0.1 --directory dist
# In a second shell with the same environment:
node tests/game-polish-browser.cjs
node tests/game-realism-browser.cjs
node tests/game-realism-species-browser.cjs
node tests/game-mobile-input-browser.cjs
node tests/game-mobile-performance.cjs
node tests/game-performance.cjs
```

The standard browser suites use port 8057. The cold-load benchmark starts its own gzip server on port 8058.
The local `.cache/browser` install supplies Playwright. Any compatible local Playwright module can replace that path.

---

# Previous pass archive — game5

Work stayed in `jobs/game5/website`. No commit or deployment was made.

## Scope

The pass keeps the six 3D waters, world map, first bite, catch card, and career.
It concentrates on phone controls, varied fights, the collection loop, and lower rendering cost.

- Pull back and release to cast with one thumb. A forward flick still adds distance.
- Hold the large reel button. Slide across it to counter a fish run.
- Tap the same button during a jump to bow. Separate rod and bow controls remain available.
- The first cast still bites about 1.05 seconds after launch.
- A fish receives its size when hooked. That size affects its fight and becomes its catch record.
- Larger fish take longer to land. Tarpon and salmon run longer. Tuna pull harder and do not jump.
- Head shakes add short tension pulses. A brief red excursion can recover; sustained overload breaks the line.
- Each new cast varies the nearest fish. Rare and legendary fish have lower selection weights.
- The daily drift, tackle box, and full journal open in paused bottom sheets.
- The journal uses silhouettes for uncaught species and shows each recorded size.
- A new species gets its own catch message.
- A same-day flats slam tracks bonefish, permit, and tarpon. Its link opens the site's Florida Keys lingo section.
- The share image renders the 3D fish at export size, with its size and water name.
The extra render target exists only during export and is then disposed. Native sharing keeps its PNG fallback.
- A release control lets the fish swim away. Its record remains in the journal.
- Sound preference survives a reload. A user gesture resumes audio when the browser requires it.
- The first page puts the water before career details on a phone.

## Phone interface

Full view uses the viewport and safe-area insets. It also requests native fullscreen where the browser supports it.
The CSS view remains available on browsers without native fullscreen.
The fight hides extra water tabs. The reel stays near the bottom of the screen.
Landscape puts the controls beside the water.
Touch capture keeps the reel active when a finger moves. Touch cancellation releases it.
Game gestures suppress page scroll and zoom. Full view also stops overscroll.
Field controls, sliders, and phone map pins have targets of at least 48 px.

## Data path

| Producer | Stored or transformed data | Consumers |
| --- | --- | --- |
| Site career data | Existing destination and species IDs | Travel, local fish pools, real trip and licence links |
| `game-engine.js` | `specimen`, `weightAt`, `fightProfile` | `Water.hook`, fight duration, catch record |
| `Water.hook` | One specimen per hooked fish | Fight and final catch use the same length and weight |
| Catch event | Existing log, collection, career record | Journal, trophy, catch card, share image, export |
| Catch event | `slam: {date, ids}` | Same-day badge, validated restore, existing save export/import |
| Lure equipment | Existing canonical lure IDs | Attraction, sink speed, depth, tackle labels, 3D lure shape |
| UI sound toggle | `castward-sound` | Next visit, gesture-based audio start |
| Renderer timing | Actual animation-frame interval | Adaptive resolution and benchmark reports |

The log retains the version 2 storage key and export format.
Older saves receive an empty slam record. Restore filters unknown and duplicate species IDs.
All localStorage access uses try/catch. The storage-denied browser test still reaches the game.

There were two separate catch-size calculations before this pass: the fight had no size, and landing rolled a new size.
Now one specimen crosses that boundary. The existing career and journal keep their length records; personal best uses weight.

## Realism and sources

The game uses generated geometry and textures. Reference photos are not distributed with the site.

- The water samples a generated, repeating normal map. It retains Fresnel sky reflection, shore foam, depth tint, and distance haze.
- The sky keeps its sun position by time of day. The sun disc now has a smaller apparent size.
- Terrain uses smooth standard-material normals. Fine branch textures replace solid conifer cones.
- Fish use a physical material with a wet clear coat. The body retains a dark back and pale belly.
- Redfish have a tail spot. Largemouth bass and snook have lateral markings. Trout have irregular spots and an adipose fin.
- The rod blank bends with tension. The line keeps its catenary-style sag.
- Cast travel uses an air-drag easing curve and a parabolic vertical arc. Cast time remains compressed for play.
- Spoon, spinner, fly, and jig shapes use the selected tackle ID. Sink speed differs by lure.
- Local legal-size guidance links to the existing licence page. Generic waters do not invent a jurisdiction or slot limit.

The [TPWD bass length table](https://tpwd.texas.gov/fishboat/fish/recreational/catchrelease/bass_length_weight.phtml) supplies the largemouth length-weight conversion.
The game interpolates between whole-inch entries, converts pounds to kilograms, and adds a small condition variation.
For example, a 20-inch bass starts at 4.68 lb before that variation.
The largemouth range is 22–65 cm. The function clamps the published table at its endpoints.

Other species retain bounded cubic condition-factor estimates. These are representative game sizes, not certified records.
Their existing upper length limits also cap their weight estimates. They do not claim a scientific fit for each population.

Reference checks for the main fight profiles and visual detail:

- [Florida Museum: red drum](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/red-drum/) — body colour, tail spot, estuary habitat, and size context. The game cap of 85 cm stays below the reported 155 cm maximum.
- [Florida Museum: tarpon](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/tarpon/) — silver flanks, dark back, upturned mouth, food, and size context. The game cap is 180 cm, below the reported 250 cm scale.
- [NOAA: Atlantic salmon](https://www.fisheries.noaa.gov/species/atlantic-salmon) — body form, life history, and adult size context.
- [Ontario: rainbow trout](https://www.ontario.ca/page/rainbow-trout) — colour, identification, and representative weight range.
- [UC Davis trout photograph](https://aggiehero.ucdavis.edu/blog/spring-fed-rivers-cold-waters-and-trout) — observed profile, pink lateral band, olive back, and fin placement.
- [FWC: yellowfin tuna](https://myfwc.com/wildlifehabitats/profiles/saltwater/tuna/yellowfin-tuna/) — shape and elongated fin reference.
- `src/local-lingo.json`, Florida Keys — the existing same-day flats slam definition and its source links.

Fight duration and run timing are game tuning. They are not measured real fishing times.
The generic six waters remain representative environments. Career destinations continue to use the site's own species lists.

## Rendering cost

- The water grid fell from 72 × 72 to 40 × 40 subdivisions.
- Static fish fins and eye parts now share geometry batches by material.
- Phone bank views omit submerged fish that have no visible interaction.
- Instanced conifers use three textured bough planes. Distant terrain uses fewer subdivisions.
- Phone auto quality starts at no more than 1.25 DPR. Dynamic resolution can reduce this further.
- High-quality shadows and bloom remain desktop options. Phone auto quality avoids them.
- Hidden tabs stop the animation loop. Open menus pause it.
- Three.js still loads only on `/play/`. The shell and controls become usable before the renderer finishes.
- The journal delays art for hidden species until the full book opens.

## Verification and measured results

The production build and static route check pass. All 91 unit tests pass.
The game browser checks cover both the old controls and the new phone controls.
The new phone test uses real Playwright touch events through the full cast, fight, bow, net, and release sequence.
The same-day slam screenshot uses a labelled save fixture. Normal catch screenshots come from UI play.

### Cold-load phone comparison

These figures use Chromium 158.0.8127.18 on an Apple M3 Pro through ANGLE Metal.
Both runs use a cold cache, gzip, a 1.6 Mbps download limit, and 150 ms network latency.
This link is deliberately conservative. It is not a physical-phone measurement.
The iPhone 13 viewport is 390 × 844. The Pixel 7 uses Playwright's device profile.

| Device | CPU | Bank FPS before | Bank FPS after | Fight FPS after | First cast before / after |
| --- | ---: | ---: | ---: | ---: | ---: |
| iPhone 13 | 4× | 60.3 | 59.2 | 59.8 | 1.79 / 1.85 s |
| iPhone 13 | 6× | 59.2 | 58.9 | 59.5 | 1.86 / 1.84 s |
| Pixel 7 | 4× | 56.9 | 60.2 | 59.1 | 1.79 / 1.81 s |
| Pixel 7 | 6× | 60.2 | 59.2 | 59.8 | 1.95 / 1.84 s |

| Bank-view metric | Before | After |
| --- | ---: | ---: |
| Draw calls per frame | 103.0–111.0 | 47.0–47.0 |
| Triangles per frame | 83,087.0–83,477.0 | 48,612.0–48,612.0 |
| JS heap | 14.0–16.8 MB | 12.2–15.2 MB |
| First-load transfer | 524.0–524.0 KB | 531.0–531.0 KB |
| 3D renderer ready | 3.50–4.11 s | 3.56–3.74 s |

The cast controls become usable before the 3D renderer finishes.
The phone fight samples have a 95th-percentile frame interval of 16.7–16.8 ms.
The new resolution controller keeps full adaptive scale in these four samples.
It now uses sustained frame cost and waits three stable windows before a resolution increase.

The targets above describe average frame rate. Isolated long frames still occur in the longer six-water tests.
The tests therefore do not establish a hard minimum of 45 FPS for every frame, or certify a physical phone.

Reports:

- `/Users/oven/orca/workspaces/castward/jobs/shots-game5/baseline/mobile-performance.json`
- `/Users/oven/orca/workspaces/castward/jobs/shots-game5/performance/mobile-performance.json`
- `/Users/oven/orca/workspaces/castward/jobs/shots-game5/performance/game-performance-4x.json`
- `/Users/oven/orca/workspaces/castward/jobs/shots-game5/performance/game-performance-6x.json`

### Reproduce

```sh
VERCEL_ENV=production SITE_URL=https://castward.app python3 scripts/build_vercel.py
python3 tests/static_test.py
node --test tests/*.test.cjs
node tests/game-field-browser.cjs
node tests/game-mobile-input-browser.cjs
node tests/game-mobile-performance.cjs
node tests/game-performance.cjs
CPU_SLOWDOWN=6 node tests/game-performance.cjs
```

Browser tests accept `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `TEST_ORIGIN`, and `SCREENSHOT_DIR`.
The performance helper serves a gzip build on port 8058. Other game tests use port 8057 by default.
The browser connector lacked its configured Chrome app, so local Playwright used the installed test Chromium.

### Screenshots

The screenshot root is `/Users/oven/orca/workspaces/castward/jobs/shots-game5/`.

- `before/`: the unmodified game's map, water, fight, jump, and catch views.
- `after/`: desktop 1440 and phone 390 journal, tackle, daily drift, fight, new species, catch, share PNG, release, and slam badge.
- `mobile-input/`: complete one-thumb fights on iPhone 13 and Pixel 7, plus landscape views.
- `checks/game-polish-browser/`: final views with the same water, time of day, and viewport widths as the baseline.
- `performance/`: device screenshots and machine-readable measurements.

For a direct comparison, use `before/river-golden-hour-390.png` and `checks/game-polish-browser/river-golden-hour-390.png`.
The equivalent 1440 px pair and the other five waters use the same names.

The image review reduced the sun disc, replaced conifer cones, improved tackle contrast, and enlarged daily text.
It also removed the circular-reel overlay from the phone and reduced the fight HUD.

### Browser check results

All nine game browser suites pass:

- `game-settings-browser.cjs`
- `game-career-browser.cjs`
- `game-gestures-browser.cjs`
- `game-polish-browser.cjs`
- `game-visual-browser.cjs`
- `atlas-game-browser.cjs`
- `play-lingo-browser.cjs`
- `game-field-browser.cjs`
- `game-mobile-input-browser.cjs`

The six-water benchmark passes all 14 scene/view combinations at each slowdown.
The lowest scene average is 57.6 FPS at 4× and 55.3 FPS at 6×.
The largest 95th-percentile frame interval is 16.8 ms. The longest isolated interval is about 150 ms.

The wider browser audit also passed discovery states, discovery details, discovery pages, species/glossary, preview images, and rich guides.
The guide feedback check passed all 66 guide/viewport cases after a stable-build retry.
Its first image check overlapped a build; the retry found no broken guide images.

Four wider site checks still fail. They do not exercise changed game code:

| Test | Failure |
| --- | --- |
| `conditions-chat-browser.cjs` | Its mock matches `/api/chat`; the current client requests `/api/chat/`. The completion wait times out. |
| `atlas-browser.cjs` | The test seeks the old `[name="water"]` selector on the current atlas page. |
| `trip-types-browser.cjs` | The guide inquiry does not contain the expected `Lowcountry Inshore Grand Slam` text. |
| `guides-browser.cjs` | Its initial `window.AtlasEngine` readiness wait times out. |

The audit records are in `test-results/browser-game5.json`, `test-results/new-browser-game5.json`, and `test-results/other-browser-game5.json`.
The corresponding `.log` files contain the exact errors.

### Remaining limits

The longer play goal is a design target, not a measured retention result.
The controls and progression support repeat casts, but these automated journeys do not establish 15-minute human retention.
Species size estimates, compressed fight timing, and simplified habitats remain game approximations.
Only the largemouth length-weight curve received a published table fit in this pass.
