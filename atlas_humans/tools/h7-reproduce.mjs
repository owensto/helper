import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const pin = "b84a980b0d86f247f216e1489d1dc4636875c884",
  source = execFileSync("git", [
    "show",
    pin + ":atlas_humans/src/hand-controller.mjs",
  ]),
  hash = createHash("sha256").update(source).digest("hex");
if (hash !== "0127ae03c524de171b453fdcc11bc0bb59b0205dab6003c0123018b23f8bf902")
  throw new Error("AUDITED_SOURCE_MISMATCH");
fs.mkdirSync("node_modules/.cache/h7", { recursive: true });
fs.mkdirSync("evidence/h7", { recursive: true });
const file = path.resolve("node_modules/.cache/h7/hand-controller.mjs");
fs.writeFileSync(file, source);
const args = [
  "--test",
  "--test-name-pattern",
  "H7 audit trace",
  "tests/h7-paused-input.test.mjs",
];
const env = { ...process.env };
delete env.H7_CONTROLLER_URL;
const before = spawnSync(process.execPath, args, {
    env: { ...env, H7_CONTROLLER_URL: pathToFileURL(file).href },
    encoding: "utf8",
  }),
  after = spawnSync(process.execPath, args, { env, encoding: "utf8" });
fs.writeFileSync("evidence/h7/before.txt", before.stdout + before.stderr);
fs.writeFileSync(
  "evidence/h7/after-three-traces.txt",
  after.stdout + after.stderr,
);
if (
  before.status !== 1 ||
  !/^# fail 3$/m.test(before.stdout) ||
  after.status !== 0 ||
  !/^# pass 3$/m.test(after.stdout)
)
  throw new Error("RED_GREEN_EXPECTATION_FAILED");
fs.writeFileSync(
  "evidence/h7/reproduction.json",
  JSON.stringify(
    {
      auditedSource: pin,
      controllerSHA256: hash,
      scope:
        "Three specified audit traces recreated with real Three.js; not the unavailable original20-probe attachment or synthetic math spies.",
      before: { pass: 0, fail: 3, exitCode: before.status },
      after: { pass: 3, fail: 0, exitCode: after.status },
    },
    null,
    2,
  ) + "\n",
);
console.log({ before: "0 pass /3 fail", after: "3 pass /0 fail", hash });
