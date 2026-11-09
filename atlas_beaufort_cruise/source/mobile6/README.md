# Beaufort Mobile Driving 6

A focused correction for high-speed touch driving, based on Realism5 at
6339a15b22232e2c830203c25a547c7a168c8e24. This is a complete static review preview,
not a physical-phone or rendered-browser acceptance claim. Previous links remain
immutable. There is no new scenery, audio source, model, texture or physics engine.

## What to try on a phone

Start the engine, select Forward, then drag the Power slider to increase power.
Touch anywhere in the steering area, then drag left/right from that starting
point. Touch-down alone no longer requests a turn. Release to center the steering
target through the existing rudder actuator. At higher water-relative speed,
touch steering has a smaller range and bounded target rate. This is explicit
control assistance, not a hydrodynamic coefficient or velocity clamp.

Both thumbs can operate at once: changing focus to Power no longer releases the
captured steering thumb. Pointer IDs are independent. Cancel/lost capture, Pause,
menus, map, orientation change, blur and leaving the local boat release input.
Mouse and WASD steering keep their existing behavior.

Touch Power uses relative movement rather than jumping to the tapped position.
Power-up ramps at 65 percentage points/second, reduction at 220 points/second.
The lever remains set on release. Full explicitly removes the existing docking
power cap and requests 100% gradually on coarse-pointer devices. Idle cancels
queued acceleration immediately; it does NOT cancel boat momentum. A gear change,
external throttle action, Pause or a tool cancels a pending ramp.

Phones start in locked third-person chase. One View button switches first/third
person; other camera choices remain in View & graphics. The old separate camera
button strip is hidden on touch devices. Chase/orbit cameras now inherit the
boat's horizontal translation before smoothing the camera angle/height, avoiding
extra speed-dependent following distance. Free inspection remains independent.

The existing navy/teal colors remain. Touch targets for steering, power and Idle/
Full are larger. Portrait uses the bottom rows; short landscape has left/right
thumb areas and a compact center gear row. CSS/layout is implemented, NOT visually
or touch-certified. No claim that every screen orientation is solved.

## Long-frame protection and rendering budget

A touch device that cannot redraw for over roughly 200 ms while the vessel is
powered or coasting is explicitly paused BEFORE processing the catch-up motion.
Normal 30/60/120-Hz driving retains the same 1/60-second physics integration.
At most twelve fixed steps can be consumed in one accepted mobile frame. No
silently slowed simulation or larger physics timestep is introduced. Stationary,
unpowered loading does not trigger this additional guard. The older desktop
long-stall behavior remains. The pause is a usability safeguard, not proof that
the underlying frame hitch has been eliminated.

The visible message offers Performance graphics and Resume. Performance does
not resume by itself. Repeated pauses mean the device still needs a lower graphics
budget or further profiling. Mobile Auto starts/caps at a 0.8 drawing-buffer pixel
ratio (previous maximum 1.0); explicit Detailed remains available. 0.8 squared
means 64% of those pixels, not measured GPU/FPS improvement.

The exact old native-loop probe at a 1-second gap executed 59 physics steps and
moved a 25 m/s boat 24.5833 m before the next draw. The patched coarse-pointer loop
executes zero steps, retains the location, cancels control gestures and shows an
explicit pause. The exact camera probe at 25 m/s and 30 Hz had 3.17095 m of extra
horizontal follow lag; the corrected translation has zero in the same probe.
These are executable code/math checks, not recordings from a phone.

## What is preserved

Force coefficients, engine configuration, mass, collision/depth data, wave field,
boat/dolphin geometry and country queues are unchanged. Full-throttle modeled
top speeds remain the existing outputs, not a new real-vessel rating. There is
no speed cap or multiplier. Existing nearby Beaufort recovery remains. YouTube
stays its visible provider player; this patch does not hide or extract its audio.

No new render/physics loop, polling timer, library or service. Input ramps tick
inside the existing native frame. The receiver's bounded startup readiness retry
stops on install/pagehide. The earlier browser-navigation restriction was not
worked around using a different browser, origin or remote rendering runner.

## Verification

29 new executable CPU/interface cases pass, covering relative touch start,
speed-sensitive steering, independent thumb pointers, canceled acceleration,
external-command priority, actual native frame-loop catch-up, actual bundled
Three camera math, native UI event handlers and receiver cleanup. The final
candidate also reruns 107 inherited assertions and four modeled power trials.
The test harness uses synthetic DOM, pointer/media events and render boundaries.
None of this certifies browser rendering, mobile Safari, actual touch behavior,
music playback, frame rate or how smooth driving feels on the user's device.

Build pins nine input files and applies assertion-counted changes to a new output
only. Physics/world/audio files are byte-compared to baseline. The test gate does
not drop prior expected assertions. Actual reports retain their scope. The first
builder stopped on the precise HTML script-tag spelling before publication; its
anchor was corrected against the supplied file. No runtime or test was skipped.

## Reproduce

Python3 and Node22, no dependency installation or account credentials. BASE is
Realism5 site/source, PRIOR is Wildlife4 site/source, EASY is the unchanged
atlas_easy_helm directory. The build output must be new and separate.

    python build.py --base "$BASE/site" --out /new/mobile6
    python check.py --site /new/mobile6 --base "$BASE" --prior "$PRIOR" --easy "$EASY" --out /new/reports
    python3 -m http.server 8080 --directory /new/mobile6

Primary API references used for pointer cancellation/capture and frame timing:
https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

Only this branch's Beaufort candidate/source/mobile6 and its existing branch-only
CPU/static publication workflow change. No shared host, HUMANS, yacht/Y14, SUMARS,
multiplayer, account, credentials, permissions or paid-service changes.
