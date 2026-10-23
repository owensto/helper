# ATLAS D / SUMARS — Y13 realism pass

Explicit isolated derivative of Y12 commit `8fa8616b2f10dea29127b0aa971e6646411cd785`, whose playable snapshot is `a06302c27cc0f8da0e5fabc488f97ab14ec82da2`. Original D/N/W model bytes and Y1–Y12 remain unchanged. No CORE, HUMANS, multiplayer or mobile-fleet changes.

## Improvements

- Shared six-band prescribed gravity-wave field uses `omega² = g k tanh(k h)` with 78 m reference depth. CPU hull sampling and GLSL water use identical band parameters. This is not a measured spectrum or near-shore shoaling model.
- Water mesh is concentrated around the active craft: approximately 0.664 m minimum cell spacing versus Y12's approximately 37.8 m uniform cells. Surface normals are analytical; planar scene reflection and outdoor sky lighting replace the room-like environment and generic water reflection. Reflection is approximate about mean sea level, not exact refraction/CFD.
- The existing heave/roll/pitch oscillators now use a symmetric 27-sample weighted waterplane fit instead of four isolated bow/stern/beam heights. Weighting is an authored elliptical footprint, not measured hydrostatics. Horizontal mass/thrust/resistance/steering and 18 kn D tuning stay unchanged.
- Foamy wake ribbons retain the actual owner trajectory, fade with age and stop appearing underwater. Wake/propulsor animation only consumes existing owner elapsed time; pause and selection reset are respected. Shaft speed is an illustrative thrust-derived animation, not RPM telemetry.
- Original hulls receive restrained PBR finishes, local-coordinate teak/tile/paint variation and a wave-relative wet band. Underwater color attenuation is a simplified optical effect. No source hull replacement or combat behavior.
- SUMARS remains baby-blue, now with a collar and visible fasteners, clear acrylic canopy, rounded bucket-seat forms, armrests, foot supports, display/controls and thruster guards. Cockpit values come from the owner state. These are new authored visual details, not pressure/occupancy certification.
- Eight-corner camera fitting fills the actual unobscured scene rectangle rather than fitting an oversized bounding sphere.

## Source and publication

`build.py` derives the new app/style/index/fleet/test files from pinned Y12 anchors and never edits inherited inputs. Complete readable generated source is included in the gated publication commit and evidence artifact. Original GLBs are not redistributed inside the review archive.

Run `python atlas_d_simulator_01/contact/y13/build.py`, then `node .../test-fleet.cjs` and `node .../test-realism.cjs`. Browser verifier operates trusted controls in desktop/portrait/landscape, completes local dive cycles, compares public bytes and performs independent GPU-vs-CPU wave spot checks outside motion intervals. Baseline captures come from the unchanged Y12 entry. No physics state injection or accelerated time in browser acceptance.

New source modules have no RAF, wall clock or timer. One owner fixed-step loop remains. A reflection render is not an extra owner tick. Existing pause/blur/visibility safety is retained; missing browser coverage is not invented. Actual evidence is headless Chromium/SwiftShader, not physical-phone/Safari or smoothness certification.

## Technical references

- Fossen marine craft equations: https://www.fossen.biz/html/marineCraftModel.html
- Three.js physically based materials: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- Three.js planar water reflection reference: https://threejs.org/docs/pages/Water.html

No vessel engineering, hydrodynamic calibration, pressure-hull, occupancy or combined multiplayer acceptance follows from this visual/sea-response release.
