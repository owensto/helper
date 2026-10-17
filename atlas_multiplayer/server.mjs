/** Standalone room transport. Deploy a single replica; TLS terminates at the host. */
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { Bucket, PROTOCOL, RoomStore } from './rooms.mjs';

export function createMultiplayerServer({ origins, maxConnections = 128, roomOptions = {}, httpHandler = null } = {}) {
  if (!Array.isArray(origins) || !origins.length || origins.includes('*')) throw new Error('Explicit origins required');
  const allowed = new Set(origins.map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) throw new Error('Invalid origin');
    return value;
  }));
  const store = new RoomStore(roomOptions), peers = new Map();
  const upgrades = new Bucket(20, 40, performance.now());
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'atlas-multiplayer', protocol: PROTOCOL }));
    } else if (httpHandler) {
      try { httpHandler(req, res); } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
    } else { res.writeHead(404); res.end('Not found'); }
  });
  server.headersTimeout = 5000; server.requestTimeout = 10000; server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  const closing = new WeakSet();
  const close = (ws, code, reason) => {
    if (ws.readyState === WebSocket.CLOSED || closing.has(ws)) return;
    closing.add(ws);
    ws.close(code, reason);
    const timer = setTimeout(() => ws.terminate(), 1500); timer.unref();
    ws.once('close', () => clearTimeout(timer));
  };
  const send = (ws, value) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 65536) { close(ws, 4008, 'SLOW_CONSUMER'); return; }
    ws.send(JSON.stringify(value), error => { if (error) ws.terminate(); });
  };
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    if (req.url !== '/ws' || !allowed.has(req.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return;
    }
    if (peers.size >= maxConnections || !upgrades.take(performance.now())) {
      socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    const id = randomUUID(); peers.set(id, ws);
    let joined = false, left = false;
    const inbound = new Bucket(40, 60, performance.now());
    const helloTimer = setTimeout(() => close(ws, 4000, 'HELLO_TIMEOUT'), 5000); helloTimer.unref();
    ws.alive = true; ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', (raw, binary) => {
      try {
        if (left || closing.has(ws)) return;
        if (binary) throw new Error('TEXT_ONLY');
        if (!inbound.take(performance.now())) throw new Error('RATE_LIMIT');
        const message = JSON.parse(raw.toString());
        if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('BAD_MESSAGE');
        if (!joined) {
          const welcome = store.enter(id, message);
          joined = true; clearTimeout(helloTimer); send(ws, welcome);
          send(ws, store.snapshot(welcome.roomId));
        } else if (message.type === 'state') store.update(id, message);
        else if (message.type === 'ping') {
          if (!Number.isFinite(message.clientTime)) throw new Error('BAD_MESSAGE');
          send(ws, { type: 'pong', clientTime: message.clientTime, serverTime: performance.now() });
        } else if (message.type === 'leave') {
          left = true; store.disconnect(id, true); close(ws, 1000, 'LEFT');
        } else throw new Error('BAD_MESSAGE');
      } catch (error) {
        // Do not expose exception details, messages, tokens, or stack traces to peers.
        const known = new Set(['VERSION_MISMATCH','WORLD_MISMATCH','VESSEL_MISMATCH','BAD_NAME','ALREADY_JOINED','SERVER_FULL',
          'ROOM_UNAVAILABLE','SESSION_EXPIRED','SESSION_ACTIVE','BAD_ACTION','ROOM_FULL','NOT_JOINED',
          'SPAWN_OCCUPIED','RATE_LIMIT','BAD_STATE','BAD_POSE','TEXT_ONLY','BAD_MESSAGE','BAD_SOURCE_CLOCK','SOURCE_CLOCK_REGRESSION','SOURCE_CLOCK_REQUIRED']);
        const code = known.has(error.message) ? error.message : 'BAD_MESSAGE';
        send(ws, { type: 'error', code }); close(ws, 4000, code);
      }
    });
    ws.on('close', () => { clearTimeout(helloTimer); peers.delete(id); store.disconnect(id); });
  });
  const tick = setInterval(() => {
    for (const id of store.sweep()) { const ws = peers.get(id); if (ws) close(ws, 4001, 'ROOM_EXPIRED'); }
    for (const room of store.rooms.values()) {
      const snapshot = store.snapshot(room.id);
      for (const p of room.players.values()) { const ws = peers.get(p.connectionId); if (ws) send(ws, snapshot); }
    }
  }, 100); tick.unref();
  const heartbeat = setInterval(() => {
    for (const ws of peers.values()) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; if (ws.readyState === WebSocket.OPEN) ws.ping();
    }
  }, 10000); heartbeat.unref();
  async function stop() {
    clearInterval(tick); clearInterval(heartbeat);
    for (const ws of peers.values()) ws.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
  return { server, store, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!process.env.ATLAS_WORLD_CONFIG) throw new Error('ATLAS_WORLD_CONFIG is required; no legacy world fallback');
  const world = JSON.parse(readFileSync(process.env.ATLAS_WORLD_CONFIG, 'utf8'));
  const { server, stop } = createMultiplayerServer({ origins, roomOptions: { world } });
  server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Atlas multiplayer listening'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    stop().then(() => process.exit(0), () => process.exit(1));
  });
}
