// Motion bounds only: CORE must independently verify identity, digest, geometry and occupancy.
// This does not grant production acceptance or change vessel controls.
export function checkBayRigMotionBounds(profile, frame) {
  const fail = (reason) => ({ valid: false, reason, productionEnabled: false });
  const b = profile?.bounds;
  if (
    !b ||
    ![b.wheelAngleAbsMaxRad, b.rollAbsMaxRad, b.pitchAbsMaxRad].every(
      (v) => Number.isFinite(v) && v > 0,
    ) ||
    !frame ||
    ![frame.wheelAngleRad, frame.roll, frame.pitch].every(Number.isFinite)
  )
    return fail("BAY_PROFILE_FRAME_MISSING");
  if (Math.abs(frame.wheelAngleRad) > b.wheelAngleAbsMaxRad)
    return fail("HAND_RELEASE_REGRIP_REQUIRED");
  if (
    Math.abs(frame.roll) > b.rollAbsMaxRad ||
    Math.abs(frame.pitch) > b.pitchAbsMaxRad
  )
    return fail("BAY_PROFILE_MOTION_OUTSIDE_REVIEWED_BOUNDS");
  return { valid: true, reviewOnly: true, productionEnabled: false };
}
