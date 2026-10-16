# C2-BAY-HELM-01 — isolated Bay contact review

## Lineage and ownership

Public host: `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`; reviewed source `5c62a713b014b97a47bb65b65ec05f382a23ac77`. C1: `36903985f2182c902427fed77d4e28c61a7639ca`, `sealab12-core-integration/1.0.0`. Branch `atlas/core-c2-bay-helm-20261016`; reconstructed snapshot workdir `/mnt/data/core-c2-bay-helm-20261016`, not a recovered Mac checkout.

Reserved: this directory and `.github/workflows/atlas-sealab-12-c2-bay-helm.yml`. Public host, C1 and all yacht/HUMANS/multiplayer-owned source files are unchanged. This workflow tests and preserves evidence; it never merges or deploys. Yacht remains unavailable and multiplayer off.

## Exact physical input

Published early at `9a9c12645a1fe55f077f880c3e3b2403c18c4410`. Exact UTF8+LF contacts.json SHA256: `cc2a82dc89e3abfee8fd6a7d5def9dd153da179abb4c834dc91b09924d237f58`. Station `bay12.starboard-helm`, design `atlas-bay-25-sealab12`, source model SHA256 `b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82`.

Five finite patches are clipped from the actual original indexed triangles: cushion node139/face1538; moving wheel rim node199/faces1144,165; non-slip deck node15/faces13,15. Source names, accessors, barycentric seeds, contact frames, normal/tangent axes and clipping bounds are in contacts.json. Physical surfaces are not rig joints. No camera/pivot origin, invented chair, whole-deck support box or source vertex edit is used. Query rays intersect only the clipped original geometry, not an infinite tangent plane or nearest surface across a gap.

One seated occupant only, with the existing captain root `[-1.6,1.06,.18]`, identity local rotation/unit scale and both bolsters down. Source identity/hierarchy/selected vertices and indices are monitored. Ejection, destruction, airborne state, detachment, changed root, stale context or missing geometry invalidate support. Camera concealment alone does not. No walking, underwater occupancy or whole-body clearance is approved.

## Mapping ACK

CORE accepts `c1-humans-map/1` and the ordered SHA256 epoch formula in inputs.json. Private runtime/instance UUIDs and live references are registered independently of samples. C1 has no native committed-frame API: C2 issues a serial at its wrapper of the existing beforeRender boundary, with no new RAF or physics step. World, model, design, instance, station, physical/profile digest, activation epoch, simulation epoch and motion are checked independently.

First acquisition and valid reacquisition reset with dt0. Consume actual host seconds once per distinct frame, not fixedStepSeconds. Repeated unchanged frame does not update the receiver; changed contents on the same frame reject. A final host advance into pause may be consumed; subsequent paused frames consume zero.

A forward gap greater than0.1s hides with HOST_TIME_GAP_REBASE_REQUIRED, then a newer trusted frame may reseed at dt0. No clamping, balance update or catch-up debt. Backwards same-epoch time retains the trusted high-water through hiding:20→1→2 remains invalid; a new owner epoch can reset. A forged incoming large frame cannot poison replay barriers. Simulation and activation epochs are distinct. Roll/pitch map from renderEulerYXZ[0]/[2]; acceleration is explicitly unavailable, so balance is roll/pitch-only.

## Exact receiver and scoped ACK

HUMANS H4 source `10ed9c2f8d0c392828f238e686bcc689517d34f9`, profile SHA256 `2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902`. PR1 owner ACK `6209504553` permits **C2 LIMITED_CONTACT_REVIEW only**, after CORE closure preflight. It does not authorize public/default/full-steering gameplay. Early failed profile07400fcb is never loaded. H5 remains separate existing-owner work and is not silently substituted.

Fixed owner applicability: height1.93m, torsoPitch0.8rad, gain0.15; absolute wheel/roll/pitch bounds0.1/0.08/0.06rad. Exact offsets, orientations, source contact and skin-probe tolerances remain unchanged. Out-of-bounds hides the rig, never clamps boat controls. Owner modules, rig, clips, profile and licenses are copied as immutable inputs, not edited.

The original H2 identity/cursor/publisher and throwing-diagnostic gaps were closed by HUMANS H3 and included in H4. CORE independently ran the unchanged final H4 suite44/44 in run38860655424. The earlier missing-Git-context preflight failure was a CORE extracted-snapshot setup error, fixed without owner-code edits.

## Factory, byte attestation and continuous checks

A supplied receiver/profile object cannot authorize construction. The loader checks a nonempty exact scoped ACK, independent entry/manifest fingerprint, every asset body, immutable module Git blobs and profile/rig/clip SHA256 pins. It returns a private one-use factory capability. The startup sequencer loads the same host Three.js instance and unchanged original35 scripts in order, installing the approved factory before the existing ensureDriver creates the sole SEA12_CAPTAIN. Without explicit `?bayHuman=1`, the original procedural captain remains.

Installation reserves before await. Physical disposal is registered immediately on acquisition; failed descriptor acquisition and even a throwing cleanup release the pending reservation. Receiver valid=false, hidden attachment or excessive/nonfinite residual never counts as accepted. Disposal restores only its own still-current callback and never overwrites a newer owner.

Each accepted rig frame must pass joint limits and actual finite-source checks for three fixed skin probes plus84 sole witnesses selected once with the exact H4 zero-time pose/skin-weight rule. Witnesses are not reselected per frame. Invalid physical traces hide and remain in evidence. This is diagnostic checking, not duplicate IK or human physics. Dense existing-host testStep traces and ordinary RAF evidence are kept separate.

## Manifest, reproduction and acceptance

prepare.py rehashes104 baseline assets, C1 and physical input. Only the generated entry changes among the original files. New candidate hashes cover startup/shim, hooks, contacts, profile and all owner runtime/assets. The entry pins the manifest; external build.json hashes both, plus every candidate file. `C2_REQUIRE_HUMAN=1` requires exact-source38 CORE preflight tests and44 unchanged owner tests before building the flagged branch.

The test-only workflow reproduces these gates and verifies both flag states on desktop1440x960 and phone430x932. Geometry/unit contexts and the accepted/rejected factory spy are labeled fixtures; their passes are not browser/skin acceptance. Browser checks use the actual host and one factory: map, controls, motion, contact corruption, invalid occupancy, gap rebase, ejection/recovery/reset and callback ownership. Synthetic impact injection is labeled lifecycle verification, not collision-performance evidence.

Read the final evidence record for actual outcomes. This document describes implementation and required gates, not a claim that the newly prepared flagged browser run passed. Limited contact acceptance, full gameplay/whole-body acceptance, public release and four-way integration are distinct. No physical-phone, smooth-frame-rate, biomechanical or seaworthiness certification is implied. The public application remains at the unchanged SHA above.
