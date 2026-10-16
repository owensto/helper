# P1: recovered original inputs and actual C1 receiver tests

Parent MP SHA: dd8a7c9c8f29d3c54d67086283b68c3f9db12f51.
Runtime remains unchanged from M4: 46c81ebfff13f83645f6b5091b63e845bc422871.
Final C1 hook: 36903985f2182c902427fed77d4e28c61a7639ca,
revision sealab12-core-integration/1.0.0.

## Input blocker resolved

Downloaded the already-named C2 desktop artifact 12028270005: 22,356,113 bytes,
SHA256 5880eabdd7cab4dd60659fd5d5c7c1bab1662998f60f055bb9dffcd28f9144f2.
Unlike the historical C1 archives, this archive contains site/. All 20 original
C1 descriptor.hostFiles assets match their unchanged SHA256, including the
9,962,552-byte Bay model. Test copies now reuse the original repository Git blobs
under tests/owner-fixtures/c1-final/site/. The unmodified descriptor provides the
per-file integrity pins and original path suffixes; provenance.json pins C1 code.
No CORE/live file or source asset was modified. Docker excludes these tests.

## Actual execution

The new runtime-harness.mjs executes the original runtime bundle for its real
Three.js math/scene exports, then the complete unmodified C1 hook. Native Node
WebCrypto hashes all original assets supplied by a local immutable provider.
There is no successful-attach stub, substituted digest or owner-source patch.
Scene nodes, host state and water samples are explicitly synthetic. No browser,
Sea Lab application loop, GPU renderer, physics step or approved spawn runs.

The real c1-reader, core-adapter, room-client and server participate in 25 passing
checks: 17 direct hook/receiver checks and eight real TCP/WebSocket cases. The
complete diagnostic suite passes 130/130. The runs use the previously identified
TEST-ONLY Playwright bundled ws, NOT certification of the production ws8.22 pin.

Covered: attach/integrity tamper rejection, concurrent ownership, immutable rigid
cardinal/tilted poses, unknown RPM=null, reset/epoch propagation, pause/inspect,
world/weather/config invalidation, player/entity versus vessel-design identity,
ejection/destruction/replaced-owner refusal, local capability exclusion, disposal,
two-client pose exchange, epoch-aware interpolation and stable reconnect identity.
No MP runtime defect was established or patched.

Detached captain nuance: actual C1 readAnchors returns CAPTAIN_NOT_SEATED, while
readPose still describes the vessel and conveys no crew validity. The test
preserves this distinction; no character networking or invented frame API exists.

## Reproduction

With a normal installed ws dependency:

    cd atlas_multiplayer
    node --test tests/c1-final-hook.test.mjs

Qualified diagnostic reproduction using an already-installed transport bundle:

    export ATLAS_DIAGNOSTIC_BUNDLE=/absolute/path/to/playwright/driver/package/lib/utilsBundle.js
    node --import ./tests/diagnostic-register.mjs --test tests/c1-final-hook.test.mjs
    node --import ./tests/diagnostic-register.mjs --test tests/*.test.mjs

Original asset download is no longer needed after checkout. Raw focused and full
TAP, empty stderr, per-input byte/Git/SHA256 manifest and unchanged-runtime records
are retained in the conversation handoff archive; their hashes are in report.json.
A missing native AbortController and one wrong command working directory were
harness-authoring corrections, not product defects or red/green runtime fixes.

## Production release remains blocked

Railway and Render were unconnected at inspection. No service, billing change,
workflow/dispatch, runner search, browser navigation or policy bypass occurred.
Exact pin/lock/audit, real independent browser motion, actual integrated single-
player regression and production room/world/placement approval remain unpassed.
CORE owns sampling/current-frame/instance registration, room-wide occupancy and
safe placement, local restoration, coupled runtime and integrated publication.
Fixture permission never grants production spawn or crew authority. NOT LIVE.
