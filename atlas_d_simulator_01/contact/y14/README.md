# ATLAS D / SUMARS — Y14 navigation and realism

Isolated single-player fleet candidate. Parent: `8fa8616b2f10dea29127b0aa971e6646411cd785`; published Y12 reference: `a06302c27cc0f8da0e5fabc488f97ab14ec82da2`. Original ATLAS-D, ATLAS-N and ATLAS-W geometry remains byte-identical; Kayley's SUMARS stays baby blue. Y1–Y13, CORE, HUMANS, mobile fleet, warship action/operator, multiplayer and prior public releases are untouched.

## Product scope

- Advisory authored-water chart with up to eight user waypoints, north-up position/track, bearing, range, signed cross-track and ETA from actual velocity made good; course-over-ground distinct from heading. Unknown/no-closure ETA stays unavailable. Direct route legs and a constant-motion 30-second hull-footprint projection flag shallow/unknown water. No autopilot, real GPS or surveyed chart claim.
- Versioned force-based relative-current surge/sway/yaw, apparent-wind loads, 21-point spatially averaged wave excitation, and rate/force-limited vertical control with drag. Uses the same owner timestep; not a second clock or playback-rate boost. Original thrust/footprints retained; new air drag means paired calm speed need not be exactly identical.
- Y13-derived physical materials, outdoor environment, same CPU/GPU wave field, actual-path wakes, wet-surface roughness, visible-geometry camera fitting and detailed canopy/metal/upholstery. Budgeted planar reflections (off in automatic software-renderer mode) and shared material variants. All shader/physical-phone claims require separate actual-browser evidence.

Parameters, wind/current presets and vertical control are authored simulation assumptions, not real-vessel sea trials, complete 6DOF hydrodynamics, pressure-hull/ballast engineering or navigational advice. Realism references: https://www.fossen.biz/html/marineCraftModel.html and Three.js MeshPhysicalMaterial documentation. Material and geometry details do not establish pressure/occupancy safety.

## Controls

Start propulsion in neutral, select F and add power. W/S or arrows adjust power; A/D or arrows steer. P pauses; Space idles. Chart & route opens the local scenario map. Tap deep water for a waypoint; To launch adds the origin as a waypoint, not a teleport. Open Instruments for course/current/wind/depth/vertical force. Still water, Coastal drift and Crosswind are authored environmental scenarios.

## Verification / publication status

No live claim follows from this source file. New deterministic tests and retained source provenance are packaged with the candidate. Actual browser verification, served-byte checks and a final RELEASE record are required before a verified online release. The previously denied local browser navigation is not retried by alternative origins or policy changes. No automatic resume or weakened >4-second stall/blur/visibility safeguard.
