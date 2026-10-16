# Y10 — truthful boarding label only

Baseline: `d659b10e65c83fb671244f036c3d5fbab1d8f3bc` (tested Y9).
Branch: `atlas-d/yacht-boarding-label-y10-20261016`.
Isolated reconstructed workdir: `/mnt/data/atlas-d-y10/work`.

User's local supported Brave smoke test reproduced an enabled `Loading ATLAS D · 100%` button that boarded successfully. Original `live/atlas-d.js` assigns ready/disabled/onclick on load success but never replaces its progress text. This change adds only a text presenter in a separate preview; it does not fix or change loading state/physics.

`boarding-label.js` observes the original button. Actual ready becomes `Board original ATLAS D`; native partial/100% progress stays Loading until ready; native error becomes `Retry ATLAS D — load error`. Missing readiness remains unknown. It writes only textContent, never disabled/hidden/onclick or owner state. The original error handler remains an enabled reload/retry action, NOT a board action. There is no auto-retry/resume, new input handler, simulation/frame clock or periodic polling. The observer reattaches to the same-origin host document after its native retry reload.

`preview.html` uses a relative base to reuse exact Y9 CSS/pause recovery and the existing Y4 observer. No duplicate CSS or edited inherited runtime. It remains clearly isolated/unintegrated; no public delivery is established by this source.

Verification: actual Y9 before and Y10 after in Chromium portrait/landscape on existing branch-only CI. Candidate loader request is held then continued without replacing its response; a trusted tap while disabled must not board. Separate test-induced one-request failure exercises actual loader error/retry; it is not a naturally occurring load error. Visible native Retry reloads, the next unmodified asset request succeeds, and native ready boarding/Pause/one-tap Resume follow. Tests compare native enter source, handler reference and browser-delivered source bytes, preserve five physical contact checks, and record screenshots outside any timed experiment. Unit-only edge states are labeled separately. No local browser denial is bypassed; connected Browser access was unavailable in this chat.

Original live/src/model/controller/physics/footprint and Y1–Y9 remain immutable. CORE retains shared runtime/time/geometry/captain/release; HUMANS retains rig/clearance/occupancy; MP untouched, human activation OFF. No new asset upload/transfer/M6, services, credentials, permissions, purchases/accounts, main edit or deployment. Prior natural-stall/hidden-tab/physical-device/performance limits are not broadened. Stop after one label fix.

Exact reservation: existing `.github/workflows/atlas-d-simulator-01.yml`, and `contact/y10/{HANDOFF.md,boarding-label.js,preview.html,prepare.py,test-label.cjs,verify.py}`. Evidence generated only in the artifact.
