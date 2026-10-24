# S1 — independent Atlas D Open Water application

Source parent: `7a7181097475a6f63a4456be982d0665d37da43c`.
Existing branch `atlas-d/multiplayer-chat3`; all changes `atlas_multiplayer/**`.

This implements the separate app Owen requested rather than waiting for SeaLab.
It serves its browser game, immutable Bay art/Three.js assets and existing room
transport from one HTTP/WebSocket service. It has its own world descriptor,
casual controller, eight distinct launch slots, static scenery and buoy route.
No C1/C2, actual SeaLab app, experimental human, yacht controller or external CDN
is loaded. CORE's independent integrated release remains untouched. This is NOT
a claim that the yacht or SeaLab simulation became multiplayer.

## Actually executed

- 106/106 standalone release tests PASS, with no C1 tests in that command.
- 14 new tests are included, not additional to 106: controller/world, actual
  HTTP assets, two distinct controllers using the real room/client over TCP,
  bidirectional motion, reconnect, leave/solo, isolation, origins/payload bounds
  and occupied-slot avoidance.
- Separate legacy suite 130/130 PASS. It overlaps the generic tests above; do not
  add counts or make it a prerequisite for the standalone build.
- All new JavaScript syntax checks and Python browser-script compilation PASS.
- One-service runtime package built: 22 files, full asset manifest; no C1 test
  payload or SeaLab application files required. Package lock is not present.

Commands are in standalone/README.md and package.json. Tests used the explicit
preinstalled Playwright bundled ws loader: actual TCP, NOT an npm ws8.22.0
install or audit. Raw TAP, stderr and source manifest are in the download
archive; their exact hashes are in report.json.

## Not executed / not approved by these checks

Genuine registry/lock/ci/audit still blocked by observed EAI_AGAIN. Browser
acceptance script is authored, not executed; no screenshot, WebGL or touch
quality certification. Managed navigation policy was not changed or retried.
No backend service, account, purchase, workflow/dispatch or public deployment
was made. No public multiplayer URL exists for this checkpoint.

The remaining release path is independent of CORE: one connected Render/Railway
service runs standalone/prepare-release.sh, genuine dependency and unit gates;
an authorized machine runs standalone/verify-browser.py and reviews actual
rendered controls/two-browser motion; public HTTPS/WSS smoke checks follow.
This does not waive SeaLab's distinct integrated acceptance requirements.

## Asset and behavior limits

Original Bay mesh, runtime math library and license bytes are immutable copies
with original Git blob identities. The three-island scene, hull-radius clearance
and controller coefficients are authored casual-game assumptions. No measured
sea trials, true bathymetry, shared boat collisions or crew/human realism is
claimed. Same-process launch allocation skips occupied reported positions;
it is not anti-cheat or continuous shared-physics collision prevention.
