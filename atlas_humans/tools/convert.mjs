import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log(e.message));
await page.goto("http://127.0.0.1:8934/tools/convert.html");
await page.waitForFunction(() => window.ready);
console.log(
  await page.evaluate(() => ({
    meshes: info,
    bones: (() => {
      const b = [];
      model.traverse((o) => {
        if (o.isBone) b.push(o.name);
      });
      return b;
    })(),
    bounds: new T.Box3().setFromObject(model),
  })),
);
await page.waitForTimeout(2000);
const bytes = await page.evaluate(() => convert());
fs.writeFileSync("assets/RocketboxCaptain.glb", Buffer.from(bytes));
console.log("Exported", bytes.length);
await browser.close();
