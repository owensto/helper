# Y4 isolated phone touch preview

Baseline: `306525892bb35620184dd52d5679adf578b8f76a`. Result SHA, CI verdict and file hashes are recorded by the test artifact, not presumed by this file. Branch `atlas-d/yacht-touch-y4-20261016`; workdir `/mnt/data/atlas-d-y4/work` is an isolated reconstructed snapshot. CORE owns all shared-host integration/release. No rig/profile/HUMANS/MP/physics/clock changes.

## Presentation changes

The Y3 fixed330px sidebar is replaced with a full-width iframe,56px toolbar and collapsible diagnostic drawer. A preview-only stylesheet is injected into the iframe DOM; no published host file changes. Existing owner controls and their original handlers are reused. The native Helm and Dive panels become tabs; low-frequency bow-thruster controls use a disclosure. Portrait uses a bottom control dock; landscape uses a right-side dock with native scrolling when needed. All power/steering/gear/propulsion/dive commands still originate from the original controls.

The station camera fits the actual Y3 station bounding geometry into the unobscured rectangle, outside controls. Native camera selection exits Station view rather than silently being overridden. Unsupported station modes use the original owner camera and the immutable Y3 station remains hidden. Hide/Show and Details never pause or step the vessel.

## Immutable inputs

No changes to original R7 GLB/controller/footprint/live/src or Y1–Y3 source/contracts. Y3 station SHA256 `7954ac9ce3d62e07921aa8accd76478e3995b22d94b2607c9633869f3612f131`; Y3 geometry SHA256 `48a56daeb625f588748cf0ae6b240736887a0a21ba97d69f9c7999054d292732`. Y4 imports them directly. Owner rudder drives the same authored +/-60-degree wheel. Physical contacts remain distinct from rig joints; production and rig activation remain false.

## Verification boundary

Before images render the exact unchanged Y3. If its Board control is outside the viewport, diagnostic enter() is used only to expose the broken layout; this is not a passed touch action. After tests use trusted Chromium touch taps/holds/swipes on visible actual DOM controls, with elementFromPoint and viewport checks before actions. No DOM event dispatch, force click or numeric state writes substitute for tested controls. Normal motion/contact traces record existing owner frames. Full conversion/dive/surface/reopening use ordinary owner time. Pure regression helpers, if run separately, are explicitly distinguished from browser interaction.

Portrait390x844 and landscape844x390 are Chromium phone-size/touch emulation, not physical hardware or Safari. Browser execution is through existing authorized CI only; local navigation denial is not retried or bypassed. Frame counts, time, actual failures, and unsupported cases are reported. No sparse-frame smoothness claim.

Exact reservation: this HANDOFF.md, preview.html, preview.css, preview.js, prepare.py, verify.py, test-preview.cjs; existing yacht-owned branch-test workflow only. Evidence is artifact-only. Stop Y4 after its tested result; no automatic next iteration or deployment.
