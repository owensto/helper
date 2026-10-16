import { Vector3, Quaternion } from "three";
const a = new Vector3(),
  b = new Vector3(),
  c = new Vector3(),
  dir = new Vector3(),
  bend = new Vector3(),
  joint = new Vector3(),
  goal = new Vector3(),
  q = new Quaternion(),
  parentQ = new Quaternion(),
  worldQ = new Quaternion();
function aim(bone, child, target) {
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(a);
  child.getWorldPosition(b);
  dir.copy(b).sub(a).normalize();
  bend.copy(target).sub(a).normalize();
  q.setFromUnitVectors(dir, bend);
  bone.getWorldQuaternion(worldQ);
  if (bone.parent) bone.parent.getWorldQuaternion(parentQ).invert();
  else parentQ.identity();
  bone.quaternion.copy(parentQ.multiply(q).multiply(worldQ));
  bone.updateWorldMatrix(false, true);
}
// Analytic two-bone IK with explicit pole and conservative reach clamp.
export function solveTwoBone(root, mid, end, target, pole) {
  root.updateWorldMatrix(true, true);
  root.getWorldPosition(a);
  mid.getWorldPosition(b);
  end.getWorldPosition(c);
  const start = a.clone(),
    l1 = a.distanceTo(b),
    l2 = b.distanceTo(c),
    raw = start.distanceTo(target);
  const distance = Math.max(
    Math.abs(l1 - l2) + 1e-5,
    Math.min(l1 + l2 - 1e-5, raw),
  );
  dir.copy(target).sub(start);
  if (dir.lengthSq() < 1e-12) dir.set(1, 0, 0);
  dir.normalize();
  goal.copy(start).addScaledVector(dir, distance);
  bend.copy(pole).sub(start);
  bend.addScaledVector(dir, -bend.dot(dir));
  if (bend.lengthSq() < 1e-10) {
    bend.set(0, 0, 1);
    bend.addScaledVector(dir, -bend.dot(dir));
    if (bend.lengthSq() < 1e-10) bend.set(0, 1, 0);
  }
  bend.normalize();
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
  joint
    .copy(start)
    .addScaledVector(dir, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
  const targetJoint = joint.clone(),
    targetEnd = goal.clone();
  aim(root, mid, targetJoint);
  aim(mid, end, targetEnd);
  end.getWorldPosition(c);
  return {
    error: c.distanceTo(target),
    reachable: Math.abs(raw - distance) < 0.0001,
  };
}
