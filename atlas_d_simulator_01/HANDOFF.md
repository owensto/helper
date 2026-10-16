# ATLAS D original-vessel integration — workstream ownership

Owner: final Atlas D chat, assigned by Owen on October 15, 2026 (America/Chicago).
Scope: original transforming superyacht/submarine asset, yacht-specific operation, camera stations, tender/closure/shell animation, and an isolated Sea Lab integration preview.

## Source of truth

- Repository: owensto/helper.
- Original vessel: atlas_d_original_r7/live/ATLAS_D_Original.glb and model_report.json.
- Dimensions: 82.9 m length, 14.2 m beam. Forward helipad, terraced decks, two recovered tenders, one continuous hull. Do not substitute a generic submarine or scale the main hull during conversion.
- R7 clip: 48 seconds; conversion hold at normalized 0.8; its later vertical descent is an illustration, NOT simulator dynamics. Integration must sample only conversion tracks through 0.8 and own world translation separately.
- Host baseline being inspected: atlas_sealab_11/live. New world/map development and multiplayer remain other workstreams.

## File ownership / parallel-edit boundary

This workstream owns atlas_d_simulator_01/** and its dedicated .github/workflows/atlas-d-simulator-01.yml only. Existing Sea Lab, R7 originals, world/maps, physics, radio, multiplayer, and their release workflows must not be overwritten. A preview may copy an immutable host baseline into this workstream's live/ directory for testing; it is not a replacement for the shared main release.

## Proposed integration contract

Stable vessel ID: atlas-d-original-r7. Preserve physical metre scale, +X forward, +Y up. Expose plain finite state suitable for later multiplayer transport; this workstream does not implement networking, authentication, remote-player authority, or claim multiplayer validation. Shared-core integration must be reviewed with the coordinator, not silently applied across another chat's active files.

Acceptance targets: exact original asset loads; surface/secured/submerged/surfacing states; no dive before closure and known adequate water; gradual motion rather than replaying the original descent clip; visible depth and keel clearance; pause-safe controls; restart and return to Bay; browser smoke tests; immutable live preview URL after verification.

## Honesty / engineering boundary

Original geometry is a concept, not a human-rated submersible design. R7 has no certified depth, approved propulsion ratings, validated pressure hull, or validated packing/clearance analysis. Any handling, draft, ballast or depth limits introduced here must be explicitly labeled authored simulator parameters, not established real-vessel performance. Never claim a release is live or browser-tested merely because source was committed.

Status: source and host inspected; implementation in progress in this chat turn. This file is a handoff record, not a background agent or autonomous work promise.
