# C2-BAY-HELM-01 — Bay physical surfaces and host bridge

## Provenance and independent owners

Baseline public host: `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`.
Final C1: `36903985f2182c902427fed77d4e28c61a7639ca`, `sealab12-core-integration/1.0.0`.
Branch `atlas/core-c2-bay-helm-20261016`; snapshot workdir `/mnt/data/core-c2-bay-helm-20261016`.
Only this directory and `.github/workflows/atlas-sealab-12-c2-bay-helm.yml` are reserved. Original host, C1, yacht, HUMANS and multiplayer files are unchanged. No release or merge is performed by this workflow.

Exact early physical input: commit `9a9c12645a1fe55f077f880c3e3b2403c18c4410`, raw contacts.json SHA256 `cc2a82dc89e3abfee8fd6a7d5def9dd153da179abb4c834dc91b09924d237f58`. These contact bytes remain immutable for HUMANS calibration. H3/H4 corrections, offsets, rig and profile acceptance belong exclusively to HUMANS; their early calibration is not permission to activate a rig.

## Geometry

Five finite patches are clipped from actual indexed original Bay triangles: one cushion, two wheel-rim grips and two non-slip deck supports. Seed faces, barycentric coordinates, local frames and finite extents are published. Source triangles, not infinite tangent planes, determine support. Wheel patches follow the evaluated original steering geometry. No camera/root/pivot is promoted to a physical contact. The debug overlay draws those exact clipped triangles without changing the boat asset.

Source binding rejects changed position/index references or selected values, hidden/reparented surfaces, changed local node transform, singular/reflected/scaled world matrices. Contacts represent geometry only; they do not establish pelvis/wrist/ankle positions, finite body clearance or a calibrated human.

Occupancy is one seated Bay captain at the original root with both bolsters fully down. Ejection, destruction, airborne state, detachment, unsupported roots, changed identity or missing source geometry invalidate it. Camera-only concealment is not lost support. Yacht, conversion occupancy, walking, multiplayer and crews remain unavailable.

## Clock and private context

CORE accepts `c1-humans-map/1` and the ordered SHA256 epoch formula in inputs.json. The adapter issues a private frame serial in a wrapper of the existing render boundary; C1 has no native committed-frame API. There is no second RAF, clock or vessel step. Private runtime/instance IDs and live object references are registered outside any incoming sample; global observations omit raw private IDs. The resulting epoch is an identifier, not authentication.

A current frame must match independent world/design/instance/station/model/contact/profile/activation/clock and motion. First acquisition or context change resets with dt0. The same frame never updates the receiver twice; changing its contents rejects. Each new frame consumes real host seconds once, including a last advance into pause. Two paused endpoints do not prove an unobserved interval was paused.

**Forward gap >0.1s:** hide with HOST_TIME_GAP_REBASE_REQUIRED; do not clamp or update balance; only a newer trusted frame can reseed/reset at dt0. No catch-up debt. **Backward same-epoch time:** retain the trusted time high-water through hiding. 20→1→2 in the same epoch stays invalid; a new host epoch permits reset. Rejected inbound large frame IDs cannot poison the private replay barrier. Simulation epoch is independent of activation lifecycle and transport identity. Roll/pitch use renderEulerYXZ[0]/[2]. Acceleration is explicitly unavailable: this slice approves reduced roll/pitch balance only, not measured acceleration response.

## Gated candidate

prepare.py rehashes all 104 original host files, final C1 hook and descriptor, and exact contacts. A new candidate manifest covers all generated modules and source assets. The entry contains that manifest digest; external build.json hashes both entry and manifest and every asset. Only the generated entry differs from the original host at this checkpoint. Unchanged code is not relabeled as a new public release.

Current build is **physical/clock only**. The original procedural SEA12_CAPTAIN remains. `C2_REQUIRE_HUMAN=1` fails closed without corrected HUMANS SHA, accepted rig/profile digest and receiving ACK. Partial receiver plumbing is not a production API agreement. Positive bootstrap will be enumerated and retested only after matching owner inputs.

## Reproduction and evidence

Run `python atlas_sealab_12/integration/c2-bay-helm/prepare.py`, then `node atlas_sealab_12/integration/c2-bay-helm/test-receiver.cjs`. Serve `/tmp/atlas-c2-bay-helm/site` on loopback 8936 and run verify.py with TEST_DEVICE=desktop and phone in an authorized browser environment. The local managed-browser denial was not bypassed; existing permitted CI executes rendering.

Geometry tests use the actual pinned GLB. Clock unit contexts are explicitly synthetic, not real private registration. Browser tests use the actual host engine, controls, waves, captain and lifecycle. Continuous source-linkage checks do not imply skinned human contact. Positive human tests, full-body clearance, biomechanical validity, physical-phone performance and combined acceptance remain separate gates. Read actual results rather than inferring success from these entrypoints.
