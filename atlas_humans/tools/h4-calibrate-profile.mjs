import { chromium } from "@playwright/test";
import fs from "node:fs";
import { createHash } from "node:crypto";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const r = await page.evaluate(() => {
  const { T } = H4,
    v = new T.Vector3();
  const pose = {
    mode: "helm",
    time: 0,
    seat: [0.015, 0.1257, 0],
    feet: [
      [0.305, -0.5914, -0.1385],
      [0.305, -0.5914, 0.1385],
    ],
    hands: [
      [0.435, 0.007, -0.102],
      [0.435, 0.007, 0.102],
    ],
    lean: [0, 0],
    breath: 0,
    torsoPitch: 0.8,
  };
  const probes = {},
    frames = Object.fromEntries(
      H4.contactFrames().map((c) => [
        c.id,
        new T.Matrix4().fromArray(c.matrix),
      ]),
    );
  for (let n = 0; n < 6; n++) {
    H4.update(pose);
    const pelvis = H4.vertices("Pelvis");
    pose.seat[1] += 1.049440052 - Math.min(...pelvis.map((v) => v.p[1]));
  }
  probes.seat = { mesh: 0, index: 166, boneFilter: "Pelvis|Thigh" };
  for (let n = 0; n < 6; n++) {
    H4.update(pose);
    const low = H4.vertices("Pelvis|Thigh").find(
      (v) => v.mesh === 0 && v.index === 166,
    );
    pose.seat[1] += 1.048440052 - low.p[1];
  }
  for (let i = 0; i < 2; i++) {
    const id = i ? "rightHand" : "leftHand",
      bone = i ? "R" : "L",
      center = new T.Vector3().setFromMatrixPosition(frames[id]);
    const normal = new T.Vector3(0, 1, 0).transformDirection(frames[id]);
    const target = center.clone().addScaledVector(normal, 0.001);
    H4.update(pose);
    const vertices = H4.vertices(`Bip01_${bone}_Hand`);
    vertices.sort(
      (a, b) =>
        new T.Vector3(...a.p).distanceToSquared(target) -
        new T.Vector3(...b.p).distanceToSquared(target),
    );
    probes[id] = {
      mesh: vertices[0].mesh,
      index: vertices[0].index,
      boneFilter: `Bip01_${bone}_Hand`,
    };
    for (let n = 0; n < 4; n++) {
      H4.update(pose);
      const actual = H4.vertices(`Bip01_${bone}_Hand`).find(
        (p) => p.mesh === probes[id].mesh && p.index === probes[id].index,
      );
      const delta = target.clone().sub(new T.Vector3(...actual.p));
      pose.hands[i] = pose.hands[i].map((x, j) => x + delta.getComponent(j));
    }
  }
  pose.footOrientations = [];
  H4.update({ ...pose, footOrientations: undefined });
  for (let i = 0; i < 2; i++) {
    const points = H4.vertices("Foot|Toe").filter(
      (v) => v.p[1] < 0.366 && v.p[2] < 0.18 === (i === 0),
    );
    const pivot = new T.Vector3(...pose.feet[i]).add(H4.rig.group.position),
      base = H4.rig.legs[i][2].getWorldQuaternion(new T.Quaternion());
    let best = null;
    for (let yaw = -0.2; yaw <= 0.2; yaw += 0.005) {
      const q = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        yaw,
      );
      const rotated = points.map((p) =>
        new T.Vector3(...p.p).sub(pivot).applyQuaternion(q).add(pivot),
      );
      const lo = Math.min(...rotated.map((p) => p.z)),
        hi = Math.max(...rotated.map((p) => p.z));
      if (!best || hi - lo < best.width) best = { yaw, width: hi - lo, lo, hi };
    }
    const q = new T.Quaternion()
      .setFromAxisAngle(new T.Vector3(0, 1, 0), best.yaw)
      .multiply(base);
    pose.footOrientations.push(q.toArray());
    pose.feet[i][2] += (i === 0 ? 0.02 : 0.34) - (best.lo + best.hi) / 2;
  }
  const result = H4.update(pose);
  const offsets = {};
  for (const [id, point] of [
    ["seat", pose.seat],
    ["leftFoot", pose.feet[0]],
    ["rightFoot", pose.feet[1]],
    ["leftHand", pose.hands[0]],
    ["rightHand", pose.hands[1]],
  ]) {
    const vessel = new T.Vector3(...point).add(H4.rig.group.position),
      inverse = frames[id].clone().invert();
    offsets[id] = { positionContactM: vessel.applyMatrix4(inverse).toArray() };
    if (id.includes("Foot"))
      offsets[id].orientationContactXYZW =
        pose.footOrientations[id === "leftFoot" ? 0 : 1];
    if (id.includes("Hand")) {
      const i = id === "leftHand" ? 0 : 1;
      const q = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(1, 0, 0),
        i === 0 ? Math.PI / 2 : -Math.PI / 2,
      );
      const cq = new T.Quaternion().setFromRotationMatrix(frames[id]);
      offsets[id].orientationContactXYZW = cq.invert().multiply(q).toArray();
    }
  }
  const skins = {
    pelvis: H4.vertices("Pelvis"),
    feet: H4.vertices("Foot|Toe"),
    hands: H4.vertices("Hand"),
  };
  const seatNode = H4.bay.scene.getObjectByName("P02_grouped_detail_161_55"),
    box = new T.Box3().setFromObject(seatNode);
  const ray = new T.Raycaster();
  const collisions = [];
  for (const p of H4.vertices("Pelvis|Thigh")) {
    const point = new T.Vector3(...p.p);
    if (!box.containsPoint(point)) continue;
    ray.set(point.clone().setY(box.max.y + 0.1), new T.Vector3(0, -1, 0));
    const hits = ray.intersectObject(seatNode, true);
    if (
      hits.length >= 2 &&
      point.y < hits[0].point.y - 0.003 &&
      point.y > hits.at(-1).point.y + 0.003
    )
      collisions.push({ ...p, depthM: hits[0].point.y - point.y });
  }
  const repeated = [];
  for (let n = 0; n < 12; n++) {
    H4.update(pose);
    repeated.push(H4.vertices("Pelvis|Hand|Foot|Toe"));
  }
  const repeatMax = Math.max(
    ...repeated.flatMap((a) =>
      a.map((p, i) =>
        Math.hypot(...p.p.map((x, j) => x - repeated[0][i].p[j])),
      ),
    ),
  );
  return {
    pose,
    result,
    offsets,
    probes,
    skins,
    seatBounds: { min: box.min.toArray(), max: box.max.toArray() },
    collisions,
    repeatedPoseMaxDeltaM: repeatMax,
  };
});
const hash = (f) =>
  createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const profile = {
  revision: "bay12-rocketbox-calibration/1",
  status: "LIMITED_CONTACT_REVIEW_ONLY_NOT_GAMEPLAY_ACCEPTED",
  productionEnabled: false,
  ownerInputCommit: "9a9c12645a1fe55f077f880c3e3b2403c18c4410",
  physicalContactSHA256: hash("profiles/bay12/contacts.json"),
  modelSHA256:
    "b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82",
  rigSHA256: hash("assets/RocketboxCaptain.glb"),
  animationSHA256: hash("assets/animations.json"),
  stationId: "bay12.starboard-helm",
  heightM: 1.93,
  requiredRoot: {
    position: [-1.6, 1.06, 0.18],
    rotationXYZW: [0, 0, 0, 1],
    scale: [1, 1, 1],
    directBoatParent: true,
  },
  torsoPitchRad: r.pose.torsoPitch,
  offsets: r.offsets,
  skinProbes: r.probes,
  staticCalibration: r.result,
  bodyClearanceAccepted: false,
  bounds: {
    wheelAngleAbsMaxRad: 0.1,
    rollAbsMaxRad: 0.08,
    pitchAbsMaxRad: 0.06,
    rollPitchVisualGain: 0.15,
    measuredAccelerationAvailable: false,
    fullSteeringSupported: false,
    releaseRegripSupported: false,
    jointResidualMaxM: 0.005,
    seatProbeNormalRangeM: [-0.003, 0.005],
    handProbeNormalRangeM: [-0.002, 0.005],
    soleProbeNormalRangeM: [-0.002, 0.008],
    finitePatchOverrunAllowedM: 0,
  },
  requiredBehaviorOutsideBounds:
    "Hide this candidate or use an explicitly selected CORE fallback; never clamp steering or reuse stale contacts.",
};
fs.writeFileSync(
  "profiles/bay12/profile.json",
  JSON.stringify(profile, null, 2) + "\n",
);
fs.writeFileSync("evidence/h4/calibration.json", JSON.stringify(r, null, 2));
await page.screenshot({ path: "evidence/h4/calibrated.png" });
await browser.close();
console.log(
  JSON.stringify(
    {
      result: r.result,
      repeatMax: r.repeatedPoseMaxDeltaM,
      collisions: r.collisions.length,
      maxDepth: Math.max(0, ...r.collisions.map((p) => p.depthM)),
      profileSHA256: hash("profiles/bay12/profile.json"),
      offsets: r.offsets,
    },
    null,
    2,
  ),
);
