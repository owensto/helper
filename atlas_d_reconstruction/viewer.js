import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $=s=>document.querySelector(s),status=$('#status'),detail=$('#detail'),bar=$('#progress');
const began=performance.now();
let model,ready=false,mode='surface',spin=false,dry=false,golden=false,system='all',transition=null;
const meshes=[];
const fail=e=>{console.error(e);status.textContent='The interactive model could not start.';detail.textContent='The image behind this message is a still preview, not the 3D viewer.';$('#retry').hidden=false;window.ATLAS_D={ready:false,error:String(e)};};
$('#retry').onclick=()=>location.reload();
try{
 const mobile=innerWidth<650;
 const renderer=new THREE.WebGLRenderer({canvas:$('#scene'),antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.4:1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b6ced5');scene.fog=new THREE.Fog('#b6ced5',260,1000);
 const camera=new THREE.PerspectiveCamera(34,1,.08,1800);
 const controls=new OrbitControls(camera,$('#scene'));controls.enableDamping=true;controls.dampingFactor=.07;
 controls.minDistance=4;controls.maxDistance=340;controls.maxPolarAngle=Math.PI*.96;controls.target.set(0,6,0);
 controls.addEventListener('start',()=>{spin=false;$('#orbit').setAttribute('aria-pressed','false');});
 const pm=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();scene.environment=pm.fromScene(environment,.055).texture;
 environment.dispose();pm.dispose();scene.environmentIntensity=.90;
 scene.add(new THREE.HemisphereLight(0xe3f4ff,0x263f4b,1.0));
 const key=new THREE.DirectionalLight(0xfff1dc,3.0);key.position.set(-36,75,65);key.castShadow=true;key.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
 Object.assign(key.shadow.camera,{left:-58,right:58,top:44,bottom:-44,near:1,far:200});key.shadow.bias=-.00012;key.shadow.normalBias=.035;scene.add(key);
 const fill=new THREE.DirectionalLight(0xbadbea,1.2);fill.position.set(30,22,-65);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xe7f9ff,.8);rim.position.set(-75,28,-25);scene.add(rim);
 const n=256,pixels=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;pixels[i]=128+18*Math.sin(x*.23+y*.055)+6*Math.sin(y*.61+x*.31);pixels[i+1]=128+15*Math.cos(y*.26-x*.12)+7*Math.sin(x*.78);pixels[i+2]=248;pixels[i+3]=255;}
 const waterNormal=new THREE.DataTexture(pixels,n,n);waterNormal.wrapS=waterNormal.wrapT=THREE.RepeatWrapping;waterNormal.repeat.set(170,170);waterNormal.needsUpdate=true;
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:0x295563,roughness:.24,metalness:.27,normalMap:waterNormal,normalScale:new THREE.Vector2(.20,.20)}));
 sea.rotation.x=-Math.PI/2;sea.position.y=.015;sea.receiveShadow=true;scene.add(sea);
 const beams=new THREE.Group();beams.visible=false;scene.add(beams);
 const beamMat=new THREE.MeshBasicMaterial({color:0x9eeaff,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide});
 for(const side of [-1,1])for(const x of [-28,-17,-5,8,20,31]){
  const cone=new THREE.Mesh(new THREE.ConeGeometry(2.15,8.8,20,1,true),beamMat);cone.position.set(x,-6.9,side*4.8);beams.add(cone);
 }
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
 addEventListener('resize',resize);resize();
 const V=(a)=>new THREE.Vector3(...a);
 function fit(center,size,dir,padding=1.13){
  const t=V(center),d=V(dir).normalize(),right=new THREE.Vector3().crossVectors(V([0,1,0]),d).normalize(),up=new THREE.Vector3().crossVectors(d,right).normalize();
  let dist=0;const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const c=V([x*size[0]/2,y*size[1]/2,z*size[2]/2]);dist=Math.max(dist,Math.abs(c.dot(right))/(tan*camera.aspect)+c.dot(d),Math.abs(c.dot(up))/tan+c.dot(d));}
  camera.position.copy(t).addScaledVector(d,dist*padding);controls.target.copy(t);controls.update();
 }
 function setView(name='hero'){
  const below=mode!=='surface';
  const presets={
   hero:[[0,below?2.5:7.2,1],[86,below?16:24,24],mobile?[1.9,.78,1.45]:[.68,.32,1.40]],
   profile:[[0,below?2:7.0,0],[87,below?15:25,17],[0,.035,1]],
   bow:[[27,below?1:5.9,0],[31,below?13:15,19],[1,.36,.92]],
   stern:[[-29,below?1:6.8,0],[31,below?14:22,19],[-1,.54,.9]],
   decks:[[-14,10.6,0],[45,15,19],[-.5,1.25,1.0]],
   fleet:[[-18,1.4,17.0],[29,7,11],[.6,.85,1.3]]
  };
  if(name==='fleet'&&mode!=='surface')applyMode('surface');
  const p=presets[name]||presets.hero;fit(...p);
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
 }
 function opacity(o,value){const m=o.material;const original=o.userData.original;const alpha=original.opacity*value;
  m.opacity=alpha;m.transparent=original.transparent||alpha<.999;m.depthWrite=alpha>.94&&original.depthWrite;m.needsUpdate=true;
 }
 function lighting(below){
  const color=below?'#082632':golden?'#b4aaa0':'#b6ced5';scene.background.set(color);scene.fog.color.set(color);
  key.color.set(below?0xb9e7ff:golden?0xffbb73:0xfff1dc);key.intensity=below?2.7:golden?2.7:3.0;
  fill.intensity=below?1.7:1.2;rim.intensity=below?1.25:.8;renderer.toneMappingExposure=below?1.16:1.05;
  scene.environmentIntensity=below?1.30:.90;document.body.classList.toggle('underwater',below);
 }
 function applyMode(next){
  transition=null;mode=next;system='all';
  for(const o of meshes){
   const g=o.userData.group;o.position.copy(o.userData.basePosition);o.scale.copy(o.userData.baseScale);opacity(o,1);
   o.visible=next==='surface'?g.startsWith('S_'):next==='submerged'?g.startsWith('D_'):g.startsWith('I_')||g==='D_Hull'||g==='D_Sail';
   if(next==='cutaway'){
    if(g==='D_Hull'||g==='D_Sail')opacity(o,.065);
    if(g==='I_Pressure')opacity(o,o.material.name==='pressure'?.16:.7);
   }
  }
  sea.visible=next==='surface'&&!dry;sea.material.opacity=1;sea.material.transparent=false;beams.visible=next==='submerged';lighting(next!=='surface');
  $('#legend').style.display=next==='cutaway'?'block':'none';
  status.textContent=next==='surface'?'Surface configuration':next==='submerged'?'Submerged configuration':'Inside the concept';
  detail.textContent=next==='cutaway'?'Schematic volumes · select a system to isolate it':'Complete 3D geometry · orbit to inspect';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));
  document.querySelectorAll('[data-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.system==='all')));
 }
 function setMode(next,animate=true){
  if(!ready)return;
  if(next==='submerged'&&mode==='surface'&&animate){
   transition={started:performance.now(),duration:7200};status.textContent='Stowing surface fittings';detail.textContent='Illustrative concept transition';$('#legend').style.display='none';
   document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='submerged')));return;
  }
  applyMode(next);setView('hero');
 }
 function setSystem(next){
  if(mode!=='cutaway')applyMode('cutaway');system=next;
  for(const o of meshes){const g=o.userData.group;if(g.startsWith('I_'))o.visible=next==='all'||g===next;}
  document.querySelectorAll('[data-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.system===next)));
 }
 const smooth=(a,b,x)=>{x=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 document.querySelectorAll('[data-system]').forEach(b=>b.onclick=()=>setSystem(b.dataset.system));
 $('#orbit').onclick=()=>{spin=!spin;$('#orbit').setAttribute('aria-pressed',String(spin));};
 $('#dry').onclick=()=>{dry=!dry;sea.visible=mode==='surface'&&!dry;$('#dry').setAttribute('aria-pressed',String(dry));};
 $('#daylight').onclick=()=>{golden=!golden;$('#daylight').setAttribute('aria-pressed',String(golden));lighting(mode!=='surface');};
 setView();
 new GLTFLoader().load('./ATLAS_D_Reconstruction.glb',gltf=>{
  model=gltf.scene;
  model.traverse(o=>{
   if(!o.isMesh)return;
   let group=o.name.split('__')[0];let p=o.parent;
   while(!/^[SDI]_/.test(group)&&p){group=p.name.split('__')[0];p=p.parent;}
   o.material=o.material.clone();
   if(o.material.name==='railglass'){o.material.depthWrite=false;o.material.side=THREE.DoubleSide;}
   // Light fixtures glow, but do not turn entire decks into emissive surfaces.
   if(['warm','light'].includes(o.material.name))o.material.emissiveIntensity=1.2;
   o.castShadow=!o.material.transparent;o.receiveShadow=true;
   o.userData={group,basePosition:o.position.clone(),baseScale:o.scale.clone(),original:{opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite}};meshes.push(o);
  });
  if(!meshes.some(o=>o.userData.group==='S_Hull')||!meshes.some(o=>o.userData.group==='D_Hull'))throw new Error('Required exterior groups missing');
  scene.add(model);ready=true;applyMode('surface');setView();renderer.render(scene,camera);bar.style.width='100%';document.body.classList.add('ready');
  window.ATLAS_D={ready:true,model,scene,renderer,camera,controls,setView,setMode,setSystem,get state(){return mode;},get transitioning(){return Boolean(transition);},get visibleMeshes(){return meshes.filter(o=>o.visible).length;},firstFrameMs:Math.round(performance.now()-began)};
  fetch('./model_report.json').then(r=>r.json()).then(r=>{window.ATLAS_D.report=r;detail.textContent=r.source_meshes.toLocaleString()+' modeled parts · '+r.teak_boards.toLocaleString()+' teak boards';}).catch(()=>{});
 },e=>{if(e.total){const percent=Math.round(e.loaded/e.total*100);bar.style.width=percent+'%';status.textContent='Loading 3D model · '+percent+'%';}},fail);
 let last=performance.now();
 function frame(now){requestAnimationFrame(frame);if(document.hidden)return;const dt=Math.min((now-last)/1000,.06);last=now;
  waterNormal.offset.x+=dt*.0013;waterNormal.offset.y+=dt*.0005;
  if(transition){
   const t=Math.min(1,(now-transition.started)/transition.duration),retract=smooth(0,.4,t),blend=smooth(.38,.83,t);
   for(const o of meshes){
    const g=o.userData.group;
    if(g.startsWith('S_')){o.visible=blend<.995;opacity(o,1-blend);if(g==='S_Mast')o.position.y=o.userData.basePosition.y-retract*3.2;if(g==='S_Rails')o.position.y=o.userData.basePosition.y-retract*.92;if(g==='S_Fleet')opacity(o,1-smooth(0,.28,t));}
    else if(g.startsWith('D_')){o.visible=blend>.004;opacity(o,blend);}
    else o.visible=false;
   }
   sea.material.transparent=true;sea.material.opacity=1-blend;sea.visible=!dry&&blend<.98;
   scene.background.lerpColors(new THREE.Color(golden?'#b4aaa0':'#b6ced5'),new THREE.Color('#082632'),blend);scene.fog.color.copy(scene.background);
   if(t>.45){document.body.classList.add('underwater');status.textContent='Transitioning to submerged envelope';}
   if(t>=1){applyMode('submerged');setView('hero');}
  }
  if(spin&&ready&&!transition){const d=camera.position.clone().sub(controls.target);d.applyAxisAngle(new THREE.Vector3(0,1,0),dt*.09);camera.position.copy(controls.target).add(d);}
  controls.update();renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);
}catch(e){fail(e);}
