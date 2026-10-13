# ATLAS Bay Play Lab 01
A separate browser driving/inspection prototype using the approved Studio 07 model. Studio 07 remains unchanged. Native model and browser export included.

## Scope
Independent fish-box, rod-locker and livewell lid controls; recesses beneath the first two; steering wheel and outboard steering; visual propeller rotation; stowable fishing gear; deck-light toggle; simulated instrument map/speed/heading; engine, throttle, forward/neutral/reverse; chase/helm/orbit/deck cameras; fictional practice basin, buoy course and docking target.

The hull and roof are not redesigned. Hardware kinematics are illustrative, not interference/load-qualified. This is deliberately uncalibrated handling and not a navigation or boating-training application. No real GPS, depths, speed predictions, horsepower rating, draft guarantee, safety or seaworthiness claim. No walkthrough, real fishing gameplay, audio, multiplayer, install/offline guarantee or app-store release in this prototype.

Open `site/index.html` using a static HTTP server. For example `python -m http.server 8000 --directory site`. External libraries/assets are included; no tracking or location access. See THIRD_PARTY_LICENSE.txt.

Keyboard: W/S throttle; A/D steering; F forward; R reverse; N neutral; E engine; Space arcade stop (not a physical boat brake). Phone-size layout offers on-screen controls. Entering Explore pauses and stops the simulated boat; switching to Drive secures lids and stows gear. Real-world operating procedures are not represented.
