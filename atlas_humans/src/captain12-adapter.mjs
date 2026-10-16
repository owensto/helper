import { CharacterContact, validateAttachment } from "./contact.mjs";
import { Vector3 } from "three";
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
    group.userData.animateCaptain = (A, S) => {
      const sample = sampleHost(A, S);
      if (
        !sample?.valid ||
        !sample.attachment ||
        !sample.frame ||
        typeof sample.frame.epoch !== "string" ||
        !sample.frame.epoch ||
        sample.ejected
      ) {
        group.userData.attachmentValid = false;
        group.children.forEach((o) => (o.visible = false));
        onUnsupported(sample?.reason || "Attachment unavailable");
        return;
      }
      const key =
        sample.attachment.vesselId +
        ":" +
        sample.attachment.revision +
        ":" +
        sample.frame.epoch;
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
        A.boat.localToWorld(v);
        group.worldToLocal(v);
        return v.toArray();
      };
      pose.seat = local(pose.seat);
      pose.feet = pose.feet.map(local);
      pose.hands = pose.hands.map(local);
      group.userData.attachmentValid = true;
      group.children.forEach((o) => (o.visible = true));
      return rig.update(pose);
    };
    return { group, limbs: [] };
  };
}
