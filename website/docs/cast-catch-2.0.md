# Cast & Catch 2.0 — Game 4 polish

This work stays in the `jobs/game4/website` workspace. No deployment was made.

## Map

- The page now uses Natural Earth land from `world-atlas@2.0.2`.
- An Equal Earth SVG replaces the eight rough continent polygons.
- The map has a subtle graticule, coast glow, and Castward colours.
- The Python build inlines the local SVG. The browser needs no map library or map request.
- A local generator uses exact jsDelivr versions: `topojson-client@3.1.0`, `d3-geo@3.1.1`, and `d3-array@3.2.4`.
- The source URLs and refresh command are in `src/maps/README.md`. The vendor files retain their licences.
- `scripts/game_career.py` projects each stop with the same coefficients, scale, and translation as the SVG.
- The browser separates pins in screen pixels. Leader lines retain the true geographic anchors.
- Destination names appear on hover and focus. Grey pins show the required level.
- On a narrow map, a tap on a region opens its destinations. A control returns to the whole world.
- The destination selector works at every width. All 25 real trips retain their source identity and licence data.

## Visuals

- The water has shore foam, small wind ripples, shallow-water colour, sun sparkle, and scene reflections.
- Each water uses a different wave strength. Offshore water has deeper terrain and distant islands.
- Golden light has a warmer sky, a sun halo, haze, and faint clouds.
- The terrain has varied rocks, grass tufts, reeds, layered trees, docks, mangrove roots, and ice shacks.
- Repeated plants and rocks use instanced geometry.
- The resolution controller uses actual frame time and starts to reduce resolution below about 57 FPS.
- The tutorial updates text only when it changes. Its progress display updates at most four times per second.
- The angler has separate limbs, boots, a vest, and a cast animation.
- Fish have curved bodies, animated tails, fins, gills, eyes, scales, and species patterns.
- Splashes use round droplets and expanding surface rings.
- The underwater camera has its own haze. It excludes the sky to remove a bright horizon gap.
- All quality levels use ACES tone mapping and a soft contact shadow. High quality adds soft sun shadows and subtle bloom.
- The catch card uses the same 3D fish model as the game. The existing renderer draws the preview; it needs no second WebGL context.
- Reduced motion stops the preview rotation and reward motion. The 2D fallback retains the full game.

## First catch and interface

- The first free cast gets a bite about 1.05 seconds after launch, without lure input.
- Its hook window lasts 3.2 seconds. The first fight has faster progress. Later casts retain their normal rules.
- `CastwardCareer.firstCast()` consumes the aid once. `firstCastUsed` persists in the version 2 career save and export.
- The page passes this state to `Water.cast()`. Both renderers use the same simulation.
- Old careers with a landed fish skip the aid. An import validates the new field.
- A landed fish shows a celebration, coin and XP motion, and a rotating 3D catch card.
- `CastwardCareer.nextGoal()` supplies the next objective to the sidebar and catch card.
- The catch card can open the map or start the next cast.
- Controls, type, focus states, and reward colours now share one style.
- The phone layout keeps the angler in view. The reduced-motion checkbox keeps its full width.
- A trophy mount hides the catch celebration so the fish remains clear.

## Data paths

| Source | Build or rule | Consumer |
| --- | --- | --- |
| Natural Earth TopoJSON | `scripts/generate_game_map.cjs` | Local SVG and projection metadata |
| `STOPS`, `world.json`, `licenses.json` | `scripts/game_career.py` | Page `career-data`, projected pins, travel and licence cards |
| Local SVG | `scripts/fishing_game.py` | Inline map template |
| Career save | `restore()` and `firstCast()` | `Water.cast()` and the first-bite simulation |
| Catch event | Career rewards, records, and `nextGoal()` | Save, reward motion, catch card, next objective |
| Shared species | `fishModel()` | Water scene, catch preview, trophy mount |
| Actual animation-frame interval | `game.js` passes transient `frameSeconds` | 3D resolution control; the simulation keeps its own time cap |

## Verification

The production build passed:

```sh
VERCEL_ENV=production SITE_URL=https://castward.app python3 scripts/build_vercel.py
```

The checks passed:

```sh
python3 tests/static_test.py
node --test tests/*.test.cjs
node tests/game-gestures-browser.cjs
node tests/game-settings-browser.cjs
node tests/game-career-browser.cjs
node tests/game-visual-browser.cjs
node tests/game-polish-browser.cjs
node tests/atlas-game-browser.cjs
node tests/play-lingo-browser.cjs
```

- Static checks: 2,671 routes.
- Unit tests: 86 passed.
- The browser checks cover mouse, touch, keyboard, outward-facing fish geometry, first-cast timing, separate map pins, region zoom, catch rewards, saves, gear, travel, trophies, PNG downloads, native share, reduced motion, and both 2D fallback paths.
- The older missed-bite checks now allow the first cast's longer hook window. Later casts still use the shorter window.
- The PNG check disables native share in its test fixture. A separate check enables and verifies native share.
- The new screenshot test uses 1440 px desktop and 390 px phone viewports. Existing checks also cover 360 px.
- The MCP browser could not start because its configured Chrome app was absent. Local Playwright 1.58.2 used Chromium 145 with the native Apple Metal renderer.

## Screenshots

The final images are in `/Users/oven/orca/workspaces/castward/jobs/shots-game4/polish/`.

For each width (`1440` and `390`), the set includes:

- `map-{width}.png`
- `{river,lake,ice,flats,offshore,reef}-golden-hour-{width}.png`
- `chase-{width}.png`
- `jump-{width}.png`
- `celebration-{width}.png`
- `catch-card-{width}.png`

`map-region-390.png` shows the phone region view. The sibling browser-test folders contain cast frames, the tropical river, trophy mounts, save exports, and other checks.

The images were inspected. The review corrected map numbers, focus labels, catch-card contrast, fish fins, shack roofs, phone framing, the underwater horizon, the trophy overlay, and inward-facing fish and left-bank surfaces.

## Performance

`node tests/game-performance.cjs` passed with auto quality and a 4× CPU slowdown.

| Scene | 390 px average FPS | 1440 px average FPS |
| --- | ---: | ---: |
| river | 120 | 116.8 |
| lake | 120 | 120 |
| ice | 117.5 | 117.5 |
| flats | 118.2 | 120 |
| offshore | 120 | 120 |
| reef | 120 | 120 |
| river-first-cast | 118.7 | 119.6 |

All 14 samples exceeded 55 FPS on average. The lowest average was 116.8 FPS. The lowest steady result was 114.3 FPS.

The largest 95th-percentile frame interval was 9.3 ms. The largest 95th-percentile draw time was 5.4 ms.

The first-cast timing samples included the bank and underwater cameras. The separate gesture and screenshot checks cover the jump and catch. The renderer retained full adaptive scale in the final run. The test now requires 55 FPS; the earlier test required 50 FPS.

The test used Chromium 145.0.7632.6 and an Apple M3 Pro GPU through Metal. This result does not certify a physical phone's frame rate.

An earlier full run reached a minimum average of 55.6 FPS. The final pass removed repeated tutorial text writes and gave the resolution controller actual frame time. The table above records the final source.

The complete timing results are in `/Users/oven/orca/workspaces/castward/jobs/shots-game4/game-performance.json`. They include frame and draw-time percentiles, long frames, the GPU, and the browser version.

## Main source changes

- `public/assets/game-3d.js`: water, terrain, fish, angler, particles, cameras, shadows, bloom, and the catch preview.
- `public/assets/game-action.js`: the one-use first-cast bite and fight aid.
- `public/assets/game-career.js`: first-cast persistence and next-goal rules.
- `public/assets/game-expedition.js`: the map, pin layout, region zoom, and goal display.
- `public/assets/game.js`: the catch celebration and preview bridge.
- `public/assets/game.css`: the map, controls, catch card, focus states, and phone fixes.
- `scripts/game_career.py`: shared map projection for the real destinations.
- `scripts/fishing_game.py`: inline map, celebration, catch card, and goal markup.
- `scripts/generate_game_map.cjs`, `scripts/vendor/`, and `src/maps/`: the offline map sources and generator.
- The game unit and browser tests cover the changed rules and interface.

## Follow-up

The phone controls, fight changes, sources, and new measurements are in [Cast & Catch 3.0](cast-catch-3.0.md).
