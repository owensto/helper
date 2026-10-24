/** Real group protocol/navigation; no native browser or public signaling implied. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRoom,VERSION,checkedSnapshot} from '../protocol.mjs';
import {WORLD} from '../../standalone/world.mjs';
import {BoatController} from '../../standalone/controller.mjs';
import {DESTINATIONS,checkedPlan,crewProgress,navigationTarget} from '../crew-plan.mjs';
import {crewView,fillCrewTargets} from '../crew-ui.mjs';
const id=n=>'ow-'+String(n).padStart(32,'0'),key='a'.repeat(48),resumeKey='b'.repeat(48);
function fixture(n=8){let t=1000;const room=new HostRoom({id:id(0),key,name:'Host',now:()=>t});for(let i=1;i<n;i++)room.add(id(i),{v:VERSION,type:'hello',key,world:WORLD.worldRevision,resumeKey,name:'Crew '+i});let seq=0;const boats=Array.from({length:n},()=>new BoatController());
 const update=()=>boats.forEach((b,i)=>room.update(id(i),{v:VERSION,type:'state',seq:seq++,sample:b.sample()}));update();
 return {room,boats,update,time:v=>t=v,command:(i,action,value,controlSeq=1)=>room.command(id(i),{v:VERSION,type:'crew',seq:controlSeq,action,...(value===undefined?{}:{value})})};}
test('eight captains ready, shared destination and single five-second departure; no boat writes',()=>{
 const f=fixture(),before=f.boats.map(b=>b.sample());f.command(0,'destination','buoy-1',0);
 for(let i=0;i<8;i++)f.command(i,'ready',true);f.command(0,'depart',undefined,2);
 const s=f.room.snapshot();assert.equal(s.plan.departAt,6000);assert.equal(s.players.filter(p=>p.ready).length,8);
 for(let i=0;i<8;i++)assert.deepEqual(checkedSnapshot(s,{host:id(0),self:id(i)}).plan,s.plan);
 assert.deepEqual(f.boats.map(b=>b.sample()),before);
});
test('guest cannot set target, cancel, or start departure; replay does not repeat command',()=>{
 const f=fixture(2);for(const a of ['destination','depart','cancel'])assert.throws(()=>f.command(1,a,'buoy-1'),/HOST_ONLY/);
 f.command(0,'destination','buoy-1',0);assert.equal(f.command(0,'destination','buoy-2',0),false);assert.equal(f.room.plan.destination,'buoy-1');
 assert.throws(()=>f.command(1,'ready','yes'),/BAD_CREW_COMMAND/);assert.throws(()=>f.command(0,'destination','outside-world'),/BAD_CREW_COMMAND/);
});
test('not-ready, background, disconnected and stale captains all prevent departure',()=>{
 for(const fault of ['not-ready','background','disconnected','stale']){const f=fixture(2);f.command(0,'destination','buoy-1',0);for(let i=0;i<2;i++)f.command(i,'ready',true);
 if(fault==='not-ready')f.command(1,'ready',false,2);if(fault==='background')f.room.players.get(id(1)).visible=false;if(fault==='disconnected')f.room.disconnect(id(1));if(fault==='stale')f.time(4000);
 assert.throws(()=>f.command(0,'depart',undefined,2),/CREW_NOT_READY/,fault);assert.equal(f.room.plan.departAt,null);}
});
test('countdown cancels on drop; resume keeps shared destination but requires fresh ready',()=>{
 const f=fixture(2);f.command(0,'destination','buoy-3',0);f.command(0,'ready',true);f.command(1,'ready',true);f.command(0,'depart',undefined,2);f.time(2000);f.room.disconnect(id(1));
 assert.equal(f.room.plan.departAt,null);assert.equal(f.room.plan.destination,'buoy-3');
 const w=f.room.add(id(1),{v:VERSION,type:'hello',key,world:WORLD.worldRevision,resumeKey,resume:true,name:'Crew 1'});assert.equal(w.resumed,true);assert.equal(w.nextControlSequence,2);assert.equal(f.room.players.get(id(1)).ready,false);
});
test('changing destination resets readiness; newcomer prevents pending departure',()=>{
 const f=fixture(2);f.command(0,'destination','buoy-1',0);f.command(0,'ready',true);f.command(1,'ready',true);f.command(0,'depart',undefined,2);
 f.room.add(id(2),{v:VERSION,type:'hello',key,world:WORLD.worldRevision,resumeKey,name:'Late joiner'});assert.equal(f.room.snapshot().plan.departAt,null);
 f.command(0,'destination','harbor',3);assert.ok([...f.room.players.values()].every(p=>!p.ready));
});
test('arrival is current proximity, not a score; stale or disconnected samples never count',()=>{
 const f=fixture(3);f.command(0,'destination','buoy-1',0);for(const b of f.boats){b.x=80;b.z=-20;}f.update();
 assert.equal(crewProgress(f.room.plan,[...f.room.players.values()],1000).arrived,3);f.room.disconnect(id(2));assert.equal(crewProgress(f.room.plan,[...f.room.players.values()],1000).arrived,2);
 assert.equal(crewProgress(f.room.plan,[...f.room.players.values()],3000).arrived,0);
});
test('plan snapshot rejects forged coordinates, stale revision and changed same-revision countdown',()=>{
 const p={revision:2,destination:'buoy-1',departAt:6000};assert.deepEqual(checkedPlan(p),p);
 for(const bad of [{...p,x:999},{...p,destination:'bad'},{...p,departAt:NaN},{...p,revision:1},{...p,departAt:7000}])assert.throws(()=>checkedPlan(bad,p));
});
test('locator compass respects east-X/south-Z, never uses stale teammate coordinates',()=>{
 const pose={p:[0,0,0],q:[0,0,0,1]},other={slot:1,name:'Crew',stale:false,pose:{p:[100,0,0]}};
 const east=navigationTarget(pose,[other],null,1);assert.equal(east.bearing,90);assert.equal(east.relativeBearing,0);assert.equal(east.distance,100);
 assert.equal(navigationTarget(pose,[{...other,stale:true}],null,1),null);
 const north=navigationTarget(pose,[{...other,pose:{p:[0,0,-100]}}],null,1);assert.equal(north.bearing,0);assert.equal(north.relativeBearing,-90);
});
test('all authored destinations clear islands and stay within standalone bounds',()=>{
 for(const d of DESTINATIONS){assert.ok(Math.hypot(d.x,d.z)+22<WORLD.bounds.radiusM);for(const i of WORLD.islands)assert.ok(Math.hypot(d.x-i.x,d.z-i.z)>i.radius+22);}
});
test('crew UI blocks unready departure, escapes names as text and keeps selected teammate',()=>{
 const info={state:'hosting',plan:{destination:'buoy-1',departAt:null},roster:[{slot:0,self:true,host:true,connected:true,visible:true,ready:true,name:'H'},{slot:1,connected:true,visible:true,ready:false,name:'<img>'}]};
 assert.equal(crewView(info).canDepart,false);info.roster[1].ready=true;assert.equal(crewView(info).canDepart,true);
 const doc={createElement:()=>({})},root={value:'1',replaceChildren(...v){this.children=v;}};fillCrewTargets(doc,root,info.roster);assert.equal(root.value,'1');assert.equal(root.children[1].textContent,'2 · <img>');assert.ok(!('innerHTML' in root.children[1]));
 fillCrewTargets(doc,root,[info.roster[0]]);assert.equal(root.value,'rally');
});
