# ATLAS Bay · Sea Lab 10

Operations first, with optional cinematic Easter eggs. This release carries forward the 09 ignition, recorded engine layers, radio, shared bathymetry, translucent animated water and simplified helm.

## Drive

Click the physical key on the helm, the key button, or press **E**. Select **F**, then use the throttle. **W/S** changes throttle, **A/D** steers. **R** immediately selects reverse without a speed interlock, but inertia remains: reverse thrust slows forward motion before moving astern. **N** removes thrust, not momentum. **E** switches the engine off.

Speed, engine RPM, depth and clearance remain visible. **Map** or **M** toggles the chart. **Boat** opens the existing fish box, rod locker, livewell, tackle drawers, bolsters and close-up views. These fittings remain usable while driving. **Settings → Boat setup & locations** contains engine/trim/setup and practice locations.

## Weather & water

Use the **Weather** button for Clear & calm, Sea breeze, Swell, Rain, Fog or Squall. Presets transition gradually in the simulation without teleporting the boat or resetting the engine. Sliders adjust wave strength, wind and water clarity. Daylight, Golden hour and Dusk change the lighting.

The same wave amplitude drives the visible surface and vessel buoyancy. Wind changes the drift-force input and wind sound. Rain uses a fixed particle pool and a procedural rain texture; fog reduces visibility. These are authored scenarios, not a live weather feed, oceanographic model or forecast.

Near the vessel the water has 0.5 m vertex spacing, expanding to a coarser far-field mesh. Depth-based attenuation reveals shallow sandbars. Bottom geometry, displayed depth, clearance and contact share the same modeled bathymetry. The practice basin is fictional; chart-based Beaufort coverage remains approximate and marks unknown areas. Do not use this simulator for navigation.

## Independent settings

**Graphics:** Balanced or Realistic / high-detail lighting. High detail enables shadows and sharper rendering. It does not turn on explosions or ejection and is not a claim of photorealism. Balanced is the default.

**Collision damage:** On by default. Swept hull sampling prevents fast travel through the marina's solid obstacles. Normal collision impulse retains tangential motion in a glancing collision. Severe impacts lower a modeled hull-condition value and disable the engine. This is a gameplay condition model, not mesh deformation, flooding or validated structural failure.

**Kill-switch lanyard:** On by default. Stops the engine after optional driver ejection. A damaged or destroyed boat cannot restart until recovered. The fuel-empty start guard also remains active.

**Control hints:** Independently toggleable.

### Settings → Easter eggs

Both options start **OFF**, are independent of one another, and are saved in this browser:

- **Cinematic explosions:** A sufficiently severe solid impact produces a fireball, smoke and debris and disables the boat. This is deliberately cinematic, not an assertion that real boats explode at a speed threshold.
- **Driver overboard:** A severe forward impact ejects a generic life-jacketed stunt dummy over the bow. It tumbles ballistically, splashes down and floats. The lanyard stops the engine when enabled. This is a non-graphic articulated animation, not a fully constrained ragdoll or human-injury prediction.

Effects use capped reusable pools. Soft bottom contact does not trigger the cinematic effects. Low-speed bumps and reverse impacts do not produce a forward ejection. Turning an effect off cleans up its active visual state. **Recover boat** returns to the marina and resets damage while retaining the user's settings.

Prototype thresholds use impact-normal closing speed and velocity change, not speed over ground alone for marina obstacles. Shoreline handling remains less detailed than the marina's swept contact solver. No threshold is a real-world safety rating.

## Sound and radio

The engine uses three crossfading real recorded outboard textures from nomadas / Freesound 690160 (CC0), plus procedural mechanical/transient cues. The exact recorded engine and RPM are unknown: this is not a calibrated Yamaha or horsepower-specific sound profile. Provenance and processing hashes are in `site/assets/audio/audio09_provenance.json` in the packaged build, or `live/assets/audio/` in the repository.

Radio supports included original instrumental demos and local music files through the boat's positional speaker path. Local files stay on the device. YouTube links use the official visible player; provider restrictions, sign-in and ads still apply. No audio extraction or hidden/background YouTube player is implemented. Spotify URLs open in Spotify's own app/tab; no account is linked and no in-game Spotify stream is claimed. The current Spotify developer policy prohibits game integrations and mixing/overlapping its stream. Provider references: https://developer.spotify.com/policy and https://developers.google.com/youtube/terms/developer-policies

## Verification and source

`dynamics10.js`: pure swept contacts, consequence gating and weather transitions. `operations10.js` and `operations10.css`: weather presentation, optional effects and settings. `prepare10.py`: assertion-checked integration against the successful 09 reviewed artifact. `test10.js`: pure and production collision/state tests. `verify10.py`: rendered desktop and phone-sized Chromium interaction and scenario tests. A passing mathematical test is not a claim of browser/rendering success; consult the actual review reports.

Browser scenarios use the production physics step, with deterministic poses and velocities for repeatable collisions. They are not real device or frame-rate measurements. Physical iPhone/Safari, listening on the user's actual speakers and validated sea trials are not covered.

The source transport is a checksum-verified JSON text bundle, restored to readable source during review. The published `live/` directory is the actual tested build, not a mockup.

## Local launch

From the packaged release run `python3 -m http.server 8080 --directory site` and open `http://localhost:8080/`. Local WebGL/media support is required. No API key is needed for bundled assets. YouTube needs an external connection after a user adds a link.

Accounts, multiplayer, networked physics, free walking, mesh fracture and full flooding are not implemented. The UI is a solo guest session, with no fake signup controls. Future networking should be server-authoritative, with versioned boat commands and shared host weather; music streams must not be rebroadcast into rooms.
