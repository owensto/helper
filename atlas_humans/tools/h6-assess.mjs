import fs from "node:fs";
import { createHash } from "node:crypto";
import { readClearanceSample } from "../src/clearance.mjs";
const audit = JSON.parse(fs.readFileSync("evidence/h6/clearance-motion.json")),
  sourceSet = JSON.parse(fs.readFileSync("profiles/bay12-h6/source-set.json")),
  candidate = JSON.parse(fs.readFileSync("profiles/bay12-h6/candidate.json")),
  digest = createHash("sha256")
    .update(fs.readFileSync("profiles/bay12-h6/source-set.json"))
    .digest("hex");
if (candidate.sourceSetSHA256 !== digest)
  throw new Error("SOURCE_SET_DIGEST_MISMATCH");
const summary = {},
  decisions = [];
for (const frame of audit.results) {
  const expected = {
    bodyRevision: candidate.profileSHA256,
    sourceSetRevision: digest,
    vesselInstanceId: "isolated-h6-fixture",
    activationId: "h6-capture",
    simulationEpoch: "h5-authored-motion",
    frameId: frame.frameId,
    time: frame.time,
    sources: sourceSet.sources.map((s) => ({
      id: s.id,
      penetrationToleranceM: s.penetrationToleranceM,
      vertexClearanceMarginM: s.vertexClearanceMarginM,
      solidInterpretationAccepted: s.solidInterpretationAccepted,
    })),
  };
  const measurements = sourceSet.sources.map((s) => {
    const row = frame.rows.find((r) => r.name === s.id);
    return {
      sourceId: s.id,
      sampleCount: audit.bodyVertexCount,
      minVertexSeparationM: row?.minVertexSeparationM ?? 0.005,
      maxPenetrationM: row?.maxPenetrationM || 0,
      edgeCrossings: row?.edgeCrossingCount || 0,
      solidComplete: s.topology.solidComplete,
    };
  });
  const packet = { ...expected, measurements };
  delete packet.sources;
  decisions.push({
    time: frame.time,
    frameId: frame.frameId,
    ...readClearanceSample(packet, expected),
  });
  for (const row of frame.rows) {
    const a = (summary[row.name] ??= {
      name: row.name,
      penetratingFrames: 0,
      crossingFrames: 0,
      maxPenetrationM: 0,
      maxEdgeCrossings: 0,
      solidComplete: row.solidComplete,
    });
    a.penetratingFrames += row.insideCount > 0;
    a.crossingFrames += row.edgeCrossingCount > 0;
    a.maxPenetrationM = Math.max(a.maxPenetrationM, row.maxPenetrationM);
    a.maxEdgeCrossings = Math.max(a.maxEdgeCrossings, row.edgeCrossingCount);
  }
}
const probes = JSON.parse(
    fs.readFileSync("evidence/h6/pose-probe-audit.json"),
  ).results.map((f) => ({
    variant: f.variant,
    maxJointErrorM: f.metrics.maxJointErrorM,
    minSoleDeckGapM: f.metrics.minSoleY - 0.358,
    maxPenetrationM: Math.max(...f.rows.map((r) => r.maxPenetrationM)),
    status: "rejected",
  })),
  contact = JSON.parse(fs.readFileSync("evidence/h6/contact-assessment.json"));
const result = {
  revision: candidate.revision,
  clearanceStatus: decisions.some((d) => d.status === "fail")
    ? "fail"
    : "unknown",
  productionEnabled: false,
  fullBodyAccepted: false,
  contactSlicePass: contact.contactSlicePass,
  renderedFrames: contact.renderedFrames,
  durationSec: contact.durationSec,
  bodyPosesAudited: decisions.length,
  bodyVertexCount: audit.bodyVertexCount,
  bodyEdges: audit.bodyEdges,
  sourceMeshes: audit.sourceCount,
  sourceTriangles: audit.topology.reduce((s, x) => s + x.triangles, 0),
  topologicallyClosedMeshes: audit.topology.filter((x) => x.solidComplete)
    .length,
  maximumSnapshotIntervalSec: Math.max(
    ...audit.results.slice(1).map((f, i) => f.time - audit.results[i].time),
  ),
  offlinePoseAuditMs: {
    min: Math.min(...audit.results.map((f) => f.cpuMs)),
    max: Math.max(...audit.results.map((f) => f.cpuMs)),
  },
  sourceResults: Object.values(summary).sort(
    (a, b) => b.maxPenetrationM - a.maxPenetrationM,
  ),
  decisions,
  poseProbes: probes,
  limitations: [
    "Discrete rendered poses, no swept collision proof",
    "Body vertices and body-edge/source-triangle intersections; coplanar overlap, source-edge/body-face-only crossings and contained obstacles can be missed",
    "Topological closure with1um weld and three-ray parity does not certify non-self-intersection or owner collision semantics",
    "No full-body self-collision, dynamic contact forces, garment compliance, signed depth for open surfaces or coupled C2 lifecycle",
    "Offline oracle is not suitable for the render loop; current pose and all alternatives remain rejected",
  ],
};
fs.writeFileSync(
  "evidence/h6/assessment.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify(
    {
      clearanceStatus: result.clearanceStatus,
      contactSlicePass: result.contactSlicePass,
      poses: decisions.length,
      worst: result.sourceResults.slice(0, 6),
      poseProbes: probes,
    },
    null,
    2,
  ),
);
if (result.clearanceStatus === "fail") process.exitCode = 1;
