import { validateRigPose } from "./pose-contract.mjs";
import * as T from "three";
import { solveTwoBone } from "./ik.mjs";
export function createHelmRig(gltf, animations = {}) {
  const group = new T.Group();
  group.name = "ATLAS_HUMAN_RIG";
  group.add(gltf.scene);
  if (gltf.animations.length) {
    const mixer = new T.AnimationMixer(gltf.scene),
      action = mixer.clipAction(gltf.animations[0]);
    action.play();
    mixer.setTime(0);
    action.paused = true;
  }
  gltf.scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(gltf.scene),
    scale = 1.78 / (bounds.max.y - bounds.min.y);
  gltf.scene.scale.setScalar(scale);
  gltf.scene.rotation.y = Math.PI / 2;
  gltf.scene.updateMatrixWorld(true);
  const node = (n) => gltf.scene.getObjectByName(n),
    hips = node("Bip01_Pelvis"),
    chest = node("Bip01_Spine1");
  const legs = ["L", "R"].map((s) => [
    node(`Bip01_${s}_Thigh`),
    node(`Bip01_${s}_Calf`),
    node(`Bip01_${s}_Foot`),
  ]);
  const arms = ["L", "R"].map((s) => [
    node(`Bip01_${s}_UpperArm`),
    node(`Bip01_${s}_Forearm`),
    node(`Bip01_${s}_Hand`),
  ]);
  const mixer = new T.AnimationMixer(gltf.scene),
    actions = {};
  for (const [mode, clips] of Object.entries(animations)) {
    const clip = T.AnimationClip.parse(clips[0]);
    clip.tracks = clip.tracks.filter(
      (t) => t.name.endsWith(".quaternion") && node(t.name.split(".")[0]),
    );
    clip.optimize();
    actions[mode] = mixer.clipAction(clip);
  }
  let activeMode,
    transition = null,
    lastAnimated = null;
  const footOrientation = legs.map((l) =>
    l[2].getWorldQuaternion(new T.Quaternion()),
  );
  const rest = [];
  gltf.scene.traverse((o) => {
    if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone()]);
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const v = new T.Vector3(),
    world = new T.Vector3(),
    pole = new T.Vector3();
  function update(pose) {
    validateRigPose(pose);
    for (const [o, p, q] of rest) {
      o.position.copy(p);
      o.quaternion.copy(q);
    }
    if (actions[pose.mode]) {
      if (activeMode !== pose.mode) {
        if (
          activeMode &&
          ["idle", "walk"].includes(activeMode) &&
          ["idle", "walk"].includes(pose.mode)
        )
          transition = {
            time: pose.time,
            quaternions:
              lastAnimated || rest.map(([o]) => o.quaternion.clone()),
          };
        else transition = null;
        mixer.stopAllAction();
        actions[pose.mode].play();
        activeMode = pose.mode;
      }
      mixer.setTime(pose.mode === "walk" ? (pose.phase % 1) * 1.2 : pose.time);
    }
    if (transition) {
      const t = Math.min(1, Math.max(0, (pose.time - transition.time) / 0.22)),
        u = t * t * (3 - 2 * t);
      for (let i = 0; i < rest.length; i++) {
        const q = rest[i][0].quaternion.clone();
        rest[i][0].quaternion.copy(transition.quaternions[i]).slerp(q, u);
      }
      if (t === 1) transition = null;
    }
    lastAnimated = rest.map(([o]) => o.quaternion.clone());
    gltf.scene.position.set(0, 0, 0);
    group.updateWorldMatrix(true, true);
    hips.getWorldPosition(v);
    group.worldToLocal(v);
    gltf.scene.position.add(new T.Vector3(...pose.seat).sub(v));
    chest.rotateY(pose.lean[0]);
    chest.rotateX(pose.lean[1]);
    chest.position.x += pose.breath / scale;
    group.updateWorldMatrix(true, true);
    if (pose.mode !== "helm") {
      let lower = 0;
      for (let i = 0; i < 2; i++) {
        const a = legs[i][0].getWorldPosition(new T.Vector3()),
          b = legs[i][1].getWorldPosition(new T.Vector3()),
          c = legs[i][2].getWorldPosition(new T.Vector3()),
          reach = a.distanceTo(b) + b.distanceTo(c) - 0.018;
        group.worldToLocal(a);
        const foot = pose.feet[i],
          horizontal = (a.x - foot[0]) ** 2 + (a.z - foot[2]) ** 2;
        lower = Math.min(
          lower,
          foot[1] + Math.sqrt(Math.max(0, reach * reach - horizontal)) - a.y,
        );
      }
      gltf.scene.position.y += lower;
      group.updateWorldMatrix(true, true);
    }
    let maxError = 0;
    const errors = [];
    for (let i = 0; i < 2; i++) {
      world.fromArray(pose.feet[i]);
      group.localToWorld(world);
      pole.set(
        pose.seat[0] + 1,
        pose.seat[1] - 0.1,
        pose.seat[2] + (i === 0 ? -0.15 : 0.15),
      );
      group.localToWorld(pole);
      const result = solveTwoBone(...legs[i], world, pole);
      errors.push(result.error);
      maxError = Math.max(maxError, result.error);
      if (pose.mode === "helm") {
        world.fromArray(pose.hands[i]);
        group.localToWorld(world);
        pole.set(
          pose.seat[0] + 0.1,
          pose.seat[1] - 0.2,
          pose.seat[2] + (i === 0 ? -0.7 : 0.7),
        );
        group.localToWorld(pole);
        const arm = solveTwoBone(...arms[i], world, pole);
        errors.push(arm.error);
        maxError = Math.max(maxError, arm.error);
        const hand = arms[i][2],
          handParent = hand.parent
            .getWorldQuaternion(new T.Quaternion())
            .invert(),
          handDeck = group.getWorldQuaternion(new T.Quaternion());
        hand.quaternion.copy(
          handParent
            .multiply(handDeck)
            .multiply(
              new T.Quaternion().setFromAxisAngle(
                new T.Vector3(1, 0, 0),
                i === 0 ? Math.PI / 2 : -Math.PI / 2,
              ),
            ),
        );
        hand.traverse((f) => {
          if (f !== hand && f.isBone && !f.name.includes("Finger0"))
            f.quaternion.setFromAxisAngle(
              new T.Vector3(0, 0, 1),
              f.parent === hand ? 0.65 : 1.05,
            );
        });
      }
      const foot = legs[i][2],
        parentQ = foot.parent.getWorldQuaternion(new T.Quaternion()).invert(),
        deckQ = group.getWorldQuaternion(new T.Quaternion());
      foot.quaternion.copy(
        parentQ.multiply(deckQ).multiply(footOrientation[i]),
      );
    }
    return { maxError, errors };
  }
  return { group, update, hips, legs, arms, scale };
}
