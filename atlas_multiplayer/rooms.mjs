/** Atlas D cooperative multiplayer, protocol 3. No authoritative boat physics. */
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { PROTOCOL, canonical, validateWorld, validatePose, nextSourceClock } from './shared/world.mjs';
export { PROTOCOL, validatePose } from './shared/world.mjs';

const token = () => randomBytes(24).toString('base64url');
const fail = (code) => { throw new Error(code); };
const same = (a, b) => typeof a === 'string' && typeof b === 'string' &&
  /^[A-Za-z0-9_-]{32}$/.test(a) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
/** Token bucket: bounded burst, monotonic clock injected by the caller. */
export class Bucket {
  constructor(rate, capacity, now) { this.rate = rate; this.capacity = capacity; this.tokens = capacity; this.at = now; }
  take(now) {
    this.tokens = Math.min(this.capacity, this.tokens + Math.max(0, now - this.at) * this.rate / 1000);
    this.at = Math.max(this.at, now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

export class RoomStore {
  constructor({ now = () => performance.now(), maxRooms = 32, maxPlayers = 8,
    graceMs = 30000, roomTtlMs = 21600000, emptyTtlMs = 60000,
    world, allowFixture = false } = {}) {
    this.world = validateWorld(world, {allowFixture});
    this.worldHash = createHash('sha256').update(canonical(this.world)).digest('hex');
    this.worldId = this.world.worldId; this.worldRevision = this.world.worldRevision;
    Object.assign(this, { now, maxRooms, maxPlayers: Math.min(maxPlayers, this.world.capacity), graceMs, roomTtlMs, emptyTtlMs });
    this.rooms = new Map();
    this.sessions = new Map();
  }
  checkHello(hello) {
    if (!hello || hello.protocol !== PROTOCOL) fail('VERSION_MISMATCH');
    if (hello.worldId !== this.worldId || hello.worldRevision !== this.worldRevision || hello.worldHash !== this.worldHash) fail('WORLD_MISMATCH');
    if (!Object.hasOwn(this.world.vessels, hello.vesselId || '')) fail('VESSEL_MISMATCH');
    if (typeof hello.name !== 'string' || !hello.name.trim() || [...hello.name].length > 24 ||
        /[\x00-\x1f\x7f<>]/.test(hello.name)) fail('BAD_NAME');
    return hello.name.normalize('NFC').trim();
  }
  enter(connectionId, hello) {
    if (this.sessions.has(connectionId)) fail('ALREADY_JOINED');
    const name = this.checkHello(hello);
    let room, player;
    if (hello.action === 'create') {
      if (this.rooms.size >= this.maxRooms) fail('SERVER_FULL');
      const id = randomBytes(8).toString('hex');
      room = { id, key: token(), createdAt: this.now(), emptyAt: null,
        seed: randomBytes(4).readUInt32LE(), hostId: null, players: new Map() };
      this.rooms.set(id, room);
    } else if (hello.action === 'join' || hello.action === 'resume') {
      room = this.rooms.get(hello.roomId);
      if (!room || this.now() - room.createdAt >= this.roomTtlMs ||
          (room.emptyAt !== null && this.now() - room.emptyAt >= this.emptyTtlMs) ||
          !same(hello.key, room.key)) fail('ROOM_UNAVAILABLE');
      if (hello.action === 'resume') {
        player = room.players.get(hello.playerId);
        if (!player || !same(hello.resumeToken, player.resumeToken)) fail('SESSION_EXPIRED');
        if (hello.vesselId !== player.vesselId) fail('VESSEL_MISMATCH');
        if (player.connectionId !== null) fail('SESSION_ACTIVE');
        if (this.now() - player.disconnectedAt > this.graceMs) fail('SESSION_EXPIRED');
      }
    } else fail('BAD_ACTION');
    if (!player) {
      if (room.players.size >= this.maxPlayers) fail('ROOM_FULL');
      const occupied = new Set([...room.players.values()].map(p => p.slot));
      const slot = Array.from({length: this.maxPlayers}, (_,i) => i).find(i => {
        if (occupied.has(i)) return false;
        if (this.world.kind !== 'standalone') return true;
        const p=this.world.vessels[hello.vesselId].spawns[i].p;
        return [...room.players.values()].every(other=>Math.hypot(p[0]-other.pose.p[0],p[2]-other.pose.p[2])>=14);
      });
      if (slot === undefined) fail('SPAWN_OCCUPIED');
      const spawn = this.world.vessels[hello.vesselId].spawns[slot];
      player = { id: token(), name, vesselId: hello.vesselId, slot, spawn, resumeToken: token(), connectionId: null,
        disconnectedAt: null, sequence: -1, clock: null, pose: validatePose({p:spawn.p,q:spawn.q,engine:false,rpm:0,gear:0}), updatedAt: this.now(),
        bucket: new Bucket(25, 40, this.now()) };
      player.entityId = 'boat:' + player.id;
      room.players.set(player.id, player);
    }
    player.connectionId = connectionId;
    player.disconnectedAt = null;
    room.emptyAt = null;
    room.hostId ||= player.id;
    this.sessions.set(connectionId, { roomId: room.id, playerId: player.id });
    return { type: 'welcome', protocol: PROTOCOL, roomId: room.id, key: room.key,
      playerId: player.id, resumeToken: player.resumeToken, nextSequence: player.sequence + 1,
      worldId: this.worldId, worldRevision: this.worldRevision, worldHash: this.worldHash, seed: room.seed,
      vesselId: player.vesselId, entityId: player.entityId, slot: player.slot, spawn: structuredClone(player.spawn),
      resumed: hello.action === 'resume', selfClock: player.clock ? structuredClone(player.clock) : null,
      roomCreatedAt: room.createdAt, serverTime: this.now(), selfPose: player.pose ? structuredClone(player.pose) : null,
      maxPlayers: this.maxPlayers, graceMs: this.graceMs, physicsAuthority: 'client-owned' };
  }
  update(connectionId, message) {
    const session = this.sessions.get(connectionId);
    if (!session) fail('NOT_JOINED');
    const room = this.rooms.get(session.roomId), player = room?.players.get(session.playerId);
    if (!player || player.connectionId !== connectionId) fail('SESSION_EXPIRED');
    if (!player.bucket.take(this.now())) fail('RATE_LIMIT');
    if (!message || Object.keys(message).some(k => !['type', 'seq', 'pose', 'clock'].includes(k)) ||
        message.type !== 'state' || !Number.isSafeInteger(message.seq) || message.seq < 0) fail('BAD_STATE');
    if (message.seq <= player.sequence) return false;
    const pose = validatePose(message.pose);
    const clock = nextSourceClock(player.clock, message.clock ?? null);
    if (['core','standalone'].includes(this.world.kind) && clock === null) fail('SOURCE_CLOCK_REQUIRED');
    Object.assign(player, { pose, clock, sequence: message.seq, updatedAt: this.now() });
    return true;
  }
  disconnect(connectionId, abandon = false) {
    const session = this.sessions.get(connectionId);
    if (!session) return;
    this.sessions.delete(connectionId);
    const room = this.rooms.get(session.roomId), player = room?.players.get(session.playerId);
    if (!room || !player || player.connectionId !== connectionId) return;
    player.connectionId = null;
    player.disconnectedAt = this.now();
    if (abandon) room.players.delete(player.id);
    if (![...room.players.values()].some(p => p.connectionId !== null)) room.emptyAt ??= this.now();
    this.electHost(room);
  }
  electHost(room) {
    if (room.players.get(room.hostId)?.connectionId !== null && room.players.has(room.hostId)) return;
    room.hostId = [...room.players.values()].find(p => p.connectionId !== null)?.id || null;
  }
  sweep() {
    const expiredConnections = [];
    for (const [id, room] of this.rooms) {
      for (const [pid, player] of room.players) {
        if (player.connectionId === null && this.now() - player.disconnectedAt > this.graceMs) room.players.delete(pid);
      }
      this.electHost(room);
      if (this.now() - room.createdAt >= this.roomTtlMs ||
          (room.emptyAt !== null && this.now() - room.emptyAt >= this.emptyTtlMs)) {
        for (const p of room.players.values()) if (p.connectionId !== null) {
          expiredConnections.push(p.connectionId); this.sessions.delete(p.connectionId);
        }
        this.rooms.delete(id);
      }
    }
    return expiredConnections;
  }
  snapshot(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return { type: 'snapshot', protocol: PROTOCOL, roomId, serverTime: this.now(), hostId: room.hostId,
      players: [...room.players.values()].map(p => ({ id: p.id, name: p.name,
        entityId: p.entityId, vesselId: p.vesselId, slot: p.slot,
        connected: p.connectionId !== null, seq: p.sequence, updatedAt: p.updatedAt,
        pose: p.pose ? structuredClone(p.pose) : null, clock: p.clock ? structuredClone(p.clock) : null })) };
  }
}
