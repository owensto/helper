# Y2: original R7 exterior helm physical surfaces

Status: isolated owner-authored geometry; receiver field acceptance pending. No
shared-host wiring, rig construction, inverse kinematics, vessel stepping,
networking, merge or deployment. CORE owns coupled runtime/time and release.

## Immutable inputs

Y1 base: `09aeb97168c4cd627cb54766d8f9ef2e55b83183`.
Original vessel/public source: `48b9bef038ab2e422b6677d7ca9db4879419a3f9`.
Original GLB SHA256: `b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48`.
HUMANS H2 reader: `347e52ebc4cdb38b7647bb54b37405fbe59b57cf`.
C1 descriptor: `36903985f2182c902427fed77d4e28c61a7639ca`, revision
`sealab12-core-integration/1.0.0`. Exact imported bytes/hashes are recorded by
`prepare.py` in `evidence/receiver-provenance.json`; imported owner files are
read-only test inputs, not modified or checked into another owner's path.

The result commit is recorded separately in `evidence/result-source-sha.txt`.
Branch: `atlas-d/yacht-helm-y2-20261016`. Snapshot workdir:
`/mnt/data/atlas-d-y2/work`. These inputs are not an accepted combined baseline.

## What is newly authored

`helm-station.js` creates `Y2_HELM_STATION` below the existing
`MOV_Shell_Bridge` node, with source-local origin
`[-17.35,13.868000030517578,-2.0]` metres. This is an **exterior maneuvering helm
on the exposed aft terrace**, not R7's unauthored main bridge or the bridge
camera. The original GLB and Y1's null helm endpoints remain unchanged.

Four small mounting pads are supported by the original
`MOV_Shell_Bridge__Teak_honey` mesh inside Y1 `bridge.aft.patch`. Nine source-triangle
probes per pad check the actual source surface and elevation. The first candidate
failed where pads crossed plank seams; mounts were moved onto existing triangles.
No original gap was filled or turned into generic walkable geometry. The new
platform bridges its supports as authored geometry; no structural load rating is
established. This sample grid is not continuous structural support certification.

The station includes a platform, mounts, seat pedestal, cushion/back, steering
column/shaft/rim/spoke, two grip pads and supported left/right sole pads. The
wheel is a fixed geometry fixture; it does not add input bindings or claim dynamic
wheel/grip articulation. No human or replacement captain is created.

## Five physical contacts (station-local SI coordinates)

| Stable endpoint | Surface center (x,y,z), m | Outward normal | Physical face extents |
|---|---|---|---|
| `helm.seat` | `[-0.34,0.70,0]` | `[0,1,0]` | 0.46 x 0.54 m upper cushion face |
| `helm.hand.left` | `[0.268,1.03,-0.245]` | `[-1,0,0]` | 0.15 x 0.054 m flat aft grip face |
| `helm.hand.right` | `[0.268,1.03,0.245]` | `[-1,0,0]` | 0.15 x 0.054 m flat aft grip face |
| `helm.foot.left` | `[0.22,0.21,-0.18]` | `[0,1,0]` | 0.36 x 0.20 m upper sole-pad face |
| `helm.foot.right` | `[0.22,0.21,0.18]` | `[0,1,0]` | 0.36 x 0.20 m upper sole-pad face |

These are actual mesh faces, not node/pivot origins. `station.json` defines each
solid box, face center, normal, tangents and finite extents. Contact frames use
local +Y outward normal, +X tangent U and +Z tangent V; all bases are right-handed.
Grip tangents differ from cushion/sole tangents. Matrices are column-major 4x4,
column vectors; quaternions are normalized XYZW. Vessel coordinates remain
+X forward, +Y up, +Z starboard; heading increases toward +Z (negative Y rotation).

Every valid face returns world/station/vessel surface position, surface frame and
inverse, normal, tangents, half extents, source parent and its new mesh name.
`supportsRectangle` tests only a planar, aligned rectangle on that finite face:
sole pad maximum 0.30 x 0.12 m, cushion 0.40 x 0.46 m, grip 0.11 x 0.035 m.
It is not a foot/body collision solver, stability or safe whole-body occupancy
rating. Rotated footprints, fingers wrapping a curved rim and walking are absent.

**HUMANS must author/review pelvis, wrist and ankle offsets from these physical
surfaces in its own rig convention.** Y2 emits `rigJointTargets:null`,
`attachment:null`, `rigOffsetRevision:null`. It never substitutes face centers
for `CharacterContact`'s pelvis/wrist/ankle vec3 fields. Positive physical support
is not a positive `makeCaptain12Build` sample. The existing H2 reader continues
rejecting old Y1 helm data and the unreviewed rig mapping.

## Occupancy and invalidation

One seated station is geometrically supported in `surface` mode, exact
`conversion=0`, depth datum at most 0.03 m, and world station tilt at most 20 degrees.
Motion, heading, heave, roll and pitch follow the already evaluated source parent.
No new vessel force or time integration exists.

- `securing`/`deploying`: unavailable, `TRANSFORMING_OCCUPANCY_UNSUPPORTED`.
- `secured`: unavailable, `PACKED_STATION_UNAVAILABLE`.
- `diving` (including zero-depth entry), `submerged`, `surfacing`: unavailable,
  `SUBMERGED_EXTERIOR_UNSUPPORTED`.
- Yacht exit, stale instance/lifecycle/render stamp, missing independent current
  owner frame, detached/scaled/reflected/mismatched render geometry, missing grip,
  changed contact mesh, unsupported tilt or failed source mounts: unavailable.

The **new station is hidden while unsupported**. No invented folding mechanism,
validated transformation packing or dry occupied underwater compartment is claimed.
Returning to surface with the original exterior restored re-enables geometry,
provided a fresh owner frame and lifecycle identity are supplied. Changes in mode
at the same time/frame invalidate cached support too. Unknown bottom stays
`known:false` with null values; deck support never creates navigable depth.

## Explicit identity mapping, separate from rig offsets

`identity-map.js::mapPhysical(stationSample,y1Sample,currentOwnerFrame,context)`
requires a fresh independent owner frame. The coordinator's proposed `c1-humans-map/1` epoch digest from PR1 comment 6208577586 is used; owner field acceptance is still required. The current C1 descriptor is unchanged from the prior 9227a631 snapshot, but its hook is not assumed equivalent. A stale sample plus its own token does
not prove it is current. No signature/authentication is claimed for these local
correlation tokens.

| Owner field | Y2 receiving field | Meaning |
|---|---|---|
| fixed `vesselId` | `identity.vesselId` | design/controller, never a person/entity ID |
| Y1 `instanceId` | `identity.vesselInstanceId` | specific owner-local vessel instance |
| Y1 `activationEpoch` | `identity.attachmentActivationEpoch` | attachment lifecycle only |
| Y1 `frameId` | `identity.renderFrameId` | render sample identity, not a physics/network tick |
| Y1 `frameToken` | `identity.ownerFrameToken` | exact original serialized correlation token |
| explicit C1-style `clock.epoch` + explicit `hostSessionId` | `frame.epoch`, `transform.epoch`, `identity.simulationEpoch` | 70-character `c1h/1:<sha256>` over ordered `["c1-humans-map/1",coreSourceSHA,hostSessionId,instanceId,"client-simulation",clock.epoch]`; never activationEpoch |
| owner `clock.seconds` | `frame.time`, `transform.time` | resettable local seconds, exactly equal to Y1 `simTimeSeconds` |
| explicit owner `worldRevision` | `identity.worldRevision` | scene/config identity; not water-phase synchronization |
| none supplied by current host | `entityId`, `playerId`, `characterId` | null/unavailable; transport/host must supply later |

`identityToken` includes the original token, host session, separate simulation
epoch and world revision, so world changes/resets are not conflated with boarding.
The context and fresh owner frame must independently agree on session/world/epoch.
Missing fields, inverse disagreement or changed mode fail closed. `frame.dt` is
explicit caller-supplied in [0,.1]; Y2 never derives/advances a clock. The geometry
browser fixture uses dt=0 because it does not execute a rig update.

C1 currently returns numeric `clock.epoch` and `entityId:null` and declares the
yacht unavailable. It does not yet provide a yacht host session/mapping. Y2's
**positive path is labeled `scope:"isolated-fixture"` only**. `scope:"core"`
returns `CORE_YACHT_ADAPTER_UNAVAILABLE` for the pinned descriptor; even a changed
available flag cannot bypass `CORE_HUMANS_Y2_ACCEPTANCE_NOT_RECORDED`. Production
is false on every path. This is an explicit proposed field mapping, not a claimed
C1 runtime registration. No server identities or rig offsets are guessed.

## Testing and receiving step

`test-helm.cjs` uses the exact bundled Three.js runtime and exact R7 GLB. It tests
new geometry, finite faces, mount triangle linkage, cardinal/tilted transforms,
rigid inverse/normal math, frame/lifecycle/clock/world failures, mode switching,
source preservation and original Y1 unavailable endpoints. Authorized CI also
loads unmodified pinned H2 transform and owner readers using its exact lockfile
(three 0.180.0, npm ci --ignore-scripts --omit=dev). That proves a receiving
transform stamp and preserves H2 negative gates, not full human pose acceptance.

`verify.py` records the actual original host in normal rendered turning/bobbing,
plus explicit deterministic transition scenarios, pause/reset and Bay switching.
Independent Three.js rays cross-check each new face. Source controller regression
runs compare observer off/on exactly. Existing 35 Y1 and 22 controller tests remain
unchanged. Software-rendered captures are not a smooth consumer-hardware benchmark.

Smallest combined-candidate step: CORE supplies the accepted yacht host
instance/session/world/clock registration; HUMANS maps these five reviewed
surfaces through its reviewed rig offsets, then its existing single-captain factory
is exercised against this station on the exact isolated candidate. No whole-host
replacement or new human worker is needed. Deployment remains CORE's decision.
