# Performance Lab 03 — final public delivery recheck

This supplements DELIVERY.md: after the local browser-policy block recorded there, a separate GitHub runner successfully checked the exact public application again. The application was not changed or rebuilt for this check.

Public app: https://rawcdn.githack.com/owensto/helper/215c67d2c7a2d767beb9bbff65c63e7c1994ffa0/atlas_bay_performance_03/live/index.html

Verification run **38510052922** completed successfully. Artifact **11869955108** (`ATLAS-Performance-03-Delivery-Check`) contains fresh screenshots, `public/reference_browser.json`, data/model integrity and numerical-test results. Artifact SHA256: f2e182202ad7dc4dc3a38fe4998dc81bf023097f0d0c760a460757424b15a0a1.

## Results

- **16 reference unit checks and 11 experimental-motion regression checks passed.**
- All 11 source RPM/mph/US GPH/MPG rows were checked against Yamaha's Sportsman Masters 247 / F300XSB2 bulletin and the boat-maker publication. The unchanged model hash remains 4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1.
- The exact-public-URL reference suites passed at **1600 x 1000 desktop** and **430 x 932 phone-sized** Chromium viewports. No replacement local assets were injected.
- Normal engine start and player-driven forward motion, the source panel, both reference runs, the fitted 0–30 demonstration, invalid fuel-input rejection, and return to experimental drift were exercised. No recorded page errors or missing required model/app assets occurred.
- At the end of the 65-second 3,500 RPM reference runs, simulated speed was about **29.59 mph** against the **29.6 mph** source point, with **8.5 US GPH**. The 5,800 RPM runs reached about **50.89 mph** against **50.9 mph**, with **26.4 US GPH**. The fitted 0–30 result was **7.686 s**, versus the published **7.70 s** endpoint. These are empirical-curve reproduction and fit checks, not real-boat prediction-error bounds.

Long reference runs advance the application's actual fixed-step integrator through its test helper. Ordinary forward controls were also exercised in rendered frames. Neither the long-run checks nor screenshots establish real-time frame rate, physical-phone performance, or marine validation.

The published speed/fuel measurements belong to **Sportsman Masters 247 / single Yamaha F300XSB2**, not the Atlas hull. The same app offers **Measured F300 reference** and **Experimental coastal handling** modes. The former reproduces the published forward curve with added trim/wind/current effects held fixed; the latter retains uncalibrated maneuvering and conditions. Idle/reverse fuel remains unmeasured. Fuel/range values are labeled upper-bound scenarios where unmetered consumption is excluded. No 450 hp curve, sub-foot Atlas draft or validated Atlas hull/engine performance is claimed.
