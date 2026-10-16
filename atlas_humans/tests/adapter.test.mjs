import { test } from "node:test";
import assert from "node:assert/strict";
import { Group } from "three";
import { makeCaptain12Build } from "../src/captain12-adapter.mjs";
const attachment = {
  vesselId: "fixture",
  revision: "v1",
  seat: [0, 0.6, 0],
  leftFoot: [0.3, 0, -0.1],
  rightFoot: [0.3, 0, 0.1],
  leftHand: [0.5, 1, -0.2],
  rightHand: [0.5, 1, 0.2],
};
test("existing captain transform consumes vessel-local anchors without second insertion", () => {
  const group = new Group(),
    boat = new Group();
  group.position.set(-1, 0.5, 0);
  boat.add(group);
  boat.rotation.set(0.2, 0.6, 0.1);
  boat.position.set(100, 4, -20);
  let pose;
  const build = makeCaptain12Build({
    rig: {
      group,
      update: (p) => {
        pose = p;
      },
    },
    sampleHost: () => ({
      valid: true,
      attachment,
      frame: { epoch: "test", time: 1, dt: 1 / 60 },
    }),
  });
  const result = build();
  assert.equal(result.group, group);
  result.group.userData.animateCaptain({ boat }, {});
  assert.ok(Math.abs(pose.seat[0] - 1) < 1e-10);
  assert.ok(Math.abs(pose.seat[1] - 0.1) < 1e-10);
  assert.throws(() => build());
});
test("unknown anchors stay visually hidden even when old host sets captain visibility", () => {
  const group = new Group(),
    visual = new Group();
  group.add(visual);
  const result = makeCaptain12Build({
    rig: { group, update: () => assert.fail() },
    sampleHost: () => ({ valid: false, reason: "No helm" }),
  })();
  result.group.userData.animateCaptain({}, {});
  result.group.visible = true;
  assert.equal(visual.visible, false);
  assert.equal(group.userData.attachmentValid, false);
});

test("host epoch change resets balance before backwards simulation time", () => {
  const group = new Group(),
    boat = new Group();
  boat.add(group);
  let sample = {
    valid: true,
    attachment,
    frame: { epoch: "one", time: 100, dt: 0.01 },
  };
  const build = makeCaptain12Build({
    rig: { group, update: (p) => p },
    sampleHost: () => sample,
  })();
  build.group.userData.animateCaptain({ boat }, {});
  sample = { ...sample, frame: { epoch: "two", time: 0, dt: 0 } };
  assert.equal(build.group.userData.animateCaptain({ boat }, {}).time, 0);
});
