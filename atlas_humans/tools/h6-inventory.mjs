import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const inventory = await page.evaluate(() => {
  const { T } = H4;
  H4.boat.updateWorldMatrix(true, true);
  const inv = H4.boat.matrixWorld.clone().invert(),
    region = new T.Box3(
      new T.Vector3(-2.1, 0.1, -0.35),
      new T.Vector3(-0.6, 2.6, 0.8),
    ),
    out = [];
  H4.bay.scene.traverse((o) => {
    if (!o.isMesh) return;
    const matrix = inv.clone().multiply(o.matrixWorld);
    o.geometry.computeBoundingBox();
    const box = o.geometry.boundingBox.clone().applyMatrix4(matrix);
    if (box.intersectsBox(region))
      out.push({
        name: o.name,
        triangles:
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3,
        min: box.min.toArray(),
        max: box.max.toArray(),
        sourceLocalToVessel: matrix.toArray(),
      });
  });
  return out;
});
fs.writeFileSync(
  "evidence/h6/inventory.json",
  JSON.stringify(inventory, null, 2),
);
console.log(inventory);
await browser.close();
