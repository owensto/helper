/* One visible, licensed game avatar; existing HUMANS rig reused without edits. */
(function(G){'use strict';
const RESOURCE_BASE=typeof document!=='undefined'?new URL('../../atlas_w_operator/live/',document.currentScript?.src||location.href):null;
const ASSET=Object.freeze({bytes:2160396,sha256:'e80b6e82ac31c3bfb1134952e0bcb9b840fedc26b71dc90e9b387ae8cd28ecd3',gitBlob:'6d781ccfdb58d6a156636921cd8bde9058e5e2c8',source:'10ed9c2f8d0c392828f238e686bcc689517d34f9',heightM:1.78});
async function load(T){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),25000);
 try{
  const response=await fetch(new URL('assets/RocketboxCaptain.glb',RESOURCE_BASE),{signal:abort.signal});
  if(!response.ok)throw Error('OPERATOR_ASSET_HTTP_'+response.status);
  const bytes=await response.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==ASSET.bytes||hash!==ASSET.sha256)throw Error('OPERATOR_ASSET_INTEGRITY');
  const [{createHelmRig},gltf]=await Promise.all([import(new URL('rig/rig.mjs',RESOURCE_BASE).href),new T.GLTFLoader().parseAsync(bytes,new URL('assets/',RESOURCE_BASE).href)]);
  return {gltf,createHelmRig,verifiedSHA256:hash};
 }finally{clearTimeout(timeout);}
}
function mount(T,battery,asset){
 if(!asset?.gltf?.scene||typeof asset.createHelmRig!=='function'||asset.verifiedSHA256!==ASSET.sha256)throw Error('OPERATOR_INPUT_UNVERIFIED');
 if(battery.turret.getObjectByName('ATLAS_W_GUNNER'))throw Error('OPERATOR_DUPLICATE');
 const station=new T.Group();station.name='ATLAS_W_GUNNER_STATION';battery.turret.add(station);
 const metal=new T.MeshStandardMaterial({color:0x324a55,metalness:.35,roughness:.6}),pad=new T.MeshStandardMaterial({color:0x263039,roughness:.95}),accent=new T.MeshStandardMaterial({color:0xd3a466,metalness:.25,roughness:.55});
 const own=[];function box(name,size,position,material=metal){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.name=name;m.position.set(...position);m.castShadow=m.receiveShadow=true;station.add(m);own.push(m);return m;}
 // Fictional open training console on the turret roof, not a real weapon station.
 box('Gunner platform',[2.85,.13,2.3],[-1.4,4.16,0]);
 box('Seat pedestal',[.25,.4,.34],[-1.65,4.42,0]);
 box('Seat cushion',[.51,.14,.53],[-1.66,4.68,0],pad);
 box('Seat back',[.12,.58,.53],[-1.93,5.00,0],pad);
 box('Port foot support',[.46,.07,.28],[-1.16,4.2,-.19]);
 box('Starboard foot support',[.46,.07,.28],[-1.16,4.2,.19]);
 box('Console support',[.15,.7,.56],[-.75,4.58,0]);
 const consolePanel=box('Gunner console',[.42,.19,.84],[-.80,5.02,0]);consolePanel.rotation.z=.20;
 const display=box('Optic display',[.04,.24,.32],[-1.03,5.15,0],new T.MeshBasicMaterial({color:0x355e64}));
 box('Display line',[.043,.018,.22],[-1.055,5.18,0],new T.MeshBasicMaterial({color:0x9ddaca}));
 const grips=[];
 for(const side of [-1,1]){
  box('Armrest '+side,[.5,.08,.10],[-1.39,4.99,side*.36],pad);
  const base=new T.Group();base.name='Gunner hand control '+side;base.position.set(-1.22,5.08,side*.27);station.add(base);
  const stick=new T.Mesh(new T.CylinderGeometry(.026,.03,.16,10),accent);stick.position.set(.055,-.01,0);base.add(stick);
  const button=new T.Mesh(new T.SphereGeometry(.031,8,6),pad);button.position.set(.055,.07,0);base.add(button);
  const wrist=new T.Object3D();base.add(wrist);grips.push({base,wrist});
 }
 const rig=asset.createHelmRig(asset.gltf,{}, {heightM:ASSET.heightM});rig.group.name='ATLAS_W_GUNNER';battery.turret.add(rig.group);
 const head=rig.group.getObjectByName('Bip01_Head'),meshList=[];
 rig.group.traverse(o=>{if(o.isSkinnedMesh){meshList.push(o);o.frustumCulled=false;o.material.roughness=.85;o.material.metalness=0;}});
 if(!head||meshList.length!==3)throw Error('OPERATOR_RIG_STRUCTURE');
 // This exact asset separates body(11817), head(9021), alpha hair(1482) indices.
 const headMeshes=meshList.filter(m=>[9021,1482].includes(m.geometry.index?.count));
 if(headMeshes.length!==2)throw Error('OPERATOR_HEAD_PARTS');
 const restHead=head.quaternion.clone(),q=new T.Quaternion(),v=new T.Vector3();
 const crew=new G.AtlasCrewState.CrewState();let behavior=null;
 // Lightweight headset and hearing protection move with the evaluated head bone.
 const headset=new T.Group();headset.name='GUNNER_HEARING_PROTECTION';rig.group.add(headset);
 const earMaterial=new T.MeshStandardMaterial({color:0x21333b,roughness:.75});
 const bandMaterial=new T.MeshStandardMaterial({color:0x394950,metalness:.15,roughness:.6});
 for(const side of [-1,1]){
  const ear=new T.Mesh(new T.BoxGeometry(.09,.115,.045),earMaterial);ear.position.set(.01,.03,side*.105);headset.add(ear);
  const band=new T.Mesh(new T.BoxGeometry(.03,.16,.02),bandMaterial);band.position.set(-.015,.115,side*.105);headset.add(band);
 }
 const topBand=new T.Mesh(new T.BoxGeometry(.035,.022,.22),bandMaterial);topBand.position.set(-.015,.193,0);headset.add(topBand);
 const mic=new T.Mesh(new T.CylinderGeometry(.005,.005,.16,6),bandMaterial);mic.rotation.z=-Math.PI/2;mic.position.set(.10,-.025,-.10);headset.add(mic);
 const lamp=box('Station readiness indicator',[.045,.025,.025],[-1.057,5.06,-.13],new T.MeshBasicMaterial({color:0x55bd96}));
 let motionComfort=true,consoleTelemetry=null,consoleAt=-Infinity,consoleCanvas=null,consoleContext=null;
 try{consoleCanvas=document.createElement('canvas');consoleCanvas.width=256;consoleCanvas.height=128;consoleContext=consoleCanvas.getContext?.('2d')||null;}catch(_){}
 if(consoleContext){display.material.map=new T.CanvasTexture(consoleCanvas);display.material.color.setHex(0xffffff);display.material.needsUpdate=true;}
 function updateConsole(s,bearing,elevation){
  if(s.time-consoleAt<.1&&s.time>=consoleAt)return;consoleAt=s.time;
  consoleTelemetry={heading:((s.heading||0)*180/Math.PI+90+360)%360,speed:s.speedKnots||0,power:(s.port+s.starboard)*50,bearing,elevation,activity:behavior?.activity||'READY'};
  if(!consoleContext)return;
  const c=consoleContext;c.fillStyle='#08242b';c.fillRect(0,0,256,128);c.fillStyle='#8ee5c7';c.font='bold 16px monospace';c.fillText('ATLAS  /  LOCAL STATION',8,20);
  c.font='14px monospace';c.fillText('HDG '+consoleTelemetry.heading.toFixed(0)+'  '+consoleTelemetry.speed.toFixed(1)+'kn',8,43);
  c.fillText('AZ '+bearing.toFixed(0)+'  EL '+elevation.toFixed(0),8,65);c.fillText(consoleTelemetry.activity,8,87);
  c.fillStyle='#1c545b';c.fillRect(8,104,240,12);c.fillStyle='#d4bc82';c.fillRect(8,104,Math.max(0,Math.min(240,consoleTelemetry.power*2.4)),12);display.material.map.needsUpdate=true;
 }

 let valid=false,disposed=false,mode='third',epoch=null,lastTime=null,lastPose=null,maxError=null,focus=false,lookDown=false;
 function setMode(value,zoom=false){if(!['first','third','chase','orbit'].includes(value))throw Error('OPERATOR_VIEW');mode=value;focus=!!zoom;headset.visible=mode!=='first';if(mode!=='first')lookDown=false;headMeshes.forEach(m=>m.visible=mode!=='first');}
 function update(s,bearing,elevation,recoil,shotAge){
  if(disposed)return false;
  if(!s||![s.time,s.epoch,bearing,elevation,recoil,shotAge].every(Number.isFinite)||s.time<0||Math.abs(recoil)>2){valid=false;rig.group.visible=false;return false;}
  if(epoch===s.epoch&&lastTime!==null&&s.time<lastTime-1e-8){valid=false;rig.group.visible=false;return false;}
  if(epoch!==s.epoch){epoch=s.epoch;lastTime=null;}
  if(shotAge>=0&&shotAge<.12)crew.shot(s.time-shotAge);
  behavior=crew.observe(s,bearing,elevation);
  if(!behavior){valid=false;rig.group.visible=false;return false;}
  const pulse=behavior.recoilReaction;
  for(let i=0;i<2;i++){grips[i].base.rotation.z=behavior.gripPitch;grips[i].base.rotation.x=(i?1:-1)*behavior.gripYaw;
   const button=grips[i].base.children[1];button.position.y=.07-(i===1?behavior.trigger*.009:0);
  }
  battery.turret.updateWorldMatrix(true,true);
  const hands=grips.map(g=>rig.group.worldToLocal(g.wrist.getWorldPosition(new T.Vector3())).toArray());
  // The left hand briefly leaves its stick to operate the console; it is not claimed locked then.
  hands[0][0]-=.025*behavior.reach;hands[0][1]+=.012*behavior.reach;hands[0][2]+=.015*behavior.reach;
  const pose={mode:'helm',time:s.time,seat:[-1.65,4.85,0],hands,feet:[[-1.25,4.335,-.18],[-1.25,4.335,.18]],lean:behavior.lean,torsoPitch:behavior.torsoPitch,breath:behavior.breath,};
  try{
   const result=rig.update(pose);maxError=result.maxError;
   if(!Number.isFinite(maxError)||maxError>.035)throw Error('OPERATOR_REACH');
   // Subtle head elevation and shot reaction; hands/soles stay solved to the console.
   const groupQ=rig.group.getWorldQuaternion(new T.Quaternion());
   const delta=new T.Quaternion().setFromEuler(new T.Euler(0,behavior.headYaw,-behavior.headPitch));
   const desired=groupQ.clone().multiply(delta).multiply(groupQ.clone().invert()).multiply(head.getWorldQuaternion(new T.Quaternion()));
   head.quaternion.copy(head.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desired));
   const rightHand=rig.group.getObjectByName('Bip01_R_Hand');
   rightHand.traverse(f=>{if(f.isBone&&/Finger1/.test(f.name))f.rotateZ(behavior.trigger*.12);});
   rig.group.updateWorldMatrix(true,true);
   headset.position.copy(rig.group.worldToLocal(head.getWorldPosition(new T.Vector3()))).add(new T.Vector3(.025,.065,0));
   headset.quaternion.copy(new T.Quaternion().setFromEuler(new T.Euler(0,behavior.headYaw,-behavior.headPitch)));
   headset.visible=mode!=='first';lamp.material.color.setHex(behavior.activity==='FIRING'?0xffd487:behavior.activity==='READY'?0x55bd96:0xdcb260);
   updateConsole(s,bearing,elevation);rig.group.visible=true;valid=true;lastTime=s.time;lastPose=pose;
   rig.group.updateWorldMatrix(true,true);meshList.forEach(m=>m.skeleton.update());
   return true;
  }catch(_){valid=false;rig.group.visible=false;return false;}
 }
 function camera(camera,aimPoint,{portrait=false}={}){
  if(disposed||!valid||!['first','third'].includes(mode))return false;
  battery.turret.updateWorldMatrix(true,true);
  const headLocal=rig.group.worldToLocal(head.getWorldPosition(new T.Vector3()));
  const eye=headLocal.clone().add(new T.Vector3(.11,.115,0));
  const p=mode==='first'?eye:new T.Vector3(portrait?-5.5:-5.6,portrait?6.25:6.6,portrait?-.65:-1.55);
  camera.position.copy(rig.group.localToWorld(p));
  camera.up.set(0,1,0);camera.near=mode==='first'?.035:.10;
  if(!motionComfort)camera.position.y+=(behavior?.headMotion||0);
  camera.fov=focus?36:mode==='first'?(lookDown?(portrait?88:77):(portrait?76:67)):(portrait?75:62);camera.updateProjectionMatrix();
  const target=lookDown&&mode==='first'?rig.group.localToWorld(new T.Vector3(-.95,4.95,0)):new T.Vector3(aimPoint.x,aimPoint.y,aimPoint.z);
  if(![target.x,target.y,target.z].every(Number.isFinite))return false;
  camera.lookAt(target);camera.clearViewOffset();camera.updateMatrixWorld(true);return true;
 }
 function inspect(){return {id:'atlas-w-visible-gunner-v1',assetSHA256:ASSET.sha256,heightM:ASSET.heightM,mode,focus,lookDown,valid,epoch,time:lastTime,jointMaxError:maxError,skins:meshList.length,headVisible:headMeshes.every(m=>m.visible),bodyVisible:meshList.find(m=>m.geometry.index.count===11817)?.visible,pose:lastPose,console:consoleTelemetry,crew:crew.inspect(),comfort:motionComfort,headWorld:valid?head.getWorldPosition(v).toArray():null};}
 function dispose(){if(disposed)return;disposed=true;rig.group.removeFromParent();station.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();for(const group of [rig.group,station])group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const val of Object.values(m))if(val?.isTexture)textures.add(val);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());valid=false;}
 return {update,setMode,camera,inspect,dispose,interact:a=>crew.interact(a),setComfort:v=>{motionComfort=!!v;},toggleLook:()=>{lookDown=!lookDown;focus=false;},group:rig.group,station,rig,head};
}
G.AtlasOperator={ASSET,load,mount};if(typeof module!=='undefined')module.exports=G.AtlasOperator;
})(globalThis);
