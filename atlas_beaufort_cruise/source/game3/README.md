# Beaufort Harbor Life 3 — WASD, restored country music and a clearer menu

Separate static preview continuing the same Beaufort branch. This is not an
actual-device or newly browser-validated release. Prior pinned URLs are unchanged.

## Drive

E turns the ignition on/off. F/N/R selects Forward/Neutral/Reverse. Hold W/S to
raise/lower power; hold A/D to steer. Releasing power keys retains the throttle
setting; releasing steering keys centers the target through the original rudder
actuator. Space requests idle and Neutral, not an instant stop. Q/Z trims up/down.
P pauses; M toggles the map. A slow boat may still have docking assistance enabled;
Full explicitly removes its 22% power limit as in Clean Helm2.

WASD now works when the driving power range retains focus. Arrow keys on a focused
range retain that control's native operation. Text entry, content-editable areas,
modifier shortcuts, menus, paused/photo/hidden states and remote authority do not
receive held navigation input. Menu/Pause/blur clears held keys. No added input
timer or automatic engine/gear changes. After interacting with a provider iframe,
click the water or Return to driving; embedded-player keystrokes cannot be captured
by the parent game. Touch controls and original discrete handlers remain.

## Country music restored

The cause was ordering: the previous country decorator inserted its two cards,
then the native radio fallback replaced body.innerHTML and removed them. The
corrected decorator runs after native controls exist, with stale-panel guards.
Both Zach Bryan Favorites and Country Cruise are included again, with the same
six verified-source link selections each. Nothing is downloaded or autoplayed.
Menu -> Country music -> Load a queue -> Play in the visible YouTube player ->
Drive with music. The same player persists across tools. Your own audio files and
included tracks retain Computer/Boat Speakers; provider audio is not spatialized.
Embedding, ads, availability and playback have not been tested in this session.

## Menu and game plan

Six large labeled categories replace the long settings list: Explore & play,
Country music, Weather & water, Boat controls, View & graphics, How to drive.
A clear Return to driving action restores scene focus. Tools open on demand.
Responsive card layout and scrolling styles are implemented, not phone-certified.
The in-app Game roadmap and GAME_PLAN.md describe a staged Harbor Life career:
departure/return, docking medals, sightseeing/delivery jobs, then saved progression.
Only existing sightseeing/practice is playable now; no new career payout/save or
multiplayer is claimed.

## Actual realism changes

Six buoyancy supports now sample the current yawed hull, not the pre-turn yaw at
the new center; previous water samples use the actual previous pose including
rotation. An exact production-step analytic-surface probe measured a 0.026635 m
sample-position discrepancy before, zero after. Straight-heading calm model output
is unchanged to numerical tolerance. Coefficients, mass, engine curves, collision
set, geography and simulation timestep are not replaced.

Land, banks, wood, roofs and paving receive small distance/pixel-filtered normal
detail and wet-dependent roughness. Existing geometry is unchanged; this is not a
new tree/building asset library or photogrammetric scenery. Shader-source assembly
passed with the bundled Three standard shader, but GPU compilation and visual
quality have NOT been verified. Broad hull dynamics and land silhouettes still
need the deeper work recorded in GAME_PLAN.md.

## Evidence

66 unique candidate CPU checks:20 new input/menu/music/native-order/sample/material
checks,15 inherited production-physics,19 prepared-stream/assets,5 real Three CPU
scene and7 native radio tests with media/WebAudio fixtures. Four original power
trials also run. Missing country cards were reproduced through the original native
openPanel fallback, then both queues survived its unchanged innerHTML replacement.
30 menu reopen cycles leave one playlist block and no automatic playback.

Initial test-fixture failures are retained in the conversation work folder: isolated
production functions needed separate lexical scopes; contact also performs three
water queries before the six buoyancy pairs; the runtime fixture needed its normal
AbortController primitive. Corrections preserve all expected product assertions.
No actual browser, screen reader, touch, provider playback, GPU, CDN response or FPS
check was attempted. The prior administrator navigation restriction is respected;
the repository job is CPU/build/static publication only, not a browser workaround.

## Reproduce

Python3 and Node22; no dependency install or account keys. BASE is Clean Helm2 site
c0593c5d43f634394407a8758abd6908640c75d1, BASE_SOURCE its source directory,
EASY the retained atlas_easy_helm directory. Builder verifies exact input hashes,
uses a new output directory and leaves prior source and public links untouched.

    python build.py --base "$BASE" --out /new/site
    python check.py --site /new/site --base "$BASE" --base-source "$BASE_SOURCE" --easy "$EASY" --out /new/evidence
    python3 -m http.server 8080 --directory /new/site

The native shared clock remains sole authority. No human, yacht or multiplayer
module was changed or newly activated. No new paid service or account was created.
