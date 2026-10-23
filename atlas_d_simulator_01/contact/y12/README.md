# ATLAS D / SUMARS Fleet — Y12

One selectable active craft at a time: original R7 ATLAS-D yacht/submersible; original Fleet Atelier02 ATLAS-N dedicated submarine; original ATLAS-W surface warship; newly authored baby-blue SUMARS two-seat pod for Kayley. No combat, human rig or multiplayer. An isolated solo app, not the CORE Beaufort integrated release.

Source baseline: 586a8acfa171e6ad634b562fd924544c5b1376bf. All previous source/assets/controllers remain immutable. This directory implements a new explicit fleet owner and presentation shell; it does not silently retune old Y11. Each craft has its own length, beam, draft, inertia and control response. One owner fixed-step loop runs. Selection removes the old model/controller before loading its replacement, cancels obsolete loads, hash-checks original payloads and starts propulsion OFF. Error/retry is explicit.

## Operating

Choose a vessel. Start propulsion in neutral, choose F and add power. Hold Port/Starboard; Idle removes thrust, not momentum. E engine, F/N/R gear, W/S power, A/D steering, Space idle, P pause. Choose Orbit/Chase/Bridge or Underwater; lighting and sea state are separate. Choose vessel returns to the selector while pausing the active craft.

ATLAS-D must be stopped in neutral/idle before Secure yacht; this samples the original38.4-second conversion but excludes canned descent. After securing, select depth and Dive. Surface before reopening. ATLAS-N and SUMARS are already dive-ready. ATLAS-W stays on the surface. The selector links separately to the actual Beaufort boating experience; this fleet's offshore bottom is authored, not a navigation chart.

The generalized Y11 surge/sway/yaw force/inertia model includes actuator lag, crossflow and damping. Wave heave/roll/pitch use separate damped oscillators. Depth control is simplified, not ballast/pressure-hull engineering. D is tuned to18kn rather than14kn without speeding the clock. Published tests/parameters/measurements are SIMULATED, not sea-trial validation or certified specifications.

## Test/publication

`node atlas_d_simulator_01/contact/y12/test-fleet.cjs` generates measurements.json. `build.py` checks change boundaries and original model hashes. `verify.py` operates trusted browser controls locally then against the immutable online URL, checking loaded bytes. No response substitution, direct simulation stepping or owner-state write. Screenshots are outside recorded motion intervals. Original test results do not certify this new app; new focused tests/browser cases are separate.

Read RELEASE.json for the verified online URL/result, not branch existence. No publication claim is valid before public checks succeed. CORE/HUMANS/MP and other public sites are unchanged. Browser evidence is Chromium/software-renderer, not physical-phone/Safari/performance certification.
