# CORE C1: Sea Lab 12 integration boundary

Revision **`sealab12-core-integration/1.0.0`**. CORE-approved boundary; receiving-owner ACKs and combined acceptance are **PENDING**, not inferred from separate green previews.

## Exact lineage and scope

Reviewed source `5c62a713b014b97a47bb65b65ec05f382a23ac77`, review run `38849136102`. Result/public baseline `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`. Public baseline: https://rawcdn.githack.com/owensto/helper/a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff/atlas_sealab_12/live/index.html

Branch `atlas/core-sealab12-handoff-c1-20261016`, created from that exact public commit. Workdir `/mnt/data/core-sealab12-c1-20261016`, reconstructed from the published portable package with all **104** site files verified against the repository manifest. This is not a recovered Mac checkout or proof of a local checkout at the remote commit. Candidate source/result SHA is the commit containing these files; exact CI source SHA is recorded in `build.json` and each `validation.json`, avoiding a self-referential commit hash in the descriptor.

Reserved: `atlas_sealab_12/integration/c1/{descriptor.json,host-hooks.js,HANDOFF.md,prepare.py,test-contract.cjs,verify.py,evidence/**}` and `.github/workflows/atlas-sealab-12-core-handoff.yml`. The latter is a test-only branch workflow. `prepare.py` generates `/tmp/core12-c1/site` and `/tmp/core12-c1/{build.json,review/**}`; only the candidate index receives loader tags. No published host script, model, captain, control, physics, shader or worker file is replaced. Production remains at the baseline SHA; publishing this handoff is not a combined application release.

## Owner proposals: explicit decisions

- **Coordinator 6208021040: ACCEPT.** CORE owns coupled physics/graphics/control/time and integrated frontend release. Passing isolated components is not shared acceptance.
- **Yacht 6208024942: ACCEPT WITH EXPLICIT MAPPING.** SI metres/seconds/radians, local +X forward, +Y up, +Z starboard; right-handed, column-major 4x4 matrices acting on column vectors, local-to-world and explicit inverse, normalized quaternion XYZW. World +X is east and +Z is south. Host heading is zero east and increases toward south. Host render rotation is `Euler(roll,-heading,pitch,'YXZ')`, equivalent to `Ry(-heading)*Rx(roll)*Rz(pitch)`. The yaw sign must not be silently reused as positive Three.js Y rotation. Export the actual current host world matrix/quaternion, not a reconstructed old-preview pose. Yacht still owns its controller/footprint/contact patches. Accept unknown helm anchors and unestablished transition occupancy as unavailable; do not substitute Bay data. Its test-only workflow amendment 6208070618 is acknowledged and untouched.
- **HUMANS 6208097580: ACCEPT WITH ANCHOR CORRECTION.** Existing task `01a142ed-0182-71c4-9393-7bdfe248f0fe` exclusively owns `atlas_humans/**`. Reuse the current `captain12` / `SEA12_CAPTAIN`, `PLAY_STEERING`, `PLAY_THROTTLE`. Current published captain root is `(-1.60,1.06,+0.18)` boat-local, not the earlier audit `(-1.65,.94,-.42)`. Copy actual semantic-node matrices. A steering pivot is NOT an authoritative left/right grip; the captain's visual origin is NOT a measured seat-contact patch. Seat/grip/sole and transition occupancy remain explicitly unavailable until the receiving owner and CORE agree targets. No new character worker, rig or IK implementation is added here.
- **Multiplayer 6208029226 / 6208113641: ACCEPT NARROW SCOPE, CORRECT CLOCK PROPOSAL.** Descriptor-injected, fail-closed, client-owned cooperative poses. Server owns player/entity identity, not local physics. No remote stepping, shared collisions/damage, crews or pause/map messages. Current host has no synchronized monotonic room physics origin. `clock.seconds` is CORE's per-client simulation time, with a reset epoch. The fixed step is 1/60 s in drive mode; inspection mode is not fixed-step. No transport-owned clock may advance vessel/water/weather. Remote render interpolation remains MP-owned and absent here. M1's 30 diagnostic passes are not certification of the exact ws pin/lock/audit. M2 remains with its existing owner; nothing in this branch duplicates it.

The proposed shared room clock is therefore **not accepted as an existing host capability**. Room synchronization, avatar networking and general vessel switching remain separate gates.

## API and ownership

The candidate bootstrap waits for the unchanged Sea Lab 12 host, fetches the descriptor, and calls `SeaLab12HostHooks.attach(descriptor)`. It validates the entire descriptor digest and 20 critical host-code/asset hashes. Build preflight validates all 104 baseline assets. It does not load any foreign worker module.

`attach` returns a frozen `{revision, reader, local, dispose}` object. Give consumers **only `reader`**. The `local` capability stays in CORE-controlled joining/reconnect logic. This is an API discipline, not a security sandbox against arbitrary scripts that already have the page's old global access.

```js
const d = await hooks.reader.describe();
const pose = hooks.reader.readPose('atlas-bay-25-sealab12', d.worldRevision);
const water = hooks.reader.sampleWater('atlas-bay-25-sealab12', d.worldRevision, x, z);
const anchors = hooks.reader.readAnchors('atlas-bay-25-sealab12', d.worldRevision);
```

All returned data are deep copies, recursively frozen; matrices/quaternions are plain arrays without mutable Three.js nodes or live state references. Poses are **render-committed** snapshots, not promises about mid-physics-step state. Call after CORE has refreshed the vessel transform. The hook does not call `step`, start a timer or render loop, or create a character. `entityId:null` deliberately leaves server identity assignment to multiplayer; `vesselId` is a design/controller identifier.

`clock.epoch` increments when the host resets its state or the local spawn/restore hook performs a discontinuous placement. A wrapped `state.reset` delegates unchanged physics and only invalidates restore tokens/increments the epoch; `dispose` restores the original method only if it still owns the wrapper. The physics `state.step` function remains unchanged. Reads never advance seconds, weather, waves or wake memory. If another owner replaces the state/step/reset binding, the boundary fails closed instead of clobbering that change.

`sampleWater` uses the current host `BayMotion.surface` and `Sea09World.sample`. It includes tide once, returns `known:false, bed:null, depth:null` for missing coverage, and makes no zero-depth substitution. Local wakes are not transmitted or simulated for remote vessels.

## World revision and invalidation

`worldRevision = sl12-c1-sha256:<SHA256(canonical(world))>`, using sorted object keys, preserved array order and finite JSON numbers. The fingerprint includes this protocol revision, the exact baseline, scene/origin, complete configuration, performance/environment profile, target weather, water implementation hashes/tide/clarity, damage/ejection/light rules and the current static collider list. It excludes pose, elapsed time, current weather blending and fuel already burned.

A world change invalidates the previous descriptor immediately: reads and local placement reject `STALE_WORLD_REVISION`. Call `describe` again to get the new immutable descriptor; rejoin negotiation belongs to MP. Equal fingerprints do **not** establish synchronized wave phase or host time. Current weather remains available in host samples. Receivers must not keep a remote boat active under an obsolete scene/config descriptor.

## Per-vessel spawning and restoration

**Bay only:** design ID `atlas-bay-25-sealab12`. Eight practice-bay positions are generated at `[-240+30*slot,-300]`, heading zero, and validated every time. The envelope conservatively covers x +/-4.6 m, z +/-1.6 m; broadphase radius 5.4 m. Checks require the current seamanship configuration, authored basin coverage, static water depth >=2.5 m across the sampled envelope, wave amplitude <=0.22 for current/target weather, no solid-obstacle broadphase overlap, and an explicitly supplied occupancy list. A supplied empty list means the host asserts no occupied spawn regions; it is not a global reservation. Atomic room allocation is still MP/CORE integration work.

`prepareSpawn(id,rev,slot,occupied)` is read-only. `spawnLocal(...)` places the local Bay stopped, paused, engine off, and increments the epoch. `captureRestorePoint(id,rev)` creates a bounded, same-adapter object token. `restoreLocal(token,occupied)` rechecks revision, local token identity, lifecycle and current placement safety. Serialized/copied/remote tokens are rejected. It restores a **stationary local pose only**, not moving physics state, clock, weather, fuel or damage. No persistent reconnect across page reload is claimed. Destroyed/ejected/disabled vessels require normal CORE recovery instead. General arbitrary-pose restoration is unavailable.

**Beaufort Bay spawning:** unavailable until explicit geographic spawn validation, rather than guessing clearance from sparse depth samples. **Yacht `atlas-d-original-r7`:** recognized, but pose/spawn/restore/helm/transition capabilities are all unavailable in this host until the owner adapter is accepted. No fallback to the Bay footprint, captain or old yacht preview host. Unknown vessel IDs fail closed.

## Receiving-owner ACK required before wiring

Each of YACHT, HUMANS and MULTIPLAYER must post an ACK on PR #1 naming this exact descriptor revision **and candidate result SHA**, their source/result SHA, isolated branch/workdir, exact adapter paths, and either explicit acceptance or a concrete correction. Tests must show cardinal/tilted transform compatibility and unavailable-state handling, not only declare matching field names.

YACHT must include contact/footprint revisions and no invented helm or transition occupancy. HUMANS must acknowledge the corrected captain root, semantic-pivot versus contact distinction, unchanged captain identity and host-only time. MULTIPLAYER must acknowledge epoch/revision invalidation, identity separation, no remote writes to local state, local-only stopped restoration, and separately close its real pin/lock/audit gate. This document does not fabricate their ACKs. XAC-01 remains independent coordinator review after handoff.

## Evidence and next bounded step

Run `node atlas_sealab_12/integration/c1/test-contract.cjs`, then `python atlas_sealab_12/integration/c1/prepare.py`; serve `/tmp/core12-c1/site` and run `verify.py` with `TEST_DEVICE=desktop` or `phone`. Tests retain real screenshots/video, source hashes, host-clock/matrix/anchor snapshots, spawn/restore rejections, scene/config/tide/weather invalidation and existing captain/map behavior. Node-only results are not browser results. Phone-sized Chromium is not physical-device certification. The local container's WebGL probe is false; actual rendered tests use existing permitted CI.

One next bounded integration step: after receiving-owner ACKs, run XAC-01 compatibility review on these exact SHAs and the existing owners' narrow adapters. Do not integrate network clocks, shared collision/crews, unknown yacht helm attachments or a replacement human in this C1 slice. Production Sea Lab 12 remains unchanged until a separately tested integrated candidate is approved.
