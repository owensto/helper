import { Vector3, Quaternion } from "three";
const finiteVector = (a, n) =>
  Array.isArray(a) && a.length === n && Array.from(a).every(Number.isFinite);
// Copy only the complete frame/witness consumed by the controller. Never retain
// caller-owned arrays as cache validity evidence.
function surfaceSnapshot(surface) {
  if (
    !surface ||
    !Number.isSafeInteger(surface.triangle) ||
    surface.triangle < 0 ||
    !finiteVector(surface.barycentric, 3) ||
    surface.barycentric.some((v) => v < -1e-10 || v > 1 + 1e-10) ||
    Math.abs(surface.barycentric.reduce((a, b) => a + b, 0) - 1) > 1e-8 ||
    !finiteVector(surface.point, 3) ||
    !finiteVector(surface.normal, 3) ||
    Math.abs(Math.hypot(...surface.normal) - 1) > 1e-5 ||
    !finiteVector(surface.quaternion, 4) ||
    Math.abs(Math.hypot(...surface.quaternion) - 1) > 1e-5
  )
    throw new TypeError("HAND_SURFACE_INVALID");
  return {
    triangle: surface.triangle,
    barycentric: [...surface.barycentric],
    point: [...surface.point],
    normal: [...surface.normal],
    quaternion: [...surface.quaternion],
  };
}
const changedVector = (a, b, tolerance = 1e-6) =>
  a.some((v, i) => Math.abs(v - b[i]) > tolerance);
const changedRotation = (a, b) => {
  const qa = new Quaternion(...a).normalize(),
    qb = new Quaternion(...b).normalize();
  return 1 - Math.abs(qa.dot(qb)) > 1e-12;
};
const V = (a) => new Vector3(...a),
  clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export class WheelHandController {
  constructor({ offsets, preferred, supportHand = 0 }) {
    if (
      !Array.isArray(offsets) ||
      offsets.length !== 2 ||
      offsets.some(
        (o) =>
          !finiteVector(o.positionContactM, 3) ||
          !finiteVector(o.orientationContactXYZW, 4) ||
          Math.abs(Math.hypot(...o.orientationContactXYZW) - 1) > 1e-5,
      ) ||
      !Array.isArray(preferred) ||
      preferred.length !== 2 ||
      !preferred.every((p) => finiteVector(p, 3)) ||
      ![0, 1].includes(supportHand)
    )
      throw new TypeError("HAND_CONFIGURATION_INVALID");
    this.offsets = structuredClone(offsets);
    this.preferred = structuredClone(preferred);
    this.supportHand = supportHand;
    this.palmLocal = offsets.map((o) =>
      new Vector3(0, 0.001, 0)
        .sub(V(o.positionContactM))
        .applyQuaternion(new Quaternion(...o.orientationContactXYZW).invert()),
    );
    this.reset();
  }
  reset() {
    this.hands = [null, null];
    this.epoch = null;
    this.lastTime = null;
    this.lastFrame = null;
    this.blocked = false;
    this.evaluatedRigContext = null;
  }
  update({
    time,
    dt,
    epoch,
    frameId,
    valid = true,
    shoulders,
    reaches,
    candidates,
    sample,
    closest,
  }) {
    const fail = (reason) => ({ valid: false, reason });
    const invalidate = (reason) => {
      this.blocked = true;
      this.hands = [null, null];
      this.evaluatedRigContext = null;
      return fail(reason);
    };
    if (!valid) {
      this.reset();
      return fail("HAND_CONTEXT_UNAVAILABLE");
    }
    if (
      !Number.isFinite(time) ||
      time < 0 ||
      !Number.isFinite(dt) ||
      dt < 0 ||
      dt > 0.1 ||
      typeof epoch !== "string" ||
      !epoch ||
      !Number.isSafeInteger(frameId) ||
      frameId < 0
    )
      throw new TypeError("HAND_FRAME_INVALID");
    if (this.epoch !== null && epoch !== this.epoch) this.reset();
    if (this.blocked) return fail("HAND_NEW_EPOCH_REQUIRED");
    if (this.lastTime === null && dt !== 0)
      throw new TypeError("HAND_INITIAL_DELTA_MUST_BE_ZERO");
    if (
      this.lastTime !== null &&
      (time < this.lastTime ||
        frameId < this.lastFrame ||
        (frameId === this.lastFrame && time !== this.lastTime))
    ) {
      this.blocked = true;
      return fail("HAND_FRAME_DISCONTINUITY");
    }
    if (
      !Array.isArray(shoulders) ||
      shoulders.length !== 2 ||
      !Array.from(shoulders).every((p) => finiteVector(p, 3)) ||
      !finiteVector(reaches, 2) ||
      reaches.some((r) => r <= 0) ||
      !Array.isArray(candidates) ||
      typeof sample !== "function" ||
      typeof closest !== "function"
    ) {
      invalidate("HAND_INPUT_INVALID");
      throw new TypeError("HAND_INPUT_INVALID");
    }
    if (this.lastTime !== null && Math.abs(time - this.lastTime - dt) > 1e-6) {
      this.blocked = true;
      return fail("HAND_DELTA_MISMATCH");
    }
    const readSurface = (callback) => {
      try {
        return surfaceSnapshot(callback());
      } catch (error) {
        invalidate("HAND_SURFACE_INVALID");
        throw error;
      }
    };
    const originalSample = sample,
      originalClosest = closest;
    sample = (source) => readSurface(() => originalSample(source));
    closest = (point) => readSurface(() => originalClosest(point));
    candidates = Array.from(candidates, (surface) =>
      readSurface(() => surface),
    );
    if (this.hands.every(Boolean) && time === this.lastTime) {
      const current = this.hands.map((h) => sample(h.source));
      if (
        !this.evaluatedRigContext ||
        shoulders.some((v, i) =>
          changedVector(v, this.evaluatedRigContext.shoulders[i]),
        ) ||
        changedVector(reaches, this.evaluatedRigContext.reaches) ||
        this.hands.some(
          (h, i) =>
            reaches[i] - V(shoulders[i]).distanceTo(h.point) < 0.001 - 1e-10,
        )
      )
        return invalidate("PAUSED_RIG_CONTEXT_CHANGED");
      for (let i = 0; i < this.hands.length; i++) {
        const previous = this.hands[i].evaluatedSurface,
          now = current[i];
        if (V(now.point).distanceTo(V(previous.point)) > 1e-6)
          return invalidate("PAUSED_SURFACE_MOVED");
        if (
          now.triangle !== previous.triangle ||
          changedVector(now.barycentric, previous.barycentric, 1e-10) ||
          changedVector(now.normal, previous.normal) ||
          changedRotation(now.quaternion, previous.quaternion)
        )
          return invalidate("PAUSED_SURFACE_FRAME_CHANGED");
      }
      this.lastFrame = frameId;
      return { valid: true, hands: this.output(), repeated: true };
    }
    this.epoch = epoch;
    this.lastTime = time;
    this.lastFrame = frameId;
    const slack = (p, i) => reaches[i] - V(shoulders[i]).distanceTo(p);
    const wrist = (surface, q, i) =>
      V(surface.point)
        .addScaledVector(V(surface.normal), 0.001)
        .sub(this.palmLocal[i].clone().applyQuaternion(q));
    const natural = (surface, i) => {
      const q = new Quaternion(...surface.quaternion).multiply(
        new Quaternion(...this.offsets[i].orientationContactXYZW),
      );
      return { surface, q, point: wrist(surface, q, i) };
    };
    const choose = (i) =>
      candidates
        .map((c) => natural(c, i))
        .filter((c) => slack(c.point, i) > 0.025)
        .sort(
          (a, b) =>
            a.point.distanceToSquared(V(this.preferred[i])) -
            b.point.distanceToSquared(V(this.preferred[i])),
        )[0];
    for (let i = 0; i < 2; i++)
      if (!this.hands[i]) {
        const t = choose(i);
        if (!t) {
          this.reset();
          return fail("NO_REACHABLE_RIM_CONTACT");
        }
        this.hands[i] = {
          state: i === this.supportHand ? "sliding" : "attached",
          source: t.surface,
          anchor: V(t.surface.point)
            .add(new Vector3(-0.1, 0, 0))
            .toArray(),
          q: t.q.clone(),
          point: t.point.clone(),
          velocity: new Vector3(),
          age: 0,
          grip: 1,
          displayGrip: 1,
          offset: new Quaternion(...t.surface.quaternion)
            .invert()
            .multiply(t.q),
          lastSurface: [...t.surface.point],
        };
      }
    for (let i = 0; i < 2; i++) {
      const h = this.hands[i],
        before = h.point.clone(),
        beforeQ = h.q.clone(),
        beforeVelocity = h.velocity.clone();
      if (i === this.supportHand) {
        const surface = closest(h.anchor);
        h.source = surface;
        h.point.copy(wrist(surface, h.q, i));
        h.state = "sliding";
        h.grip = 1;
        if (slack(h.point, i) < 0.01) return fail("SUPPORT_HAND_OUT_OF_REACH");
      } else {
        if (h.state === "attached") {
          const surface = sample(h.source),
            q = new Quaternion(...surface.quaternion).multiply(h.offset),
            point = wrist(surface, q, i);
          const speed = dt > 0 ? point.distanceTo(h.point) / dt : 0;
          if (slack(point, i) < 0.045 + Math.min(0.06, speed * 0.2)) {
            const t = choose(i);
            if (!t) return fail("NO_REGRIP_TARGET");
            h.state = "reaching";
            h.age = 0;
            h.anchor = t.surface.point;
            h.goalQ = t.q;
            h.grip = 0;
          } else {
            h.point.copy(point);
            h.q.copy(q);
            h.source = surface;
          }
        }
        if (h.state === "reaching") {
          h.age += dt;
          const surface = closest(h.anchor),
            target = wrist(surface, h.goalQ, i);
          // Retreat towards the body while fingers are open, then settle onto an actual source face.
          const lift =
            0.045 * Math.sin(Math.PI * clamp(h.age / 0.45, 0, 1)) ** 2;
          target.addScaledVector(V(surface.normal), lift);
          const desired = target
            .clone()
            .sub(h.point)
            .multiplyScalar(12)
            .clampLength(0, 0.9);
          const acceleration = desired.sub(h.velocity).clampLength(0, 12 * dt);
          h.velocity.add(acceleration);
          const step = h.velocity.clone().multiplyScalar(dt);
          if (step.length() > h.point.distanceTo(target))
            step.copy(target).sub(h.point);
          h.point.add(step);
          h.q.rotateTowards(h.goalQ, 5 * dt);
          h.grip = 0;
          if (slack(h.point, i) < 0.005) return fail("FREE_HAND_OUT_OF_REACH");
          const landing = wrist(surface, h.goalQ, i);
          if (
            h.age >= 0.45 &&
            h.point.distanceTo(landing) < 0.0003 &&
            h.velocity.length() < 0.015 &&
            h.q.angleTo(h.goalQ) < 0.002
          ) {
            h.state = "sliding";
            h.point.copy(landing);
            h.q.copy(h.goalQ);
            h.source = surface;
            h.anchor = surface.point;
            h.age = 0;
            h.lastSurface = surface.point;
            h.grip = 0;
          }
        } else if (h.state === "sliding") {
          h.age += dt;
          const surface = closest(h.anchor);
          h.point.copy(wrist(surface, h.q, i));
          h.source = surface;
          h.grip = clamp(h.age / 0.15, 0, 1);
        }
      }
      if (h.state !== "reaching" && dt > 0) {
        const target = h.point.clone(),
          desired = target
            .clone()
            .sub(before)
            .multiplyScalar(18)
            .clampLength(0, 0.9);
        h.velocity
          .copy(beforeVelocity)
          .add(desired.sub(beforeVelocity).clampLength(0, 10 * dt));
        h.point.copy(before).addScaledVector(h.velocity, dt);
        const targetQ = h.q.clone();
        h.q.copy(beforeQ).rotateTowards(targetQ, 5 * dt);
      }
      const actual = sample(h.source),
        palm = h.point
          .clone()
          .add(this.palmLocal[i].clone().applyQuaternion(h.q));
      h.evaluatedSurface = surfaceSnapshot(actual);
      h.contactValid =
        h.state !== "reaching" && palm.distanceTo(V(actual.point)) <= 0.003;
      if (!h.contactValid) h.grip = 0;
      h.displayGrip += clamp(h.grip - h.displayGrip, -4 * dt, 4 * dt);
      if (slack(h.point, i) < 0.001)
        return fail(
          "SMOOTHED_HAND_OUT_OF_REACH:" +
            i +
            ":" +
            time +
            ":" +
            slack(h.point, i),
        );
    }
    this.evaluatedRigContext = {
      shoulders: shoulders.map((v) => [...v]),
      reaches: [...reaches],
    };
    return { valid: true, hands: this.output() };
  }
  output() {
    return this.hands.map((h) => ({
      state: h.contactValid
        ? "sliding"
        : h.state === "reaching"
          ? "reaching"
          : "released",
      phase: h.state,
      contactValid: h.contactValid,
      materialLocked: false,
      source: {
        triangle: h.source.triangle,
        barycentric: [...h.source.barycentric],
      },
      point: h.point.toArray(),
      quaternion: h.q.toArray(),
      grip: h.displayGrip,
    }));
  }
}
