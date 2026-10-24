/** Actual HTTP/TCP and application controller/client tests. Not browser rendering proof. */
import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {setTimeout as delay} from 'node:timers/promises';import WebSocket from 'ws';
import {createStandaloneServer,productionOrigin} from '../server.mjs';import {WORLD,VESSEL_ID} from '../world.mjs';import {BoatController} from '../controller.mjs';import {createGameHost} from '../host.mjs';import {createCoreAdapter} from '../../client/core-adapter.mjs';import {RoomStore,PROTOCOL} from '../../rooms.mjs';
const ORIGIN='http://127.0.0.1:8080';
async function until(fn,timeout=5000){const end=performance.now()+timeout;while(!fn()){if(performance.now()>end)throw Error('TEST_TIMEOUT');await delay(10);}}
async function setup(t){
 const app=createStandaloneServer({origin:ORIGIN}),sockets=[],clients=[],timers=[];app.server.on('connection',s=>sockets.push(s));app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{for(const c of clients)c.a.dispose();for(const x of timers)clearInterval(x);await app.stop();});
 async function client(){const c=new BoatController(),remote=new Map(),statuses=[];
  const host=createGameHost(c,{renderRemote:p=>remote.set(p.entityId,p),removeRemote:id=>remote.delete(id),networkStatus:s=>statuses.push(s.state)});
  const a=await createCoreAdapter({enabled:true,host,world:WORLD,vesselId:VESSEL_ID,endpoint:base.replace('http:','ws:')+'/ws',baseUrl:ORIGIN+'/',webSocketFactory:u=>new WebSocket(u,{origin:ORIGIN})});
  const obj={a,c,host,remote,statuses};clients.push(obj);timers.push(setInterval(()=>{if(!['connecting','joining','reconnecting'].includes(a.info.state))c.step(1/60);a.render();},16));return obj;
 }
 return {app,base,sockets,client};
}
test('one service serves game, model, shared client, world and health; does not serve SeaLab or tests',async t=>{
 const f=await setup(t);for(const url of ['/','/app.mjs','/world.mjs','/controller.mjs','/host.mjs','/assets/runtime.js','/assets/boat.glb','/assets/LICENSES.txt','/client/core-adapter.mjs','/shared/world.mjs','/healthz']){const r=await fetch(f.base+url);assert.equal(r.status,200,url);assert.ok((await r.arrayBuffer()).byteLength>0,url);}
 const r=await fetch(f.base+'/api/config');const d=await r.json();assert.equal(d.world.kind,'standalone');assert.equal(d.seaLabIntegrated,false);
 const page=await fetch(f.base+'/');assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(page.headers.get('referrer-policy'),'no-referrer');
 for(const path of ['/server.mjs','/.env','/tests/c1-final-hook.test.mjs','/atlas_sealab_12/live/app.js','/%2e%2e/server.mjs'])assert.equal((await fetch(f.base+path)).status,404,path);
 assert.equal((await fetch(f.base+'/',{method:'POST'})).status,405);
 const asset=await fetch(f.base+'/assets/boat.glb',{method:'HEAD'});assert.equal((await asset.arrayBuffer()).byteLength,0);assert.equal(Number(asset.headers.get('content-length')),9962552);
 assert.equal((await fetch(f.base+'/assets/boat.glb',{headers:{'If-None-Match':asset.headers.get('etag')}})).status,304);
});
test('production origin only comes from explicit trusted config; no wildcard or origin reflection',()=>{
 assert.equal(productionOrigin({PUBLIC_ORIGIN:'https://atlas.example'}),'https://atlas.example');assert.equal(productionOrigin({RAILWAY_PUBLIC_DOMAIN:'atlas.up.railway.app'}),'https://atlas.up.railway.app');
 assert.equal(productionOrigin({RENDER_EXTERNAL_URL:'https://atlas.onrender.com'}),'https://atlas.onrender.com');assert.throws(()=>productionOrigin({}),/PUBLIC_ORIGIN_REQUIRED/);
 for(const x of ['http://a.example','https://a.example/path','https://user:pass@a.example','https://a.example/'])assert.throws(()=>productionOrigin({PUBLIC_ORIGIN:x}));
});
test('two standalone game controllers exchange actual movement using the existing client/server',{timeout:8000},async t=>{
 const f=await setup(t),a=await f.client(),b=await f.client();assert.equal(f.app.store.sessions.size,0);await a.a.create('Owen');await b.a.join('Crew',a.a.invite());
 assert.notEqual(a.a.info.playerId,b.a.info.playerId);assert.ok(Math.abs(a.c.x-b.c.x)>=30);
 a.c.engine=true;a.c.input({throttle:1,steer:.2});b.c.engine=true;b.c.input({throttle:.7,steer:-.2});const ax=a.c.x,bx=b.c.x;
 await until(()=>a.remote.size===1&&b.remote.size===1&&[...b.remote.values()][0].pose.p[0]>ax+1&&[...a.remote.values()][0].pose.p[0]>bx+.5);
 assert.equal(a.a.info.state,'connected');assert.ok(a.a.stats.sent>8);assert.equal([...a.remote.values()][0].vesselId,VESSEL_ID);
 const before=a.a.stats.sent;b.a.leave();await until(()=>a.remote.size===0);await delay(100);assert.ok(a.a.stats.sent>before);assert.equal(b.a.info.state,'idle');assert.equal(b.remote.size,0);
});
test('standalone reconnect preserves player identity, stops velocity, and removes stale status',{timeout:8000},async t=>{
 const f=await setup(t),a=await f.client(),b=await f.client();await a.a.create('A');await b.a.join('B',a.a.invite());await until(()=>b.remote.size===1);const id=a.a.info.playerId;
 a.c.engine=true;a.c.input({throttle:.8});await delay(250);
 // Websocket-only connections are the first sockets here; no HTTP request was made.
 f.sockets[0].destroy();await until(()=>a.statuses.includes('reconnecting'));await until(()=>a.a.stats.reconnects===1&&a.a.info.state==='connected');
 assert.equal(a.a.info.playerId,id);assert.equal(a.c.throttle,0);assert.equal(a.c.speed,0);await until(()=>b.remote.size===1&&![...b.remote.values()][0].stale);
});
test('separate private rooms do not exchange entities',{timeout:6000},async t=>{
 const f=await setup(t),a=await f.client(),b=await f.client();await a.a.create('A');await b.a.create('B');await delay(400);assert.equal(a.remote.size,0);assert.equal(b.remote.size,0);assert.equal(f.app.store.rooms.size,2);
});
test('unsupported origins and oversized frames rejected by standalone service',async t=>{
 const f=await setup(t);const denied=new WebSocket(f.base.replace('http:','ws:')+'/ws',{origin:'https://attacker.example'});
 const [e]=await once(denied,'error');assert.match(e.message,/403/);
 const ws=new WebSocket(f.base.replace('http:','ws:')+'/ws',{origin:ORIGIN});ws.on('error',()=>{});await once(ws,'open');const closed=once(ws,'close');ws.send('x'.repeat(4097));assert.equal((await closed)[0],1009);
});
test('standalone spawns reserve distinct slots and skip locations occupied by moving peers',()=>{
 const s=new RoomStore({world:WORLD});const hello=(action='create',extra={})=>({protocol:PROTOCOL,action,name:'A',vesselId:VESSEL_ID,worldId:WORLD.worldId,worldRevision:WORLD.worldRevision,worldHash:s.worldHash,...extra});
 const a=s.enter('a',hello());const target=WORLD.vessels[VESSEL_ID].spawns[1];s.update('a',{type:'state',seq:0,pose:{p:target.p,q:target.q,rpm:0,gear:0,engine:false},clock:{domain:'client-simulation',epoch:0,seconds:0}});
 const b=s.enter('b',hello('join',{roomId:a.roomId,key:a.key}));assert.equal(b.slot,2);assert.throws(()=>s.update('b',{type:'state',seq:0,pose:b.selfPose}),/SOURCE_CLOCK_REQUIRED/);
});
test('single-player runs without sockets or SeaLab and leave returns saved local position',async t=>{
 const f=await setup(t),a=await f.client();a.c.engine=true;a.c.input({throttle:.6});await delay(250);assert.ok(a.c.speed>0);assert.equal(f.app.store.sessions.size,0);
 const original=a.c.save();await a.a.create('Solo');assert.notEqual(a.c.x,original.x);a.a.leave();assert.ok(Math.abs(a.c.x-original.x)<1);assert.equal(a.a.info.state,'idle');
});
