# Beaufort — Dolphins & Lightweight Realism 5

A separate static preview built on Wildlife & Views 4. Existing public links,
boat identity, finite Beaufort region, music, cameras and same-region recovery
are retained. This is not a newly browser/device-validated release.

## Finding the dolphins

Open **Menu → Explore & play → Look at dolphins · idle boat / Neutral**.
The same action is available in **View & graphics**. It enables wildlife, finds
an actual member of the existing pod, and switches to a close following camera.
There is no decorative dolphin picture standing in for an animal.

The action requests idle power and Neutral. Above about three knots, it leaves
the boat camera in place and asks you to coast down, then tap again. At low speed
it enters the dolphin view; the boat remains subject to inertia/current and may
drift. Pause remains available. **Back to boat**, Escape or V exits the wildlife
view. Engine/gear/steering/fittings cannot be operated through that camera.
This is a simulation interaction, not advice for approaching real wildlife.

The prior pod started 75–174 m away and spent most of its cycle below the surface.
The new encounters begin 38–80 m away where known depth and pier exclusions permit.
At least one starts surfaced, with staggered breathing relative to the encounter's
birth rather than arbitrary page uptime. The actual Beaufort launch test placed
three animals 38, 46 and 54 m away. A distant out-of-range pod can be recycled;
there are still at most three models, and an actively watched pod is not recycled.
No valid nearby habitat means an explicit unavailable message, not invented depth.

This remains a bounded, authored wildlife encounter, not a whole-region population
or verified biological model. The original skinned meshes remain. A conservative
animation bound enables offscreen culling; tiny eye/mouth detail is hidden when far
from the camera, and shadows are reserved for nearby Detailed-mode viewing.

## Better boat–water interaction with less sampling

The six buoyancy supports now use the analytic time/spatial derivative of the
existing water field, including the encounter velocity caused by translation and
yaw. Previously each support sampled current and previous water separately.
The wave shape, eight ambient terms, wake envelope, propulsion coefficients,
mass parameters and simulation clock are not replaced. This is a more accurate
and cheaper derivative of this model, not sea-trial calibration or a full fluid
solver. Height-only queries skip unused derivatives, including zero-amplitude work.

An executed native-step probe reduces full ambient derivative evaluations from
16 to 6 (including other height-only queries). Calm-water terminal speed matches
the prior result to numerical tolerance; all four power configuration trials
remain unchanged. Swell steering/reversal and retained contact tests pass.

## Water and scenery, without new downloads or meshes

Propeller wash now follows engine state, clutch, immersion and load. A bounded
stern jet becomes visible in gear; neutral/coasting does not retain full powered
white wash. It is drawn inside the existing water shader, with no new particles
or draw call. The hull wave geometry stays unchanged.

Planar reflections fade at capture edges, reducing the hard reflection rectangle.
Capture scheduling is regular and bounded: at most around eight updates per second
while moving, roughly three while stationary, and one per second when unchanged
and paused (so streamed scenery can still appear). Performance mode retains its
existing no-planar-reflection path. There is no new reflection pass or target.

Existing marsh, hanging moss and foliage get restrained, phase-varied wind bending
using the same weather/time. Bounds are expanded conservatively for the motion.
Existing land/bank/seawall materials get a subtle damp tide-edge band. No coastline,
bathymetry, dock geometry or building footprint is changed, and no texture or
model asset is downloaded. These are shader-source tested, not visually verified.

## Lightweight safeguards

- Same three dolphin meshes, no new texture/model/library dependencies.
- Zero added scene draw calls or render targets; culling can reduce work.
- Wildlife path/depth checks are scheduled near 10 Hz rather than every frame.
- Immutable nearby-collider candidate IDs are cached in at most 32 cells; actual
  tide/height filtering still runs on every query, and reinstallation invalidates
  the cache. All 2,921 original obstacles remain independently resident.
- No new render loop, simulation timer, screen overlay or color theme. Existing
  navy/teal controls and source-switch/music behavior remain.

Local CPU microbenchmarks (not FPS) measured about 1.45x throughput for water-height
queries and 1.96x for repeated nearby-collider queries in the initial run. Ratios
vary with machine/JIT/load. The exact repeated samples are in benchmark.json;
there is no claimed phone/GPU or end-to-end frame-rate improvement.

## Evidence and limits

107 CPU/receiving checks pass: 23 new derivative/wildlife/actual-Geography/camera-
projection/render-hook cases; 13 native bootstrap/synthetic-DOM cases (9 retained,
4 new); 25 retained Harbor4 assertions with replacement dependencies; 15 native
physics, 19 streaming/asset, 5 real Three CPU scene and 7 radio/media-fixture cases.
Four modeled power trials also pass. Existing assertion bodies are not removed.
The native water beforeRender callback is executed with a renderer boundary stub;
this verifies uniforms/scheduling/state restoration, not GPU compilation.

The close dolphin camera projects an above-water dorsal silhouette about 51–52
pixels tall in the checked portrait/desktop setups. This is Three.js projection,
NOT proof of correct depth-buffer/water blending in a rendered browser. One minute
of actual Beaufort-data movement retains known-water/pier clearance in the tests.

Initial test-fixture missing AbortController and strict decimal comparisons were
corrected. Depth is explicitly clamped to its intended minimum. A code inspection
also caught a mutable timestamp placed in a const declaration; the new actual
render-hook test prevents that regression. An inherited baseline comparison was
updated to load the new dependency only on the candidate. Earlier failures are
retained in the conversation evidence package; no expected assertion was dropped.

Browser startup, visual quality, GPU shader compilation, trusted touch, music
playback, physical-device/Safari and frame rate are NOT verified. The prior
administrator navigation restriction was not bypassed via another tool or runner.
The existing repository job performs CPU checks/build/static publication only.

## Reproduce

Use the exact Wildlife4 site at 2c2e75a441b5660d40eb5327b3a72f92acbd4ef2 as BASE,
its source folder as BASE_SOURCE, and the unchanged atlas_easy_helm folder as EASY.
Python3 and Node22; no new dependencies or credentials.

    python build.py --base "$BASE" --out /new/site
    python check.py --site /new/site --base "$BASE" --base-source "$BASE_SOURCE" --easy "$EASY" --out /new/checks
    node benchmark.cjs /new/site "$BASE" > /new/checks/benchmark.json
    python3 -m http.server 8080 --directory /new/site

Background references for modeling separation and the retained renderer APIs:
https://www.fossen.biz/html/marineCraftModel.html
https://threejs.org/docs/pages/Material.html
https://threejs.org/docs/pages/MeshStandardMaterial.html

Only this branch's candidate, source/realism5 and existing CPU/static workflow
change. CORE, HUMANS, yacht/SUMARS and multiplayer work remain untouched.
