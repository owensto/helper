# Atlas D Open Water — standalone cooperative game

This is a separate browser application, not SeaLab's multiplayer mode. One Node
service serves the game and its WebSocket rooms at the same origin. No SeaLab
runtime application, C1/C2 hook, human feature, production world config, external
CDN, new database or user account system is needed. An unchanged Three.js runtime
bundle and Bay model are reused as assets, not as SeaLab simulation code.

Implemented: free sailing; private rooms for 2–8 independent boats; copy/paste
invitations; reconnect/stale state; coast/engine/throttle/steering; chase/orbit/helm
camera; touch controls; simple navigation radar; optional five-buoy route. The
host client alone advances its own local vessel. Boats do not collide with each
other. No shared crews, networked characters or competitive anti-cheat.

Dynamics and three-island ocean are authored for this casual game, not measured
naval physics, real bathymetry, a copy of Beaufort or the yacht's controller.
Original yacht/controller/footprint, SeaLab and humans files remain untouched.

## Run on a normal authorized machine

Node 22+ required. From the repository's atlas_multiplayer directory:

```sh
npm install --package-lock-only --ignore-scripts --omit=optional --no-audit --no-fund
npm ci --ignore-scripts --omit=optional --no-audit --no-fund
node scripts/verify-dependency.mjs
npm audit --omit=dev --omit=optional
npm run test:standalone-suite
npm run start:standalone
```

Open http://127.0.0.1:8080 in two separate browser profiles. Create a room in the
first and paste its private invitation into the second. The hostname matters:
local origin is 127.0.0.1, not localhost. Nothing creates a public service.
Generated genuine package-lock.json must be retained with the deployment source;
no hand-written integrity value or diagnostic transport is production proof.

## Production packaging

Preferred: ONE Render or Railway web service. Frontend and room server are in the
same container; no separate frontend URL, CORS integration or CORE changes.

Repository: owensto/helper. Branch: atlas-d/multiplayer-chat3.
Root directory: atlas_multiplayer.
Build command: sh standalone/prepare-release.sh
Start command: node standalone/server.mjs
Health check: /healthz
Instances: ONE. NODE_ENV=production.

Render supplies RENDER_EXTERNAL_URL. Railway can supply RAILWAY_PUBLIC_DOMAIN.
Otherwise set PUBLIC_ORIGIN to the exact HTTPS origin, no trailing slash. The
server never trusts a request Host/Origin header to create its own allowlist.
Start binds 0.0.0.0:$PORT in production, loopback only in development. Connect via
wss://<origin-host>/ws, selected automatically by the game. No keys in frontend.
The standalone world is shipped in standalone/world.mjs; ATLAS_WORLD_CONFIG is
not required for this entry. The old server.mjs CLI still has its own unchanged
CORE world requirements and is not the standalone start command.

standalone/render.yaml is a separate Blueprint, not a GitHub workflow. Import it
in Render using its path. plan:free is a test choice, not always-on availability.
No service or account is created by committing this file. A persistent paid tier
requires separate explicit billing approval. Raw deploys remain unverified until
the real browser suite and public WSS smoke checks pass.

Run npm run build:standalone to produce dist-standalone with a complete allowlisted
package and exact asset manifest. Packaging is not a production acceptance pass.

## Release acceptance

1. Real npm pin/lock/clean-install and current vulnerability audit.
2. Authorized local browser runner: python standalone/verify-browser.py starts
   its own loopback-only test driver. It launches two actual Chromium processes,
   not two mock clients. Set TEST_PORT to choose a different loopback port.
3. Verify motion both ways, isolation, abrupt reconnect, leave, one-player sailing,
   touch control reachability, model load and absence of page errors. Inspect the
   retained screenshots and traces. This script does not install browsers or
   change browser policy. A denied navigation stays BLOCKED.
4. On the public HTTPS origin, repeat two-device motion and WSS checks. Then mark
   public multiplayer accepted. These are independent standalone gates, not
   waivers of SeaLab's separate integration/regression gates.

Rooms are in memory: process restarts end sessions. Limits: 8 players per room,
16 rooms, 64 connections. Initial slots are reserved atomically in one process
and skipped if a peer's current reported position occupies them. No assertion of
continuous collision/anti-cheat clearance. Invitations carry a secret in their URL
fragment. Resume secrets stay in client memory. Do not publish invitation values
in reports; hide them before screenshots. Browser refresh requires joining again.

## Current evidence

See ../evidence/s1/report.json for executed checks and remaining gates. The app
has NOT been visually/browser-certified or deployed by merely shipping this source.

The standalone release suite explicitly excludes both C1 test files. Full legacy
MP regression may be run separately, but is not a dependency of this new app.
