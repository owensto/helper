# ATLAS human-character vertical slice

**Isolated prototype, not a shared release.** Owns only `atlas_humans/**`. Audit source `99c5300c1f10e5c25c7be380fc1e015a727fca81`; branch `atlas/humans-contact-20261016`. No CORE, yacht, multiplayer or workflow files changed. The preview's deck and motion are explicitly authored fixtures, not Bay/yacht physics or approved vessel geometry.

## Run and verify

```sh
cd atlas_humans
npm ci
npm test
npm run serve
# Open http://127.0.0.1:8934
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

Node 22+, Python 3, Chromium/WebGL2. Tests can use an existing Chromium; no account or paid service is needed. `tools/verify.mjs` defaults to the development machine's installed test Chromium; override `CHROMIUM_PATH` elsewhere. Preview dependencies are local npm imports, and character assets are local: no runtime CDN or asset service.

## Delivered behavior

- Textured, skinned 1.78 m adult from Microsoft Rocketbox, with licensed seated breathing, standing idle and walking clips. MIT license and pinned source provenance retained under `assets/`.
- Pelvis fixed to helm contact. Analytic two-bone IK targets wrists and ankles; authored curled grip and deck-relative flat shoe orientation. Upper-body damped response to local acceleration and vessel roll/pitch. No vessel physics or time integration.
- Limited forward locomotion on an explicitly supplied flat rectangular deck patch. Stance feet remain in vessel coordinates; swing feet clear the deck; rig-measured leg reach limits pelvis height. Conservative capsule edge/box stop. This is not arbitrary-geometry navigation.
- `makeCaptain12Build` is an opt-in factory for CORE's **existing** captain lifecycle. It returns the same `group, limbs` shape and `userData.animateCaptain` hook. It creates no global, second captain, animation loop or socket.
- Small versioned character snapshot and strict remote-payload reader. Transport and authenticated authority stay with multiplayer; networking remains disabled.

## Evidence and budget

`evidence/browser.json` records actual requestAnimationFrame motion, per-case time/frames, max IK target error, sampled skinned shoe clearance, browser version, errors, pause stability, phone viewport and character-on/off CPU/render counters. `evidence/full-motion.webm` is the captured run; PNGs and the filmstrip aid review. No testStep or screenshot-only motion claim.

Budget target for one character: **<1 ms p95 character CPU update**, **3 additional main-pass draw calls**, **7,440 triangles**, and **<4 MB combined model/animation transfer before HTTP compression**. The report measures the same isolated scene with the character hidden and shown. CPU render-submit time is not GPU time; this is desktop Chromium evidence, not physical-phone/Safari or full Sea Lab performance certification. Host integration must remeasure its own baseline.

Unit coverage includes moving-parent IK, unreachable targets without bone stretch, pause, bad inputs, revision/reset behavior, immutable contact snapshots, collision/edge stops, identity/revision/sequence validation, and preserving existing captain transforms.

## CORE integration, deliberately not installed

1. Agree the current CORE descriptor/SHA and vessel attachments first. Reuse CORE's Three.js instance when bundling these modules. Load `RocketboxCaptain.glb` with GLTFLoader and `animations.json`, then call `createHelmRig(gltf, clips)` once per character.
2. Supply `makeCaptain12Build({rig, sampleHost, onUnsupported})` at the existing `Sea12Captain.build(T)` call in `ensureDriver`; do not add a separate driver or global. Existing `SEA12_CAPTAIN` naming, visibility/camera logic and boat parenting remain CORE-owned. `sampleHost(A,S)` returns the contract below. Parent driver translation is handled explicitly by the consumer.
3. Sample **once per host simulation frame** after vessel/control matrices update. Supply local-frame acceleration, roll/pitch and host time/dt. `dt` must be 0…0.1 s; subdivide larger host steps. Paused host supplies dt=0 and unchanged time. On clock reset change the explicit `frame.epoch` and set `reset:true`; on vessel/geometry change use the new identity/revision and new anchors.
4. Preserve CORE wheel/throttle targeting: derive updated wrist targets from `PLAY_STEERING` / `PLAY_THROTTLE`, converted into the vessel coordinate frame, and pass them in `attachment`. Do not independently advance wheel or vessel time. The fixture grip assumes a wheel in the YZ plane; custom hand orientations and throttle-reaching poses need a separate reviewed rig profile.
5. Mark missing/unsafe attachments `valid:false` with a reason. The visual child is hidden even if older host code re-enables the parent. CORE must suppress unsupported ejection/ragdoll updates for this rig or retain its procedural fallback for that mode; the factory returns no procedural limb list.
6. Yacht owner supplies its own authoritative attachment/contact adapter. **Do not use Bay dimensions or these fixture coordinates on yacht.** Unknown helm geometry, conversion occupancy, stairs/interiors or depth do not become invented support surfaces. Neither Bay nor yacht integration is accepted by the fixture tests.

```js
// Owner-supplied proposal, awaiting CORE's accepted shared descriptor.
{
  valid: true, reset: false, ejected: false,
  attachment: {
    vesselId: 'owner-vessel-id', revision: 'owner-geometry-contact-revision',
    // All coordinates metres in vessel local +X forward, +Y up, +Z starboard.
    seat: [x,y,z],       // pelvis joint anchor, not cushion surface
    leftFoot: [x,y,z], rightFoot: [x,y,z], // ankle joint targets, not sole planes
    leftHand: [x,y,z], rightHand: [x,y,z] // wrist joint targets, not palm centers
  },
  frame: {epoch, time, dt, acceleration: [ax,ay,az], roll, pitch}
}
```

Contact surfaces and joint targets are different. This rig's flat sole is about 0.1001 m below its ankle; the fixture uses 0.102 m ankle height for about 2 mm sole clearance. Palm center is about 0.09 m forward of wrist in the authored grip. An owner's seat/cushion and hand-contact anchors require an explicit, reviewed rig offset mapping; they must not be silently treated as these joint targets. Reach residuals expose impossible stations rather than stretching bones.

Multiplayer proposal: `characterSnapshot(characterId, pose, sequence, simulationEpoch)` emits version, animationRevision, characterId, vesselId, geometryRevision, sequence, simulationEpoch, host time, mode, localPosition and lean. `readRemoteCharacter` accepts only the expected authenticated identity/vessel/revision matching host epoch and increasing sequence; it does not authenticate clients or interpolate motion. Add room/world revision and ownership epoch in the transport envelope. Remote representation must use the same local attachment definition; no remote vessel stepping. Shared crews/control authority remain outside this slice.

## Unsupported / not accepted

No full biomechanics, ragdoll, falling/overboard, buoyancy of people, dynamic hull collision, stairs, ladders, arbitrary slopes, sitting/standing transition choreography, two-way walking, pathfinding, face/eye animation, full-body reaction to impacts, multiplayer transport, or integrated Bay/yacht browser acceptance. Wrist/ankle numerical residual is not proof of every finger/sole vertex contact. The grip is authored for the fixture wheel; owner-specific wheel/throttle dimensions need calibration. Strong accelerations are bounded visual balance responses, not a balance/fall stability solver. Motion transitions between separate fixture exercises reset position deliberately.
