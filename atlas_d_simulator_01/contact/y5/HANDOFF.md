# Y5 — same-session rotation audit

Baseline: e30edc8e33b863f3fafb303be0050cc86b7900f0 (Y4).
Branch: atlas-d/yacht-rotation-y5-20261016. Local reconstructed snapshot: /mnt/data/atlas-d-y5/work.

This first source is a reproduction audit against the ACTUAL unchanged Y4 preview, not a fixed candidate. Chromium mobile/touch emulation changes device metrics and screen orientation in the same loaded session. Trusted browser touch taps/holds/swipes operate visible native controls. A test-only passive event recorder observes capture, release and resize; it cannot issue owner controls, change state or step time. No forced DOM dispatches, forced clicks, testStep, direct owner writes, second vessel clock or navigation workaround.

Cases: active power plus left/right steering hold during portrait/landscape rotation; paused rotation and held steering; Helm/Dive scrollable controls and Details open; station/overview projection refitting; unchanged instance/activation/simulation epoch and rejection of older evaluated contact frames. The independent owner snapshot is compared to physical controls and contact rays. Transitions here are viewport transitions, not another dive-cycle acceptance claim.

CORE owns the actual shared host, runtime, physics, captain lifecycle, integration and deployment. HUMANS/H6 exclusively owns all human/profile/clearance work. No human is enabled. MP is untouched. Original GLB, live/src/controller, footprint, Y1–Y4 bytes and contact/identity contracts are immutable inputs. Only new y5 preview/verification files and the existing exact-branch test-only yacht workflow may change. No services, credentials, permissions, purchases or accounts.

Report source SHA, actual CI disposition, raw traces, before/after screenshots and any reproduced defects without inferring physical-phone, Safari, smoothness, human or shared acceptance. If no defect is reproduced, do not invent a fix. Stop at one bounded final result.
