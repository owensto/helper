import { test } from "node:test";
import assert from "node:assert/strict";
import { DeckLocomotion } from "../src/locomotion.mjs";
const patch = {
  vesselId: "fixture",
  revision: "v1",
  bounds: [-2, 2, -1, 1],
  deckY: 0,
  obstacles: [],
};
test("walk remains within owner supplied patch and stops at edge", () => {
  const c = new DeckLocomotion(patch, [-1.5, 0.5]);
  let p;
  for (let n = 0; n < 1200; n++)
    p = c.update({ time: n / 60, dt: 1 / 60, forward: 1 });
  assert.ok(p.seat[0] <= 1.77);
  assert.equal(p.speed, 0);
  assert.ok(p.feet.every((f) => f[1] >= 0.09));
});
test("standing feet stay planted and pause preserves pose", () => {
  const c = new DeckLocomotion(patch);
  const a = c.update({ time: 0, dt: 0 }),
    b = c.update({ time: 1, dt: 1 / 60 });
  assert.deepEqual(a.feet, b.feet);
  const d = c.update({ time: 1, dt: 0, forward: 1 });
  assert.deepEqual(b.feet, d.feet);
  assert.deepEqual(b.seat, d.seat);
});
test("capsule stops before obstacle and unavailable deck fails closed", () => {
  const c = new DeckLocomotion(
    { ...patch, obstacles: [{ minX: 0, maxX: 0.5, minZ: -0.4, maxZ: 0.4 }] },
    [-1, 0],
  );
  let p;
  for (let n = 0; n < 600; n++)
    p = c.update({ time: n / 60, dt: 1 / 60, forward: 1 });
  assert.ok(p.seat[0] <= -0.23);
  assert.equal(c.update({ time: 10, dt: 1 / 60, valid: false }).valid, false);
});

test("edge stop settles raised foot continuously and freezes exactly during pause", () => {
  const c = new DeckLocomotion(patch, [1.35, 0.5]);
  let previous = null,
    maxDelta = 0,
    settled;
  for (let n = 0; n < 240; n++) {
    const p = c.update({ time: n / 120, dt: 1 / 120, forward: 1 });
    if (previous)
      for (let i = 0; i < 2; i++)
        maxDelta = Math.max(
          maxDelta,
          Math.hypot(...p.feet[i].map((v, j) => v - previous.feet[i][j])),
        );
    previous = p;
    settled = p;
    if (c.settling) {
      const paused = c.update({ time: n / 120, dt: 0, forward: 1 });
      assert.deepEqual(paused.feet, p.feet);
    }
  }
  assert.ok(maxDelta < 0.05, `foot jumped ${maxDelta}m`);
  assert.equal(settled.speed, 0);
  assert.ok(settled.feet.every((p) => Math.abs(p[1] - 0.102) < 1e-9));
});
test("walking foot targets stop outside obstacle, not just pelvis", () => {
  const c = new DeckLocomotion(
    { ...patch, obstacles: [{ minX: 0, maxX: 0.5, minZ: -0.4, maxZ: 0.4 }] },
    [-0.6, 0],
  );
  for (let n = 0; n < 240; n++) {
    const p = c.update({ time: n / 60, dt: 1 / 60, forward: 1 });
    assert.ok(p.feet.every((f) => f[0] <= -0.23 + 1e-8));
  }
});

test("lost deck validity cannot silently resume with cached support", () => {
  const c = new DeckLocomotion(patch);
  c.update({ time: 0, dt: 0, valid: false });
  assert.equal(
    c.update({ time: 1, dt: 0.01, valid: true }).reason,
    "DECK_REACQUISITION_REQUIRES_RESET",
  );
  const fresh = new DeckLocomotion(patch);
  assert.equal(fresh.update({ time: 1, dt: 0.01 }).valid, true);
});
