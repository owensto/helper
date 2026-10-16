import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: "evidence/video", size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGEERROR", e.message);
});
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const report = await page.evaluate(
  async ({ fullWheel }) => {
    const { T } = H4,
      profile = await fetch("../profiles/bay12/profile.json").then((r) =>
        r.json(),
      );
    const wheel = H4.bay.scene.getObjectByName("PLAY_STEERING"),
      root = H4.rig.group.position,
      maps = Object.fromEntries(H4.contacts.contacts.map((c) => [c.id, c]));
    function pose(time) {
      const frames = Object.fromEntries(
          H4.contactFrames().map((c) => [
            c.id,
            new T.Matrix4().fromArray(c.matrix),
          ]),
        ),
        points = {},
        quats = {};
      for (const [id, o] of Object.entries(profile.offsets)) {
        points[id] = new T.Vector3(...o.positionContactM)
          .applyMatrix4(frames[id])
          .sub(root)
          .toArray();
        if (o.orientationContactXYZW)
          quats[id] = new T.Quaternion()
            .setFromRotationMatrix(frames[id])
            .multiply(new T.Quaternion().fromArray(o.orientationContactXYZW))
            .toArray();
      }
      return {
        frames,
        p: {
          mode: "helm",
          time,
          seat: points.seat,
          feet: [points.leftFoot, points.rightFoot],
          hands: [points.leftHand, points.rightHand],
          handOrientations: [quats.leftHand, quats.rightHand],
          footOrientations: [quats.leftFoot, quats.rightFoot],
          torsoPitch: profile.torsoPitchRad,
          lean: [-H4.boat.rotation.z * 0.15, -H4.boat.rotation.x * 0.15],
          breath: Math.sin(time * 1.7) * 0.003,
        },
      };
    }
    const base = pose(0);
    H4.update(base.p);
    const sole = H4.vertices("Foot|Toe")
      .filter((p) => p.p[1] < 0.366)
      .map((p) => ({
        mesh: p.mesh,
        index: p.index,
        id: p.p[2] < 0.18 ? "leftFoot" : "rightFoot",
      }));
    const counters = [];
    async function run(name, wheelAmplitude, rough) {
      return await new Promise((resolve, reject) => {
        const samples = [];
        let start = null;
        function tick(now) {
          try {
            if (start === null) start = now;
            const elapsed = (now - start) / 1000;
            const time = elapsed;
            H4.boat.rotation.set(
              rough ? 0.08 * Math.sin(time * 1.6) : 0,
              -0.2 * time,
              rough ? 0.06 * Math.cos(time * 1.3) : 0,
              "YXZ",
            );
            H4.boat.position.set(
              Math.sin(time * 0.4),
              rough ? 0.12 * Math.sin(time) : 0,
              0,
            );
            wheel.rotation.x = wheelAmplitude * Math.sin(time * 1.2);
            const focus = new T.Vector3(-1.4, 1.15, 0.18).applyMatrix4(
              H4.boat.matrixWorld,
            );
            H4.controls.target.copy(focus);
            H4.camera.position.copy(focus).add(new T.Vector3(1.8, 1.2, 3.1));
            H4.controls.update();
            const t = performance.now(),
              { frames, p } = pose(time),
              result = H4.update(p),
              updateMs = performance.now() - t;
            const all = H4.vertices("Pelvis|Thigh|Hand|Foot|Toe"),
              byId = new Map(all.map((v) => [v.mesh + ":" + v.index, v]));
            const metrics = {};
            const ray = new T.Raycaster();
            function sourceDistance(id, pointVessel) {
              const normal = new T.Vector3(0, 1, 0)
                .transformDirection(frames[id])
                .transformDirection(H4.boat.matrixWorld);
              const point = new T.Vector3(...pointVessel).applyMatrix4(
                H4.boat.matrixWorld,
              );
              ray.set(
                point.clone().addScaledVector(normal, 0.05),
                normal.clone().negate(),
              );
              const node = H4.bay.scene.getObjectByName(
                  maps[id].source.runtimeName,
                ),
                hits = ray.intersectObject(node, true);
              const hit = hits.find((h) => h.distance <= 0.1);
              return hit ? hit.distance - 0.05 : null;
            }

            for (const [id, probe] of Object.entries(profile.skinProbes)) {
              const point = byId.get(probe.mesh + ":" + probe.index),
                local = new T.Vector3(...point.p).applyMatrix4(
                  frames[id].clone().invert(),
                );
              const patch = maps[id].finitePatch;
              metrics[id] = {
                sourceDistanceM: sourceDistance(id, point.p),
                normalM: local.y,
                edgeMarginM: Math.min(
                  patch.halfExtentsM[0] - Math.abs(local.x),
                  patch.halfExtentsM[1] - Math.abs(local.z),
                ),
              };
            }
            for (const id of ["leftFoot", "rightFoot"]) {
              const points = sole
                .filter((v) => v.id === id)
                .map((v) =>
                  new T.Vector3(
                    ...byId.get(v.mesh + ":" + v.index).p,
                  ).applyMatrix4(frames[id].clone().invert()),
                );
              const patch = maps[id].finitePatch;
              metrics[id] = {
                sourceDistancesM: sole
                  .filter((v) => v.id === id)
                  .map((v) =>
                    sourceDistance(id, byId.get(v.mesh + ":" + v.index).p),
                  ),
                normalM: Math.min(...points.map((p) => p.y)),
                edgeMarginM: Math.min(
                  ...points.map((p) =>
                    Math.min(
                      patch.halfExtentsM[0] - Math.abs(p.x),
                      patch.halfExtentsM[1] - Math.abs(p.z),
                    ),
                  ),
                ),
              };
            }
            samples.push({
              time,
              updateMs,
              jointErrorM: result.maxError,
              wheel: wheel.rotation.x,
              metrics,
            });
            if (elapsed < (fullWheel ? 6 : 15)) requestAnimationFrame(tick);
            else resolve({ name, samples });
          } catch (e) {
            reject(e);
          }
        }
        requestAnimationFrame(tick);
      });
    }
    for (const args of fullWheel
      ? [["full-wheel", 3.3, true]]
      : [
          ["calm", 0, false],
          ["rough-limited-wheel", 0.1, true],
        ])
      counters.push(await run(...args));
    return {
      profileRevision: profile.revision,
      scope: "normal RAF, exact source geometry, authored motion only",
      counters,
    };
  },
  { fullWheel: !!process.env.H4_FULL_WHEEL },
);
const outputName = process.env.H4_FULL_WHEEL ? "full-wheel" : "motion";
report.errors = errors;
fs.writeFileSync(`evidence/h4/${outputName}.json`, JSON.stringify(report));
await page.evaluate(() => {
  H4.boat.rotation.set(0, 0, 0);
  H4.boat.position.set(0, 0, 0);
  H4.controls.update();
});
await page.screenshot({ path: `evidence/h4/${outputName}-end.png` });
const video = page.video();
await context.close();
fs.copyFileSync(await video.path(), `evidence/h4/${outputName}.webm`);
await browser.close();
for (const c of report.counters) {
  const result = {
    name: c.name,
    frames: c.samples.length,
    maxJoint: Math.max(...c.samples.map((s) => s.jointErrorM)),
    contacts: {},
  };
  for (const id of ["seat", "leftHand", "rightHand", "leftFoot", "rightFoot"])
    result.contacts[id] = {
      minNormal: Math.min(...c.samples.map((s) => s.metrics[id].normalM)),
      maxNormal: Math.max(...c.samples.map((s) => s.metrics[id].normalM)),
      minEdgeMargin: Math.min(
        ...c.samples.map((s) => s.metrics[id].edgeMarginM),
      ),
    };
  console.log(JSON.stringify(result, null, 2));
}
