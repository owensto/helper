# Revision 3: country queues and reachable engine trim

This revision continues the same Easy Helm branch, based on public Beaufort13
491fbb0133fde085c03e4ee93db34f4e630a3c42. The separate `preview/index.html` entry
is for online user review. It is NOT the previously browser-validated release,
not a CORE14 integration, and not an assertion of completed harbor graphics.

## Changes you can try

**Music → Load Zach Bryan Favorites → Play in the visible YouTube player.**
A six-song queue is present without any pasted link: Burn, Burn, Burn; Nine Ball;
Oklahoma Smokeshow; 28; Purple Gas; Better Days. **Country Cruise** is a second
six-song queue mixing Zach Bryan with Luke Combs. Expand a card to start on a
particular song. The iframe playlist parameter queues the remaining songs in
order. These are app-curated queues, not an artist endorsement or a newly created
playlist on the user's YouTube account. They are not downloaded music files.

Links and titles came from the artists' official video pages checked2026-10-18:
https://www.zachbryan.com/ (Videos section)
https://www.lukecombs.com/videos/
Playback/embedding of each song has NOT been verified here. YouTube may show ads,
require sign-in or refuse playback. The player stays visible, has its own controls,
and offers a YouTube link. Closing it or hiding the page removes the iframe;
there is no hidden background audio, extraction or positional processing of it.
Personal audio files retain the original boat-speaker path. Spotify is external.
No recording or lyrics have been bundled. Queue behavior is implemented using:
https://developers.google.com/youtube/player_parameters#playlist

**Trim Down / Up** is now on the driving console, not buried in Boat setup.
Each tap changes the target by5 percentage points. The readout shows actual trim
and a different target while the motor is moving. It dispatches the original
trim command; the existing actuator, outboard-pivot update, thrust/propeller
immersion and clearance model are retained. Paused trim changes do not silently
resume the boat. Reference-mode trim remains fixed and labeled unavailable.
This is the existing limited trim range, not a new full out-of-water tilt mode.

On portrait phones the proposed control grouping puts ignition/direction in one
row, power in the next, and steering beside trim below it. The old full-width
rows were making the control panel taller than necessary. There are readable
labels and larger target buttons, rather than extra tiny unlabeled icons.
Actual layout, scrolling and touch targets still require browser review.

## Why downtown docks are missing

The exact release's `assets/beaufort_features12.json` has514 building footprints,
79 road features and23 bridge segments. It has zero dock/pier features. The baked
`beaufort_mesh13.json` likewise lists buildings/roads/bridges/land/trees but no
marina dock class. Turning on high detail cannot reveal geometry absent from
that source. This pass changes no scenery file or collider.

The receiving target is the actual Downtown Marina / Safe Harbor Beaufort and
the separately located public Day Dock, not generic docks scattered on the bank.
Primary references checked2026-10-18:
https://www.cityofbeaufort.org/574/Marina-Day-Dock
https://safeharbor.com/locations/safe-harbor-beaufort/
https://safeharbor.com/wp-content/uploads/2023/03/shm-beaufort-marina-map.svg
The operator lists32.4308643,-80.6735035 as its site coordinate; this is a POI,
not a navigable approach, exact floating-dock geometry or safe spawn position.
City proposal images must not be confused with the existing layout.

CORE Waterfront14 retains geometry, water, depth/datum, physics and integrated
release ownership. Its current checked directory contained source transport and
fixup scripts, not a published live/online-validation result. No conflicting
marina model, collision map, human, yacht or multiplayer changes were made here.

## Verification and limits

19 new CPU/synthetic-DOM checks cover default queues, URL construction, explicit
load/close/hidden lifecycle, local-authority loss, repeat opens, trim delegation,
paused/invalid trim and integration with the Easy Helm music menu. Original58
Easy Helm checks pass unchanged. Three additional checks execute the exact
published trim Bus and production vessel step: target-only intent, actuator
response and changed under-prop clearance. Inherited11 physics/wave checks pass.
These are NOT browser, rendered-motor, playback, physical-device or acoustic tests.
Three initial new fixture assertions needed cross-VM value normalization; their
failure report is retained. No expected command order or product gate was removed.

The standalone-copy installer preserves all119 non-entry original site files;
only its copied index gains six add-on references. The tiny online-preview loader
SHA-256 verifies the exact source index before initializing it with the same
references and an explicit base URI. It never replaces the validated public URL.
No browser navigation or alternate runner was attempted after the previously
recorded administrator restriction. No workflow, purchase, new service, account,
credential, human module or integrated-release change is involved.
