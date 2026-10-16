import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { createMultiplayerServer } from '../server.mjs';
import { PROTOCOL } from '../rooms.mjs';

const ORIGIN = 'http://127.0.0.1:3000';
const pose = x => ({p:[x,0,2],q:[0,0,0,1],engine:true,rpm:1000,gear:1});
const hello = (action='create', extra={}) => ({protocol:PROTOCOL,action,
  worldId:'practice-bay',worldRevision:'sealab11',name:'Socket test',...extra});
const join = h => hello('join',{roomId:h.roomId,key:h.key});
const resume = h => hello('resume',{roomId:h.roomId,key:h.key,playerId:h.playerId,resumeToken:h.resumeToken});
const within = (promise, ms=3000) => {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(`Timed out after ${ms}ms`)),ms);
  })]).finally(()=>clearTimeout(timer));
};
async function fixture(t, opts={}) {
  const app=createMultiplayerServer({origins:[ORIGIN],...opts});
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const clients=[];
  t.after(async()=>{for(const c of clients)c.ws.terminate(); await app.stop();});
  async function client(first=hello(), origin=ORIGIN) {
    const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin});
    const inbox=[]; let closed=null;
    ws.on('message',raw=>{inbox.push(JSON.parse(raw.toString()));});
    ws.on('close',(code,reason)=>{closed={code,reason:reason.toString()};});
    ws.on('error',()=>{});
    const c={ws,inbox,send:m=>ws.send(JSON.stringify(m)),
      get closed(){return closed;},
      async wait(predicate){return within((async()=>{
        for(;;){const found=inbox.find(predicate);if(found)return found;
          if(closed)throw new Error(`Closed before expected message: ${closed.code}/${closed.reason}`);
          await delay(5);}
      })());},
      async waitClose(){return within((async()=>{while(!closed)await delay(5);return closed;})());}
    };
    clients.push(c);
    await within(once(ws,'open')); if(first)c.send(first);
    return c;
  }
  async function enter(first=hello()) {const c=await client(first);c.welcome=await c.wait(m=>m.type==='welcome');return c;}
  return {...app,base,client,enter};
}
const isAt = (id,x) => m => m.type==='snapshot' && m.players.some(p=>p.id===id&&p.pose?.p[0]===x);

test('real sockets: two clients exchange both boats; unrelated room remains isolated',{timeout:5000},async t=>{
  const f=await fixture(t), a=await f.enter(), b=await f.enter(join(a.welcome)), outsider=await f.enter();
  a.send({type:'state',seq:0,pose:pose(11)}); b.send({type:'state',seq:0,pose:pose(22)});
  await b.wait(isAt(a.welcome.playerId,11)); await a.wait(isAt(b.welcome.playerId,22));
  await delay(180);
  const other=outsider.inbox.filter(m=>m.type==='snapshot');
  assert.ok(other.length>1);
  assert.ok(other.every(m=>m.players.length===1&&m.players[0].id===outsider.welcome.playerId));
  assert.ok(b.inbox.filter(m=>m.type==='snapshot').every(m=>!JSON.stringify(m).includes(a.welcome.resumeToken)));
});

test('healthcheck is real HTTP and unknown routes are not exposed',{timeout:5000},async t=>{
  const f=await fixture(t); const r=await fetch(f.base+'/healthz');
  assert.equal(r.status,200);assert.equal((await r.json()).protocol,PROTOCOL);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(f.base+'/rooms')).status,404);
});

test('WebSocket upgrade rejects absent, hostile and suffix-lookalike origins',{timeout:5000},async t=>{
  const f=await fixture(t);
  for(const origin of [undefined,'https://attacker.invalid',ORIGIN+'.attacker.invalid']) {
    const ws=new WebSocket(f.base.replace('http','ws')+'/ws',origin?{origin}:{});
    ws.on('error',()=>{});
    const status=await within(new Promise(resolve=>ws.once('unexpected-response',(_req,res)=>{
      resolve(res.statusCode);res.resume();ws.terminate();
    })));
    assert.equal(status,403);
  }
  const a=await f.enter(); assert.ok(a.welcome.playerId);
});

test('socket reconnect retains identity, pose, and next sequence; no duplicate',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter(),b=await f.enter(join(a.welcome));
  a.send({type:'state',seq:17,pose:pose(13)});await b.wait(isAt(a.welcome.playerId,13));
  a.ws.terminate();await a.waitClose();
  await b.wait(m=>m.type==='snapshot'&&m.players.some(p=>p.id===a.welcome.playerId&&!p.connected));
  const again=await f.enter(resume(a.welcome));
  assert.equal(again.welcome.playerId,a.welcome.playerId);assert.equal(again.welcome.nextSequence,18);
  assert.deepEqual(again.welcome.selfPose,pose(13));
  again.send({type:'state',seq:18,pose:pose(14)});
  const s=await b.wait(isAt(a.welcome.playerId,14));
  assert.equal(s.players.filter(p=>p.id===a.welcome.playerId).length,1);
});

test('live session takeover is rejected, original socket still works',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter(),c=await f.client(resume(a.welcome));
  assert.equal((await c.waitClose()).reason,'SESSION_ACTIVE');
  a.send({type:'state',seq:0,pose:pose(1)});await a.wait(isAt(a.welcome.playerId,1));
});

test('malformed JSON, null, binary and invalid state close only offending sockets',{timeout:5000},async t=>{
  const f=await fixture(t),good=await f.enter();
  for(const raw of ['{','null',Buffer.from([1,2,3])]) {
    const c=await f.client(null);c.ws.send(raw);
    assert.equal((await c.waitClose()).code,4000);
  }
  const bad=await f.enter(join(good.welcome));bad.send({type:'state',seq:0,pose:{...pose(0),q:[0,0,0,0]}});
  assert.equal((await bad.waitClose()).reason,'BAD_POSE');
  good.send({type:'state',seq:0,pose:pose(3)});await good.wait(isAt(good.welcome.playerId,3));
});

test('oversized WebSocket payload is closed with 1009; service survives',{timeout:5000},async t=>{
  const f=await fixture(t),bad=await f.client(null);
  bad.ws.send('x'.repeat(4097));assert.equal((await bad.waitClose()).code,1009);
  assert.ok((await f.enter()).welcome.playerId);
});

test('spoofed owner field cannot update another boat across actual sockets',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter(),b=await f.enter(join(a.welcome));
  a.send({type:'state',seq:0,pose:pose(9),playerId:b.welcome.playerId});
  assert.equal((await a.waitClose()).reason,'BAD_STATE');
  assert.equal(f.store.snapshot(a.welcome.roomId).players.find(p=>p.id===b.welcome.playerId).pose,null);
});

test('wrong protocol/world and invitation keys are rejected',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter();
  for(const [h,reason] of [[hello('create',{protocol:'old'}),'VERSION_MISMATCH'],
    [hello('create',{worldRevision:'not-approved'}),'WORLD_MISMATCH'],
    [{...join(a.welcome),key:'invalid'},'ROOM_UNAVAILABLE']]) {
    const c=await f.client(h);assert.equal((await c.waitClose()).reason,reason);
  }
});

test('full-room rejection and explicit leave immediately free a seat',{timeout:5000},async t=>{
  const f=await fixture(t,{roomOptions:{maxPlayers:2}}),a=await f.enter(),b=await f.enter(join(a.welcome));
  const full=await f.client(join(a.welcome));assert.equal((await full.waitClose()).reason,'ROOM_FULL');
  b.send({type:'leave'});assert.equal((await b.waitClose()).code,1000);
  assert.ok((await f.enter(join(a.welcome))).welcome.playerId);
});

test('inbound floods close an offender without closing other rooms',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter(),b=await f.enter();
  const warnings=[]; const onWarning=w=>warnings.push(w); process.on('warning',onWarning);
  t.after(()=>process.off('warning',onWarning));
  for(let i=0;i<100;i++)a.send({type:'state',seq:i,pose:pose(2)});
  assert.equal((await a.waitClose()).reason,'RATE_LIMIT');
  b.send({type:'state',seq:0,pose:pose(4)});await b.wait(isAt(b.welcome.playerId,4));
  assert.equal(warnings.length,0,'Flood shutdown must not leak close listeners');
});

test('shutdown closes sockets and HTTP listener within a bounded wait',{timeout:5000},async t=>{
  const f=await fixture(t),a=await f.enter(),b=await f.enter(join(a.welcome));
  await within(f.stop(),2000);
  await a.waitClose();await b.waitClose();assert.equal(f.server.listening,false);
});
