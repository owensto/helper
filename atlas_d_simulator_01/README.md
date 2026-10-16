# ATLAS D — original yacht / submarine simulator integration 01

This workstream turns the **existing original R7 ATLAS D** into an operable vessel preview inside the Sea Lab runtime. It is not a replacement yacht design. The 82.9 m × 14.2 m source asset retains the forward helipad, terraced exterior, two tenders and continuous main hull.

## Release status

Read `RELEASE.json` for a verified immutable public URL. Absence of that file means the online release has not yet passed all gates. A source commit or a running workflow is not a passed release.

The release workflow requires JavaScript syntax checks, deterministic vessel tests, desktop and phone-sized Chromium operation, exact public-asset byte comparisons, and a second operation pass against the public URL. Browser screenshots and reports are stored under `review/`. These are headless viewport tests, not physical phone or Safari certification.

## Vessel operation

- Start propulsion in neutral at idle. Forward and reverse selections are immediate; speed changes gradually rather than teleporting. Idle & coast removes thrust, not momentum. Steering and low-speed bow-thruster controls are separate.
- Secure for dive operates the original tender/door/exterior animation through its original 38.4-second conversion section. It does not play the original canned vertical descent.
- Dive is refused until the exterior is secured and the full conservative hull footprint has known sufficient bottom clearance. The simulation descends gradually toward the chosen 12–30 m scenario target. Surface commands ascent; Deploy yacht is unavailable underwater.
- Around yacht, Follow, Bridge, Helipad and Underwater are camera viewpoints. Systems view is an inspection overlay. The map shows the authored proving-ground bottom and the yacht, not real navigation data.

Keyboard: E propulsion; F/N/R gear; W/S power; A/D steering; Space idle/coast; P pause. Touch buttons and a power slider are provided. Hiding the browser tab pauses this vessel.

## Shared runtime, isolated scenario

The preview is assembled from immutable Sea Lab 11 commit `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8` and the original R7 asset at the same commit. It reuses the existing Three.js runtime, wave field, water shaders, and dynamic bottom mesh. The authored deep-water scenario supplies **the same bottom function** to rendering and clearance checks. It is not Beaufort. Real chart depths and other Sea Lab locations are not edited.

Boarding ATLAS D suspends the Bay loop and saves its state and view. Returning restores the Bay. This first integration deliberately avoids editing another chat's active physics, map, UI, radio or multiplayer files. See `HANDOFF.md` for ownership.

## Coordinator / multiplayer handoff

Stable vessel ID: `atlas-d-original-r7`. Units: metres, seconds, radians; local +X forward, +Y up.

The renderer-independent module is `src/atlas-d-core.js`. Its exported API is `AtlasDCore` in browsers and CommonJS in Node:

```js
const controller = new AtlasDCore.Vessel({ draftM: geometryDerivedDraft });
controller.command('engine');
controller.command('gear', 1);
controller.command('throttle', 0.2);
controller.step(1 / 60, sampleBottom, sampleWaveHeight);
const plainState = controller.snapshot();
```

`sampleBottom(x,z)` returns `{known, bed}` in metres. Unknown coverage must remain unknown. The full footprint is checked; the Bay's smaller draft and collision footprint must not be reused. `sampleWaveHeight(x,z,elapsed)` returns world height in metres.

`window.ATLAS_D_SIM` exposes readiness, enter/exit, command, state, original model, camera selection and inspect data. `snapshot()` is finite, plain, versioned state for later transport integration. Networking, remote-player authority, sign-in and interpolation are **not implemented** here. `testStep` and `holdFrameLoop` are explicit test helpers, not evidence of real-time performance.

To integrate into the newer shared release, reuse the pure controller and original asset; replace only this preview's narrow host adapter and depth provider after agreement with the world/physics coordinator. Do not blindly copy this preview over Sea Lab 12 or the multiplayer branch.

## Limits that remain

The source geometry is a concept. It has no certified diving depth, approved pressure hull, validated buoyancy/trim, confirmed occupied accommodation through transformation, or qualified tender garages. Handling constants, ballast display and target-depth bounds are authored game values, not real-vessel design results. Clearance is conservative geometry-based sampling, not a navigational sounder or a structural collision solver. This version does not add walkable finished interiors, real yacht recordings, overhead bridge collisions, flooding/damage engineering or multiplayer.

## Build

Within a Git checkout with network access:

```sh
python atlas_d_simulator_01/build.py
node atlas_d_simulator_01/test-core.cjs
python -m http.server 8914 --directory atlas_d_simulator_01/site
```

Open the served index. Add `?vessel=bay` to begin with the original Bay host rather than automatically boarding ATLAS D. The build and release workflow only writes this workstream's paths.
