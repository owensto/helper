# Revision 4 — music while driving, shared wake fade and shallow-water optics

This is a separate review revision, not a replacement of the validated public13
or an integration of CORE Waterfront14. Parent: 29f863c859c04c31e12af6ced7854cd27feb43a7.

## Music that stays with the trip

Load **Zach Bryan Favorites** or **Country Cruise**, press Play in the official
visible YouTube player, then **Drive with music**. The same iframe stays alive;
Map, Music, Weather and More no longer destroy it. Compact mode keeps a visible
200-pixel-high video with controls and a Close button. It is not hidden audio or
a stream extraction. Hidden-page and Close actions still remove the player.
Provider availability, ads and embed restrictions remain provider-controlled.

For **your own music files** and the included original instrumentals, persistent
Play/Pause, Next, Music, volume and speaker selection work outside the Music menu:

- **Computer speakers:** constant direct mix regardless of the viewpoint.
- **Boat speakers:** the existing positional stereo, distance attenuation and
  high-frequency rolloff relative to the virtual boat and camera.

Both modes play through the computer/phone's current OS-selected output. This
is not an OS audio-device picker and does not connect to real boat hardware.
YouTube cannot use the boat-effects route. Spotify still opens externally.

**Keep music playing when the boat pauses** defaults on in this revision and can
be switched off. Music Pause remains independent and is never undone by a boat
Pause/Resume. Radio startup still needs an explicit user gesture. Pause cancels
a pending Play request without waiting for buffering. Native hidden-tab behavior
is retained; lock-screen/background-app playback is not promised.

## Actual water/physics refinements

The original wake sampler retained a finite wave until its 6.4-second cutoff.
At the checked ring point it dropped approximately **0.017803 m in 0.0002 s**.
That discontinuity affects both a rendered wake and the field used by buoyancy.

`water-refinements.js` adds a C1 smooth attack over 0.35 s and fade from4.8 to6.0 s.
The fade ends before the oldest packet can be evicted by the original12-packet
capacity (earliest nominal recycle is6.24 s). CPU heights/slopes and generated
water shader use the same envelope; foam tails also fade rather than disappear.
Mature wake shape, the eight ambient wave components, emitter positions, clock,
capacity, currents, engine parameters and boat coefficients are retained.

The measured cutoff difference becomes zero in the same probe. This is a small
wave-continuity correction, not a fluid solver or a sea-trial realism claim.

For viewing shallows, the previous optical path divided depth by the **unbent
air-side** viewing cosine. The corrected path uses the refracted water-side
cosine (a simplifying refractive index of1.333). At60 degrees and1m depth the
modeled path changes from2m to1.31543m. Fresnel reflection is retained and still
approaches total reflection at grazing angles. This avoids unnecessarily dark
shallow transmission without making the whole river transparent. It is not full
screen-space refraction; no water depth, shoreline or datum was changed.

Reference: https://www.pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission
Media references: https://developers.google.com/youtube/terms/developer-policies
https://developers.google.com/youtube/player_parameters
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics
https://developer.spotify.com/policy

## Waterfront14 receiving, not duplicate scenery

Inspected the retained R3 artifacts from run39006587019, source
b5abae9ac7715d30533e4134ec45b8a092d6eb44. Desktop's actual browser report passed;
all three phone layouts stopped at the immediate End-practice visibility check.
The failed-run screenshots show End after the asynchronous UI state catches up.

The existing candidate contains19 piers, source-backed NOAA terrain, mapped
waterfront features, inferred roofs/facades, tide-following dock geometry and
its own low-speed physics refinements. None of that candidate is newly invented
or included in this Sea13 music preview. The public13 no-dock finding remains true.

The exact owner practice function closes its menu but leaves CSS classes marking
that menu open until a later UI tick. A scoped receiving proposal synchronizes
the closed-menu classes immediately and closes an open map before practice, so
the map's suppression rule cannot hide End either. Five receiving tests execute
the original and proposed practice bodies with interface fixtures and existing
CSS selector semantics. This is not a new browser run or a closed release gate.

`waterfront14-receiving-fix.cjs` only writes a new output file when explicitly
invoked with the exact SHA256 in waterfront14-source-pin.json. It is NOT loaded
by the preview/installer and never overwrites CORE14 source. No scenery, host,
human, yacht, multiplayer, workflow, account, permission or service was replaced.

## Verification and limitations

The original58 Easy Helm UI checks remain unchanged. The earlier19 motor/music
checks remain, with ONE intentionally revised assertion: source switching still
stops the country player, but opening a tool now must not. Its old assertion is
retained in the evidence package, not misrepresented as unchanged.

New checks:15 cruise-audio receiving;7 executing the original radio/stereo code
against media/WebAudio fixtures;17 wake/optics/shader-string/production-step;
5 exact-source Waterfront14 receiving. Existing3 trim and5 loader checks pass.
The original11 boat/physics/wave assertion bodies pass before and after installing
the shared wake correction; these are11 unique checks, not22. JS syntax, Python
compilation, CSS parsing and index initialization order pass.

A new double-install guard initially failed in the wave module and was corrected;
that initial report is retained. No failed expected assertion was removed.
All119 non-entry base files remain byte-identical in the copied candidate; nine
additive references load the versioned behavior and stylesheet changes. Runtime
wave/optics DO change, so the build report now states that explicitly.

No browser navigation or alternate runner was attempted after the prior recorded
administrator restriction. Public CDN serving, visible mobile layout, trusted
touch, actual media playback, listening quality, GPU shader compilation and FPS
remain unverified. This review is not another certified live release.
