import { test } from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, PlaneGeometry, Matrix4, Vector3 } from "three";
import { createClearanceSource, clearanceDecision } from "../src/clearance.mjs";
const I = new Matrix4().toArray();
const source = (g) =>
  createClearanceSource({
    name: "fixture",
    positions: Array.from(g.attributes.position.array),
    indices: Array.from(g.index.array),
  });
test("closed cube interior depth and exterior nearest surface have exact witnesses", () => {
  const s = source(new BoxGeometry(2, 2, 2));
  assert.equal(s.topology.solidComplete, true);
  assert.equal(s.query([0, 0, 0], I).penetrationM, 1);
  assert.equal(s.query([2, 0, 0], I).classification, "outside");
  assert.equal(s.query([2, 0, 0], I).distance, 1);
  const q = s.query([0.8, 0, 0], I);
  assert.ok(Math.abs(q.penetrationM - 0.2) < 1e-10);
  assert.ok(Math.abs(q.barycentric.reduce((a, b) => a + b) - 1) < 1e-10);
});
test("rigid moving vessel/source frames preserve measured penetration", () => {
  const s = source(new BoxGeometry(2, 2, 2)),
    m = new Matrix4().makeRotationX(0.7).setPosition(10, 2, -4),
    p = new Vector3(0.8, 0, 0).applyMatrix4(m);
  assert.ok(
    Math.abs(s.query(p.toArray(), m.toArray()).penetrationM - 0.2) < 1e-10,
  );
  assert.throws(
    () => s.query([0, 0, 0], new Matrix4().makeScale(2, 1, 1).toArray()),
    /NOT_RIGID/,
  );
});
test("open plane cannot manufacture a signed solid; body edge crossing still detected", () => {
  const s = source(new PlaneGeometry(2, 2));
  assert.equal(s.topology.solidComplete, false);
  assert.equal(s.query([0, 0, -0.01], I).classification, "unknown-solid");
  assert.equal(s.query([0, 0, -0.01], I).penetrationM, null);
  assert.ok(s.segment([0.2, 0, -1], [0.2, 0, 1], I).length > 0);
});
test("thin obstacle crossing is detected with both body edge endpoints outside", () => {
  const s = source(new BoxGeometry(0.01, 2, 2));
  assert.equal(s.query([-1, 0, 0], I).classification, "outside");
  assert.equal(s.query([1, 0, 0], I).classification, "outside");
  assert.ok(s.segment([-1, 0.17, 0.23], [1, 0.17, 0.23], I).length >= 2);
});
test("missing/open geometry cannot become clearance PASS; proven collisions dominate unknown", () => {
  assert.equal(
    clearanceDecision({
      sources: [{ solidComplete: false }],
      maxPenetrationM: 0,
      edgeCrossings: 0,
    }).status,
    "unknown",
  );
  assert.equal(
    clearanceDecision({
      sources: [],
      missing: ["rail"],
      maxPenetrationM: 0,
      edgeCrossings: 0,
    }).status,
    "unknown",
  );
  assert.equal(
    clearanceDecision({
      sources: [{ solidComplete: false }],
      maxPenetrationM: 0.02,
      edgeCrossings: 0,
    }).status,
    "fail",
  );
  assert.equal(
    clearanceDecision({
      sources: [{ solidComplete: true }],
      maxPenetrationM: 0,
      edgeCrossings: 1,
    }).status,
    "fail",
  );
});
test("malformed geometry/queries rejected", () => {
  assert.throws(
    () =>
      createClearanceSource({
        name: "x",
        positions: [NaN, 0, 0],
        indices: [0, 0, 0],
      }),
    /GEOMETRY/,
  );
  const s = source(new BoxGeometry());
  assert.throws(() => s.query([NaN, 0, 0], I), /POINT/);
  assert.throws(() => s.segment([0, 0, 0], [0, Infinity, 0], I), /SEGMENT/);
});

test("receiver binds independent current frame, source coverage and body/lifecycle revisions", async () => {
  const { readClearanceSample } = await import("../src/clearance.mjs");
  const expected = {
    bodyRevision: "h6",
    sourceSetRevision: "bay",
    vesselInstanceId: "instance-1",
    activationId: "board-1",
    simulationEpoch: "epoch-1",
    frameId: 12,
    time: 1,
    sources: [
      {
        id: "seat",
        penetrationToleranceM: 0.003,
        vertexClearanceMarginM: 0,
        solidInterpretationAccepted: true,
      },
    ],
  };
  const packet = {
    ...expected,
    measurements: [
      {
        sourceId: "seat",
        sampleCount: 4687,
        minVertexSeparationM: 0.01,
        maxPenetrationM: 0.002,
        edgeCrossings: 0,
        solidComplete: true,
      },
    ],
  };
  delete packet.sources;
  const ok = readClearanceSample(packet, expected);
  assert.equal(ok.status, "sampled-pass");
  assert.equal(
    readClearanceSample(
      {
        ...packet,
        measurements: [
          { ...packet.measurements[0], minVertexSeparationM: 0.001 },
        ],
      },
      {
        ...expected,
        sources: [{ ...expected.sources[0], vertexClearanceMarginM: 0.002 }],
      },
    ).status,
    "fail",
  );
  assert.equal(
    readClearanceSample(packet, {
      ...expected,
      sources: [...expected.sources, ...expected.sources],
    }).status,
    "unknown",
  );
  assert.equal(ok.fullBodyAccepted, false);
  assert.equal(ok.productionEnabled, false);
  for (const patch of [
    { frameId: 11 },
    { bodyRevision: "other" },
    { activationId: "stale" },
    { time: 0 },
    { measurements: [] },
    { measurements: [...packet.measurements, ...packet.measurements] },
  ])
    assert.equal(
      readClearanceSample({ ...packet, ...patch }, expected).status,
      "unknown",
    );
  assert.equal(
    readClearanceSample(
      {
        ...packet,
        measurements: [{ ...packet.measurements[0], edgeCrossings: 1 }],
      },
      expected,
    ).status,
    "fail",
  );
  assert.equal(
    readClearanceSample(packet, {
      ...expected,
      sources: [{ ...expected.sources[0], solidInterpretationAccepted: false }],
    }).status,
    "unknown",
  );
});
test("open boundaries and reversed winding do not grant a closed solid", () => {
  const cube = new BoxGeometry(2, 2, 2),
    positions = Array.from(cube.attributes.position.array),
    indices = Array.from(cube.index.array);
  assert.equal(
    createClearanceSource({
      name: "hole",
      positions,
      indices: indices.slice(3),
    }).topology.solidComplete,
    false,
  );
  [indices[0], indices[1]] = [indices[1], indices[0]];
  assert.equal(
    createClearanceSource({ name: "winding", positions, indices }).topology
      .solidComplete,
    false,
  );
});
