// A real release gate. Never synthesizes package metadata or reports an unaudited install as safe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
assert.equal(pkg.dependencies.ws,'8.22.0','Transport version must remain exactly pinned');
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url)));
assert.equal(lock.lockfileVersion,3);
assert.equal(lock.packages[''].dependencies.ws,'8.22.0');
const ws=lock.packages['node_modules/ws'];
assert.equal(ws.version,'8.22.0');
assert.equal(ws.resolved,'https://registry.npmjs.org/ws/-/ws-8.22.0.tgz');
assert.match(ws.integrity,/^sha512-[A-Za-z0-9+/]+={0,2}$/);
assert.equal(require('ws/package.json').version,'8.22.0');
assert.equal(process.env.ATLAS_DIAGNOSTIC_BUNDLE,undefined,'Diagnostic transport is not release certification');
console.log('Pinned transport metadata/lockfile gate PASS; npm ci must independently verify tarball integrity.');
