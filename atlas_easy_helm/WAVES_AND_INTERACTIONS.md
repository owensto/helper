# Receiving goals: waves, shoreline and interaction

These are product/design requirements for the existing CORE Waterfront14
workstream, not additional delivered world or physics implementations.

## Waves that read clearly from a boat

Preserve a single owner clock and the shared water-height/normal field used by
rendering, buoyancy and clearance. Layer long moving swells, shorter wind chop
and bounded vessel wakes. Do not sell a second cosmetic bobbing loop as better
physics. The boat should crest and settle with the surface under each buoyancy
sample; a camera-stability switch should change only the view, not the boat.

Acceptance examples: a neutral boat in calm water, beam-on swell, head-on swell,
acceleration onto plane, cutting across its wake, a pause/resume, and a switch
between graphics quality settings. Compare the same seed/clock/state so lighting
cannot disguise changed handling. Record frame-time distributions on the actual
phone and a desktop, rather than calling screenshot counts smooth performance.

## Angle-correct water and visible sandbars

At a downward viewing angle, shallow water should reveal the sand and nearby
bottom detail; at a low/grazing angle, stronger reflection should reduce that
visibility. Keep refraction/attenuation, sky reflection and small normal ripples
coherent. Avoid one flat alpha slider that makes the entire river glass-clear.
Provide a separately labeled shallows-assistance overlay for visibility beyond
ordinary conditions; do not call that realistic optics.

Use the same bottom and scenario tide for the visible sandbar, chart and contact.
Useful readability cues: exposed pale crest, darker wet sand edge, shallow green
water transitioning to deeper tones, and foam only where there is a modeled
reason. No invented safe channel across unknown chart coverage. Do not mix land
elevation and chart depth without an explicit vertical-datum conversion or an
honest unsupported-data boundary.

Capture approaching the same bar from helm, side and elevated views, in daylight
and dusk, in calm and rough water. Check turning/trim/grounding/back-off against
the same geometry; a bright overlay is not a collision or navigation guarantee.

## Land should provide landmarks, not just a colored boundary

Keep source-backed shoreline, bridge and footprint placement. Add terrain shape,
marsh-edge vegetation, trees, piers, shoreline structures, bank material and
shadows where data supports them. Facade, vegetation and unsurveyed height detail
must stay labeled illustrative. Prefer a few recognizable landmarks and useful
mooring approaches over lots of costly generic detail. Use instancing and distance
levels of detail with measured mobile budgets, not a blanket maximum setting.

## Interactions and senior-friendly usability

First expose what already moves: tap a clearly labeled hatch, livewell, rod
locker, drawer, lights or horn; give Open/Closed/On/Off feedback. Keep the guided
boat tour and shortcuts to Driver, Behind boat and Look around. No hover-only
requirement or surprise full throttle. Keep Back and Pause easy to reach.

Next useful feature candidates, in this order:
1. A three-step first-trip walkthrough, with a Replay instructions button and
   optional spoken guidance. Avoid age labels in the interface.
2. A recoverable arrival/docking exercise with generous targets, gentle preset
   conditions and an explicit assistance switch. Do not silently teleport or
   invent an automatic brake.
3. A favorite-outing card storing start location, weather and preferred view;
   restore only supported known-water spawns and clearly show what will reset.
4. A photo mode with one Take photo action; an explicit Pause is fine for a solo
   session, but must not pause an eventual room for everybody.
5. Actual anchor/mooring, fishing-rod/cast and bilge/battery interactions only
   after their physical/gameplay effect exists. A decorative toggle should not
   claim the boat is secured or a system is simulated.

Use readable words, high contrast, large primary hit areas (design target
52–64 CSS pixels), no color-only warning states, safe-area-aware panels, and both
portrait and landscape. WCAG target-size guidance is a design reference, not
proof this unrendered candidate conforms:
https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced

## Audio realism

The existing generic outboard samples are not an engine-specific calibration.
A future convincing acoustic pass needs licensed or original recordings of
start/idle/load/cruise/deceleration/shutdown, loop/crossfade validation and a
headphone/phone-speaker listening comparison. Separate mechanical, exhaust,
wind, hull slaps and water layers with appropriate position and level. No claim
of “100% realism” follows from adding a recording or increasing bass.
