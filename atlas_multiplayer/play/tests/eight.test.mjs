import test from 'node:test';
import assert from 'node:assert/strict';
import {PeerRoom} from '../peer-room.mjs';
import {HostRoom,randomId,secret,VERSION,checkedSnapshot,RESUME_MS,parseInvite} from '../protocol.mjs';
import {BoatController} from '../../standalone/controller.mjs';
import {WORLD} from '../../standalone/world.mjs';
import {memoryNetwork,settle} from './eight-network.mjs';

function fleet(net=memoryNetwork()){
  let time=100;const all=[];
  const make=()=>{const boat=new BoatController();let spawns=0,resumes=0;const room=new PeerRoom({read:()=>boat.sample(),onSpawn:p=>{boat.place(p);spawns++;},onResume:()=>{boat.input();resumes++;},peerFactory:net.factory,now:()=>time,tickMs:100000});const x={boat,room,counts:()=>({spawns,resumes})};all.push(x);return x;};
  return {all,net,make,advance:ms=>{time+=ms;},async tick(n=1){for(let i=0;i<n;i++){time+=100;for(const x of all){x.boat.engine=true;x.boat.input({throttle:.55,steer:.1});for(let k=0;k<6;k++)x.boat.step(1/60);}for(const x of all)x.room.tick();await settle();}},async close(){all.forEach(x=>x.room.leave(false));await settle();}};
}
async function joinEight(f){const h=f.make();await h.room.start({name:'Owen'});await settle();const guests=Array.from({length:7},()=>f.make());await Promise.all(guests.map((x,i)=>x.room.start({name:'Captain '+(i+2),invite:h.room.link})));await settle(20);return h;}

test('eight adapters: simultaneous joins, eight distinct seats and all 56 remote views update',async()=>{
  const f=fleet();try{const h=await joinEight(f);assert.equal(h.room.room.players.size,8);for(const x of f.all)assert.equal(x.counts().spawns,1);await f.tick(5);
    const before=f.all.map(x=>x.room.remotes().map(r=>r.pose.p));await f.tick(25);
    for(let i=0;i<8;i++){const r=f.all[i].room;assert.equal(r.info.connected,8);assert.equal(r.info.players,8);assert.equal(r.info.roster.length,8);assert.equal(new Set(r.info.roster.map(p=>p.slot)).size,8);assert.equal(r.remotes().length,7);assert.ok(r.remotes().every((p,j)=>Math.hypot(p.pose.p[0]-before[i][j][0],p.pose.p[2]-before[i][j][2])>1),'all seven boats must translate horizontally, not only bob');assert.ok(r.remotes().every(p=>!p.stale));}
    assert.ok(f.net.metrics.maxPacket<16384);console.log('EIGHT_MEMORY',JSON.stringify(f.net.metrics));
  }finally{await f.close();}
});
test('ninth captain is rejected without disconnecting the eight admitted captains',async()=>{
  const f=fleet();try{const h=await joinEight(f),ninth=f.make();await ninth.room.start({name:'Ninth',invite:h.room.link});await settle(20);assert.equal(ninth.room.info.state,'error');assert.match(ninth.room.info.message,/eight/);await f.tick(2);assert.equal(h.room.room.players.size,8);assert.ok(f.all.slice(0,8).every(x=>x.room.info.connected===8));}finally{await f.close();}
});
test('eight-player drop and retry: identity, seat, sequence retained with no respawn',async()=>{
  const f=fleet();try{const h=await joinEight(f);await f.tick(5);const g=f.all[4],id=g.room.id,slot=g.room.slot,seq=g.room.seq;
    g.room.connections.get(h.room.id).c.close();await settle();assert.equal(g.room.info.state,'reconnecting');assert.equal(h.room.room.players.get(id).connected,false);assert.equal(h.room.room.players.size,8);
    f.advance(600);g.room.tick();await settle(20);await f.tick(3);assert.equal(g.room.id,id);assert.equal(g.room.slot,slot);assert.equal(g.counts().spawns,1);assert.ok(g.counts().resumes>0);assert.ok(g.room.seq>seq);assert.equal(g.room.info.connected,8);assert.equal(h.room.room.players.size,8);
  }finally{await f.close();}
});
test('wrong resume secret cannot take a reserved seat; secrets are absent from snapshots',()=>{
  let now=100;const h=new HostRoom({id:randomId(),key:secret(),name:'H',now:()=>now}),id=randomId(),resumeKey=secret();const hello={v:VERSION,type:'hello',key:h.key,name:'G',world:WORLD.worldRevision,resumeKey};h.add(id,hello);h.disconnect(id);
  assert.throws(()=>h.add(id,{...hello,resumeKey:secret()}),/SESSION_EXPIRED/);assert.equal(h.players.get(id).connected,false);const s=JSON.stringify(h.snapshot());assert.ok(!s.includes(resumeKey));assert.ok(!s.includes(h.key));now+=RESUME_MS;assert.throws(()=>h.add(id,{...hello,resume:true}),/SESSION_EXPIRED/);assert.equal(h.players.size,1);
});
test('same-identity active takeover rejected, expired slots become available',()=>{
  let now=1;const h=new HostRoom({id:randomId(),key:secret(),name:'H',now:()=>now}),hello=()=>({v:VERSION,type:'hello',key:h.key,name:'G',world:WORLD.worldRevision,resumeKey:secret()});
  const ids=[];for(let i=0;i<7;i++){const id=randomId(),m=hello();h.add(id,m);ids.push(id);assert.throws(()=>h.add(id,m),/SESSION_ACTIVE/);}
  h.disconnect(ids[2]);assert.throws(()=>h.add(randomId(),hello()),/ROOM_FULL/);now+=RESUME_MS+1;h.add(randomId(),hello());assert.equal(h.players.size,8);
});
test('room isolation and invitation world/version refusal do not affect existing fleet',async()=>{
  const f=fleet();try{const h=await joinEight(f),other=f.make();await other.room.start({name:'Other room'});await settle();await f.tick(3);assert.equal(other.room.info.players,1);assert.equal(other.room.remotes().length,0);assert.equal(h.room.info.connected,8);const invite=parseInvite(h.room.link);assert.throws(()=>parseInvite(h.room.link.replace('v=3','v=2')),/BAD_INVITE/);assert.equal(invite.room,h.room.id);}finally{await f.close();}
});
test('one saturated peer drops latest snapshots instead of queuing unlimited history',async()=>{
  const f=fleet();try{const h=await joinEight(f);await f.tick(2);const c=h.room.connections.get(f.all[1].room.id).c;c.dataChannel.bufferedAmount=70000;await f.tick(10);assert.equal(h.room.info.state,'hosting');assert.equal(h.room.info.connected,8);assert.ok(h.room.metrics.dropped>=10);assert.ok(f.all[2].room.remotes().length===7);c.dataChannel.bufferedAmount=0;await f.tick(2);assert.equal(h.room.info.connected,8);}finally{await f.close();}
});
test('host closing ends clients after bounded reconnect, no immortal live badge',async()=>{
  const f=fleet();try{const h=await joinEight(f);await f.tick(2);h.room.leave(false);await settle();f.advance(RESUME_MS+1);for(const g of f.all.slice(1))g.room.tick();await settle();assert.ok(f.all.slice(1).every(x=>x.room.info.state==='error'&&x.room.remotes().length===0));}finally{await f.close();}
});
test('guest protocol fault ejects only that guest; unrelated signaling error does not kill host',async()=>{
  const f=fleet();try{const h=await joinEight(f);await f.tick(2);h.room.peer.emit('error',{type:'webrtc',peer:f.all[1].room.id});assert.equal(h.room.info.state,'hosting');const g=f.all[2];g.room.connections.get(h.room.id).c.send('{not json');await settle();await new Promise(r=>setTimeout(r,100));await settle();assert.equal(g.room.info.state,'error');await f.tick(2);assert.equal(h.room.info.state,'hosting');assert.equal(h.room.info.connected,7);}finally{await f.close();}
});
test('snapshot identity, clock and unchanged-sequence changes are rejected',()=>{
  const h=new HostRoom({id:randomId(),key:secret(),name:'H'}),id=randomId();h.add(id,{v:VERSION,type:'hello',key:h.key,name:'G',world:WORLD.worldRevision,resumeKey:secret()});const b=new BoatController();h.update(id,{v:VERSION,type:'state',seq:0,sample:b.sample()});const before=h.snapshot();checkedSnapshot(before,{host:h.id,self:id});
  for(const edit of [s=>s.players[1].slot=0,s=>s.players[1].seq=-1,s=>s.players[1].pose.p[0]+=1,s=>s.players[1].resumeKey=secret()]){const after=h.snapshot();edit(after);assert.throws(()=>checkedSnapshot(after,{host:h.id,self:id,previousSerial:before.serial,previous:before}));}
});
test('cancellation before async peer creation cannot reopen a room',async()=>{
  let release,destroyed=0;const b=new BoatController(),r=new PeerRoom({read:()=>b.sample(),onSpawn:()=>assert.fail('spawned'),peerFactory:()=>new Promise(ok=>{release=ok;})});const pending=r.start({name:'H'});r.leave();release({destroy(){destroyed++;}});await pending;assert.equal(destroyed,1);assert.equal(r.info.state,'solo');
});
