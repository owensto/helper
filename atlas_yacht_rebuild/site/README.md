# ATLAS 83 — original rebuild 01

A new standalone surface motor-yacht simulation, not the old Bay scene or R7 mesh with another wrapper. Original procedural hull, superstructure, terraces, bridge, pool, sun deck, detailed fittings and twin running gear. The old R7/Y11 yacht and submarine concept remain separate, unchanged backups.

## Play
Start engines, select Ahead and add Power. Main Power synchronizes both engines; Split engines provides independent port/starboard power and a bow thruster. Helm command is rate-limited at the actual rudder. Neutral removes commanded thrust but does not stop momentum. Pause freezes the simulation; Resume must be deliberate after a hidden tab or long interruption. Camera buttons provide exterior orbit, actual bridge, aft terrace, foredeck and plan views. Chart and settings do not automatically pause.

E engines, W/S power, A/D helm, Space idle, F/N/R gears, P pause. Audio is opt-in and synthesized, not a recording of a specific yacht.

## Model and visual assumptions
82.9 m designed hull, nominal 13.6 m beam and 3.6 m draft; an aft swim-platform extends the visible envelope. ATLAS 83 is a concept name, not a certified overall-length declaration. Deck spacing and equipment dimensions are authored. No manufacturer model is copied. Amels 80 and Feadship Savannah were general size-class references, not measurements used to calibrate this vessel:
https://www.damenyachting.com/news/damen-yachting-confirms-sale-of-new-amels-80
https://feadship.nl/fleet/savannah

Bridge heading, speed, engine and rudder readouts update from actual simulation state. The radar rings/blips remain explicitly illustrative; no real radar sensor is simulated. No human occupancy, interior clearance, structural certification or helicopter operation is established. This first rebuild has no submarine transformation. No new human rig, shared world or multiplayer.

Reflected sea is a mean-plane approximation with generated normal texture; low-amplitude wave height and boat response share the analytic wave field. No fluid, flooding or CFD solver. Coast, chart, water depth and buoy placement are authored and not safe for real navigation. Decorative distant islands do not have detailed collision geometry. The sampled grounding envelope is approximate, not a swept exact hull collision.

## Dynamics
All coefficients are in `physics.js`: 2.15 million kg reference mass; separate effective surge/sway masses; twin thrust, 2.8-second thrust response, independent power, rudder rate/angle limits, sway/yaw damping, bow-thruster moment and damped heave/roll/pitch. These are authored concept assumptions, NOT measured sea-trial values or a calibrated six-degree-of-freedom model. Fixed-step simulation is bounded on slow rendering and may run slower than wall time. No FPS claim.

Run `node test-physics.cjs` from the parent directory. The result publishes reproducible simulated trajectories, not manufacturer specifications. Browser tests exercise native UI input against this exact model and controller; image review remains separate from test counts.

## Build and licensing
The sole dependency is the repository's unchanged MIT-licensed Three.js r180 runtime at `a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff:atlas_sealab_12/live/runtime.js`, SHA256 `50a297fabc59ff592031fa916d3fc17511d55747fd11fcdfbd7119bc6148b7f4`. Build copies it to vendor/runtime.js and retains the bundled license. No model, font, texture, audio or paid-service download is needed. All texture artwork is generated in this app. Source/model/dynamics here are independent of the existing CORE, HUMANS and multiplayer workstreams.
