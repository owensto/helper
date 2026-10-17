import test from 'node:test';
import assert from 'node:assert/strict';
import { Bucket, PROTOCOL, RoomStore, validatePose } from '../rooms.mjs';
import { FIXTURE_WORLD, FIXTURE_VESSEL } from './fixtures/world.mjs';
import { worldFingerprint } from '../shared/world.mjs';
const fixtureHash=await worldFingerprint(FIXTURE_WORLD);
const pose = () => ({ p: [1, 0, 2], q: [0, 0, 0, 1], engine: true, rpm: 1000, gear: 1 });
const hello = (action = 'create', extra = {}) => ({ protocol: PROTOCOL, action,
  worldId: FIXTURE_WORLD.worldId, worldRevision: FIXTURE_WORLD.worldRevision, worldHash: fixtureHash, vesselId: FIXTURE_VESSEL, name: 'Owen', ...extra });
function setup(options = {}) { let time = 1000; const store = new RoomStore({ now: () => time, world: FIXTURE_WORLD, allowFixture: true, ...options });
  return { store, advance: n => { time += n; }, host: () => store.enter('a', hello()) }; }
const join = h => hello('join', { roomId: h.roomId, key: h.key, name: 'Crew' });
const resume = h => hello('resume', { ...h, action: 'resume', protocol: PROTOCOL, name: 'Owen' });

test('create/join have distinct identities, one host, shared world seed', () => {
  const { store, host } = setup(); const a = host(), b = store.enter('b', join(a));
  assert.notEqual(a.playerId, b.playerId); assert.equal(a.seed, b.seed);
  assert.equal(store.snapshot(a.roomId).players.length, 2); assert.equal(store.snapshot(a.roomId).hostId, a.playerId);
});
test('invitation is mandatory, wrong or non-ASCII token is rejected safely', () => {
  const { store, host } = setup(); const a = host();
  for (const key of ['', 'bad', 'é'.repeat(32)]) assert.throws(() => store.enter('b', join({ ...a, key })), /ROOM_UNAVAILABLE/);
});
test('protocol and world mismatches cannot enter', () => {
  const { store } = setup();
  assert.throws(() => store.enter('a', hello('create', { protocol: 'old' })), /VERSION_MISMATCH/);
  assert.throws(() => store.enter('a', hello('create', { worldRevision: 'sealab12' })), /WORLD_MISMATCH/);
  assert.equal(store.rooms.size, 0);
});
test('room capacity includes reconnect reservations', () => {
  const { store, host } = setup({ maxPlayers: 2 }); const a = host(); store.enter('b', join(a)); store.disconnect('b');
  assert.throws(() => store.enter('c', join(a)), /ROOM_FULL/);
});
test('resume retains identity and pose without duplicate boats', () => {
  const { store, host } = setup(); const a = host(); store.update('a', { type: 'state', seq: 7, pose: pose() });
  store.disconnect('a'); const again = store.enter('c', resume(a));
  assert.equal(again.playerId, a.playerId); assert.equal(again.nextSequence, 8); assert.deepEqual(again.selfPose, pose());
  assert.equal(store.snapshot(a.roomId).players.length, 1);
});
test('connected identity cannot be taken over and wrong resume secret fails', () => {
  const { store, host } = setup(); const a = host();
  assert.throws(() => store.enter('c', resume(a)), /SESSION_ACTIVE/);
  store.disconnect('a'); assert.throws(() => store.enter('c', resume({ ...a, resumeToken: 'bad' })), /SESSION_EXPIRED/);
});
test('resume expires after grace period', () => {
  const { store, host, advance } = setup(); const a = host(); store.disconnect('a'); advance(30001);
  assert.throws(() => store.enter('b', resume(a)), /SESSION_EXPIRED/);
});
test('unknown owner fields are rejected and other boat state remains unchanged', () => {
  const { store, host } = setup(); const a = host(), b = store.enter('b', join(a));
  assert.throws(() => store.update('a', { type: 'state', seq: 0, pose: pose(), playerId: b.playerId }), /BAD_STATE/);
  assert.deepEqual(store.snapshot(a.roomId).players.find(p => p.id === b.playerId).pose, b.selfPose);
});
test('states require a joined connection and monotonically increasing sequence', () => {
  const { store, host } = setup(); host();
  assert.throws(() => store.update('other', { type: 'state', seq: 0, pose: pose() }), /NOT_JOINED/);
  assert.equal(store.update('a', { type: 'state', seq: 2, pose: pose() }), true);
  assert.equal(store.update('a', { type: 'state', seq: 1, pose: pose() }), false);
});
test('invalid transforms, non-finite data and oversized controls are rejected', () => {
  for (const bad of [{p:[NaN,0,0]}, {p:[Infinity,0,0]}, {p:[100001,0,0]}, {q:[0,0,0,0]}, {q:[0,0,0,2]},
    {rpm:10001}, {rpm:-1}, {gear:2}, {engine:1}, {damage:100}, {p:[true,0,0]}]) {
    assert.throws(() => validatePose({ ...pose(), ...bad }), /BAD_POSE/);
  }
});
test('snapshots and inbound poses cannot mutate server data', () => {
  const { store, host } = setup(); const a = host(), p = pose(); store.update('a', { type:'state', seq:0, pose:p });
  p.p[0] = 999; const snap = store.snapshot(a.roomId); assert.equal(snap.players[0].pose.p[0], 1);
  snap.players[0].pose.p[0] = 999; assert.equal(store.snapshot(a.roomId).players[0].pose.p[0], 1);
});
test('room broadcasts never contain invitation keys or resume secrets', () => {
  const { store, host } = setup(); const a = host(), s = JSON.stringify(store.snapshot(a.roomId));
  assert.ok(!s.includes(a.key)); assert.ok(!s.includes(a.resumeToken));
});
test('state flooding is bounded and refills with time', () => {
  const { store, host, advance } = setup(); host();
  for (let i=0;i<40;i++) store.update('a',{type:'state',seq:i,pose:pose()});
  assert.throws(() => store.update('a',{type:'state',seq:40,pose:pose()}), /RATE_LIMIT/);
  advance(1000); assert.equal(store.update('a',{type:'state',seq:41,pose:pose()}), true);
});
test('host disconnect elects a connected player; leaving frees the seat', () => {
  const { store, host } = setup(); const a = host(), b = store.enter('b',join(a)); store.disconnect('a',true);
  assert.equal(store.snapshot(a.roomId).hostId,b.playerId); assert.equal(store.snapshot(a.roomId).players.length,1);
});
test('room expiry removes sessions and returns connections to close', () => {
  const { store, host, advance } = setup({roomTtlMs:5000}); host(); advance(5001);
  assert.deepEqual(store.sweep(), ['a']); assert.equal(store.rooms.size,0); assert.equal(store.sessions.size,0);
});
test('empty rooms expire and total room count is bounded', () => {
  const { store, host, advance } = setup({maxRooms:1}); host();
  assert.throws(() => store.enter('b',hello()), /SERVER_FULL/); store.disconnect('a'); advance(60001); store.sweep();
  assert.equal(store.rooms.size,0); assert.ok(store.enter('b',hello()).roomId);
});
test('token bucket cannot gain tokens from a backward clock step', () => {
  const bucket=new Bucket(1,1,1000); assert.equal(bucket.take(1000),true); assert.equal(bucket.take(900),false); assert.equal(bucket.take(1000),false);
});

test('joining cannot consume expiry notifications needed to close old sockets', () => {
  const { store, host, advance } = setup({roomTtlMs:5000}); const a=host(); advance(5001);
  assert.throws(() => store.enter('b',join(a)), /ROOM_UNAVAILABLE/);
  assert.deepEqual(store.sweep(),['a']);
});
