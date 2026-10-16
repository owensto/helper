# Y8 — replayable measurement evidence, not a runtime optimization

Runtime: immutable Y4 `e30edc8e33b863f3fafb303be0050cc86b7900f0`, actual `contact/y4/preview.html`.
Branch baseline: Y7 `5daea16829bfaac4a96d560efb2d4954ccfd48e3`.
Branch: `atlas-d/yacht-replay-y8-20261016`; reconstructed snapshot `/mnt/data/atlas-d-y8/work`.
Result SHA comes from the exact CI artifact manifest, not a predicted commit.

## Ownership
CORE owns coupled runtime/time/captain/shared integration/release; HUMANS owns rigs, geometry and occupancy; MP is untouched. Original GLB/controller/footprint/live/src and Y1–Y7 remain byte-identical. The existing yacht workflow is branch-only/test-only, with prior permissions unchanged. No runtime candidate, physics step, direct control write, hidden-tab workaround, new service/credential/account, asset transfer, merge or deployment.

## Audit gaps addressed
Audit6211539588 could not replay live power and physical-steering predicates from Y6's saved frame rows. Y8 retains current `sampledState.throttle`, `powerHUDText`, `physical.controlNormalized`, owner rudder and expected input source at every event capture and render completion. Direct owner values and the already-evaluated Y4 sample are distinct records; an event can legitimately see a previous evaluated frame before the original handler runs. Missing/nonfinite numeric values remain null with reasons; unmatched events have null match IDs/timestamps, never zero latency.

The original Y6 match semantics are retained: steering requires physical availability, sampled rudder and physical normalized control equal to the trusted event's expected value; power requires sampled throttle within 1e-8 and exact rounded percent HUD text. Expected input is independently reconstructed from event type/target/native range text, not accepted merely because an expected field claims it. Every attempted frame and first match are retained. `replay.py` imports no JavaScript predicate and uses only the saved JSON.

## Origin, clocks and zero-delta semantics
A pass-through native requestAnimationFrame wrapper recognizes the exact original yacht callback text, extracted from immutable `live/atlas-d.js`. It returns the native handle and invokes each callback exactly once with its unchanged arguments. No new RAF is scheduled by this shim. Every recorded render says `native_owner_raf`, `native_other_raf` or `outside_raf_manual_or_diagnostic_unattributed`. The last class does NOT claim an unknown initiating function or certify a diagnostic render as gameplay. Startup through trusted Board supplies a real synchronous example, without a test calling draw/testStep.

Each event/callback/render retains performance time origin, monotonic and absolute timestamps plus `Date.now()` wall time. Owner callback entry/exit state is saved. At render, consumed simulation advance is explicitly **observed owner elapsed at render minus owner elapsed at original callback entry**, with sequence delta as a separate check. It is not a measured private requested dt. Zero advance remains zero, including paused owner frames; no native owner boundary means unavailable/null, not fabricated zero. Negative/discontinuous observations retain their status. The unchanged geometry-only Y2 map's dt=0 is recorded separately as `fixtureDt` and never substituted for owner advance. Following-owner-RAF IDs are derived from already-recorded callbacks, not new synthetic callbacks.

## Bounded executed workload
Three fresh touch-emulated contexts per layout, 390×844 and 844×390, on the existing authorized yacht CI. Excluded 8-second warm-up. Each measured segment repeats the Y6 six alternating trusted left/right holds/releases and one native power input. Separate startup and UI-validation segments retain Board/manual-origin and paused zero-advance examples. Measurements do not include screenshots, video, pixel reads, extra physical queries or in-interval host polling. Existing current samples and five rays remain on. All independent physical/projection checks and neutral/left/right images occur outside measured segments.

Replay reconstructs first matches, rejects inconsistent claimed joins, validates origin enclosure and observed deltas. Corruption tests alter saved-data copies only: throttle, HUD, steering, missing fields, trust, timestamps, origin, delta and claimed matches. Actual missing/unmatched rows remain in raw evidence; negative-copy tests are not represented as browser faults.

## Overhead and limits
Every-frame snapshot allocation, HUD text read, timestamps, callback bracketing and event joining add work. Stored `overhead` spans cover selected bookkeeping, not the complete shim; no zero-overhead guarantee. The two-clock microbenchmark outside the workload is not total instrumentation cost. No detailed DOM/camera profiler is installed. No prior-run timing comparison, optimization/speedup, causal bottleneck or optical feedback claim is made. Render return is submission, following RAF is only a callback opportunity; neither certifies visible pixels. Chromium/SwiftShader is not physical phone/Safari or smoothness coverage. Hidden-tab behavior remains unverified; existing safety is not changed.

Run `python replay.py <measurements.json> --out replay.json` in a scratch copy for independent replay. `python test-replay.py` reads sibling `evidence/measurements.json`, challenges copies and writes its own report. Artifact manifests retain source SHA and complete file hashes. This bounded task stops at its posted result.
