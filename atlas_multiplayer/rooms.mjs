/** Atlas D cooperative multiplayer, protocol 1. No authoritative boat physics. */
import { randomBytes, timingSafeEqual } from 'node:crypto';

export const PROTOCOL = 'atlas-net-1';
const token = () => randomBytes(24).toString('base64url');
const fail = (code) => { throw new Error(code); };
const same = (a, b) => typeof a === 'string' && typeof b === 'string' &&
  /^[A-Za-z0-9_-]{32}$/.test(a) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const identifier = (s) => typeof s === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(s);
const number = (n, limit) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit;
const vector = (v, length, limit) => Array.isArray(v) && v.length === length && v.every(n => number(n, limit));

export function validatePose(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('BAD_POSE');
  if (Object.keys(value).some(k => !['p', 'q', 'engine', 'rpm', 'gear'].includes(k))) fail('BAD_POSE');
  if (!vector(value.p, 3, 100000) || !vector(value.q, 4, 1.001)) fail('BAD_POSE');
  const norm = Math.hypot(...value.q);
  if (Math.abs(norm - 1) > 0.01 || typeof value.engine !== 'boolean' ||
      !number(value.rpm, 10000) || value.rpm < 0 || ![-1, 0, 1].includes(value.gear)) fail('BAD_POSE');
  return { p: [...value.p], q: value.q.map(n => n / norm), engine: value.engine, rpm: value.rpm, gear: value.gear };
}

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
    worldId = 'practice-bay', worldRevision = 'sealab11' } = {}) {
    if (!identifier(worldId) || !identifier(worldRevision)) fail('BAD_WORLD_CONFIG');
    Object.assign(this, { now, maxRooms, maxPlayers, graceMs, roomTtlMs, emptyTtlMs, worldId, worldRevision });
    this.rooms = new Map();
    this.sessions = new Map();
  }
  checkHello(hello) {
    if (!hello || hello.protocol !== PROTOCOL) fail('VERSION_MISMATCH');
    if (hello.worldId !== this.worldId || hello.worldRevision !== this.worldRevision) fail('WORLD_MISMATCH');
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
        if (player.connectionId !== null) fail('SESSION_ACTIVE');
        if (this.now() - player.disconnectedAt > this.graceMs) fail('SESSION_EXPIRED');
      }
    } else fail('BAD_ACTION');
    if (!player) {
      if (room.players.size >= this.maxPlayers) fail('ROOM_FULL');
      player = { id: token(), name, resumeToken: token(), connectionId: null,
        disconnectedAt: null, sequence: -1, pose: null, updatedAt: null,
        bucket: new Bucket(25, 40, this.now()) };
      room.players.set(player.id, player);
    }
    player.connectionId = connectionId;
    player.disconnectedAt = null;
    room.emptyAt = null;
    room.hostId ||= player.id;
    this.sessions.set(connectionId, { roomId: room.id, playerId: player.id });
    return { type: 'welcome', protocol: PROTOCOL, roomId: room.id, key: room.key,
      playerId: player.id, resumeToken: player.resumeToken, nextSequence: player.sequence + 1,
      worldId: this.worldId, worldRevision: this.worldRevision, seed: room.seed,
      roomCreatedAt: room.createdAt, serverTime: this.now(), selfPose: player.pose ? structuredClone(player.pose) : null,
      maxPlayers: this.maxPlayers, graceMs: this.graceMs, physicsAuthority: 'client-owned' };
  }
  update(connectionId, message) {
    const session = this.sessions.get(connectionId);
    if (!session) fail('NOT_JOINED');
    const room = this.rooms.get(session.roomId), player = room?.players.get(session.playerId);
    if (!player || player.connectionId !== connectionId) fail('SESSION_EXPIRED');
    if (!player.bucket.take(this.now())) fail('RATE_LIMIT');
    if (!message || Object.keys(message).some(k => !['type', 'seq', 'pose'].includes(k)) ||
        message.type !== 'state' || !Number.isSafeInteger(message.seq) || message.seq < 0) fail('BAD_STATE');
    if (message.seq <= player.sequence) return false;
    const pose = validatePose(message.pose);
    Object.assign(player, { pose, sequence: message.seq, updatedAt: this.now() });
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
        connected: p.connectionId !== null, seq: p.sequence, updatedAt: p.updatedAt,
        pose: p.pose ? structuredClone(p.pose) : null })) };
  }
}
