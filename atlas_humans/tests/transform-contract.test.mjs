import { test } from "node:test";
import assert from "node:assert/strict";
import { Matrix4, Euler, Vector3 } from "three";
import {
  rigidMatrix,
  transformPair,
  stampedTransform,
} from "../src/transform-contract.mjs";
const I = new Matrix4().toArray();
test("right-handed tilted transform and inverse round-trip without changing axes", () => {
  const m = new Matrix4()
      .makeRotationFromEuler(new Euler(0.21, -1.2, 0.13, "YXZ"))
      .setPosition(50, 4, -20),
    t = transformPair({
      localToWorld: m.toArray(),
      worldToLocal: m.clone().invert().toArray(),
    }),
    v = new Vector3(3, 2, -1);
  assert.ok(
    v.clone().applyMatrix4(t.forward).applyMatrix4(t.inverse).distanceTo(v) <
      1e-10,
  );
});
test("missing, NaN, infinity, scale, shear, reflection and perspective rejected", () => {
  for (const value of [
    null,
    [],
    I.map((v, i) => (i === 0 ? NaN : v)),
    I.map((v, i) => (i === 12 ? Infinity : v)),
    I.map((v, i) => (i === 0 ? 2 : v)),
    I.map((v, i) => (i === 0 ? -1 : v)),
    I.map((v, i) => (i === 4 ? 0.2 : v)),
    I.map((v, i) => (i === 3 ? 0.1 : v)),
  ])
    assert.throws(() => rigidMatrix(value));
});
test("inverse, stale timestamp and simulation epoch mismatch reject", () => {
  assert.throws(() =>
    transformPair({
      localToWorld: new Matrix4().makeTranslation(3, 0, 0).toArray(),
      worldToLocal: I,
    }),
  );
  for (const patch of [
    {},
    { epoch: "old", time: 2 },
    { epoch: "now", time: 1 },
    { epoch: "now", time: NaN },
  ])
    assert.throws(() =>
      stampedTransform(
        { ...patch, localToWorld: I, worldToLocal: I },
        { epoch: "now", time: 2 },
      ),
    );
});
