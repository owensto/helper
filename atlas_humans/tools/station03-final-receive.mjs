// Read-only final CI receiving verification; no rig or runtime installation.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { Matrix4, Vector3 } from "three";
import { createClearanceSource } from "../src/clearance.mjs";
const root = resolve(process.argv[2] || "/tmp/station03-desktop");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(root, p));
const json = (p) => JSON.parse(read(p));
const sourceSHA = "ba153f5d0b68391e4ac88e8a1e4a9d77fd60a069";
const rows = [];
function check(name, fn) {
  try {
    rows.push({ name, pass: true, result: fn() });
  } catch (e) {
    rows.push({ name, pass: false, error: e.message });
  }
}
const manifest = json("station03/station-site/s03-manifest.json"),
  build = json("station03/station-build.json"),
  ledger = json("station03/source-ledger.json"),
  geometry = json("station03/authored-geometry.json");
check("desktop archive exact owner hash", () => {
  const h = sha(readFileSync(root + ".zip"));
  assert.equal(
    h,
    "043299ac0cb7fc052d0cb35c57c0a33fa2c2ca2a54a200f9fdc12baee2df1181",
  );
  return h;
});
check("complete artifact payload table", () => {
  const table = json("artifact-hashes.json");
  for (const [p, h] of Object.entries(table)) assert.equal(sha(read(p)), h, p);
  const files = [];
  function walk(dir = "") {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  }
  walk();
  assert.deepEqual(
    files.filter((p) => p !== "artifact-hashes.json").sort(),
    Object.keys(table).sort(),
  );
  return Object.keys(table).length;
});
check("all candidate files and manifest bound", () => {
  assert.equal(build.sourceSHA, sourceSHA);
  assert.equal(manifest.sourceSHA, sourceSHA);
  assert.equal(
    sha(read("station03/station-site/s03-manifest.json")),
    "56481a7c21bf13e119b2b7fb9da86a5b52eade4b5142bd3d8c2d3e63c272a16e",
  );
  for (const [p, h] of Object.entries(build.fileHashes))
    assert.equal(sha(read("station03/station-site/" + p)), h, p);
  return {
    files: Object.keys(build.fileHashes).length,
    candidateFingerprint: build.candidateFingerprint,
  };
});
check("all seven owner sources equal immutable Git", () => {
  for (const [p, h] of Object.entries(manifest.sourceHashes)) {
    assert.equal(sha(read("source/station-03/" + p)), h);
    assert.equal(
      sha(
        execFileSync("git", [
          "show",
          sourceSHA +
            ":atlas_sealab_12/integration/c2-bay-helm/evidence/station-03/" +
            p,
        ]),
      ),
      h,
    );
  }
  return Object.keys(manifest.sourceHashes).length;
});
check("design ledger geometry model exact pins", () => {
  for (const [p, h] of [
    ["station03/source-ledger.json", manifest.sourceLedgerSHA256],
    ["station03/authored-geometry.json", manifest.geometryFingerprint],
    ["station03/station-site/s03-design.json", manifest.designSHA256],
    [
      "station03/station-site/assets/ATLAS_Bay_Play.glb",
      manifest.baseline.modelSHA256,
    ],
  ])
    assert.equal(sha(read(p)), h, p);
  assert.equal(ledger.replacements.length, 41);
  assert.equal(ledger.retainedSources.length, 130);
  assert.equal(
    ledger.replacements.reduce((n, r) => n + r.retiredTriangleCount, 0),
    92444,
  );
  return {
    ledger: manifest.sourceLedgerSHA256,
    geometry: manifest.geometryFingerprint,
    design: manifest.designSHA256,
  };
});
check("replacement and survivor ledger against original GLB accessors", () => {
  const b = read("station03/station-site/assets/ATLAS_Bay_Play.glb"),
    jsonLength = b.readUInt32LE(12),
    g = JSON.parse(b.subarray(20, 20 + jsonLength).toString()),
    binary = b.subarray(28 + jsonLength);
  const accessor = (id) => {
    const a = g.accessors[id],
      v = g.bufferViews[a.bufferView];
    assert(!a.sparse);
    const width = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType],
      dims = { SCALAR: 1, VEC3: 3 }[a.type];
    assert(width && dims);
    const out = [];
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < dims; k++) {
        const off =
          (v.byteOffset || 0) +
          (a.byteOffset || 0) +
          i * (v.byteStride || width * dims) +
          k * width;
        out.push(
          a.componentType === 5126
            ? binary.readFloatLE(off)
            : binary.readUIntLE(off, width),
        );
      }
    return out;
  };
  let survivors = 0;
  const ids = new Set();
  for (const r of [...ledger.replacements, ...ledger.retainedSources]) {
    const node = g.nodes[r.originalNode];
    assert.equal(node.mesh, r.mesh);
    const prim = g.meshes[r.mesh].primitives[r.primitive];
    assert.equal(prim.attributes.POSITION, r.positionAccessor);
    assert.equal(prim.indices, r.indexAccessor);
    const positions = accessor(r.positionAccessor),
      indices = accessor(r.indexAccessor);
    assert.equal(
      sha(Buffer.from(new Float32Array(positions).buffer)),
      r.positionSHA256,
    );
    assert.equal(
      sha(Buffer.from(new Uint32Array(indices).buffer)),
      r.indexSHA256,
    );
    assert.equal(indices.length / 3, r.originalTriangleCount);
    if (r.sourceTriangles !== undefined) {
      const key = r.originalNode + ":" + r.primitive;
      assert(!ids.has(key));
      ids.add(key);
      const faces =
        r.sourceTriangles === "all"
          ? Array.from({ length: indices.length / 3 }, (_, i) => i)
          : r.sourceTriangles;
      assert.equal(new Set(faces).size, faces.length);
      assert(
        faces.every(
          (f) => Number.isSafeInteger(f) && f >= 0 && f < indices.length / 3,
        ),
      );
      survivors += faces.length;
      if (r.retainedIndexSHA256)
        assert.equal(
          sha(
            Buffer.from(
              new Uint32Array(
                faces.flatMap((f) => indices.slice(f * 3, f * 3 + 3)),
              ).buffer,
            ),
          ),
          r.retainedIndexSHA256,
        );
    }
  }
  assert.equal(survivors, 356774);
  return {
    records: 171,
    distinctSurvivors: ids.size,
    survivingFaces: survivors,
    scope:
      "original bytes and surviving index selection; no current transforms or interior classification",
  };
});
for (const part of geometry.parts)
  check("H6 topology and manifest buffers: " + part.render.id, () => {
    const pin = manifest.geometryParts.find((p) => p.id === part.render.id);
    const results = {};
    for (const [key, record] of [
      ["render", part.render],
      ["collision", part.proxy],
    ]) {
      assert.equal(
        sha(Buffer.from(new Float32Array(record.positions).buffer)),
        pin[key].positionSHA256,
      );
      assert.equal(
        sha(Buffer.from(new Uint32Array(record.indices).buffer)),
        pin[key].indexU32SHA256,
      );
      const o = createClearanceSource({
        name: record.id,
        positions: record.positions,
        indices: record.indices,
      });
      assert(o.topology.solidComplete);
      assert.equal(o.topology.degenerateTriangles, 0);
      results[key] = o.topology;
    }
    return results;
  });
for (const state of ["down", "up", "returned"])
  check("evaluated " + state + " part buffers and support transforms", () => {
    const packet = json("station03/browser/desktop_" + state + ".json");
    assert.equal(packet.snapshot.sourceSHA, sourceSHA);
    assert.equal(packet.snapshot.manifestSHA256, build.manifestSHA256);
    assert.equal(packet.parts.length, 25);
    let maxFrameError = 0;
    for (const p of packet.parts) {
      const pin = manifest.geometryParts.find((q) => q.id === p.render.id);
      for (const k of ["render", "collision"]) {
        assert.equal(
          sha(Buffer.from(new Float32Array(p[k].positions).buffer)),
          pin[k].positionSHA256,
        );
        assert.equal(
          sha(Buffer.from(new Uint32Array(p[k].indices).buffer)),
          pin[k].indexU32SHA256,
        );
      }
      assert.equal(p.localToVessel.length, 16);
      assert(p.localToVessel.every(Number.isFinite));
    }
    for (const s of packet.surfaces) {
      const p = packet.parts.find((p) => p.render.id === s.part),
        m = new Matrix4().fromArray(p.localToVessel);
      const at = new Vector3(...s.point).applyMatrix4(m),
        u = new Vector3(...s.tangent).transformDirection(m),
        n = new Vector3(...s.normal).transformDirection(m),
        v = u.clone().cross(n);
      const expected = new Matrix4()
        .makeBasis(u, n, v)
        .setPosition(at)
        .toArray();
      const error = Math.max(
        ...expected.map((x, i) => Math.abs(x - s.contactToVessel[i])),
      );
      assert(error < 1e-7);
      maxFrameError = Math.max(error, maxFrameError);
    }
    assert.equal(packet.fullBodyAccepted, false);
    assert.equal(packet.snapshot.humanFactoryEnabled, false);
    assert.equal(packet.snapshot.supportGeometryReady, state !== "up");
    return {
      serial: packet.snapshot.serial,
      hostSeconds: packet.snapshot.hostSeconds,
      geometryReady: packet.snapshot.supportGeometryReady,
      maxFrameError,
      scope: "export internal coherence only; survivor current matrices absent",
    };
  });
check("reported empty browser and geometry checks only", () => {
  const browser = json("station03/browser/validation.json"),
    unit = json("station03/geometry-unit.json");
  assert(browser.passed && unit.passed);
  assert(browser.tests.every((t) => t.passed));
  assert(unit.tests.every((t) => t.passed));
  assert.equal(browser.humanRequests.length, 0);
  assert.equal(browser.fullBodyAccepted, false);
  return {
    browser: browser.tests.length,
    geometry: unit.tests.length,
    replayedBrowser: false,
  };
});
const report = {
  revision: "humans-station03-final-ci-receiving/1",
  sourceSHA,
  artifactId: 12040578343,
  runId: 38887422403,
  status: rows.every((r) => r.pass)
    ? "CI_BYTES_AND_EMPTY_GEOMETRY_VERIFIED"
    : "FAIL",
  rows,
  receivingZipVerified: false,
  finalPolicyClosureVerified: false,
  bodyClearanceEvaluated: false,
  fittingAuthorized: false,
  fullBodyAccepted: false,
  productionAccepted: false,
};
const out = new URL("../evidence/station03-final-receiving/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(
  new URL("ci-verification.json", out),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: report.status,
    checks: rows.length,
    failures: rows.filter((r) => !r.pass),
  }),
);
if (rows.some((r) => !r.pass)) process.exitCode = 1;
