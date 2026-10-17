// Explicit local diagnostic only. Never imported by production or npm test.
import { register, createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const path = process.env.ATLAS_DIAGNOSTIC_BUNDLE;
if (!path) throw new Error('ATLAS_DIAGNOSTIC_BUNDLE must name an already-installed Playwright utilsBundle.js');
const require = createRequire(import.meta.url);
const bundle = require(path);
if (!bundle.ws || !bundle.wsServer) throw new Error('Expected Playwright bundled WebSocket constructors');
console.error('DIAGNOSTIC TRANSPORT ONLY — not ws@8.22.0 certification. Bundle SHA256:',
  createHash('sha256').update(readFileSync(path)).digest('hex'));
register('./diagnostic-loader.mjs', import.meta.url);
