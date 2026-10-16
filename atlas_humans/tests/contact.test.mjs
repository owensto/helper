import { test } from "node:test";
import assert from "node:assert/strict";
import { CharacterContact, characterSnapshot } from "../src/contact.mjs";
import { solveTwoBone } from "../src/ik.mjs";
import { Bone, Group, Vector3 } from "three";
const fixture = {
  vesselId: "bay",
  revision: "test-1",
  seat: [0, 0.6, 0],
  leftFoot: [0.3, 0, -0.1],
  rightFoot: [0.3, 0, 0.1],
  leftHand: [0.5, 1, -0.2],
  rightHand: [0.5, 1, 0.2],
};
test("local contacts remain invariant through repeated rough vessel motion", () => {
  const c = new CharacterContact(fixture);
  for (let n = 0; n < 3600; n++) {
    const p = c.update({
      time: n / 60,
      dt: 1 / 60,
      roll: Math.sin(n) * 0.4,
      pitch: Math.cos(n) * 0.3,
      acceleration: [6, 0, -5],
    });
    assert.deepEqual(p.seat, fixture.seat);
    assert.deepEqual(p.feet, [fixture.leftFoot, fixture.rightFoot]);
    assert.ok(p.lean.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.201));
  }
});
test("pause does not change balance and backwards time requires reset", () => {
  const c = new CharacterContact(fixture);
  const a = c.update({ time: 1, dt: 0.05, acceleration: [3, 0, 2] });
  const b = c.update({ time: 1, dt: 0 });
  assert.deepEqual(a.lean, b.lean);
  assert.throws(() => c.update({ time: 0, dt: 0.01 }));
  c.reset({ ...fixture, vesselId: "yacht" });
  assert.equal(c.update({ time: 0, dt: 0 }).vesselId, "yacht");
});
test("bad time and geometry fail explicitly", () => {
  assert.throws(() => new CharacterContact({ ...fixture, seat: [NaN, 0, 0] }));
  const c = new CharacterContact(fixture);
  for (const dt of [-1, Infinity, 0.2])
    assert.throws(() => c.update({ time: 0, dt }));
});
test("snapshot copies values without transport or vessel mutation", () => {
  const c = new CharacterContact(fixture),
    p = c.update({ time: 1, dt: 0.01 }),
    s = characterSnapshot("captain", p, 4, "test-epoch");
  s.localPosition[0] = 99;
  assert.equal(p.seat[0], 0);
  assert.equal(s.geometryRevision, "test-1");
  assert.throws(() => characterSnapshot("", p, 1));
});
test("IK holds reachable targets after moving rotated parent", () => {
  const vessel = new Group(),
    root = new Bone(),
    mid = new Bone(),
    end = new Bone();
  vessel.add(root);
  root.add(mid);
  mid.position.y = 0.4;
  mid.add(end);
  end.position.y = 0.4;
  for (let i = 0; i < 100; i++) {
    root.quaternion.identity();
    mid.quaternion.identity();
    vessel.rotation.set(i * 0.03, i * 0.02, i * 0.01);
    vessel.position.set(i, Math.sin(i), -i);
    vessel.updateMatrixWorld(true);
    const target = vessel.localToWorld(new Vector3(0.4, 0.3, 0.1)),
      pole = vessel.localToWorld(new Vector3(0, 0, 1));
    const result = solveTwoBone(root, mid, end, target, pole);
    assert.ok(result.error < 1e-6, `${result.error}`);
  }
});
test("IK reports unreachable target without stretching bones", () => {
  const root = new Bone(),
    mid = new Bone(),
    end = new Bone();
  root.add(mid);
  mid.position.y = 0.4;
  mid.add(end);
  end.position.y = 0.4;
  const r = solveTwoBone(
    root,
    mid,
    end,
    new Vector3(5, 0, 0),
    new Vector3(0, 0, 1),
  );
  assert.equal(r.reachable, false);
  assert.ok(r.error > 4);
  assert.equal(mid.position.y, 0.4);
});
