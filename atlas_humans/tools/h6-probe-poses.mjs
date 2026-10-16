import { chromium } from "@playwright/test";
import fs from "node:fs";
import { gzipSync } from "node:zlib";
const frame = JSON.parse(fs.readFileSync("evidence/h6/motion.json")).frames[0];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const data = await page.evaluate(async (frame) => {
  const { T } = H4,
    profile = await fetch("../profiles/bay12/profile.json").then((r) =>
      r.json(),
    );
  H4.boat.rotation.set(0, 0, 0.06, "YXZ");
  const root = H4.rig.group.position,
    frames = Object.fromEntries(
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
        .multiply(new T.Quaternion(...o.orientationContactXYZW))
        .toArray();
  }
  const base = {
      mode: "helm",
      time: 0,
      seat: points.seat,
      feet: [points.leftFoot, points.rightFoot],
      hands: frame.targets.map((p) => new T.Vector3(...p).sub(root).toArray()),
      handOrientations: frame.contacts.map((c) => c.quaternion),
      handGrip: frame.contacts.map((c) => c.grip),
      footOrientations: [quats.leftFoot, quats.rightFoot],
      torsoPitch: profile.torsoPitchRad,
      lean: [-0.06 * 0.15, 0],
      breath: 0,
    },
    captures = [],
    bodyTopology = [];
  H4.rig.group.traverse((o) => {
    if (o.isSkinnedMesh) bodyTopology.push(Array.from(o.geometry.index.array));
  });
  const patch = H4.contacts.contacts.find((c) => c.id === "seat").finitePatch;
  for (const shift of [
    [0, 0, 0],
    ...[0.06, 0.1, 0.14].flatMap((y) => [0, 0.04].map((x) => [x, y, 0])),
  ]) {
    const pose = structuredClone(base);
    pose.seat = pose.seat.map((x, i) => x + shift[i]);
    const result = H4.update(pose),
      skin = H4.vertices(""),
      seatSkin = H4.vertices("Pelvis|Thigh")
        .map((v) => ({
          ...v,
          local: new T.Vector3(...v.p).applyMatrix4(
            frames.seat.clone().invert(),
          ),
        }))
        .filter(
          (v) =>
            Math.abs(v.local.x) <= patch.halfExtentsM[0] &&
            Math.abs(v.local.z) <= patch.halfExtentsM[1] &&
            v.local.y > -0.05,
        ),
      support = seatSkin.filter(
        (v) => v.local.y >= -0.003 && v.local.y <= 0.005,
      ),
      foot = H4.vertices("Foot|Toe");
    const metrics = {
      maxJointErrorM: result.maxError,
      seatWitnessCount: support.length,
      minSeatPlaneGapM: Math.min(...seatSkin.map((v) => v.local.y)),
      seatWitnesses: support.map((v) => ({
        mesh: v.mesh,
        index: v.index,
        p: v.p,
        gapM: v.local.y,
      })),
      minSoleY: Math.min(...foot.map((v) => v.p[1])),
    };
    captures.push({
      time: 0,
      frameId: 0,
      variant: { seatShiftM: shift, torsoPitch: pose.torsoPitch },
      metrics,
      body: skin.map((v) => ({ mesh: v.mesh, index: v.index, p: v.p })),
      sourceMatrices: Object.fromEntries(
        H4.allNodes.map((o) => {
          const node = H4.bay.scene.getObjectByName(o.name);
          return [
            o.name,
            H4.boat.matrixWorld
              .clone()
              .invert()
              .multiply(node.matrixWorld)
              .toArray(),
          ];
        }),
      ),
    });
  }
  return { captures, bodyTopology };
}, frame);
fs.writeFileSync(
  "evidence/h6/pose-probes.json.gz",
  gzipSync(JSON.stringify(data)),
);
console.log(
  data.captures.map((c) => ({ variant: c.variant, metrics: c.metrics })),
);
await browser.close();
