# Public sailing playtest — SOLO ONLY

Owen requested an online link instead of running a local test kit. This additive static entry provides the S1 sailing scene without requiring Node, npm, a hosting account or a local terminal. It is a partial public preview, NOT the requested completed multiplayer release.

Source base: dd210c408a12a41f33aeae367e17b67b0906c8a4. Ownership: atlas_multiplayer/public-playtest/** only. The original standalone game, controller, world, artwork, runtime, room client and server are unchanged. No SeaLab, CORE, yacht or HUMANS module is changed.

Open index.html through the project's existing immutable GitHub/githack static host, using the commit SHA containing this directory. This preview uses relative URLs and the original assets at the same commit. Do not open the HTML as file://.

W starts/adds throttle; S reduces or reverses, A/D steer, Space coasts, E toggles the engine, and C changes camera. Touch helm controls are included. This is authored casual Bay-boat motion, not yacht dynamics or measured SeaLab physics.

The separate browser entry removes networking imports, room connection setup and remote interpolation calls. About this test explicitly states that multiplayer is unavailable. No WebSocket is created, no invitation is generated and no fake player/connected state appears. Public preview status cannot satisfy any private-room, dependency or multiplayer acceptance gate.

Checks executed locally (nonbrowser):

    cd atlas_multiplayer
    node --check public-playtest/app.mjs
    node --test public-playtest/test-preview.mjs standalone/tests/controller.test.mjs

14/14 PASS: eight source/asset/entry checks plus six unchanged controller checks. These verify relative-resource reachability, DOM identifiers, runtime scene exports, original GLB structure and unchanged source, honest solo labels and absence of socket/room creation. They do NOT certify rendering, native keyboard/touch, GPU, two-device traffic or public availability.

A separate exploratory Node model parse enumerated 169 meshes after correcting a cross-VM ArrayBuffer test-harness mismatch. Texture decoding was unavailable in that nonbrowser runtime. No textured/rendered visual result is claimed from it. No browser launched, URL policy changed, alternative browser route, workflow or runner dispatch used.

Original multiplayer release gates remain open: genuine pinned dependency install/lock/audit, authorized rendered two-browser acceptance, connected Node/WebSocket hosting and public HTTPS/WSS checks. This static page is not a backend or an alternative authoritative physics service. Existing public games remain untouched.
