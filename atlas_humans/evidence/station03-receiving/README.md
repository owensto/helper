# STATION03 preliminary receiving review

Owner proposal: `c64a5aab845e70399aee930ea5ad87ed734fa8c0`, descriptor `core-bay-helm-station/3.0.0-proposal.1`, station `bay12.starboard-helm.station03`. Receiving baseline: `efa35e9d046e0d8176bf7669154b198f036c0232`. Readiness coordination: PR1 comments 6213116401 and 6213248126; receiving claim 6213268140.

Run from this Git worktree with its dependencies installed:

```sh
node atlas_humans/tools/station03-receive.mjs
```

The script reads immutable owner source through `git show`, executes only its geometry constructors with local Three revision 180, and passes those proxy meshes into the unchanged H6 offline topology oracle. It does not install the owner station, alter owner files, run a rig, invent joint offsets, or enable occupancy. Results: **31/31 preliminary checks pass**: all 25 authored collision meshes have closed topology under H6's 1µm weld, four complete finite rectangular support patches lie within their convex box proxy faces, a synthetic 4mm guard is closed and has 2mm midplane penetration, and the retained rig hash/disabled activation contract agree. This is not independently reproducing the owner's final runtime-generated hashes or proving a fitted body is clear.

`preliminary.json` records source SHA256s, every proxy topology/hash, support corners, rig/clip identities and a replayable branch-cut example. Design SHA256: `2e38a25a9cb15e3644eb6bf3295fc927340c19af139665b21f7f3df90ab89583`; geometry-source SHA256: `29b001a6a9bd0a8677c3a9c7bf5d20e13e1b149b6394bc32cf6adcb9c5397deb`.

## Receiving disposition

**ACK receipt and preliminary source review only. Exact final-package/fitting ACK remains pending.** The coordinator's explicit unresolved items remain: final generated source/manifest/geometry/ledger/contact-policy pins and actual browser outcome; circular grip membership, anatomical hand assignment and positive gap limit; whether back support is mandatory; reviewed retained closed-component identities or unknown-interior status; vessel-metre guard construction and separation boundary; and current survivor/new-part/support matrices tied to one independent host frame/epoch/activation/world context. Paused seconds alone cannot establish freshness.

No H4 offsets, H5 grip region or H7 controller automatically transfer. H6's old 61/61 intersecting poses remain evidence about the old station only. This proposal changes the collision domain. Old pose capture matrices must not be mixed with replacement geometry.

## Prepared clearance path and limits

After the complete owner package is explicitly ACKed, export the exact new station at its down endstop with all retained obstacles and both authored render/proxy representations. Bind model, rig, clip, new profile, policy, source ledger and source matrices to each pose capture. A new HUMANS profile can then be evaluated for seat, both soles, helm and whole garment together. Any negative H6 point/edge witness is useful immediately, with exact source/body indices and vessel-local matrices.

The existing H6 triangle oracle cannot provide positive acceptance here. Analytic torus/cylinder volumes extend beyond their inscribed triangle meshes; rounded render boxes require the larger owner OBB. Guard thickness must be constructed in metres, not scaled source offsets. Ordinary policy is **zero** penetration plus 2mm separation, distinct from H6's old default 1mm threshold. Compression applies only to complete eligible elements inside the finite seat/back/grip regions. Add reverse source-edge/body-face, coplanar/contained, self-intersection and conservative swept checks before any clearance acceptance. Until then these results must stay unavailable, even if sampled vertices pass.

No fit, live browser motion, frame-time claim, host integration, control change, deployment or activation was performed in this receiving checkpoint. Existing H7 motion evidence and timing remain unchanged; they do not certify this station.
