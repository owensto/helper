# ATLAS Bay Sea Lab 04.2 — delivered app

Public app: https://rawcdn.githack.com/owensto/helper/984b2030d02e91388f557e03723bfa3795945171/atlas_bay_command_04/live/index.html

The successful publication was recovered after the interrupted delivery. This record does not claim another geometry rebuild or new public browser run. Earlier releases remain unchanged.

## Start

Click Open the page if the host requests confirmation. The label is BAY / SEA LAB 04.2. It opens in Drive at the helm in the Beaufort region. Start engine in neutral, select F after startup, then add throttle. W/S throttle, A/D steer, E engine, F/N/R gears, Q/Z trim, Space neutral/coast, P pause, H hide/show UI. Touch controls are included.

Drive, Configure and Test lab are separate workspaces. Views are Helm, Chase, Navigation, Inspect, Deck and Engines. The setup panel, view selector, chart and operator controls can be minimized. Hide UI preserves a restore control; touch steering/throttle remain accessible. Native fullscreen is browser-dependent.

## Engines and layouts

Presets: 1 x 300, 1 x 450, 2 x 150, 2 x 300 hp. One or two engines; preset power choices or custom 90–600 hp per engine. Engine instances and illustrative size classes change visibly. Power, engine mass, dry-boat mass, payload and fuel affect the modeled custom configuration. Twin thrust balance is included. Engine sizes are not manufacturer replicas or certified installations. These are simulated configurations, not approved horsepower ratings.

Save/load setups and test history use browser storage. Copy setup link carries configuration parameters, not a Google API key. Appearance/conditions controls and prior drawer, bolster, lid, gear and lighting interactions are retained.

## Physics and tests

Measured F300 reference retains the Sportsman Masters 247 / Yamaha F300 curve and locks the single-300/reference condition. Seamanship is uncalibrated custom force/mass-based handling. Arcade adds sport response and an explicitly game-only wave-hop control. None validates the Atlas hull, structure, draft, turning, rough-water performance or operating safety.

Test lab runs 0–30 mph acceleration, a 60-second full-throttle run, 360-degree turning circle and neutral coast-down. It records the configuration with each run, overlays recent speed traces, displays the turn path, repeats tests and exports CSV/JSON. Tests use a separate fictional basin for repeatability. Custom-engine results are simulated, not sea trials. A finite full-throttle run is not proof of terminal speed.

## Beaufort, cockpit instruments and Google Maps

Beaufort land geometry and sparse soundings were retrieved from NOAA ENC Direct harbour-scale services. Three launch-area options are provided. The cockpit chart tracks simulated latitude/longitude, heading and course over ground. The sounder is a visual history of nearby chart-depth interpolation with assumed tide/sensor offsets, not live sonar. Chart coverage gaps show NO DATA/NO RETURN; no live fish returns are invented. Scenery heights and vegetation are illustrative, not Google photogrammetry.

The Google Maps JavaScript adapter is implemented but NOT activated or tested with an authorized key. Chart > Google Maps opens a session-only connection dialog. The default NOAA-derived chart works without a key. Google activation requires an authorized website-restricted browser key and project/API/billing configuration. The adapter is a synchronized map panel, not Google 3D terrain or bathymetry. No Google account or billing changes were made.

## Evidence

Publication workflow 38628097103 completed successfully. Artifact 11926656409, SHA256 c4c86b12b0c962ba433910dce888caf497136f42102a30bfd38db15c6b02f732, contains the exact app/source and public screenshots. online_validation.json records passing desktop 1600 x 1000 and phone-sized 430 x 932 Chromium suites without recorded page errors or required-asset failures. No replacement local assets were injected into those public tests.

The suites exercised actual forward input, layout minimization/restoration, single/twin engine changes, larger engine envelopes, custom-power validation, saving setups, cockpit interactions, acceleration/turn/coast/full-throttle tests and CSV/JSON exports. Long tests advance the actual fixed-step simulation programmatically, not real-time rendering benchmarks.

Eleven qualitative motion checks were rerun successfully during final packaging. A new local browser recheck was blocked by administrator navigation policy; it is not claimed as a pass. Public-browser evidence is the completed publication suite above. No physical-device, sustained-frame-rate or marine-validation claim is made.

## Remaining

Authorized Google map activation/testing, fully validated vessel dynamics, surveyed/current depth, global location coverage, manufacturer-accurate engine rigs, under-one-foot Atlas draft, app-store release and verified offline/home-screen installation are not delivered. The existing base GLB is preserved (SHA256 4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1); engine configurations are runtime instances. Explorer integration and the other fleet models are unchanged.
