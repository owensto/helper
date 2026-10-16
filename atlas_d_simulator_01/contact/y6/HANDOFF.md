# Y6 baseline-first phone responsiveness

Runtime baseline: `e30edc8e33b863f3fafb303be0050cc86b7900f0`, exact Y4 entry. Branch baseline `ed1c8cc76d4c446f4ddeb59c78e120f948a0dacd` adds only prior verification. No candidate runtime implementation at this checkpoint.

## Measurement

Three repeats of the same visible touch workload in each of two timing lanes, on 390×844 and 844×390 contexts. Fresh context per lane/repeat, fixed warm-up; order minimal/profile, profile/minimal, minimal/profile. No screenshots, video, pixel reads, source challenges, extra rays, DevTools sampling profiler or network readback during the interval. Original required Y4 physical sampling/rays are NOT disabled. Timing collection is passive and never advances or writes simulation time/state.

The init shim wraps the existing renderer assignment boundary, preserving original calls. It measures original WebGL submission separately from the Y4 preview wrapper. Detailed mode times selected DOM setters, layout getters, camera projection/clone/lookAt and station bounds computation; these are explicitly attributed subsets, not an exhaustive exclusive CPU decomposition. Original Y4 observer cost is also retained. Minimal mode keeps direct browser RAF sampling and control/render latency observation with detailed timers disabled. Microbenchmarks and callback/bookkeeping timings, plus repeated-lane variability, disclose instrumentation effects. Wrappers/checks still have a small untimed branch overhead; comparisons do not establish a rigorous zero-overhead bound.

Direct RAF callback intervals and actual owner-render submission start intervals are separate raw arrays. Sparse history capture counts are never FPS measurements. Synchronous WebGL submission includes CPU/driver waits, not a GPU-only timer or physical-device benchmark. Environment records renderer/backend, buffer dimensions, detail, browser and runner.

## Feedback latency

Native trusted pointerdown/up and power input timestamps are paired with the first matching actual physical rudder/contact sample submitted by the original renderer (power additionally requires matching visible output text). A following browser RAF supplies a presentation-opportunity observation, **not optical/screen latency**. Performance Event Timing entries are retained when available: thresholded/quantized browser next-paint durations, not zero when missing and not guaranteed to identify a particular canvas pixel. Actual visible left/neutral/right captures happen only outside measurement.

No heavy probe is added during timing. Afterward the existing independent ray results, current sample/identity, pause/resume and actual visible targets are checked; original Y1–Y5 source and regressions stay unchanged. No human/profile, CORE/MP wiring, public deployment or access change. Existing blur safety and explicit lack of physical-phone/Safari coverage remain.

## Bounded decision

Inspect real distributions before authoring any runtime change. If preview-owned cost is not a demonstrated bottleneck relative to total behavior or cannot be improved without weakening required checks, return the baseline and precise owner boundary. No speculative rewrite or FPS claim from a lower observer timing. Final tested source/run/artifacts and disposition are recorded in PR #1 at the result boundary, then this task stops.
