import { clamp } from "./contact.mjs";
// Deliberately limited to one flat, owner-supplied rectangular deck patch.
// Host supplies intent and time. Character does not integrate vessel motion.
export class DeckLocomotion {
  constructor(
    { vesselId, revision, bounds, deckY = 0, obstacles = [] },
    position = [-1.3, 0.65],
  ) {
    if (
      typeof vesselId !== "string" ||
      !vesselId ||
      typeof revision !== "string" ||
      !revision ||
      !Array.isArray(bounds) ||
      bounds.length !== 4 ||
      !bounds.every(Number.isFinite) ||
      bounds[0] >= bounds[1] ||
      bounds[2] >= bounds[3]
    )
      throw new TypeError("Explicit finite deck patch required");
    if (
      !Number.isFinite(deckY) ||
      !Array.isArray(position) ||
      position.length !== 2 ||
      !position.every(Number.isFinite) ||
      !Array.isArray(obstacles)
    )
      throw new TypeError("Invalid deck height, spawn or obstacles");
    if (
      bounds[1] - bounds[0] < 0.46 ||
      bounds[3] - bounds[2] < 0.46 ||
      position[0] < bounds[0] + 0.23 ||
      position[0] > bounds[1] - 0.23 ||
      position[1] < bounds[2] + 0.23 ||
      position[1] > bounds[3] - 0.23
    )
      throw new RangeError("Spawn must fit inside deck patch");
    for (const o of obstacles) {
      if (
        !o ||
        ![o.minX, o.maxX, o.minZ, o.maxZ].every(Number.isFinite) ||
        o.minX >= o.maxX ||
        o.minZ >= o.maxZ
      )
        throw new TypeError("Invalid obstacle bounds");
      if (
        position[0] > o.minX - 0.23 &&
        position[0] < o.maxX + 0.23 &&
        position[1] > o.minZ - 0.23 &&
        position[1] < o.maxZ + 0.23
      )
        throw new RangeError("Spawn intersects obstacle");
    }
    this.patch = {
      vesselId,
      revision,
      bounds: [...bounds],
      deckY,
      obstacles: structuredClone(obstacles),
    };
    this.position = [...position];
    this.phase = 0;
    this.speed = 0;
    this.feet = [null, null];
    this.swingStarts = [null, null];
    this.lastTime = null;
    this.invalidated = false;
    this.lastTargets = null;
    this.wasMoving = false;
    this.settling = null;
  }
  update({ time, dt, forward = 0, valid = true }) {
    if (![time, dt, forward].every(Number.isFinite) || dt < 0 || dt > 0.1)
      throw new RangeError("Invalid host frame");
    if (this.lastTime !== null && time < this.lastTime)
      throw new RangeError("Reset on host time discontinuity");
    this.lastTime = time;
    if (!valid) {
      this.invalidated = true;
      return { valid: false, reason: "Owner marks deck unavailable" };
    }
    if (this.invalidated)
      return { valid: false, reason: "DECK_REACQUISITION_REQUIRES_RESET" };
    const p = this.patch,
      r = 0.23,
      b = p.bounds,
      requested = clamp(forward, 0, 1) * 0.55;
    // Braking at a boundary is conservative: no freefall, stair or jump inference.
    this.speed += (requested - this.speed) * (1 - Math.exp(-dt * 8));
    const previous = this.position[0];
    let limit = b[1] - r;
    let next = clamp(previous + this.speed * dt, b[0] + r, limit);
    for (const o of p.obstacles) {
      if (
        this.position[1] > o.minZ - r &&
        this.position[1] < o.maxZ + r &&
        previous <= o.minX - r &&
        next >= previous
      ) {
        limit = Math.min(limit, o.minX - r);
        next = Math.min(next, limit);
      }
    }
    this.position[0] = next;
    if (dt > 0 && Math.abs(next - previous) < 1e-8) this.speed = 0;
    const moving = this.speed > 0.025;
    if (moving) this.phase += (this.speed * dt) / 0.55 / 0.9;
    let footTargets = [];
    if (!moving && this.wasMoving && this.lastTargets)
      this.settling = {
        age: 0,
        starts: this.lastTargets.map((p) => [...p]),
        ends: this.feet.map((p) => [Math.min(p[0], limit), p[1], p[2]]),
      };
    if (moving) this.settling = null;
    for (let i = 0; i < 2; i++) {
      const localPhase = (this.phase + (i === 0 ? 0 : 0.5)) % 1,
        z = this.position[1] + (i === 0 ? -0.11 : 0.11),
        y = p.deckY + 0.102;
      if (!this.feet[i]) this.feet[i] = [this.position[0], y, z];
      // 60% stance; stance positions are immutable in vessel coordinates.
      if (localPhase < 0.6 || !moving) {
        this.swingStarts[i] = null;
        footTargets.push([...this.feet[i]]);
      } else {
        if (!this.swingStarts[i]) this.swingStarts[i] = [...this.feet[i]];
        const t = (localPhase - 0.6) / 0.4,
          u = t * t * (3 - 2 * t),
          start = this.swingStarts[i];
        const landing = Math.min(limit, this.position[0] + 0.18);
        const target = [
          start[0] + (landing - start[0]) * u,
          y + Math.sin(Math.PI * t) * 0.1,
          z,
        ];
        footTargets.push(target);
        this.feet[i] = [landing, y, z];
      }
    }
    if (this.settling) {
      const q = this.settling;
      q.age += dt;
      const t = Math.min(1, q.age / 0.18),
        u = t * t * (3 - 2 * t);
      footTargets = q.starts.map((p, i) =>
        p.map((v, j) => v + (q.ends[i][j] - v) * u),
      );
      if (t === 1) {
        this.feet = q.ends.map((p) => [...p]);
        this.settling = null;
      }
    }
    this.lastTargets = footTargets.map((p) => [...p]);
    this.wasMoving = moving;
    return {
      valid: true,
      version: 1,
      vesselId: p.vesselId,
      geometryRevision: p.revision,
      time,
      mode: moving ? "walk" : "idle",
      seat: [this.position[0], p.deckY + 0.87, this.position[1]],
      feet: footTargets,
      hands: [],
      lean: [0, 0],
      breath: Math.sin(time * 1.7) * 0.002,
      speed: this.speed,
      phase: this.phase,
    };
  }
}
