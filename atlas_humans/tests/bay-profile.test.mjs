import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Matrix4, Vector3, Quaternion } from "three";
import { validateRigPose } from "../src/pose-contract.mjs";
const bytes = fs.readFileSync(
    new URL("../profiles/bay12/contacts.json", import.meta.url),
  ),
  contacts = JSON.parse(bytes),
  profile = JSON.parse(
    fs.readFileSync(new URL("../profiles/bay12/profile.json", import.meta.url)),
  );
test("H4 candidate binds exact C2 contact and rig assets; production remains off", () => {
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    profile.physicalContactSHA256,
  );
  for (const [file, key] of [
    ["RocketboxCaptain.glb", "rigSHA256"],
    ["animations.json", "animationSHA256"],
  ])
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(new URL("../assets/" + file, import.meta.url)))
        .digest("hex"),
      profile[key],
    );
  assert.equal(profile.productionEnabled, false);
  assert.equal(profile.stationId, contacts.stationId);
  for (const c of contacts.contacts) {
    const o = profile.offsets[c.id];
    assert.equal(o.positionContactM.length, 3);
    assert.ok(o.positionContactM.every(Number.isFinite));
    if (o.orientationContactXYZW)
      assert.ok(Math.abs(Math.hypot(...o.orientationContactXYZW) - 1) < 1e-6);
  }
});
test("H4 calibrated hand orientations roundtrip from contact to vessel frame", () => {
  for (const id of ["leftHand", "rightHand"]) {
    const c = contacts.contacts.find((c) => c.id === id),
      o = profile.offsets[id];
    const q = new Quaternion()
      .setFromRotationMatrix(new Matrix4().fromArray(c.restContactToVessel))
      .multiply(new Quaternion().fromArray(o.orientationContactXYZW));
    const expected = new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      id === "leftHand" ? Math.PI / 2 : -Math.PI / 2,
    );
    assert.ok(q.angleTo(expected) < 1e-6);
  }
});
test("H4 malformed posture/orientation rejects before rig use", () => {
  const pose = {
    mode: "helm",
    time: 0,
    seat: [0, 0, 0],
    feet: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    hands: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    lean: [0, 0],
    breath: 0,
  };
  for (const patch of [
    { torsoPitch: NaN },
    { torsoPitch: 2 },
    {
      handOrientations: [
        [0, 0, 0, 0],
        [0, 0, 0, 1],
      ],
    },
    {
      footOrientations: [
        [0, 0, 0, 1],
        [Infinity, 0, 0, 1],
      ],
    },
  ])
    assert.throws(() => validateRigPose({ ...pose, ...patch }));
});

import { checkBayRigMotionBounds } from "../src/bay-profile.mjs";
test("H4 full steering requires release/regrip; review bounds never clamp controls or enable production", () => {
  const frame = { wheelAngleRad: 0.1, roll: 0.08, pitch: 0.06 };
  const before = structuredClone(frame);
  assert.equal(checkBayRigMotionBounds(profile, frame).valid, true);
  assert.deepEqual(frame, before);
  assert.equal(
    checkBayRigMotionBounds(profile, { ...frame, wheelAngleRad: 3.3 }).reason,
    "HAND_RELEASE_REGRIP_REQUIRED",
  );
  assert.equal(
    checkBayRigMotionBounds(profile, { ...frame, roll: 0.081 }).valid,
    false,
  );
  assert.equal(
    checkBayRigMotionBounds(profile, { ...frame, wheelAngleRad: NaN }).valid,
    false,
  );
  assert.equal(
    checkBayRigMotionBounds(profile, frame).productionEnabled,
    false,
  );
});
