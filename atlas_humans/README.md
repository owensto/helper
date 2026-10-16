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
4. Preserve CORE wheel/throttle targeting, but require owner-authored physical grip targets and a reviewed wrist offset. `PLAY_STEERING` / `PLAY_THROTTLE` are semantic control pivots, not approved grip contacts. Convert approved targets into the vessel coordinate frame and pass them in `attachment`. Do not independently advance wheel or vessel time. The fixture grip assumes a wheel in the YZ plane; custom hand orientations and throttle-reaching poses need a separate reviewed rig profile.
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
  frame: {epoch, time, dt, acceleration: [ax,ay,az], roll, pitch},
  transform: {epoch, time, localToWorld: [/* 16 column-major values */],
              worldToLocal: [/* exact inverse */]}
}
```

Contact surfaces and joint targets are different. This rig's flat sole is about 0.1001 m below its ankle; the fixture uses 0.102 m ankle height for about 2 mm sole clearance. Palm center is about 0.09 m forward of wrist in the authored grip. An owner's seat/cushion and hand-contact anchors require an explicit, reviewed rig offset mapping; they must not be silently treated as these joint targets. Reach residuals expose impossible stations rather than stretching bones.

Multiplayer proposal: `characterSnapshot(characterId, pose, sequence, simulationEpoch)` emits version, animationRevision, characterId, vesselId, geometryRevision, sequence, simulationEpoch, host time, mode, localPosition and lean. `readRemoteCharacter` accepts only the expected authenticated identity/vessel/revision matching host epoch and increasing sequence; it does not authenticate clients or interpolate motion. Add room/world revision and ownership epoch in the transport envelope. Remote representation must use the same local attachment definition; no remote vessel stepping. Shared crews/control authority remain outside this slice.

## Unsupported / not accepted

No full biomechanics, ragdoll, falling/overboard, buoyancy of people, dynamic hull collision, stairs, ladders, arbitrary slopes, sitting/standing transition choreography, two-way walking, pathfinding, face/eye animation, full-body reaction to impacts, multiplayer transport, or integrated Bay/yacht browser acceptance. Wrist/ankle numerical residual is not proof of every finger/sole vertex contact. The grip is authored for the fixture wheel; owner-specific wheel/throttle dimensions need calibration. Strong accelerations are bounded visual balance responses, not a balance/fall stability solver. Motion transitions between separate fixture exercises reset position deliberately.

## H2 receiver conformance checkpoint

Pinned owner inputs live under `tests/owner-fixtures/`; `provenance.json` records exact source paths, commits and byte hashes. C1 descriptor: `9227a6318f9524ac002b6a2ca9f78c9ebad4da2a`. Y1 manifest/adapter: `09aeb97168c4cd627cb54766d8f9ef2e55b83183` (Y1 result PR #1 comment 6208351149). These copies are test inputs, not replacement owner implementations.

C1 corrects the existing captain root to `(-1.60, 1.06, +0.18)` but all six physical contact/occupancy fields remain unavailable. Y1 exposes three point-contact patches and no helm anchors. The receiver tests execute the actual Y1 adapter against the pinned original R7 GLB (hash checked); synthetic identity transforms isolate receiver math. Those tests are not evidence of an integrated moving yacht. A triangle point hit never grants whole-foot/body clearance or a walkable rectangle. `owner-contracts.mjs` keeps `productionEnabled:false` for every result.

The proposed captain adapter now requires matching transform/time/epoch stamps, finite rigid matrices and agreeing inverses, actual render-pose agreement, and descent from the supplied vessel. Missing, stale, scaled, reflected, non-finite or malformed samples hide the visual child without crashing the host; a valid fresh sample can recover. Invalid rig poses are rejected before skeleton mutation. An owner must provide the current frame independently; cached samples cannot certify themselves as current. C1's numeric per-client simulation epoch, Y1's lifecycle activation epoch, and the proposed string character epoch are distinct. No implicit clock mapping is installed.

Fixture walking now limits foot landings as well as pelvis travel at expanded obstacle boundaries, settles a stopped swing foot continuously, and blends idle/walk skeletal animation over 0.22 s. Loss of deck validity requires a new controller before movement resumes. This does not add seated/standing transition choreography. Unit tests cover boundary continuity, obstacle landings, pause, invalidation and malformed inputs; the browser repeats all five real-time fixture motion cases and checks rejection before rig mutation.

**Remaining integration blocker:** owner-authored Bay/yacht seat/grip/sole contact surfaces, occupancy rules and reviewed rig offsets, plus explicit C1↔Y1 clock/world/identity mapping and CORE receiving approval. Y1 proposes authoring these in its own Y2 workstream. HUMANS has not invented anchors, changed yacht geometry or enabled shared wiring.

## H3 identity and diagnostic boundary correction

Coordinator probes against H2 exposed missing/empty identity acceptance, a NaN sequence cursor, absent publisher vessel/geometry identity, and exceptions escaping the diagnostic callback. `evidence/h3-before.txt` records the new focused regressions failing against H2 (7 failed/7 passed); `h3-after.txt` records all 35 tests passing after correction. The exact four reported cases have named tests, with additional absent-context and publisher/reader roundtrip bounds coverage. This is local input validation; authenticated identity remains transport-owned and networking is disabled.

Reader and publisher require nonblank string character/vessel/geometry/epoch identities (limits 96/128/256/128 characters), nonnegative safe-integer sequences, nonnegative finite simulation time, local components with absolute value <1000 m, and lean components <=0.5 rad. A receiver cursor is a safe integer >=-1; -1 explicitly means no prior sequence. Missing expected context rejects without throwing. Diagnostic callback exceptions are contained during initial hiding, ordinary invalidation and exception handling; they cannot enable a hidden rig or escape into the host loop. Valid recovery still works.

HUMANS ACKs final C1 `36903985f2182c902427fed77d4e28c61a7639ca` / `sealab12-core-integration/1.0.0` and the exact `c1-humans-map/1` proposal in PR #1 comment 6208577586. CORE owns its implementation: ordered scoped SHA256 epoch, independent current runtime/instance/world/design/model/station/contact/profile/frame registration, first/reacquired dt=0, consume each actual host-time delta once, repeated-frame dt=0, negative delta rejection, >0.1 s hide then fresh-frame reset/rebase. Changed seconds on the same committed frame is invalid. Activation and simulation epochs remain separate. Explicit unavailable acceleration means reduced balance, not measured response. No shared wiring or positive Bay profile is accepted by this ACK.

Positive Bay activation still requires exact source-linked physical surface frames/extents/occupancy and model/contact digests from C2, followed by HUMANS-calibrated pelvis/wrist/ankle offsets/orientations, reviewed root orientation/scale and a rig-profile digest. The existing fixture offsets cannot be reused as a Bay profile by assumption. H3 validation tests do not replace the H2 motion evidence or claim a new integrated browser run.

H3 follow-up executes the **unmodified final C1 hook** copied from `36903985...`, not only its descriptor. `tests/c1-final-hook.test.mjs` supplies synthetic Three.js vessel/captain/runtime bindings and exact Git-pinned public host bytes to the hook's normal SHA256 integrity checks. Four tests exercise cardinal/tilted transform round trips; unchanged host step/time under repeated and paused reads; reset delegation and epoch increment; actual unavailable-contact/ejected/detached/yacht responses; and stale-world invalidation. All four pass; full suite is 39/39. This is executable receiver conformance in a synthetic runtime, not actual Sea Lab browser motion or acceptance of C2.

The provenance file now pins both C1 descriptor and hook to final `36903985...`; descriptor bytes are unchanged from H2's earlier pin. Running this test requires Git and the pinned public `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff` objects (a full clone has them; a shallow clone may need `git fetch origin a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`). No host source is patched or hash verification bypassed. Evidence is `evidence/h3-c1-hook.txt`; `unit.txt` contains the combined suite. The initial test-only strict-equality assertion rejected JSON-normalized negative zero; numeric matrix equality now uses 1e-12 tolerance. No owner-code defect is claimed for that assertion repair.
