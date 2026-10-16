import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Matrix4,
  Vector3,
} from "three";
import { createWheelRimSampler } from "../src/wheel-rim.mjs";
function fixture() {
  const g = new BufferGeometry(),
    p = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      c = Math.cos(angle),
      s = Math.sin(angle);
    for (const [y, z] of [
      [0.14, -0.004],
      [0.14, 0.004],
      [0.15, 0],
    ])
      p.push(-0.01, y * c - z * s, y * s + z * c);
  }
  g.setAttribute("position", new Float32BufferAttribute(p, 3));
  const mesh = new Mesh(g);
  return { g, mesh, sampler: createWheelRimSampler(mesh) };
}
test("source barycentric witness moves rigidly and closest lies on actual triangle", () => {
  const { sampler: s } = fixture(),
    m = new Matrix4().makeRotationX(0.7).setPosition(2, 3, 4).toArray(),
    t = s.triangles[0],
    barycentric = [0.2, 0.3, 0.5],
    a = s.sample({ triangle: t.triangle, barycentric }, m);
  const expected = new Vector3();
  t.vertices.forEach((v, i) =>
    expected.addScaledVector(new Vector3(...v), barycentric[i]),
  );
  expected.applyMatrix4(new Matrix4().fromArray(m));
  assert.ok(expected.distanceTo(new Vector3(...a.point)) < 1e-12);
  const closest = s.closest(
    expected
      .clone()
      .add(new Vector3(-0.1, 0, 0))
      .toArray(),
    m,
  );
  assert.ok(new Vector3(...closest.point).distanceTo(expected) < 1e-8);
  assert.ok(Math.abs(closest.barycentric.reduce((a, b) => a + b) - 1) < 1e-10);
  assert.ok(Object.isFrozen(s.triangles[0].vertices[0]));
});
test("nonfinite/outside barycentric and nonrigid frames rejected", () => {
  const { sampler: s } = fixture(),
    t = s.triangles[0],
    m = new Matrix4().toArray();
  for (const b of [
    [NaN, 0, 1],
    [2, -1, 0],
    [0.1, 0.1, 0.1],
  ])
    assert.throws(
      () => s.sample({ triangle: t.triangle, barycentric: b }, m),
      /BARYCENTRIC/,
    );
  assert.throws(
    () => s.sample(t, new Matrix4().makeScale(2, 1, 1).toArray()),
    /NOT_RIGID/,
  );
  assert.throws(() => s.closest([NaN, 0, 0], m), /QUERY/);
});
test("in-place source change cannot silently remount", () => {
  const { g, sampler: s } = fixture();
  g.attributes.position.array[0] += 0.01;
  assert.throws(() => s.all(new Matrix4().toArray()), /SOURCE_CHANGED/);
});
