# Atlas D multiplayer — Chat 3

**Isolated client/transport candidate. NOT live multiplayer.**
Branch `atlas-d/multiplayer-chat3`, PR #2, exclusive `atlas_multiplayer/**`.
CORE owns the coupled simulation, local placement/capabilities, captain lifecycle,
shared host and integrated frontend publication. No production frontend, physics,
yacht, human, workflow, account, permission or hosting change is made here.

## Current evidence / release gates

| Check | Result |
|---|---|
| M4 complete diagnostic suite | 105/105 PASS |
| Independently executed dependency-free subset | 62/62 PASS |
| Real TCP/WebSocket cases, including actual client module and host failures | 43 PASS using explicitly qualified test-only bundled ws |
| Exact ws@8.22.0 install, npm-generated lockfile and audit | BLOCKED: EAI_AGAIN; no lockfile or audit pass invented |
| Two independent Chromium processes | Launched in M2; first navigation denied by managed URL policy |
| Independent browser motion / verified screenshots | 0 passes / 0 screenshots |
| Actual integrated Sea Lab 12 single-player regression | NOT RUN |
| Public multiplayer deployment | NOT DEPLOYED; Railway not installed |

M1, M2, M3 and M4 reports remain under `evidence/`. M4 includes two real failing
regressions against unmodified M3 (escaped renderer exception and observer mutation),
then 16 passing callback-fault cases plus four pure presentation tests. The full
raw logs/source manifest accompany the conversation archive. These are fixture
host tests, not actual C1/Sea Lab browser execution. DOM/UI visual behavior is not
certified by the pure presentation tests.

Diagnostics use the already-installed Playwright bundled WebSocket implementation
via an explicit TEST-ONLY loader, with its hash recorded. They exchange actual TCP
traffic; they are not network mocks and are NOT certification of the pinned npm
package. Docker requires a real lockfile and therefore currently fails closed.
The browser blocklist was only inspected, never changed or bypassed. M3/M4 did not
rerun browsers. No unlaunched runner, paid capacity or public link is claimed.

## Authority and final CORE C1 receiving boundary

Target: private 2–8-player cooperative rooms, one locally owned vessel per player.
Membership/ownership and finite transform validation are not anti-cheat. Remote
boats only interpolate received poses; no remote physics, shared collision/damage,
crews, persistent accounts or character payload is implemented.

ACK `sealab12-core-integration/1.0.0`, final tested CORE source
`36903985f2182c902427fed77d4e28c61a7639ca`, owner comment 6208577721;
evidence-only `85af47f0853f57b53a7e7cd6249f843727a49141`.
Public baseline remains `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`.
Exact descriptor/hook/provenance references are in
`tests/owner-fixtures/c1-provenance.json`; MP's receiving ACK is
`evidence/m3/RECEIVER_ACK.md` and PR comments 6208814500 / 6208818331.
CORE's separate actual-host browser pass is not MP acceptance.

Accepted semantics: SI; right-handed local +X forward/+Y up/+Z starboard; world
+X east/+Y up/+Z south; actual render transform, column-major matrices/inverse and
unit XYZW quaternion. C1 physics time is per-client/resettable integer epoch plus
seconds. Arrival/RTT/interpolation timestamps and `transportRoomAgeSeconds` are
network diagnostics only. They never advance CORE's physics, water or animation.
Equal worldRevision does not synchronize water phase.

`client/c1-reader.mjs` accepts only the separate read-only reader with explicit
world/design/server player/entity context. Full hook objects exposing `local`,
spawn or restore capabilities reject. It checks baseline/world fingerprint, axes,
rigid transform/inverse/quaternion agreement, clock progression and recovery state.
Stale world or invalid owner state permanently invalidates the binding. C1 has no
RPM reading: unavailable RPM is null, not a fabricated stopped-engine observation.
Its 13 tests use synthetic C1-shaped snapshots, not a loaded C1 host.

The source SHA is an audit reference, not runtime authentication. Raw C1 provides
no independently trusted runtime/instance/frame serial: CORE must bind the actual
sampling phase and current-frame witness before activation. CORE alone validates
current safe placement, depth and whole-room occupancy. C1's local spawn checks are
not atomic multiplayer reservations. Remote poses and serialized tokens are never
accepted as local restore capabilities. No rewind of fuel, damage or time is added.

Yacht `atlas-d-original-r7` retains its own controller/footprint and unknown-depth
semantics; C1 yacht capabilities remain unavailable, never a Bay fallback. HUMANS
worker `01a142ed-0182-71c4-9393-7bdfe248f0fe` owns `atlas_humans/**`; current C2/H4
contact/profile work and character identity/animation remain separate. MP does not
duplicate their rig, contact solver, scoped animation clock or captain.

## Adapter and protocol

`createCoreAdapter` is inert by default: no socket, timer or host call when disabled.
When enabled, CORE supplies `readLocal`, `prepareLocal`, `exitLocal`, `renderRemote`
and `removeRemote`; optional `networkStatus` is diagnostic. CORE's existing frame
loop calls `adapter.render()`. There is no additional render or simulation loop.
Join/reconnect explicitly asks the host to accept safe local preparation with an
AbortSignal. Unavailable or switched vessel identity rejects instead of coercing
another controller. Leave/dispose are idempotent; disposed adapters cannot reconnect.

`shared/world.mjs` defines **atlas-net-3**. No legacy Sea Lab 11 fallback exists.
Server/client require the same canonical world SHA256 binding scene/config, axes,
clock semantics, fixed weather, water/depth, vessel controller/footprint revisions
and owner-validated spawns. The approval-ref field is an operator audit pointer,
not proof of agreement. No approved production world JSON is supplied. Fixture
positions and numeric bounds do not certify hull clearance or atomic occupancy.

A pose is `{p:[x,y,z],q:[x,y,z,w],engine:boolean,rpm:number|null,gear:-1|0|1}`.
Server playerId/entityId identifies one instance, separate from vesselId/design.
State includes increasing `seq`, own pose and source clock. Core worlds require
`{domain:'client-simulation',epoch,seconds}`; fixture null clocks are allowed until
a real clock is supplied. Same-epoch backward seconds, older epochs and dropped
known clocks reject atomically. A newer epoch may reset time and clears remote
interpolation, even for a small placement change. Client-side replay checks also
reject changed pose/clock at unchanged sequence and inconsistent identity/slot.

10 Hz snapshots; at most 20 Hz local publishing; 32 interpolation samples/peer,
150 ms delay, shortest-arc quaternion interpolation, no physical extrapolation.
Disconnected/stale entities are marked; missing roster entities are removed.
Room/session keys, expiry, rate/payload bounds, heartbeat, ownership, reconnect and
slow-consumer checks live in `rooms.mjs` / `server.mjs`. In-memory rooms require one
replica and disappear on process restart. Tokens are not competitive authority.

Guest/create/join/leave/invite controls are separate, scoped and nonmodal. Names
use textContent; invitations use URL fragments; reconnect secrets remain in private
memory, never shared links or localStorage. An invite cannot change the configured
socket endpoint. No pause/map/weather/character commands are sent over the wire.

## Callback failures and honest cleanup

Only `prepareLocal` is asynchronous; other hooks and subscriptions are synchronous.
Hook references are captured once. Unexpected thenables are observed to contain
rejection and rejected as unsupported, never awaited in CORE's frame. Arbitrary
host side effects cannot be cancelled or rolled back. Required async hooks mark
cleanup uncertain even if their promise might eventually settle successfully.

Required read/render/remove/exit failures stop MP without throwing into the frame
caller. Cleanup attempts all hooks once; failed removal/exit sets
`cleanupIncomplete:true` and blocks rejoin with `HOST_CLEANUP_REQUIRED`. The UI does
not claim restored single-player or cleared visuals in that state; owner recovery
or workshop reload is needed. A failing optional status sink or subscriber is
disabled once with a warning while valid networking continues. Every subscriber
gets its own snapshot copy. Only bounded known error codes are exposed, never
arbitrary exception text. These are generic MP guards, not CORE/HUMANS code changes.

## Reproduce / remaining gate

On an already-authorized runner with registry access:

```sh
sh atlas_multiplayer/scripts/verify-clean-install.sh
cd atlas_multiplayer
npm run test:release
npm run test:browser
```

The script generates npm's real lockfile, clean-installs it, checks exact package
metadata, runs audit and tests. Review/commit that real integrity result; do not
manufacture a lockfile. Browser tests require existing Python Playwright and a
permitted installed Chromium, not downloads or policy changes.

Explicitly qualified local diagnostics:

```sh
cd atlas_multiplayer
export ATLAS_DIAGNOSTIC_BUNDLE=/absolute/path/to/playwright/driver/package/lib/utilsBundle.js
node --import ./tests/diagnostic-register.mjs --test tests/*.test.mjs
```

The browser fixture is a labeled flat-plane linear-motion scene, NOT Sea Lab or
boat physics. Its two separate Chromium launches test invites, motion, interpolation,
reconnect/stale/leave, cancellation, identity and feature-off regression. Successful
fixture evidence would still not prove actual Sea Lab single-player regression.

Production requires exact `ALLOWED_ORIGINS` and `ATLAS_WORLD_CONFIG`; test fixtures
are rejected by production startup. The test server/debug driver is not in the
container. Exact pin/lock/audit, independent browsers, CORE-approved world/occupancy
and actual integrated regression must pass before CORE's publication gate. There
is no live multiplayer URL from this branch.
