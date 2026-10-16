import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createHelmRig } from "../src/rig.mjs";
const renderer = new T.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xb8cbd1);
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 1000);
camera.position.set(0.4, 2.4, 3.3);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-1.4, 1.15, 0.18);
controls.update();
scene.add(new T.HemisphereLight(0xffffff, 0x59666e, 2));
const sun = new T.DirectionalLight(0xffffff, 3);
sun.position.set(3, 8, 4);
scene.add(sun);
const loader = new GLTFLoader();
const [bay, gltf, clips, contacts] = await Promise.all([
  loader.loadAsync("../assets/BayCalibration.glb"),
  loader.loadAsync("../assets/RocketboxCaptain.glb"),
  fetch("../assets/animations.json").then((r) => r.json()),
  fetch("../profiles/bay12/contacts.json").then((r) => r.json()),
]);
const boat = new T.Group();
scene.add(boat);
boat.add(bay.scene);
const rig = createHelmRig(gltf, clips, { heightM: 1.93 });
rig.group.position.set(-1.6, 1.06, 0.18);
boat.add(rig.group);
const allNodes = [];
bay.scene.traverse((o) => {
  if (o.isMesh) {
    o.material.side = T.DoubleSide;
    allNodes.push({ name: o.name, position: o.position.toArray() });
  }
});
let pose = {
  mode: "helm",
  time: 0,
  seat: [-0.06, 0.1, 0.085],
  feet: [
    [0.36, -0.6, -0.16],
    [0.36, -0.6, 0.16],
  ],
  hands: [
    [0.435, 0.007, -0.102],
    [0.435, 0.007, 0.102],
  ],
  lean: [0, 0],
  breath: 0,
};
function update(p = pose) {
  pose = p;
  const result = rig.update(p);
  boat.updateWorldMatrix(true, true);
  return result;
}
function vertices(filter = "") {
  rig.group.updateMatrixWorld(true);
  const out = [],
    v = new T.Vector3();
  let meshIndex = 0;
  rig.group.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const a = o.geometry.attributes;
    for (const i of new Set(
      o.geometry.index
        ? o.geometry.index.array
        : Array.from({ length: a.position.count }, (_, i) => i),
    )) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (
          new RegExp(filter).test(
            o.skeleton.bones[a.skinIndex.getComponent(i, j)].name,
          )
        )
          weight += a.skinWeight.getComponent(i, j);
      if (weight < 0.7) continue;
      v.fromBufferAttribute(a.position, i);
      o.applyBoneTransform(i, v);
      o.localToWorld(v);
      boat.worldToLocal(v);
      out.push({ mesh: meshIndex, index: i, p: v.toArray(), weight });
    }
    meshIndex++;
  });
  return out;
}
function contactFrames() {
  boat.updateWorldMatrix(true, true);
  const inv = boat.matrixWorld.clone().invert();
  return contacts.contacts.map((c) => {
    const node = bay.scene.getObjectByName(c.source.runtimeName);
    if (!node) throw new Error(c.source.runtimeName);
    return {
      id: c.id,
      matrix: inv
        .clone()
        .multiply(node.matrixWorld)
        .multiply(new T.Matrix4().fromArray(c.contactToSource))
        .toArray(),
    };
  });
}
update();
window.H4 = {
  T,
  scene,
  camera,
  controls,
  renderer,
  boat,
  bay,
  rig,
  contacts,
  allNodes,
  vertices,
  update,
  contactFrames,
  get pose() {
    return structuredClone(pose);
  },
};
function frame() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
