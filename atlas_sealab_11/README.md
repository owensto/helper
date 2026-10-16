# ATLAS Bay — Sea Lab 11 · Coastal Drive

A solo boat-simulator prototype with a mobile-first helm, clearer waves and authored coastal scenery. It preserves the Sea Lab 10 ignition, sound, navigation, weather and independently optional cinematic effects.

## Starting a trip

Tap **Turn key**, choose **Forward**, then tap **+** to increase power in 10-percentage-point steps. **−** reduces power. Hold **Left** or **Right** to steer; release to center. **Straight** also centers the wheel. **Idle & coast** reduces power to zero but does not stop momentum. **Reverse** selects reverse immediately; reverse thrust slows forward travel before moving astern.

The physical ignition key remains clickable. Keyboard: E ignition; F/N/R gears; W/S power; A/D steering; M map. Speed is in knots. The upper readout distinguishes total water depth from the space beneath the propeller or keel.

## Mobile and optional assistance

The primary tool buttons are **Map, Music, Onboard, Weather, More**. On phones these sit along the bottom. The driving controls use separate wide rows rather than making every action fit in one small toolbar. Pause/Resume remains in the header. Portrait and landscape have different layouts. Browser zoom is not deliberately disabled.

Open **More → Make it easier** for:

- Larger text and clearer labels.
- Depth in feet, or meters when disabled.
- A steadier driver view: camera pitch is reduced without flattening the waves or changing the boat's physics.
- Docking assist: a 22% power-input cap. It does not brake, steer, berth the vessel automatically or guarantee a speed.
- Optional amber shallow-water highlighting.
- Pause while reading menus and maps, then resume the prior running state when closing them. Music controls remain live. A manually paused trip is not automatically resumed.
- Optional browser-spoken shallow-water warnings, alongside the visible warnings. Voice availability depends on the browser and device.

These preferences are saved in this browser, not to an account. **How to drive** explains the first trip without requiring keyboard knowledge. This is not physical-device, accessibility-conformance or real-vessel training certification.

## Interacting with the boat

**Onboard** lists fish box, rod locker, livewell, tackle drawers, seat bolsters, fishing gear, lights and horn. Open/Closed labels for lids and drawers reflect their actual target state. **View** moves the camera closer. The guided tour steps through six fittings. Nearby labels on visible fittings can be disabled.

Fittings animate even when the simulation is paused, using a separate visual animation delta. Opening a compartment does not secretly advance the boat, waves, fuel or simulation clock. The propeller does not spin merely because a paused lid is moving.

**More → Places to explore** sets a marker for the sandbar lookout, island shelter or marina. It does not teleport or steer the boat and is not a depth-checked safe route. The flag and the map share the same waypoint. These destinations belong to the fictional practice bay, not Beaufort.

## Waves and shallows

The new wave field has six directional components with a restrained second harmonic for more distinct crests. `waves11.js` generates both the CPU height/slope function and shader code. Buoyancy, surface geometry, depth queries and water normals use this shared field. Weather controls change its amplitude rather than adding an unrelated visual bobbing animation.

The optical treatment adds moving surface detail, shoreline/crest foam cues, depth attenuation and view-angle reflectance. At shallow downward viewing angles the bottom is visible; grazing views reflect more sky. **Look to the side** changes the driver camera direction; **Behind boat** gives a higher view of the bottom. Clarity is adjustable under Weather. The amber shallow tint is an assistance overlay, not a physical water color.

This is a height-field and shading approximation. It is not a fluid solver, true breaking-wave simulation, fully refracted scene rendering or ray-traced reflection system. Foam and vegetation are procedural visual cues. No claim of 100% photorealism is made.

## Coastline

The fictional practice bay has bathymetry-derived island surfaces, dry/wet sand transitions, irregular tree canopies, beach grass, weathered rocks and a small wooden lookout. Vegetation uses reusable instanced geometry. Island surface elevations use the same authored field as the depth and grounding model, rather than unrelated decorative island mounds.

Rocks, vegetation and the shelter are scenery, not new solid collision obstacles. The existing marina obstacles and grounding rules remain. The coastline is authored, not satellite imagery, scanned terrain or a recreation of real private properties. Beaufort retains its earlier chart-derived scenery and unknown-depth behavior; the new island destinations are not injected there.

## Preserved controls

Weather presets: Clear & calm, Sea breeze, Swell, Rain, Fog and Squall, plus wave strength, wind, clarity and lighting. High-detail graphics are independent of collision-damage and Easter-egg settings. Explosions and driver-overboard effects remain off by default.

Recorded outboard textures, water/wind sound and local music remain. YouTube uses the official visible player with provider restrictions; Spotify URLs open externally. No streaming-service account is linked, no music is extracted or rebroadcast, and no multiplayer or signup system is implemented.

## Running the package

Serve `site/` over HTTP:

```sh
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080/`. The included assets need no API key. WebGL/media support is required. Optional YouTube playback requires a network connection after adding a link.

## Tests and reproducibility

The review workflow restores the Sea Lab 10 live directory, verifies the compressed text-source checksum, runs `patch11.py` and `fix11.py`, checks JavaScript syntax and executes the shared-wave/unit checks. Browser verification exercises real DOM controls and actual rendered scenes on desktop, phone, smaller phone and landscape viewports. It checks visible hit targets, power changes, hold/release steering, unit changes, pause-safe fitting motion, waypoint/map behavior, waves/scenery, and retained engine/audio operation.

Read the release's validation files for actual results. Headless phone-sized Chromium is not a physical iPhone or Safari test. Deterministic scenario stepping is not a frame-rate measurement. The water, handling and bottom model are simulated and not suitable for navigation or engineering validation.

Design references: W3C older-user accessibility guidance and target-size guidance; NVIDIA GPU Gems Chapter 1 on shared sum-of-waves height fields and normals. These references inform implementation choices, not certification.
