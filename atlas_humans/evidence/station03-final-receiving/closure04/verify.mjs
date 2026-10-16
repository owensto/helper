import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { createClearanceSource } from "../../../src/clearance.mjs";
const sourceSHA = "2d8fd2fe267310fd824e1b62652400ac04061d4a",
  base = "atlas_sealab_12/integration/c2-bay-helm/evidence/receiving-04/";
const read = (n) => execFileSync("git", ["show", sourceSHA + ":" + base + n]);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const manifestBytes = read("manifest.json"),
  M = JSON.parse(manifestBytes),
  rows = [];
function check(name, fn) {
  try {
    rows.push({ name, passed: true, result: fn() ?? true });
  } catch (e) {
    rows.push({ name, passed: false, error: e.message });
  }
}
check("exact committed manifest and seven payloads", () => {
  assert.equal(
    sha(manifestBytes),
    "840854a6b15c3da6a1d297a2636414fa9e58f822aa6141ab1515bd4d23e23b46",
  );
  for (const [n, h] of Object.entries(M.fileSHA256))
    assert.equal(sha(read(n)), h, n);
  return { payloads: 7, manifestSHA256: sha(manifestBytes) };
});
const dir = mkdtempSync(join(tmpdir(), "humans-closure04-"));
for (const n of ["contract.json", "geometry-contract.cjs"])
  writeFileSync(join(dir, n), read(n));
const C = JSON.parse(read("contract.json")),
  K = createRequire(import.meta.url)(join(dir, "geometry-contract.cjs"));
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const point = (a, g = 0) => [
  -(0.016 + g),
  0.165 * Math.sin(a),
  0.165 * Math.cos(a),
];
const grip = (p, hand = "left", arcId = "port") =>
  K.gripPoint(p, { hand, arcId, bodySurface: "palm" });
check("exact contract fingerprint and unchanged base", () => {
  assert.equal(
    sha(read("contract.json")),
    "1b6c5bf6a4e4104c24d60c787df984aea9bdb30b31302779a80bcaf3ec6351ee",
  );
  assert.equal(C.sourceSHA, "ba153f5d0b68391e4ac88e8a1e4a9d77fd60a069");
  assert.equal(C.geometryChanged, false);
});
check("branch cut and anatomical assignments", () => {
  assert(grip([-0.016, -0.0164725137467, -0.1641756872709]).pointEligible);
  assert(!grip(point(Math.PI), "right").pointEligible);
  assert(grip(point(0), "right", "starboard").pointEligible);
  assert(!grip(point(0), "left", "starboard").pointEligible);
});
check("closed angular endpoints and roundoff limit", () => {
  for (const [a, h, c] of [
    ["port", "left", Math.PI],
    ["starboard", "right", 0],
  ])
    for (const s of [-1, 1]) {
      assert(K.arcMembership(c + s * 0.25, a, h).inside);
      assert(!K.arcMembership(c + s * (0.25 + 2e-12), a, h).inside);
    }
});
check("minus1 plus2mm exact gap supersedes5mm", () => {
  assert.deepEqual(C.grips.signedNormalGapM, [-0.001, 0.002]);
  for (const g of [-0.001, 0.002]) assert(K.normalGapClassification(g).inside);
  for (const g of [-0.001 - 1e-10, 0.002 + 1e-10, 0.005])
    assert(!K.normalGapClassification(g).inside);
  assert(grip(point(Math.PI, 0.0019)).pointEligible);
  assert(!grip(point(Math.PI, 0.0021)).pointEligible);
});
check("malformed and ambiguous projections reject", () => {
  for (const p of [new Array(3), [NaN, 0, 1], [0.016, 0, 0], [0, 0, -0.165]])
    assert.throws(() => grip(p));
  assert.throws(() =>
    K.gripPoint(point(0), {
      hand: "right",
      arcId: "starboard",
      bodySurface: "forearm",
    }),
  );
});
check("optional back and required seat/both soles", () => {
  assert(C.supportRoles.back.startsWith("OPTIONAL"));
  for (const id of ["seat", "leftFoot", "rightFoot"])
    assert(C.supportRoles[id].startsWith("REQUIRED"));
});
check("unknown interiors prohibit whole-domain pass", () => {
  assert.equal(C.retainedInteriors.closedComponentFaceSets, null);
  assert.equal(C.retainedInteriors.unknownIsNotEmpty, true);
  assert.equal(C.retainedInteriors.positiveVolumeClearanceAvailable, false);
});
check("guard topology and metre thickness under affine transforms", () => {
  const matrices = [
    I,
    [5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 1, 2, 3, 1],
    [0.2, 0, 0, 0, 0, 8, 0, 0, 0, 0, 3, 0, 1, 2, 3, 1],
    [1, 0.2, 0.3, 0, 0.4, 2, 0.1, 0, 0.6, 0.5, 3, 0, 1, 2, 3, 1],
    [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
  ];
  for (const m of matrices) {
    const g = K.vesselTriangleGuard(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0.25, 0, 1],
      ],
      m,
    );
    const o = createClearanceSource({
      name: "synthetic-guard",
      positions: g.positions,
      indices: g.indices,
    });
    assert(o.topology.solidComplete);
    for (let i = 0; i < 3; i++) {
      const a = g.positions.slice(i * 3, i * 3 + 3),
        b = g.positions.slice((i + 3) * 3, (i + 4) * 3);
      assert(
        Math.abs(Math.hypot(...a.map((v, k) => b[k] - v)) - 0.004) < 1e-12,
      );
    }
  }
  return { syntheticMatrices: matrices.length, actualSurvivorBodiesTested: 0 };
});
check("singular and degenerate guards reject", () => {
  const m = I.slice();
  m[0] = 0;
  assert.throws(() =>
    K.vesselTriangleGuard(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 1],
      ],
      m,
    ),
  );
  assert.throws(() =>
    K.vesselTriangleGuard(
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 1],
      ],
      I,
    ),
  );
});
check("separation from guard boundary and no fit activation", () => {
  assert.equal(C.guard.ordinaryPenetrationM, 0);
  assert.equal(C.guard.ordinarySeparationM, 0.002);
  assert.equal(C.guard.halfThicknessM, 0.002);
  for (const k of [
    "humanFitAuthorized",
    "liveCoupling",
    "fullBody",
    "gameplay",
    "public",
    "H4H5H7Adoption",
  ])
    assert.equal(C.acceptance[k], false);
});
check("frozen contract null live identity and zero dt", () => {
  for (const k of [
    "hostSeconds",
    "hostFrameId",
    "simulationEpoch",
    "activationEpoch",
    "runtimeScope",
    "vesselInstance",
  ])
    assert.equal(C.frozen[k], null);
  assert.equal(C.frozen.consumedDtSeconds, 0);
  assert.equal(C.frozen.pausedTimestampEstablishesFreshness, false);
  assert.equal(C.liveBindingAvailable, false);
});
check("export hash is only a declared recipe pin", () => {
  const recipe = JSON.parse(read("frozen-export.recipe.json"));
  assert.equal(
    recipe.generatedFiles["frozen-export.json"],
    "8bd2bdd6b8e90b2d678e3b75869b89f69870dbe9488f2ab9e3cef7ae6c074a36",
  );
  assert.equal(
    M.frozenExportUncompressedSHA256,
    recipe.generatedFiles["frozen-export.json"],
  );
  return { actualExportBytesVerified: false };
});
const report = {
  sourceSHA,
  status: rows.every((r) => r.passed)
    ? "CONTRACT_VERIFIED_EXPORT_BYTES_UNAVAILABLE"
    : "FAIL",
  rows,
  contractVerified: true,
  manifestVerified: true,
  frozenExportVerified: false,
  originalReceivingZIPVerified: false,
  compiledSupportRecordVerified: false,
  owner39TestSuiteRerun: false,
  fullReceivingACK: false,
  scope:
    "Contract receipt and tested pure math only; no frozen export completeness, pose, fit or clearance acceptance",
  remainingBlockers: [
    "Exact frozen-export JSON/GZIP or pinned receiving ZIP required to verify export/table/world/support bindings",
    "All130 retained interior face sets explicitly unknown",
    "Live current-frame/identity/epoch binding absent by design",
  ],
  fittingAuthorized: false,
  fullBodyAccepted: false,
};
writeFileSync(
  new URL("verification.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: report.status,
    checks: rows.length,
    failed: rows.filter((r) => !r.passed),
  }),
);
if (rows.some((r) => !r.passed)) process.exitCode = 1;
