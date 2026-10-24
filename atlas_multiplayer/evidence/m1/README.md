# M1 — local socket diagnostics, not a release pass

Source parent: `98f535cf7d01ba8a5cde8acfc4d3378990dbd77e`.
All changes are in `atlas_multiplayer/**`. Standard installation of `ws@8.22.0`
failed with `EAI_AGAIN registry.npmjs.org`; no registry lockfile or passing audit
has been invented. `scripts/verify-clean-install.sh` is the exact unblock path
for an existing permitted runner with registry access. Docker now requires the
real lockfile rather than resolving dependencies afresh during deployment.

The preinstalled Python Playwright package includes a bundled WebSocket runtime.
An explicit TEST-ONLY ESM loader used that runtime for diagnostic tests of our
actual room service over TCP. This is NOT pinned-package certification. There
was no production dependency substitution and no network mock.

Reproduce diagnostics with an existing compatible bundle:

```sh
ATLAS_DIAGNOSTIC_BUNDLE=/absolute/path/to/playwright/driver/package/lib/utilsBundle.js \
  node --import ./tests/diagnostic-register.mjs --test tests/rooms.test.mjs tests/transport.test.mjs
```

The original flood test surfaced `MaxListenersExceededWarning`. The server now
closes each socket once and ignores subsequent frames on closing connections.
The new assertion rejects shutdown-listener warnings. Rerun: 30 tests passed,
zero failed. Full TAP, install error and failed release-gate output accompany the
local checkpoint archive; `report.json` records the tested transport hash and
scenarios. No browser or integrated Sea Lab certification in this checkpoint.
