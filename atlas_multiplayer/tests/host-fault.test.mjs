/** Real socket fixture for MP host/observer fault containment, not CORE runtime evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
import {createMultiplayerServer} from '../server.mjs';
import {createCoreAdapter} from '../client/core-adapter.mjs';
import {FIXTURE_WORLD,FIXTURE_VESSEL} from './fixtures/world.mjs';
import {FixtureController,regressionScenario} from './fixtures/host.mjs';
const origin='http://127.0.0.1:3000';
async function until(fn){const end=performance.now()+2500;while(!fn()){if(performance.now()>end)throw Error('Condition timeout');await delay(5);}}
async function setup(t){
 const app=createMultiplayerServer({origins:[origin],roomOptions:{world:FIXTURE_WORLD,allowFixture:true}});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const clients=[];
 t.after(async()=>{for(const a of clients){Object.keys(a.faults).forEach(k=>a.faults[k]=false);a.adapter.dispose();}await app.stop();});
 async function client(faults={}){
  const c=new FixtureController(),peers=new Map(),counts={render:0,remove:0,exit:0,status:0,prepare:0};let roster=0;
  const rejected=()=>Promise.reject(Error('PRIVATE_ASYNC_SECRET'));
  const blow=k=>{if(faults[k])throw Object.assign(Error('PRIVATE_HOST_SECRET'),{code:'PRIVATE_HOST_SECRET'});};
  const adapter=await createCoreAdapter({enabled:true,world:FIXTURE_WORLD,allowFixture:true,vesselId:FIXTURE_VESSEL,
   endpoint:`ws://127.0.0.1:${app.server.address().port}/ws`,baseUrl:origin+'/fixture',webSocketFactory:url=>new WebSocket(url,{origin}),
   host:{readLocal:()=>{if(faults.readAsync)return rejected();if(faults.readCode)throw Object.assign(Error('PRIVATE_READER_DETAILS'),{code:faults.readCode});return {vesselId:FIXTURE_VESSEL,pose:c.pose(),clock:c.clock()};},
    prepareLocal:async ctx=>{counts.prepare++;blow('prepare');c.apply(ctx.pose);return true;},
    renderRemote:p=>{counts.render++;if(faults.renderAsync)return rejected();blow('render');peers.set(p.entityId,p);},
    removeRemote:id=>{counts.remove++;if(faults.removeAsync)return rejected();blow('remove');peers.delete(id);},
    exitLocal:()=>{counts.exit++;if(faults.exitAsync)return rejected();blow('exit');},
    get networkStatus(){if(faults.statusGetter)throw Error('PRIVATE_STATUS_GETTER');return ()=>{counts.status++;if(faults.statusAsync)return rejected();blow('status');};}}});
  adapter.subscribe('snapshot',s=>{roster=s.players.length;});
  const value={adapter,c,peers,faults,counts,get roster(){return roster;}};clients.push(value);return value;
 }
 async function pair(){const a=await client(),b=await client();await a.adapter.create('A');await b.adapter.join('B',a.adapter.invite());await until(()=>a.roster===2&&b.roster===2);return {a,b};}
 return {app,client,pair};
}

test('render callback failure cannot escape the host frame loop',{timeout:5000},async t=>{
 const f=await setup(t),{a,b}=await f.pair();a.adapter.render();a.faults.render=true;
 assert.doesNotThrow(()=>a.adapter.render());await until(()=>a.adapter.info.state==='error');
 assert.equal(a.adapter.info.error,'HOST_RENDER_FAILED');assert.equal(a.adapter.info.cleanupIncomplete,false);
 assert.equal(a.counts.exit,1);const sent=a.adapter.stats.sent;
 const expected=regressionScenario();for(let i=0;i<600;i++){a.c.step(1/60);assert.doesNotThrow(()=>a.adapter.render());}
 assert.deepEqual(regressionScenario(),expected);await delay(120);assert.equal(a.adapter.stats.sent,sent);
 assert.equal(b.adapter.info.state,'connected');assert.ok(!JSON.stringify(a.adapter.info).includes('PRIVATE_HOST_SECRET'));
});

test('observer mutation cannot corrupt another subscriber or the network cursor',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client();let observed=null;
 a.adapter.subscribe('snapshot',s=>{s.players[0].seq=999999;s.players[0].pose.p[0]=99999;});
 a.adapter.subscribe('snapshot',s=>{observed=s.players[0];});
 await a.adapter.create('A');await until(()=>observed!==null);await delay(220);
 assert.ok(observed.seq<100);assert.notEqual(observed.pose.p[0],99999);assert.equal(a.adapter.info.state,'connected');
});

test('throwing optional status sink is disabled and recorded without disrupting motion',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client({status:true});let status;
 a.adapter.subscribe('status',s=>{status=s;});await a.adapter.create('A');await delay(180);
 assert.equal(a.adapter.info.state,'connected');assert.equal(status.state,'connected');assert.equal(a.counts.status,1);
 assert.ok(a.adapter.info.warnings.includes('HOST_STATUS_FAILED'));assert.ok(a.adapter.stats.sent>0);
 assert.ok(!JSON.stringify(a.adapter.info).includes('PRIVATE_HOST_SECRET'));
});

test('throwing subscriber is detached once and healthy subscribers still receive state',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client();let bad=0,good=0;
 a.adapter.subscribe('snapshot',()=>{bad++;throw Error('PRIVATE_OBSERVER_SECRET');});
 a.adapter.subscribe('snapshot',()=>{good++;});await a.adapter.create('A');await delay(230);
 assert.equal(bad,1);assert.ok(good>1);assert.equal(a.adapter.info.state,'connected');
 assert.ok(a.adapter.info.warnings.includes('OBSERVER_FAILED'));assert.equal(a.adapter.stats.observerFailures,1);
});

test('remote removal failure is surfaced as incomplete cleanup, not successful departure',{timeout:5000},async t=>{
 const f=await setup(t),{a,b}=await f.pair();a.adapter.render();assert.equal(a.peers.size,1);a.faults.remove=true;
 b.adapter.leave();await until(()=>a.adapter.info.state==='error');
 assert.equal(a.adapter.info.error,'HOST_REMOVE_FAILED');assert.equal(a.adapter.info.cleanupIncomplete,true);
 assert.equal(a.peers.size,1,'Host removal actually failed; do not claim a cleared visual');
 await assert.rejects(a.adapter.create('Again'),/HOST_CLEANUP_REQUIRED/);assert.equal(a.counts.exit,1);
});

test('throwing exit callback is contained, attempted once and blocks unsafe reuse',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client();await a.adapter.create('A');a.faults.exit=true;
 assert.doesNotThrow(()=>a.adapter.leave());await until(()=>a.adapter.info.state==='error');
 assert.equal(a.adapter.info.error,'HOST_EXIT_FAILED');assert.equal(a.adapter.info.cleanupIncomplete,true);
 assert.doesNotThrow(()=>a.adapter.leave());assert.doesNotThrow(()=>a.adapter.dispose());assert.equal(a.counts.exit,1);
});

test('render failure still attempts all cleanup hooks without recursive teardown',{timeout:5000},async t=>{
 const f=await setup(t),{a,b}=await f.pair();a.adapter.render();Object.assign(a.faults,{render:true,remove:true,exit:true});
 assert.doesNotThrow(()=>a.adapter.render());await until(()=>a.adapter.info.cleanupIncomplete===true);
 assert.equal(a.adapter.info.error,'HOST_RENDER_FAILED');assert.equal(a.counts.exit,1);assert.equal(a.counts.remove,1);
 assert.ok(a.adapter.info.warnings.includes('HOST_REMOVE_FAILED'));assert.ok(a.adapter.info.warnings.includes('HOST_EXIT_FAILED'));
 assert.equal(b.adapter.info.state,'connected');assert.doesNotThrow(()=>a.adapter.dispose());assert.equal(a.counts.remove,1);
});

test('prepare exception cannot leak host-controlled error codes',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client({prepare:true});await assert.rejects(a.adapter.create('A'),/HOST_PREPARE_FAILED/);
 await until(()=>f.app.store.sessions.size===0);assert.equal(a.adapter.info.error,'HOST_PREPARE_FAILED');assert.equal(a.counts.exit,1);
});

test('disposed adapter rejects new connections and remains inert',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client();await a.adapter.create('A');a.adapter.dispose();
 await assert.rejects(a.adapter.create('Again'),/ADAPTER_DISPOSED/);assert.equal(a.adapter.render(),0);assert.equal(a.counts.exit,1);
 await until(()=>f.app.store.sessions.size===0);
});

for(const key of ['read','render','remove','exit']){
 test('asynchronous '+key+' hook is observed, contained and cannot report clean teardown',{timeout:5000},async t=>{
  const f=await setup(t),{a,b}=await f.pair();a.adapter.render();a.faults[key+'Async']=true;
  if(key==='render')assert.doesNotThrow(()=>a.adapter.render());
  if(key==='remove')b.adapter.leave();
  if(key==='exit')assert.doesNotThrow(()=>a.adapter.leave());
  await until(()=>a.adapter.info.state==='error');await delay(30);
  assert.equal(a.adapter.info.cleanupIncomplete,true);
  assert.ok(a.adapter.info.warnings.includes('HOST_ASYNC_HOOK_UNSUPPORTED'));
  await assert.rejects(a.adapter.create('Unsafe rejoin'),/HOST_CLEANUP_REQUIRED/);
  assert.ok(!JSON.stringify(a.adapter.info).includes('PRIVATE_ASYNC_SECRET'));
 });
}

test('asynchronous optional sink and observer reject once without unhandled rejection or outage',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client({statusAsync:true});let bad=0,good=0;
 a.adapter.subscribe('snapshot',async()=>{bad++;throw Error('PRIVATE_OBSERVER_ASYNC');});
 a.adapter.subscribe('snapshot',()=>{good++;});await a.adapter.create('A');await delay(230);
 assert.equal(a.adapter.info.state,'connected');assert.equal(a.counts.status,1);assert.equal(bad,1);assert.ok(good>1);
 assert.ok(a.adapter.info.warnings.includes('HOST_ASYNC_HOOK_UNSUPPORTED'));
 assert.ok(a.adapter.info.warnings.includes('OBSERVER_ASYNC_UNSUPPORTED'));assert.equal(a.adapter.info.cleanupIncomplete,false);
});

test('optional status getter failure is redacted and cannot prevent connection',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client({statusGetter:true});await a.adapter.create('A');await delay(130);
 assert.equal(a.adapter.info.state,'connected');assert.equal(a.counts.status,0);assert.ok(a.adapter.stats.sent>0);
 assert.ok(a.adapter.info.warnings.includes('HOST_STATUS_FAILED'));assert.ok(!JSON.stringify(a.adapter.info).includes('PRIVATE_STATUS_GETTER'));
});

test('C1 reader rejection codes remain specific but private details are not leaked',{timeout:5000},async t=>{
 const f=await setup(t),a=await f.client();await a.adapter.create('A');a.faults.readCode='STALE_WORLD_REVISION';
 await until(()=>a.adapter.info.state==='error');assert.equal(a.adapter.info.error,'STALE_WORLD_REVISION');
 assert.ok(!JSON.stringify(a.adapter.info).includes('PRIVATE_READER_DETAILS'));assert.equal(a.counts.exit,1);
});
