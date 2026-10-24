# Beaufort Wildlife & Views 4

Separate static preview continuing Harbor Life3, not a browser/device-certified
release. Previous pinned game URLs remain unchanged. Original Beaufort world,
boat identity, country queues and one simulation clock are retained.

## Driving and speed

E ignition, F/N/R gears, W/S power, A/D steering, Q/Z trim, P Pause, M map.
Power remains set when W/S is released. Steering releases toward center through
the existing rudder actuator. Full explicitly removes the existing22% docking
limiter. A steering or camera gesture never starts the engine or changes gear.

A new untouched session selects the existing **modeled Single450** configuration,
using the native hardware-change guard and mass/engine update. Remembered300/450/
twin300 selections are retained after that. It does not add a speed multiplier,
change the timestep or secretly increase forces. Menu -> Boat controls -> Engine
setup still offers the existing configurations. In the retained90-second calm-
basin model trials: Single30043.77kn; Single45049.84kn; Twin30054.08kn. These are
simulation outputs, NOT real-vessel ratings, observed device speed or sea trials.

## Integrated camera

- **V** alternates first person and the remembered third-person mode.
- **1 / 3** or the small **1st / 3rd** buttons select a perspective directly.
- **C** or the **Locked / Look around** button selects fixed aft chase or orbit.
- In Look around, drag to orbit the moving boat; wheel or two-finger pinch zooms.
  Camera damping is independent of the vessel's real pitch/roll. Locked chase
  follows heading rather than inheriting all hull rotation.
- Menu -> View & graphics -> **Free camera** pauses the local vessel and allows
  WASD movement, E/Q vertical movement, Shift faster movement, and drag-to-look.
  Mobile direction buttons appear only in this mode. It cannot operate fittings,
  engine, gear, trim or throttle. The ordinary Pause button is disabled until
  return, avoiding an accidentally running unobserved boat. **Back to boat** or
  Escape returns; the pre-existing pause state is restored.

Free camera is inspection, not a walking/swimming character or collision-aware
player. It is limited to1.6km from the boat and yields to the existing photo mode.
It uses the native camera update; there is no second simulation/render loop.

## Recovery stays nearby in Beaufort

The actual crash-button function previously hardcoded a move to the test basin.
It now revalidates recently checked positions around the current trip, then tries
nearby water only. Seven rotated hull-footprint samples must have known water,
sufficient modeled depth at the current scenario tide, and no overlap with the
original nearby solid obstacles. A successful recovery keeps the same region,
trip time/distance, consumed fuel, weather, trim and engine configuration. It
repairs the vessel, sets engine off/idle/Neutral and zero motion, and resumes.

No valid local candidate means **no move**, with an explicit explanation. The
separate confirmed Return to launch command remains available. This conservative
sampler is not surveyed safe navigation or a guarantee between depth samples.
The runtime stores at most120 recent clear-water anchors and does not save them
across reloads. An old anchor is rechecked rather than blindly trusted at low tide.

## Dolphins

Three original, smooth skinned bottlenose-shaped game models are created near
the boat in chart-known Beaufort water. They have a continuous tapered body,
rostrum, curved dorsal fin, paired flippers, horizontal flukes, small eyes/mouth/
blowhole details, gray dorsal and pale ventral coloring, and a five-bone flexible
spine. The tail flexes vertically; animals surface in staggered breathing cycles
rather than continuously jumping. One smaller animal adds modest size variation.

Movement queries the same world depth and pier collisions as the boat, avoids
nearby boat positions and rejects unknown/shallow/land water. A bounded local pod
is not a whole-region population model, photorealistic scanned asset or validated
animal behavior. It neither damages the boat nor changes its force model. It
freezes with simulation time, and can be disabled in View & graphics. No external
model, copyrighted recording, online service or runtime AI request is needed.

Anatomical references used, not copied assets:
https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin
https://www.nps.gov/guis/learn/nature/bottlenose-dolphin.htm

## Graphics and deeper contact

The water's planar reflection gets lower normal distortion, a bounded five-tap
softening filter and more restrained reflection blending. Fresnel and the shared
wave/unknown-water masks remain. This is not ray tracing or a new reflection
engine, and the new appearance has not been GPU-compiled or visually verified.

Existing dock timber has pixel-filtered plank variation; land/banks/roofs/paving
have subtle broader material variation. Cleats and rubber fenders are instanced
along selected original mapped pier sections and follow the dock's tide-relative
height. They are illustrative visual detail, not newly surveyed marina structures
or new colliders. No new shoreline, depth or building footprints are claimed.

Four added port/starboard chine contact points make rolled-hull/edge-bank grounding
possible where the old four centreline-only samples missed it. Current yaw, pitch,
roll and the shared bottom field are used. The underlying force/propulsion model
and all2,921 original obstacle shapes remain. Deep calm native speed matches the
prior build; this is a targeted contact improvement, not a complete hydrodynamic
solver. Next substantial physics work needs measured draft/trim/roll/turn/coast
calibration, not arbitrary speed or bobbing multipliers.

## Consistent interface

One navy/teal palette now applies throughout the helm, menus and tool cards.
Selections use a border/inset indicator instead of large changing color blocks.
Shallow/contact warnings remain semantically distinct. The camera strip sits
above the driving area and hides for menus, photo/free mode and open trim, rather
than adding a large permanent panel. Actual portrait/landscape touch and contrast
acceptance still require a rendered device review.

Music is unchanged: Country music contains Zach Bryan Favorites/Country Cruise.
The official YouTube player remains visible while playing. Local audio and the
included instrumentals keep Computer Speakers/Boat Speakers modes; no protected
stream extraction, hidden-player audio or new Spotify integration is implemented.

## Actual verification

**84 unique CPU/receiving checks pass**, plus four modeled power trials:
25 new recovery/camera/skin/contact/material-source cases;9 integrated bootstrap
cases using actual bundled Three and synthetic DOM;4 checks using the actual
Beaufort chart, land terrain and all source pier obstacles;15 retained production
physics checks;19 prepared streaming/asset cases;5 real Three CPU scene checks;
7 native radio/media-fixture checks. The exact actual crash-handler closure is
executed, not merely a duplicate policy. Native-rig tests confirm engine-off,
Neutral and unchanged trip coordinates/time after selecting450. Source syntax,
Python compilation and CSS parsing pass.

The real-region test spawns all3 dolphins around the Beaufort launch and runs
one simulated minute without crossing its checked shoreline/dock exclusions.
A launch recovery candidate was12m away in Beaufort; lower tide was rechecked.
These results are deterministic CPU tests, not wildlife realism or visual proof.

One initial test fixture lacked AbortController for the bundled runtime; it was
corrected without weakening the assertions. An offline CPU raster of dolphin
geometry was inspected for shape; it is NOT an in-game screenshot. No browser,
alternate browser runner, live CDN response, actual song playback, GPU compilation,
physical phone/Safari, screen reader or FPS check was performed. The previous
administrator navigation restriction has not been bypassed. The existing build
job performs CPU tests and commits a complete static preview only.

## Reproduce

Python3 and Node22; no dependency installation or credentials. BASE is the exact
Harbor Life3 site4139361fb5f407536b5bab227e44c7baf1ce387e; BASE_SOURCE is its source
directory; EASY is the retained atlas_easy_helm directory from that same branch.

    python build.py --base "$BASE" --out /new/harbor4-site
    python check.py --site /new/harbor4-site --base "$BASE" --base-source "$BASE_SOURCE" --easy "$EASY" --out /new/checks
    python3 -m http.server 8080 --directory /new/harbor4-site

Only the candidate copy and new source/harbor4 files change. The original yacht,
HUMANS, multiplayer, CORE branches and previous pinned previews are not altered.
No account, paid service or third-party music/model download is created.
