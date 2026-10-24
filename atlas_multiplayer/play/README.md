# Atlas D Open Water — Crew 8 (P3)

Public **playtest source**, not eight-device production certification. Eight total
captains means one browser host plus seven friends. Use this commit's
`multiplayer.html`; older immutable links and room-1 invitations do not update.
Create room, copy/share one invitation, and each guest enters a name and presses
Join. Take the helm closes the lobby. No signup or local installation.

## What changed

An eight-seat color-coded roster shows host/self, connected/background/reconnecting
status, live occupancy and local round-trip latency. The same numbered captain
labels appear in chart view and above remote boats in 3D. Chart sailing remains
available after a graphics/model failure. The precise original 3D failure remains
unknown; native GPU/asset-delivery validation has not occurred in this environment.

A guest's transient connection drop reserves its identity, seat and last accepted
sequence for 30 seconds. Automatic retry is bounded and preserves the locally owned
boat rather than spawning a duplicate or applying remote restore commands. This
works only while the same page/Peer identity survives: refresh or an expired
reservation requires a fresh join. Resume keys are private in-memory handshake
capabilities, never invite links, roster snapshots, diagnostics or localStorage.

The host uses a seven-link star, not a full mesh. Pose snapshots publish at 10 Hz
and remotes interpolate 150 ms behind arrival. Stale boats are labeled, not
extrapolated. Backpressure skips old replaceable updates and eventually drops only
the affected link. A reproduced single-guest send exception formerly ended the
whole host room; it is now contained. Explicit leave attempts a short control-frame
flush; abrupt exit is bounded by reconnect expiry. There is NO host migration or
persistence. The host tab must remain open and visible. Optional screen wake lock
is user-triggered, not a guarantee against background tab throttling.

Browser transport still uses version-pinned PeerJS 1.5.5 and its existing public
signaling/relay defaults. There is no new account, service or paid capacity. Actual
public service uptime, TURN fallback and restrictive-network connectivity are not
certified. Data only: no microphone/camera requests. Peers may learn network
addresses; public signaling handles connection metadata. Client-owned cooperative
boats only: no shared crews, physics collisions, competitive anti-cheat or humans.

## Executed evidence

```
cd atlas_multiplayer
node --experimental-vm-modules --test play/tests/*.test.mjs
```

45/45 PASS, twice. The original 24 checks remain with version-2 hello fixtures,
explicit leave semantics, a fuller synthetic DOM, and an interpolation test that
waits for actual translated poses rather than merely roster length. Added cases
cover eight simultaneous adapters, 56 remote views, ninth rejection, reconnect,
secret/identity/replay gates, stalled peers, host departure, safe roster rendering,
and usable startup controls.

`tcp-eight.test.mjs` runs eight independent adapters and controllers over real
Node loopback TCP sockets. It verifies horizontally moving poses in all 56 remote
views, ninth refusal, same-identity reconnect without respawn, and seat release.
**It is not WebRTC, cloud signaling, eight browsers, GPUs, or eight devices.**
In-memory fault tests are separately named. Baseline red tests (2/2 failed) and
final/repeat logs are retained in the P3 evidence handoff.

No browser, alternate navigation, runner search, workflow/dispatch, policy change,
CORE/yacht/HUMANS edit or dedicated-backend deployment was performed. The earlier
Node/ws lockfile/audit and hosted-service gates remain untouched. This peer build
is separate from both that Node service and integrated SeaLab multiplayer.

## Remaining acceptance

Open the exact published revision on eight actual browsers/devices; verify the
public HTML/modules/model/library, real signaling/ICE and all 56 moving remote
views. Test invite copy/share, typed names, keyboard/touch, chart/3D, one guest's
network interruption, a full-room refusal, and host departure on different networks.
Record screenshots, browser errors, selected ICE route, session duration and actual
connected count; do not infer this from Node tests. Public static serving itself
must also be checked before calling this a verified live release.
