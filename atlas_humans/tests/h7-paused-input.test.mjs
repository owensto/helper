import { test } from "node:test";
import assert from "node:assert/strict";
const { WheelHandController } = await import(
  process.env.H7_CONTROLLER_URL || "../src/hand-controller.mjs"
);
function fixture() {
  const surface = {
    triangle: 7,
    barycentric: [0.2, 0.3, 0.5],
    point: [0, 0.1, 0],
    normal: [0, 1, 0],
    quaternion: [0, 0, 0, 1],
  };
  const c = new WheelHandController({
    offsets: Array.from({ length: 2 }, () => ({
      positionContactM: [0, 0, 0],
      orientationContactXYZW: [0, 0, 0, 1],
    })),
    preferred: [
      [0, 0.1, 0],
      [0, 0.1, 0],
    ],
  });
  const frame = {
    time: 0,
    dt: 0,
    epoch: "fixture",
    frameId: 0,
    shoulders: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    reaches: [1, 1],
    candidates: [surface],
    sample: () => structuredClone(surface),
    closest: () => structuredClone(surface),
  };
  const initial = c.update(frame);
  assert.equal(initial.valid, true);
  return { c, frame, surface, initial };
}
function rejects(c, frame) {
  let result;
  try {
    result = c.update(frame);
  } catch {
    return;
  }
  assert.equal(result.valid, false);
}
test("H7 audit trace1: NaN sampled point cannot certify a paused cached hand", () => {
  const { c, frame, surface } = fixture();
  rejects(c, {
    ...frame,
    frameId: 1,
    sample: () => ({ ...surface, point: [NaN, 0.1, 0] }),
  });
});
test("H7 audit trace2: changed finite shoulder/reach cannot certify unreachable paused hands", () => {
  const { c, frame } = fixture();
  rejects(c, {
    ...frame,
    frameId: 1,
    shoulders: [
      [10, 0, 0],
      [10, 0, 0],
    ],
    reaches: [0.01, 0.01],
  });
});
test("H7 audit trace3: changed contact orientation at the same point invalidates pause", () => {
  const { c, frame, surface } = fixture();
  rejects(c, {
    ...frame,
    frameId: 1,
    sample: () => ({
      ...surface,
      quaternion: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    }),
  });
});

test("H7 stable pause and antipodal representation of the same rotation remain valid", () => {
  const { c, frame, surface, initial } = fixture();
  assert.deepEqual(c.update({ ...frame, frameId: 1 }).hands, initial.hands);
  assert.deepEqual(
    c.update({
      ...frame,
      frameId: 2,
      sample: () => ({ ...surface, quaternion: [0, 0, 0, -1] }),
    }).hands,
    initial.hands,
  );
});
test("H7 changed finite rig context invalidates even when hands remain reachable", () => {
  for (const patch of [
    {
      shoulders: [
        [0.01, 0, 0],
        [0, 0, 0],
      ],
    },
    { reaches: [1.01, 1] },
  ]) {
    const { c, frame } = fixture();
    assert.equal(
      c.update({ ...frame, frameId: 1, ...patch }).reason,
      "PAUSED_RIG_CONTEXT_CHANGED",
    );
    assert.ok(c.hands.every((h) => h === null));
    assert.equal(
      c.update({ ...frame, time: 0.01, dt: 0.01, frameId: 2 }).reason,
      "HAND_NEW_EPOCH_REQUIRED",
    );
  }
});
test("H7 snapshots do not alias caller-owned shoulder or surface arrays", () => {
  const { c, frame } = fixture();
  frame.shoulders[0][0] = 0.01;
  assert.equal(c.update({ ...frame, frameId: 1 }).valid, false);
  const f = fixture();
  f.surface.quaternion.splice(0, 4, 0, Math.SQRT1_2, 0, Math.SQRT1_2);
  assert.equal(f.c.update({ ...f.frame, frameId: 1 }).valid, false);
});
test("H7 finite normal or source witness changes at fixed point invalidate pause", () => {
  for (const patch of [
    { normal: [1, 0, 0] },
    { triangle: 8 },
    { barycentric: [0.3, 0.2, 0.5] },
  ]) {
    const { c, frame, surface } = fixture();
    assert.equal(
      c.update({
        ...frame,
        frameId: 1,
        sample: () => ({ ...surface, ...patch }),
      }).reason,
      "PAUSED_SURFACE_FRAME_CHANGED",
    );
  }
});
test("H7 malformed callback results invalidate cache on paused and advancing paths", () => {
  for (const advance of [false, true])
    for (const patch of [
      { point: [NaN, 0.1, 0] },
      { point: new Array(3) },
      { normal: new Array(3) },
      { quaternion: new Array(4) },
      { point: [0, Infinity, 0] },
      { normal: [0, 0, 0] },
      { normal: [NaN, 1, 0] },
      { quaternion: [0, 0, 0, 0] },
      { quaternion: [NaN, 0, 0, 1] },
      { barycentric: [2, -1, 0] },
      { triangle: -1 },
    ]) {
      const { c, frame, surface } = fixture();
      assert.throws(
        () =>
          c.update({
            ...frame,
            time: advance ? 0.01 : 0,
            dt: advance ? 0.01 : 0,
            frameId: 1,
            sample: () => ({ ...surface, ...patch }),
          }),
        /HAND_SURFACE_INVALID/,
      );
      assert.ok(c.hands.every((h) => h === null));
      assert.equal(
        c.update({ ...frame, time: 0.02, dt: 0.01, frameId: 2 }).reason,
        "HAND_NEW_EPOCH_REQUIRED",
      );
    }
});
test("H7 validates candidate and closest frames and contains callback failure by invalidation", () => {
  for (const field of ["candidates", "closest", "sample"]) {
    const { c, frame, surface } = fixture();
    const bad = { ...surface, point: [NaN, 0, 0] },
      patch =
        field === "candidates" ? { candidates: [bad] } : { [field]: () => bad };
    assert.throws(
      () => c.update({ ...frame, time: 0.01, dt: 0.01, frameId: 1, ...patch }),
      /HAND_SURFACE_INVALID/,
    );
    assert.ok(c.hands.every((h) => h === null));
  }
  const { c, frame } = fixture();
  assert.throws(
    () =>
      c.update({
        ...frame,
        frameId: 1,
        sample: () => {
          throw new Error("provider unavailable");
        },
      }),
    /provider unavailable/,
  );
  assert.equal(
    c.update({ ...frame, frameId: 2 }).reason,
    "HAND_NEW_EPOCH_REQUIRED",
  );
});
test("H7 explicit reset/new epoch recovers while controller time rules remain enforced", () => {
  for (const reset of [false, true]) {
    const { c, frame, surface } = fixture();
    rejects(c, {
      ...frame,
      frameId: 1,
      sample: () => ({ ...surface, point: [NaN, 0, 0] }),
    });
    if (reset) c.reset();
    const next = {
      ...frame,
      epoch: reset ? "fixture" : "new-epoch",
      frameId: 0,
    };
    assert.equal(c.update(next).valid, true);
    assert.equal(
      c.update({ ...next, time: 0.01, dt: 0.01, frameId: 0 }).reason,
      "HAND_FRAME_DISCONTINUITY",
    );
  }
});
