import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorld,worldFingerprint,validatePose} from '../shared/world.mjs';
import {FIXTURE_WORLD} from './fixtures/world.mjs';
import {RemoteBuffer,slerp} from '../client/interpolation.mjs';
import {inviteLink,parseInvite} from '../client/invite.mjs';
import {createCoreAdapter} from '../client/core-adapter.mjs';
import {RoomStore} from '../rooms.mjs';
const clone=()=>structuredClone(FIXTURE_WORLD);
const pose=x=>({p:[x,0,0],q:[0,0,0,1],engine:false,rpm:0,gear:0});
const id='a'.repeat(32),self='b'.repeat(32),entityId='boat:'+id;
const snapshot=(at,x,seq=0,connected=true)=>({serverTime:at,players:[{id,entityId,vesselId:'fixture-craft',name:'Crew',connected,updatedAt:at,seq,pose:pose(x)}]});

test('no implicit legacy world and fixtures fail closed outside tests',()=>{
  assert.throws(()=>new RoomStore(),/WORLD_CONFIG_REQUIRED/);
  assert.throws(()=>validateWorld(FIXTURE_WORLD),/FIXTURE_WORLD_NOT_ALLOWED/);
  assert.ok(validateWorld(FIXTURE_WORLD,{allowFixture:true}));
});
test('unapproved production descriptor cannot be enabled by fixture flag',()=>{
  const w=clone();w.kind='core';assert.throws(()=>validateWorld(w,{allowFixture:true}),/WORLD_NOT_APPROVED/);
});
test('world fingerprint binds scene, weather, water and vessel footprint revision',async()=>{
  const hash=await worldFingerprint(FIXTURE_WORLD);
  for(const edit of [w=>w.sceneRevision='changed',w=>w.weather.windMps=5,w=>w.water.revision='changed',w=>w.vessels['fixture-craft'].footprintRevision='changed']){
    const w=clone();edit(w);assert.notEqual(await worldFingerprint(w),hash);
  }
});
test('canonical fingerprint ignores object insertion order but not spawn order',async()=>{
  const w=Object.fromEntries(Object.entries(clone()).reverse());
  assert.equal(await worldFingerprint(w),await worldFingerprint(FIXTURE_WORLD));
  w.vessels['fixture-craft'].spawns.reverse();assert.notEqual(await worldFingerprint(w),await worldFingerprint(FIXTURE_WORLD));
});
test('wrong axes, mutable weather and depth zero substitution are rejected',()=>{
  for(const edit of [w=>w.axes='Z-up',w=>w.weather.mutable=true,w=>w.water.unknownDepth=0,w=>w.clock.physics='server-room-clock']){
    const w=clone();edit(w);assert.throws(()=>validateWorld(w,{allowFixture:true}));
  }
});
test('descriptor is deeply immutable and duplicate/missing spawns fail closed',()=>{
  const w=validateWorld(FIXTURE_WORLD,{allowFixture:true});assert.ok(Object.isFrozen(w.vessels['fixture-craft'].spawns[0].p));
  const duplicate=clone();duplicate.vessels['fixture-craft'].spawns[1].p=[0,0,0];
  assert.throws(()=>validateWorld(duplicate,{allowFixture:true}),/DUPLICATE_SPAWN/);
  const missing=clone();missing.vessels['fixture-craft'].spawns.pop();assert.throws(()=>validateWorld(missing,{allowFixture:true}),/BAD_SPAWN_CONFIG/);
});
test('interpolation computes midpoint and never steps or extrapolates physics',()=>{
  const b=new RemoteBuffer({delayMs:100});b.ingest(snapshot(1000,0,0),self);b.ingest(snapshot(1200,10,1),self);
  assert.equal(b.sample(1200)[0].pose.p[0],5);assert.equal(b.sample(5000)[0].pose.p[0],10);
  assert.equal(b.sample(1000)[0].pose.p[0],0);
});
test('quaternion interpolation takes the short arc and returns unit length',()=>{
  assert.deepEqual(slerp([0,0,0,1],[0,0,0,-1],.5),[0,0,0,1]);
  const q=slerp([0,0,0,1],[0,1,0,0],.5);assert.ok(Math.abs(Math.hypot(...q)-1)<1e-12);
});
test('duplicate snapshots cannot hide a stale remote boat',()=>{
  const b=new RemoteBuffer();b.ingest(snapshot(1000,0,0),self);b.ingest(snapshot(1900,0,0),self);
  assert.equal(b.sample(1900)[0].stale,true);
});
test('disconnect stales peers, explicit departure removes them, self never renders',()=>{
  const b=new RemoteBuffer();b.ingest(snapshot(1000,1,0),id);assert.equal(b.sample(1100).length,0);
  b.ingest(snapshot(1000,1,0,false),self);assert.equal(b.sample(1100)[0].stale,true);
  assert.deepEqual(b.ingest({players:[]},self),[entityId]);assert.equal(b.sample(1100).length,0);
});
test('interpolation storage is bounded and large discontinuities snap',()=>{
  const b=new RemoteBuffer({maxSamples:4});for(let i=0;i<50;i++)b.ingest(snapshot(i*100,i*.1,i),self);
  assert.equal(b.peers.get(entityId).samples.length,4);
  b.ingest(snapshot(5000,1000,50),self);assert.equal(b.peers.get(entityId).samples.length,1);assert.equal(b.sample(5050)[0].pose.p[0],1000);
});
test('outbound pose validation does not mutate host state',()=>{
  const original=pose(1),before=structuredClone(original),p=validatePose(original);p.p[0]=77;
  assert.deepEqual(original,before);
});
test('invitation secrets remain in fragment, never credentials/query/endpoint fields',async()=>{
  const hash=await worldFingerprint(FIXTURE_WORLD),session={roomId:'a'.repeat(16),key:'b'.repeat(32),resumeToken:'SECRET'};
  const link=inviteLink('https://workshop.example/sea/?mode=test',session,hash),url=new URL(link);
  assert.equal(url.search,'');assert.ok(!link.includes('SECRET'));assert.deepEqual(parseInvite(link,'https://workshop.example/sea/',hash),{roomId:session.roomId,key:session.key});
});
test('invite cannot change frontend origin/path, world, socket endpoint or duplicate keys',async()=>{
  const hash=await worldFingerprint(FIXTURE_WORLD),base='https://workshop.example/sea/';
  const link=inviteLink(base,{roomId:'a'.repeat(16),key:'b'.repeat(32)},hash);
  for(const bad of [link.replace('workshop.example','evil.example'),link.replace('/sea/','/other/'),link+'&endpoint=wss://evil.example/ws',link+'&key='+'c'.repeat(32),link.replace(hash,'0'.repeat(64))]){
    assert.throws(()=>parseInvite(bad,base,hash));
  }
});
test('feature-off adapter is inert: no sockets, timers, hooks, world requirement or state mutation',async()=>{
  const state={x:1,elapsed:0},before=structuredClone(state);let sockets=0,hooks=0;
  const adapter=await createCoreAdapter({enabled:false,host:new Proxy({},{get(){hooks++;throw new Error('Touched host');}}),webSocketFactory(){sockets++;throw new Error('Opened socket');}});
  assert.equal(adapter.info.state,'disabled');adapter.render();adapter.dispose();
  assert.equal(sockets,0);assert.equal(hooks,0);assert.deepEqual(state,before);
});
test('missing host hooks and insecure remote endpoints fail before any connection',async()=>{
  await assert.rejects(createCoreAdapter({enabled:true,world:FIXTURE_WORLD,allowFixture:true,host:{}}),/HOST_ADAPTER_REQUIRED/);
  const host={readLocal(){},prepareLocal(){},exitLocal(){},renderRemote(){},removeRemote(){}};
  await assert.rejects(createCoreAdapter({enabled:true,world:FIXTURE_WORLD,allowFixture:true,host,endpoint:'ws://example.com/ws',baseUrl:'https://example.com/'}),/INSECURE_ENDPOINT/);
});

test('CORE per-client/resettable physics clock is separate from transport timestamps',()=>{
  const w=validateWorld(FIXTURE_WORLD,{allowFixture:true});
  assert.equal(w.clock.physics,'host-per-client-resettable');assert.equal(w.clock.waterPhaseSynchronized,false);
  const wrong=clone();wrong.clock={authority:'server-room-clock',originSeconds:0};
  assert.throws(()=>validateWorld(wrong,{allowFixture:true}),/BAD_WORLD_CONFIG/);
});
test('non-JSON descriptor metadata cannot produce a misleading fingerprint',async()=>{
  const bad=clone();bad.extra=NaN;assert.throws(()=>validateWorld(bad,{allowFixture:true}),/NON_JSON_WORLD_VALUE/);
  const undefinedValue=clone();undefinedValue.extra=undefined;assert.throws(()=>validateWorld(undefinedValue,{allowFixture:true}),/NON_JSON_WORLD_VALUE/);
});
