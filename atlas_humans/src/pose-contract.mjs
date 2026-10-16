export function validateRigPose(pose) {
  const vec = (v, n) =>
    Array.isArray(v) && v.length === n && v.every(Number.isFinite);
  if (
    !pose ||
    !["helm", "idle", "walk"].includes(pose.mode) ||
    !Number.isFinite(pose.time) ||
    pose.time < 0
  )
    throw new TypeError("RIG_MODE_OR_TIME_INVALID");
  if (
    !vec(pose.seat, 3) ||
    !Array.isArray(pose.feet) ||
    pose.feet.length !== 2 ||
    !pose.feet.every((v) => vec(v, 3))
  )
    throw new TypeError("RIG_CONTACTS_INVALID");
  if (
    !vec(pose.lean, 2) ||
    pose.lean.some((v) => Math.abs(v) > 0.5) ||
    !Number.isFinite(pose.breath) ||
    Math.abs(pose.breath) > 0.02
  )
    throw new TypeError("RIG_BALANCE_INVALID");
  if (
    pose.mode === "helm" &&
    (!Array.isArray(pose.hands) ||
      pose.hands.length !== 2 ||
      !pose.hands.every((v) => vec(v, 3)))
  )
    throw new TypeError("RIG_GRIP_INVALID");
  if (pose.mode === "walk" && (!Number.isFinite(pose.phase) || pose.phase < 0))
    throw new TypeError("RIG_GAIT_PHASE_INVALID");
  if (
    pose.torsoPitch !== undefined &&
    (!Number.isFinite(pose.torsoPitch) || Math.abs(pose.torsoPitch) > 1.2)
  )
    throw new TypeError("RIG_TORSO_PITCH_INVALID");
  if (
    pose.handOrientations !== undefined &&
    (!Array.isArray(pose.handOrientations) ||
      pose.handOrientations.length !== 2 ||
      !pose.handOrientations.every(
        (q) => vec(q, 4) && Math.abs(Math.hypot(...q) - 1) < 1e-5,
      ))
  )
    throw new TypeError("RIG_HAND_ORIENTATION_INVALID");
  if (
    pose.footOrientations !== undefined &&
    (!Array.isArray(pose.footOrientations) ||
      pose.footOrientations.length !== 2 ||
      !pose.footOrientations.every(
        (q) => vec(q, 4) && Math.abs(Math.hypot(...q) - 1) < 1e-5,
      ))
  )
    throw new TypeError("RIG_FOOT_ORIENTATION_INVALID");
  return pose;
}
