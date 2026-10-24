# Atlas D — Crew 8 Rally (P4)

Published-source playtest. Eight total captains: one host and seven guests.
**Native browser / public WebRTC / eight-device acceptance is still unverified.**
Existing SeaLab and dedicated Node-server projects are unchanged.

## Play together

Open `multiplayer.html`, create a room and share one invitation. All players must
use this revision and fresh protocol-v3 links. The host chooses one of five buoys
or the harbor rendezvous in **Sail together**. Captains mark **I’m ready**. The host
can then start a five-second advisory departure. **Take the helm** returns input
to the boat. Nobody is automatically steered, teleported or given throttle.

The on-water Find selector locates the shared destination or a teammate. It shows
distance, compass bearing and relative direction; chart mode draws a guide line,
and 3D adds a destination ring/beacon. This is a direction indicator, not route
planning around islands. The nearby count uses fresh reported positions within
22 m; disconnected, background and stale captains do not count. It is not scoring.

Changing destination resets readiness. A drop, unready captain, new arrival or
stale/background state before departure cancels the countdown without erasing the
destination. Same-page reconnection retains identity/seat and target, but the
returning captain must ready again. Refresh still needs a fresh join. Host closure
still ends the room. Keep the host visible; optional screen wake lock does not
prevent browser throttling. Crew status is not shared authoritative physics.

## Protocol boundaries

`atlas-browser-room-3`; invitations carry v=3 in the fragment. Existing v1/v2
links are intentionally rejected. HostRoom owns an explicitly versioned shared
plan; it accepts only named immutable standalone destinations, never arbitrary
coordinates or room/world configuration. Guests can change only their own ready
status. Control sequences are separate from movement sequences and preserved
through resume. Forbidden crew actions return a nonfatal visible rejection rather
than tearing down the fleet. Invalid snapshots, replayed plan revisions, malformed
readiness and identity/clock regressions remain rejected.

The five-second departure uses estimated host transport time. It is advisory, not
clock synchronization for physics and not a competitive race start. No new vessel
step, model/controller changes, captain implementation or collision physics.

## Verification

Run from `atlas_multiplayer`:

```sh
node --experimental-vm-modules --test play/tests/*.test.mjs
node --test play/tests/tcp-eight.test.mjs
```

Final **57/57 PASS twice**, against the actual local source; baseline P3 was45/45.
Actual loopback TCP: eight adapters/controllers see all56 moving remote views,
ninth admission rejects, same boat resumes. The added eight-client TCP case verifies
shared destination, all8 ready acknowledgements, common departure, guest command
refusal, preserved target/identity/slot after interruption and no boat writes from
crew commands. Transport is an explicit native Node TCP Peer-compatible test shim,
NOT a native browser, public signaling, ICE or WebRTC test. Pure protocol/navigation,
actual app lifecycle with synthetic DOM/render boundaries and real original bundled
Three.js marker construction are separately covered. No screenshots/GPU claim.

Read `REPORT.json` and `evidence/p4/tcp-eight.tap`. Complete outputs/manifests are in
the conversation handoff. Public HTTP tool inspection was inaccessible; no delivery
or connection result was inferred. No browser-policy change, workflow/dispatch,
runner search, service, credentials, permissions, purchase or account change.
