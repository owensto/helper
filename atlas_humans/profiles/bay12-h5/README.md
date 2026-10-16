# H5 release into sliding palm support — isolated candidate

This extends H4 `10ed9c2f8d0c392828f238e686bcc689517d34f9` with a tested **single release and re-establishment of sliding contact** over the real Bay wheel. It does not implement continuous hand-over-hand steering or transmit steering torque. `productionEnabled:false` and `ownerAccepted:false` remain mandatory. CORE has acknowledged separate seated/per-hand semantics, but has not accepted this expanded source region or a coupled H5 candidate.

The H4 profile and original C2 five-patch digest remain unchanged. `candidate.json` binds the exact H4 profile and `rim-region.json` byte digest. The latter lists all 500 selected actual source triangles, their vertices and face frames from original Bay GLB SHA256 `b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82`, node199/mesh147/primitive0, position423/index425. Selection is centroid radius in source YZ 0.13–0.16m, centroid X≤0, face normal X≤−0.05. The sampler reconstructs every contact from an original triangle and barycentric coordinate; it does not add a ring collider. Frozen witnesses, in-place position/index validation, and rigid source transforms reject source changes. This candidate extension does not silently broaden C2 `cc2a82dc…`.

The licensed Microsoft Rocketbox rig, clips, notices and original boat geometry are unchanged. H4's 1.93m rig and forward-leaning fit remain; ergonomics, full-body/garment/finger collision and joint torque are unaccepted.

## State and integration contract

`WheelHandController` owns only two hands. It receives independently current owner `time`, actual `dt`, string simulation epoch, frame ID, vessel-local shoulders, measured arm reaches, and read-only source candidates/sample/closest callbacks. It creates no clock, vessel state, scene object, network state or second captain. Root stays H4's direct boat child at `[-1.6,1.06,0.18]`, identity relative rotation/scale. Vectors remain vessel-local until the existing captain factory maps them once into rig coordinates.

Returned public states are:

- `sliding`: `contactValid:true`, `materialLocked:false`; calibrated palm probe within 3mm of an actual source triangle. This is geometric support, not a force-transmitting grip.
- `reaching` or `released`: `contactValid:false`, `materialLocked:false`. The source witness is the intended/current nearest surface, not a claimed attachment.

`phase` is an internal choreography diagnostic; do not publish it as grip validity. Finger blend is independent of validity and changes at most4/s so a free hand can still be opening. Wrist speed/acceleration are bounded visual motion, not human safety thresholds. One hand stays near a rear-rim search point; the other follows material briefly, releases before reach is exhausted, and settles into sliding support. Search points are preferences only; contacts always come from actual source triangles. Failure leaves no positive attachment claim. Neither both-hand nor single-hand contact is guaranteed outside the recorded envelope.

After explicit region/profile acceptance, CORE's existing receiving boundary can consume `state.hands` as follows:

1. Independently verify exact model, region, profile, rig/clips, station, vessel instance/world, activation and current owner frame. Use actual evaluated wheel `sourceToVessel`; never infer wheel motion from heading or change controls to keep hands reachable. Verify visual/occupancy context before calling this pure controller.
2. On acquisition/reset/ejection, reset the controller; first/reacquired dt must be0. Subsequent dt must match consumed host time once. Repeated time requires dt0 and unchanged sampled geometry. Changed paused geometry fails closed; explicitly rebase on a valid owner lifecycle boundary. Backward/same-frame-changed time and delta mismatch block until reset/new epoch; dt>0.1 rejects, never clamps.
3. On valid controller output, put vessel-local wrist targets into the existing attachment's leftHand/rightHand fields. Keep original calibrated seat/feet. Forward the full H4 `rigPose`, plus `handGrip:[left.grip,right.grip]` and `handContacts:[{state,contactValid,materialLocked,source},…]`. Orientations belong in rig-group space; H4's identity relative root makes them vessel-relative here.
4. The existing factory now forwards finger blend only with valid separate hand metadata and clears metadata on hide. `group.userData.attachmentValid` denotes the accepted seated/body sample; `group.userData.handContacts` separately describes hands. A free hand never becomes a valid grip through the body flag. Invalid callbacks/samples must hide the visual and propagate rejection through CORE's loader; C2's independently identified positive-path defects remain CORE-owned.
5. Call the preloaded existing rig once for the final pose. The laboratory uses a preliminary rig evaluation to measure current shoulders and a second final evaluation; its cost includes both. A production receiving boundary needs its own measured budget and lifecycle proof. No production registration or multiplayer transport is supplied here. Do not copy hand fields into the existing H3 packet without a separately reviewed protocol revision.

H4 bounded candidate authorization is separately recorded in PR1 comment6209504553 for exact10ed9c2/profile2d8f… only, conditional on C2 attestation/lifecycle corrections. It does not authorize H5.

## Reproduce and inspect

From `atlas_humans`, run `npm ci`, `python3 tools/prepare-h4.py`, then `npm run serve` in a second terminal. Run `npm test`, `node tools/h5-motion.mjs`, and `python3 tools/h5-assess.py`. `CHROMIUM_PATH` can select installed Chromium; the default is this Mac's recorded test browser. The model preparation reads hash-pinned Git objects. No live host or paid services are involved.

`evidence/h5/motion.webm` records the real normal-RAF browser sequence. `motion-sequence.png` is a six-frame derivative of that video; `motion.json` contains every rendered sample and exact source triangle witnesses. The final camera follows the vessel to keep hands visible; boat rotation/heave and wheel articulation still execute. The overlay explicitly identifies the isolated authored-motion fixture. This is not CORE's coupled gameplay or real sensor motion.

Final run:667 rendered frames over15.0161s, wheel reaches ±3.3rad with authored peak3.96rad/s, roll0.08rad/pitch0.06rad/heave0.12m. Valid palm probes ≤2.961mm from actual source, maximum IK residual0.00237mm. One cushion probe and84 sole vertices ray-tested against actual source each frame, no missing rays; minimum sole patch margin5.958mm; soles2.069–5.827mm above source, cushion probe1.148–1.930mm within the soft cushion tolerance. These are sampled surfaces, not whole-body clearance.

Maximum vessel-local wrist acceleration10m/s²; speed0.252m/s; angular speed4.23rad/s; finger blend4/s. Left/right measured contact fractions98.95%/94.75%; zero frames with both hands free in the final run. An earlier fully instrumented run had one16.6ms both-free interval, so this is not a guarantee of continuous single-hand contact. Pause equality, changed-paused-source rejection, reset, ejection clearing and re-entry passed on the actual browser controller. Unit tests separately exercise receiver forwarding/rejection and identity/time/source mutation cases. All54 tests pass.

Whole character work (source validation/candidate generation/controller/two rig evaluations): median3.2ms, p954.0ms, maximum6.8ms, against a provisional4ms p95 target. Final rig evaluation alone p950.3ms. Renderer, skin probes and85 diagnostic rays are excluded. Instrumented frame interval p9533.4ms; **this is not a60FPS full-game claim**. Remaining budget margin is zero and other devices/CORE runtime are unmeasured.

## Rejected attempts retained as findings

Fixed-material release alone lost both contacts554/902 frames. Forced surface-following variants kept contact but reached53–86m/s² wrist acceleration; a coupling/regrip variant reached109m/s² and lost both contacts212/902 frames. Broader triangle search alone did not solve discontinuity. Smooth pursuit with reattachment overshot the positive reach margin and was rejected. The delivered version deliberately settles into sliding support, limits translational acceleration and reports temporary surface misses as free. It does not relabel these earlier failures as success or lower the contact threshold.

Next receiving decision: CORE reviews the immutable500-triangle region and explicit sliding semantics; then an isolated coupled candidate can test real controls, actual clocks/occupancy, full lifecycle and full-host performance. Continuous material-locked regripping, less hunched posture, full-body collision, yacht-specific Y3 calibration and gameplay release remain open. YACHT geometry/region is distinct; Bay offsets are not portable.
