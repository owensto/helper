# Human asset attribution and modifications

Microsoft Rocketbox Avatar Library, **Male_Adult_01**, and the matching `m_idle_breathe_01`, `m_sit_chair_breathe_01`, `m_walk_neutral_01` animation clips.

Copyright (c) 2020 Microsoft. **MIT License**, preserved verbatim in [ROCKETBOX-LICENSE.md](ROCKETBOX-LICENSE.md).

Pinned source: https://github.com/microsoft/Microsoft-Rocketbox/tree/0943055db6ec570bcef9f2c8b41c9e5467c808f9

Exact source paths, sizes and SHA256 hashes are in `provenance.json`. The asset is a fictional library character; no person's identity or endorsement is claimed.

Changes: FBX converted to GLB using Three.js 0.180.0; diffuse textures resized to 1024 pixels, body/head encoded as JPEG, alpha hair material retained; unused normal/specular maps omitted; duplicate vertices and material groups merged. Avatar scaled at runtime to 1.78 m. Animation quaternion channels retained, redundant constant keys optimized, facial-expression channels omitted, numeric samples rounded to six decimal places. Original joint hierarchy and skin weights retained. Runtime adds analytic limb IK, grip pose, flat sole orientation, torso balance and pelvis reach correction. These changes do not establish biomechanical accuracy.

Reproduce from this directory's parent: `python3 tools/fetch-assets.py`, run the localhost server, `node tools/convert.mjs`, `node tools/animations.mjs`. Set `CHROMIUM_PATH` for your installed Chromium binary. Source inputs are intentionally excluded from Git; the generated GLB, clips, provenance and license are included.

Three.js and its examples utilities are MIT licensed; the pinned npm dependency contains its LICENSE. Playwright is Apache-2.0 licensed and used only for development tests. Neither service nor payment is required.
