# Y5 — same-session rotation audit

Baseline: e30edc8e33b863f3fafb303be0050cc86b7900f0 (Y4).
Branch: atlas-d/yacht-rotation-y5-20261016. Local reconstructed snapshot: /mnt/data/atlas-d-y5/work.

This is a reproduction/verification task against the ACTUAL unchanged Y4 preview. No preview implementation patch is justified unless a preview defect is reproduced. Chromium mobile/touch emulation changes device metrics and screen orientation in the same loaded session. Trusted browser touch taps/holds/swipes operate visible native controls. A passive diagnostic recorder observes actual pointer capture/release. There are no forced DOM dispatches/clicks, direct owner state writes, testStep calls, second vessel clock or navigation workaround.

Cases, each exercised from both starting orientations: active power plus left/right steering held through rotation/release; paused held steering and neutral return; Helm/Dive scrollable controls and Details open; station/native-Follow projection refitting; unchanged instance/activation/simulation epoch and rejection of older evaluated contact frames. These are viewport transitions, not another dive-cycle or same-session operating-system interruption acceptance claim.

## Evidence correction, not a preview fix

Initial reproduction source482b3090/run38864862799 returned green assertions in both jobs, but its Playwright screenshot used cached starting viewport dimensions and RESET the CDP-emulated viewport during capture. Actual captured images and post-release telemetry establish that the purported return rotations did not all exercise the intended reverse transition. That first run is NOT accepted as complete round-trip evidence and does not establish a preview defect.

The corrected verifier captures the current browser surface directly, asserts actual PNG dimensions and unchanged viewport before/after the capture, and requires each next rotation to start in the prior target orientation. It records actual held pointer IDs instead of guessing an ID, raw physical frame/control tokens, mapped identity/epoch, and explicit stale-frame rejection. A separate Node audit checks all10 rotations,14 PNGs, clock/lifecycle/frame mapping and pointer release from the resulting artifact. No preview, source, camera, control or contact contract was changed to correct the test.

CORE owns shared host/runtime/physics/captain lifecycle/integration/deployment. HUMANS/H6 exclusively owns human/profile/clearance; no human is enabled. MP is untouched. Original GLB, live/src/controller/footprint, Y1–Y4 bytes and contact/identity contracts remain immutable. Only y5 verification/documentation and the existing exact-branch test-only yacht workflow change. No services, credentials, permissions, purchases or accounts.

Final source SHA, CI disposition, exact changed files and hashes are reported in artifacts/result handoff. Chromium viewport/touch tests are not physical-device, Safari, smoothness, real ergonomics or shared-gameplay evidence. Stop at one bounded final result; no further iteration or deployment is launched.
