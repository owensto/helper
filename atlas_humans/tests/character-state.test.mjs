import { test } from "node:test";
import assert from "node:assert/strict";
import { readRemoteCharacter } from "../src/character-state.mjs";
const authority = {
    characterId: "player-1",
    vesselId: "yacht",
    geometryRevision: "r7",
    simulationEpoch: "host-epoch-1",
  },
  value = {
    ...authority,
    version: 1,
    animationRevision: "rocketbox-captain-v1",
    sequence: 2,
    time: 10,
    mode: "helm",
    localPosition: [20, 8, 0],
    lean: [0, 0],
  };
test("remote pose accepts only expected identity/geometry and increasing sequence", () => {
  assert.equal(readRemoteCharacter(value, authority).valid, true);
  for (const v of [
    { ...value, characterId: "other" },
    { ...value, geometryRevision: "bay" },
    { ...value, localPosition: [NaN, 0, 0] },
    { ...value, lean: [Infinity, 0] },
    { ...value, mode: "driveBoat" },
    { ...value, simulationEpoch: "old" },
  ])
    assert.equal(readRemoteCharacter(v, authority).valid, false);
  assert.equal(
    readRemoteCharacter(value, { ...authority, afterSequence: 2 }).valid,
    false,
  );
});
