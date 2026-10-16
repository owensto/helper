# ATLAS D Y11 — published force-model demo

Owen authorized publication and a measured physics improvement after Y10. Baseline: a9134318402f87f9e1d61864f76f834c0e8df174. Workdir is an isolated reconstructed snapshot at /mnt/data/atlas-d-y11/work; branch atlas-d/yacht-physics-live-y11-20261016.

## Scope

Only this directory and the yacht-owned release workflow change. Original live/src/model, Y1–Y10 files, CORE/shared host, human rig/geometry/occupancy and multiplayer are not edited. The public single-player demo reuses the original repository asset by exact hash. No new hosting account, credentials, billing or replacement of the Netlify game is involved. Publication is through the already-used immutable GitHub CDN path, verified by actual browser-loaded bytes.

## New physics, explicit assumptions

physics.js is a versioned replacement selected only by host/index.html. It retains original commands/conversion/depth interlocks and advances only from the existing owner simulation step. It adds 3DOF surge/sway/yaw inertia, energy-consistent Coriolis terms, linear/quadratic drag, 16-strip lateral hull resistance, rudder side force with limited propwash, actuator response and a low-speed bow-thruster moment. Wave-driven heave/roll/pitch are separately damped oscillators. Tilt adds clearance margin; the original 39-point footprint is never reduced.

This is NOT a full 6DOF hydrodynamic/pressure-hull model or sea-trial calibration. The assumed mass is 2,400,000 kg; all coefficients and periods are published. No false claim that these are known original yacht design ratings. The submarine vertical controller remains a bounded concept operation, and the ocean is the explicitly authored proving ground rather than a real chart.

The original Y3 wheel follows actual owner steering command; the new rudderAngleRad is a separate actuator state. The new fixture world/session labels distinguish the changed physics from Y4; no shared identity registration or human activation is granted. The latest Y9 pause presentation and Y10 loading labels are reused.

## Measured validation

node test-physics.cjs runs 26 focused checks and writes physics-results.json with parameters, calm-water scenario definition, before/after maneuver metrics and sampled turn traces. Measurements are simulated. Tests include force-balance equilibrium, unforced energy decay, rudder/thrust response, symmetry, numerical convergence, observation equality, pause and original depth/unknown-footprint protections. The published report includes raw JSON and citations for the model formulation.

The release workflow requires deterministic checks and local actual browser driving/Pause/Resume in desktop, phone portrait and phone landscape, plus a complete actual-clock dive/surface/reopen cycle on desktop. It then commits only generated Y11 demo/report files to this isolated branch and operates the immutable online entry, checking actual received scripts and original GLB bytes. A source push alone is not live acceptance. Evidence and exact URL appear in the workflow artifact/release record and PR1 handoff.

Headless/software-browser evidence is not a physical-device, Safari, smoothness/FPS or sea-trial claim. No human, multiplayer, structural collision, wind/current, flooding or pressure certification is included.
