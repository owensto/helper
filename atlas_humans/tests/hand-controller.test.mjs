import { test } from "node:test";
import assert from "node:assert/strict";
import { WheelHandController } from "../src/hand-controller.mjs";
const offsets = Array.from({ length: 2 }, () => ({
  positionContactM: [0, 0, 0],
  orientationContactXYZW: [0, 0, 0, 1],
}));
function fixture() {
  const c = new WheelHandController({
    offsets,
    preferred: [
      [0, 0.1, 0],
      [0, 0.1, 0],
    ],
  });
  let shift = 0;
  const surface = () => ({
    triangle: 0,
    barycentric: [1, 0, 0],
    point: [shift, 0.1, 0],
    normal: [0, 1, 0],
    quaternion: [0, 0, 0, 1],
  });
  const frame = (time = 0, dt = 0, frameId = 0, epoch = "a") => ({
    time,
    dt,
    frameId,
    epoch,
    shoulders: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    reaches: [1, 1],
    candidates: [surface()],
    sample: surface,
    closest: surface,
  });
  return { c, frame, move: (x) => (shift = x) };
}
test("pause is idempotent; changed paused source fails closed until reset", () => {
  const { c, frame, move } = fixture(),
    first = c.update(frame());
  assert.equal(first.valid, true);
  assert.deepEqual(c.update(frame(0, 0, 1)).hands, first.hands);
  move(0.01);
  assert.equal(c.update(frame(0, 0, 2)).reason, "PAUSED_SURFACE_MOVED");
  assert.equal(c.update(frame(0.01, 0.01, 3)).valid, false);
  assert.equal(c.update(frame(0, 0, 0, "b")).valid, true);
});
test("no synthetic delta, backwards time, or oversized frame accepted", () => {
  for (const [time, dt, id] of [
    [-0.1, 0, 1],
    [0.01, 0, 1],
    [0.01, 0.01, 0],
  ]) {
    const { c, frame } = fixture();
    c.update(frame());
    if (time < 0)
      assert.throws(() => c.update(frame(time, dt, id)), /HAND_FRAME_INVALID/);
    else assert.equal(c.update(frame(time, dt, id)).valid, false);
  }
  const { c, frame } = fixture();
  assert.throws(() => c.update(frame(1, 0.01)), /INITIAL_DELTA/);
  c.update(frame());
  assert.throws(() => c.update(frame(0.2, 0.2, 1)), /HAND_FRAME_INVALID/);
});
test("ejection clears state and requires a fresh zero-delta initialization", () => {
  const { c, frame } = fixture();
  c.update(frame());
  assert.equal(c.update({ valid: false }).valid, false);
  assert.deepEqual(c.hands, [null, null]);
  assert.throws(() => c.update(frame(0.02, 0.02, 1)), /INITIAL_DELTA/);
  assert.equal(c.update(frame(0.02, 0, 1)).valid, true);
});
test("smoothed miss is reported free, never a material lock; acceleration bounded", () => {
  const { c, frame, move } = fixture();
  let last = c.update(frame()),
    velocity = [
      [0, 0, 0],
      [0, 0, 0],
    ],
    free = false;
  for (let k = 1; k <= 100; k++) {
    move(0.02 * Math.sin(k * 0.3));
    const next = c.update(frame(k * 0.01, 0.01, k));
    assert.equal(next.valid, true);
    next.hands.forEach((h, i) => {
      assert.equal(h.materialLocked, false);
      if (!h.contactValid) {
        free = true;
        assert.ok(["released", "reaching"].includes(h.state));
        assert.ok(h.grip >= 0 && h.grip <= 1);
      }
      const v = h.point.map((p, j) => (p - last.hands[i].point[j]) / 0.01);
      assert.ok(
        Math.hypot(...v.map((x, j) => (x - velocity[i][j]) / 0.01)) <=
          10.000001,
      );
      velocity[i] = v;
    });
    last = next;
  }
  assert.equal(free, true);
});
test("unreachable source and malformed configuration rejected", () => {
  const { c, frame } = fixture();
  const f = frame();
  f.reaches = [0.01, 0.01];
  assert.equal(c.update(f).reason, "NO_REACHABLE_RIM_CONTACT");
  assert.throws(
    () =>
      new WheelHandController({
        offsets,
        preferred: [
          [NaN, 0, 0],
          [0, 0, 0],
        ],
      }),
    /CONFIGURATION/,
  );
});
