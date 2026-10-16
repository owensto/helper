import { CharacterContact, validateAttachment } from "./contact.mjs";
import { Vector3 } from "three";
import { validateRigPose } from "./pose-contract.mjs";
import { stampedTransform, rigidMatrix } from "./transform-contract.mjs";
// CORE opts in by replacing its existing Sea12Captain.build call with this factory.
// No window globals, scene insertion, timer, network or vessel stepping occurs here.
export function makeCaptain12Build({
  rig,
  sampleHost,
  onUnsupported = () => {},
}) {
  if (
    !rig?.group ||
    typeof rig.update !== "function" ||
    typeof sampleHost !== "function"
  )
    throw new TypeError("Preloaded rig and owner sample callback required");
  let built = false,
    contact = null,
    revision = null;
  const v = new Vector3();
  return function build() {
    if (built)
      throw new Error(
        "One rig per existing captain; preload another rig for another captain",
      );
    built = true;
    const group = rig.group;
    group.name = "SEA12_CAPTAIN";
    let lastFailure = null;
    const hide = (reason) => {
      group.userData.attachmentValid = false;
      group.children.forEach((o) => (o.visible = false));
      contact = null;
      revision = null;
      if (reason !== lastFailure) {
        lastFailure = reason;
        // Diagnostics are never allowed to escape the render/initialization boundary.
        try {
          onUnsupported(reason);
        } catch {
          /* The attachment is already hidden. */
        }
      }
      return { valid: false, reason };
    };
    hide("AWAITING_VALID_ATTACHMENT");
    group.userData.animateCaptain = (A, S) => {
      try {
        const sample = sampleHost(A, S);
        if (
          !sample?.valid ||
          !sample.attachment ||
          !sample.frame ||
          typeof sample.frame.epoch !== "string" ||
          !sample.frame.epoch ||
          sample.ejected
        ) {
          return hide(sample?.reason || "Attachment unavailable");
        }
        let ancestor = group.parent;
        while (ancestor && ancestor !== A?.boat) ancestor = ancestor.parent;
        if (!ancestor) return hide("CAPTAIN_DETACHED");
        const supplied = stampedTransform(sample.transform, sample.frame);
        if (!A?.boat?.updateWorldMatrix) return hide("VESSEL_ROOT_UNAVAILABLE");
        A.boat.updateWorldMatrix(true, false);
        group.updateWorldMatrix(true, false);
        const actual = rigidMatrix(Array.from(A.boat.matrixWorld.elements));
        rigidMatrix(Array.from(group.matrixWorld.elements));
        if (
          actual.elements.some(
            (v, i) => Math.abs(v - supplied.forward.elements[i]) > 1e-5,
          )
        )
          return hide("RENDER_TRANSFORM_MISMATCH");
        const key = JSON.stringify([
          sample.attachment.vesselId,
          sample.attachment.revision,
          sample.frame.epoch,
        ]);
        if (key !== revision) {
          contact = new CharacterContact(sample.attachment);
          revision = key;
        }
        if (sample.reset) contact.reset(sample.attachment);
        // Owner may animate wheel/lever targets without changing geometry revision.
        contact.attachment = validateAttachment(sample.attachment);
        const pose = contact.update(sample.frame);
        A.boat.updateWorldMatrix(true, false);
        group.updateWorldMatrix(true, true);
        const local = (point) => {
          v.fromArray(point);
          v.applyMatrix4(supplied.forward);
          group.worldToLocal(v);
          return v.toArray();
        };
        pose.seat = local(pose.seat);
        pose.feet = pose.feet.map(local);
        pose.hands = pose.hands.map(local);
        if (sample.rigPose !== undefined) {
          const r = sample.rigPose;
          if (
            !r ||
            !Number.isFinite(r.torsoPitch) ||
            !r.handOrientations ||
            !r.footOrientations ||
            !Number.isFinite(r.balanceGain) ||
            r.balanceGain < 0 ||
            r.balanceGain > 1
          )
            return hide("INCOMPLETE_RIG_PROFILE_POSE");
          pose.torsoPitch = r.torsoPitch;
          pose.handOrientations = structuredClone(r.handOrientations);
          pose.footOrientations = structuredClone(r.footOrientations);
          pose.lean = pose.lean.map((v) => v * r.balanceGain);
          validateRigPose(pose);
        }
        group.userData.attachmentValid = true;
        group.children.forEach((o) => (o.visible = true));
        const result = rig.update(pose);
        lastFailure = null;
        return result;
      } catch (error) {
        return hide(
          error instanceof Error ? error.message : "INVALID_OWNER_SAMPLE",
        );
      }
    };
    return { group, limbs: [] };
  };
}
