/* ATLAS D integration adapter. Does not replace the shared Sea Lab source.
 * Host renderer/water are reused. Bay operation is suspended and restored on exit.
 */
(()=>{'use strict';
const G=window,C=G.AtlasDCore,$=id=>document.getElementById(id);
const status={ready:false,active:false,error:null,asset:'assets/ATLAS_D_Original.glb',sourceRevision:7,multiplayer:false};
G.ATLAS_D_SIM=status;
let A,T,S,model,vessel,group,state,camera,orbit,bindings=[],meshes=[],saved=null,
  active=false,view='orbit',xray=false,environment='calm',last=0,acc=0,frameCount=0,
  touchSteer=0,touchBow=0,keys=new Set(),lastUI=0,oldSample,sceneVisibility=new Map();
const BOARD_ID='atlasd-proving',v=(...a)=>new T.Vector3(...a);
// ATLAS_D_FALLBACK_02: retain every original yacht mesh; lower only fallback rendering cost.
let lowDetail=false,smoothWaterGeometry=null;
function fail(e){status.error=String(e);console.error('ATLAS D integration:',e);if($('ad-notice'))$('ad-notice').textContent='The original yacht could not load. Return to Bay remains available.';if($('ad-board')){$('ad-board').disabled=false;$('ad-board').textContent='Retry ATLAS D';$('ad-board').onclick=()=>location.reload();}}
function setup(){
  if(!G.BAYPLAY?.ready||!G.SEA09_WATER?.ready||!G.SEA11?.ready){return setTimeout(setup,100);}
  A=G.BAYPLAY;T=G.ATLASRuntime;S=A.state;
  const board=document.createElement('button');board.id='ad-board';board.textContent='Board original ATLAS D';board.disabled=true;document.body.append(board);
  const root=document.createElement('section');root.id='ad-root';root.hidden=true;
  root.innerHTML=`<header class="ad-header"><div><small>ORIGINAL SUPERYACHT / SUBMERSIBLE CONCEPT</small><h1>ATLAS <b>D</b></h1></div><div class="ad-header-right"><span id="ad-mode">SURFACE</span><button id="ad-detail">Detail: auto</button><button id="ad-pause">Pause</button><button id="ad-exit">Return to Bay 25</button></div></header>
  <div class="ad-location">DEEP-WATER PROVING GROUND <span>Authored scenario · not Beaufort</span></div>
  <aside class="ad-stats"><div><b id="ad-speed">0.0</b><span>knots</span></div><div><b id="ad-depth">0.0</b><span>depth datum · m</span></div><div><b id="ad-clearance">—</b><span>bottom clearance · m</span></div><div><b id="ad-heading">090°</b><span>heading</span></div></aside>
  <nav class="ad-views" aria-label="Yacht cameras"><button data-ad-view="orbit" aria-pressed="true">Around yacht</button><button data-ad-view="follow">Follow</button><button data-ad-view="bridge">Bridge view</button><button data-ad-view="subsea">Underwater view</button><button data-ad-view="helipad">Helipad view</button><button id="ad-xray" aria-pressed="false">Systems view</button><button id="ad-map-toggle" aria-expanded="false">Map</button></nav>
  <canvas id="ad-map" width="240" height="240" hidden aria-label="Fictional ATLAS D proving-ground bottom and yacht position"></canvas>
  <div id="ad-notice" role="status" aria-live="polite">Loading the original 82.9-meter model…</div>
  <section class="ad-controls"><div class="ad-helm"><div class="ad-section-heading">01 <b>PROPULSION</b><span id="ad-engine-state">OFF</span></div><div class="ad-row"><button id="ad-engine" class="ad-primary">Start propulsion · E</button><button id="ad-neutral">Idle & coast</button></div><div class="ad-row ad-gears"><button data-ad-gear="-1">Reverse</button><button data-ad-gear="0" aria-pressed="true">Neutral</button><button data-ad-gear="1">Forward</button></div><label for="ad-throttle">Power <output id="ad-power">0%</output></label><input id="ad-throttle" type="range" min="0" max="100" value="0"><div class="ad-row"><button id="ad-left" aria-label="Hold to steer port">← Port</button><button id="ad-center">Straight</button><button id="ad-right" aria-label="Hold to steer starboard">Starboard →</button></div><div class="ad-row ad-secondary"><button id="ad-bow-left">Bow thruster ←</button><button id="ad-bow-right">Bow thruster →</button></div></div>
  <div class="ad-operations"><div class="ad-section-heading">02 <b>YACHT / DIVE</b><span id="ad-progress">SURFACE</span></div><div class="ad-row"><button id="ad-secure">Secure for dive</button><button id="ad-deploy">Deploy yacht</button></div><progress id="ad-conversion" max="1" value="0" aria-label="Exterior conversion"></progress><p id="ad-checklist">Tenders deployed · yacht exterior open</p><div class="ad-row"><label for="ad-target">Target depth<select id="ad-target"><option value="12">12 m</option><option value="18" selected>18 m</option><option value="24">24 m</option><option value="30">30 m</option></select></label><button id="ad-dive" class="ad-primary">Dive</button><button id="ad-surface">Surface</button></div><div class="ad-row"><label for="ad-weather">Sea state<select id="ad-weather"><option value="calm">Calm</option><option value="breeze">Breeze</option><option value="swell">Swell</option></select></label><button id="ad-reset">Reset scenario</button></div></div></section>
  <details class="ad-notes"><summary>Controls & simulation limits</summary><p>E starts propulsion in neutral. F/N/R selects gear; W/S changes power; A/D steers. Space idles and coasts. P pauses. Drag Around yacht to orbit. Secure for dive recovers both tenders and folds the exterior before Dive becomes available. Surface first, then idle and select Deploy yacht to reverse the arrangement.</p><p>Original R7 geometry: 82.9 m × 14.2 m. Camera stations are viewpoints, not walkable finished interiors. Handling, ballast indication, depth limits and the proving-ground bottom are authored simulation parameters. There is no certified dive depth, validated pressure hull, real navigation guidance or multiplayer in this preview. Surface/coast data elsewhere are not changed. No Bay outboard recording is presented as yacht audio.</p></details>`;
  document.body.append(root);
  camera=new T.PerspectiveCamera(45,innerWidth/innerHeight,0.15,3000);
  orbit=new T.OrbitControls(camera,$('scene'));orbit.enabled=false;orbit.enableDamping=true;orbit.minDistance=10;orbit.maxDistance=340;orbit.maxPolarAngle=Math.PI*0.96;
  group=new T.Group();group.name='ATLAS_D_PLAYER';group.visible=false;A.scene.add(group);
  oldSample=G.Sea09World.sample;
  G.Sea09World.sample=function(x,z,location){return location===BOARD_ID?C.provingSample(x,z):oldSample.call(this,x,z,location);};
  new T.GLTFLoader().load(status.asset,g=>{try{initAsset(g);bindUI();status.ready=true;board.disabled=false;board.onclick=enter;status.enter=enter;status.exit=exit;status.state=state;status.model=model;status.vessel=vessel;status.pose=pose;status.setView=setView;status.inspect=inspect;status.command=command;status.testStep=testStep;if(new URLSearchParams(location.search).get('vessel')!=='bay')enter();requestAnimationFrame(loop);}catch(e){fail(e);}},p=>{board.textContent=p.total?'Loading ATLAS D · '+Math.round(p.loaded/p.total*100)+'%':'Loading original ATLAS D…';},fail);
}
function initAsset(g){
  model=g.scene;vessel=model.getObjectByName('Vessel');const clip=g.animations[0];
  if(!vessel||!clip)throw Error('Original Vessel node or transformation clip is missing.');
  for(const track of clip.tracks){const dot=track.name.lastIndexOf('.'),name=track.name.slice(0,dot),property=track.name.slice(dot+1),object=model.getObjectByName(name);
    if(!object)throw Error('Unknown original animation target: '+name);
    if(property==='scale')throw Error('Hull scaling is not allowed for this integration.');
    if(object===vessel&&property==='position')continue; // Never replay R7 vertical descent.
    bindings.push({object,property,interpolant:track.createInterpolant()});
  }
  model.traverse(o=>{if(!o.isMesh)return;let sys=false,beam=false;for(let p=o;p;p=p.parent){sys ||=p.name.startsWith('SYS_');beam ||=p.name==='FX_Subsea_light_beams';}
    const original=Array.isArray(o.material)?o.material:[o.material];const materials=original.map(m=>{const a=m.clone();if(a.transmission>0){a.transmission=0;a.transparent=true;a.opacity=0.35;a.depthWrite=false;}if(/teak/i.test(a.name)){a.polygonOffset=true;a.polygonOffsetFactor=-2;a.polygonOffsetUnits=-2;}return a;});
    o.material=Array.isArray(o.material)?materials:materials[0];o.castShadow=!materials.some(m=>m.transparent);o.receiveShadow=true;
    meshes.push({mesh:o,sys,beam,materials,bases:materials.map(m=>({opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite}))});
  });group.add(model);pose(0);const hull=model.getObjectByName('FIXED_Hull');if(!hull)throw Error('Original continuous hull missing.');
  group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(hull);const geometricDraft=-box.min.y;
  if(!Number.isFinite(geometricDraft)||geometricDraft<0.5||geometricDraft>12)throw Error('Unexpected original hull datum; refuse to invent geometry clearance.');
  state=new C.Vessel({draftM:geometricDraft});state.observe(C.provingSample,wave);
  status.geometricHullBounds={min:box.min.toArray(),max:box.max.toArray()};status.originalClipSeconds=clip.duration;
  status.retainedTracks=bindings.length;status.sourceScaleTracks=clip.tracks.filter(t=>t.name.endsWith('.scale')).length;
  status.originalAssetBytes=9043328;
}
function pose(conversion){const t=Math.max(0,Math.min(1,conversion))*38.4;for(const b of bindings)b.object[b.property].fromArray(b.interpolant.evaluate(t));vessel.position.set(0,0,0);model.updateMatrixWorld(true);}
function wave(x,z,t){return G.BayMotion.surface(x,z,t,environment);}
function snapshotHost(){
  const fields=['x','z','heading','heave','pitch','roll','elapsed','location','u','environment','engine','throttle','steer','gear'];
  return {fields:Object.fromEntries(fields.map(k=>[k,S[k]])),capturePaused:A.capturePaused,
    paused:A.inspect().paused,cameraMode:A.cameraMode(),background:A.scene.background,
    fog:A.scene.fog,environmentIntensity:A.scene.environmentIntensity,
    waterSide:A.coast.water.material.side,waterDepthWrite:A.coast.water.material.depthWrite,
    title:document.title,pixelRatio:A.renderer.getPixelRatio(),shadowEnabled:A.renderer.shadowMap.enabled,waterGeometry:A.coast.water.geometry};
}
function enter(){
  if(!status.ready||active)return;try{
    saved=snapshotHost();sceneVisibility=new Map(A.scene.children.map(o=>[o,o.visible]));
    A.setCamera('follow');A.capturePaused=true;A.setPaused(true);A.audio.suspend(true);
    S.location=BOARD_ID;active=true;status.active=true;group.visible=true;
    $('ad-root').hidden=false;$('ad-board').hidden=true;document.body.classList.add('atlas-d-active');document.title='ATLAS D · Original superyacht / submarine simulator';
    A.coast.water.material.side=T.DoubleSide;A.coast.water.material.needsUpdate=true;
    setDetail(!!G.SEA_SOFTWARE||innerWidth<700);
    last=performance.now();acc=0;setView('orbit');draw(0);last=performance.now();sync();
  }catch(e){exit();fail(e);}
}
function exit(){
  if(!active)return;active=false;status.active=false;keys.clear();touchSteer=touchBow=0;orbit.enabled=false;group.visible=false;
  document.body.classList.remove('atlas-d-active');$('ad-root').hidden=true;$('ad-board').hidden=false;$('ad-board').textContent='Board original ATLAS D';
  if(saved){Object.assign(S,saved.fields);for(const [o,visible]of sceneVisibility)o.visible=visible;group.visible=false;
    A.scene.background=saved.background;A.scene.fog=saved.fog;A.scene.environmentIntensity=saved.environmentIntensity;
    A.coast.water.material.side=saved.waterSide;A.coast.water.material.depthWrite=saved.waterDepthWrite;A.coast.water.material.needsUpdate=true;
    A.renderer.setPixelRatio(saved.pixelRatio);A.renderer.shadowMap.enabled=saved.shadowEnabled;A.coast.water.geometry=saved.waterGeometry;A.capturePaused=saved.capturePaused;A.setPaused(saved.paused);A.setCamera(saved.cameraMode);A.resetClock();A.refresh();document.title=saved.title;
  }
}
function setDetail(low){
  lowDetail=!!low;
  A.renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowDetail?(G.SEA_SOFTWARE?0.35:0.65):1.25));
  A.renderer.shadowMap.enabled=!lowDetail&&!!saved?.shadowEnabled;
  if(lowDetail&&!smoothWaterGeometry){
    smoothWaterGeometry=new T.PlaneGeometry(1800,1800,80,80);smoothWaterGeometry.rotateX(-Math.PI/2);
    const pos=smoothWaterGeometry.attributes.position,uv=smoothWaterGeometry.attributes.uv;
    const warp=value=>{const n=Math.abs(value)/7.5;return Math.sign(value)*(n<=80?n*0.5:40+860*((n-80)/40)**2);};
    for(let i=0;i<pos.count;i++){const x=warp(pos.getX(i)),z=warp(pos.getZ(i));pos.setX(i,x);pos.setZ(i,z);uv.setXY(i,x/1800+0.5,0.5-z/1800);}
    pos.needsUpdate=true;uv.needsUpdate=true;smoothWaterGeometry.computeBoundingSphere();
  }
  if(saved)A.coast.water.geometry=lowDetail?smoothWaterGeometry:saved.waterGeometry;
  $('ad-detail').textContent=lowDetail?'Detail: smooth':'Detail: high';
}
function command(name,value){if(!state)return false;const result=state.command(name,value,C.provingSample);sync();return result;}
function bindUI(){
  $('ad-detail').onclick=()=>setDetail(!lowDetail);$('ad-exit').onclick=exit;$('ad-pause').onclick=()=>command('pause');$('ad-engine').onclick=()=>command('engine');$('ad-neutral').onclick=()=>command('neutral');
  document.querySelectorAll('[data-ad-gear]').forEach(b=>b.onclick=()=>command('gear',Number(b.dataset.adGear)));
  document.querySelectorAll('[data-ad-view]').forEach(b=>b.onclick=()=>setView(b.dataset.adView));
  $('ad-throttle').oninput=e=>command('throttle',Number(e.target.value)/100);
  for(const name of ['secure','deploy','dive','surface'])$('ad-'+name).onclick=()=>command(name);
  $('ad-target').onchange=e=>command('targetDepth',Number(e.target.value));
  $('ad-weather').onchange=e=>{const value=e.target.value;environment=G.BayMotion.PRESETS[value]?value:'calm';state.observe(C.provingSample,wave);sync();};
  $('ad-reset').onclick=()=>{state.reset();keys.clear();touchSteer=touchBow=0;acc=0;last=performance.now();state.observe(C.provingSample,wave);setView('orbit');draw(0);sync();};
  $('ad-center').onclick=()=>{touchSteer=0;keys.delete('KeyA');keys.delete('KeyD');command('rudder',0);};
  function hold(id,kind,value){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(kind==='rudder')touchSteer=value;else touchBow=value;command(kind,value);});const release=()=>{if(kind==='rudder')touchSteer=0;else touchBow=0;command(kind,0);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,release);}
  hold('ad-left','rudder',-1);hold('ad-right','rudder',1);hold('ad-bow-left','bowThruster',-1);hold('ad-bow-right','bowThruster',1);
  $('ad-xray').onclick=()=>{xray=!xray;$('ad-xray').setAttribute('aria-pressed',String(xray));};
  $('ad-map-toggle').onclick=()=>{$('ad-map').hidden=!$('ad-map').hidden;$('ad-map-toggle').setAttribute('aria-expanded',String(!$('ad-map').hidden));map();};
  addEventListener('keydown',e=>{if(!active)return;e.stopImmediatePropagation();if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;
    const cmds={KeyE:['engine'],KeyF:['gear',1],KeyN:['neutral'],KeyR:['gear',-1],Space:['neutral'],KeyP:['pause']};if(cmds[e.code])command(...cmds[e.code]);
  },true);
  addEventListener('keyup',e=>{if(active){e.stopImmediatePropagation();keys.delete(e.code);}},true);
  const clear=()=>{keys.clear();touchSteer=touchBow=0;if(active){state.throttle=0;state.rudder=0;state.bowThruster=0;acc=0;sync();}};
  addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{clear();if(active&&document.hidden){state.paused=true;state.message='Paused while this tab is hidden.';}last=performance.now();});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(active&&view==='orbit')setView('orbit');});
}
function local(a){return group.localToWorld(v(...a));}
function setView(name){view=name;orbit.enabled=active&&name==='orbit';camera.fov=name==='bridge'?66:45;camera.updateProjectionMatrix();
  if(name==='orbit'){const ratio=innerWidth/innerHeight,zoom=ratio<0.9?1.65:1;camera.position.copy(local([70*zoom,42*zoom,108*zoom]));orbit.target.copy(local([0,5,0]));orbit.update();}
  document.querySelectorAll('[data-ad-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adView===name)));
}
let lastPosition=null,lastBelowSurface=false;
function updateCamera(dt){
  if(view==='orbit'){const p=group.position.clone();if(lastPosition){const d=p.clone().sub(lastPosition);camera.position.add(d);orbit.target.add(d);}orbit.update();lastPosition=p;return;}
  lastPosition=group.position.clone();const k=state.conversion;
  const eye=view==='bridge'?[7,12.8-4.6*k,0]:view==='helipad'?[30,8.8,0]:view==='subsea'?[-85,6,48]:[-93,34,48];
  const at=view==='bridge'?[75,11.8-4.6*k,0]:view==='helipad'?[75,7.8,0]:[0,4,0];
  const desired=local(eye);if(view==='follow'&&dt>0)camera.position.lerp(desired,1-Math.exp(-3*dt));else camera.position.copy(desired);camera.lookAt(local(at));
}
function draw(dt){
  if(!active)return;pose(state.conversion);group.position.set(state.x,state.heaveM-state.depthM,state.z);group.rotation.set(state.roll,-state.heading,state.pitch,'YXZ');group.updateMatrixWorld(true);
  Object.assign(S,{x:state.x,z:state.z,heading:state.heading,heave:state.heaveM-state.depthM,pitch:state.pitch,roll:state.roll,elapsed:state.elapsed,location:BOARD_ID,u:state.speedMps,environment,engine:false});
  A.coast.update(dt,'inspect');G.SEA06.beforeRender();
  const allowed=new Set([group,A.coast.water,G.SEA09_WATER.bed]);
  for(const o of A.scene.children)if(!o.isLight&&!allowed.has(o))o.visible=false;
  group.visible=true;A.coast.water.visible=!xray;G.SEA09_WATER.bed.visible=!xray;
  if(A.coast.ocean)A.coast.ocean.visible=false;
  const uniforms=A.coast.waterShader?.uniforms;if(uniforms?.uDryEnabled10)uniforms.uDryEnabled10.value=0;
  for(const item of meshes){item.mesh.visible=item.sys?xray:item.beam?state.depthM>12&&!xray:true;
    item.materials.forEach((m,i)=>{const base=item.bases[i],opacity=xray&&!item.sys&&!item.beam?0.10:base.opacity;m.opacity=opacity;m.transparent=base.transparent||opacity<0.999;m.depthWrite=base.depthWrite&&opacity>0.9;});}
  if(state.depthM>10&&!lastBelowSurface)setView('subsea');
  lastBelowSurface=state.depthM>10;
  updateCamera(dt);
  if(camera.position.y<-0.5){A.scene.background=new T.Color('#072d3b');A.scene.fog=new T.FogExp2('#072d3b',0.007);A.scene.environmentIntensity=0.46;}
  else{A.scene.background=saved.background;A.scene.fog=saved.fog;A.scene.environmentIntensity=saved.environmentIntensity;}
  A.renderer.shadowMap.needsUpdate=frameCount%8===0;A.renderer.render(A.scene,camera);
}
function input(dt){
  if(keys.has('KeyW')||keys.has('ArrowUp'))state.throttle=Math.min(1,state.throttle+dt*0.18);
  if(keys.has('KeyS')||keys.has('ArrowDown'))state.throttle=Math.max(0,state.throttle-dt*0.25);
  state.rudder=keys.has('KeyA')||keys.has('ArrowLeft')?-1:keys.has('KeyD')||keys.has('ArrowRight')?1:touchSteer;
  state.bowThruster=touchBow;
}
function loop(now){requestAnimationFrame(loop);if(!active||status.holdFrameLoop){last=now;return;}const dt=Math.max(0,(now-last)/1000);last=now;if(document.hidden)return;
  if(dt>4&&!state.paused){state.paused=true;state.message='Rendering stalled. Paused instead of pretending simulated time kept up.';acc=0;}
  if(!state.paused){acc+=Math.min(dt,4);while(acc>=1/60){input(1/60);state.step(1/60,C.provingSample,wave);acc-=1/60;}}else acc=0;
  frameCount++;draw(state.paused?0:dt);if(now-lastUI>180){sync();if(!$('ad-map').hidden)map();lastUI=now;}
}
function sync(){if(!state||!$('ad-mode'))return;const s=state;
  $('ad-mode').textContent=s.mode.toUpperCase();$('ad-speed').textContent=(Math.abs(s.speedMps)*1.943844).toFixed(1);$('ad-depth').textContent=s.depthM.toFixed(1);
  $('ad-clearance').textContent=s.clearanceM===null?'NO DATA':s.clearanceM.toFixed(1);$('ad-clearance').classList.toggle('ad-danger',s.clearanceM!==null&&s.clearanceM<3);
  $('ad-heading').textContent=String(Math.round((90+s.heading*180/Math.PI)%360)).padStart(3,'0')+'°';
  $('ad-pause').textContent=s.paused?'Resume':'Pause';$('ad-engine').textContent=s.engine?'Stop propulsion · E':'Start propulsion · E';$('ad-engine-state').textContent=s.engine?'READY':'OFF';
  $('ad-power').textContent=Math.round(s.throttle*100)+'%';$('ad-throttle').value=Math.round(s.throttle*100);
  document.querySelectorAll('[data-ad-gear]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.adGear)===s.gear)));
  $('ad-progress').textContent=Math.round(s.conversion*100)+'% SECURED';$('ad-conversion').value=s.conversion;
  $('ad-checklist').textContent=s.conversion>=1?'Both tenders aboard · bays shut · outer shells secured':s.conversion<=0?'Tenders deployed · yacht exterior open':'Original tender / closure / shell sequence in progress';
  $('ad-secure').disabled=s.mode!=='surface';$('ad-deploy').disabled=s.mode!=='secured'||s.depthM>0.02;
  $('ad-dive').disabled=s.mode!=='secured';$('ad-surface').disabled=!['diving','submerged','surfacing'].includes(s.mode);
  $('ad-target').value=String(s.targetDepthM);$('ad-target').disabled=!['surface','secured'].includes(s.mode);
  if($('ad-notice').textContent!==s.message)$('ad-notice').textContent=s.message;
}
function map(){if(!state)return;const ctx=$('ad-map').getContext('2d'),size=240,scale=3;for(let y=0;y<size;y+=4)for(let x=0;x<size;x+=4){const q=C.provingSample((x-size/2)*scale,(y-size/2)*scale),depth=q.known?-q.bed:0;ctx.fillStyle=depth<8?'#afb895':depth<25?'#477f86':'#163f53';ctx.fillRect(x,y,4,4);}const px=120+state.x/scale,py=120+state.z/scale;ctx.save();ctx.translate(px,py);ctx.rotate(state.heading);ctx.fillStyle='#f3ddaa';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-12,-3);ctx.lineTo(-12,3);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#ffffff';ctx.font='12px system-ui';ctx.fillText('AUTHORED TEST AREA',10,19);ctx.fillText('Shallow bank →',143,112);}
function testStep(seconds){if(!active||!Number.isFinite(seconds)||seconds<0||seconds>180)throw Error('Test step requires active vessel and 0–180 seconds.');for(let i=0;i<Math.ceil(seconds*60);i++)state.step(1/60,C.provingSample,wave);draw(0);sync();return inspect();}
function inspect(){const hull=model.getObjectByName('FIXED_Hull');return {ready:status.ready,active,state:state.snapshot(),camera:view,
  originalHullScale:hull.scale.toArray(),originalHullVisible:hull.visible,originalRootY:vessel.position.y,
  sourceScaleTracks:status.sourceScaleTracks,retainedTracks:bindings.length,geometricHullBounds:status.geometricHullBounds,
  sourceAsset:status.asset,sourceRevision:7,multiplayer:false,simulationOnly:true,
  pixelRatio:A.renderer.getPixelRatio(),detail:lowDetail?'smooth':'high',softwareRendering:!!G.SEA_SOFTWARE,
  frameCount,drawCalls:A.renderer.info.render.calls,triangles:A.renderer.info.render.triangles,
  hostSuspended:A.capturePaused===true,waterLocation:S.location,
  tenderChase:model.getObjectByName('MOV_Tender_Chase')?.getWorldPosition(v()).toArray(),
  tenderUtility:model.getObjectByName('MOV_Tender_Utility')?.getWorldPosition(v()).toArray()};}
try{setup();}catch(e){fail(e);}
})();
