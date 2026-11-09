/* Deterministic distance-prioritized residency. No simulation or geographic data mutation. */
(function(g,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;else g.AtlasCruiseStream=a;})(globalThis,()=>{
'use strict';
const distance=(t,x,z)=>t.bounds?Math.hypot(Math.max(t.bounds[0]-x,0,x-t.bounds[2]),Math.max(t.bounds[1]-z,0,z-t.bounds[3])):Math.max(0,Math.hypot(t.x-x,t.z-z)-t.radius);
function plan(tiles,state,config={}){
 const cfg={radius:900,lookAheadSeconds:12,maxLookAhead:420,maxBytes:10*1024*1024,maxTiles:24,...config};
 if(![state.x,state.z,state.vx||0,state.vz||0].every(Number.isFinite))return [];
 const speed=Math.hypot(state.vx||0,state.vz||0),scale=speed?Math.min(cfg.lookAheadSeconds,cfg.maxLookAhead/speed):0;
 const ax=state.x+(state.vx||0)*scale,az=state.z+(state.vz||0)*scale;
 const rows=tiles.map(t=>{const near=distance(t,state.x,state.z),ahead=distance(t,ax,az);return {tile:t,score:Math.min(near,ahead+120),near,ahead};})
  .filter(r=>Math.min(r.near,r.ahead)<=cfg.radius).sort((a,b)=>a.score-b.score||a.tile.id.localeCompare(b.tile.id));
 let bytes=0;return rows.filter(r=>{if(bytes+r.tile.bytes>cfg.maxBytes)return false;bytes+=r.tile.bytes;return true;}).slice(0,cfg.maxTiles).map(r=>r.tile.id);
}
class Manager{
 constructor(tiles,io,config={}){
  this.config={radius:900,maxBytes:10*1024*1024,maxTiles:24,concurrency:2,timeoutMs:12000,...config};this.io=io;
  if(!['load','mount','dispose'].every(k=>typeof io[k]==='function'))throw Error('Explicit tile IO required');
  this.tiles=new Map();for(const t of tiles){if(typeof t.id!=='string'||this.tiles.has(t.id)||![t.x,t.z,t.radius,t.bytes].every(Number.isFinite)||t.radius<0||t.bytes<=0||t.bytes>this.config.maxBytes)throw Error('Invalid tile descriptor');if(t.bounds&&(!Array.isArray(t.bounds)||t.bounds.length!==4||!t.bounds.every(Number.isFinite)||t.bounds[0]>t.bounds[2]||t.bounds[1]>t.bounds[3]))throw Error('Invalid tile bounds');this.tiles.set(t.id,t);}
  this.entries=new Map();this.failures=new Map();this.desired=[];this.closed=false;this.version=0;this.clock=0;
  this.stats={requests:0,mounted:0,evictions:0,cancelled:0,failures:0,discarded:0,peakResidentBytes:0,peakPending:0,peakStagedBytes:0};
 }
 update(state,now=0){if(this.closed)return;this.clock=now;const desired=plan([...this.tiles.values()],state,this.config);this.desired=desired;const keep=new Set(desired);
  for(const [id,e] of this.entries){if(!keep.has(id)){e.abort?.abort();clearTimeout(e.timeout);if(e.status==='pending')this.stats.cancelled++;if(e.resource)this.io.dispose(e.resource);if(e.status==='mounted')this.stats.evictions++;this.entries.delete(id);}}
  this.pump();
 }
 pump(){if(this.closed)return;let pending=[...this.entries.values()].filter(e=>e.status==='pending').length;
  for(const id of this.desired){if(pending>=this.config.concurrency)break;if(this.entries.has(id))continue;const failure=this.failures.get(id);if(failure&&(failure.count>=3||failure.until>this.clock))continue;
   const tile=this.tiles.get(id),abort=new AbortController(),token=++this.version,e={tile,status:'pending',token,abort};this.entries.set(id,e);pending++;this.stats.requests++;
   const timeout=setTimeout(()=>abort.abort(),this.config.timeoutMs);e.timeout=timeout;
   Promise.resolve().then(()=>{if(this.closed||this.entries.get(id)!==e)throw Error('Cancelled');return this.io.load(tile,abort.signal);}).then(data=>{
    clearTimeout(timeout);if(this.closed||this.entries.get(id)!==e){this.stats.discarded++;return;}
    if(!data||data.byteLength!==tile.bytes)throw Error('Tile size mismatch');e.data=data;e.status='staged';this.failures.delete(id);this.measure();
   }).catch(err=>{clearTimeout(timeout);if(this.closed||this.entries.get(id)!==e)return;this.entries.delete(id);const f=this.failures.get(id)||{count:0};f.count++;f.until=this.clock+2000*f.count;this.failures.set(id,f);this.stats.failures++;this.io.error?.(id,String(err.message||err));});
  }
  this.stats.peakPending=Math.max(this.stats.peakPending,pending);this.measure();
 }
 commit(limit=1){if(this.closed)return 0;let n=0;for(const id of this.desired){if(n>=limit)break;const e=this.entries.get(id);if(e?.status!=='staged')continue;
   try{e.resource=this.io.mount(e.tile,e.data);if(!e.resource)throw Error('Tile mount returned no resource');e.data=null;e.status='mounted';this.stats.mounted++;n++;}
   catch(err){if(e.resource)this.io.dispose(e.resource);this.entries.delete(id);const f=this.failures.get(id)||{count:0};f.count++;f.until=this.clock+2000*f.count;this.failures.set(id,f);this.stats.failures++;this.io.error?.(id,String(err.message||err));}
  }this.measure();this.pump();return n;}
 measure(){const all=[...this.entries.values()],resident=all.filter(e=>e.status==='mounted').reduce((n,e)=>n+e.tile.bytes,0),staged=all.filter(e=>e.status==='staged').reduce((n,e)=>n+e.tile.bytes,0);this.stats.peakResidentBytes=Math.max(this.stats.peakResidentBytes,resident);this.stats.peakStagedBytes=Math.max(this.stats.peakStagedBytes,staged);return{resident,staged};}
 retryFailed(){if(this.closed)return;this.failures.clear();this.pump();}
 inspect(){const m=this.measure();return {...this.stats,closed:this.closed,desired:this.desired.length,ready:[...this.entries.values()].filter(e=>e.status==='mounted').length,pending:[...this.entries.values()].filter(e=>e.status==='pending').length,stagedBytes:m.staged,residentBytes:m.resident,maxBytes:this.config.maxBytes,failedTiles:this.failures.size};}
 dispose(){if(this.closed)return;this.closed=true;for(const e of this.entries.values()){e.abort?.abort();clearTimeout(e.timeout);if(e.resource)this.io.dispose(e.resource);}this.entries.clear();this.desired=[];}
}
return {plan,distance,Manager};});
