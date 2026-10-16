import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  inspectCoreC1Helm,
  inspectYachtY1Helm,
  inspectYachtPointSupport,
} from "../src/owner-contracts.mjs";
const require = createRequire(import.meta.url),
  A = require("./owner-fixtures/yacht-y1-adapter.cjs"),
  M = JSON.parse(
    fs.readFileSync(new URL("./owner-fixtures/yacht-y1.json", import.meta.url)),
  ),
  C = JSON.parse(
    fs.readFileSync(new URL("./owner-fixtures/core-c1.json", import.meta.url)),
  );
const raw = fs.readFileSync(
    new URL(
      "../../atlas_d_original_r7/live/ATLAS_D_Original.glb",
      import.meta.url,
    ),
  ),
  hash = createHash("sha256").update(raw).digest("hex");
assert.equal(hash, A.ASSET);
const size = raw.readUInt32LE(12),
  doc = JSON.parse(raw.subarray(20, 20 + size)),
  bin = raw.subarray(28 + size);
function acc(i) {
  const a = doc.accessors[i],
    b = doc.bufferViews[a.bufferView],
    w = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type],
    sz = { 5126: 4, 5125: 4, 5123: 2 }[a.componentType],
    stride = b.byteStride || w * sz,
    off = (b.byteOffset || 0) + (a.byteOffset || 0),
    read =
      a.componentType === 5126
        ? "readFloatLE"
        : a.componentType === 5125
          ? "readUInt32LE"
          : "readUInt16LE";
  return {
    count: a.count,
    getX: (j) => bin[read](off + j * stride),
    getY: (j) => bin[read](off + j * stride + sz),
    getZ: (j) => bin[read](off + j * stride + 2 * sz),
  };
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const nodes = doc.nodes.map((n) => {
  const o = { name: n.name || "" };
  if (n.mesh !== undefined) {
    const p = doc.meshes[n.mesh].primitives[0];
    o.geometry = {
      attributes: { position: acc(p.attributes.POSITION) },
      index: p.indices === undefined ? null : acc(p.indices),
    };
  }
  return o;
});
const adapter = A.createAdapter(
  M,
  A.readSourceGeometry({ traverse: (fn) => nodes.forEach(fn) }, M, hash),
);
// Exact owner geometry; synthetic identity matrices deliberately isolate receiver math.
const frame = () => ({
  vesselId: A.ID,
  activeVesselId: A.ID,
  sourceAssetSHA256: hash,
  instanceId: "human-conformance-fixture",
  activationEpoch: 1,
  frameId: 1,
  simTimeSeconds: 1,
  mode: "surface",
  conversion: 0,
  depthM: 0,
  worldFromVessel: I,
  nodes: Object.fromEntries(
    nodes.map((n) => [n.name, { worldFromLocal: I, visible: true }]),
  ),
  bottom: { known: false, waterDepthM: null, clearanceM: null },
});
test("C1 exact owner descriptor preserves captain root but rejects missing physical contacts", () => {
  assert.deepEqual(
    C.vessels["atlas-bay-25-sealab12"].anchors.captainRootLocal,
    [-1.6, 1.06, 0.18],
  );
  const r = inspectCoreC1Helm(C);
  assert.equal(r.valid, false);
  assert.equal(r.missing.length, 6);
  assert.equal(r.productionEnabled, false);
});
test("Y1 real owner sampler cannot turn absent helm into an origin attachment", () => {
  const s = adapter.sample(frame()),
    r = inspectYachtY1Helm(s, s);
  assert.equal(r.reason, "YACHT_HELM_ANCHORS_UNAVAILABLE");
  for (const a of Object.values(s.helmAnchors)) {
    assert.equal(a.positionWorldM, null);
    assert.equal(a.available, false);
  }
});
test("actual R7 foredeck point hit never becomes whole-foot or walkable-rectangle approval", () => {
  const f = frame(),
    s = adapter.sample(f),
    q = adapter.queryContact(f, {
      expectedFrameToken: s.frameToken,
      pointWorldM: M.regions[0].previewPointLocalM,
      regionId: M.regions[0].id,
    });
  assert.equal(q.available, true);
  const r = inspectYachtPointSupport(q, s, s);
  assert.equal(r.valid, true);
  assert.equal(r.supportsWholeFoot, false);
  assert.equal(r.productionEnabled, false);
  assert.equal(q.bottom.known, false);
});
test("Y1 conversion, submerged and vessel switching fail closed; old frame cannot revive support", () => {
  const f = frame(),
    old = adapter.sample(f);
  for (const patch of [
    { mode: "securing", conversion: 0.5 },
    { mode: "submerged", conversion: 1, depthM: 10 },
    { activeVesselId: "atlas-bay-25-sealab12" },
  ]) {
    const n = { ...f, ...patch },
      s = adapter.sample(n),
      q = adapter.queryContact(n, {
        expectedFrameToken: s.frameToken,
        pointWorldM: M.regions[0].previewPointLocalM,
      });
    assert.equal(inspectYachtPointSupport(q, s, s).valid, false);
  }
  const newSample = adapter.sample({ ...f, activationEpoch: 2, frameId: 2 });
  assert.equal(inspectYachtY1Helm(old, newSample).reason, "YACHT_STALE_FRAME");
});

test("owner fixture bytes match pinned provenance", () => {
  const provenance = JSON.parse(
    fs.readFileSync(
      new URL("./owner-fixtures/provenance.json", import.meta.url),
    ),
  );
  for (const f of provenance.files)
    assert.equal(
      createHash("sha256")
        .update(
          fs.readFileSync(
            new URL("./owner-fixtures/" + f.file, import.meta.url),
          ),
        )
        .digest("hex"),
      f.sha256,
    );
});
