# ATLAS Bay Performance Lab 03 — delivered reference-performance update

Public app: https://rawcdn.githack.com/owensto/helper/215c67d2c7a2d767beb9bbff65c63e7c1994ffa0/atlas_bay_performance_03/live/index.html

This build was published and tested before the interrupted response delivered its link. The completed public build and evidence have now been recovered, the source table checked again against the manufacturer, and the numerical tests rerun. This delivery does not create another geometry revision or replace prior releases.

## Try it

The host may request **Open the page**. The application label is **BAY · PERFORMANCE / 03**.

Select **Drive the boat**, leaving **Measured F300 reference** selected. Start the engine in neutral, select Forward and increase throttle. Open **Performance & source** or **Data & tests** for the complete table and source links. **Run 3,500 RPM**, **Run 5,800 RPM** and **Timed 0–30 mph** start demonstrations in a separate fictional straight lane, then pause on completion. The RPM runs allow 65 simulation seconds after warm-up. The acceleration demonstration is explicitly a fitted endpoint exercise.

## Real source; correct scope

Source: Yamaha Outboards, Sportsman Masters 247 with one Yamaha F300XSB2, tested 28 June 2023. Bulletin PB_SPT_Masters 247_F300XSB2_6-28-2023_BAY.

https://yamahaoutboards.com/outboards/350-150-hp/v6-4-2l/f300-(4-2l)/pb_spt_masters-247_f300xsb2_6-28-2023_bay

Boat-maker cross-check: https://sportsmanboatsmfg.com/masters/247-bay-boat/performance/yamaha-f300xsb2-single

The reference test reports 4,591 lb total test weight, two people and 35 US gallons of fuel. The dataset has eleven steady forward RPM/speed/fuel rows, spanning 1,000–5,800 RPM. Examples: 3,500 RPM / 29.6 mph / 8.5 US gal per hour; 5,800 RPM / 50.9 mph / 26.4 US gal per hour. Published acceleration endpoints are 3.50 seconds to plane and 7.70 seconds from zero to 30 mph. These measurements belong to the Sportsman/Yamaha combination, NOT the ATLAS hull.

The source describes approximate, setup- and condition-dependent results. This app reproduces the source curve using ATLAS's visual model; it is not a prediction that ATLAS will reproduce these figures.

## Implemented behavior

- Forward speed is driven toward the source RPM/speed curve, not only relabeled on a HUD. Fuel-rate readouts, the on-model engine screen, and source/interpolation status use the same dataset.
- Linear interpolation is confined to the published RPM interval. No measured fuel rate is invented for idle, neutral or reverse.
- A single acceleration-response constant was fitted to the published 7.70-second endpoint. At 60 Hz the code produces approximately 7.69 seconds. This is a fit, not independent validation or a measured acceleration trace. The displayed planing state is still modeled.
- Editable fuel and hold-back inputs provide a constant-speed range scenario. Integrated forward fuel use is an estimate from the steady curve. Unmetered startup/idle/reverse time is tracked; omitted fuel burn makes remaining balance and range accounting upper bounds, shown with a less-than-or-equal symbol. Changing fuel bookkeeping does not change the reference test weight or speed curve.
- Reference mode holds added wind/current and trim effects fixed. This does not recreate the test weather: the actual bulletin reports 10–15 mph wind. **Experimental coastal handling** restores the earlier adjustable conditions and trim, without measured-performance claims.
- All cockpit model assets are preserved, including drawers, bolsters, lids, steering and the six-holder/GPS/single-engine appearance. The 9,735,464-byte GLB is unchanged from Play Lab 02; SHA256 4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1.

## Verification

Publication run 38495592780 completed successfully. Artifact 11864428204, SHA256 e8a10b37f3c3ca829d5b58f5f30cc8259b7909ad2d83217a80fc434d040ace99, contains the exact app, source, test results and screenshots. online_validation.json records passing public reference and cockpit-regression suites at 1600 x 1000 desktop and 430 x 932 phone-sized Chromium viewports, with no recorded page errors or missing required assets. No replacement local model was injected into the public checks.

The 16 reference and 11 experimental-motion checks were rerun successfully during delivery recovery. Every original RPM/speed/GPH/MPG table entry was checked against the current official bulletin page. The long browser equilibrium checks advanced the actual runtime integrator programmatically; normal forward controls were additionally exercised in rendered frames. These are not sustained frame-rate or physical-phone tests.

The recovery environment could not make a new browser navigation to its local server because browser policy blocked that request. No new local or public browser pass is claimed on that basis; public-browser evidence is the completed publication suite described above.

## Remaining limits

ATLAS sea-trial performance, actual mass/CG, draft, structure, engine installation, turning, reverse behavior, waves and operating safety remain unvalidated. No 450 hp profile is extrapolated from this F300 dataset. The app's geometry, map and depths are not a surveyed vessel or navigation product. Fuel range is not a passage-planning guarantee. Previous Play Lab 02 and all other fleet models are unchanged.
