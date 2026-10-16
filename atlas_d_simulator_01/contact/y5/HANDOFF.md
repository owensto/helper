# Y5 — same-session rotation audit

Baseline: e30edc8e33b863f3fafb303be0050cc86b7900f0 (Y4).
Branch: atlas-d/yacht-rotation-y5-20261016. Local reconstructed snapshot: /mnt/data/atlas-d-y5/work.

This tests the ACTUAL unchanged Y4 preview. No preview implementation patch is justified unless a preview defect is reproduced. Chromium mobile/touch emulation changes device metrics and screen orientation in the same loaded session. Trusted browser touch taps/holds/swipes operate visible native controls. Passive diagnostic recorders observe actual pointer capture/release and Window focus. There are no forced DOM dispatches/clicks, direct owner state writes, testStep calls, second vessel clock or navigation workaround.

Cases from both starting orientations: active power plus left/right steering held through rotation/release; paused held steering and neutral return; Helm/Dive scrollable controls and Details open; station/native-Follow projection refitting; unchanged instance/activation/simulation epoch and rejection of older evaluated contact frames. These are viewport transitions, not another dive-cycle or operating-system interruption acceptance claim.

## Evidence corrections and conservative owner safety

Initial source482b3090/run38864862799 returned green assertions, but its Playwright screenshot RESET the CDP-emulated viewport to cached starting dimensions. Images and post-release telemetry establish that the purported return rotations were not all reverse transitions. That run is NOT accepted as complete round-trip evidence and does not establish a preview defect.

The corrected verifier captures the current browser surface directly, asserts actual PNG dimensions and unchanged viewport before/after capture, and requires each next rotation to start in the previous target orientation. Actual pointer IDs, physical frame/control tokens, mapped identity/epoch and explicit stale-frame rejection are retained. A separate Node audit checks the resulting artifact.

Source88234e2/run38865755025 then correctly reproduced a39%-to-idle change on lifting a held touch after rotation. The finger's original unremapped screen point is outside the newly rotated viewport. Rudder release and camera fitting passed. The owner already contains an explicit Window-blur safety handler which zeros throttle/rudder. The current verifier records actual trusted Window-blur events and allows that conservative idle ONLY if observed; arbitrary power changes remain failures. It never disables the handler or restores power directly. Re-arming uses the visible native power slider. A separate return gesture moves the held finger inside the current iframe before lifting and requires power continuity. Paused time remains exactly frozen even if the safety handler idles thrust. Uninterrupted power through an offscreen/focus-losing release is NOT an accepted capability.

CORE owns shared host/runtime/physics/captain lifecycle/integration/deployment. HUMANS/H6 exclusively owns human/profile/clearance; no human is enabled. MP is untouched. Original GLB, live/src/controller/footprint, Y1–Y4 bytes and contact/identity contracts remain immutable. Only y5 verification/documentation and the existing exact-branch test-only yacht workflow change. No services, credentials, permissions, purchases or accounts.

Final source SHA, CI disposition, exact changed files, raw traces and hashes are reported in artifacts/result handoff. Chromium viewport/touch tests are not physical-device, Safari, smoothness, ergonomics or shared-gameplay evidence. Stop at one bounded final result; no further iteration or deployment is launched.
