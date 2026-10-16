// Transport validates authenticated identity/authority; this validates the pose contract.
// No transport is enabled by importing this module.
export const CHARACTER_SCHEMA = "atlas-character/1";
export function readRemoteCharacter(
  value,
  {
    characterId,
    vesselId,
    geometryRevision,
    simulationEpoch,
    afterSequence = -1,
  },
) {
  const fail = (reason) => ({ valid: false, reason });
  if (
    !value ||
    value.version !== 1 ||
    value.animationRevision !== "rocketbox-captain-v1"
  )
    return fail("Unsupported character/animation revision");
  if (
    typeof simulationEpoch !== "string" ||
    !simulationEpoch ||
    value.simulationEpoch !== simulationEpoch
  )
    return fail("Host simulation epoch mismatch");
  if (
    value.characterId !== characterId ||
    value.vesselId !== vesselId ||
    value.geometryRevision !== geometryRevision
  )
    return fail("Owner identity or attachment revision mismatch");
  if (!Number.isSafeInteger(value.sequence) || value.sequence <= afterSequence)
    return fail("Stale sequence");
  if (
    !Number.isFinite(value.time) ||
    !["helm", "idle", "walk"].includes(value.mode)
  )
    return fail("Invalid time or mode");
  if (
    !Array.isArray(value.localPosition) ||
    value.localPosition.length !== 3 ||
    !value.localPosition.every((v) => Number.isFinite(v) && Math.abs(v) < 1000)
  )
    return fail("Invalid local position");
  if (
    !Array.isArray(value.lean) ||
    value.lean.length !== 2 ||
    !value.lean.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.5)
  )
    return fail("Invalid balance pose");
  return {
    valid: true,
    state: {
      version: 1,
      animationRevision: value.animationRevision,
      characterId,
      vesselId,
      geometryRevision,
      simulationEpoch,
      sequence: value.sequence,
      time: value.time,
      mode: value.mode,
      localPosition: [...value.localPosition],
      lean: [...value.lean],
    },
  };
}
