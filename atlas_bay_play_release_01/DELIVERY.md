# ATLAS Bay Play Lab 01.1 — delivered prototype

Public viewer: https://rawcdn.githack.com/owensto/helper/eb2f86fcf96372fc236d974d647b99139ae057a2/atlas_bay_play_release_01/live/index.html

The host may request **Open the page**. This is a separate web app; Bay Studio 07 and the other fleet models were not replaced.

## Available now

Explore mode: independently open and close the fish box, port rod locker and livewell cover using the controls. Fish-box and rod-locker lids have explicit pivots and modeled recesses below them. Toggle deck-light indicators and fishing-gear stowage. Orbit, casting-deck and helm viewpoints inspect the same model.

Drive mode: start the engine, select Forward and increase throttle. The boat moves and changes heading under player input, rather than following a preset camera animation. Forward, neutral and reverse, gradual acceleration/coasting, an explicitly arcade Stop, and a return-to-dock reset are implemented. The wheel, outboard steering and propeller respond to state. The propeller stays stopped in neutral. The on-model screens and mini-chart display simulated position, speed and heading in a fictional practice basin. A simple five-marker course and dock-contact response are present; complete-course playthrough was not part of the browser acceptance suite.

Keyboard: W/S throttle, A/D steering, E engine, F/N/R gears, Space arcade stop. Pointer controls provide steering buttons/sliders and throttle. At the helm supports drag-to-look; Follow gives a third-person camera. Hide panels / Show controls and Escape provide an unobstructed view. High/smooth rendering options change resolution and shadows, not boat geometry.

Drive mode closes lockers and stows fishing gear. Opening lockers is disabled in Drive mode. Switching to Explore stops the game vessel. This is a prototype behavior, not a real boat operating procedure.

## What changed in this delivery

Recovered the unpublished native-model prototype from run 38443814429 / artifact 11836917713. Stabilized lid animation timing, batched repeated dock seams, corrected keyboard focus, guarded direction changes through neutral, reset lighting consistently, and added quality selection and clear-view controls. Revised the helm viewpoint to show the instrument panel.

Native Blender 4.0.2 derivative model and exported GLB are preserved from the recovered build. The GLB is 9,235,988 bytes; SHA256 7da41fc33c4220da3b318b284d99a68c4fe0b67fa4c2ceee369ed90cc95d4cd4. The derivative retains the Studio 07 hull and prepares separate lids and the steering wheel for interaction. Runtime behavior is authored in app.js and physics.js, not represented as a single baked movie.

## Verification

Review run 38460668983 passed. Publish run 38461845993 passed its pre-publication and exact-public-URL browser tests. Final artifact 11846846017 contains the native model, runtime/source, verification and actual browser screenshots. online_validation.json preserves the public result.

Both 1600 x 1000 desktop and 430 x 932 phone-sized Chromium suites passed. The checks exercised all three lid open/close cycles, light and gear states, engine start, stopped propeller in neutral, forward motion, keyboard or pointer steering, direction-change guard, first-person and follow cameras, clear-view toggle, stop, reverse, drive-mode lid interlock, help and reset. No recorded page JavaScript errors or missing required assets occurred. No substituted local model was injected into the public test.

Simple motion unit tests also exercised forward/reverse, turning and dock contact. These are code/gameplay checks, not physical-phone tests, sustained frame-rate guarantees, marine simulation validation or an end-to-end course-completion claim.

## Limits and next steps

The handling, RPM, speed, wake, bobbing and contacts are deliberately simplified. No actual GPS coordinates, water depths, engine performance, horsepower rating, sub-foot draft or seaworthiness are established. The simulated chart is not navigation equipment.

Free walking, fishing gameplay, audio, detailed latch/strut motion, sliding tackle drawers, seat-bolster mechanisms, engine trim controls, app-store packaging, verified home-screen installation and offline caching remain future work. The prototype is browser-playable now, not a completed mobile-store app.

Next priority: a polished cockpit interaction loop, then a better small coastal environment and a complete fishing loop. Retain the detailed visual master and separate low-cost collision geometry; avoid replacing the boat with a low-detail generic game asset. Chase 12 and the larger fleet remain unchanged.
