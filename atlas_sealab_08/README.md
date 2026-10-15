# ATLAS Bay — Sea Lab 08

An interactive Bay 25 visual/dynamics prototype. This is not a navigational instrument or a sea-trial validated vessel.

## Drive

Choose **Drive**, then **Start engine + sound**. Select **F** and increase throttle. The large **kn** readout is speed over ground in knots; mph and speed through water are also available. **N** removes thrust while retaining inertia. **Pause / Resume** stays reachable with the operator panel collapsed and in the clear cockpit view.

**Configure** compares a single 300, a single 450 and twin 300s. Custom handling, engine masses, payload, fuel and conditions are modeled assumptions. The separately labeled **Reference** mode uses the published Sportsman Masters 247/F300 equilibrium curve, not an Atlas sea trial.

## Sound and radio

Audio is opt-in. Outboard sound combines an attributed CC0 generic outboard recording with RPM/load-driven synthesis, independent twin-engine voices, recorded bow water, wind and impact/control effects. It is not an acoustically validated recording of a particular 300-hp engine.

**Radio** opens the boat stereo: play/pause, previous/next, volume, seeking, and cockpit/direct listening. **M** toggles playback when you are not typing. Music can remain on with the engine off.

The two bundled tracks, **Lowcountry Drift** and **Tidal Run**, are original instrumental demos, not live broadcasts. **Your music** plays local audio without uploading it. The optional stream field accepts authorized, browser-compatible direct HTTPS audio streams. The provider must allow browser playback/CORS; web pages, playlists, protected streaming services and access restrictions are not bypassed. No commercial station is preset or claimed as verified.

## Instruments and appearance

The physical screens and expanded MFD use the same simulated position, speed, heading and course. The chart supports day/night, heading-up/north-up, zoom and waypoint bearing/range. Beaufort geography is an included NOAA ENC derivative; the test basin is fictional. The depth display is a synthetic echo band and A-scope derived from estimated chart bottom and assumed sensor offset. Missing coverage remains **NO DATA**. No live GPS, live sonar, fish detection or bottom classification is claimed.

The approved hull, fixed T-top and moving assemblies are retained. The geometry baseline includes casting-deck patches, coaming/cockpit closures and a fitted riser backing. A hull-local water mask prevents water rendering inside the cockpit. These are visual repairs, not a structural or flooding certification.

The Sea Lab 08 runtime adds clearcoat gelcoat, fine surface treatment, sharper optional high-detail shadows, and bounded bow-foam/spray pools tied to boat motion and simulation time. The retained Blender model is the editable geometry baseline; the additional appearance/effects are in JavaScript. This is not a fluid solver or a claim of finished photorealism.

## Local launch

Serve the packaged site over HTTP rather than opening it with file://:

```sh
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080/`. No API key is needed for the included model, chart data, effects or demo music. Optional external integrations have separate requirements.

## Verification

The review workflow restores the retained baseline, applies `patch08.py`, checks JavaScript syntax, and runs the shipped motion/speed tests and real-browser desktop/phone viewport checks. The release applies `release08_fixups.py` and retests before publication. Reports preserve errors, asset failures, shader errors, actual screenshots and audio-graph output.

Fixed-step model runs are not wall-clock performance measurements. Phone viewport checks are not physical iPhone or Safari certification. Read the release's validation reports and screenshots before describing it as verified.
