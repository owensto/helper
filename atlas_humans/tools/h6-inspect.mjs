import { chromium } from "@playwright/test";
import fs from "node:fs";
const baseline = JSON.parse(fs.readFileSync("evidence/h6/baseline.json")),
  frame = JSON.parse(fs.readFileSync("evidence/h6/motion.json")).frames[0];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/oven/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:8934/tools/calibrate.html");
await page.waitForFunction(() => window.H4);
const result = await page.evaluate(
  async ({ rows, frame }) => {
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
    const pose = {
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
    };
    H4.update(pose);
    const vertices = H4.vertices(""),
      meshes = [];
    H4.rig.group.traverse((o) => {
      if (o.isSkinnedMesh) meshes.push(o);
    });
    const witnesses = rows
      .filter((r) => r.maxPenetrationM > 0.003)
      .map((row) => {
        const w = row.inside[0],
          mesh = meshes[w.mesh],
          a = mesh.geometry.attributes,
          actual = vertices.find(
            (v) => v.mesh === w.mesh && v.index === w.index,
          ),
          weights = Array.from({ length: 4 }, (_, i) => ({
            bone: mesh.skeleton.bones[a.skinIndex.getComponent(w.index, i)]
              .name,
            weight: a.skinWeight.getComponent(w.index, i),
          })),
          source = H4.bay.scene.getObjectByName(row.name),
          world = new T.Vector3(...actual.p).applyMatrix4(H4.boat.matrixWorld),
          counts = [
            [1, 0.371, 0.529],
            [0.217, 1, 0.413],
            [0.317, 0.193, 1],
          ].map((d) => {
            const direction = new T.Vector3(...d)
                .normalize()
                .transformDirection(H4.boat.matrixWorld),
              hits = new T.Raycaster(world, direction)
                .intersectObject(source, false)
                .map((h) => h.distance)
                .filter((d) => d > 1e-8)
                .sort((a, b) => a - b);
            return hits.filter((d, i) => i === 0 || d - hits[i - 1] > 1e-7)
              .length;
          });
        const localPoint = source.worldToLocal(world.clone()),
          g = source.geometry;
        let independentClosestM = Infinity;
        for (let i = 0; i < g.index.count; i += 3) {
          const tri = new T.Triangle(
            ...[0, 1, 2].map((j) =>
              new T.Vector3().fromBufferAttribute(
                g.attributes.position,
                g.index.getX(i + j),
              ),
            ),
          );
          independentClosestM = Math.min(
            independentClosestM,
            tri
              .closestPointToPoint(localPoint, new T.Vector3())
              .distanceTo(localPoint),
          );
        }
        return {
          independentClosestM,
          name: row.name,
          mesh: w.mesh,
          index: w.index,
          position: actual.p,
          recordedPosition: w.p,
          reconstructionErrorM: new T.Vector3(...actual.p).distanceTo(
            new T.Vector3(...w.p),
          ),
          depthM: row.maxPenetrationM,
          weights,
          independentThreeRayCounts: counts,
        };
      });
    const focus = new T.Vector3(-1.5, 1.1, 0.22).applyMatrix4(
      H4.boat.matrixWorld,
    );
    H4.controls.target.copy(focus);
    H4.camera.position.copy(focus).add(new T.Vector3(0.9, 0.7, 2.6));
    H4.controls.update();
    for (const w of witnesses) {
      const node = H4.bay.scene.getObjectByName(w.name);
      node.material = node.material.clone();
      node.material.color.set("#f15643");
      node.material.transparent = true;
      node.material.opacity = 0.6;
      const mark = new T.Mesh(
        new T.SphereGeometry(0.012, 12, 8),
        new T.MeshBasicMaterial({ color: "#00e5ff", depthTest: false }),
      );
      mark.position.fromArray(w.position);
      mark.renderOrder = 100;
      H4.boat.add(mark);
    }
    document.getElementById("label").textContent =
      "H6 reproduced baseline FAIL • cyan: actual skinned penetration witnesses; red: intersected original source meshes. No pose or geometry correction.";
    window.H6 = { pose, witnesses };
    return witnesses;
  },
  { rows: baseline.results[0].rows, frame },
);
await page.screenshot({ path: "evidence/h6/baseline-witnesses.png" });
fs.writeFileSync(
  "evidence/h6/independent-witnesses.json",
  JSON.stringify(result, null, 2),
);
console.log(result);
await browser.close();
