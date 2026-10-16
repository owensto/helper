import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRigPose } from "../src/pose-contract.mjs";
const pose = {
  mode: "helm",
  time: 1,
  seat: [0, 0.6, 0],
  feet: [
    [0, 0, -0.1],
    [0, 0, 0.1],
  ],
  hands: [
    [0.3, 1, -0.2],
    [0.3, 1, 0.2],
  ],
  lean: [0, 0],
  breath: 0,
};
test("rig rejects nonfinite contacts, phase and balance before evaluating skeleton", () => {
  for (const patch of [
    { time: NaN },
    { time: -1 },
    { seat: [0, Infinity, 0] },
    { feet: [[0, 0, 0]] },
    { hands: null },
    { lean: [0, NaN] },
    { breath: Infinity },
    { mode: "walk", phase: NaN },
    { mode: "unknown" },
  ])
    assert.throws(() => validateRigPose({ ...pose, ...patch }));
  assert.equal(validateRigPose(pose), pose);
});

test("finger opening is bounded and optional", () => {
  for (const handGrip of [[NaN, 0], [-0.1, 1], [0, 1.1], [0]])
    assert.throws(() => validateRigPose({ ...pose, handGrip }), /HAND_GRIP/);
  assert.deepEqual(
    validateRigPose({ ...pose, handGrip: [0, 1] }).handGrip,
    [0, 1],
  );
});
