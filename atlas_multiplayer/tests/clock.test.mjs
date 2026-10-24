import test from 'node:test';
import assert from 'node:assert/strict';
import {PROTOCOL,validatePose,validateSourceClock,nextSourceClock,worldFingerprint} from '../shared/world.mjs';
import {RoomStore} from '../rooms.mjs';
import {RemoteBuffer} from '../client/interpolation.mjs';
import {FIXTURE_WORLD,FIXTURE_VESSEL} from './fixtures/world.mjs';
const hash=await worldFingerprint(FIXTURE_WORLD);
const clock=(epoch=0,seconds=0)=>({domain:'client-simulation',epoch,seconds});
const pose=x=>({p:[x,0,0],q:[0,0,0,1],engine:true,rpm:null,gear:1});
function fixture(){
  let at=1000;const store=new RoomStore({world:FIXTURE_WORLD,allowFixture:true,now:()=>at});
  const h={protocol:PROTOCOL,worldId:FIXTURE_WORLD.worldId,worldRevision:FIXTURE_WORLD.worldRevision,worldHash:hash,vesselId:FIXTURE_VESSEL,name:'Clock fixture',action:'create'};
  const a=store.enter('a',h);
  return {store,a,hello:h,setAt:x=>{at=x;},update:(seq,c,p=pose(10))=>store.update('a',{type:'state',seq,pose:p,clock:c})};
}
test('protocol 3 represents missing RPM explicitly rather than a fabricated stopped reading',()=>{
  assert.equal(PROTOCOL,'atlas-net-3');assert.equal(validatePose(pose(1)).rpm,null);
  assert.equal(validatePose({...pose(1),rpm:0}).rpm,0);
  assert.throws(()=>validatePose({...pose(1),rpm:undefined}),/BAD_POSE/);
});
test('source clock schema rejects malformed epoch/time/domain and authority fields',()=>{
  for(const patch of [{epoch:undefined},{epoch:''},{epoch:NaN},{epoch:-1},{epoch:.1},{seconds:Infinity},{seconds:-1},{seconds:'0'},{domain:'room-clock'},{serverTime:123}]){
    assert.throws(()=>validateSourceClock({...clock(),...patch}),/BAD_SOURCE_CLOCK/);
  }
  assert.equal(validateSourceClock(null),null);assert.deepEqual(validateSourceClock(clock()),clock());
});
test('source-clock transitions allow paused equality and newer epochs, reject regression or disappearance',()=>{
  assert.deepEqual(nextSourceClock(clock(7,50),clock(7,50)),clock(7,50));
  assert.deepEqual(nextSourceClock(clock(7,50),clock(8,0)),clock(8,0));
  for(const c of [clock(7,49),clock(6,100),null])assert.throws(()=>nextSourceClock(clock(7,50),c),/SOURCE_CLOCK_REGRESSION/);
});
test('server preserves independent source clock and network arrival time; copies both',()=>{
  const f=fixture(),c=clock(9,2);f.setAt(4444);f.update(0,c);
  const snap=f.store.snapshot(f.a.roomId),p=snap.players[0];
  assert.equal(p.updatedAt,4444);assert.deepEqual(p.clock,clock(9,2));
  c.seconds=999;p.clock.seconds=99;assert.deepEqual(f.store.snapshot(f.a.roomId).players[0].clock,clock(9,2));
});
test('clock rejection is atomic: accepted pose, source clock and sequence remain unchanged',()=>{
  const f=fixture();f.update(5,clock(3,5));assert.throws(()=>f.update(6,clock(2,100),pose(999)),/SOURCE_CLOCK_REGRESSION/);
  const p=f.store.snapshot(f.a.roomId).players[0];assert.equal(p.seq,5);assert.equal(p.pose.p[0],10);assert.deepEqual(p.clock,clock(3,5));
});
test('client epoch reset accepts lower seconds while sequence remains socket-owned monotonic',()=>{
  const f=fixture();f.update(5,clock(3,50));f.update(6,clock(4,0));
  assert.equal(f.update(5,clock(999,0)),false);const p=f.store.snapshot(f.a.roomId).players[0];assert.deepEqual(p.clock,clock(4,0));assert.equal(p.seq,6);
});
test('separate players can have unrelated simulation epochs and times without sharing authority',()=>{
  const f=fixture(),b=f.store.enter('b',{...f.hello,action:'join',roomId:f.a.roomId,key:f.a.key});
  f.update(0,clock(0,500));f.store.update('b',{type:'state',seq:0,pose:pose(20),clock:clock(99,0)});
  const players=f.store.snapshot(f.a.roomId).players;assert.equal(players.find(p=>p.id===b.playerId).clock.epoch,99);
  assert.equal(players.find(p=>p.id===f.a.playerId).clock.seconds,500);
});
test('resume carries last source-clock metadata but does not manufacture a new host clock',()=>{
  const f=fixture();f.update(0,clock(5,12));f.store.disconnect('a');
  const again=f.store.enter('again',{...f.hello,action:'resume',roomId:f.a.roomId,key:f.a.key,playerId:f.a.playerId,resumeToken:f.a.resumeToken});
  assert.deepEqual(again.selfClock,clock(5,12));assert.equal(again.playerId,f.a.playerId);
});
const id='a'.repeat(32),self='b'.repeat(32);
const snapshot=(at,x,seq,epoch)=>({serverTime:at,players:[{id,entityId:'boat:'+id,vesselId:FIXTURE_VESSEL,name:'Peer',connected:true,seq,updatedAt:at,pose:pose(x),clock:clock(epoch,seq)}]});
test('small placement discontinuity in a new source epoch clears interpolation, not a visible glide',()=>{
  const b=new RemoteBuffer({delayMs:100});b.ingest(snapshot(1000,10,0,1),self);b.ingest(snapshot(1200,20,1,1),self);
  assert.equal(b.sample(1200)[0].pose.p[0],15);
  b.ingest(snapshot(1300,25,2,2),self);assert.equal(b.sample(1300)[0].pose.p[0],25);
  assert.equal(b.peers.get('boat:'+id).samples.length,1);assert.equal(b.sample(1300)[0].pose.rpm,null);
});
