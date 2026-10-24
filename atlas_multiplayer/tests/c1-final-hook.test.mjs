/** NONBROWSER: unmodified final C1 with original runtime/math, through actual MP modules.
 * Synthetic scene/state inputs, NOT gameplay, safe placement, browser or production proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createHarness,descriptor,inputEvidence,OWNER_SHA,BAY} from './owner-fixtures/c1-final/runtime-harness.mjs';
import {createC1PoseReceiver} from '../client/c1-reader.mjs';
import {createCoreAdapter} from '../client/core-adapter.mjs';
import {createMultiplayerServer} from '../server.mjs';
import {FIXTURE_WORLD,FIXTURE_VESSEL} from './fixtures/world.mjs';
const ORIGIN='http://127.0.0.1:3000';
async function bind(h,id='a'.repeat(32)){
  const d=await h.api.reader.describe();
  return createC1PoseReceiver({reader:h.api.reader,ownerSourceSha:OWNER_SHA,worldRevision:d.worldRevision,
    vesselId:BAY,playerId:id,entityId:'boat:'+id});
}
async function unit(t){const h=createHarness();await h.attach();t.after(()=>h.dispose());return h;}
async function until(predicate,render=()=>{},ms=4000){
  const end=performance.now()+ms;
  while(true){render();if(predicate())return;if(performance.now()>end)throw Error('CONDITION_TIMEOUT');await delay(10);}
}
test('P1: genuine attach verifies all 20 original assets with native hashes',async t=>{
  const h=await unit(t);assert.equal(inputEvidence.originalAssetsVerified,20);
  assert.deepEqual([...h.assetReads].sort(),Object.keys(descriptor.hostFiles).sort());
  assert.equal(h.api.revision,descriptor.revision);assert.notEqual(h.state.reset,h.originalReset);
  const d=await h.api.reader.describe();assert.equal(d.combinedAcceptance,false);
  assert.equal(d.synchronizedRoomPhysics,false);h.ownershipUntouched();h.noWrites();
});
test('P1: descriptor tamper and mutated original asset fail before attach',async()=>{
  const h=createHarness(),bad=structuredClone(descriptor);bad.combinedAcceptance=true;
  await assert.rejects(h.ctx.SeaLab12HostHooks.attach(bad),/DESCRIPTOR_MISMATCH/);assert.equal(h.assetReads.length,0);
  const fetch=h.ctx.fetch;h.ctx.fetch=async url=>{const r=await fetch(url);return {ok:r.ok,arrayBuffer:async()=>{
    const b=new Uint8Array(await r.arrayBuffer());b[0]^=1;return b.buffer;}};};
  await assert.rejects(h.attach(),/HOST_ASSET_MISMATCH/);assert.equal(h.state.reset,h.originalReset);h.noWrites();
});
test('P1: real C1 concurrent attach allows one owner and dispose restores original reset',async()=>{
  const h=createHarness(),rs=await Promise.allSettled([h.attach(),h.attach()]);
  assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(rs.find(x=>x.status==='rejected').reason.message,'ALREADY_ATTACHED');
  h.dispose();assert.equal(h.state.reset,h.originalReset);await h.attach();
  assert.equal((await bind(h)).readLocal().clock.epoch,0);h.dispose();h.noWrites();
});
test('P1: actual C1 receiver preserves cardinal/tilted world poses; RPM stays unknown/null',async t=>{
  const h=await unit(t),r=await bind(h);
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const [roll,pitch] of [[0,0],[.17,-.12]]){
    h.pose({p:[17,1.25,-33],heading,roll,pitch});const p=r.readLocal(),s=h.api.reader.readPose(BAY,r.identity.worldRevision);
    assert.deepEqual(p.pose.p,[17,1.25,-33]);assert.ok(p.pose.q.every((v,i)=>Math.abs(v-s.transform.quaternionXYZW[i])<1e-12));
    assert.equal(p.pose.rpm,null);assert.equal(h.state.rpm,1731);assert.ok(Object.isFrozen(p.pose.q));
  }
  h.noWrites();assert.equal(h.counts.resets,0);
});
test('P1: paused/inspect reads preserve source seconds and perform no physics/wave steps',async t=>{
  const h=await unit(t),r=await bind(h);h.setPaused(true);
  for(let i=0;i<30;i++)assert.equal(r.readLocal().clock.seconds,10);
  h.setMode('inspect');assert.equal(r.readLocal().clock.seconds,10);
  assert.equal(h.counts.surface,0);assert.equal(h.counts.bottom,0);h.noWrites();h.ownershipUntouched();
});
test('P1: original reset delegates once and increments the epoch seen by actual receiver',async t=>{
  const h=await unit(t),r=await bind(h);assert.equal(r.readLocal().clock.epoch,0);
  assert.equal(h.state.reset(),'fixture-original-reset');const p=r.readLocal();
  assert.equal(p.clock.epoch,1);assert.equal(p.clock.seconds,0);assert.equal(h.counts.resets,1);h.noWrites();
});
test('P1: same-epoch backwards time remains rejected after hiding and requires a fresh binding',async t=>{
  const h=await unit(t),r=await bind(h);r.readLocal();h.state.elapsed=1;
  assert.throws(()=>r.readLocal(),/HOST_CLOCK_REGRESSION/);h.state.elapsed=2;
  assert.throws(()=>r.readLocal(),/HOST_CLOCK_REGRESSION/);h.state.reset();
  assert.throws(()=>r.readLocal(),/HOST_CLOCK_REGRESSION/);
  assert.equal((await bind(h,'b'.repeat(32))).readLocal().clock.epoch,1);h.noWrites();
});
for(const change of ['weather','scene','configuration'])test('P1: actual '+change+' invalidates old binding',async t=>{
  const h=await unit(t),r=await bind(h),old=r.identity.worldRevision;r.readLocal();
  if(change==='weather')h.weather.target.amp=.2;else if(change==='scene')h.state.location='beaufort';else h.state.config.tide=1;
  assert.throws(()=>r.readLocal(),/STALE_WORLD_REVISION/);
  assert.notEqual((await h.api.reader.describe()).worldRevision,old);
  assert.throws(()=>r.readLocal(),/STALE_WORLD_REVISION/);
  assert.equal((await bind(h,'b'.repeat(32))).readLocal().pose.rpm,null);h.noWrites();
});
for(const state of ['ejected','destroyed'])test('P1: actual '+state+' rejects through MP receiver',async t=>{
  const h=await unit(t),r=await bind(h);r.readLocal();
  if(state==='ejected')h.setEjected(true);else h.state.destroyed10=true;
  assert.throws(()=>r.readLocal(),/CORE_RECOVERY_REQUIRED/);h.noWrites();
});
test('P1: detached captain loses C1 anchor support; boat pose does not falsely claim crew validity',async t=>{
  const h=await unit(t),r=await bind(h),rev=r.identity.worldRevision;
  assert.equal(h.api.reader.readAnchors(BAY,rev).captainRoot.uuid,h.captain.uuid);h.boat.remove(h.captain);
  assert.equal(h.api.reader.readAnchors(BAY,rev).reason,'CAPTAIN_NOT_SEATED');
  // Deliberate owner distinction: no crew/anchor validity appears in C1 boat readPose.
  const p=r.readLocal();assert.equal(p.vesselId,BAY);assert.equal('character' in p,false);assert.equal('anchors' in p,false);h.noWrites();
});
test('P1: actual replacement of state/boat/model/water provider revokes MP reader',async()=>{
  for(const which of ['boat','model','sampler','state']){
    const h=createHarness();await h.attach();const r=await bind(h);r.readLocal();
    if(which==='boat')h.A.boat=new h.T.Group();if(which==='model')h.A.model=new h.T.Group();
    if(which==='sampler')h.ctx.Sea09World.sample=()=>({known:true,bed:0});if(which==='state')h.A.state={...h.state};
    assert.throws(()=>r.readLocal(),/HOST_FRAME_INVALID/);h.dispose();h.noWrites();
  }
});
test('P1: full hook/local capability refused and no local token can be serialized by receiver',async t=>{
  const h=await unit(t),d=await h.api.reader.describe(),c={ownerSourceSha:OWNER_SHA,worldRevision:d.worldRevision,
    vesselId:BAY,playerId:'a'.repeat(32),entityId:'boat:'+'a'.repeat(32)};
  await assert.rejects(createC1PoseReceiver({...c,reader:h.api}),/READ_ONLY_READER_REQUIRED/);
  await assert.rejects(createC1PoseReceiver({...c,reader:{...h.api.reader,local:h.api.local}}),/READ_ONLY_READER_REQUIRED/);
  const r=await createC1PoseReceiver({...c,reader:h.api.reader});
  assert.ok(!/restore|spawnLocal|localToWorld|token/.test(JSON.stringify(r.readLocal())));
  assert.deepEqual(Object.keys(r).sort(),['identity','readLocal']);h.noWrites();
});
test('P1: real owner reader does not override required server identity or unavailable yacht',async t=>{
  const h=await unit(t),d=await h.api.reader.describe(),c={reader:h.api.reader,ownerSourceSha:OWNER_SHA,
    worldRevision:d.worldRevision,vesselId:BAY,playerId:'a'.repeat(32),entityId:'boat:'+'a'.repeat(32)};
  for(const p of [{playerId:''},{entityId:''},{entityId:'boat:'+BAY},{playerId:'b'.repeat(32)}])
    await assert.rejects(createC1PoseReceiver({...c,...p}),/HOST_IDENTITY_MISMATCH/);
  await assert.rejects(createC1PoseReceiver({...c,vesselId:'atlas-d-original-r7'}),/YACHT_ADAPTER_UNAVAILABLE/);h.noWrites();
});
test('P1: disposed actual hook rejects old reader without clobbering a newer reset owner',async()=>{
  const h=createHarness();await h.attach();const r=await bind(h);r.readLocal();
  const newer=()=>{};h.state.reset=newer;h.dispose();assert.equal(h.state.reset,newer);
  assert.throws(()=>r.readLocal(),/HOST_FRAME_INVALID/);h.noWrites();
});
async function socketHarness(t){
  const world=structuredClone(FIXTURE_WORLD);world.worldId='transport-fixture-exact-c1';world.worldRevision='exact-c1-test-only';
  world.vessels={[BAY]:world.vessels[FIXTURE_VESSEL]};
  const app=createMultiplayerServer({origins:[ORIGIN],roomOptions:{world,allowFixture:true}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const peers=[];
  const render=()=>{for(const p of peers)p.adapter.render();};
  t.after(async()=>{for(const p of peers){p.adapter.dispose();p.h.dispose();p.h.noWrites();}await app.stop();});
  async function peer(x=0){
    const h=createHarness({x});await h.attach();let receiver=null,prepares=0,exits=0;
    const observed=new Map(),frames=[],sockets=[],sent=[];
    const host={readLocal:()=>receiver.readLocal(),prepareLocal:async c=>{
      // Nonbrowser read-only fixture permission only: NO C1 spawn/restore/room ownership.
      prepares++;receiver=await bind(h,c.playerId);assert.equal(receiver.identity.entityId,c.entityId);return !c.signal.aborted;
    },exitLocal:()=>{exits++;receiver=null;},renderRemote:p=>{observed.set(p.entityId,p);frames.push(p);},removeRemote:id=>observed.delete(id)};
    const adapter=await createCoreAdapter({enabled:true,host,world,allowFixture:true,vesselId:BAY,
      baseUrl:ORIGIN+'/tests/fixture',endpoint:`ws://127.0.0.1:${app.server.address().port}/ws`,
      webSocketFactory:url=>{const ws=new WebSocket(url,{origin:ORIGIN}),send=ws.send.bind(ws);
        ws.send=(data,...args)=>{sent.push(JSON.parse(data));return send(data,...args);};sockets.push(ws);return ws;}});
    const p={h,adapter,observed,frames,sockets,sent,get receiver(){return receiver;},get prepares(){return prepares;},get exits(){return exits;}};
    peers.push(p);return p;
  }
  return {app,peer,render,wait:predicate=>until(predicate,render),last:(p,id)=>p.observed.get(id)};
}
test('P1 sockets: actual C1 and real receiver/client exchange two independently authored poses and null RPM',{timeout:7000},async t=>{
  const s=await socketHarness(t),a=await s.peer(0),b=await s.peer(40);
  await a.adapter.create('Captain A');await b.adapter.join('Captain B',a.adapter.invite());
  assert.notEqual(a.adapter.info.playerId,b.adapter.info.playerId);
  a.h.pose({p:[12,1.1,-8],heading:Math.PI/2,roll:.07,pitch:-.03,time:11});b.h.pose({p:[47,1.2,5],heading:-.5,time:10.5});
  await s.wait(()=>s.last(b,a.adapter.info.entityId)?.pose.p[0]===12&&s.last(a,b.adapter.info.entityId)?.pose.p[0]===47);
  assert.equal(s.last(b,a.adapter.info.entityId).pose.rpm,null);assert.equal(s.last(a,b.adapter.info.entityId).pose.rpm,null);
  assert.ok(a.sent.some(p=>p.type==='state'&&p.clock.epoch===0&&p.pose.rpm===null));
  for(const p of [a,b]){p.h.noWrites();assert.equal(p.h.counts.resets,0);}
});
test('P1 sockets: actual reset epoch clears interpolation and transport time never advances host',{timeout:7000},async t=>{
  const s=await socketHarness(t),a=await s.peer(),b=await s.peer(40);
  await a.adapter.create('A');await b.adapter.join('B',a.adapter.invite());
  a.h.pose({p:[10,0,0],time:20});await s.wait(()=>s.last(b,a.adapter.info.entityId)?.pose.p[0]===10);
  b.frames.length=0;a.h.state.reset();a.h.pose({p:[20,0,0],time:0});await s.wait(()=>s.last(b,a.adapter.info.entityId)?.pose.p[0]===20);
  assert.ok(b.frames.filter(p=>p.entityId===a.adapter.info.entityId).every(p=>p.pose.p[0]===10||p.pose.p[0]===20));
  assert.ok(a.sent.some(p=>p.type==='state'&&p.clock.epoch===1&&p.clock.seconds===0));
  await delay(150);s.render();assert.equal(a.h.state.elapsed,0);assert.equal(a.h.counts.resets,1);a.h.noWrites();
});
for(const invalid of ['ejection','world','disposed','replacement'])test('P1 sockets: '+invalid+' stops publication and releases client without host writes',{timeout:7000},async t=>{
  const s=await socketHarness(t),a=await s.peer();await a.adapter.create('A');await s.wait(()=>a.adapter.stats.sent>=1);
  if(invalid==='ejection')a.h.setEjected(true);if(invalid==='world')a.h.state.config.tide=2;
  if(invalid==='disposed')a.h.dispose();if(invalid==='replacement')a.h.A.boat=new a.h.T.Group();
  await s.wait(()=>a.adapter.info.state==='error');
  assert.equal(a.adapter.info.error,invalid==='ejection'?'CORE_RECOVERY_REQUIRED':invalid==='world'?'STALE_WORLD_REVISION':'HOST_FRAME_INVALID');
  assert.equal(a.exits,1);const sent=a.adapter.stats.sent;await delay(150);assert.equal(a.adapter.stats.sent,sent);a.h.noWrites();
});
test('P1 sockets: reconnect retains authenticated identity and actual C1 epoch without accessing local restore',{timeout:7000},async t=>{
  const s=await socketHarness(t),a=await s.peer();await a.adapter.create('A');await s.wait(()=>a.adapter.stats.sent>0);
  const id=a.adapter.info.playerId;a.sockets[0].terminate();await s.wait(()=>a.adapter.stats.reconnects===1&&a.adapter.info.state==='connected');
  assert.equal(a.adapter.info.playerId,id);assert.equal(a.prepares,2);assert.equal(a.receiver.readLocal().clock.epoch,0);
  assert.equal(a.h.counts.resets,0);a.h.noWrites();
});
test('P1 sockets: disposed/re-attached host uses explicit new membership, not hidden epoch-zero resume',{timeout:7000},async t=>{
  const s=await socketHarness(t),a=await s.peer();await a.adapter.create('A');await s.wait(()=>a.adapter.stats.sent>0);
  const oldId=a.adapter.info.playerId,old=a.receiver;a.h.state.reset();await s.wait(()=>a.sent.some(p=>p.clock?.epoch===1));
  a.adapter.leave();a.h.dispose();assert.throws(()=>old.readLocal(),/HOST_FRAME_INVALID/);await a.h.attach();await a.adapter.create('A again');
  assert.notEqual(a.adapter.info.playerId,oldId);assert.equal(a.receiver.readLocal().clock.epoch,0);a.h.noWrites();
});
