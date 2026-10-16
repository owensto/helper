# Y3 — evaluated owner-control wheel and moving physical contacts

Y2 baseline: `ce92886ac58f431e4e67d6fe71f269ad399a5c66`.
Original R7/public source: `48b9bef038ab2e422b6677d7ca9db4879419a3f9`.
Work remains isolated under `contact/y3/`. CORE owns all shared runtime/time,
registration, integration and deployment. HUMANS owns rig offsets/profiles. No
human, rig, clock, input controller, networking, or shared-host hook is added.

## Preserved physical identity

`station.json` retains Y2 schema `atlas-yacht-helm-surfaces/2`, design ID
`atlas-d-original-r7`, source asset hash, source parent, mounting coordinates,
occupancy, and all five neutral surface records byte-equivalent as JSON values.
The new station revision is `atlas-d-r7-aft-helm-y3/1.1.0`. The old Y2 station,
identity module and source files remain untouched. The physical manifest and
geometry code have new digests; a Y2 rig profile must not silently accept Y3.

The original asset is not rewritten. The existing authored rim, spoke and two
grip meshes move together beneath a new shaft pivot at station-local
`[0.30,1.03,0]` m. Column/shaft, cushion and sole supports stay stationary relative
to the station. This is still an exterior aft-terrace maneuvering station, not a
new main bridge or occupied pressure-qualified interior.

## Actual control binding, not a sensor or another clock

The caller copies **only the existing yacht owner `state.snapshot().rudder`**
into `ownerFrame.controls.rudder`. Required type: finite number in `[-1,1]`.
The existing left/center/right UI and A/D input remain the only control authority.
The preview does not infer steering from heading, speed, yaw, elapsed time,
remote poses, a synthetic oscillator or a second input state. Missing/invalid
control returns `OWNER_STEERING_UNAVAILABLE`, not neutral.

Articulation revision `atlas-d-rudder-wheel/1` is an authored visual travel:

```
wheelAngleRad = ownerFrame.controls.rudder * (Math.PI / 3)
```

Positive starboard control rotates about +X: clockwise when viewed from the
seated aft side looking forward. Travel is ±60 degrees. It is **not** measured
wheel angle, mechanical gearing, force feedback or a claim of real helm geometry.
There is no smoothing integration, timer, slew state or simulated actuator.

`install(T, model, spec, originalY1Manifest, originalAssetHash)` creates only the
new station subtree. In the owner's existing render phase:

```js
// Owner has already evaluated original vessel/animation matrices.
const frame = captureCurrentOwnerFrame();
const current = independentlyCaptureCurrentOwnerFrame();
station.evaluate(frame, current); // mutates only Y3-authored wheel/root subtree
const physical = station.sample(frame, current); // synchronous, read-only
```

`evaluate` does not update original source matrices or step the vessel. It updates
only the authored subtree from already-evaluated parent transforms. `sample`
compares actual pivot/grip render matrices against the control-derived expected
matrices; changing control without reevaluation, or tampering with a wheel/mesh
matrix, invalidates contacts. Same-frame changed owner control is rejected using
the independent current frame. Observing a cached sample against itself is not
proof of freshness or identity.

## Moving contact coordinates

The five Y2 contact IDs are unchanged. Cushion and soles retain their station
coordinates. Grip center, tangents and orientation rotate rigidly around the
shaft with the actual meshes. Each contact still returns world/vessel/station
positions, normal/tangents, rigid matrix/inverse, normalized XYZW quaternion,
finite surface extents and mesh/source-parent identity. Physical grip faces are
not wrist joints; pad surfaces are not ankles or pelvis. All rig targets and
production activation stay null/false.

Additional fields: each contact has `neutralPointStationM`, `articulated` and
`controlPoseToken`; the station has `articulation` with the source field,
normalized control, visual angle and matching token. The token is the ordered
JSON array `[vesselId,instanceId,activationEpoch,frameId,simTimeSeconds,
stationRevision,articulationRevision,rudder]`. It is a correlation token, NOT
credential/authentication. It complements, and does not replace, the unchanged
Y1 `frameToken` or Y2 identity mapping.

The unmodified Y2 mapper remains the receiver boundary. It carries the evaluated
physical contact fields but cannot enable a rig. `instanceId` identifies the
vessel instance; `activationEpoch` is attachment lifecycle only; `frameId` and
`frameToken` identify the evaluated render frame. Simulation epoch/world/session
remain explicit separate owner inputs. The preview uses labeled isolated-fixture
identity and dt=0; it does not implement CORE's consumed-dt clock mapping or
transport identity. C1 still has no accepted yacht registration.

## Occupancy and invalidation

All Y2 restrictions remain: one seated surface station, exactly zero conversion,
depth datum <=0.03 m, tilt <=20 degrees. Securing/deploying, packed mode, zero-depth
dive entry, submergence/ascent and inactive vessel hide the new station and disable
contacts. Fresh surface/lifecycle/control evaluation is required for recovery.
This hiding is not a packing/stow mechanism. Missing/nonfinite/unauthorized
geometry, stale frame/control, detached/scaled/hidden surfaces and modified source
support fail closed. Unknown sea-bottom coverage remains unknown; valid physical
contacts cannot authorize a dive or a whole-body collision claim.

## Equivalent guarded support audit

Y2's diagnostic observer repeated36 complete source-triangle contact queries per
sample (reported median4.5/p95 15.3ms including other diagnostics). The source
mounts are rigid and do not move relative to their source parent. Y3 first runs all
36 original queries, then retains their triangle IDs and source-local witnesses.
Before reuse on **every** sample it verifies source object/parent/geometry and
attribute identities, every position/index element (including in-place edits
without `needsUpdate`), rigid actual render matrices, unchanged source-relative
transform, station transform/occupancy and source visibility. It transforms the
same36 witnesses to the current world frame. A changed source does not trigger a
quiet acceptance of new geometry; it rejects.

`sample(frame,current,{exhaustiveMounts:true})` and `auditMounts(frame)` retain the
full original query path. Unit and browser tests compare cached/exhaustive
triangle IDs and all36 points at moving/tilted poses. Contact center/corner rays
and normals use independent Three.js raycasts against actual moving meshes.
Per-frame diagnostic rays for all five physical contacts remain enabled in motion
captures. No invalidation or ray tolerance is weakened for speed.

The local/CI benchmark alternates both audit methods at the exact same pose.
Renderer cost and human cost are excluded. Full observer timings include frame
capture, physical sampling, identity mapping and five independent rays; results
are diagnostics, not consumer-hardware or smoothness claims.

## Tests, exact scope and next boundary

`test-wheel.cjs` exercises actual R7 geometry, left/neutral/right articulation,
all face corners, cardinal/tilted poses, unchanged neutral contacts, cache parity,
in-place source/index tampering, moving-geometry tampering, missing/stale controls,
mode/lifecycle fail-closed behavior and original controller state equality.
Unmodified 28 Y2, 35 Y1 and 22 controller tests also run. Y2's pinned HUMANS H2
reader is run only as regression evidence; newer H3/H4 work is not misrepresented
as tested by this branch. H4 Bay calibration is neither interrupted nor copied.

Browser tests use only the permitted existing branch CI; no local navigation
bypass. Actual UI pointer controls drive wheel captures and normal turning/bobbing.
Deterministic preparation/transition/regression steps are explicitly separated
from the normal-loop measurement. No human or biomechanics result is claimed.

Smallest later combined step: HUMANS must review/calibrate a **yacht-specific Y3
moving-contact profile**, and CORE must register this exact station/control/clock
boundary for its existing single-captain lifecycle. That is not a request to stop
H4 Bay work. Shared release, source/world registration, rig reach/orientations,
whole-body clearance, arbitrary foot rotation and underwater occupancy remain
unavailable until their owners supply and test them.
