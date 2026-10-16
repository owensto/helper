import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { Box3, Vector3, Matrix4 } from "three";
import { createClearanceSource } from "../src/clearance.mjs";
const raw = JSON.parse(fs.readFileSync("/tmp/atlas-h6-source-geometry.json")),
  data = JSON.parse(
    gunzipSync(
      fs.readFileSync(
        process.env.H6_CAPTURE_FILE || "evidence/h6/body-captures.json.gz",
      ),
    ),
  ),
  captures = process.env.H6_ALL ? data.captures : [data.captures[0]],
  V = (a) => new Vector3(...a),
  bodyBox = new Box3();
data.captures.forEach((c) =>
  c.body.forEach((v) => bodyBox.expandByPoint(V(v.p))),
);
bodyBox.expandByScalar(0.02);
const sources = raw
  .map((s) => {
    const box = new Box3();
    for (let i = 0; i < s.positions.length; i += 3)
      box.expandByPoint(V(s.positions.slice(i, i + 3)));
    return { ...s, box };
  })
  .filter((s) =>
    data.captures.some((c) =>
      s.box
        .clone()
        .applyMatrix4(new Matrix4().fromArray(c.sourceMatrices[s.name]))
        .intersectsBox(bodyBox),
    ),
  )
  .map((s) => ({ ...s, oracle: createClearanceSource(s) }));
const topology = sources.map((s) => s.oracle.topology);
fs.writeFileSync(
  "evidence/h6/topology.json",
  JSON.stringify(topology, null, 2),
);
console.log(
  "sources",
  sources.length,
  "triangles",
  topology.reduce((s, x) => s + x.triangles, 0),
  "closed",
  topology.filter((s) => s.solidComplete).length,
  "poses",
  captures.length,
);
const edges = data.bodyTopology.map((indices) => {
  const e = new Map();
  for (let i = 0; i < indices.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = indices[i + j],
        b = indices[i + ((j + 1) % 3)],
        key = [Math.min(a, b), Math.max(a, b)].join(":");
      if (!e.has(key)) e.set(key, [a, b]);
    }
  return [...e.values()];
});
const results = [];
for (const capture of captures) {
  const start = performance.now(),
    points = new Map(capture.body.map((v) => [v.mesh + ":" + v.index, v.p])),
    rows = [];
  for (const s of sources) {
    const matrix = capture.sourceMatrices[s.name],
      box = s.box.clone().applyMatrix4(new Matrix4().fromArray(matrix)),
      near = box.clone().expandByScalar(0.01);
    let minVertexSeparationM = 0.01;
    let inside = [],
      nearby = [],
      crossings = [];
    for (const v of capture.body) {
      if (!near.containsPoint(V(v.p))) continue;
      const q = s.oracle.query(v.p, matrix);
      minVertexSeparationM = Math.min(minVertexSeparationM, q.distance);
      if (q.penetrationM !== null)
        inside.push({ mesh: v.mesh, index: v.index, p: v.p, ...q });
      else if (q.distance < 0.005)
        nearby.push({ mesh: v.mesh, index: v.index, p: v.p, ...q });
    }
    for (let mesh = 0; mesh < edges.length; mesh++)
      for (const [a, b] of edges[mesh]) {
        const p = points.get(mesh + ":" + a),
          q = points.get(mesh + ":" + b);
        if (!p || !q) throw new Error("MISSING_BODY_VERTEX");
        if (!new Box3().setFromPoints([V(p), V(q)]).intersectsBox(box))
          continue;
        const hits = s.oracle.segment(p, q, matrix);
        if (hits.length) crossings.push({ mesh, a, b, hits });
      }
    if (inside.length || nearby.length || crossings.length)
      rows.push({
        name: s.name,
        minVertexSeparationM,
        solidComplete: s.oracle.topology.solidComplete,
        insideCount: inside.length,
        maxPenetrationM: Math.max(0, ...inside.map((v) => v.penetrationM)),
        inside: inside
          .sort((a, b) => b.penetrationM - a.penetrationM)
          .slice(0, 12),
        nearCount: nearby.length,
        nearest: nearby.sort((a, b) => a.distance - b.distance).slice(0, 4),
        edgeCrossingCount: crossings.length,
        edgeWitnesses: crossings.slice(0, 12),
      });
  }
  const result = {
    time: capture.time,
    frameId: capture.frameId,
    variant: capture.variant,
    metrics: capture.metrics,
    cpuMs: performance.now() - start,
    rows,
  };
  results.push(result);
  console.log(
    JSON.stringify({
      time: capture.time,
      ms: result.cpuMs,
      collisions: rows
        .filter((r) => r.insideCount || r.edgeCrossingCount)
        .map((r) => [
          r.name,
          r.insideCount,
          r.maxPenetrationM,
          r.edgeCrossingCount,
        ]),
    }),
  );
}
fs.writeFileSync(
  process.env.H6_OUTPUT ||
    (process.env.H6_ALL
      ? "evidence/h6/clearance-motion.json"
      : "evidence/h6/baseline.json"),
  JSON.stringify({
    scope:
      "All indexed body vertices and body mesh edges at recorded discrete rendered poses; not swept or complete triangle-triangle clearance.",
    bodyVertexCount: data.captures[0].body.length,
    bodyEdges: edges.reduce((s, e) => s + e.length, 0),
    sourceCount: sources.length,
    topology,
    results,
  }),
);
