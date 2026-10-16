# ATLAS Sea Lab 12 — Captain & Coastal Water

A solo, functional boat-model testbed. This is not an engineering-validated vessel, training device, surveyed navigation instrument or fluid solver.

## Start and drive

Turn the ignition key, choose **Forward**, then use **+ / −** or **Full power**. Full power deliberately switches off the optional docking-power limiter; it does not start the engine or select a gear for you. **Left / Straight / Right** controls steering, and the keyboard remains available: E ignition, F/N/R gears, W/S power, A/D steering, M map.

**Map stays live** and leaves the driving controls reachable. It no longer participates in the optional pause-while-reading behavior. Other menus can still pause according to your preference, and a deliberately paused trip is not silently resumed.

**More → See the captain** selects a dedicated close-up. A generic, life-jacketed captain sits at the steering station in exterior views. Jointed arms track the wheel and reach for the throttle during power changes. The same figure supports the optional overboard effect. The avatar is hidden in the driver's eye view to avoid obstructing the camera. This is a procedurally modeled person, not a scan or full-body physical ragdoll.

## Water, buoyancy and shoreline contact

Eight directional components use the gravity-wave dispersion relation at a fixed 8 m reference depth, with restrained higher harmonics for sharper crests. CPU height/slope queries and GPU surface geometry come from the same definition. Six buoyancy supports replace four while preserving total static support. The fixed reference depth is an approximation: local depth-dependent wave refraction and shoaling are not solved.

Twelve reusable wake wavelets retain their world-space emission positions and propagate and dissipate in simulation time. They displace the rendered surface and contribute to queried wave height. Wake-track foam, stern wash, surface microdetail and crest/shore foam improve the visible motion; the original bounded spray/foam pools remain. Foam is a visual approximation rather than a transported fluid variable.

High-detail mode adds a clipped, reduced-resolution planar reflection of the scene at mean water level. It costs another render pass at a lower cadence; it is not ray tracing or per-wave refraction. Balanced mode remains available for slower devices. The chase camera now looks farther ahead so the shoreline is not hidden behind the upper controls.

Land contact sweeps a hull footprint along the actual travel path, removes motion into the bank and preserves tangential motion, instead of uniformly multiplying both velocity axes by 0.15. Existing bottom/propeller contact and reverse back-off remain. Mapped bridge piers have matching simple collision boxes. These contacts are still gameplay approximations, not detailed hull fracture, soil mechanics or propeller-damage calculations.

## WOT acceleration

The arbitrary 0.74 forward-force multiplier is removed. Horsepower-limited thrust, mass, inertia, prop immersion, drag and reverse behavior remain, and the separate reference profile is not retuned.

In matched deterministic calm-water runs with the single 300 setup, revision 11 reached 30 mph in **7.95 seconds**; revision 12 in **6.067 seconds**. Terminal speeds were approximately **43.763 and 43.765 knots**. Both tests start with a warm idling engine, then Forward and 100% power. These are model outputs, not measured Atlas performance. They do not establish that the simulated acceleration matches a real boat.

The checked-in baseline and per-release unit results preserve the comparison rather than turning a simulation result into a manufacturer claim.

## Real Beaufort and Geo Map

**More → Cruise Beaufort** selects the actual geographic dataset. **More → Woods bridge approach** places the vessel at an illustrative approach point for viewing the mapped bridge. Both scene changes leave the vessel paused until ignition or Resume.

**Map → Geo Map** restores geographic navigation using bundled NOAA shoreline and OpenStreetMap roads, building footprints and bridge centrelines. The vessel marker follows the same simulated geographic coordinates. Included vectors work without external map tiles. **Load street basemap** optionally loads OpenStreetMap tiles on demand; provider availability and attribution still apply.

The snapshot contains **23 mapped bridge segments, 514 downtown building footprints and 79 road ways**. Segments are not unique bridges. The Woods Memorial Bridge approaches and swing span are identified from OSM tags. Building heights come from height/levels tags where available, otherwise a 6 m illustrative default. Bridge deck heights, support spacing and detailed shapes are approximate; the 7 m modeled decks are NOT published bridge clearances. Shoreline elevations and trees are not scanned. This is geographically registered vector scenery, not photorealistic scanned Beaufort.

Chart depths remain sparse, interpolated estimates. Unknown coverage retains NO DATA. Nothing in this build should be used for navigation.

Data © OpenStreetMap contributors, ODbL 1.0. Source metadata, retrieval time and hashes accompany `assets/beaufort_features12.json` and `assets/sources.json`. Copyright: https://www.openstreetmap.org/copyright. The bundled Leaflet version is 1.9.4 and includes its license. No satellite imagery has been scraped.

## Music

**Music → paste a YouTube video or playlist link** opens the official visible player; press Play there. **Open saved YouTube** reopens the last link saved in this browser. Provider errors, ads or sign-in requirements are not bypassed. Closing the player stops it; hiding the page pauses it. There is no hidden audio extraction, background player or stream rebroadcast.

Spotify selection URLs open externally. No Spotify account is linked: its published developer policy prohibits games and overlapping/mixing its protected content with other audio. Policy: https://developer.spotify.com/policy. YouTube integration reference: https://developers.google.com/youtube/iframe_api_reference.

Local files and bundled original instrumental music still use the positional boat-speaker path. The app does not automatically import private playlists, connect accounts, access your clipboard without a paste action or start audible music without interaction.

## A working testbed for future boat models

**More → Model test log → Start recording** captures the actual configuration, weather, speed, acceleration, engine state, depth and pose. Stop and Export JSON to compare revisions. Sampling is at most five times per simulated second, capped at 1,500 records; a slow renderer can yield fewer samples. It does not manufacture a passing result or run the boat for you.

`model-contract12.json` specifies units, axes, the working pivot names and separation between the render hull, collision hull, dry-cockpit mask, buoyancy points, physical mass/draft inputs and camera/captain anchors. It is not an arbitrary-file importer.

`validate_model12.py` provides an executable preflight check:

```sh
python3 validate_model12.py site/assets/ATLAS_Bay_Play.glb --contract model-contract12.json --out model-audit.json
```

The audit checks GLB structure and bounds, required unique working pivots, node references, finite transforms and vertex positions. It deliberately does NOT certify watertightness, appearance, hydrodynamics or real-world seaworthiness. Rendered and physics regressions are still required after it passes.

Recommended development batches: hull geometry and materials; mounting/pivots and interaction; propulsion/mass benchmarks; waterline/grounding; camera/mobile controls; then exact-public-URL verification. Preserve a previous working version and compare fixed camera views, measurements and errors after each batch. Spend additional compute on reproducible comparisons, not simply on more objects and effects.

Scanned Beaufort, animated bridge operation, full flooding/fracture, accurate propeller hydrodynamics, multiplayer, accounts and a general GLB importer are not implemented. A local depth-aware water solver would be a separate measured subsystem, not just a higher wave-strength setting.

## Verification and local launch

`test12.js` checks dispersion, derivatives, bounded waves/wakes, contact-normal behavior, acceleration/top speed, reverse inertia, buoyancy stability, grounding/back-off and sourced map availability. `verify12.py` exercises real rendered controls, the captain, non-pausing map, scenery, water/wakes/reflections, audio and logging. Final public checks use the actual immutable viewer URL, with no substituted local assets. Consult the release's reports for outcomes.

Phone-sized Chromium is not physical iPhone/Safari certification or a smooth-frame-rate guarantee. A provider frame is not proof that every YouTube video plays. Acoustic and engineering calibration are not claimed.

Run a portable release with `python3 -m http.server 8080 --directory site`, then open `http://localhost:8080/`. The site must be served over HTTP rather than opened with file://.
