import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("ERROR", e.message));
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const r = await page.evaluate(() => ({
  pose: H4.pose,
  result: H4.update(),
  frames: H4.contactFrames(),
  feet: H4.vertices("Foot|Toe"),
  seat: H4.vertices("Pelvis|Thigh"),
  hands: H4.vertices("Hand"),
  pelvis: H4.vertices("Pelvis"),
  bones: [H4.rig.hips, ...H4.rig.arms.flat(), ...H4.rig.legs.flat()].map(
    (o) => ({
      name: o.name,
      p: H4.boat
        .worldToLocal(o.getWorldPosition(H4.camera.position.clone()))
        .toArray(),
      q: o.quaternion.toArray(),
    }),
  ),
}));
fs.writeFileSync("evidence/h4/probe.json", JSON.stringify(r, null, 2));
await page.screenshot({ path: "evidence/h4/initial.png" });
await browser.close();
console.log(
  JSON.stringify({
    result: r.result,
    frames: r.frames,
    counts: [r.feet.length, r.seat.length, r.hands.length],
  }),
);
