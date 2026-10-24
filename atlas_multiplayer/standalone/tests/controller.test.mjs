import test from 'node:test';import assert from 'node:assert/strict';
import {BoatController,FixedStepper,isClear} from '../controller.mjs';import {WORLD,VESSEL_ID} from '../world.mjs';
import {validateWorld,validatePose,worldFingerprint} from '../../shared/world.mjs';
const steps=(c,n)=>{for(let i=0;i<n;i++)c.step(1/60);};
test('standalone world has a separate identity, clear slots, capacity and no CORE approval impersonation',async()=>{
 const w=validateWorld(WORLD);assert.equal(w.kind,'standalone');assert.equal(w.applicationId,'atlas-d-open-water');
 assert.match(await worldFingerprint(w),/^[a-f0-9]{64}$/);assert.equal(Object.keys(w.vessels).length,1);
 for(const [i,s]of w.vessels[VESSEL_ID].spawns.entries()){assert.ok(isClear(s.p));for(const t of w.vessels[VESSEL_ID].spawns.slice(i+1))assert.ok(Math.hypot(s.p[0]-t.p[0],s.p[2]-t.p[2])>=30);}
 assert.throws(()=>validateWorld({...WORLD,coreSourceSha:'a'.repeat(40)}),/WORLD_NOT_APPROVED/);
 assert.throws(()=>validateWorld({...WORLD,applicationId:'sea-lab'}),/WORLD_NOT_APPROVED/);
});
test('authored engine accelerates, coasts and reverses; telemetry remains finite',()=>{
 const c=new BoatController();c.engine=true;c.input({throttle:1});steps(c,240);const v=c.speed;assert.ok(v>6);c.input();steps(c,120);assert.ok(c.speed<v);c.input({throttle:-1});steps(c,800);assert.ok(c.speed<0);validatePose(c.pose());
});
test('no thrust while engine off; signed turning respects +X toward +Z convention',()=>{
 const c=new BoatController();c.input({throttle:1,steer:1});steps(c,60);assert.equal(c.speed,0);
 c.engine=true;steps(c,180);assert.ok(c.heading>0);assert.ok(c.z>280);
 const q=c.pose().q;assert.ok(q[1]<0);assert.equal(c.sample().vesselId,VESSEL_ID);
});
test('island/boundary keep local hull center out; no invented bathymetry or interboat collisions',()=>{
 const c=new BoatController();c.x=60;c.z=130;c.engine=true;c.input({throttle:1});steps(c,400);assert.ok(c.contacts>0);assert.ok(isClear(c.pose().p));assert.ok(c.x<=69);
 assert.equal(isClear([900,0,0]),false);assert.equal(isClear([120,0,130]),false);assert.equal(isClear([NaN,0,0]),false);
});
test('fixed-step integration matches at 30/60/120Hz and rejects invalid deltas',()=>{
 const run=(fps)=>{const c=new BoatController(),s=new FixedStepper(c);c.engine=true;c.input({throttle:.7,steer:.2});for(let i=0;i<fps*3;i++)s.advance(1/fps);return c.sample();};
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(120));const c=new BoatController(),s=new FixedStepper(c);
 assert.throws(()=>c.step(.5),/FIXED_STEP_REQUIRED/);assert.throws(()=>s.advance(NaN),/BAD_FRAME_DELTA/);assert.equal(s.advance(3),0);assert.equal(c.seconds,0);assert.equal(s.droppedGaps,1);
});
test('placement and solo restoration preserve explicit source epoch and stop momentum',()=>{
 const c=new BoatController();c.engine=true;c.input({throttle:1});steps(c,60);const saved=c.save(),t=c.seconds;
 const spawn=WORLD.vessels[VESSEL_ID].spawns[3];c.place({...spawn,q:[0,-Math.SQRT1_2,0,Math.SQRT1_2]});assert.ok(Math.abs(c.heading-Math.PI/2)<1e-12);assert.equal(c.speed,0);assert.equal(c.epoch,1);assert.equal(c.seconds,t);
 c.restore(saved);assert.deepEqual(c.save(),saved);assert.equal(c.epoch,2);assert.throws(()=>c.place({p:[120,0,130],q:[0,0,0,1]}),/UNSAFE_STANDALONE_PLACEMENT/);
});
