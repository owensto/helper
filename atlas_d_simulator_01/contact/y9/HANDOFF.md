# Y9 — discoverable pause state and deliberate native recovery

Runtime baseline: `e30edc8e33b863f3fafb303be0050cc86b7900f0`, original `contact/y4/preview.html`.
Branch baseline: `428251d63603bbe3d9915f145097889b66804e34`.
Branch: `atlas-d/yacht-pause-ui-y9-20261016`. Reconstructed local workdir: `/mnt/data/atlas-d-y9/work`.

## Measured gap and one presentation change

Original Y4 has an accessible native Resume button, so recovery already takes one tap. It does not clearly label the frozen simulation as paused beyond that button. Its 10px owner notice sits in the dock and vanishes when controls are hidden; manual pause leaves a previous operational message rather than a cause. Existing Y7 screenshots and Y4 source establish that gap; this verifier exercises the actual before UI first.

Y9 adds a clearly labeled pause card in the existing frozen-readout slot. It temporarily replaces those readouts only while the active yacht is actually paused. No scene/dock/header action is covered; the camera scene rectangle is unchanged. The card moves the SAME native Pause/Resume button into the card and returns it to the header when unpaused/inactive. Native onclick identity is retained; no synthetic click, duplicate button, command wrapper or automatic Resume.

The display reducer reads active/paused/message. A real false-to-true change through the trusted native button is `manual`. A newly reported exact owner stall/hidden reason is shown as such. Unwitnessed reuse of stale reason text is `unknown`, not a guessed current cause. Missing/nonboolean owner state never creates a paused or active claim. Native reason text can change while manually paused without falsely changing cause. Hidden visibility mapping has source/unit coverage only unless an actual native event is observed; this task does not work around headless visibility.

The component observes native UI mutations and the native pause click, and performs a one-time readiness wait. It adds no RAF, renderer/physics hook or simulation clock, changes no pause/blur/visibility handler or >4s threshold, and writes no owner state. `preview.css` is an exact Y4 prefix with one Y9 card suffix; `preview.html` uses the unchanged original Y4 runtime wrapper.

## Verification / scope

`verify.py` runs unchanged Y4 then two Y9 contexts per layout on existing authorized CI. Only real trusted visible taps/holds/scrolls are used. It checks manual pause, waiting without automatic recovery, one native recovery action, hidden controls and Dive dock, actual startup stall when naturally observed, native node/onclick preservation, paused controls/rotation, active blur safety, reason stability and inactive-vessel cleanup. Original physical checks and current sample identity remain active. Source/old tests preserve original model/controller/physics/live/src/footprint and Y1-Y8.

Natural stall absence is retained, not forced into a pass. Screenshots occur after startup observation, not during a timed experiment. No speedup or physical-phone/Safari claim, no broader dive/hidden-tab recertification. Actual run/source SHA and before/after reports are in artifact provenance; source creation is not an acceptance claim.

CORE owns coupled runtime/time/captain/shared integration/deployment. HUMANS owns rigs/geometry/occupancy/clearance; MP untouched. Human activation stays off. No asset transfer/M6 retry, services/credentials/permissions/purchases/accounts, main edit, merge or public deployment.

Exact reservation: existing `.github/workflows/atlas-d-simulator-01.yml` on this branch only and `contact/y9/{HANDOFF.md,prepare.py,preview.html,preview.css,pause-recovery.js,test-pause.cjs,verify.py}`. Generated evidence is artifact-only. Stop after this one bounded result.
