import test from 'node:test';
import assert from 'node:assert/strict';
import {createC1PoseReceiver,rigidPose,C1_BAY} from '../client/c1-reader.mjs';
import {fixture,transform} from './owner-fixtures/c1-reader-fixture.mjs';
const receiver=async()=>{const f=await fixture();return {...f,r:await createC1PoseReceiver(f.options)};};

test('C1 read-only receiver copies current render pose; RPM unavailable stays null',async()=>{
  const f=await receiver(),before=structuredClone(f.sample),result=f.r.readLocal();
  assert.equal(result.vesselId,C1_BAY);assert.equal(result.pose.rpm,null);assert.equal(result.pose.engine,true);
  assert.ok(Object.isFrozen(result.pose.q));assert.deepEqual(f.sample,before);
  assert.equal(f.calls.writes,0);assert.equal(f.calls.readPose,1);assert.equal(f.r.identity.entityId,'boat:'+'a'.repeat(32));
  assert.ok(!JSON.stringify(result).includes('localToWorld'));assert.ok(!JSON.stringify(result).includes('playerId'));
});
test('C1 actual transform mapping preserves all cardinal headings and tilted poses',async()=>{
  const f=await receiver();
  for(const [heading,expected] of [[0,[1,0,0]],[Math.PI/2,[0,0,1]],[Math.PI,[-1,0,0]],[-Math.PI/2,[0,0,-1]]]){
    const t=transform({heading});f.sample.transform=t;const result=f.r.readLocal();
    assert.ok(expected.every((n,i)=>Math.abs(t.localToWorld[i]-n)<1e-9));assert.deepEqual(result.pose.q,t.quaternionXYZW);
  }
  for(const heading of [0,.7,-2.1])for(const roll of [-.3,.2])for(const pitch of [-.4,.5]){
    f.sample.transform=transform({heading,roll,pitch,p:[-240,1.23,-300]});
    const result=f.r.readLocal();assert.deepEqual(result.pose.p,[-240,1.23,-300]);assert.ok(result.pose.q.every((q,i)=>Math.abs(q-f.sample.transform.quaternionXYZW[i])<1e-12));
  }
});
test('quaternion sign equivalence is accepted without guessing yaw sign',()=>{
  const t=transform({heading:Math.PI/2,roll:.2,pitch:-.1});t.quaternionXYZW=t.quaternionXYZW.map(x=>-x);
  assert.deepEqual(rigidPose(t).q,t.quaternionXYZW);
});
test('NaN, singular, scaled, sheared, row-major and mismatched inverse transforms reject',()=>{
  const corrupt=[t=>t.position[0]=NaN,t=>t.localToWorld[0]=0,t=>t.scale[0]=2,t=>t.localToWorld[4]+=.2,
    t=>t.worldToLocal[12]+=1,t=>t.quaternionXYZW=[0,0,0,0],t=>t.position[1]+=1,
    t=>t.localToWorld=t.localToWorld.map((_,i,a)=>a[(i%4)*4+Math.floor(i/4)]),t=>t.worldToLocal[0]=Infinity];
  for(const edit of corrupt){const t=transform({heading:.7,roll:.2,pitch:.1});edit(t);assert.throws(()=>rigidPose(t),/HOST_FRAME_INVALID/);}
});
test('missing/empty identity and incorrect server entity identity reject before read',async()=>{
  for(const patch of [{playerId:undefined},{playerId:''},{entityId:''},{playerId:'bad',entityId:'boat:bad'},{entityId:'boat:'+'b'.repeat(32)}]){
    const f=await fixture();await assert.rejects(createC1PoseReceiver({...f.options,...patch}),/HOST_IDENTITY_MISMATCH/);assert.equal(f.calls.readPose,0);
  }
});
test('full hook object/local token capability cannot enter the network receiver',async()=>{
  const f=await fixture();let tokenReads=0;
  const mixed={...f.reader,get local(){tokenReads++;throw Error('PRIVATE_TOKEN');}};
  await assert.rejects(createC1PoseReceiver({...f.options,reader:mixed}),/READ_ONLY_READER_REQUIRED/);assert.equal(tokenReads,0);
  await assert.rejects(createC1PoseReceiver({...f.options,reader:{reader:f.reader,local:{restoreLocal(){f.calls.writes++;}}}}),/READ_ONLY_READER_REQUIRED/);
  assert.equal(f.calls.writes,0);
});
test('wrong source context, baseline, version, coordinate convention and fingerprint reject',async()=>{
  for(const edit of [f=>f.options.ownerSourceSha='',f=>f.options.worldRevision='',f=>f.d.revision='old',
    f=>f.d.baseline.publicSHA='f'.repeat(40),f=>f.d.units.length='feet',f=>f.d.coordinates.world.south='-Z',
    f=>f.d.world.scene='other',f=>f.d.synchronizedRoomPhysics=true]){
    const f=await fixture();edit(f);await assert.rejects(createC1PoseReceiver(f.options));assert.equal(f.calls.readPose,0);
  }
});
test('yacht/unknown vessel do not fall back to Bay controller or footprint',async()=>{
  const f=await fixture();await assert.rejects(createC1PoseReceiver({...f.options,vesselId:'atlas-d-original-r7'}),/YACHT_ADAPTER_UNAVAILABLE/);
  await assert.rejects(createC1PoseReceiver({...f.options,vesselId:'other'}),/UNKNOWN_VESSEL/);assert.equal(f.calls.describe,0);assert.equal(f.calls.writes,0);
});
test('owner scene/config invalidation poisons old receiver even after caller tries old frame',async()=>{
  const f=await receiver();f.r.readLocal();f.fail('STALE_WORLD_REVISION');assert.throws(()=>f.r.readLocal(),/STALE_WORLD_REVISION/);
  f.fail(null);assert.throws(()=>f.r.readLocal(),/STALE_WORLD_REVISION/);assert.equal(f.calls.readPose,2);
});
test('per-client clock supports pause and reset epoch without advancing CORE time',async()=>{
  const f=await receiver();f.sample.clock.seconds=10;assert.equal(f.r.readLocal().clock.seconds,10);
  f.sample.clock.paused=true;for(let i=0;i<10;i++)assert.equal(f.r.readLocal().clock.seconds,10);
  f.sample.clock.epoch=1;f.sample.clock.seconds=0;assert.equal(f.r.readLocal().clock.epoch,1);
  f.sample.clock.mode='inspect';f.sample.clock.seconds=.027;assert.equal(f.r.readLocal().clock.seconds,.027);
  assert.equal(f.sample.clock.seconds,.027);assert.equal(f.calls.writes,0);
});
test('clock regressions/missing epochs/nonfinite time stop publication',async()=>{
  for(const edit of [s=>s.clock.epoch=-1,s=>s.clock.epoch=NaN,s=>s.clock.epoch=undefined,s=>s.clock.seconds=NaN,
    s=>s.clock.seconds=9,s=>s.clock.roomOrigin=0,s=>s.clock.fixedStepSeconds=NaN]){
    const f=await receiver();f.sample.clock.seconds=10;f.r.readLocal();edit(f.sample);assert.throws(()=>f.r.readLocal(),/HOST_CLOCK_REGRESSION/);
  }
});
test('mismatched local identity or uncommitted pose is rejected; private error text not leaked',async()=>{
  for(const edit of [s=>s.entityId='remote-boat',s=>s.vesselId='atlas-d-original-r7',s=>s.authority='server',s=>s.poseStage='mid-step']){
    const f=await receiver();edit(f.sample);assert.throws(()=>f.r.readLocal(),/HOST_IDENTITY_MISMATCH/);
  }
  const f=await receiver();f.fail('PRIVATE_HOST_DATA');assert.throws(()=>f.r.readLocal(),e=>e.message==='HOST_FRAME_INVALID');
});
test('destroyed/ejected requires owner recovery instead of arbitrary remote restore',async()=>{
  for(const key of ['destroyed','ejected']){const f=await receiver();f.sample.condition[key]=true;assert.throws(()=>f.r.readLocal(),/CORE_RECOVERY_REQUIRED/);assert.equal(f.calls.writes,0);}
});
