import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { createClearanceSource } from "../src/clearance.mjs";
const members = JSON.parse(
    fs.readFileSync("/tmp/atlas-h6-source-geometry.json"),
  ).filter((s) => s.name.startsWith("PLAY_STEERING_")),
  frames = JSON.parse(
    gunzipSync(fs.readFileSync("evidence/h6/body-captures.json.gz")),
  ).captures;
if (members.length !== 2) throw new Error("WHEEL_MEMBERS_CHANGED");
for (const frame of frames) {
  const a = frame.sourceMatrices[members[0].name],
    b = frame.sourceMatrices[members[1].name];
  if (a.some((v, i) => Math.abs(v - b[i]) > 1e-12))
    throw new Error("COMPOSITE_FRAMES_DIFFER");
}
const positions = [],
  indices = [];
for (const m of members) {
  const offset = positions.length / 3;
  positions.push(...m.positions);
  indices.push(...m.indices.map((i) => i + offset));
}
const oracle = createClearanceSource({
  name: "PLAY_STEERING_COMPOSITE",
  positions,
  indices,
});
fs.writeFileSync(
  "evidence/h6/wheel-composite-topology.json",
  JSON.stringify(
    {
      members: members.map((m) => m.name),
      rigidFrameEqualitySamples: frames.length,
      ...oracle.topology,
    },
    null,
    2,
  ),
);
console.log({
  solidComplete: oracle.topology.solidComplete,
  components: oracle.topology.components.length,
  boundaryEdges: oracle.topology.components.reduce(
    (s, c) => s + c.boundaryEdges,
    0,
  ),
});
