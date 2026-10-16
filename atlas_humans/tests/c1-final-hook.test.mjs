import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import * as T from "three";
import { transformPair } from "../src/transform-contract.mjs";
const D = JSON.parse(
  fs.readFileSync(new URL("./owner-fixtures/core-c1.json", import.meta.url)),
);
const hook = fs.readFileSync(
  new URL("./owner-fixtures/core-c1-host-hooks.cjs", import.meta.url),
  "utf8",
);
const BAY = "atlas-bay-25-sealab12";
// Real immutable host bytes satisfy the unmodified hook's integrity check.
// Runtime below is a labeled synthetic receiver fixture, not a running Sea Lab host.
const assets = new Map(
  Object.keys(D.hostFiles).map((path) => [
    path,
    execFileSync(
      "git",
      ["show", D.baseline.publicSHA + ":atlas_sealab_12/live/" + path],
      { maxBuffer: 16 * 1024 * 1024 },
    ),
  ]),
);
async function fixture() {
  const boat = new T.Group(),
    model = new T.Group(),
    captain = new T.Group();
  captain.name = "SEA12_CAPTAIN";
  captain.position.set(-1.6, 1.06, 0.18);
  boat.add(model, captain);
  for (const name of ["PLAY_STEERING", "PLAY_THROTTLE"]) {
    const node = new T.Group();
    node.name = name;
    model.add(node);
  }
  let steps = 0,
    resets = 0,
    paused = false,
    ejected = false;
  const state = {
    elapsed: 10,
    location: "basin",
    config: { physics: "seamanship", tide: 0 },
    performanceMode: "fixture",
    environment: "calm",
    heading: 0,
    roll: 0,
    pitch: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    engine: false,
    gear: 0,
    throttle: 0,
    steer: 0,
    rudder: 0,
    trimActual: 0,
    step() {
      steps++;
    },
    reset() {
      resets++;
      this.elapsed = 0;
    },
  };
  const originalReset = state.reset,
    originalStep = state.step;
  const A = {
    boat,
    model,
    state,
    coast: { obstacles: [] },
    mode: () => "drive",
    inspect: () => ({ paused }),
  };
  const context = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    URL,
    document: { baseURI: "https://fixture.invalid/" },
    fetch: async (url) => {
      const b = assets.get(url.pathname.slice(1));
      return {
        ok: !!b,
        arrayBuffer: async () =>
          b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      };
    },
    BAYPLAY: A,
    ATLASRuntime: T,
    SEA12: { ready: true },
    SEA12_WATER: { ready: true },
    SEA12_GEO: { ready: true },
    Sea09World: { sample: () => ({ known: false, source: "fixture" }) },
    BayMotion: { surface: () => 0 },
    SEA09_WATER: { inspect: () => ({ turbidity: 0.1 }) },
    SEA10: {
      inspect: () => ({
        ejected,
        weather: { name: "calm", target: { amplitude: 0.1 } },
        options: {
          damage: false,
          ejection: false,
          explosions: false,
          killSwitch: false,
          light: "day",
        },
      }),
    },
  });
  vm.runInContext(hook, context);
  const api = await context.SeaLab12HostHooks.attach(D),
    descriptor = await api.reader.describe();
  return {
    api,
    descriptor,
    state,
    boat,
    captain,
    originalReset,
    originalStep,
    counts: () => ({ steps, resets }),
    pause: (v) => (paused = v),
    eject: (v) => (ejected = v),
  };
}
test("final C1 hook provides rigid cardinal/tilted render matrices without stepping host", async () => {
  const f = await fixture();
  try {
    for (const [heading, roll, pitch] of [
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
      [Math.PI, 0, 0],
      [-Math.PI / 2, 0.17, -0.12],
    ]) {
      Object.assign(f.state, { heading, roll, pitch });
      f.boat.position.set(12, 2, -8);
      f.boat.rotation.set(roll, -heading, pitch, "YXZ");
      const p = f.api.reader.readPose(BAY, f.descriptor.worldRevision),
        pair = transformPair(p.transform);
      assert.ok(
        pair.forward.elements.every(
          (v, i) => Math.abs(v - f.boat.matrixWorld.elements[i]) < 1e-12,
        ),
      );
      assert.ok(
        p.motion.renderEulerYXZ.every(
          (v, i) => Math.abs(v - [roll, -heading, pitch][i]) < 1e-12,
        ),
      );
      assert.equal(p.entityId, null);
      assert.equal(p.clock.domain, "client-simulation");
      assert.equal(p.clock.seconds, 10);
    }
    assert.equal(f.state.step, f.originalStep);
    assert.deepEqual(f.counts(), { steps: 0, resets: 0 });
  } finally {
    f.api.dispose();
  }
});
test("final C1 repeated/paused reads do not consume time; original reset advances epoch", async () => {
  const f = await fixture();
  try {
    const a = f.api.reader.readPose(BAY, f.descriptor.worldRevision);
    f.pause(true);
    const b = f.api.reader.readPose(BAY, f.descriptor.worldRevision);
    assert.equal(b.clock.seconds, a.clock.seconds);
    assert.equal(b.clock.epoch, a.clock.epoch);
    assert.equal(b.clock.paused, true);
    f.state.reset();
    const c = f.api.reader.readPose(BAY, f.descriptor.worldRevision);
    assert.equal(c.clock.seconds, 0);
    assert.equal(c.clock.epoch, a.clock.epoch + 1);
    assert.deepEqual(f.counts(), { steps: 0, resets: 1 });
  } finally {
    f.api.dispose();
    assert.equal(f.state.reset, f.originalReset);
  }
});
test("final C1 actual anchor reader rejects absent contacts, ejection, detached captain and yacht", async () => {
  const f = await fixture();
  try {
    const a = f.api.reader.readAnchors(BAY, f.descriptor.worldRevision);
    for (const k of [
      "seatContact",
      "leftGrip",
      "rightGrip",
      "leftSole",
      "rightSole",
      "transitionOccupancy",
    ])
      assert.equal(a[k].available, false);
    assert.equal(a.captainRoot.uuid, f.captain.uuid);
    f.eject(true);
    assert.equal(
      f.api.reader.readAnchors(BAY, f.descriptor.worldRevision).reason,
      "CAPTAIN_NOT_SEATED",
    );
    f.eject(false);
    f.boat.remove(f.captain);
    assert.equal(
      f.api.reader.readAnchors(BAY, f.descriptor.worldRevision).available,
      false,
    );
    assert.throws(
      () =>
        f.api.reader.readPose(
          "atlas-d-original-r7",
          f.descriptor.worldRevision,
        ),
      /YACHT_ADAPTER_UNAVAILABLE/,
    );
  } finally {
    f.api.dispose();
  }
});
test("final C1 world changes invalidate earlier receiving revision", async () => {
  const f = await fixture();
  try {
    f.state.config.tide = 1;
    assert.throws(
      () => f.api.reader.readPose(BAY, f.descriptor.worldRevision),
      /STALE_WORLD_REVISION/,
    );
    const fresh = await f.api.reader.describe();
    assert.notEqual(fresh.worldRevision, f.descriptor.worldRevision);
    assert.equal(
      f.api.reader.readPose(BAY, fresh.worldRevision).clock.seconds,
      10,
    );
  } finally {
    f.api.dispose();
  }
});
