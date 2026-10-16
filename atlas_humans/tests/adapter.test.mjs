import { test } from "node:test";
import assert from "node:assert/strict";
import { Group } from "three";
import { makeCaptain12Build } from "../src/captain12-adapter.mjs";
const stamp = (boat, epoch, time) => {
  boat.updateWorldMatrix(true, false);
  return {
    epoch,
    time,
    localToWorld: boat.matrixWorld.toArray(),
    worldToLocal: boat.matrixWorld.clone().invert().toArray(),
  };
};
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
      transform: stamp(boat, "test", 1),
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
    sampleHost: () => ({
      ...sample,
      transform: stamp(boat, sample.frame.epoch, sample.frame.time),
    }),
  })();
  build.group.userData.animateCaptain({ boat }, {});
  sample = { ...sample, frame: { epoch: "two", time: 0, dt: 0 } };
  assert.equal(build.group.userData.animateCaptain({ boat }, {}).time, 0);
});

test("bad frames hide the visual, do not update rig, and recover on a valid new frame", () => {
  const group = new Group(),
    visual = new Group(),
    boat = new Group();
  group.add(visual);
  boat.add(group);
  let calls = 0;
  let sample = {
    valid: true,
    attachment,
    frame: { epoch: "test", time: 1, dt: 0.01 },
    transform: stamp(boat, "test", 1),
  };
  const factory = makeCaptain12Build({
    rig: {
      group,
      update: () => {
        calls++;
      },
    },
    sampleHost: () => sample,
  })();
  factory.group.userData.animateCaptain({ boat }, {});
  assert.equal(calls, 1);
  const good = structuredClone(sample);
  for (const mutate of [
    (s) => delete s.transform,
    (s) => (s.transform.time = 0),
    (s) => (s.transform.localToWorld[0] = NaN),
    (s) => (s.transform.worldToLocal[12] = 1),
    (s) => (s.attachment.leftFoot[0] = Infinity),
    (s) => (s.frame.dt = NaN),
  ]) {
    sample = structuredClone(good);
    mutate(sample);
    assert.doesNotThrow(() =>
      factory.group.userData.animateCaptain({ boat }, {}),
    );
    assert.equal(visual.visible, false);
    assert.equal(calls, 1);
  }
  sample = good;
  factory.group.userData.animateCaptain({ boat }, {});
  assert.equal(visual.visible, true);
  assert.equal(calls, 2);
});
test("render pose mismatch and detached/scaled captain are not accepted as current contacts", () => {
  const group = new Group(),
    boat = new Group();
  boat.add(group);
  const sample = {
    valid: true,
    attachment,
    frame: { epoch: "test", time: 1, dt: 0.01 },
    transform: stamp(boat, "test", 1),
  };
  const factory = makeCaptain12Build({
    rig: { group, update: () => assert.fail() },
    sampleHost: () => sample,
  })();
  boat.position.x = 2;
  assert.equal(
    factory.group.userData.animateCaptain({ boat }, {}).reason,
    "RENDER_TRANSFORM_MISMATCH",
  );
  boat.position.x = 0;
  group.scale.x = 2;
  assert.equal(
    factory.group.userData.animateCaptain({ boat }, {}).valid,
    false,
  );
});

test("captain detached from its supplied vessel stays unsupported", () => {
  const group = new Group(),
    boat = new Group();
  const factory = makeCaptain12Build({
    rig: { group, update: () => assert.fail() },
    sampleHost: () => ({
      valid: true,
      attachment,
      frame: { epoch: "test", time: 1, dt: 0.01 },
      transform: stamp(boat, "test", 1),
    }),
  })();
  assert.equal(
    factory.group.userData.animateCaptain({ boat }, {}).reason,
    "CAPTAIN_DETACHED",
  );
});
