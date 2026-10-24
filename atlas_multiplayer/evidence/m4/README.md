# M4 — adapter fault containment, not integrated multiplayer acceptance

Parent/source: `61c02d34345f36fed899695be90034ce5ae4b96e`.
Only Chat 3's `atlas_multiplayer/**` is changed. CORE owns the actual frame loop,
controller, local capabilities and publication; no character/yacht code is touched.

## Actual red/green evidence

`before.tap` is a real run of the two focused new tests against unchanged M3:
2 tests, 2 failures. A renderer exception escaped the frame caller, and a subscriber
mutated the snapshot subsequently delivered to another subscriber. Private-looking
strings in failure output are deliberate test sentinels, not credentials.

`focused-after.tap` runs all 16 host/observer fault tests against M4: 16/16 PASS.
The full suite passes 105/105; an independent run without any WebSocket dependency
passes 62/62. Full TAP, source manifest and the saved baseline adapter accompany
the conversation checkpoint archive. Four presentation tests execute pure UI state
logic, not a browser DOM. No screenshot or visual interaction pass is asserted.

```sh
cd atlas_multiplayer
ATLAS_DIAGNOSTIC_BUNDLE=/absolute/path/to/playwright/driver/package/lib/utilsBundle.js \
  node --import ./tests/diagnostic-register.mjs --test tests/host-fault.test.mjs
node --test tests/rooms.test.mjs tests/client-contract.test.mjs \
  tests/c1-reader.test.mjs tests/clock.test.mjs tests/presentation.test.mjs
```

The diagnostic loader is explicit and test-only. The 43 transport/client/fault
cases use actual loopback TCP/WebSockets with the preinstalled bundled runtime,
NOT the uninstalled exact ws@8.22.0 package. No network mock is used. The real
lockfile/install/audit gate is still blocked by registry EAI_AGAIN; no new retry
or successful audit is claimed in this iteration.

## Behavior and limits

Sync required-hook exceptions stop MP, not CORE's frame caller. Cleanup attempts
continue after errors; failed removal/exit is marked incomplete, not successful.
Unsafe reuse rejects until owner recovery/reload. Optional diagnostics and bad
observers detach once; healthy peers/subscribers continue. Observer copies cannot
mutate internal cursors. Async preparation remains supported/cancellable; other
hooks/observers must be synchronous. Unexpected promise rejections are observed,
but their arbitrary side effects cannot be cancelled. Required async hooks mark
cleanup uncertain. Error messages are bounded known codes, not host exception text.

Final C1 revision/source 36903985 is acknowledged, but these tests do not load C1
or certify actual Sea Lab motion. M2's two-Chromium attempt remains blocked by
managed navigation policy, before any motion check. No M4 browser run, policy
bypass, account/service/permission changes, deployment or integrated single-player
regression. Existing authorized runner + CORE integration acceptance are required
before any public/live multiplayer claim.
