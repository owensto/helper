import fs from "node:fs";
const r = JSON.parse(fs.readFileSync("evidence/h4/motion.json"));
const summarize = (c) => {
  const violations = [];
  const contact = {};
  for (const id of ["seat", "leftHand", "rightHand", "leftFoot", "rightFoot"]) {
    const a = c.samples.map((s) => s.metrics[id]);
    const source = a.flatMap((m) => m.sourceDistancesM || [m.sourceDistanceM]);
    contact[id] = {
      normalMinM: Math.min(...a.map((m) => m.normalM)),
      normalMaxM: Math.max(...a.map((m) => m.normalM)),
      edgeMarginMinM: Math.min(...a.map((m) => m.edgeMarginM)),
      sourceMissing: source.filter((v) => v === null).length,
      sourceMinM: Math.min(...source.filter((v) => v !== null)),
      sourceMaxM: Math.max(...source.filter((v) => v !== null)),
    };
    const m = contact[id],
      lo = id === "seat" ? -0.003 : -0.002,
      hi = id.includes("Foot") ? 0.008 : 0.005;
    if (m.edgeMarginMinM < 0) violations.push(id + ":outside-finite-patch");
    if (m.sourceMissing || m.sourceMinM < lo || m.sourceMaxM > hi)
      violations.push(id + ":source-clearance");
  }
  const maxJointErrorM = Math.max(...c.samples.map((s) => s.jointErrorM)),
    costs = c.samples.map((s) => s.updateMs).sort((a, b) => a - b);
  if (maxJointErrorM > 0.005) violations.push("unreachable-joint");
  return {
    name: c.name,
    frames: c.samples.length,
    seconds: c.samples.at(-1).time,
    updateP95Ms: costs[Math.floor(costs.length * 0.95)],
    maxJointErrorM,
    contact,
    violations,
    passed: violations.length === 0,
  };
};
const summary = {
  scope: r.scope,
  errors: r.errors,
  scenarios: r.counters.map(summarize),
  productionAccepted: false,
};
summary.passed =
  summary.errors.length === 0 &&
  summary.scenarios.every((s) => s.passed && s.seconds >= 14.9);
fs.writeFileSync(
  "evidence/h4/assessment.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
