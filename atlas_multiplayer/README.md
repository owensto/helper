# Atlas D multiplayer — Chat 3

**Status: isolated transport/client candidate, NOT live multiplayer.**
Branch: `atlas-d/multiplayer-chat3`, PR #2, exclusive `atlas_multiplayer/**`.
CORE owns the coupled simulation, captain, shared host and integrated publication.
No production frontend, controller, yacht, human, workflow or deployment is changed.

## Evidence and blockers

M1: 18 room tests + 12 real TCP/WebSocket tests passed. A flood test exposed repeated
close listeners; idempotent shutdown fixed that warning. See `evidence/m1/report.json`.

M2: 58 diagnostic tests pass: 18 room, 12 transport, 18 client/contract/interpolation,
and 10 actual-client-module tests over real sockets. These tests use an explicit
TEST-ONLY adapter to the already-installed Playwright bundled ws. This is actual
TCP/WebSocket traffic, not a socket mock, but **NOT ws@8.22.0 certification**.

The exact pin remains `ws@8.22.0`. Upstream release existence is verified; registry
installation fails `EAI_AGAIN`, no lockfile has been fabricated, and audit is not
passed. Docker intentionally requires the missing npm-generated lockfile. The
release gate cannot pass just because diagnostic tests do.

Two independent Chromium processes launched, but first localhost navigation was
blocked by `ERR_BLOCKED_BY_ADMINISTRATOR`. The managed URL blocklist was inspected
read-only; it was not disabled or bypassed. **Zero browser motion checks passed.**
UI, independent-browser motion, actual Sea Lab 12 regression and HTTPS/WSS/public
acceptance remain unverified. Railway discovery reports not installed; no account,
permission, service or paid capacity was added.

## Authority and CORE C1 correction

The first target is private 2–8-player cooperative rooms, one locally owned vessel
per player. Server ownership/membership and finite transforms are not anti-cheat.
Remote boats interpolate received transforms; they never run another physics step.
Shared collisions, damage, crews, persistence, public matchmaking and character
payloads are not implemented.

CORE C1 comment 6208194629 supersedes the earlier shared-physics-clock proposal:
physics time is **per-client, resettable simulation time** with an explicit epoch.
Network server timestamps serve ordering, latency, stale detection and interpolation
only. `transportRoomAgeSeconds` is diagnostic network age, not a wave/physics clock.
No network time callback is supplied to the host's preparation hook. Identical world
revisions do not synchronize water phase. CORE still owns time, water and weather.

C1 candidate `sealab12-core-integration/1.0.0` is a receiving contract under review,
not a completed integrated release. Its source descriptor/host-hook blobs inspected
were `30affbbcc2b04d8b8e78a07206cb9eab9c2af2f7` and
`e6e5cc62579b7d94404a106413d2c73ac3639319`; verify the owner's final candidate SHA
before wiring. The host's dynamic `sl12-c1-sha256:...` world revision, reset epochs,
read-only reader, local-only opaque restore capability, and spawn occupancy checks
must be mapped in a separate receiving adapter. This candidate does not invent that
agreement or blindly import Sea Lab 11 globals.

Yacht design ID `atlas-d-original-r7` must keep its own controller/footprint and
unknown-depth semantics. C1 says its integrated adapter/spawn/restore are unavailable;
there is no Bay fallback. Human task `01a142ed-0182-71c4-9393-7bdfe248f0fe` owns
`atlas_humans/**`. Agreed future direction is server player/entity identity plus
vessel-local character metadata, with human-owned schema/animation/attachment
revisions. Networking characters remains disabled pending CORE/HUMANS acceptance.

## Generic adapter: default off, no old-host mutation

`client/core-adapter.mjs` takes explicit host hooks. It creates no socket, timer or
host call when `enabled:false`. The host supplies:

- `readLocal() -> {vesselId, pose}`: a copy from the owning controller/render transform.
- `prepareLocal(context) -> Promise<boolean>`: safe local spawn/reconnect acceptance.
  Honor `context.signal` and reject unsafe placement. Do not deserialize a remote
  payload as a local restore capability. CORE retains all local writes.
- `exitLocal(reason)`: clear session-local presentation and perform only owner-approved
  local cleanup. No automatic rewind of time, fuel, damage or controller state.
- `renderRemote(peer)` / `removeRemote(entityId)`: render-only hooks, no remote stepping.
- Optional `networkStatus(info)` for honest UI status.

The host's existing frame loop calls `adapter.render()`; the networking adapter does
not create a physics/render loop. Different vessel identity during a session rejects
publication and requires leave/rejoin instead of applying the wrong controller.

`client/invite-controls.mjs` mounts scoped, nonmodal guest/create/join/leave/invite
controls. Untrusted names use textContent, not HTML. Invite credentials are in URL
fragments; reconnect tokens stay private in memory, never share links or localStorage.
An invite cannot change the configured socket endpoint. The UI is implemented but
browser navigation policy currently blocks visual/interaction certification.

Interpolation buffers at most 32 samples per peer, uses a 150 ms delay and shortest-
arc quaternion interpolation, and never extrapolates physical motion. Disconnected
or stale peers are marked and missing roster entities removed. Reconnect preserves
identity/sequence and delegates restoration explicitly to the host. Cancelled async
host preparation must not resurrect a left session.

## World / transport protocol

`shared/world.mjs` defines `atlas-net-2` and immutable descriptor validation. There is
no default Sea Lab 11 world. Server and client must agree exact canonical SHA-256 of
scene/config, axes, clock semantics, fixed weather, water/depth semantics, vessel
controller/footprint revisions and owner-validated spawn records. Any fingerprint
mismatch rejects the handshake even if the short worldRevision string matches.

The descriptor's approval reference is an operator-supplied audit pointer, **not**
proof that the referenced comment grants acceptance. No approved production world
is shipped. Numeric/nonduplicate fixture positions do not certify hull clearance;
CORE must provide real per-vessel occupancy/depth validation. Missing yacht spawns
remain absent, not guessed. Weather/profile changes require a fresh matching room;
there are no pause/map/weather/character control messages on the wire.

Local pose is `{p:[x,y,z],q:[x,y,z,w],engine:boolean,rpm:number,gear:-1|0|1}`.
Units are SI; local +X forward, +Y up, +Z starboard; quaternion XYZW comes from the
actual render transform, not a guessed Euler mapping. Server playerId/entityId are
separate from vesselId (design/controller identity). Receive-only numeric pose data
must never contain controller objects or write capabilities.

The first message includes protocol, create/join/resume action, name, worldId,
worldRevision, worldHash, vesselId; join adds roomId/key, resume also playerId and
private resumeToken. `state` contains only increasing `seq` and own pose. Server
assigns slot/entity identity and configured spawn; clients cannot write another boat.
Room snapshots arrive at 10 Hz; local publication is bounded to 20 Hz. Each socket
has finite payload, rate, heartbeat, timeout and slow-consumer bounds. Rooms are
in-memory, expire and require one replica; process restart loses rooms.

## Reproduce on an existing permitted runner

With registry access, generate/review the real lock and verify installed artifacts:

```sh
sh atlas_multiplayer/scripts/verify-clean-install.sh
cd atlas_multiplayer
npm run test:release
npm run test:browser  # existing Python Playwright + permitted Chromium required
```

`verify-clean-install.sh` runs npm lock generation, clean install, metadata checks,
audit and tests. Review and commit the resulting lockfile with its actual registry
integrity. Never check a guessed lockfile into this branch.

For explicitly qualified local diagnostics with an already installed compatible bundle:

```sh
cd atlas_multiplayer
export ATLAS_DIAGNOSTIC_BUNDLE=/absolute/path/to/playwright/driver/package/lib/utilsBundle.js
node --import ./tests/diagnostic-register.mjs --test tests/*.test.mjs
python tests/browser-evidence.py
```

The browser script launches two separate Chromium processes and covers motion,
invites, reconnect/stale state, leave, cancellation, identity and fixture feature-off
regression. It masks private invite fields in screenshots. It does not change browser
policy or download a browser. The fixture is a labeled flat-plane linear-motion test,
not Sea Lab 12 or a replacement boat simulator. Fixture regression is not integrated
single-player proof. Actual C1 receiver tests and integrated desktop/phone runs remain
a separate gate owned jointly with CORE before any publication.

Production startup requires explicit `ALLOWED_ORIGINS` and `ATLAS_WORLD_CONFIG` JSON
path. Production rejects the fixture unless an explicitly test-only constructor is
used. No test server/debug endpoint is included in the production container. No live
server or public multiplayer URL exists from this workstream.
