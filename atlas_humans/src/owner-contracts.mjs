import { transformPair } from "./transform-contract.mjs";
const unavailable = (reason) => ({
  valid: false,
  reason,
  productionEnabled: false,
});
// Inspection/receiver gates only. Neither owner's current contract supplies a complete helm.
export function inspectCoreC1Helm(descriptor) {
  if (descriptor?.revision !== "sealab12-core-integration/1.0.0")
    return unavailable("CORE_REVISION_UNSUPPORTED");
  const bay = descriptor.vessels?.["atlas-bay-25-sealab12"];
  if (bay?.available !== true) return unavailable("CORE_VESSEL_UNAVAILABLE");
  const required = [
    "seatContact",
    "leftGrip",
    "rightGrip",
    "leftSole",
    "rightSole",
    "transitionOccupancy",
  ];
  const missing = required.filter(
    (k) => bay.anchors?.[k] == null || bay.anchors[k]?.available === false,
  );
  if (missing.length)
    return { ...unavailable("CORE_CONTACTS_UNAVAILABLE"), missing };
  return unavailable("RIG_OFFSET_MAPPING_NOT_ACCEPTED");
}
export function inspectYachtY1Helm(sample, expected) {
  if (sample?.available !== true)
    return unavailable(sample?.reason || "YACHT_FRAME_UNAVAILABLE");
  if (
    sample.schemaVersion !== "atlas-vessel-contact/1" ||
    sample.vesselId !== "atlas-d-original-r7"
  )
    return unavailable("YACHT_REVISION_UNSUPPORTED");
  if (
    !expected ||
    typeof expected.instanceId !== "string" ||
    !expected.instanceId ||
    !Number.isSafeInteger(expected.activationEpoch) ||
    expected.activationEpoch < 0 ||
    !Number.isSafeInteger(expected.frameId) ||
    expected.frameId < 0 ||
    !Number.isFinite(expected.simTimeSeconds) ||
    expected.simTimeSeconds < 0
  )
    return unavailable("YACHT_FRAME_IDENTITY_MISSING");
  if (
    expected.frameToken !==
    JSON.stringify([
      "atlas-d-original-r7",
      expected.instanceId,
      expected.activationEpoch,
      expected.frameId,
      expected.simTimeSeconds,
    ])
  )
    return unavailable("YACHT_FRAME_TOKEN_INVALID");
  if (
    !expected ||
    sample.frameToken !== expected.frameToken ||
    typeof expected.frameToken !== "string" ||
    sample.instanceId !== expected.instanceId ||
    sample.activationEpoch !== expected.activationEpoch ||
    sample.frameId !== expected.frameId ||
    sample.simTimeSeconds !== expected.simTimeSeconds
  )
    return unavailable("YACHT_STALE_FRAME");
  try {
    transformPair({
      localToWorld: sample.vessel?.worldFromLocal,
      worldToLocal: sample.vessel?.localFromWorld,
    });
  } catch (e) {
    return unavailable(e.message);
  }
  if (sample.helmAttachmentAvailable !== true)
    return unavailable("YACHT_HELM_ANCHORS_UNAVAILABLE");
  return unavailable("RIG_OFFSET_MAPPING_NOT_ACCEPTED");
}
export function inspectYachtPointSupport(contact, sample, expected) {
  const helm = inspectYachtY1Helm(sample, expected);
  if (helm.reason !== "YACHT_HELM_ANCHORS_UNAVAILABLE")
    return { ...helm, supportsWholeFoot: false };
  if (contact?.available !== true)
    return {
      ...unavailable(contact?.reason || "POINT_SUPPORT_UNAVAILABLE"),
      supportsWholeFoot: false,
    };
  if (
    contact.frameToken !== expected.frameToken ||
    contact.vesselId !== sample.vesselId
  )
    return { ...unavailable("YACHT_STALE_CONTACT"), supportsWholeFoot: false };
  for (const k of ["pointWorldM", "pointVesselM", "normalWorld"])
    if (
      !Array.isArray(contact[k]) ||
      contact[k].length !== 3 ||
      !contact[k].every(Number.isFinite)
    )
      return {
        ...unavailable("POINT_SUPPORT_NONFINITE"),
        supportsWholeFoot: false,
      };
  return {
    valid: true,
    productionEnabled: false,
    pointOnly: true,
    supportsWholeFoot: false,
    reason: "FOOTPRINT_AND_BODY_CLEARANCE_NOT_ESTABLISHED",
    pointVesselM: [...contact.pointVesselM],
  };
}
