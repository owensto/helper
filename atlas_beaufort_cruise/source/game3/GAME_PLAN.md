# Beaufort Harbor Life — playable-world plan

Working title. Build a relaxed boating game around an excellent Beaufort trip,
not a collection of disconnected controls. No age labels in the interface.
The current build has free cruising, sightseeing objectives and harbor practice.
The career, awards and economy below are PLANNED, not implemented features.

## Core play loop

Choose a short outing, prepare the boat, leave the marina, complete an objective,
return under control, then save a result and unlock the next outing. Keep a free
cruise mode permanently available, with no timer, fuel penalty or mandatory job.
A player should be able to enjoy five minutes or spend an hour exploring.

Six top-level menu destinations: Explore & play, Country music, Weather & water,
Boat controls, View & graphics, How to drive. Keep mission detail out of the driving
HUD until an outing is active. Offer hints and a stable camera separately from
physical assistance. Keep keyboard, touch and pointer controls equivalent.

## Milestone 1: dependable departure and return

The launch package must load reliably with working WASD, proportional touch
steering, trim, ignition and unobstructed Pause. Country queues must survive the
native Music render, not only synthetic card creation. Keep video providers visible
and clearly distinguish direct/local positional sound from provider streams.

Acceptance: desktop, narrow portrait and landscape; actual touch; menu/keyboard
focus transitions; start, accelerate, turn, trim, coast, reverse, pause and resume;
media error/retry; 20-minute round trip with no unbounded memory growth. Measure
frame-time distributions on named reference hardware before promising 30/60 FPS.
The present environment's browser restriction has not been bypassed. CPU success
is not completion of this milestone.

## Milestone 2: docking school

Use existing source-backed dock geometry and separately registered collisions.
Begin in calm conditions, with a generous approach area and no timer. A practice
card explains the target berth and assists before the player starts. Award bronze,
silver and gold based on approach speed, alignment, contact severity and a controlled
stop held for several seconds. Never reward speed alone in a marina.

Track local results using a versioned schema: worldRevision, boat configuration,
mission ID, settings/assists, result and timestamp. A recovery/teleport invalidates
a competitive result but remains available. Awards describe game performance, not
real-world qualification. Add wind/current variants only after the base mission is
pleasant to operate on a phone. No hidden steering or automatic brake.

## Milestone 3: harbor outings

Add short passenger sightseeing and parcel-delivery trips. Clearly identify
pick-up/drop-off areas rather than scattering abstract markers throughout water.
Keep tasks achievable with the starting boat. Difficulty should come from precise
approaches, current, visibility and route choice, not compulsory grinding.

Simulated fuel, repairs and payouts can become an optional career mode. Cash must
be earned from an event record, not every frame in an arrival zone. Do not implement
real-money purchases, gambling, leaderboards or paid licenses for this pilot.
Use fictional passengers and businesses unless permission is obtained.

## Milestone 4: a boat worth caring about

Persist paint, trim preferences, assists, music-link favorites and completed
outings. Consider fenders, mooring and a usable anchor only after their force/contact
behavior works. Fishing needs a coherent cast, tackle, fish behavior and catch/release
loop; do not call a decorative rod a completed fishing game. Multiplayer follows a
stable solo release and requires real room/boat authority, not just a shared seed.
No duplicate human, yacht or multiplayer module is assigned by this plan.

## Visual priorities for Beaufort

1. Recognizable marina and shore approaches: dock edge, pile spacing, floating
   levels, bank silhouette, visible safe/unsafe contact cues and geographically
   consistent landmarks. Existing/inferred detail must stay labeled as such.
2. Replace repeated tree blobs and box-like roof forms with a small optimized set
   of live-oak, marsh and waterfront-building assets. Keep deterministic placement
   and instancing where appropriate. Prefer strong silhouettes over more particles.
3. Improve sunlight, shadows and material response as a complete daylight scene.
   The current incremental material pass adds distance-filtered grain/relief and
   wet roughness to the existing land; it is not photogrammetry or new buildings.
4. Add reflected local waterfront information and coherent waterline wash at
   controlled cost. Keep natural shallow visibility separate from assistance
   overlays. Never derive physics depth from a decorative effect.

Render quality must not change the collision set or seabed. Maintain the 64-cell
prepared region for this pilot; expanding coastline is a separate content task,
not an "infinite world" claim. Test turning back and cache eviction at boundaries.

## Physics priorities

The current step uses six buoyancy supports, authored marine-force approximations
and a fixed native clock. This pass corrects the sample positions so the new hull
yaw and actual prior sample positions agree during turns. It does not claim new
hydrodynamic calibration or faster real-vessel performance.

Next: record draft/load equilibrium, roll/pitch decay, turning circles, coasting,
cross-current docking, trim/propeller immersion and sandbar backing-off. Replace
coefficients only with an explicit rationale and before/after evidence. Preserve
reference performance mode. Separate water displacement and planing support; keep
hull geometry, thrust position and load center consistent. Dock fenders/mooring
need stable compliant contact, not instant velocity zero. Distinguish sand contact
from piling impact. Optional explosions remain cinematic and off by default.

No new library or engine migration is necessary for the first playable loop.
A rigid-body engine may help contacts later, but it does not supply marine physics.
Use the existing simulation clock; avoid multiple input/animation loops modifying
the same state. Camera comfort must not silently flatten the physical sea.

## Scope and references

Plan authored for the current prototype and user's requests; these are development
choices, not measured performance claims. Keyboard input uses physical-code routing
with a character fallback, avoiding text fields and OS shortcuts:
https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code

Materials continue the existing Three.js linear lighting workflow:
https://threejs.org/manual/en/color-management.html

Visible provider music remains under provider rules; no protected audio extraction,
YouTube audio hiding, track bundling or fake Spotify account integration is planned.
