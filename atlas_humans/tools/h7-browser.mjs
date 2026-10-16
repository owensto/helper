import { chromium } from "@playwright/test";
import fs from "node:fs";
import { createHash } from "node:crypto";
const hash = (p) =>
  createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if (
  hash("node_modules/.cache/h7/hand-controller.mjs") !==
  "0127ae03c524de171b453fdcc11bc0bb59b0205dab6003c0123018b23f8bf902"
)
  throw new Error("H7_BASELINE_CHANGED");
if (
  hash("profiles/bay12/profile.json") !==
  "2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902"
)
  throw new Error("H7_PROFILE_CHANGED");
const pins = JSON.parse(fs.readFileSync("profiles/bay12/profile.json"));
for (const [p, k] of [
  ["assets/BayCalibration.glb", "modelSHA256"],
  ["assets/RocketboxCaptain.glb", "rigSHA256"],
  ["assets/animations.json", "animationSHA256"],
])
  if (hash(p) !== pins[k]) throw new Error("H7_ASSET_CHANGED");

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
  console.log(e.message);
});
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const report = await page.evaluate(async () => {
  const { WheelHandController } = await import("../src/hand-controller.mjs"),
    { createWheelRimSampler } = await import("../src/wheel-rim.mjs"),
    { T } = H4;
  const { WheelHandController: BaselineController } = await import(
    "../node_modules/.cache/h7/hand-controller.mjs"
  );
  const profile = await fetch("../profiles/bay12/profile.json").then((r) =>
      r.json(),
    ),
    wheel = H4.bay.scene.getObjectByName("PLAY_STEERING"),
    mesh = H4.bay.scene.getObjectByName("PLAY_STEERING_EX_Console__black");
  const sampler = createWheelRimSampler(mesh),
    root = H4.rig.group.position;
  const controller = new WheelHandController({
    offsets: [profile.offsets.leftHand, profile.offsets.rightHand],
    preferred: [
      [-1.16, 1.1, 0.1],
      [-1.16, 1.1, 0.26],
    ],
    duration: 0.32,
  });
  const baselineController = new BaselineController({
    offsets: [profile.offsets.leftHand, profile.offsets.rightHand],
    preferred: [
      [-1.16, 1.1, 0.1],
      [-1.16, 1.1, 0.26],
    ],
    duration: 0.32,
  });
  const expectedRegion = await fetch(
    "../profiles/bay12-h5/rim-region.json",
  ).then((r) => r.json());
  if (
    JSON.stringify(sampler.triangles) !==
    JSON.stringify(expectedRegion.triangles)
  )
    throw new Error("RIM_REGION_MISMATCH");
  let base, sole;
  const maps = Object.fromEntries(H4.contacts.contacts.map((c) => [c.id, c]));
  function supportMetrics(frames) {
    const all = H4.vertices("Pelvis|Thigh|Foot|Toe"),
      byId = new Map(all.map((v) => [v.mesh + ":" + v.index, v]));
    if (!sole)
      sole = H4.vertices("Foot|Toe")
        .filter((v) => v.p[1] < 0.366)
        .map((v) => ({
          mesh: v.mesh,
          index: v.index,
          id: v.p[2] < 0.18 ? "leftFoot" : "rightFoot",
        }));
    const metrics = {};
    for (const id of ["seat", "leftFoot", "rightFoot"]) {
      const probes =
          id === "seat"
            ? [profile.skinProbes.seat]
            : sole.filter((v) => v.id === id),
        normal = new T.Vector3(0, 1, 0)
          .transformDirection(frames[id])
          .transformDirection(H4.boat.matrixWorld),
        patch = maps[id].finitePatch;
      const samples = probes.map((probe) => {
        const point = byId.get(probe.mesh + ":" + probe.index).p,
          local = new T.Vector3(...point).applyMatrix4(
            frames[id].clone().invert(),
          ),
          world = new T.Vector3(...point).applyMatrix4(H4.boat.matrixWorld),
          ray = new T.Raycaster(
            world.addScaledVector(normal, 0.05),
            normal.clone().negate(),
          ),
          hit = ray
            .intersectObject(
              H4.bay.scene.getObjectByName(maps[id].source.runtimeName),
              true,
            )
            .find((h) => h.distance <= 0.1);
        return {
          gap: hit ? hit.distance - 0.05 : null,
          normal: local.y,
          margin: Math.min(
            patch.halfExtentsM[0] - Math.abs(local.x),
            patch.halfExtentsM[1] - Math.abs(local.z),
          ),
        };
      });
      metrics[id] = {
        count: samples.length,
        missing: samples.filter((s) => s.gap === null).length,
        minGap: Math.min(...samples.map((s) => s.gap)),
        maxGap: Math.max(...samples.map((s) => s.gap)),
        minNormal: Math.min(...samples.map((s) => s.normal)),
        minMargin: Math.min(...samples.map((s) => s.margin)),
      };
    }
    return metrics;
  }

  function basePose(time) {
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
          .multiply(new T.Quaternion(...o.orientationContactXYZW))
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
  const frames = [],
    changes = [0, 0];
  let lastInput;
  let previous = null,
    start = null,
    last = null,
    serial = 0;
  await new Promise((resolve, reject) => {
    function tick(now) {
      try {
        if (start === null) start = now;
        const time = (now - start) / 1000,
          dt = last === null ? 0 : (now - last) / 1000;
        last = now;
        H4.boat.rotation.set(
          0.08 * Math.sin(time * 1.6),
          -0.15 * time,
          0.06 * Math.cos(time * 1.3),
          "YXZ",
        );
        H4.boat.position.set(Math.sin(time * 0.4), 0.12 * Math.sin(time), 0);
        wheel.rotation.x = 3.3 * Math.sin(time * 1.2);
        H4.boat.updateWorldMatrix(true, true);
        const focus = new T.Vector3(-1.4, 1.15, 0.18).applyMatrix4(
          H4.boat.matrixWorld,
        );
        H4.controls.target.copy(focus);
        H4.camera.position
          .copy(focus)
          .add(
            new T.Vector3(1.8, 1.2, 3.1).applyQuaternion(H4.boat.quaternion),
          );
        H4.controls.update();
        const fullStart = performance.now();
        const { frames: contactFrames, p } = basePose(time);
        if (base) {
          p.hands = base.hands;
          p.handOrientations = base.handOrientations;
        }
        H4.update(p);
        const shoulders = H4.rig.arms.map((a) =>
            H4.boat
              .worldToLocal(a[0].getWorldPosition(new T.Vector3()))
              .toArray(),
          ),
          reaches = H4.rig.arms.map((a) => {
            const q = a.map((b) => b.getWorldPosition(new T.Vector3()));
            return q[0].distanceTo(q[1]) + q[1].distanceTo(q[2]);
          });
        const matrix = H4.boat.matrixWorld
            .clone()
            .invert()
            .multiply(mesh.matrixWorld)
            .toArray(),
          candidates = sampler.all(matrix);
        const input = {
          time,
          dt,
          epoch: "h5-authored-motion",
          frameId: serial++,
          shoulders,
          reaches,
          candidates,
          sample: (s) => sampler.sample(s, matrix),
          closest: (p) => sampler.closest(p, matrix),
        };
        lastInput = input;
        const controllerStart = performance.now();
        const state = controller.update(input);
        const controllerCpuMs = performance.now() - controllerStart;
        const baselineState = baselineController.update(input);
        if (JSON.stringify(state) !== JSON.stringify(baselineState))
          throw new Error("VALID_MOTION_CHANGED");
        if (!state.valid) throw new Error(state.reason);
        p.hands = state.hands.map((h) =>
          new T.Vector3(...h.point).sub(root).toArray(),
        );
        p.handOrientations = state.hands.map((h) => h.quaternion);
        p.handGrip = state.hands.map((h) => h.grip);
        base = p;
        const t = performance.now(),
          result = H4.update(p),
          cpu = performance.now() - t;
        const fullCpu = performance.now() - fullStart;
        const support = supportMetrics(contactFrames);
        const palm = H4.vertices("Hand"),
          contacts = state.hands.map((h, i) => {
            const probe = profile.skinProbes[i ? "rightHand" : "leftHand"],
              skin = palm.find(
                (v) => v.mesh === probe.mesh && v.index === probe.index,
              ),
              source = sampler.sample(h.source, matrix),
              difference = new T.Vector3(...skin.p).sub(
                new T.Vector3(...source.point),
              );
            return {
              valid: h.contactValid,
              skinDistanceM: h.contactValid ? difference.length() : null,
              state: h.state,
              phase: h.phase,
              materialLocked: h.materialLocked,
              grip: h.grip,
              quaternion: h.quaternion,
              source: h.source,
            };
          });
        const targets = state.hands.map((h) => h.point),
          jump = previous
            ? Math.max(
                ...targets.map((p, i) =>
                  Math.hypot(...p.map((x, j) => x - previous.targets[i][j])),
                ),
              )
            : 0;
        if (previous)
          contacts.forEach((h, i) => {
            if (h.state !== previous.contacts[i].state) changes[i]++;
          });
        const frame = {
          time,
          dt,
          wheel: wheel.rotation.x,
          cpu,
          fullCpu,
          controllerCpuMs,
          baselineEqual: true,
          support,
          jointErrorM: result.maxError,
          targets,
          jump,
          contacts,
          attached: contacts.filter((h) => h.valid).length,
        };
        document.getElementById("label").textContent =
          `H7 validation regression • actual Bay geometry + licensed Rocketbox rig. Authored RAF fixture; no CORE activation. t=${time.toFixed(2)}s wheel=${wheel.rotation.x.toFixed(2)}rad. Hands: ${contacts.map((h) => h.state).join(" / ")}. Material lock: false.`;
        frames.push(frame);
        previous = frame;
        if (time < 15) requestAnimationFrame(tick);
        else resolve();
      } catch (e) {
        reject(e);
      }
    }
    requestAnimationFrame(tick);
  });
  const lifecycle = {};
  const paused = { ...lastInput, dt: 0, frameId: serial++ };
  const a = controller.update(paused),
    b = controller.update({ ...paused, frameId: serial++ });
  lifecycle.pauseStable =
    JSON.stringify(a.hands) === JSON.stringify(b.hands) && a.valid && b.valid;
  const changed = {
    ...paused,
    frameId: serial++,
    sample: (s) => {
      const v = lastInput.sample(s);
      return { ...v, point: [v.point[0] + 0.01, v.point[1], v.point[2]] };
    },
  };
  lifecycle.changedPausedSurface = controller.update(changed).reason;
  lifecycle.reset = controller.update({
    ...lastInput,
    time: 0,
    dt: 0,
    frameId: 0,
    epoch: "h5-reset",
  }).valid;
  lifecycle.ejection = controller.update({ valid: false }).reason;
  lifecycle.cleared = controller.hands.every((h) => h === null);
  lifecycle.reentry = controller.update({
    ...lastInput,
    time: 0,
    dt: 0,
    frameId: 0,
    epoch: "h5-reentry",
  }).valid;
  const regressions = [];
  for (const kind of [
    "nonfinite-point",
    "changed-reach",
    "changed-orientation",
  ]) {
    const probe = new WheelHandController({
      offsets: [profile.offsets.leftHand, profile.offsets.rightHand],
      preferred: [
        [-1.16, 1.1, 0.1],
        [-1.16, 1.1, 0.26],
      ],
    });
    const init = {
      ...lastInput,
      time: 0,
      dt: 0,
      frameId: 0,
      epoch: "h7-" + kind,
    };
    if (!probe.update(init).valid) throw new Error("H7_PROBE_INIT_FAILED");
    const bad = { ...init, frameId: 1 };
    if (kind === "changed-reach") {
      bad.shoulders = init.shoulders.map((p) => [p[0] + 10, p[1], p[2]]);
      bad.reaches = [0.01, 0.01];
    } else
      bad.sample = (s) => {
        const v = init.sample(s);
        if (kind === "nonfinite-point")
          return { ...v, point: [NaN, v.point[1], v.point[2]] };
        return {
          ...v,
          quaternion: new T.Quaternion(...v.quaternion)
            .multiply(
              new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0.4),
            )
            .toArray(),
        };
      };
    let rejected = false,
      reason;
    try {
      const result = probe.update(bad);
      rejected = result.valid === false;
      reason = result.reason;
    } catch (e) {
      rejected = true;
      reason = e.message;
    }
    const remainsBlocked =
        probe.update({ ...init, frameId: 2 }).valid === false,
      recovers =
        probe.update({ ...init, epoch: init.epoch + "-reset" }).valid === true;
    if (!rejected || !remainsBlocked || !recovers)
      throw new Error("H7_PAUSE_REGRESSION_FAILED:" + kind);
    regressions.push({ kind, rejected, reason, remainsBlocked, recovers });
  }
  return {
    regressions,
    baselineSource: "b84a980b0d86f247f216e1489d1dc4636875c884",
    fullBodyAccepted: false,
    lifecycle,
    frames,
    changes,
    triangleCount: sampler.triangles.length,
    triangles: sampler.triangles,
    profileRevision: profile.revision,
  };
});
report.errors = errors;
fs.mkdirSync("evidence/h7", { recursive: true });
fs.writeFileSync("evidence/h7/motion.json", JSON.stringify(report));
await page.screenshot({ path: "evidence/h7/motion.png" });
const video = page.video();
await context.close();
fs.copyFileSync(await video.path(), "evidence/h7/motion.webm");
await browser.close();
console.log({
  frames: report.frames.length,
  changes: report.changes,
  triangles: report.triangleCount,
  maxJoint: Math.max(...report.frames.map((f) => f.jointErrorM)),
  maxJump: Math.max(...report.frames.map((f) => f.jump)),
  zeroAttached: report.frames.filter((f) => f.attached === 0).length,
  maxContact: Math.max(
    ...report.frames.flatMap((f) =>
      f.contacts.filter((c) => c.valid).map((c) => c.skinDistanceM),
    ),
  ),
});
