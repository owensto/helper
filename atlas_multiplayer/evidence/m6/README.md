# M6 — original-input gate BLOCKED, not a receiving pass

MP source: `46c81ebfff13f83645f6b5091b63e845bc422871`.
Owner target: final CORE C1 `36903985f2182c902427fed77d4e28c61a7639ca`,
`sealab12-core-integration/1.0.0`.
Actual local snapshot: `/mnt/data/atlas-d-multiplayer-chat3/atlas_multiplayer`.
Branch: `atlas-d/multiplayer-chat3`. The archive was restored into a fresh runtime;
this is not a recovered full Git/Mac checkout.

## What actually executed

```
cd atlas_multiplayer
node tests/owner-fixtures/c1-final/input-probe.mjs
# exit 2: BLOCKED_ORIGINAL_INTEGRITY_INPUTS
```

The complete original hook and descriptor were recovered through the GitHub
connector, not reconstructed from C1-shaped snapshots. Both local copies match
their original Git blob IDs and exact SHA256 hashes. The renamed `.cjs` copy has
identical bytes to CORE's `.js` source. Native Node WebCrypto executes the hook's
unchanged descriptor/manifest digest checks; there is no digest stub or bypass.

This is a **negative input-readiness probe only**. It executes the actual hook's
`attach` entrypoint: a changed descriptor rejects before any fetch; the genuine
descriptor proceeds to the original asset checks and rejects the missing first
asset, `access11.js`. No reset wrapper is installed and no host step is called.
The actual MP `createC1PoseReceiver` rejects the hook factory/missing reader as
`READ_ONLY_READER_REQUIRED`; a successful paired reader/client is NOT constructed.

The archive's `input-probe.json` preserves observations and all 20 required asset digests.
The final direct-process rerun exits 2, writes 5,332 bytes of JSON stdout and
zero bytes of stderr. This corrects the earlier evidence note about a TERM warning;
no such warning is present in the retained process stderr. Missing prerequisites
are not a reproduced product defect.

**0/20 original host assets are mounted; 0 positive M6 checks executed.** No M6
read/reset/dispose, unknown-RPM, epoch/world/identity, ejection/detachment, client
wire-path, local-token-separation or post-attach non-stepping acceptance is claimed.
M4's 105 diagnostics remain historical M4 evidence; no M6 fixture count is added.

## Missing inputs, not a request for another runner

The two mounted MP handoff ZIPs contain no original C1 host assets. Direct
immutable-source file retrieval returned DNS failure; external raw/artifact file
reads did not provide bytes. GitHub's binary `fetch_file` returned empty base64
content and `fetch_blob` failed UTF-8 decoding for the model. Project/Library file
retrieval did not locate the C1 package. No browser was launched, no managed policy
changed, and no workflow/dispatch/runner search or npm retry was performed in M6.

Mount the existing original `site/` files from the final C1 artifact or a local Git
object snapshot containing `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff`.
The `hostFiles` entries in the original descriptor are the exact required 20 files,
including the original model, runtime and geographic assets. Passing only their
claimed digests is not sufficient. With a directory mounted:

```
C1_HOST_ASSETS=/path/to/pinned/site node tests/owner-fixtures/c1-final/input-probe.mjs
```

Even with all asset matches the probe exits 3 and says
`INPUTS_READY_RECEIVER_SUITE_NOT_EXECUTED`; it must never masquerade as completed
M6. The actual successful attach/read/reset/dispose -> real MP receiver/client
suite still needs execution once original bytes are available. No replacement
hash, generated geometry, zero-length asset or relaxed manifest is acceptable.

## Unchanged boundaries / remaining real-host fields

All existing MP client/shared/server/config bytes remain unchanged from M4; see the archive's
`source-manifest.json`. No MP-owned defect was established, and none was patched.
CORE still must bind actual host instance/lifecycle and a trusted sampling/current-
frame witness; C1 does not export a committed-frame serial. An audit source SHA
alone is not runtime attestation. Local placement/restore capability remains
CORE-owned; a server pose is not a local restore token. Atomic room occupancy,
approved per-vessel spawn/restoration and actual integrated single-player
regression remain pending. No yacht fallback or character networking is enabled.

H4 final `10ed9c2f8d0c392828f238e686bcc689517d34f9` is only a narrow +/-0.1 rad
wheel profile, not the normal +/-3.3 rad solution; activation remains off. H5 is
already the HUMANS owner's release/regrip task. M6 adds no character work or clamp.

Exact ws pin/lock/audit, independent browser motion and integrated Sea Lab gates
are unchanged and unpassed. This bounded attempt stops at the original-input gate;
it does not repeat M5's runner search, waive a gate or claim live multiplayer.
