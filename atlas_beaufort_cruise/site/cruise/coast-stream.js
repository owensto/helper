/* Receives the exact Waterfront14 scene/material contract. Visual residency cannot remove colliders. */
(()=>{'use strict';
window.AtlasCruiseCoast={bind({T,base,material,report,clock,tide,wind,wet}){
 let manager=null,mats={},foundation=[],scene=null,A=null,manifest=null,last=-Infinity,stopped=false;
 const faults=[];let maximumCommitMs=0;
 async function verified(url,bytes,expected,signal){const r=await fetch(url,{signal});if(!r.ok)throw Error('Scenery request '+r.status);let b=await r.arrayBuffer();
  if(new Uint8Array(b)[0]===31){if(!window.DecompressionStream){const raw=await fetch(url.replace(/\.gz$/,''),{signal});if(!raw.ok)throw Error('Raw scenery fallback unavailable');b=await raw.arrayBuffer();}else b=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
  if(b.byteLength!==bytes)throw Error('Scenery length mismatch');const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');if(h!==expected)throw Error('Scenery integrity mismatch');return b;}
 function mount(tile,buffer){const group=new T.Group();group.name='BEAUFORT_CHUNK_'+tile.id;const created=[];
  try{for(const c of tile.chunks){const n=c.count*3;if(!Number.isInteger(c.count)||c.count%3||c.offset%2||c.offset+n*4>buffer.byteLength)throw Error('Invalid scenery geometry');
   mats[c.kind]??=material(c.kind);const g=new T.BufferGeometry();created.push(g);g.setAttribute('position',new T.BufferAttribute(new Int16Array(buffer,c.offset,n),3));g.setAttribute('normal',new T.BufferAttribute(new Int8Array(buffer,c.offset+n*2,n),3,true));g.setAttribute('color',new T.BufferAttribute(new Uint8Array(buffer,c.offset+n*3,n),3,true));g.computeBoundingSphere();if(['marsh','moss','leaves'].includes(c.kind))g.boundingSphere.radius+=.20/c.scale;
   const m=new T.Mesh(g,mats[c.kind]);m.position.fromArray(c.position);m.scale.setScalar(c.scale);m.userData.coast14=c;m.name='BEAUFORT14_'+c.key;m.frustumCulled=true;m.receiveShadow=['land','bank','paving','bridge','dockFloat','wood','seawall'].includes(c.kind);group.add(m);
  }scene.add(group);return group;}catch(e){created.forEach(g=>g.dispose());throw e;}}
 function release(group){group.removeFromParent();group.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}
 base.load=async function(app,root){A=app;scene=root;const r=await fetch('cruise/world/manifest.json');if(!r.ok)throw Error('Cruise world manifest missing');manifest=await r.json();
  if(manifest.version!==1||manifest.source!=='b5abae9ac7715d30533e4134ec45b8a092d6eb44')throw Error('Unexpected Beaufort revision');
  // Every physical dock/bridge obstacle is registered before any scenic detail.
  Sea14Physics.installColliders(manifest.colliders);
  const f=manifest.foundation,bytes=await verified('cruise/world/'+f.url,f.bytes,f.sha256);if(stopped)return manifest;foundation.push(mount(f,bytes));
  manager=new AtlasCruiseStream.Manager(manifest.tiles,{load:(t,s)=>verified('cruise/world/'+t.url,t.bytes,t.sha256,s),mount,dispose:release,error:(id,error)=>{faults.push({id,error});if(faults.length>8)faults.shift();}},{maxBytes:10*1024*1024,maxTiles:24,radius:900,concurrency:2});
  const origin={x:A.state.x,z:A.state.z,vx:A.state.vx,vz:A.state.vz};manager.update(origin,performance.now());
  // Await only the two nearest detail tiles, not the entire 3-D region.
  const start=performance.now();while(manager.inspect().ready<Math.min(2,manager.desired.length)&&performance.now()-start<14000){manager.commit(1);await new Promise(r=>setTimeout(r,16));}
  Object.assign(report,{ready:true,streamed:true,counts:manifest.counts,triangles:manifest.triangles,loadedChunks:scene.children.reduce((n,g)=>n+g.children.length,0),meshSHA256:manifest.originalMeshSHA256,landmarks:manifest.landmarks,sourceOSMSHA256:manifest.sourceOSMSHA256,terrainSHA256:manifest.terrainSHA256,streamedRegionIsFinite:true});
  Object.assign(base.status,report);window.SEA14_COAST.meta=manifest;return manifest;
 };
 base.update=function(app,root){if(!manager||stopped)return;const S=app.state,focus=window.SEA14?.visualFocus()||S,now=performance.now(),high=window.SEA14?.options.graphics==='detailed';
  clock.value=S.elapsed;tide.value=S.location==='beaufort'?(S.config.tide||0):0;const w=window.SEA10?.inspect().weather?.current;if(w){wind.value=Math.hypot(...w.wind);wet.value=w.rain;}
  if(now-last>200){manager.config.radius=high?1200:900;manager.update({x:focus.x,z:focus.z,vx:focus===S?S.vx:0,vz:focus===S?S.vz:0},now);last=now;}
  const before=performance.now();manager.commit(1);maximumCommitMs=Math.max(maximumCommitMs,performance.now()-before);
  let visible=0,triangles=0;for(const group of root.children){for(const m of group.children||[]){const c=m.userData.coast14;if(!c)continue;const distance=Math.max(0,Math.hypot(c.position[0]-focus.x,c.position[2]-focus.z)-c.radius);
   const range=['land','bank','bridge','wood','dockFloat','seawall','road'].includes(c.kind)?18000:high?1500:['moss','marsh'].includes(c.kind)?500:1100;
   m.visible=distance<range;m.position.y=c.position[1]+(c.kind==='dockFloat'?tide.value:0);m.castShadow=high&&distance<320&&['building','bridge','trunk','leaves','wood','dockFloat'].includes(c.kind);
   if(m.visible){visible++;triangles+=c.count/3;}
  }}Object.assign(report,{visibleChunks:visible,submittedSceneryTriangles:triangles,tide:tide.value,stream:manager.inspect(),maximumCommitMs,streamErrors:faults.slice()});Object.assign(base.status,report);
 };
 const api={retry:()=>manager?.retryFailed(),inspect:()=>({ready:!!manager,source:manifest?.source,tiles:manifest?.tiles.length,foundationBytes:manifest?.foundation.bytes,stream:manager?.inspect(),maximumCommitMs,errors:faults.slice(),physicsStreamed:false,proceduralGeography:false}),dispose(){if(stopped)return;stopped=true;manager?.dispose();foundation.forEach(release);foundation=[];Object.values(mats).forEach(m=>m.dispose());}};window.ATLAS_CRUISE_STREAM=api;addEventListener('pagehide',()=>api.dispose(),{once:true});return api;
}};})();
