/** Runs the same browser-client modules against real loopback sockets in Node.
 * This is not browser/DOM proof and cannot substitute for the browser release gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createMultiplayerServer} from '../server.mjs';
import {createCoreAdapter} from '../client/core-adapter.mjs';
import {createRoomClient} from '../client/room-client.mjs';
import {FIXTURE_WORLD,FIXTURE_VESSEL} from './fixtures/world.mjs';
import {FixtureController,regressionScenario} from './fixtures/host.mjs';
const ORIGIN='http://127.0.0.1:3000', BASE=ORIGIN+'/tests/fixtures/index.html';
async function until(predicate,ms=3500){
  const end=performance.now()+ms;
  while(!predicate()){if(performance.now()>end)throw new Error('Timed out waiting for condition');await delay(5);}
}
async function setup(t){
  const app=createMultiplayerServer({origins:[ORIGIN],roomOptions:{world:FIXTURE_WORLD,allowFixture:true}});
  const sockets=[];app.server.on('connection',s=>sockets.push(s));
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const endpoint=`ws://127.0.0.1:${app.server.address().port}/ws`,adapters=[],timers=[];
  t.after(async()=>{for(const a of adapters)a.dispose();for(const t of timers)clearInterval(t);await app.stop();});
  let connections=0;
  const clientOptions={world:FIXTURE_WORLD,allowFixture:true,endpoint,baseUrl:BASE,
    webSocketFactory:url=>{connections++;return new WebSocket(url,{origin:ORIGIN});}};
  async function client({prepareDelay=0,approve=true,world=FIXTURE_WORLD}={}){
    const c=new FixtureController(),peers=new Map(),statuses=[],counts={prepare:0,restore:0,exit:0,applied:0,render:0,remove:0};
    let forced=null,map=false,saved=null;
    const host={
      readLocal:()=>({vesselId:forced||FIXTURE_VESSEL,pose:c.pose(),clock:c.clock()}),
      prepareLocal:async context=>{
        counts.prepare++;counts.restore+=Number(context.resumed);saved??=c.snapshot();
        if(prepareDelay)await delay(prepareDelay);
        if(context.signal.aborted)return false;
        if(!approve)return false;
        c.apply(context.pose);counts.applied++;return true;
      },
      exitLocal:()=>{counts.exit++;if(saved){c.apply(saved);c.velocity=[...saved.velocity];c.elapsed=saved.elapsed;saved=null;}},
      renderRemote:p=>{counts.render++;peers.set(p.entityId,structuredClone(p));},
      removeRemote:id=>{counts.remove++;peers.delete(id);},
      networkStatus:s=>{if(statuses.at(-1)!==s.state)statuses.push(s.state);}
    };
    const a=await createCoreAdapter({...clientOptions,world,host,enabled:true,vesselId:FIXTURE_VESSEL});adapters.push(a);
    let last=performance.now();timers.push(setInterval(()=>{const now=performance.now();c.step((now-last)/1000);last=now;a.render();},16));
    return {a,c,peers,statuses,counts,forceVessel:id=>{forced=id;},toggleMap:()=>{map=!map;return map;},get map(){return map;}};
  }
  return {app,sockets,client,clientOptions,get connections(){return connections;}};
}

test('actual browser-client module publishes/interpolates two independent host states over sockets',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client(),b=await f.client();
  assert.equal(f.connections,0,'Adapters are inert until explicit create/join');
  await a.a.create('Owen');await b.a.join('Crew',a.a.invite());
  assert.notEqual(a.a.info.playerId,b.a.info.playerId);assert.notEqual(a.c.p[0],b.c.p[0]);
  a.c.velocity=[8,0];b.c.velocity=[-5,0];
  await until(()=>a.peers.size===1&&b.peers.size===1);
  await until(()=>[...b.peers.values()][0].pose.p[0]>3 && [...a.peers.values()][0].pose.p[0]<38);
  assert.ok(a.a.stats.sent>=8&&b.a.stats.sent>=8);assert.ok(a.counts.render>a.a.stats.snapshots);
  assert.equal([...a.peers.values()][0].stale,false);
  const x=a.c.p[0],time=a.a.transportRoomAgeSeconds;
  a.toggleMap();await delay(220);
  assert.ok(a.c.p[0]>x+1);assert.ok(a.a.transportRoomAgeSeconds>time+.15);assert.ok(a.map);
  assert.ok(Math.abs(a.a.transportRoomAgeSeconds-b.a.transportRoomAgeSeconds)<.2);
  assert.equal(a.a.info.state,'connected');assert.equal(b.a.info.state,'connected');
});

test('actual client survives abrupt TCP loss with stable identity, explicit restore and no duplicate remote',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client(),b=await f.client();
  await a.a.create('Owen');await b.a.join('Crew',a.a.invite());a.c.velocity=[8,0];
  await until(()=>b.peers.size===1&&[...b.peers.values()][0].pose.p[0]>1);
  const id=a.a.info.playerId,roomTime=a.a.transportRoomAgeSeconds;
  f.sockets[0].destroy();
  await until(()=>a.statuses.includes('reconnecting'));
  await until(()=>[...b.peers.values()][0]?.stale);
  await until(()=>a.a.info.state==='connected'&&a.a.stats.reconnects===1);
  await until(()=>b.peers.size===1&&![...b.peers.values()][0].stale);
  assert.equal(a.a.info.playerId,id);assert.equal(a.counts.restore,1);assert.equal(b.peers.size,1);
  assert.deepEqual(a.c.velocity,[0,0]);assert.ok(a.a.transportRoomAgeSeconds>=roomTime);
  const x=a.c.p[0];a.c.velocity=[5,0];await until(()=>[...b.peers.values()][0].pose.p[0]>x+1);
});

test('explicit leave clears peers, ends publishing and calls host exit once',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client(),b=await f.client();
  await a.a.create('Owen');await b.a.join('Crew',a.a.invite());await until(()=>a.peers.size===1&&b.peers.size===1);
  const sent=b.a.stats.sent;b.a.leave();await until(()=>a.peers.size===0);
  assert.equal(b.peers.size,0);assert.equal(b.counts.exit,1);await delay(150);
  assert.equal(b.a.stats.sent,sent);assert.equal(b.a.info.state,'idle');b.a.dispose();assert.equal(b.counts.exit,1);
});

test('cancel async host prepare aborts without late state mutation or zombie connection',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client({prepareDelay:250});
  const pending=a.a.create('Owen');const rejected=assert.rejects(pending,/CANCELLED/);
  await until(()=>a.a.info.state==='joining');a.a.leave();await rejected;await delay(400);
  assert.equal(a.counts.applied,0);assert.equal(a.counts.exit,1);assert.equal(a.a.info.state,'idle');
  assert.equal(a.peers.size,0);assert.equal(f.app.store.sessions.size,0);
});

test('host safe-restore refusal is surfaced and room membership is cleaned up',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client({approve:false});
  await assert.rejects(a.a.create('Owen'),/HOST_RESTORE_REFUSED/);
  await until(()=>f.app.store.sessions.size===0);
  assert.equal(a.counts.applied,0);assert.equal(a.counts.exit,1);assert.equal(a.a.info.state,'error');
});

test('world fingerprint mismatch on actual handshake never calls CORE hooks',{timeout:6000},async t=>{
  const f=await setup(t),w=structuredClone(FIXTURE_WORLD);w.weather.windMps=1;
  const a=await f.client({world:w});await assert.rejects(a.a.create('Owen'),/WORLD_MISMATCH/);
  assert.equal(a.counts.prepare,0);assert.equal(a.counts.applied,0);assert.equal(f.app.store.rooms.size,0);
});

test('vessel switch requires leave/rejoin; never substitutes Bay/fixture footprint for yacht',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client();await a.a.create('Owen');
  a.forceVessel('atlas-d-original-r7');await until(()=>a.a.info.error==='VESSEL_SWITCH_REQUIRES_REJOIN');
  assert.equal(a.counts.exit,1);await until(()=>f.app.store.sessions.size===0);
});

test('new room clock resets after prior room instead of carrying old elapsed time',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client();await a.a.create('Owen');await delay(350);
  assert.ok(a.a.transportRoomAgeSeconds>.3);a.a.leave();assert.equal(a.a.transportRoomAgeSeconds,null);
  await a.a.create('Owen');assert.ok(a.a.transportRoomAgeSeconds<.2);assert.equal(a.counts.prepare,2);
});

test('host sample throws fail closed without leaking private exception details',{timeout:6000},async t=>{
  const f=await setup(t);
  const c=await createRoomClient({...f.clientOptions,onWelcome:async()=>true,readPose:()=>{throw new Error('PRIVATE_HOST_DATA');}});
  t.after(()=>c.leave());await c.create({name:'Owen',vesselId:FIXTURE_VESSEL});
  await until(()=>c.info.state==='error');assert.equal(c.info.error,'HOST_SAMPLE_FAILED');assert.ok(!JSON.stringify(c.info).includes('PRIVATE_HOST_DATA'));
});

test('disabled adapter leaves deterministic fixture controller outcome identical',{timeout:6000},async()=>{
  const expected=regressionScenario();let touched=0;
  const a=await createCoreAdapter({enabled:false,host:new Proxy({},{get(){touched++;}})});
  for(let i=0;i<600;i++)a.render();a.dispose();
  assert.deepEqual(regressionScenario(),expected);assert.equal(touched,0);
});

test('source epoch reset propagates through actual client sockets with no interpolation across placement',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client(),b=await f.client();
  await a.a.create('Owen');await b.a.join('Crew',a.a.invite());
  a.c.p=[10,0,0];a.c.elapsed=20;
  await until(()=>[...b.peers.values()][0]?.pose.p[0]===10);
  const observed=[];const timer=setInterval(()=>{const p=[...b.peers.values()][0];if(p)observed.push(p.pose.p[0]);},3);
  t.after(()=>clearInterval(timer));
  a.c.apply({...a.c.pose(),p:[20,0,0]});a.c.elapsed=0;
  await until(()=>[...b.peers.values()][0]?.pose.p[0]===20);clearInterval(timer);
  assert.ok(observed.every(x=>x===10||x===20),'Never interpolate between two source epochs');
  const own=f.app.store.snapshot(a.a.info.roomId).players.find(p=>p.id===a.a.info.playerId);
  assert.equal(own.clock.epoch,a.c.epoch);assert.ok(own.clock.seconds<1);
});

test('source clock rollback over an actual socket is rejected without updating accepted pose',{timeout:6000},async t=>{
  const f=await setup(t),a=await f.client();await a.a.create('Owen');
  a.c.epoch=5;a.c.elapsed=20;await until(()=>f.app.store.snapshot(a.a.info.roomId)?.players[0].clock?.epoch===5);
  const roomId=a.a.info.roomId,old=f.app.store.snapshot(roomId).players[0].pose.p[0];
  a.c.epoch=4;a.c.p[0]=999;
  await until(()=>a.a.info.state==='error');assert.equal(a.a.info.error,'SOURCE_CLOCK_REGRESSION');
  const still=f.app.store.snapshot(roomId)?.players[0];if(still)assert.equal(still.pose.p[0],old);
});

for(const kind of ['sequence-rollback','same-sequence-pose-change','source-epoch-rollback']){
  test('actual client rejects inconsistent server snapshot: '+kind,{timeout:6000},async t=>{
    const f=await setup(t),a=await f.client();let received=null;
    const unsubscribe=a.a.subscribe('snapshot',s=>{received=structuredClone(s);});t.after(unsubscribe);
    await a.a.create('Owen');a.c.epoch=10;
    await until(()=>a.a.stats.snapshots>=3&&f.app.store.snapshot(a.a.info.roomId)?.players[0].clock?.epoch===10);
    const original=f.app.store.snapshot.bind(f.app.store),baseline=received.players[0];
    f.app.store.snapshot=roomId=>{
      const snap=original(roomId);if(!snap)return snap;const p=snap.players[0];
      if(kind==='sequence-rollback')p.seq=-1;
      if(kind==='same-sequence-pose-change'){p.seq=baseline.seq;p.updatedAt=baseline.updatedAt;p.clock=structuredClone(baseline.clock);p.pose=structuredClone(baseline.pose);p.pose.p[0]+=999;}
      if(kind==='source-epoch-rollback')p.clock.epoch=9;
      return snap;
    };
    await until(()=>a.a.info.state==='error');assert.equal(a.a.info.error,'BAD_SERVER_MESSAGE');
    assert.equal(a.counts.exit,1);
  });
}
