import { test } from "node:test";
import assert from "node:assert/strict";
import { characterSnapshot } from "../src/contact.mjs";
import { readRemoteCharacter } from "../src/character-state.mjs";
const pose = {
  vesselId: "bay",
  geometryRevision: "contact-1",
  mode: "helm",
  time: 1,
  seat: [0, 0.6, 0],
  lean: [0, 0],
};
test("H3 publisher rejects absent vessel and geometry identities", () => {
  const missing = { ...pose };
  delete missing.vesselId;
  delete missing.geometryRevision;
  assert.throws(() => characterSnapshot("player-1", missing, 0, "epoch-1"));
  for (const key of ["vesselId", "geometryRevision"])
    for (const bad of [undefined, null, "", " ", 3])
      assert.throws(
        () =>
          characterSnapshot("player-1", { ...pose, [key]: bad }, 0, "epoch-1"),
        key + String(bad),
      );
});
test("H3 published valid state roundtrips through receiver bounds", () => {
  const packet = characterSnapshot("player-1", pose, 0, "epoch-1");
  assert.equal(
    readRemoteCharacter(packet, {
      characterId: "player-1",
      vesselId: "bay",
      geometryRevision: "contact-1",
      simulationEpoch: "epoch-1",
    }).valid,
    true,
  );
  for (const bad of [
    { ...pose, time: -1 },
    { ...pose, seat: [1000, 0, 0] },
    { ...pose, lean: [0.6, 0] },
    null,
  ])
    assert.throws(() => characterSnapshot("player-1", bad, 0, "epoch-1"));
});
