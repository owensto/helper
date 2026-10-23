# Atlas D Open Water — public peer playtest

Two static entry pages: `index.html` (solo) and `multiplayer.html` (room panel). Same original Bay artwork and authored casual controller, isolated from SeaLab/CORE/HUMANS/yacht. This is not an authoritative boat simulator or a dedicated multiplayer-server deployment.

## Startup repair
The user reported the old generic startup error. Its exact browser-specific exception remains unknown. The replacement starts a usable Canvas 2D sailing chart before loading Three.js or the model. Renderer, download and model failures no longer stop chart gameplay. The original model is checked by actual SHA256. Resource failures report a stage and bounded code; an HTML response is not blamed on WebGL. Detailed 3D is optional and uses the existing unchanged original model. A chart-view fallback is explicitly labeled, not represented as 3D validation.

## Multiplayer
Select Create room, copy the fragment-only invitation, then have the guest open it and select Join room. The browser creator is the room host and must remain open and visible. Names/poses travel as bounded data messages; no media APIs or camera/microphone. The host checks invitation capability, protocol/world, name/identity, room capacity, distinct launch slots, sequence/clock and pose bounds. Remote boats interpolate; no remote physics or boat-to-boat collisions.

This is a DIFFERENT experimental transport from the existing atlas-net-3 Node service. It uses version-pinned PeerJS 1.5.5 from jsDelivr and the documented free public PeerServer defaults (including upstream STUN/TURN configuration), loaded only after explicit room interaction. Solo does not load PeerJS or contact signaling. Peers can learn network addresses; public signaling/relay availability has no guarantee here. Host departure ends the room; refresh requires a new join. No same-identity reconnect, persistence, server authority or host migration claim.

The pinned dependency's public bytes/security audit and actual WebRTC/cloud connection have NOT been executed in this restricted runtime. Host-room event simulations are not network proof. The previously unpassed ws pin/browser/integrated gates are not waived by switching transports. No new workflow, runner search, browser-policy change, hosting account or payment.

## Evidence
`node --experimental-vm-modules --test play/tests/*.test.mjs` — 24/24 PASS. Includes real original model header/hash checks, actual original Three.js scene construction, protocol/identity/clock/spawn rejection, actual peer adapter with explicitly in-memory event channels, and actual app lifecycle with synthetic DOM/render boundaries. The real controller continues to move after injected asset/renderer failures. VM Modules emits its normal experimental warning.

No browser rendering, visual/touch, real WebRTC, public asset serving or two-device acceptance is claimed. REPORT.json records these separately. Public delivery uses immutable commit URLs; earlier immutable links cannot silently receive this repair.
