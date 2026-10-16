# H6 full-body clearance audit — rejected baseline

**Clearance FAIL in61/61 audited rendered poses. No corrected rig or playable profile is delivered.** H5 source `b84a980b0d86f247f216e1489d1dc4636875c884`, its sliding/reaching/released states and `materialLocked:false` are unchanged. H4 profile SHA256 `2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902`, accepted contact bytes, rig/clip files, vehicle geometry, controls and shared host are unchanged. `candidate.json` is versioned `bay12-h6-clearance-audit/1`, explicitly rejected/production-off/fullBodyAccepted:false.

The previous selected cushion/sole/palm checks are still valid at their stated narrow scope, but missed major garment/leg intersections. H6 does not turn those earlier passes into full-body acceptance. The H4 conditional LIMITED_CONTACT_REVIEW ACK remains diagnostic only and must carry these known defects; see PR1 finding6209679753 and CORE/reviewer6209768612/6209874952. H5's expanded contact region still needs its separate CORE acceptance.

## Reproduced defects before pose edits

All4,687 indexed skinned vertices and12,042 unique body mesh edges were tested at61 actual rendered poses against61 original Bay meshes/268,869 triangles. Nearby meshes were selected by the union of actual captured body bounds plus20mm; exact original node/primitive/accessor IDs and normalized source-geometry hashes are in `source-set.json`. Every one of its61 source identities was verified against the pinned original GLB. This includes the actual C2 seat/cushion, moving wheel, deck, console, seat frame, flip bolster, piping, hardware and nearby structure.

| Original source | Maximum closed-component interior witness | Poses with interior points |
|---|---:|---:|
| P02_grouped_detail_161_54 (node138) |68.095mm|61/61|
| P02_flip_bolster_cushion001 (node148) |44.293mm|61/61|
| P02_grouped_detail_161_50 (node137) |12.419mm|61/61|
| P02_bolster_support001 (node147) |9.817mm|61/61|
| EX_Seating__piping |6.998mm|61/61|
| P02_grouped_detail_161_55 (C2 cushion node139) |3.309mm|61/61|

The worst baseline point is actual skin mesh0/index17, fully weighted to left thigh, at vessel-local `[-1.677552809,0.969731752,0.095463069]`. Six worst baseline witnesses were independently reconstructed with **zero position difference**, then tested by Three.js mesh raycasts in three directions (odd1/1/1 counts each). Independent brute-force nearest-triangle distances agreed with the BVH at <3e-16m in this deterministic calculation. These tiny numerical differences are cross-checks, not claimed physical measurement accuracy. `baseline-witnesses.png` marks actual points cyan and actual intersected source meshes red; no collision proxy or invented geometry is drawn.

Body-edge intersections also occur at the wheel and open seat fabric. Signed penetration is deliberately unavailable for open components. Of61 source meshes,33 are topologically closed;28 are incomplete. Combining both original wheel material meshes without changing any triangles still leaves104 boundary edges and five open components out of six; their relative frames were identical at all61 snapshots. Thus material splitting alone does not supply a closed wheel solid.

## Gates and receiving interface

`src/clearance.mjs` builds a read-only triangle BVH and audits connected components using1µm coordinate welding for topology only; actual triangle positions are never welded, inflated or repaired. For a closed consistently wound component, three non-axis-aligned rays must agree on odd parity before an interior witness is reported. The depth is the nearest triangle distance within that component. Each witness retains source triangle/barycentric/component and vessel-local closest point. The maximum individual component depth is not a minimum translation to escape the union of overlapping components.

Provisional review gates in `source-set.json` require ≤1mm interior depth for ordinary structure, ≤3mm for the original soft cushion, and no unreviewed body-edge/source-face crossing. A2mm minimum **vertex-sampled** surface separation is required for ordinary structure; the intentional cushion/wheel contact sources have0mm margin. Vertex distances are conservatively capped at10mm; sources omitted from sparse rows have a5mm lower bound. These gates are diagnostic proposals, not new owner-approved compliance volumes. In particular the3mm cushion allowance does not whitelist unbounded whole-body edge crossings. All61 policies keep `solidInterpretationAccepted:false`.

`readClearanceSample(packet, independentlyCurrentExpected)` binds body/source-set revisions, vessel instance, activation, simulation epoch, exact frame ID/time and complete unique source coverage. Missing/stale/duplicate/invalid samples return unknown. Measured threshold violations return fail. Open or semantically unaccepted solids cannot return sampled-pass. Even a fully specified passing synthetic sample returns **fullBodyAccepted:false /productionEnabled:false**. This is an interface for owner receiving diagnostics, not attestation, a live sensor, collision response or a new activation route. Packet values cannot establish their own current context.

All existing input/physics/control ownership stays with CORE. The appropriate next boundary is a diagnostic rejection/unknown result carried by its current receiving path; there is no automatic wiring or replacement captain in this patch. The detailed oracle costs697–1,012ms per pose offline on this Mac and is **not eligible for the render loop**. A future runtime implementation needs reviewed collision solids, a narrower broad phase/proxy strategy, a measured budget and coupled validation.

## Bounded alternatives rejected

Only after reproducing the baseline, six explicit static pelvis offsets were tested with the same rig/solver, original feet, original hand targets and torso pitch0.8. These are stored exploratory inputs, not changes to H4/H5 bytes or candidate activation. All failed the original5mm joint residual and sole-support gates:

| Pelvis shift X/Y, m | Max joint error, mm | Lowest sole above deck, mm | Worst interior witness, mm |
|---|---:|---:|---:|
|0 /0.06|50.81|45.61|75.20|
|0.04 /0.06|33.52|30.61|71.68|
|0 /0.10|86.65|78.01|78.54|
|0.04 /0.10|70.03|64.04|78.79|
|0 /0.14|122.82|111.24|77.23|
|0.04 /0.14|106.83|98.21|79.79|

They were rejected at the static gate, not promoted to full-motion testing. This bounded search does not prove no pose can fit; it proves simply lifting this pelvis is not a valid repair while preserving the supplied contacts. No limb stretching, hidden control restriction or tolerance relaxation was used.

## Actual motion and limits

A fresh real-browser normal-RAF run recorded653 rendered frames over15.0161s, full authored wheel±3.3rad with peak3.96rad/s, roll±0.08/pitch±0.06/heave±0.12m. Original H5 hand kinematic bounds, pause/reset/ejection/reentry and narrow support gates pass. Max IK residual0.00229mm; valid palm probe≤2.956mm; selected cushion probe within1.148–1.934mm penetration;84 sole witnesses2.069–5.827mm above source, minimum patch margin5.958mm and zero missing source rays. This demonstrates why those probes alone cannot certify the rest of the body.

Wrist acceleration≤10m/s², angular speed≤4.23rad/s and finger blend≤4/s are checked over every recorded frame. Body snapshots include all internal hand phase transitions (t0,0.0334,0.7s) and periodic poses with maximum gap0.2833s. Every audited snapshot fails clearance. This is discrete coverage, **not swept collision safety**. Whole H5 character CPU p953.9ms excludes renderer/body/ray diagnostics; the offline clearance cost above is separate. No60FPS/full-host claim.

Raw `motion.webm` is30.64s and includes geometry-export startup and post-capture serialization at the final pose. Only the15.0161s normal-RAF interval is counted. `motion-excerpt.webm` is a labeled derivative of raw video seconds6–21, and `motion-sequence.png` samples that portion; the raw video and all per-frame timestamps remain available. Witness screenshot and motion filmstrip were visually reviewed. No actual C2 host lifecycle/physics, yacht state or multiplayer transport is claimed.

The oracle can miss coplanar overlap, source-edge/body-face-only intersections, enclosed obstacles without body-edge crossing, or collisions between snapshots. Body self-collision, garment compliance and contact forces are untested. Topological closure and ray agreement are not a non-self-intersection or owner collision-participation proof. These limits prevent a full-body pass, but do not erase the independently reproduced deep intersections.

## Exact missing owner inputs / next decision

The visual geometry exists. The missing contract is the independently current C2 seat/flip-bolster articulation, visibility and collision participation for each manifest source; watertight wheel/other collision solids or explicit sheet semantics; source-bound allowed contact/compliance volumes for pelvis/thigh/palm/fingers; and a reviewed seat-foot support/occupancy configuration. The current baseline uses the raw model's original static seat/bolster placement. It is not a claim about an untested different host articulation. CORE should review the seat/foot configuration or provide an authorized alternative support before further profile fitting. No new footrest, collision thickness or seat geometry was invented.

H6 leaves activation blocked. A later owner-approved candidate must rerun full body clearance and support together over its actual coupled current frames, all motion/occupation transitions and device budget. Bay source/profile data cannot be reused for the distinct yacht geometry.

## Reproduction

From `atlas_humans`, prepare the existing pinned model with `python3 tools/prepare-h4.py`, install dependencies, and run `npm run serve`. Set `CHROMIUM_PATH` if this Mac's default browser path is unavailable. Run:

```sh
node tools/h6-motion.mjs
python3 tools/h6-verify-inputs.py
node tools/h6-audit.mjs
H6_ALL=1 node tools/h6-audit.mjs
node tools/h6-inspect.mjs
node tools/h6-probe-poses.mjs
H6_ALL=1 H6_CAPTURE_FILE=evidence/h6/pose-probes.json.gz H6_OUTPUT=evidence/h6/pose-probe-audit.json node tools/h6-audit.mjs
node tools/h6-wheel-topology.mjs
python3 tools/h6-contact-assess.py
npm test
node tools/h6-assess.mjs
```

The final command intentionally exits1 for the reproduced body-clearance failure; do not relabel it green. Unit suite:62/62 passes, including eight new oracle/receiver tests with closed/open/reversed meshes, thin obstacles, rigid transforms, source coverage, separation margins and stale identities. Exact source/rig/profile hashes, per-pose witnesses, all body captures, failed alternatives, videos and command logs are retained under `evidence/h6/`. Generated source triangle export stays in `/tmp/atlas-h6-source-geometry.json`; model data is read unchanged. Existing MIT rig/clip attribution remains applicable to the captured skin geometry.
