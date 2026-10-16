# ATLAS D attachment/contact contract — Y1

**Status: proposed, isolated, not accepted or wired into CORE's shared host.**
Receiver: CORE + existing HUMANS worker `01a142ed-0182-71c4-9393-7bdfe248f0fe`.
CORE owns coupled runtime, current captain, shared world/time and integrated release.
This module creates no humans and implements no walking, inverse kinematics,
networking, collision response, vessel integration, or independent clock.

## Identity and source audit

Vessel ID: `atlas-d-original-r7`. Immutable source:
`48b9bef038ab2e422b6677d7ca9db4879419a3f9`.
Original GLB SHA256:
`b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48`.

`inspect-anchors.py` examines the actual GLB, all **195 named/group/mesh nodes**,
mesh triangles and metadata before defining the manifest. It finds the existing
`FIXED_Main_deck`, `MOV_Shell_Upper`, `MOV_Shell_Bridge`, and `MOV_Shell_Sky`
frames and reuses them without inserting or repositioning nodes.

There are **no semantic helm seat, hand, foot, steering-wheel or human anchor
nodes in this R7 asset**. Five stable endpoints (`helm.seat`, `helm.hand.left`,
`helm.hand.right`, `helm.foot.left`, `helm.foot.right`) therefore return
`available:false`, `NO_SEMANTIC_HELM_ANCHOR_IN_R7` and **null transforms/positions**.
`helmAttachmentAvailable` is false. A missing anchor never means vessel origin.
The older preview's bridge camera is a viewpoint, not an anatomical attachment.
Tender furniture is not a substitute for the superyacht helm. An authored,
reviewed helm station and receiving-owner agreement are still required.

## Coordinate and timing contract

Positions and depth: metres. Time: seconds. Angles: radians. Source is right-handed:
**+X forward, +Y up, +Z starboard**. Positive heading goes from +X toward +Z,
which is **negative** rotation about +Y. Do not assume a Z-forward character rig.
Matrices are column-major 4×4: `pointWorld = worldFromLocal * pointLocal`.
Quaternions are normalized local-to-world `[x,y,z,w]`, not WXYZ.

Each sampled vessel/deck frame supplies `worldFromLocal`, `localFromWorld`,
world position and XYZW quaternion. Decks additionally supply `vesselFromDeck`.
Deck frame origins remain the original source group origins; they are **not**
a floor height or invented seat datum. Contact results supply the actual point
in world, vessel, source-mesh and named deck coordinates.

The caller evaluates animation, vessel pose and `matrixWorld` **once through its
own current runtime**, then provides one atomic frame. `capturePose` only copies
already-evaluated matrices and ancestor visibility; it does not update them.
The adapter has no timer, requestAnimationFrame, physics step, prediction,
interpolation or derivative-based velocity estimate. Velocities explicitly return
`NOT_PROVIDED_BY_HOST`; HUMANS must use agreed host kinematics, not difference an
independent yacht clock.

Required owner-frame fields:

```js
{
  vesselId: 'atlas-d-original-r7', activeVesselId,
  sourceAssetSHA256, instanceId, activationEpoch, frameId,
  simTimeSeconds, mode, conversion, depthM,
  bottom: { known, waterDepthM, clearanceM }
}
```

`capturePose(model, vesselGroup, ownerFrame, manifest)` adds `worldFromVessel`
and copied `nodes[name].worldFromLocal/visible`. The instance is owned by the
host. The host increments `activationEpoch` on replacement/switch away-and-back,
and `frameId` on evaluated frames, even if paused simulation time is unchanged.
The adapter does not infer a lifecycle from elapsed time. Matrices must be finite,
proper rigid affine transforms, with world translations within ±100,000,000 m;
singular/reflected/non-unit-scaled inputs are unsupported. Missing node poses,
asset mismatch, inconsistent phase/depth/conversion, missing frame identity,
and malformed bottom knowledge return explicit unavailable reasons.

## Narrow API

```js
const geometry = AtlasDVesselContact.readSourceGeometry(model, manifest, exactAssetSHA256);
const adapter = AtlasDVesselContact.createAdapter(manifest, geometry);
const frame = AtlasDVesselContact.capturePose(model, vesselGroup, ownerFrame, manifest);
const sample = adapter.sample(frame);
const contact = adapter.queryContact(frame, {
  expectedFrameToken: sample.frameToken,
  regionId: 'foredeck.port.patch',
  pointWorldM: [x, y, z],
  maxAboveM: 0.25, maxPenetrationM: 0.10
});
// Check against the owner's CURRENT frame before applying a cached result:
const stillCurrent = adapter.matchesCurrentFrame(contact.frameToken, currentFrame);
```

Outputs are detached/frozen value objects. `sample.available` means the vessel
frame is usable, **not** that helm attachments or every deck contact are usable.
Always inspect endpoint/region availability. No controller inputs or source
nodes are mutated. A frame token contains vessel ID, instance, activation epoch,
frame ID and host time. Stale/missing tokens are rejected. The receiving owner
must supply the *current* frame; this stateless adapter cannot authenticate a
caller that deliberately reuses its old frame and old token together.

## Supported regions and phases

Only three explicit inset patches are candidates, all using **actual existing
source triangles**, not a box covering the ship. `anchors.json` names their
mesh, primitive, X/Z bounds, source-local height band and allowed modes.

| Patch | Original source | Contact eligibility |
|---|---|---|
| `foredeck.port.patch` | `FIXED_Main_deck__Foredeck_landing_surface` | Surface or secured at the surface |
| `foredeck.starboard.patch` | Same original landing-surface mesh | Surface or secured at the surface |
| `bridge.aft.patch` | `MOV_Shell_Bridge__Teak_honey` | Surface yacht arrangement only |

The foredeck patches are inset from the edge and avoid the raised landing
markings. The bridge patch deliberately retains genuine plank/mesh gaps: a
point in a gap returns no contact. This is not a welded structural deck collider
or a guarantee that every point in a patch's bounding rectangle has support.

A probe casts along **source-mesh local down** into reviewed upper-facing source
triangles and returns signed normal distance, actual intersection, normal and
source triangle index. This handles curved foredeck ridges without projecting
into the gap between adjacent triangle planes. World slopes above 45 degrees
are unsupported. Above/penetration bands are limited to 0–0.5 m / 0–0.2 m.
No foot-radius, body clearance, friction, forces, snapping or joint solution is
implemented. HUMANS owns those decisions; this is a **point-contact query**.

During **securing/deploying**, source frame transforms still track the animation,
but all support is `TRANSFORMING_OCCUPANCY_UNSUPPORTED`.
During **diving/submerged/surfacing**, transforms remain available, but exterior
contact is `SUBMERGED_EXTERIOR_UNSUPPORTED`, including the zero-depth start of a
dive. No dry occupied interior is established. When secured on the surface,
bridge-deck support stays unavailable because packing/occupancy is unresolved.
Switching to Bay makes all yacht endpoints unavailable; returning requires a new
activation epoch. Cached contacts from before the switch do not become valid.

Bottom coverage belongs to the existing yacht controller. Unknown coverage stays
`known:false` with null depth and clearance. A surface deck contact can exist
without known sea-bottom coverage; it never supplies navigation depth or grants
a dive. The original controller's footprint and unknown-depth interlocks are
unchanged and regression-tested.

## Test/evidence boundary

`test-attachments.cjs` consumes the exact original GLB; synthetic rigid transforms
are clearly math fixtures. `capture-attachments.py` uses the actual pinned host,
actual source geometry and independent Three.js ray intersections, including
normal rendered turning/bobbing, conversion and switching. Its deterministic
host `testStep` scenarios are distinct from its normal-render-loop check.
`preview.html`/`preview.js` are diagnostic-only: an iframe observer draws SVG
markers, never a captain or a second simulation. Overlay frame counters are
render/lifecycle stamps, not a vessel clock.

The local browser currently blocks localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`;
no browser policy was changed. Browser captures run in the isolated branch's
existing GitHub test workflow. That branch-only workflow has no deploy, merge,
publication or repository push step and leaves its existing permissions block
unchanged. No CORE/HUMANS/MP files or host source change. Read actual evidence
reports for PASS/FAIL; this document alone is not test or integrated acceptance.

**Next bounded iteration:** review the receiving CORE/HUMANS descriptor and one
authored helm station, then supply semantic seat/hand/foot anchors against actual
reviewed geometry. Do not invent an occupied station or wire this proposal into
the shared host before that agreement.
