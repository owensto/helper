# ATLAS D / SUMARS Y14 — Navigation & physical environment

Isolated four-craft solo successor. Preserves original R7 D, Atelier02 N/W asset hashes and SUMARS baby-blue identity. No CORE/HUMANS/MP or range/mobile implementation is modified. Source baseline 8fa8616b2f10dea29127b0aa971e6646411cd785; prior published Y12 a06302c27cc0f8da0e5fabc488f97ab14ec82da2. Explicit local Y13 source input from archive SHA256 e8f62b488550efd3873579585f6eccd1a796c08bb66ed31e690cae67fc182c2c; its prior browser acceptance was blocked, so its optics are tested anew here.

## Usable navigation
Chart & route opens a north-up bathymetric chart of the same authored seabed. Plot route then click to add up to eight waypoints; no automatic steering. Shows bearing, range, cross-track error, closing-speed ETA, track, heading, course over ground, speed over ground versus through-water speed, under-keel clearance and a conservative 60-second straight-course look-ahead. ETA is unavailable while stationary/receding; low-speed course is unavailable. Unknown depths are unknown. Route resets on craft change. No real GPS/sonar/radar/current/weather feed, no surveyed chart, not for navigation.

## Physics
Explicit derivative of Y12, with water-relative horizontal dynamics and earth-fixed constant current. Changing conditions preserves inertial velocity. Apparent-wind pressure uses relative AIR flow and authored projected area/pressure-center estimates, attenuated underwater. No double current acceleration or speed multiplier. New force-limited lagged buoyancy actuator, vertical added mass and dissipative drag replace velocity-easing depth motion. This is not pressure-hull engineering or validated ballast hardware. Surface heave/roll/pitch are independently damped, now driven by21 distributed hull samples of the identical CPU/GPU wave field. Maneuvering coefficients remain authored, not sea-trial calibrated. Original closure, unknown-depth, footprint, pause/blur/visibility and one-craft lifecycle semantics remain.

## Rendering
Clear-coated yacht paint, matte naval coatings, submarine rubber/panel detail, metre-scale teak/fabric detail, transmissive baby-blue pod canopy, additive seals/fasteners/thruster guards/skid supports. Shared analytic-normal wave surface, near-field mesh, outdoor sky/reflection, actual-path foam, underwater red attenuation. Optical coefficients are authored approximations. No generated illustration is used as a screenshot or geometry test. Optional effects do not change the owner clock.

## References and limits
- Fossen marine-craft model: https://www.fossen.biz/html/marineCraftModel.html — relative-flow force/inertia framework, not parameter calibration.
- Three physical materials: https://threejs.org/docs/pages/MeshPhysicalMaterial.html — optical implementation.
- GPU Gems1 ch1: https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models — wave/normal formulation.

Reproduce `python atlas_d_simulator_01/contact/y14/generate.py` then `node atlas_d_simulator_01/contact/y14/test-navigation.cjs`. Browser/public evidence is separate, read RELEASE.json only when written after gates. No physical phone/Safari/FPS, full6DOF/CFD, real resistance-curve, occupancy, combat or multiplayer claim. Previously denied local browser navigation is not retried; the existing authorized branch-only yacht CI is the visual acceptance route.
