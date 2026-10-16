# Atlas D — Chat 3: multiplayer and live deployment

Status: multiplayer foundation; NOT a live multiplayer release.
Branch: `atlas-d/multiplayer-chat3` in `owensto/helper`.
Baseline: Sea Lab 11, commit `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8`.
The existing `atlas_sealab_11` and in-progress `atlas_sealab_12` files are untouched.

## Ownership / coordinator handoff

Chat 3 owns `atlas_multiplayer/**`: room service, protocol, networking client,
multiplayer-specific controls, session security, deployment and release verification.
This is a workstream ownership proposal, not an assertion that other chats have
already received or agreed to it. The coordinator should reserve this folder.
Physics and graphics remain with their existing owners. Do not introduce a second
physics engine here. Do not rewrite the existing renderer or helm controls.

The first release target is 2–8 people joining a private invite room, each driving
their own boat and seeing the others. Guest names first; registered accounts,
shared-boat crews, persistent progress and public matchmaking are later milestones.
Cross-boat collisions, damage, ejection and competitive scoring remain disabled
until server-authoritative physics has a separate validated implementation.

## Implemented in this slice

- A room/session lifecycle core with 192-bit invitation and reconnect tokens.
- Up to 8 seats per room, including disconnected seats reserved for 30 seconds.
- Stable player identity and last accepted pose on resume; duplicate active
  identities rejected. Explicit leave immediately frees the seat.
- Server-assigned ownership: a socket can only publish its own boat's pose.
- Version/world mismatch rejection, finite transform validation, sequence checks,
  bounded state rates, room expiry and host-label transfer.
- A Node + WebSocket transport candidate, 10 Hz room snapshots, heartbeat,
  4 KiB input limit, slow-consumer disconnect, explicit origin allowlist and health check.
- Container and Railway configuration candidates. No resources provisioned.

**The server controls membership, not the physical simulation.** Numeric validation
and ownership checks are not anti-cheat. Boat transforms remain client-authored.
The first prototype must be labeled cooperative / noncompetitive.

## Integration contract for physics and graphics chats

Sea Lab 11 already exposes `window.BAYPLAY.state`, `.boat`, `.scene`, `.ready`,
`.setPaused()`, `.refresh()` and `.resetClock()`. Use a separate adapter; do not
change `app.js` merely to access these objects.

A local pose is `{p:[x,y,z], q:[x,y,z,w], engine:boolean, rpm:number, gear:-1|0|1}`.
`p` and `q` come from `BAYPLAY.boat.position` and `.quaternion`; preserve its world
units and axes. Network quaternion order is XYZW. Transmit the local boat only.
The remaining values come from `BAYPLAY.state`. Send at 20 Hz, not every frame.
Each accepted `state` has an increasing safe-integer `seq`.

The graphics adapter should create one remote model per server player id, buffer
snapshots for interpolation, and never integrate physics on remote boats. Mark
stale/disconnected boats clearly, then remove them when absent from the roster.
Keep the local boat responsive using the current simulation. On disconnect, stop
publishing and visibly indicate offline status; do not pretend the room is live.
On resume, restore the returned `selfPose` safely with physics-owner approval;
never silently snap a moving boat using an untested state mapping.

For this first protocol, `worldId=practice-bay` and `worldRevision=sealab11` are
provisional integration identifiers, not proof that weather, water time or spawn
rules are synchronized. Before enabling the game UI, bind the revision to the
actual scene/configuration, assign safe distinct spawn positions, and enforce a
single room environment. The seed and room time fields are supplied by the server
but not yet consumed by the simulation. Shared weather changes need a host-only
command contract and UI coordination; they are not implemented in this slice.

## Wire protocol

Connect to `/ws` on the room host. First text message must arrive within 5 seconds:

```json
{"protocol":"atlas-net-1","action":"create","worldId":"practice-bay","worldRevision":"sealab11","name":"Owen"}
```

For `join`, include `roomId` and `key` from the creator's welcome. For `resume`, also
include `playerId` and the private `resumeToken`. Never put resume tokens into
share links. Put invite keys in the URL fragment, not query parameters or logs.
A `welcome` includes the player's identity, reconnect credentials, next sequence,
room metadata and accepted self pose. These credentials are private to that socket.
Snapshots never include invite keys or reconnect tokens.

```json
{"type":"state","seq":0,"pose":{"p":[0,0,0],"q":[0,0,0,1],"engine":false,"rpm":0,"gear":0}}
```

Other messages: `{"type":"ping","clientTime":1234}` and `{"type":"leave"}`.
Protocol failures return an error code and close the connection. Reconnection
logic and player-facing messages still need a browser client implementation.

## Run / deploy

```sh
cd atlas_multiplayer
npm install --ignore-scripts
npm test
ALLOWED_ORIGINS=http://localhost:3000 npm start
```

Use one Railway service, root directory `/atlas_multiplayer`, branch
`atlas-d/multiplayer-chat3`, Dockerfile build, one replica and `/healthz` healthcheck.
Set `ALLOWED_ORIGINS` to the exact approved frontend origin(s), comma separated;
no wildcard. `PORT` is provided by the host. Do not put credentials in client code.
TLS belongs at the hosting edge. Budget limits and provider billing require owner
approval before enabling paid capacity. Rooms are in memory and are lost on process
restart or redeploy. Multiple replicas require shared room routing/storage first.

The frontend is NOT served by this candidate; the existing simulator remains on
its current host. Do not switch its production URL until the integration passes.

## Verification and remaining release gates

Local: 18 room-core tests pass under Node 22.16.0; `server.mjs` syntax check passes.
The local sandbox has no `ws` installation and cannot reach the package registry.
Therefore WebSocket transport execution, container build and dependency audit are
NOT verified. `npm test` currently runs unit tests only, not transport/browser tests.

Before calling this live:
1. Install the pinned dependency, produce a lockfile, audit it, and execute real
   socket tests: two clients exchange state, room isolation, origin rejection,
   malformed/oversized data, slow peers, reconnect and shutdown.
2. Build the browser client and separate Sea Lab adapter, invite controls, remote
   rendering/interpolation, spawn and fixed-world configuration enforcement.
3. Deploy a staging room service after Railway is connected, with approved cost limits.
4. Verify HTTPS/WSS and two independent browsers (then devices/networks), including
   mobile, reconnect, full-room handling and unchanged single-player behavior.
5. Publish the verified multiplayer link and record a rollback target.

Documentation references consulted:
- https://docs.railway.com/builds/dockerfiles
- https://docs.railway.com/networking/public-networking
- https://github.com/websockets/ws/releases
