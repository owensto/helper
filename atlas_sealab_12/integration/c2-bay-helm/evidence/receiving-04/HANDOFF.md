# STATION03 receiving closure04: FROZEN only

Read/ACK coordinator6213248126 and HUMANS6213303827. Its31/31 checks establish preliminary receipt, not final ACK/fit. Base source **ba153f5d0b68391e4ac88e8a1e4a9d77fd60a069**, reviewed run38887422403; public/model/design/geometry and SETTLE02 remain unchanged. No host hooks, HUMANS, workflow, browser, fitting or deployment change is made.

## Reproduce from the existing receiving records

Use the already supplied `ATLAS_CORE_Station03_Receiving.zip`, SHA256 **a8d9e6f2601bae364f0848693c249eeb87aad23310c5ec8fb308581ecc5f2d11**. No new model/rig/clip/audio/geometry asset transfer is needed. Verify the seven committed payload hashes in manifest.json before execution:

```
python derive.py /path/to/ATLAS_CORE_Station03_Receiving.zip --out ./derived
CLOSURE_OUT=./derived node test.cjs
```

The JSON/GZIP metadata export is included in the conversation closure package; `frozen-export.recipe.json` binds its exact hashes and derivation. The recipe does not pretend to be a committed binary. The containing Git commit plus manifest SHA256 bind this closure without self-referential commit fields. Manifest binds committed sources and separately generated outputs. Two derivations were byte-identical. Runtime versions and full offline test results are in result.json.

## Five receiving decisions

**Grip:** theta=atan2(y,z) in the frozen wheel-rim frame. Circular difference is atan2(sin(theta-center),cos(theta-center)); absolute difference<=.25+1e-12rad. Port center pi is anatomical LEFT palm/fingers; starboard center0 is anatomical RIGHT, facing+X. Closed endpoints use only1e-12rad roundoff (<=1.81e-13m outer arc). The coordinator's negative-principal-angle example belongs to port. Analytic normal gap `hypot(x,hypot(y,z)-.165)-.016` must be **[-.001,+.002]m**:1mm compression,2mm positive gap. Outside values are unavailable even within the1e-7m numerical reporting band; no tolerance widening. Ambiguous torus-axis/centerline projection rejects. No cross-hand substitution, automatic regrip, full-range reach, throttle choreography or material lock is implied. Every contacting element must obey the assigned arc and other obstacles; the helper's single-point result cannot accept a body.

**Back:** OPTIONAL permitted contact. Seat and BOTH soles are required load supports in a later seated reference; a two-hand reference must evaluate both eligible grips. Absence of back contact is not a failure. Any actual contact still obeys the unchanged finite back patch/-2..+10mm interval/max2mm compression. Other back regions remain ordinary obstacles. Live hand release/throttle states require a separate profile/ACK.

**Retained interiors:** explicitly UNKNOWN for all130 survivor records, with closedComponentFaceSets:null. The ledger identifies356,774 retained faces but not exact approved closed-component face sets. Prior33/28 topology counts cannot substitute. All guards/collision participation remain; unknown is NOT empty or excluded. Negative witnesses remain usable; positive whole-domain volume clearance cannot pass. No topology/baseline audit is repeated.

**Guards:** transform original triangle vertices FIRST into vessel metres, recompute a unit normal there, then extrude/close +/-2mm. The reference helper preserves4mm thickness under scale/shear/reflection and rejects degenerate/singular inputs. Ordinary2mm separation is from the external union guard/solid boundary, not original planes, render chords or bevels. An isolated planar face therefore requires4mm normal offset from its original plane. Scoped NEW-part contacts cannot exempt another intersecting union member. This is simulator guard thickness, not vessel material.

**FROZEN state:** all original survivors use ledger restToVessel;25 new parts and four support frames derive from unchanged design/baked geometry. Both foot/legacy bolster stops0; wheel/throttle0; Neutral/power0/rudder0. Vessel-to-world identity defines a synthetic design world, not geographic or live host space. Frozen frame `station03-frozen-design/0` is a label, not a replay cursor. Host frame/time, simulation epoch, activation epoch, runtime scope, vessel/human instance are NULL; dt0, no time advancement. Any change requires a new export/world digest. Historical actual-host serial/time/UUIDs are provenance only. Pausing cannot grant current-frame authority. Original survivor CURRENT transforms remain unbound; no live-coupled acceptance is implied.

## Evidence and owner gate

15 derivation checks,39 pure contract tests and4 replay/negative-input checks pass. Reuse previous desktop/phone records only: new-part/support zero-control matrices agree with the frozen definitions within3.109e-15 numerical units. This is not new rendering, body clearance or a baseline audit. R14's Neutral lever failure, R15's empty-station pass, SETTLE02/H4's separate diagnostic passes and old H6 clearance failures remain distinct and unchanged.

Existing HUMANS owner must ACK exact closure source/manifest/export/contract plus original geometry/ledger/support and rig/clip pins, frozen-only scope and unknown-interior limits, or identify a precise blocker. No fit is dispatched. Human/full-body/gameplay/live/default/public activation remains OFF; no H5/H7, yacht, MP/M6, permissions/accounts/services or owner crossover. Stop after bounded publication.
