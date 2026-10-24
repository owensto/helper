import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const here=new URL('.',import.meta.url),read=p=>readFileSync(new URL(p,here),'utf8');
const app=read('app.mjs'),html=read('index.html');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('public entry has an honest solo status and no invitation controls',()=>{
 assert.match(html,/Solo preview · Multiplayer unavailable/);assert.match(html,/not passed rendered browser acceptance/);
 assert.doesNotMatch(html,/Create room|Join room|Copy invitation|STANDALONE CO-OP/);
});
test('published app contains no socket, room adapter or remote membership creation',()=>{
 assert.doesNotMatch(app,/WebSocket|RTCPeerConnection|createCoreAdapter|mountInviteControls|createGameHost|adapter\.|\/ws/);
 assert.match(app,/multiplayerAvailable:false/);
});
test('all HTML resources, app imports and model URL resolve to existing files',()=>{
 const paths=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
 paths.push(...[...app.matchAll(/from '([^']+)'/g)].map(m=>m[1]));
 paths.push('../standalone/public/assets/boat.glb');
 for(const p of paths){assert.ok(p.startsWith('./')||p.startsWith('../'),p);assert.ok(existsSync(new URL(p,here)),p);}
});
test('all fixed DOM IDs used by the entry exist in the HTML',()=>{
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),m[1]);
});
test('original S1 game entry was not modified',()=>{
 const b=readFileSync(new URL('../standalone/public/app.mjs',here));assert.equal(blob(b),'c2d58e8973256ec7d2d6fb706f8869eb5d6076d1');
});
test('unmodified runtime exposes every scene type used in this preview',()=>{
 const c=vm.createContext({console,TextEncoder,TextDecoder,URL,AbortController});c.self=c;c.window=c;
 vm.runInContext(read('../standalone/public/assets/runtime.js'),c);
 const used=new Set([...app.matchAll(/new T\.([A-Za-z0-9_]+)\(/g)].map(m=>m[1]));
 for(const name of used)assert.equal(typeof c.ATLASRuntime[name],'function',name);
});
test('original GLB has valid v2 structure and no external buffer/image URL dependency',()=>{
 const b=readFileSync(new URL('../standalone/public/assets/boat.glb',here));
 assert.equal(blob(b),'72fe90a7a52a00ed6ba13baa4a00636906e47219');
 assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const n=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+n));assert.equal(g.asset.version,'2.0');
 for(const ref of [...(g.buffers||[]),...(g.images||[])])assert.ok(!ref.uri||ref.uri.startsWith('data:'),'External model URL');
 assert.ok(g.meshes.length>100);
});
test('keyboard focus is restored after controls and no remote clock is invoked',()=>{
 assert.match(html,/<canvas id="sea" tabindex="0"/);assert.match(app,/focus\(\{preventScroll:true\}\)/);
 assert.match(app,/stepper\.advance\(dt\)/);assert.doesNotMatch(app,/setInterval\(|setTimeout\(/);
});
