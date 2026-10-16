# ATLAS D original vessel — delivered integration and handoff

Owner: final Atlas D chat, assigned by Owen on October 15, 2026 (America/Chicago).
Scope: the original transforming superyacht/submarine, yacht-specific operation, tender/closure/shell animation, camera stations, and an operable Sea Lab integration preview.

## Verified release

The first online release passed all gates. **Read `RELEASE.json` for the latest verified immutable public URL and published commit.** The public host may show an External Content Notice; use its normal **Open the page** button. A newer source commit or pending workflow is not a newer verified release.

Evidence: `review/core.json` (22 passing deterministic tests), `review/browser.json` (local desktop and phone-sized browsers), `review/public-assets.json` (actual browser-loaded bytes plus normal animation-frame driving), and `review/public-browser.json` (public desktop and phone-sized operation). Screenshots are in `review/`.

The online checks do not substitute local files. They compare the HTML, vessel scripts, CSS and exact original GLB, following legitimate CDN redirects. They operate propulsion, reversal, conversion, pause, dive, depth hold, surfacing, exterior deployment, map and return-to-Bay. The independent real-time check advances through normal requestAnimationFrame calls, not `testStep`. Software-renderer results are not consumer-device frame-rate claims or physical phone/Safari certification.

## Original identity and geometry

- Source: `atlas_d_original_r7/live/ATLAS_D_Original.glb` and `model_report.json`.
- Original design: 82.9 m length, 14.2 m beam; forward helipad, terraced decks, two tenders and one continuous main hull. No generic submarine replacement, hull swap or hull scaling.
- Asset: 9,043,328 bytes; SHA256 `b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48`.
- Conversion samples the original clip only through 38.4 seconds (normalized 0.8). The original `Vessel.position` track is excluded. World-space depth is controlled by the simulator, not the original canned descent.
- Model-derived deepest main-hull datum: approximately 4.507 m below source y=0. This is a geometric datum, not validated hydrostatic draft.

## File ownership / parallel-edit boundary

This workstream owns `atlas_d_simulator_01/**` and `.github/workflows/atlas-d-simulator-01.yml`. No original R7, existing Sea Lab, physics, world/map, radio or multiplayer source was overwritten.

The preview uses immutable Sea Lab 11 baseline `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8`. **It is not yet merged into the newer Sea Lab 12 or multiplayer release.** Its authored deep-water proving ground is deliberately labeled as fictional; it does not deepen or falsify Beaufort chart data. The same bottom function feeds rendering and clearance checks.

## Integration contract for the coordinator

Stable vessel ID: `atlas-d-original-r7`. Units: metres, seconds and radians; local +X forward, +Y up; heading increases toward +Z.

1. Reuse `src/atlas-d-core.js`: `AtlasDCore.Vessel`, `.command(name,value,sampleBottom)`, `.step(1/60,sampleBottom,sampleWaveHeight)`, `.snapshot()`. The controller is independent of rendering and transport.
2. Reuse the exact original GLB and conversion sampling from `src/atlas-d.js`. Preserve the root-position exclusion and metre scale. Do not reuse the small Bay's draft or footprint.
3. Replace this preview's narrow host suspension/scene adapter and fictional depth provider when integrating into the shared world. Keep unknown bottom coverage unknown. The controller checks 13 longitudinal stations and three transverse samples conservatively; it is not a continuous structural collision solver.
4. Add networking authority, validation and remote-vessel interpolation in the multiplayer workstream. Finite versioned snapshots are provided, but networking, authentication, sign-in, authority and remote rendering are not implemented or tested here.

`window.ATLAS_D_SIM` exposes `ready`, `active`, `enter`, `exit`, `command`, `state`, `model`, `vessel`, `pose`, `setView` and `inspect`. `testStep` and `holdFrameLoop` are explicit test helpers, not production networking APIs.

## Operating flow

Start propulsion in neutral at idle. F/N/R select gear; W/S adjust power; A/D steer; E toggles propulsion; Space idles and coasts; P pauses. Touch controls and a low-speed bow-thruster control are included.

To dive: idle and neutral, wait until slow, Secure for dive, wait for original tender/door/shell conversion, choose a 12–30 m scenario target, then Dive. Surface first, then neutral/idle and Deploy yacht to reopen. The default target is 18 m. Unsecured, unknown-coverage and insufficient modeled-clearance dives are blocked.

Detail switches between high and smooth rendering without dropping original yacht meshes. Smooth mode reduces the water mesh and render resolution. Significant rendering stalls pause rather than silently advancing an uncontrolled vessel. The ordinary Bay state, camera, water geometry and rendering configuration are restored on exit.

## Remaining work / boundaries

Walkable finished interiors, real yacht recordings, structural collision/damage, validated buoyancy/trim and pressure-hull engineering are not included. The original model remains a concept, with no certified diving depth or approved occupied-accommodation transformation. Handling, ballast indications and depth limits are authored game parameters, not established real-vessel performance.

Next shared integration is to register this exact vessel and its controller in the coordinator's current world and multiplayer release, without copying this entire older host over those active files. This handoff records delivered work; it is not a background agent or a promise of unattended development.
