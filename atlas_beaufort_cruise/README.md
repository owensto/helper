# ATLAS · Beaufort Cruise — first integrated streaming preview

This is a new, separate **online review candidate**, not the validated Sea13 release.
It combines the exact Waterfront14 R3 candidate with the music/trim/shared-wake
slice, plus a new lossless scenery streaming layer and sightseeing objectives.
It is a finite prepared Beaufort region, not an infinite generated planet.

## Play

Turn the key, select Forward, then add power. Left/Right steer; release to center.
Trim Down/Up stays on the helm. The known Waterfront14 practice-menu visibility
issue is corrected in this copy. More offers **Start Beaufort cruise**, existing
harbor practice, scenic views, boat fittings and a confirmed return to launch.
The three sightseeing stops are the marina waterfront, Waterfront Park and the
Woods Bridge approach. Reach each area below three knots and choose Next stop.
These are bearing objectives, NOT depth-checked safe routes or real navigation.
Nothing starts, steers, powers or teleports the boat on your behalf.

Music contains **Zach Bryan Favorites** and **Country Cruise**, each with six
linked songs. Load a queue, use the official YouTube Play control, then choose
Drive with music. Its video stays visible while you drive. Provider ads, sign-in,
embedding restrictions and availability still apply. No protected recording or
lyrics are bundled. Ordinary local audio files and included original tracks
support Computer Speakers (direct mix) and Boat Speakers (positional filtering
and pan). These are virtual mix modes, not physical-device selection. Music has
its own pause control; the radio defaults to continuing when the boat is paused.
Spotify stays external. No background-tab YouTube extraction is implemented.

Weather presets and tide levels remain available. Tide follows scenario targets,
not current real-world forecasts. Detailed graphics increases visual work only;
the map, depths and solid-obstacle set are independent of scenic detail residency.

## Scenery that loads ahead

The source scene's 404 quantized geometry chunks are partitioned LOSSLESSLY into
one foundational geography/structural layer and **64 detail cells**. Every vertex,
normal and color byte is retained. The foundation keeps regional land, banks,
roads, bridges, pier structure and floating docks available as detail streams.

The scheduler looks up to 12 seconds / 420 meters ahead, with a 900-meter detail
radius (1200 in Detailed mode), at most two requests, 24 resident detail cells,
and a 10 MiB combined staged/resident detail budget. Fine detail outside this
budget is selected deterministically by proximity; it is not guaranteed that all
nearby decorative objects are resident. Native frustum culling still applies.
Each gzip/raw cell is integrity checked. Returning to a cell restores the same
prepared geometry. Failed requests have bounded retries; More offers an explicit
Retry missing scenery action. This is not new AI generation or a full object-
persistence system. Decorations are prepared content assembled while driving.

All **2,921 original collision shapes** are registered separately before scenery
loads and remain registered when visual meshes unload. Original depth, source
terrain, tide/datum treatment and unknown-depth semantics are retained. Render
quality does not change the collision world. Dynamic shared-world edits,
networked state and infinite-world origin rebasing are not implemented.

The received Waterfront14 content includes **19 mapped piers**, 514 building
footprints, 23 bridge segments, terrain, banks, facade/roof details and vegetation.
Those counts are retained from the existing owner's source, not new surveyed
features created by this pass. Architecture and vegetation detail are illustrative,
not photogrammetry. Land elevation/datum conversion remains approximate.
Original source/licensing/acquisition metadata stays in assets/ and license files.
The city references existing and proposed marina work separately:
https://www.cityofbeaufort.org/574/Marina-Day-Dock

## Physics included

The received Waterfront14 dynamics add gradual signed clutch engagement, idle
thrust, added-mass coefficients, damped six-sample wave response, pitch-dependent
propeller immersion, angular-stop handling, and height-filtered dock collisions.
The new copy retains those coefficients and the original Bay hull/model. The
shared wake correction fades wakes into and out of the water field used by both
rendering and buoyancy. The shallow optical path accounts for refraction while
retaining grazing-angle reflection. These are simulation approximations, not
validated sea-trial or structural results. No new captain/HUMANS/MP was adopted.

## Actual checks, and what has NOT been checked

Run check.py to execute:
- 19 new stream/asset/trip-policy cases, including real-cell IO/cache traversal.
- 5 cases using actual bundled Three.js CPU geometry and the new scene adapter.
- 15 retained Waterfront14 assertions with the shared wake hook loaded.
- 7 existing exact-radio cases with synthetic media/WebAudio nodes.

**46 checks passed locally.** These are NOT browser rendering, GPU shader,
trusted-touch, real music playback, screen-reader, mobile-Safari or frame-rate
certification. The earlier administrator browser-navigation restriction is
respected; no browser or alternate browser runner is launched by the build job.
The older owner R3 desktop screenshot is not a new screenshot of this build.

Local measured simulation: roughly 6.43 seconds to 30 mph and 43.76 kn terminal
speed in the retained test scenario. These are modeled, not real-vessel numbers.
The cache probe traversed real prepared cells at five synthetic locations and
returned to origin; it was not a navigation or rendered-driving test.

## Reproduce

Requires Python 3 and Node 22+. No dependency install, keys or new service required.
BASE14 is the exact extracted desktop artifact from run39006587019/artifact12091362853
(source b5abae9ac7715d30533e4134ec45b8a092d6eb44). EASY4 is atlas_easy_helm at
97587a642829bc99bb4d408669b92cc3df1463e9. Both are hash pinned by build.py.

    BASE14=/path/to/base14 EASY4=/path/to/atlas_easy_helm CRUISE_OUT=/new/site python build.py
    BASE14=/path/to/base14 EASY4=/path/to/atlas_easy_helm CRUISE_OUT=/new/site python check.py
    python -m http.server 8080 --directory /new/site

The build refuses to overwrite inputs or an existing output. It changes only the
copied index, coastline loader, practice-menu synchronization and stale browser-
validation metadata, plus new files. Original owner branches/URLs stay untouched.
Only new atlas_beaufort_cruise/** and a branch-scoped publication workflow are
added. Readable source is stored directly in the repository; no encoded source
bundle is executed. An incomplete staging upload was rejected and removed before
publication, without rewriting history.
