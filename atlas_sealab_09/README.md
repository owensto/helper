# ATLAS Bay — Sea Lab 09

## Drive

Turn the key in the bottom driving bar, click the physical key on the helm, or press **E**. Startup enables boat audio after that gesture. Select **F**, then move the throttle. **R** immediately selects reverse without a speed interlock. Forward momentum remains until reverse thrust slows the boat and moves it astern. **N** removes thrust; it is not an instant brake. Press **E** again to stop the engine.

Use **W/S** for throttle and **A/D** for steering. Mouse/touch sliders and Center are also available. The default fictional practice bay has a gentle swell. Settings offers sea state, clarity, trim, power setups and Beaufort chart-based scenery.

## Water and bottom contact

Water surface geometry and boat buoyancy use the same wave field. The rendered bottom, chart colors, water-depth display and bottom-contact model share one bathymetry field. Depth-dependent transparency reveals shallow sandbars; grazing angles reflect more light. The clarity slider changes attenuation with depth.

**Settings → Practice shallows** places the boat on approach to the sandbar at x=85 m, z=-40 m. Head straight ahead and watch water depth and under-prop/under-keel clearance. Contact produces a red message, impact sound, scraping while moving, a camera jolt and resistance. Reverse to back off, or trim up to reduce modeled propeller draft. Hull support is separate from propeller contact; an appendage is not used to lift the whole vessel.

This is a visual/dynamics prototype, not a structural impact or propeller-damage model. Rapid reversal is a game control, not advice for real marine equipment. The practice bay is authored terrain; Beaufort uses chart-derived estimates and marks unknown coverage. Neither is a navigational instrument. Water is animated geometry with depth-based shading, not a fluid solver or surveyed hydrography.

## Audio and radio

The engine uses three crossfading excerpts from a real CC0 outboard recording, with restrained procedural mechanical/transient effects. Excerpts keep much more high-frequency content than the previous narrow-band body loop. The engine and recorded RPMs are unknown, so these are texture layers, not horsepower-specific or Yamaha/F300 acoustic calibration. See `assets/audio/audio09_provenance.json` in the live site and `process_audio09.py` for source, excerpts, processing and hashes.

Source: **nomadas, River boat with outboard engine (at changing speeds)**, Freesound 690160, CC0 1.0: https://freesound.org/people/nomadas/sounds/690160/

Recorded water, a wind layer, separate twin-engine voices, starting/stopping and gear cues respond to boat state. Local music uses the positional boat-speaker path. Muting boat sounds does not stop an external provider's player.

**Radio** plays the two included original instrumental demos and local files. Local files remain on the device. Paste a **YouTube video URL → Add link**, then press Play in the official visible player. Closing the player destroys it; hiding the page pauses it. Sign-in, ads, video restrictions and network rules remain controlled by YouTube. Its audio is not extracted, hidden or routed through spatial effects.

A **Spotify URL** opens that selection in Spotify's own app/tab. No account is linked, and there is no in-app Spotify playback. Spotify's platform policy prohibits game integrations and mixing/overlapping its protected stream. The app does not pretend to bypass those restrictions. Policy references: https://developer.spotify.com/policy and https://developers.google.com/youtube/terms/developer-policies

## Map and fittings

**Map** or **M** toggles the chart without leaving the helm. Click/tap to set a waypoint; zoom or clear it with the visible buttons. Depth colors use the same modeled bottom as the visible shallows and contact physics.

**Boat** exposes fish box, rod locker, livewell, tackle drawers, bolsters, fishing gear, lights, horn and close-up views without a drive-mode lock. Click the physical helm key, throttle and steering wheel. Hover a fitting for its action label. Free-walking and fishing-catch gameplay are not included.

The original hull, fixed T-top and previous cockpit repairs are retained. The new key is a runtime fitting. The earlier Blender model is the editable geometry baseline; the new water, key, UI and effects are implemented in JavaScript.

## Local launch

From a packaged release:

```sh
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080/`. Included assets do not need API keys. YouTube loads only after a user adds a link and requires an external network connection. WebGL and browser media support are required.

## Structure and future multiplayer

`world09.js` owns shared bathymetry/contact samples; `command-motion.js` owns local vessel physics; `water09.js` renders the world; `audio09.js` renders sound; `helm09.js` and `helm09.css` provide the solo helm and a versioned local command/event boundary. Legacy model/instrument code is retained for compatibility.

Accounts and multiplayer are not implemented, and no fake sign-up buttons are exposed. Next stages: route remaining inputs through validated commands; add server-authoritative rooms and vessel state with ticked snapshots; interpolate remote boats and assign helm ownership; then add account/session storage and permissions. Protected music must not be rebroadcast to rooms. No database, account or room server has been created.

## Verification

`test09.js` checks reversal with inertia, sandbar contact, reverse back-off, bounded bobbing and shared depth. `verify09.py` exercises rendered desktop/phone layouts, physical key clicking, recorded audio, map, fittings, depth/contact cues and media UI. `review_fixups.py` fixes demonstrated issues before repeating the tests.

Deterministic `testStep` scenarios are not frame-rate or real boat measurements. Phone-sized Chromium is not physical iPhone/Safari certification. Provider-frame loading is not proof that every YouTube video can play; consult the actual provider result. Read the per-release reports before claiming tests passed.

Realism is the development goal, not a claim of 100% acoustic or hydrodynamic fidelity.
