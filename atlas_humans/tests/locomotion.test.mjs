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
