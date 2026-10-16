# H7 paused-input validation closure

Baseline worktree/source: H6 `417a3f86656c3e4094453a5dae9476a4e9cdc983`. Audited controller: H5 `b84a980b0d86f247f216e1489d1dc4636875c884`, SHA256 `0127ae03c524de171b453fdcc11bc0bb59b0205dab6003c0123018b23f8bf902`. Coordinator finding: PR1 comment6210103955. This is input/cache hardening only. **H6 body clearance remains FAIL; no fit, profile, geometry, control, activation or multiplayer revision is supplied.**

## Reproduction before implementation

`tools/h7-reproduce.mjs` extracts the exact unmodified audited controller with Git, verifies that SHA256, and places it in ignored node_modules/.cache/h7. The same three assertion bodies in `tests/h7-paused-input.test.mjs` execute against that pinned controller and the corrected module with actual Three.js0.180.0:

- After valid initialization, sample returns point `[NaN,0.1,0]` on an unchanged-time call.
- Finite shoulders/reaches change so cached hands are unreachable.
- Contact quaternion changes at the same point.

**Before:0 PASS /3 FAIL, exit1. After:3 PASS /0 FAIL, exit0.** Raw TAP and reproduction metadata are retained. These recreate the three explicitly described failures; the original coordinator's20-probe ZIP/synthetic vector spies were not fetched or represented as rerun. Our original controller bytes match its published hash.

## Behavior changed

Every candidate and every consumed `sample`/`closest` result must contain finite complete point/normal/quaternion vectors, unit normal/quaternion within1e-5, nonnegative safe triangle index and valid normalized barycentric triple. Sparse arrays are rejected. Malformed results throw `HAND_SURFACE_INVALID`; provider exceptions keep their original error. In both cases cached hands/context are cleared and the controller blocks until explicit reset/new epoch. No bad callback can fall through a NaN comparison into cached success.

Before an unchanged-time return, H7 compares copied current shoulder/reach values and the complete sampled source frame/witness with the last successful evaluation. Cached reach is also rechecked. Changed rig context returns `PAUSED_RIG_CONTEXT_CHANGED`; changed point retains `PAUSED_SURFACE_MOVED`; changed normal/orientation/triangle/barycentric returns `PAUSED_SURFACE_FRAME_CHANGED`. Each invalidates cached hands and blocks further acceptance in that epoch. The code never retains caller-owned arrays as snapshot evidence.

Numerical identity tolerances: point displacement1µm; shoulder/reach and normal components1e-6; barycentric components1e-10; normalized quaternion absolute-dot difference1e-12. Quaternion q and−q describe the same rotation and remain accepted. Stable pause is unchanged. A finite but different shoulder/reach context is rejected even if still reachable, because a new pose cannot silently inherit old contact validity while host time is frozen.

The existing clock/discontinuity/ejection rules, actual motion algorithm and constants, surface fit, arm/leg targets, finger motion and sliding/reaching/released meanings are unchanged. `materialLocked:false` remains mandatory. No region membership, mesh registration or source-frame attestation is inferred from shape validation.

## Regression evidence

**72/72 unit tests PASS** (62 previous +10 H7 tests, with multiple malformed-input subcases). Coverage includes the three failures, stable/antipodal pause, changed-but-reachable context, array aliasing, normals/witness changes, malformed candidate/closest/sample results on paused and advancing paths, sparse arrays, provider exceptions, invalidation and reset/new-epoch recovery. Original H4/H5/H6/owner-conformance tests still pass.

Actual browser regression:653 normal-RAF rendered frames/15.0161s, full authored±3.3rad wheel travel plus original roll/pitch/heave. Both the exact pinned H5 controller and H7 consume the **same current inputs** on every frame. Serialized valid results, including both hands' points/orientations/finger values/source/state/validity, are **exactly equal in653/653 frames**. Only H7's result drives the one existing fixture rig. The actual500-triangle region equality guard and pinned model/rig/clip/H4-profile hashes run before comparison. This is not coupled CORE gameplay or clearance acceptance.

The three injected faults also reject in this actual Three.js/browser scene, remain blocked on a following same-epoch call, and recover on a new epoch. Stable pause, changed-point pause rejection, reset, ejection clearing and reentry pass. Motion continuity/support checks retain H5's explicit narrow scope. Video and its actual-frame derivative were reviewed; they do not certify H6 body clearance.

New controller CPU p950.6ms in this run. The complete comparison fixture p954.7ms includes **both baseline and H7 controllers**, two rig evaluations and source sampling, and excludes renderer/skin/ray diagnostics. It is not a single-character production budget or a claim of overhead measured against an isolated baseline. No60FPS/full-host claim.

The first browser invocation stopped at navigation because the previous local server had ended between tasks. It executed no scenario. Restarting the isolated server resolved it; the completed run above has no page errors. No external/live app was accessed.

## Integration impact

The current CORE loader's exact H4 pins are unaffected. An eventual H5/H7 receiver must explicitly pin/review this new controller source; H4's LIMITED_CONTACT_REVIEW permission does not authorize it. Callers must treat any thrown callback error or returned invalid result as unavailable, hide/reject and propagate the reason rather than retaining prior positive output. Reset/reacquisition needs a fresh current context and dt0. **A controller reset/new epoch does not authorize replay or discard CORE's independently maintained high-water/current-frame policy.** CORE retains source-set/region membership, geometry/parent/transform, vessel/world/activation, current frame and owner approval checks.

Current-host inventory6210363841 also notes that fittings can continue moving while simulation time is paused. H7 validates the supplied hand frames and rig context; it does not replace CORE checks of independently current seat/bolster articulation and occupancy. Frozen seconds alone cannot certify an unchanged station.

No accepted profile, H5 candidate/region, H6 candidate/source-set, rig, animation, captain factory, source mesh or vehicle control changed. The known H6 intersections (61/61 poses, maximum68.095mm witness) and missing owner geometry/occupancy semantics remain unresolved; production/full-body activation stays OFF.

## Reproduce

From atlas_humans with dependencies installed:

```sh
node tools/h7-reproduce.mjs
npm test
# In another terminal: npm run serve
node tools/h7-browser.mjs
python3 tools/h7-assess.py
```

`CHROMIUM_PATH` can override the local default test browser. `h7-reproduce.mjs` deliberately expects before exit1 and after exit0, while returning0 only if both match. `h7-assess.py` requires every valid output comparison and all three browser rejection/recovery traces to pass. Detailed before/after logs, per-frame values, assessment, raw video and source/evidence manifest accompany this file.
