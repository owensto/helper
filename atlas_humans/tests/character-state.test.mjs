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

test("H3 rejects identities missing from both packet and expected context", () => {
  const packet = { ...value },
    expected = { ...authority };
  for (const key of ["characterId", "vesselId", "geometryRevision"]) {
    delete packet[key];
    delete expected[key];
  }
  assert.equal(readRemoteCharacter(packet, expected).valid, false);
});
test("H3 rejects empty identities on both packet and expected context", () => {
  for (const key of ["characterId", "vesselId", "geometryRevision"]) {
    for (const bad of ["", "   ", null, undefined, 7])
      assert.equal(
        readRemoteCharacter(
          { ...value, [key]: bad },
          { ...authority, [key]: bad },
        ).valid,
        false,
        key + String(bad),
      );
  }
});
test("H3 rejects NaN and malformed sequence cursors before comparison", () => {
  for (const afterSequence of [NaN, Infinity, -Infinity, -2, 0.5, "1", null])
    assert.equal(
      readRemoteCharacter(value, { ...authority, afterSequence }).valid,
      false,
      String(afterSequence),
    );
  assert.equal(
    readRemoteCharacter(value, { ...authority, afterSequence: -1 }).valid,
    true,
  );
  assert.equal(
    readRemoteCharacter(value, { ...authority, afterSequence: 1 }).valid,
    true,
  );
});
test("H3 missing expected context rejects without throwing", () => {
  for (const expected of [undefined, null, {}, 7]) {
    let result;
    assert.doesNotThrow(() => (result = readRemoteCharacter(value, expected)));
    assert.equal(result.valid, false);
  }
});
