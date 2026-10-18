# Easy Helm revision 2 — first-trip guide and menu reliability

Status: **implemented and CPU-tested; not merged or published**. Continues PR8
from `94577838da6767363c78cef4ea659cfb9edf095c` on the same isolated branch.
The playable public Beaufort13 version and CORE Waterfront14 are unchanged.
The older README describes revision1; this record describes the additional work.

## User-visible changes

- Help and More offer **Resume & guide me**. On that explicit click, the current
  tool closes and the local simulation resumes. The guide then points to the
  real key, direction, power and steering controls, one stage at a time.
  It never starts an engine, shifts, applies power, steers, relocates, resets,
  changes weather or modifies physics on the user's behalf.
- **End guide** removes the prompts only. Manual Pause stays explicit and the
  prompts switch to Resume instructions rather than telling a paused user to
  increase power. Idle while still moving is described as **coasting**, not a
  brake. Contact, damaged-boat and unavailable-state instructions are distinct.
- Rapid switching between More and Music no longer lets an old queued update
  decorate the new panel. Closing/replacing a panel releases its own listeners;
  obsolete favorite buttons cannot act on the new list.
- Failed depth reads replace the previous label with **Depth unknown**. A small
  positive clearance reads **Less than 0.1 ft/m**, not misleading zero clearance.
- More includes a **Waves & weather** shortcut to the existing weather controls.
- Added guide layout rules, preserved explicit hidden states, scroll containment
  for tool panels, and a bounded landscape control area. These CSS changes have
  not been rendered or certified on a phone in this environment.

Guidance uses a polite, atomic live-status text node and text plus static outlines
rather than a flashing cue. Existing accessibility descriptions are preserved.
W3C reference: https://www.w3.org/WAI/tutorials/forms/

## Actual executed checks

**58/58 UI-policy/receiving checks PASS:** the original34 assertions and their
source are unchanged;8 focused usability regressions and16 guide/lifecycle tests
are new. Fixture execution is synthetic DOM/host, NOT a rendered browser.
The8 regression probes first produced **7 FAIL / 1 PASS** against revision1,
then **8 PASS** against this code. That before-result is retained in the package.

The guide tests cover opt-in/no automatic operation, stage/paused/contact states,
end-without-state-reset, original handlers, description cleanup, sampler recovery,
80 alternating menu openings and60 favorite updates. Listener scopes remain at
most3, with fewer than45 owned listeners in those scenarios, and zero on disposal.
These are scoped listener checks, not a browser/GPU memory-leak certification.

**11/11 inherited physics/wave tests PASS**, executed from byte-unchanged public13
source using its matching original site. No new physics/graphics gain is claimed.
JS syntax and Python installer compilation passed. A newly built candidate leaves
all119 original non-entry site files byte-identical. Its entry adds only the same
four local add-on references; no owner asset/control/model/captain edits.

One initial diagnostic failure attempted to print a circular synthetic DOM value
and exhausted the test process. Its assertion was changed to a boolean with an
explicit error message; the actual seven product failures were then recorded.
When sharing the original fixture across VM contexts, two tuple assertions needed
value normalization before comparison. This changed test serialization only, not
product behavior or the expected close/resume sequence. Interim report retained.

## Not passed / not done

No new browser navigation, remote-runner bypass, deployment, merge, services,
credentials or paid resources. The previously reported administrator browser
restriction is not bypassed. Actual portrait/landscape rendering, trusted touch,
screen reader, Safari/device checks and public playback remain open. This is not
another live release, and a ZIP is not represented as online gameplay.
Waves, shorelines, water optics, copyright-protected tracks, human work and
multiplayer have not been replaced or newly implemented by this slice.

## Reproduce

```sh
node test.cjs
node test-usability.cjs
node test-guide.cjs
python install.py --base /path/to/exact/public13/site --out /path/to/new/site
```

The version-specific adapter now supplies `paused()` and `closePanel()`; the guide
requires an explicit close capability. The local-only authority guard remains.
CORE14 needs its own approved receiving adapter and real browser acceptance before
integration. No room-wide pause or network authority follows from this local guide.
