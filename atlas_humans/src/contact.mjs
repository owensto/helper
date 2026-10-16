// Metres, seconds, radians. +X forward, +Y up, +Z starboard.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, n) => {
  if (!Number.isFinite(v)) throw new TypeError(`${n} must be finite`);
  return v;
};
export function validateAttachment(a) {
  if (
    typeof a?.vesselId !== "string" ||
    !a.vesselId ||
    typeof a.revision !== "string" ||
    !a.revision
  )
    throw new TypeError("vesselId and geometry revision required");
  for (const key of [
    "seat",
    "leftFoot",
    "rightFoot",
    "leftHand",
    "rightHand",
  ]) {
    if (!Array.isArray(a[key]) || a[key].length !== 3)
      throw new TypeError(`${key} must be a local vec3`);
    a[key].forEach((v) => finite(v, key));
  }
  return structuredClone(a);
}
// Pure contact solver: never advances vessel time or writes vessel state.
export class CharacterContact {
  constructor(attachment) {
    this.attachment = validateAttachment(attachment);
    this.lean = [0, 0];
    this.velocity = [0, 0];
    this.lastTime = null;
  }
  reset(attachment = this.attachment) {
    this.attachment = validateAttachment(attachment);
    this.lean = [0, 0];
    this.velocity = [0, 0];
    this.lastTime = null;
  }
  update(frame) {
    const { time, dt, acceleration = [0, 0, 0], roll = 0, pitch = 0 } = frame;
    finite(time, "time");
    finite(dt, "dt");
    if (dt < 0 || dt > 0.1)
      throw new RangeError("Host must supply dt in [0, .1]");
    if (!Array.isArray(acceleration) || acceleration.length !== 3)
      throw new TypeError("acceleration must be vec3");
    acceleration.forEach((v) => finite(v, "acceleration"));
    finite(roll, "roll");
    finite(pitch, "pitch");
    if (this.lastTime !== null && time < this.lastTime)
      throw new RangeError("Reset character on host time discontinuity");
    // Critically damped balance response. Substeps cap numerical energy at low frame rates.
    const target = [
      clamp(-acceleration[0] / 9.81 - pitch, -0.2, 0.2),
      clamp(-acceleration[2] / 9.81 - roll, -0.2, 0.2),
    ];
    const steps = Math.ceil(dt / (1 / 120));
    const h = steps ? dt / steps : 0;
    for (let s = 0; s < steps; s++)
      for (let i = 0; i < 2; i++) {
        this.velocity[i] +=
          (64 * (target[i] - this.lean[i]) - 16 * this.velocity[i]) * h;
        this.lean[i] += this.velocity[i] * h;
      }
    this.lastTime = time;
    return {
      version: 1,
      vesselId: this.attachment.vesselId,
      geometryRevision: this.attachment.revision,
      time,
      mode: "helm",
      seat: [...this.attachment.seat],
      feet: [this.attachment.leftFoot, this.attachment.rightFoot].map((x) => [
        ...x,
      ]),
      hands: [this.attachment.leftHand, this.attachment.rightHand].map((x) => [
        ...x,
      ]),
      lean: [...this.lean],
      breath: Math.sin(time * 1.7) * 0.003,
    };
  }
}
// Transport-owned envelope: no socket, ownership transfer or duplicate captain state.
export function characterSnapshot(
  characterId,
  pose,
  sequence,
  simulationEpoch,
) {
  if (
    typeof simulationEpoch !== "string" ||
    !simulationEpoch.trim() ||
    simulationEpoch.length > 128
  )
    throw new TypeError("Explicit host simulation epoch required");
  if (
    typeof characterId !== "string" ||
    !characterId.trim() ||
    characterId.length > 96
  )
    throw new TypeError("character identity required");
  if (
    !pose ||
    typeof pose.vesselId !== "string" ||
    !pose.vesselId.trim() ||
    pose.vesselId.length > 128 ||
    typeof pose.geometryRevision !== "string" ||
    !pose.geometryRevision.trim() ||
    pose.geometryRevision.length > 256
  )
    throw new TypeError("Explicit vessel and geometry identities required");
  if (!Number.isSafeInteger(sequence) || sequence < 0)
    throw new TypeError("sequence required");
  if (
    !["helm", "idle", "walk"].includes(pose.mode) ||
    !Number.isFinite(pose.time) ||
    pose.time < 0 ||
    !Array.isArray(pose.seat) ||
    pose.seat.length !== 3 ||
    !pose.seat.every((v) => Number.isFinite(v) && Math.abs(v) < 1000) ||
    !Array.isArray(pose.lean) ||
    pose.lean.length !== 2 ||
    !pose.lean.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.5)
  )
    throw new TypeError("Invalid pose");
  return {
    version: 1,
    animationRevision: "rocketbox-captain-v1",
    simulationEpoch,
    characterId,
    vesselId: pose.vesselId,
    geometryRevision: pose.geometryRevision,
    sequence,
    time: pose.time,
    mode: pose.mode,
    localPosition: [...pose.seat],
    lean: [...pose.lean],
  };
}
