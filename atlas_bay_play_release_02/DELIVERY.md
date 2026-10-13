# ATLAS Bay Play Lab 02 — cockpit and coastal-driving update

Viewer: https://rawcdn.githack.com/owensto/helper/700240a66e6f7847eb04a7a65f2deefb61c2ca26/atlas_bay_play_release_02/live/index.html

This is a separate release. The host may request **Open the page**. The application label is **BAY · PLAY LAB / 02**. Previous Play Lab 01.1, Studio 07 and all other fleet models remain unchanged.

## Delivered cockpit changes

Three individually operated tackle drawers replace the old decorative faces and solid pedestal. Each has a modeled tray, partitions, illustrative tackle and slide details. Two front seat bolster pads flip up. Fish-box and port rod-locker latch handles rotate before the lids rise. A two-piece fish-box support strut changes its extension and orientation without scaling its constant-length barrel or piston. The throttle lever is a separately pivoted model part. The livewell cover, wheel, outboard, propeller, deck-light indicators and fishing-gear stowage remain interactive.

New Tackle station, Bolsters and Outboard cameras expose these details. The first-person camera was corrected so an old orbit-camera update no longer overrides the newly selected helm position. Hide panels / Escape give an unobstructed view.

## Driving and environment changes

The new game model uses body-direction thrust, water-relative drag, sideways slip, yaw damping, gradual engine startup and RPM response. These are intentionally uncalibrated coefficients, not sea-trial predictions. Neutral and engine-off retain momentum. Space now selects **Neutral & coast** rather than applying the former instantaneous arcade stop. Pause and Return to dock remain explicit game controls.

Engine trim rotates the full outboard and changes the qualitative simulated bow attitude and thrust efficiency. Calm, Sea breeze and Light chop presets change waves, windage and current. Ground speed and speed through water are separate readouts. The analytic wave field used by the water surface is also sampled for the boat's visual heave, pitch and roll.

A fictional marina and three islands replace the empty practice setting. The app has dock fittings, buoys, simplified contact/grounding responses, a five-marker course and fading wake marks. Its chart, depth, RPM and planing labels are simulation readouts, not geographic navigation or measured engine data. A complete course-and-docking playthrough was not part of the acceptance suite.

Audio is opt-in: synthesized engine harmonics, water noise and mechanism clicks. No actual engine recording or acoustic fidelity is claimed. High/smooth quality options change shadows and resolution without substituting a generic boat.

## Preserved model

The native Blender 4.0.2 export preserves the approved original EX_Hull and FIXED_TTop mesh locations with zero measured deviation. The exported GLB is **9,735,464 bytes**, SHA256 **4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1**. There are no scale-animation channels. The new editable Blender master and exact browser model are supplied in the package.

The coastal environment, dynamic controls, audio and instruments are authored in JavaScript; the Blender file is the editable boat master, not a baked movie of the application.

## Verification

Portable native-model review run **38469301604**, artifact **11850804160**, passed the geometry and browser checks. Eleven qualitative-motion unit checks cover startup, forward motion, steering, reverse steering response, neutral coasting, current drift, trim response, wave values, dock contact, step convergence and reset behavior.

Publication run **38471704160** completed successfully. Its final pre-publication and exact-public-URL browser suites passed in both 1600 × 1000 desktop and 430 × 932 phone-sized Chromium viewports. No recorded JavaScript errors or missing required assets occurred. No substituted local assets were injected into the public test. Artifact **11852558215** contains the final models, app/source, screenshots and verification. `online_validation.json` retains the exact public result. First-person camera position was checked after the camera-transition correction.

The browser suites exercise all three original lid cycles, the three drawers and their positions, bolsters, light states, audio activation, storage closure in Drive mode, engine-start interlock, forward movement, keyboard or pointer steering, engine trim, first-person camera position, clear view, coasting, pause, reverse, current drift, conditions, help and reset. They check JavaScript errors, required asset failures and viewport overflow.

These are code, selected geometry and browser-control tests. They are not physical-phone testing, a sustained-frame-rate guarantee, actual engine testing, acoustic review, a complete collision study or marine engineering qualification.

## Explicit limits

This remains a single 300 hp-class original exterior concept, not a rated engine installation. No 450 hp engine is fitted. The under-one-foot draft target is not established. The game's 2,200 kg mass constant, inertia, thrust, RPM, wind/current response and 0.70 m ground-contact threshold are gameplay assumptions, not measured Atlas specifications. Actual mass, center of gravity, trim, stability, structural adequacy, engine clearance and safe operation remain unresolved.

No free walking, full fishing gameplay, app-store distribution or verified offline installation is delivered here. The updated Bay remains standalone; Explorer still carries its older fishing tender and the garage/recovery integration is not changed. Future priorities are walkable cockpit interaction, improved docking/shore contact and a complete fishing loop; they are not completed features or active background jobs.
