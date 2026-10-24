# Beaufort Clean Helm 2 — device and driving usability pass

This is a separate static review revision of Beaufort Cruise, not a certified
phone release. It preserves the existing mapped waterfront, 64 scenery cells,
boat model, wave/depth/force model and country-music sources. Only the copied
Beaufort Cruise site is updated; older pinned URLs remain unchanged.

## What to try

The default screen has speed and bottom clearance, Pause and one Menu at the top.
Two compact driving surfaces provide proportional steering and power. Ignition,
Forward/Neutral/Reverse and Trim sit together. Trim opens only when requested.
Map, Music, Weather, boat fittings, scenic views and other options live in Menu.
Opening a tool hides the driving surface rather than stacking both panels.
Actual browser/touch/layout behavior has not been verified in this environment.

Steering is a continuous left/right target with finer sensitivity near center.
Release centers it through the native rudder actuator. Pointer capture keeps a
held turn coherent when the finger leaves the pad. Pointer cancellation, lost
capture, window blur, Pause, tool use and disposal release the steering target.
Power stays where you set it, like a throttle lever; Idle removes power, not
momentum. Existing native engine, gear and trim handlers are retained.

Keyboard shortcuts remain: E ignition, F/N/R gear, W/S power, A/D steering,
Q/Z trim, P Pause and M map. The steering pad also supports arrow keys and Home.

## Why the boat might feel too slow

Docking assistance in the previous build can persist a **22% power limit**.
That is suitable for maneuvering but prevents full-power operation. The power
label now explicitly says docking, and its range reflects the limit. **Full**
intentionally turns that limiter off and requests full power; it never starts
the engine, changes the gear or resumes the boat by itself. Use with care in
this simulator; it is not guidance for operating a real vessel.

**Menu → Engine setup** exposes the existing Single 300, Single 450 and Twin 300
modeled configurations. Switch off, select Neutral, set idle and slow below
roughly one knot before changing the rig. The change preserves the position,
trip, weather, timeline and other state. Rejected/failed rebuilds restore the
previous config. Default horsepower and hydrodynamic coefficients are unchanged.
A simulated larger rig is not a claim that the real boat is rated for that rig.

The executed 90-second calm-basin model trials produced:

| Setup | Power | Modeled speed | Modeled mph |
|---|---:|---:|---:|
| Single 300, docking limit | 22% | 7.05 kn | 8.11 |
| Single 300 | 100% | 43.77 kn | 50.37 |
| Single 450 | 100% | 49.84 kn | 57.36 |
| Twin 300 | 100% | 54.08 kn | 62.23 |

These are model outputs, NOT sea trials, observed device speeds or a newly
validated maximum hull speed. Reversal preserves inertia in every trial.
There is no speed multiplier or shortened simulation timestep.

## Less unnecessary work while controlling the boat

Continuous steering/power/trim intents no longer force an immediate whole-view
refresh on every input event. The normal update loop continues to operate them.
An exact production-dispatch probe of 1,800 such events produced 1,800 forced
refreshes before and zero after, with identical final input targets. Gear and
other discrete actions still request their original refresh.

A successful model-node lookup is cached against the current model identity;
actual pivots remain live and changing the model clears the cache. One probe of
500 reads performs one traversal, then a model replacement triggers a fresh one.
Pause and panel-state reads no longer require a full boat/depth/audio inspection.
Instrument texture refresh remains about 5.6 Hz at the helm/console, and drops
to 2 Hz away from those close-up views. Physics update rate is unchanged.

Menu → Graphics provides Auto, Performance and Detailed. Performance really
reduces pixel resolution (0.75 pixel ratio, versus Auto's initial maximum 1.0),
while keeping the same depth/collision/physics. Auto reacts earlier to slower
frames. A 0.75-by-0.75 drawing surface has 56.25% of the pixels; that is algebra,
not measured GPU acceleration or a promise of a particular frame rate.

The default scene is uncluttered. Local music gets only a small now-playing strip
when active; speaker and pause-policy settings are inside Music. Country YouTube
queues still require their visible official video player. This update neither
hides protected video nor changes provider playback permissions. Your own files
retain direct Computer Speakers and positional Boat Speakers modes. No autoplay,
new audio acquisition, OS device selection or locked-phone playback promise.

## Verification

69 unique CPU checks passed: 23 new device/input/menu checks, 15 original native
physics assertions, 19 stream/asset/trip checks, 5 actual bundled Three.js CPU
geometry checks and 7 native-radio checks using media/WebAudio fixtures.
Four additional calm-basin model trials record the power/rig figures above.
Source syntax checks passed. CSS parsing passed locally; it is not a visual test.
272 previous site files remain byte-identical. The five changed owner copies are
app.js, helm09.js, access11.js, experience14.js and index.html. No mesh, water,
depth, scenery collider, core force coefficient or simulation-clock file changes.

Initial synthetic fixture failures are retained in the conversation evidence:
its class-list fixture lacked add(), and one cross-VM array comparison needed
plain-value serialization. Those fixture corrections did not remove product
gates or alter required native command behavior. All final cases pass.

NOT checked: browser initialization/rendering, current CDN response, trusted
physical touches, physical iPhone/Safari, screen readers, real music playback,
GPU compilation, measured FPS, long-session frame pacing or real-vessel fidelity.
The recorded administrator browser restriction was not bypassed by navigation,
alternate tooling or a remote browser runner. The workflow is CPU/build/static
publication only. This is not a claim that every reported device issue is solved.

## Reproduce without a browser

Use the exact first published Beaufort Cruise site at
cdc915afef276e192786e5bb389c5b4fb4c3262e as BASE_SITE; its source directory as
BASE_SOURCE. EASY is the unchanged atlas_easy_helm subtree at97587a642829bc99bb4d408669b92cc3df1463e9.
Python3 and Node22 are sufficient. No dependency install, account or key required.

    python build-device.py --base "$BASE_SITE" --out /new/clean-helm-site
    python check-device.py --base-site "$BASE_SITE" --base-source "$BASE_SOURCE" --easy "$EASY" --site /new/clean-helm-site --evidence /new/reports

The builder refuses existing or overlapping output and verifies source hashes.
From the complete delivered package, serve its site directory over HTTP:

    python3 -m http.server 8080 --directory site

The original owner/source branches, public13, humans, yacht, multiplayer and
integrated-release decisions are unchanged. The one native main loop continues
to own boat/water time. No account, purchase or new hosting service is involved.
