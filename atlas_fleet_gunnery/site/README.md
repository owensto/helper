# ATLAS Mobile Fleet 01

Yacht baseline: 170f328708accc967f36bbb57c6f7ad02c6d38cb (unchanged yacht model, physics, mobile input module and Three runtime). Select the vessel using its name in the top left. Switching starts a new voyage, engines off.

ATLAS-W is your existing surface-ship exterior, not a renamed yacht. Original source 5d0e90f070643c4b3ee8b1602ec1dba88594cf15:atlas_bay_studio_07/live/assets/ATLAS_W.glb; blob 826f70bfaae812538aca710ab9f10a09fae70a24. Full bytes are verified before GLTF parsing. No source-mesh/texture replacement, scaling or auto-playing of its original multi-mechanism clip. Propeller and rudder display updates are runtime presentation only. Bridge wing is an exterior camera. No walkable interiors, handling choreography, weapons operation, crew, submarine or multiplayer.

ATLAS-W handling is explicitly authored prototype tuning: 125m length, 18m beam, 4.85m draft, assumed6,000,000kg mass, independent250,000N maximum shaft thrust,3.5s thrust lag,3deg/s rudder rate. Parameters are disclosed in warship-physics.js, NOT observed real-warship data. A conservative21-point footprint spans128m x23m; sampled synthetic depth and approximate grounding are not complete hull/collision/engineering validation.

Mobile quality, +5/-5 power, two-finger steering, camera sheets and pause behavior are retained. Synthetic coastline and sparse slow-renderer stepping remain. No physical-phone, Safari, FPS or hydrodynamic-validation claims. The original mobile yacht link is preserved.


## Arcade gunnery update
Warship-only fictional training range. Bow cannon and two side repeaters with aiming, visual recoil/flash/tracers, floating targets and hit/clear score. Tap Guns / practice, Resume when needed, Center target, then FIRE. Use drag pad or arrow keys to aim; Space fires. Hold FIRE to repeat. Helicopter/workboat/crew are not targets. No actual weapon performance, engineering or real ballistics: straight arcade traces and fixed game cooldown/damage. Original static mount is hidden in memory and replaced by a separate visual group, not edited in the GLB.
Simulation time is supplied by the existing sailing loop. Pause/visibility/reset/release cancels held firing; there is no catch-up volley on resume. Switching vessel reloads with clean state; yacht remains unarmed. No multiplayer/human-fit permission is transferred.
