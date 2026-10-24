import test from 'node:test';
import assert from 'node:assert/strict';
import {PeerRoom} from '../peer-room.mjs';
import {HostRoom,randomId,secret,VERSION} from '../protocol.mjs';
import {WORLD} from '../../standalone/world.mjs';
import {BoatController} from '../../standalone/controller.mjs';
import {memoryNetwork,settle} from './eight-network.mjs';

test('P3 regression: one guest send failure does not end the host room',async()=>{
  const net=memoryNetwork(),all=[];let clock=100;
  const make=()=>{const boat=new BoatController(),r=new PeerRoom({read:()=>boat.sample(),onSpawn:p=>boat.place(p),peerFactory:net.factory,now:()=>clock,tickMs:100000});all.push(r);return r;};
  try{const host=make();await host.start({name:'Host'});await settle();const guest=make();await guest.start({name:'Guest',invite:host.link});await settle();assert.equal(host.room.players.size,2);
    host.connections.get(guest.id).c.throwSend=true;clock+=100;host.tick();await settle();assert.equal(host.info.state,'hosting');assert.ok(host.room);
  }finally{all.forEach(r=>r.leave(false));await settle();}
});

test('P3 regression: disconnected identity keeps its reserved seat',()=>{
  let now=0;const h=new HostRoom({id:randomId(),key:secret(),name:'Host',now:()=>now}),id=randomId(),key=secret();
  const hello={v:VERSION,type:'hello',key:h.key,name:'Guest',world:WORLD.worldRevision,resumeKey:key};
  h.add(id,hello);assert.equal(typeof h.disconnect,'function','same-identity reconnect reservation is missing');h.disconnect(id);
  assert.equal(h.players.size,2);assert.equal(h.players.get(id).connected,false);now=1000;const w=h.add(id,hello);assert.equal(w.resumed,true);assert.equal(h.players.size,2);
});
