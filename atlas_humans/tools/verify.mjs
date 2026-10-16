import { chromium } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: "evidence/video", size: { width: 1440, height: 960 } },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8934");
await page.waitForFunction(() => window.HUMANS_LAB?.state.frames > 60);
const report = {
  assetBytes:
    fs.statSync("assets/RocketboxCaptain.glb").size +
    fs.statSync("assets/animations.json").size,
  runtime: await browser.version(),
  timestamp: new Date().toISOString(),
  scenarios: [],
  errors,
};
report.invalidPosePreservesRig = await page.evaluate(() => {
  const rig = HUMANS_LAB.rig;
  const before = JSON.stringify([
    rig.hips.position.toArray(),
    rig.hips.quaternion.toArray(),
  ]);
  let rejected = false;
  try {
    rig.update({ mode: "helm", time: NaN });
  } catch {
    rejected = true;
  }
  return (
    rejected &&
    before ===
      JSON.stringify([
        rig.hips.position.toArray(),
        rig.hips.quaternion.toArray(),
      ])
  );
});
for (const [mode, activity] of process.env.WALK_ONLY
  ? [
      ["rough", "idle"],
      ["rough", "walk"],
    ]
  : [
      ["calm", "helm"],
      ["rough", "helm"],
      ["maneuver", "helm"],
      ["rough", "idle"],
      ["rough", "walk"],
    ]) {
  await page.evaluate(
    ({ mode, activity }) => {
      HUMANS_LAB.setMode(mode);
      HUMANS_LAB.setActivity(activity);
    },
    { mode, activity },
  );
  const samples = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [],
          start = performance.now();
        function sample() {
          samples.push({
            ...HUMANS_LAB.state,
            deckQuaternion: HUMANS_LAB.deck.quaternion.toArray(),
          });
          if (performance.now() - start < 8000) requestAnimationFrame(sample);
          else resolve(samples);
        }
        requestAnimationFrame(sample);
      }),
  );
  const updates = samples.map((x) => x.updateMs).sort((a, b) => a - b);
  const result = {
    mode,
    activity,
    frames: samples.length,
    simulatedSeconds: samples.at(-1).time - samples[0].time,
    maxContactErrorM: Math.max(...samples.map((x) => x.contactErrorM)),
    updateP95Ms: updates[Math.floor(updates.length * 0.95)],
    updateMaxMs: updates.at(-1),
    drawCalls: samples.at(-1).drawCalls,
    triangles: samples.at(-1).triangles,
    motionChanged: samples[0].deckQuaternion.some(
      (v, i) => Math.abs(v - samples.at(-1).deckQuaternion[i]) > 0.001,
    ),
  };
  result.soleY = await page.evaluate(async () => {
    const { Vector3 } = await import("three");
    const v = new Vector3();
    let min = Infinity,
      max = -Infinity,
      count = 0;
    HUMANS_LAB.rig.group.updateWorldMatrix(true, true);
    HUMANS_LAB.rig.group.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const ids = new Set(
          o.geometry.index?.array ||
            Array.from(
              { length: o.geometry.attributes.position.count },
              (_, i) => i,
            ),
        ),
        a = o.geometry.attributes;
      for (const i of ids) {
        let footWeight = 0;
        for (let c = 0; c < 4; c++) {
          const bone = o.skeleton.bones[a.skinIndex.getComponent(i, c)];
          if (/Foot|Toe/.test(bone.name))
            footWeight += a.skinWeight.getComponent(i, c);
        }
        if (footWeight < 0.7) continue;
        v.fromBufferAttribute(a.position, i);
        o.applyBoneTransform(i, v);
        o.localToWorld(v);
        HUMANS_LAB.deck.worldToLocal(v);
        min = Math.min(min, v.y);
        max = Math.max(max, v.y);
        count++;
      }
    });
    return { min, max, count };
  });
  report.scenarios.push(result);
  console.log(result);
  await page.screenshot({ path: `evidence/${mode}-${activity}.png` });
}
await page.click("#pause");
const before = await page.evaluate(() => HUMANS_LAB.state);
await page.waitForTimeout(500);
const after = await page.evaluate(() => HUMANS_LAB.state);
report.pauseStable =
  before.time === after.time &&
  JSON.stringify(before.feet) === JSON.stringify(after.feet);
report.budget = [];
await page.evaluate(() => {
  HUMANS_LAB.setPaused(false);
  HUMANS_LAB.setActivity("helm");
  HUMANS_LAB.setMode("rough");
});
for (const enabled of [false, true]) {
  await page.evaluate((v) => HUMANS_LAB.setCharacterEnabled(v), enabled);
  const samples = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const a = [],
          start = performance.now();
        function tick() {
          a.push({ ...HUMANS_LAB.state });
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else resolve(a);
        }
        requestAnimationFrame(tick);
      }),
  );
  const percentile = (k) =>
    samples.map((x) => x[k]).sort((a, b) => a - b)[
      Math.floor(samples.length * 0.95)
    ];
  report.budget.push({
    characterEnabled: enabled,
    updateP95Ms: percentile("updateMs"),
    renderSubmitP95Ms: percentile("renderSubmitMs"),
    drawCalls: samples.at(-1).drawCalls,
    triangles: samples.at(-1).triangles,
  });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1000);
await page.screenshot({ path: "evidence/phone-helm.png" });
report.phone = {
  viewport: "390x844",
  errors: [...errors],
  state: await page.evaluate(() => HUMANS_LAB.state),
};
const video = page.video();
await context.close();
const recorded = await video.path();
const name = process.env.WALK_ONLY ? "walk-motion.webm" : "full-motion.webm";
fs.copyFileSync(recorded, "evidence/" + name);
report.video = name;
await browser.close();
report.passed =
  errors.length === 0 &&
  report.pauseStable &&
  report.invalidPosePreservesRig &&
  report.scenarios.every(
    (x) =>
      x.motionChanged &&
      x.simulatedSeconds > 5 &&
      x.maxContactErrorM < 0.005 &&
      x.soleY.min >= -0.002 &&
      x.soleY.min < 0.02,
  );
fs.writeFileSync("evidence/browser.json", JSON.stringify(report, null, 2));
assert.equal(errors.length, 0);
assert.ok(report.pauseStable);
assert.ok(report.invalidPosePreservesRig);
assert.ok(
  report.scenarios.every((x) => x.motionChanged && x.simulatedSeconds > 5),
);
assert.ok(
  report.scenarios.every((x) => x.maxContactErrorM < 0.005),
  "Contact residual exceeds 5 mm",
);

assert.ok(
  report.scenarios.every((x) => x.soleY.min >= -0.002 && x.soleY.min < 0.02),
  "Sampled shoe sole outside contact tolerance",
);
