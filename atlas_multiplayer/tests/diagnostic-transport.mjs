import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bundle = require(process.env.ATLAS_DIAGNOSTIC_BUNDLE);
export const WebSocket = bundle.ws;
export const WebSocketServer = bundle.wsServer;
export default WebSocket;
