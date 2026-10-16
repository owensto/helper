// Preliminary immutable-source receiving check. Never installs a station or poses a rig.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import * as T from "three";
import { createClearanceSource } from "../src/clearance.mjs";
const sourceSHA = "c64a5aab845e70399aee930ea5ad87ed734fa8c0";
const base = "atlas_sealab_12/integration/c2-bay-helm/evidence/station-03/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const source = (name) =>
  execFileSync("git", ["show", `${sourceSHA}:${base}${name}`]);
const designBytes = source("design.json"),
  code = source("geometry.js");
const design = JSON.parse(designBytes),
  context = vm.createContext({});
vm.runInContext(code.toString(), context, { timeout: 1000 });
const api = context.CoreStation03;
const rows = [];
function check(name, fn) {
  try {
    rows.push({ name, pass: true, result: fn() });
  } catch (e) {
    rows.push({ name, pass: false, error: e.message });
  }
}
const identity = new T.Matrix4().toArray();
const parts = [];
for (const p of design.parts) {
  check(`H6 oracle accepts closed collision topology: ${p.id}`, () => {
    const g = api.createGeometry(T, p, true);
    const positions = Array.from(g.attributes.position.array),
      indices = Array.from(g.index.array);
    const oracle = createClearanceSource({ name: p.id, positions, indices });
    assert.equal(oracle.topology.solidComplete, true);
    assert.equal(oracle.topology.degenerateTriangles, 0);
    parts.push({
      id: p.id,
      shape: p.shape,
      positionSHA256: sha(Buffer.from(g.attributes.position.array.buffer)),
      indexU32SHA256: sha(Buffer.from(new Uint32Array(indices).buffer)),
      topology: oracle.topology,
    });
    g.dispose();
    return oracle.topology;
  });
}
for (const s of design.supportSurfaces) {
  check(`finite entire support rectangle inside proxy face: ${s.id}`, () => {
    const p = design.parts.find((p) => p.id === s.part);
    assert(["box", "roundbox"].includes(p.shape));
    const n = new T.Vector3(...s.normal),
      u = new T.Vector3(...s.tangent),
      v = u.clone().cross(n);
    assert.equal(n.length(), 1);
    assert.equal(u.length(), 1);
    assert.equal(n.dot(u), 0);
    const axis = s.normal.findIndex((x) => Math.abs(x) === 1);
    assert(axis >= 0);
    const corners = [];
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        const q = new T.Vector3(...s.point)
          .addScaledVector(u, a * s.halfExtentsM[0])
          .addScaledVector(v, b * s.halfExtentsM[1])
          .toArray();
        for (let k = 0; k < 3; k++)
          assert(Math.abs(q[k]) <= p.size[k] / 2 + 1e-7);
        assert(Math.abs(q[axis] * s.normal[axis] - p.size[axis] / 2) < 1e-7);
        corners.push(q);
      }
    // Convex rectangle / convex box: these corners establish planar containment, not body contact.
    return { corners, bodyContactTested: false };
  });
}
check("H6 oracle reads owner guard as closed and inside at midplane", () => {
  const raw = JSON.parse(
    JSON.stringify(
      api.trianglePrism([
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]),
    ),
  );
  const o = createClearanceSource({ name: "owner-unit-guard", ...raw });
  assert(o.topology.solidComplete);
  const q = o.query([0.2, 0, 0.2], identity);
  assert.equal(q.classification, "inside-closed-component");
  assert(Math.abs(q.penetrationM - 0.002) < 1e-9);
  return {
    depth: q.penetrationM,
    topology: o.topology,
    frame: "synthetic vessel metres; no original transforms evaluated",
  };
});
check("proposal explicitly forbids activation and old profile transfer", () => {
  assert(Object.values(design.activation).every((x) => x === false));
  assert.equal(design.retainedAvatar.newProfile, null);
  assert.equal(design.receiving.noOldProfileReuse, true);
  assert.equal(design.receiving.noFitOrActivationBeforeACK, true);
  assert.equal(
    sha(
      readFileSync(new URL("../assets/RocketboxCaptain.glb", import.meta.url)),
    ),
    design.retainedAvatar.rigSHA256,
  );
  return {
    rigSHA256: design.retainedAvatar.rigSHA256,
    clipSHA256: sha(
      readFileSync(new URL("../assets/animations.json", import.meta.url)),
    ),
  };
});
const theta = Math.PI + 0.1,
  point = [-0.016, 0.165 * Math.sin(theta), 0.165 * Math.cos(theta)],
  principal = Math.atan2(point[1], point[2]);
const report = {
  revision: "humans-station03-preliminary-receiving/1",
  sourceSHA,
  descriptor: design.revision,
  stationId: design.stationId,
  sourceHashes: { design: sha(designBytes), geometry: sha(code) },
  receiverThreeRevision: T.REVISION,
  status: rows.every((r) => r.pass)
    ? "PRELIMINARY_SOURCE_CHECKS_PASS_FINAL_PACKAGE_PENDING"
    : "PRELIMINARY_SOURCE_CHECK_FAILED",
  rows,
  parts,
  gripArcAmbiguity: {
    point,
    principal,
    storedInterval: design.gripSurfaces.portMaterialArcRad,
    literalMembership:
      principal >= design.gripSurfaces.portMaterialArcRad[0] &&
      principal <= design.gripSurfaces.portMaterialArcRad[1],
  },
  limitations: [
    "Local Three 180 geometry construction, not owner generated-runtime manifest equivalence",
    "No actual host current transforms or survivor ledger generated/verified",
    "H6 triangulated point/edge oracle is a negative diagnostic, not analytic/swept acceptance",
    "No human pose, profile, body clearance or browser test performed",
  ],
  pending: [
    "Final source, generated manifest, design/geometry/ledger/contact digests and browser result",
    "Circular grip membership, hand assignment, positive contact gap and back-support requirement",
    "Retained closed component identities; guard construction frame and separation boundary",
    "Single-frame binding for all survivor and authored matrices with independent host context",
    "Analytic solid, reverse edge/face, coplanar/contained/self-intersection and swept collision coverage before acceptance",
  ],
  fittingAuthorized: false,
  fullBodyAccepted: false,
  productionAccepted: false,
};
const out = new URL("../evidence/station03-receiving/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(
  new URL("preliminary.json", out),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: report.status,
    checks: rows.length,
    failed: rows.filter((r) => !r.pass),
    sourceHashes: report.sourceHashes,
  }),
);
if (rows.some((r) => !r.pass)) process.exitCode = 1;
