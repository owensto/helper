# ATLAS Fleet 02 — delivered review upgrade

Published and publicly verified on 11 October 2026.

Viewer: https://rawcdn.githack.com/owensto/helper/f2ab5e5f67263bbae8ddbfe0415c2b0579406de5/atlas_fleet_atelier_02/live/index.html

Direct entries: `?v=bay`, `?v=n`, `?v=w`, `?v=d`, `?v=chase`.
Use this new Fleet Atelier / 02 URL. Fleet 01 is unchanged. The host may require clicking **Open the page**.

## Completed in this review release

- Bay 25: reworked contoured rigid T-top, sculpted console, transparent windshield, twin bolster seats, cockpit liner, deck inserts, coaming pads, outboard cowling and fishing fittings. It is a new visual pass, not just recoloring.
- ATLAS-N and ATLAS-W: the direct Cutaway button initiates the separate interior download and clips exterior geometry. The initial section is framed to include the whole vessel. A section slider, opposite-side view, deck-only inspection, retry on interior-load failure, and restoration of the exterior are implemented.
- ATLAS-N: refined sail and exterior access fittings. ATLAS-W: door, railing, flight-deck and service details. Their interiors remain schematic.
- ATLAS-D: revised fishing tender integrated with its rigid roof retained. Dry-core and stowage inspection and a limited arrangement audit are included. This is not completion of the realism redesign.
- Five native Blender masters and their browser exports recovered from successful review build 38161103297. Public release workflow 38170164228 completed successfully.

## Public verification

The exact immutable URL above passed **10 of 10** browser-entry tests: Bay 25, ATLAS-N, ATLAS-W, ATLAS-D and Chase 12 in both 1600 × 1000 desktop and 430 × 932 phone-sized Chromium viewports.
For N and W, Cutaway was clicked directly before any interior camera preset. The tests checked interior loading, visible interior meshes, clipped exterior meshes, slider movement, opposite side, deck-only mode and restoring the exterior.
Selected detail views, animation states, playback/pause, finishes and notes were tested. ATLAS-D retained both tender roots below the visual waterline at the final dive pose; the standalone Bay 25 roof stayed fixed.
No recorded viewer JavaScript errors or missing required assets occurred. No local model injection was used. These are browser/geometry checks, not physical-phone or vessel-engineering tests.
Evidence: `online_validation.json`; public artifact 11713827712.

## Explicitly unfinished

The full production plan is not finished. Photorealistic finishing, complete furnished walkthrough interiors, full swept-body recovery and mechanism checking, and a build-ready ATLAS-D redesign remain open.
ATLAS-D still retains speculative outer-shell nesting. Its mass budget, surface stability, garage opening/freeboard and pressure rating are not established. The limited audit confirms selected permanent envelopes do not change internally during the animation; it does not validate the entire moving assembly.
No ship or tender in this release is certified or demonstrated safe to operate; naval assets are non-operational visual models.
