# Easy Helm + Country Music — isolated review add-on

**Status: implemented review candidate, NOT deployed or browser-certified.**

This add-on targets the exact playable Beaufort13 release at commit
`491fbb0133fde085c03e4ee93db34f4e630a3c42`. It does not replace CORE's ongoing
Waterfront14 work, change the original model, or adopt human/multiplayer modules.

## What is new

The optional **Easy Helm** presentation has a compact mobile header, larger
full-width driving rows, persistent Pause, and four main tools: Map, Music,
Weather and More. Original ignition, gear, throttle and steering elements and
handlers remain in place. The desktop default retains full controls.

**More** starts with a small set of assistance choices, view buttons and fitting
exploration. Less-used existing settings sit in an expandable Advanced section.
Existing docking assistance, spoken warnings, fitting labels, boat tour and
steadier camera are exposed more clearly; their underlying implementation is
not new to this add-on. The camera option does not reduce actual boat motion.

The new next-step text prompts the key, direction and power in sequence. A
clearance summary distinguishes unknown depth, shallow water and bottom contact
with words as well as color. Null depth and missing coverage stay unknown.
Adequate sampled clearance is not presented as a safe-route guarantee.
**Help** explicitly pauses this standalone local boat before opening the original
instructions. **Idle & coast** removes power, not momentum; it is not a brake.

Presentation preferences and up to five named music links are saved locally.
Blocked storage degrades to the current session and says so. User labels are
inserted as text, never as HTML. Links are restricted to recognized YouTube and
Spotify HTTPS selections, normalized and stripped of tracking queries.

## Country music

Music adds a Zach Bryan official service-selector shortcut, a country search
shortcut, direct access to the existing local-file picker, and named favorites.
No copyrighted tracks or lyrics are included.

* **Your own audio files:** play through the existing positional boat-speaker
  path. Files remain on the device. An offline download inside a subscription
  app is not necessarily an ordinary exportable audio file.
* **YouTube video/playlist links:** use the existing official visible player.
  The add-on does not extract audio, hide video, bypass ads or restrictions, or
  claim spatial processing of provider audio. Loading a valid link is not proof
  that every video will play in an embedded player.
* **Spotify links:** open externally in Spotify. No in-game Spotify player,
  linked account or shared-room broadcasting is implemented.

Official references consulted for this design:
- https://developers.google.com/youtube/terms/developer-policies-guide
- https://developer.spotify.com/policy
- https://zachbryan.lnk.to/SomethingInTheOrangeZE

## Build and test

Python 3 and a recent Node.js with the built-in URL/EventTarget/AbortController
interfaces are sufficient. There are no package-install or credential steps.

```sh
node test.cjs
python install.py --base /absolute/path/to/public13/site --out /absolute/path/to/new-review
python -m http.server 8080 --directory /absolute/path/to/new-review
```

Open `http://localhost:8080/` on the machine serving the files. Use HTTP, not
`file://`. The installer verifies nineteen exact baseline file hashes and refuses
an existing, overlapping or different-version output directory. It copies the
base, adds four files, and changes only the HTML stylesheet/script references.
All 119 other owner files were byte-preserved in the created candidate.

The included complete review package already contains the resulting `site/`;
serve that directory directly. It is a **standalone unpublished review build**.

## Actual verification

**34/34 PASS:** CPU-only preference, media-link/favorite/security and depth/intent
policy tests, plus synthetic DOM/host receiving tests for original controls,
help ordering, storage failure, duplicate install, panel cleanup, callback
ownership, timer/listener disposal and pending-microtask cancellation.

**11/11 PASS:** byte-unchanged original physics/wave regression test from the
public13 package executed with its original code and assets. These inherited
checks verify no new wave/physics improvement and do not measure real boats.

JavaScript syntax checks and Python compilation passed. The installer verifies
all baseline asset hashes; no original physics, water, captain or radio files
were changed. Reports are supplied separately with the review package.

**Not verified:** rendered layout, trusted mobile touches, screen-reader flow,
physical iPhone/Safari, GPU frame time, provider playback or listening quality.
The one attempted local browser navigation was blocked by the environment
(`net::ERR_BLOCKED_BY_ADMINISTRATOR`). No alternative navigation or remote-runner
bypass was attempted after that result. This is not a new live release.

The initial synthetic receiving test lacked a URL constructor in its fixture;
two favorite tests failed until that fixture was corrected. Product URL policy
was not weakened. Final test report retains its actual scope.

## Receiving contract and cleanup

Load `policy.js`, `easy-helm.js`, and `easy-helm.css`, then call
`installAtlasEasyHelm(explicitHost)`. `beaufort13-adapter.js` is the deliberately
version-specific standalone bootstrap; it must not be copied into a shared room.
All new commands require `host.isLocal() === true`. UI reads happen on a bounded
250-ms presentation timer, skipped while hidden; it does not step simulation.
Read-only ResizeObserver measurements follow the native dock/readout boxes.
Disposal restores the previous panel callback only while this instance owns it,
unwraps current native settings, removes owned nodes/listeners/timer, and leaves
later callbacks untouched.

CORE14 must supply an accepted adapter and run actual portrait/landscape tests
before incorporating this into its integrated release. Do not overwrite that
workstream's files, world/depth field, input authority or existing approvals.
See `WAVES_AND_INTERACTIONS.md` for prioritized receiving goals, not implemented
terrain/physics claims.
