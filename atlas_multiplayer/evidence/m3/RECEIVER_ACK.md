# M3 receiving ACK — narrow contract, not integrated release acceptance

MP source parent `eff8ea71c76c867c58c37d21e06eff6057a17085`. Result is the commit
containing this record; PR #2 records that SHA without self-referential file hashes.

Consumed CORE C1 at `36903985f2182c902427fed77d4e28c61a7639ca`, revision
`sealab12-core-integration/1.0.0`; exact descriptor/host/HANDOFF blob references are
in `tests/owner-fixtures/c1-provenance.json`. Public baseline remains
`a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`. This ACK does not certify a later C1
result or its browser test. No CORE, yacht, human, host, workflow or release file
was modified; only MP's existing folder and branch.

## Accepted and implemented in the receiving boundary

- Server playerId/entityId binds one client-owned vessel instance; vesselId is the
  design/controller ID. Missing/empty/mismatched identity rejects. No character
  identity, skeleton, contact, animation or human networking is implemented.
- SI, local +X forward/+Y up/+Z starboard, world east +X/up +Y/south +Z, right-handed,
  column-major local-to-world/inverse, actual XYZW orientation. Cardinal and tilted
  synthetic cases pass. No old yaw sign, Bay controller or footprint is substituted.
- Dynamic C1 worldRevision is separately checked against its canonical world hash.
  Owner baseline and axes must match. Stale world invalidates the receiver; no
  remote boat remains accepted under an obsolete source binding.
- Per-client simulation epoch/seconds are data only. Protocol 3 transports them
  separately from server arrival timestamps. Paused equality is allowed; a newer
  epoch clears interpolation; same-epoch backward time/older epochs fail closed.
  No room-owned physics origin, water phase, frame loop, controller or wake step.
- Only the separate C1 reader enters MP. A full hook object containing `local`
  or spawn/restore capability rejects without accessing that capability. Received
  pose data is never a restore token. CORE owns safe local placement and recovery.
- C1's absent RPM becomes explicit null, not an invented zero-RPM observation.
- Yacht `atlas-d-original-r7` remains unavailable in this C1 boundary, preserving
  its own controller, footprint and unknown-depth semantics. No Bay fallback.
  Destroyed/ejected Bay samples require normal owner recovery, not arbitrary restore.

## Exact evidence and limitations

58 dependency-free tests independently pass. The whole diagnostic suite is 85/85,
including 27 real TCP/WebSocket tests against the existing test-only bundled ws.
Thirteen C1 receiver cases use synthetic snapshots whose shape was read from the
pinned owner API; they DO NOT execute the C1 host or certify real vessel motion.
The initial tilted quaternion assertion used exact float equality; normalization
changed only ~1e-16 rounding. The corrected orientation check uses 1e-12 tolerance,
while malformed transform/inverse tests still reject.

A protocol-level test transmits an epoch reset over actual sockets and confirms
remote interpolation does not glide between old and new small-displacement poses.
Separate tests reject inconsistent server sequence, same-sequence pose mutation,
and source-clock rollback. No clock is written to the host.

Exact ws@8.22.0 npm lock generation was retried and still failed EAI_AGAIN. No
lockfile or clean audit was invented. The previous two-Chromium attempt was blocked
by managed URL policy before any page loaded. No M3 browser/DOM/visual test ran;
no administrator policy changed. Existing npm/browser-permitted runner execution
is still needed. No hosting/account/permission/service was created.

## Deferred or requiring CORE-controlled integration

1. Freeze the actual C1 room world/config/weather descriptor and whole-room spawn
   contract. Numeric slots alone are not atomic geometry/occupancy reservations.
   CORE validates current water depth/conditions and per-vessel placement; MP cannot
   substitute an empty occupancy list for a known room collision check.
2. CORE supplies its local prepare/exit hooks and safe reconnect behavior. A local
   token is same-adapter/epoch-scoped and not serialized; spawn/restore invalidates
   prior tokens. General remote-pose restore and page-reload persistence are absent.
3. CORE must approve the active render-committed sampling phase and run the actual
   desktop/phone single-player regression with MP off/on. Generic fixture regression
   and source inspection are not that proof.
4. Close exact lockfile/npm ci/audit and two independent browser motion gates with
   existing permitted tooling. No public/live claim before those and CORE's integrated
   publication gate. Existing human worker remains the sole character owner.

Contract/negative-path ACK; production wiring, real C1 motion, integrated regression,
full pin/audit, independent-browser acceptance and combined release remain PENDING.
