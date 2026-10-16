import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CharacterContact } from "./contact.mjs";
import { DeckLocomotion } from "./locomotion.mjs";
import { createHelmRig } from "./rig.mjs";
const scene = new T.Scene();
scene.background = new T.Color("#183d4b");
scene.fog = new T.Fog("#183d4b", 14, 55);
const camera = new T.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 100);
camera.position.set(4, 2.8, 4);
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();
scene.add(new T.HemisphereLight("#e7f2ff", "#3e5551", 2.5));
const sun = new T.DirectionalLight("#ffe6c2", 3);
sun.position.set(4, 8, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const deck = new T.Group();
scene.add(deck);
const material = (c) =>
  new T.MeshStandardMaterial({ color: c, roughness: 0.7 });
function box(size, pos, color) {
  const m = new T.Mesh(new T.BoxGeometry(...size), material(color));
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  deck.add(m);
  return m;
}
box([4, 0.15, 2.2], [0, -0.075, 0], "#d4d5c4");
box([0.48, 0.12, 0.52], [0, 0.49, 0], "#637d80");
box([0.13, 0.47, 0.52], [-0.23, 0.75, 0], "#637d80");
box([0.1, 0.48, 0.1], [0, 0.24, 0], "#344c54");
const wheel = new T.Mesh(
  new T.TorusGeometry(0.22, 0.018, 12, 48),
  material("#182e35"),
);
wheel.rotation.y = Math.PI / 2;
wheel.position.set(0.43, 1.05, 0);
deck.add(wheel);
box([0.13, 0.8, 0.1], [0.65, 0.4, 0], "#576c70");
const sea = new T.Mesh(new T.PlaneGeometry(80, 80), material("#24566a"));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.4;
scene.add(sea);
const attachment = {
  vesselId: "contact-fixture",
  revision: "fixture-v1",
  seat: [0, 0.65, 0],
  leftFoot: [0.42, 0.11, -0.13],
  rightFoot: [0.42, 0.11, 0.13],
  leftHand: [0.34, 1.05, -0.22],
  rightHand: [0.34, 1.05, 0.22],
};
const contact = new CharacterContact(attachment);
const patch = {
  vesselId: "contact-fixture",
  revision: "fixture-v1",
  bounds: [-2, 2, -1.1, 1.1],
  deckY: 0,
  obstacles: [{ minX: -0.35, maxX: 0.75, minZ: -0.3, maxZ: 0.3 }],
};
let locomotion = new DeckLocomotion(patch),
  activity = "helm";
let mode = "calm",
  paused = false,
  time = 0,
  last = performance.now(),
  rig,
  stats = {},
  frames = [],
  characterEnabled = true;
for (const name of ["helm", "idle", "walk"])
  document.getElementById(name).onclick = () => {
    activity = name;
    if (name === "walk") locomotion = new DeckLocomotion(patch);
  };
for (const name of ["calm", "rough", "maneuver"])
  document.getElementById(name).onclick = () => {
    mode = name;
  };
document.getElementById("pause").onclick = () => {
  paused = !paused;
};
try {
  rig = createHelmRig(
    await new GLTFLoader().loadAsync("./assets/RocketboxCaptain.glb"),
    await (await fetch("./assets/animations.json")).json(),
  );
  deck.add(rig.group);
} catch (e) {
  document.getElementById("error").textContent = e.message;
  throw e;
}
window.HUMANS_LAB = {
  get state() {
    return { ...stats, time, mode, paused, frames: frames.length };
  },
  setMode(value) {
    mode = value;
  },
  setActivity(value) {
    activity = value;
    locomotion = new DeckLocomotion(patch);
  },
  setPaused(value) {
    paused = value;
  },
  setCharacterEnabled(value) {
    characterEnabled = value;
    rig.group.visible = value;
  },
  rig,
  deck,
  scene,
  renderer,
  camera,
  frames,
};
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) time += dt;
  const amp = mode === "calm" ? 0.015 : mode === "rough" ? 0.16 : 0.07,
    roll = Math.sin(time * 1.4) * amp,
    pitch = Math.sin(time * 0.9) * amp * 0.6;
  deck.rotation.set(
    roll,
    -Math.sin(time * 0.2) * (mode === "maneuver" ? 0.4 : 0.06),
    pitch,
  );
  deck.position.y = Math.sin(time * 1.2) * amp * 0.6;
  const acceleration =
      mode === "maneuver"
        ? [Math.sin(time * 0.7) * 3, 0, Math.cos(time * 0.5) * 2]
        : [0, 0, 0],
    start = performance.now(),
    balance = contact.update({
      time,
      dt: paused ? 0 : dt,
      roll,
      pitch,
      acceleration,
    }),
    pose =
      activity === "helm"
        ? balance
        : {
            ...locomotion.update({
              time,
              dt: paused ? 0 : dt,
              forward: activity === "walk" ? 1 : 0,
            }),
            lean: balance.lean,
          },
    result = characterEnabled ? rig.update(pose) : { maxError: 0, errors: [] },
    updateMs = performance.now() - start;
  const renderStart = performance.now();
  renderer.render(scene, camera);
  const renderSubmitMs = performance.now() - renderStart;
  frames.push({ dt: dt * 1000, updateMs, renderSubmitMs });
  if (frames.length > 600) frames.shift();
  stats = {
    contactErrorM: result.maxError,
    errors: result.errors,
    updateMs,
    renderSubmitMs,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    lean: pose.lean,
    activity: pose.mode,
    localPosition: pose.seat,
    feet: pose.feet,
  };
  document.getElementById("metrics").textContent =
    `${mode.toUpperCase()} · ${paused ? "PAUSED" : "LIVE"}\nJoint target error ${(result.maxError * 1000).toFixed(2)} mm\nCharacter update ${updateMs.toFixed(2)} ms · ${stats.triangles.toLocaleString()} triangles`;
}
requestAnimationFrame(frame);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
