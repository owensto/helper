import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => console.log(m.text()));
page.on("pageerror", (e) => console.log("ERROR", e.message));
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const r = await page.evaluate(() => {
  const trials = [],
    debug = [];
  for (const x of [0, 0.04, 0.08, 0.1])
    for (const pitch of [0, 0.4, 0.6, 0.8, 1, 1.1, 1.2]) {
      const pose = {
        mode: "helm",
        time: 0,
        seat: [-0.06 + x, 0.1175, 0],
        feet: [
          [0.28, -0.6, -0.16],
          [0.28, -0.6, 0.16],
        ],
        hands: [
          [0.435, 0.007, -0.102],
          [0.435, 0.007, 0.102],
        ],
        lean: [0, 0],
        breath: 0,
        torsoPitch: pitch,
      };
      let result;
      for (let i = 0; i < 4; i++) {
        result = H4.update(pose);
        const pelvis = H4.vertices("Pelvis");
        if (x === 0.1 && pitch === 0.8)
          debug.push({
            i,
            sy: pose.seat[1],
            min: Math.min(...pelvis.map((v) => v.p[1])),
          });
        pose.seat[1] += 1.049440052 - Math.min(...pelvis.map((v) => v.p[1]));
      }
      result = H4.update(pose);
      const pelvis = H4.vertices("Pelvis");
      trials.push({
        x,
        pitch,
        pose,
        result,
        pelvisMin: Math.min(...pelvis.map((v) => v.p[1])),
        feetMin: Math.min(...H4.vertices("Foot|Toe").map((v) => v.p[1])),
      });
    }
  console.log(JSON.stringify(debug));
  trials.sort((a, b) => a.result.maxError - b.result.maxError);
  H4.update(trials[0].pose);
  return trials;
});
fs.writeFileSync("evidence/h4/fit.json", JSON.stringify(r, null, 2));
await page.screenshot({ path: "evidence/h4/fit.png" });
await browser.close();
console.log(JSON.stringify(r.slice(0, 5), null, 2));
