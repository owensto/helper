import { chromium } from "@playwright/test";
import fs from "node:fs";
const b = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  }),
  p = await b.newPage();
p.on("pageerror", (e) => console.log(e.message));
await p.goto("http://127.0.0.1:8934/tools/animations.html");
await p.waitForFunction(() => window.ready);
const result = await p.evaluate(() => results);
fs.writeFileSync(
  "assets/animations.json",
  JSON.stringify(result, (_, v) =>
    typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v,
  ),
);
for (const [key, clips] of Object.entries(result))
  console.log(
    key,
    clips.map((c) => ({
      duration: c.duration,
      tracks: c.tracks.length,
      first: c.tracks
        .slice(0, 3)
        .map((t) => ({ name: t.name, values: t.values.slice(0, 4) })),
    })),
  );
await b.close();
