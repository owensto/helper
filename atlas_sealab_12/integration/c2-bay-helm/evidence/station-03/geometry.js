/* CORE STATION03: one authored assembly, no human solver, physics loop or network. */
(function(G){'use strict';
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const bytes=a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
async function hash(a){const b=typeof a==='string'?new TextEncoder().encode(a):a;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');}
function createGeometry(T,p,proxy=false){let g;
 if(p.shape==='box'||p.shape==='roundbox'){
  g=new T.BoxGeometry(...p.size,...(p.shape==='roundbox'&&!proxy?[4,4,4]:[]));
  if(p.shape==='roundbox'&&!proxy){const pos=g.attributes.position,v=new T.Vector3(),c=new T.Vector3(),h=new T.Vector3(...p.size).multiplyScalar(.5).addScalar(-p.radius);for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);for(let axis=0;axis<3;axis++){const half=p.size[axis]/2,q=v.getComponent(axis),a=Math.abs(q),inner=half-p.radius;v.setComponent(axis,Math.sign(q)*(a<=half*.50001?a/(half*.5)*inner:inner+(a-half*.5)/(half*.5)*p.radius));}c.set(Math.max(-h.x,Math.min(h.x,v.x)),Math.max(-h.y,Math.min(h.y,v.y)),Math.max(-h.z,Math.min(h.z,v.z)));v.sub(c).normalize().multiplyScalar(p.radius).add(c);pos.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();}
 }else if(p.shape==='torus'){g=new T.TorusGeometry(p.radius,p.tube,16,64);g.rotateY(Math.PI/2);}
 else if(p.shape==='cylinder'){g=new T.CylinderGeometry(p.radius,p.radius,p.length,24,1,false);if(p.axis==='x')g.rotateZ(-Math.PI/2);if(p.axis==='z')g.rotateX(Math.PI/2);}
 else if(p.shape==='link'||p.shape==='radial'){
  const from=p.shape==='link'?new T.Vector3(...p.from):new T.Vector3(0,Math.sin(p.angle)*p.inner,Math.cos(p.angle)*p.inner),to=p.shape==='link'?new T.Vector3(...p.to):new T.Vector3(0,Math.sin(p.angle)*p.outer,Math.cos(p.angle)*p.outer),delta=to.clone().sub(from);g=new T.CylinderGeometry(p.radius,p.radius,delta.length(),16,1,false);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));const mid=from.add(to).multiplyScalar(.5);g.translate(mid.x,mid.y,mid.z);
 }else throw Error('S03_UNSUPPORTED_SHAPE:'+p.shape);
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function trianglePrism(tri,halfThickness=.002){
 if(!Array.isArray(tri)||tri.length!==3||!tri.every(p=>p.length===3&&p.every(Number.isFinite)))throw Error('S03_INVALID_TRIANGLE');
 const a=tri[0],u=tri[1].map((x,i)=>x-a[i]),v=tri[2].map((x,i)=>x-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);if(len<1e-12)return null;n=n.map(x=>x/len*halfThickness);
 return {positions:[...tri.map(p=>p.map((x,i)=>x-n[i])),...tri.map(p=>p.map((x,i)=>x+n[i]))].flat(),indices:[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5]};
}
async function geometryRecord(p,g,proxy){return {id:p.id,parameters:p,proxy,positions:Array.from(g.attributes.position.array),indices:Array.from(g.index.array),positionSHA256:await hash(bytes(g.attributes.position.array)),indexU32SHA256:await hash(bytes(new Uint32Array(g.index.array)))};}
async function install(T,A,design,ledger,manifest){
 if(G.STATION03)throw Error('S03_ALREADY_INSTALLED');
 if(design.activation.humanFactory||design.activation.gameplay)throw Error('S03_ACTIVATION_NOT_AUTHORIZED');
 const originalModel=A.model,originalStep=A.state.step,originalAction=A.action,retired=[],changedFrames=[],bindings=[],meshRecords=[],objects=new Map(),hinges=new Map();let disposed=false,serial=0;
 const group=new T.Group();group.name='CORE_STATION03_ASSEMBLY';
 const rootInv=()=>A.boat.matrixWorld.clone().invert();A.boat.updateMatrixWorld(true);
 // Complete source validation before changing any scene member.
 for(const r of ledger.replacements){const matches=[];A.model.traverse(n=>{if(n.name===r.runtimeName)matches.push(n);});if(matches.length!==1||!matches[0].isMesh)throw Error('S03_SOURCE_NOT_UNIQUE:'+r.originalNode);const n=matches[0],g=n.geometry;n.updateWorldMatrix(true,false);
  if(await hash(bytes(g.attributes.position.array))!==r.positionSHA256||await hash(bytes(new Uint32Array(g.index.array)))!==r.indexSHA256)throw Error('S03_SOURCE_BYTES:'+r.originalNode);
  const m=rootInv().multiply(n.matrixWorld).toArray();if(m.some((x,i)=>Math.abs(x-r.restToVessel[i])>1e-6))throw Error('S03_SOURCE_FRAME:'+r.originalNode);
  bindings.push({r,node:n,geometry:g,parent:n.parent});
 }
 for(const f of ledger.controlFrameChanges){const n=A.model.getObjectByName(f.name);if(!n||!n.position.toArray().every((x,i)=>x===f.originalLocalPosition[i]))throw Error('S03_CONTROL_FRAME:'+f.name);changedFrames.push({node:n,original:n.position.clone(),definition:f});}
 try{
  for(const b of bindings){const {r,node,geometry,parent}=b;if(r.retainedTriangleCount===0){parent.remove(node);retired.push({...b,mode:'whole'});}else{const indices=geometry.index.array,keep=[];for(let f=0;f<indices.length/3;f++)if(!r.retiredRanges.some(([lo,hi])=>f>=lo&&f<=hi))keep.push(...indices.slice(f*3,f*3+3));if(await hash(bytes(new Uint32Array(keep)))!==r.retainedIndexSHA256)throw Error('S03_PARTIAL_INDEX');const replacement=geometry.clone();replacement.setIndex(keep);replacement.computeBoundingBox();node.geometry=replacement;retired.push({...b,mode:'partial',replacement});}}
  changedFrames.forEach(({node,definition})=>node.position.set(...definition.positionM));
  A.model.add(group);
  for(const h of design.footHinges){const n=new T.Group();n.name=h.id;n.position.set(...h.position);group.add(n);hinges.set(h.id,n);}
  const mats={metal:new T.MeshStandardMaterial({color:0x45636a,metalness:.75,roughness:.26}),shell:new T.MeshStandardMaterial({color:0xf0f0e8,roughness:.38,metalness:.02}),cushion:new T.MeshStandardMaterial({color:0xc8d7ce,roughness:.83}),grip:new T.MeshStandardMaterial({color:0x243d43,roughness:.76}),nonslip:new T.MeshStandardMaterial({color:0x536762,roughness:.93})};
  for(const p of design.parts){const g=createGeometry(T,p),proxy=createGeometry(T,p,true),o=new T.Mesh(g,mats[p.material]);o.name='S03_'+p.id;o.position.set(...(p.position||[0,0,0]));o.castShadow=o.receiveShadow=true;o.userData.stationPart=p.id;o.userData.collisionParticipation=true;
   const parent=p.parent?(hinges.get(p.parent)||A.model.getObjectByName(p.parent)):group;if(!parent)throw Error('S03_PARENT_MISSING');parent.add(o);objects.set(p.id,{object:o,proxy,definition:p,originalParent:parent,originalGeometry:g,positionVersion:g.attributes.position.version,localPosition:o.position.toArray(),localQuaternion:o.quaternion.toArray()});
   const rec={render:await geometryRecord(p,g,false),collision:await geometryRecord(p,proxy,true)};const pin=manifest.geometryParts.find(r=>r.id===p.id);if(!pin||['render','collision'].some(k=>rec[k].positionSHA256!==pin[k].positionSHA256||rec[k].indexU32SHA256!==pin[k].indexU32SHA256))throw Error('S03_AUTHORED_GEOMETRY_HASH:'+p.id);meshRecords.push(rec);
  }
  // Preserve original lifecycle as an EMPTY holder. No procedural/H4/H5 rig is instantiated.
  const holder=A.boat.getObjectByName('SEA12_CAPTAIN');if(!holder||holder.children.length)throw Error('S03_HUMAN_NOT_DISABLED');
  const prior=G.SEA06.beforeRender;let latest=null;const trace=[];
  function update(){
   prior();if(disposed)return;serial++;const bs=G.CoreBayBolsterState.read(T,A),value=A.inspect().bolsters.value;
   const angle=Number.isFinite(value)?value*Math.PI*85/180:0;hinges.forEach(n=>n.rotation.z=angle);group.visible=A.model.visible;
   group.updateWorldMatrix(true,true);for(const {object:o}of objects.values())o.updateWorldMatrix(true,false);
   let intact=A.model===originalModel&&A.state.step===originalStep&&holder.children.length===0;for(const b of retired)intact=intact&&(b.mode==='whole'?b.node.parent===null:b.node.geometry===b.replacement);
   for(const f of changedFrames)intact=intact&&f.node.position.toArray().every((x,i)=>x===f.definition.positionM[i]);
   for(const {object:o,originalParent:p,originalGeometry:g,positionVersion:pv,localPosition:lp,localQuaternion:lq}of objects.values())intact=intact&&o.parent===p&&o.geometry===g&&g.attributes.position.version===pv&&o.position.toArray().every((x,i)=>x===lp[i])&&o.quaternion.toArray().every((x,i)=>x===lq[i]);
   const supported=bs.downStable&&intact;latest={revision:design.revision,sourceSHA:manifest.sourceSHA,manifestSHA256:manifest.sha256,geometryFingerprint:manifest.geometryFingerprint,serial,hostSeconds:A.state.elapsed,paused:A.inspect().paused,boatUUID:A.boat.uuid,modelUUID:A.model.uuid,stationId:design.stationId,settlement:bs,geometryIntact:intact,supportGeometryReady:supported,humanFactoryEnabled:false,gameplayOccupancyAvailable:false,reason:supported?'AWAITING_NEW_HUMANS_PROFILE_ACK':!intact?'STATION_SOURCE_MUTATED':bs.reason,hinges:Array.from(hinges,([id,n])=>({id,local:n.matrix.toArray(),world:n.matrixWorld.toArray(),angle:n.rotation.z})),wheelAngle:A.model.getObjectByName('PLAY_STEERING').rotation.x,throttleAngle:A.model.getObjectByName('PLAY_THROTTLE').rotation.z};
   trace.push({serial,time:A.state.elapsed,settlement:bs.phase,value:bs.value,target:bs.target,supportGeometryReady:supported,humanFactoryEnabled:false});if(trace.length>4000)trace.shift();
   const label=document.getElementById('s03-state');if(label)label.textContent=bs.phase+' · human OFF';
  }
  G.SEA06.beforeRender=update;
  // An explicit variant restriction: no empty drawers masquerading as storage.
  function action(k){if(/^drawer[123]$/.test(k)){return {available:false,reason:'DRAWER_ASSEMBLY_REPLACED_STATION03'};}return originalAction(k);}A.action=action;
  function surface(s){const o=objects.get(s.part).object,m=o.matrixWorld.clone(),point=new T.Vector3(...s.point).applyMatrix4(m),normal=new T.Vector3(...s.normal).transformDirection(m),tangent=new T.Vector3(...s.tangent).transformDirection(m),bitangent=new T.Vector3().crossVectors(tangent,normal);const frame=new T.Matrix4().makeBasis(tangent,normal,bitangent);frame.setPosition(point);return {...s,contactToVessel:rootInv().multiply(frame).toArray(),contactToWorld:frame.toArray(),supportGeometryReady:latest?.supportGeometryReady===true,occupantAccepted:false};}
  async function exportPackage(){A.boat.updateMatrixWorld(true);return {revision:'station03-evaluated-geometry/1',snapshot:latest,design,sourceLedger:ledger,parts:meshRecords.map(r=>({...r,localToVessel:rootInv().multiply(objects.get(r.render.id).object.matrixWorld).toArray()})),surfaces:design.supportSurfaces.map(surface),collisionPolicy:design.collisionPolicy,originalAssetsIncluded:false,fullBodyAccepted:false};}
  function view(which){A.setCamera('instruments');const poses={side:[[-1.6,1.08,.18],[-2.6,1.95,2.35]],front:[[-1.70,1.04,.18],[-.55,1.75,1.62]],top:[[-1.52,.78,.14],[-1.52,3.5,.16]],close:[[-1.70,1.00,.18],[-2.6,1.60,1.28]]};const [at,pos]=poses[which]||poses.side;const w=a=>A.boat.localToWorld(new T.Vector3(...a));A.camera.position.copy(w(pos));A.camera.lookAt(w(at));A.renderer.render(A.scene,A.camera);}
  const api={ready:true,inspect:()=>freeze(JSON.parse(JSON.stringify(latest))),surfaces:()=>freeze(design.supportSurfaces.map(surface)),exportPackage,trace:()=>freeze(JSON.parse(JSON.stringify(trace))),clearTrace:()=>{trace.length=0;},fold:()=>A.action('bolsters'),view,
   dispose(){if(disposed)return;disposed=true;if(G.SEA06.beforeRender===update)G.SEA06.beforeRender=prior;if(A.action===action)A.action=originalAction;for(const {object:o,proxy}of objects.values()){o.removeFromParent();o.geometry.dispose();proxy.dispose();}Object.values(mats).forEach(m=>m.dispose());group.removeFromParent();for(const b of retired){if(b.mode==='whole')b.parent.add(b.node);else{b.node.geometry=b.geometry;b.replacement.dispose();}}changedFrames.forEach(f=>f.node.position.copy(f.original));document.getElementById('s03-panel')?.remove();latest={valid:false,reason:'S03_DISPOSED',gameplayOccupancyAvailable:false};},originalStep,originalHolder:holder.uuid};
  G.STATION03=Object.freeze(api);update();
  const panel=document.createElement('section');panel.id='s03-panel';panel.innerHTML='<b>STATION 03 · DESIGN PROPOSAL</b><small>Empty station — no fitted human or gameplay acceptance</small><div><button id="s03-fold">Fold / lower footrests</button><button id="s03-side">Side</button><button id="s03-top">Top</button></div><span id="s03-state"></span>';
  panel.style.cssText='position:fixed;left:12px;top:180px;z-index:160;background:#12323bea;color:#edf4ef;padding:12px;border-radius:12px;max-width:min(350px,calc(100vw - 48px));font:12px system-ui';panel.querySelector('small').style.cssText='display:block;margin:6px 0';panel.querySelectorAll('button').forEach(b=>b.style.cssText='min-height:44px;margin:3px;padding:7px 10px;background:#d1e1d6;color:#16383d;border:0;border-radius:6px');document.body.append(panel);
  document.getElementById('s03-fold').onclick=api.fold;document.getElementById('s03-side').onclick=()=>view('side');document.getElementById('s03-top').onclick=()=>view('top');return api;
 }catch(e){for(const b of retired){if(b.mode==='whole')b.parent.add(b.node);else{b.node.geometry=b.geometry;b.replacement.dispose();}}changedFrames.forEach(f=>f.node.position.copy(f.original));group.removeFromParent();throw e;}
}
G.CoreStation03={createGeometry,trianglePrism,install,hash};if(typeof module!=='undefined')module.exports=G.CoreStation03;
})(typeof window!=='undefined'?window:globalThis);
