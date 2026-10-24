/* ATLAS-W Action Helm: simultaneous driving and game-only target practice. */
(function(G){'use strict';
function makeBattery(T){
 const root=new T.Group();root.name='ATLAS_W_HEAVY_BATTERY';root.position.set(39,7.7,0);
 const steel=new T.MeshStandardMaterial({color:0x75858d,roughness:.65,metalness:.35}),dark=new T.MeshStandardMaterial({color:0x26363f,roughness:.7,metalness:.5}),trim=new T.MeshStandardMaterial({color:0xd5b578,roughness:.6});
 function mesh(geo,mat,parent,pos){const o=new T.Mesh(geo,mat);o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 mesh(new T.CylinderGeometry(3.7,4.1,.65,24),dark,root,[0,.28,0]);
 const turret=new T.Group();root.add(turret);
 const outline=new T.Shape();outline.moveTo(-3.7,.5);for(const p of [[2.5,.5],[3.1,1.2],[2.5,3.35],[1.5,3.83],[-2.6,3.83],[-3.7,2.7]])outline.lineTo(...p);outline.closePath();
 const shell=new T.ExtrudeGeometry(outline,{depth:5.7,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.12,bevelThickness:.12});shell.translate(0,0,-2.85);mesh(shell,steel,turret,[0,0,0]);
 const roof=mesh(new T.BoxGeometry(5.8,.35,5.2),steel,turret,[-.6,3.92,0]);roof.rotation.z=-.035;
 mesh(new T.BoxGeometry(.18,1.6,4.6),dark,turret,[3.08,2.3,0]);
 for(const z of [-3.03,3.03]){mesh(new T.BoxGeometry(3.2,.22,.05),trim,turret,[-.2,2.5,z]);mesh(new T.BoxGeometry(1.5,1.1,.10),dark,turret,[-1.1,1.65,z]);}
 const elevation=new T.Group();elevation.position.set(2.4,2.45,0);turret.add(elevation);
 const barrels=[],muzzles=[],flashes=[];
 for(const z of [-1.3,1.3]){
  const slide=new T.Group();slide.position.z=z;elevation.add(slide);barrels.push(slide);
  for(const [x,len,r1,r2,mat] of [[1.6,3.2,.78,.7,steel],[6.4,7.2,.39,.49,steel],[10.25,.5,.48,.48,dark]]){const tube=mesh(new T.CylinderGeometry(r1,r2,len,16),mat,slide,[x,0,0]);tube.rotation.z=-Math.PI/2;}
  const bore=mesh(new T.CircleGeometry(.31,16),dark,slide,[10.51,0,0]);bore.rotation.y=Math.PI/2;
  const muzzle=new T.Object3D();muzzle.position.x=10.6;slide.add(muzzle);muzzles.push(muzzle);
  const flash=mesh(new T.ConeGeometry(1.05,4,8),new T.MeshBasicMaterial({color:0xffd38a,transparent:true,opacity:.9,depthWrite:false}),slide,[12.1,0,0]);flash.rotation.z=-Math.PI/2;flash.visible=false;flashes.push(flash);
 }
 root.userData={id:'atlas-w-fictional-heavy-twin-v1',barrels:2,visualOnly:true,realWeaponData:false};
 return {root,turret,elevation,barrels,muzzles,flashes};
}
// Low-arc aid for this fictional game's fixed projectile model only.
function aimFor(L,origin,target,carry){
 const required=t=>{const f=-Math.expm1(-L.P.drag*t)/L.P.drag,h=(t-f)/L.P.drag;
  return {x:(target.x-origin.x)/f-carry.x,y:(target.y-origin.y+L.P.gravity*h)/f-carry.y,z:(target.z-origin.z)/f-carry.z};};
 let prev=.08,answer=null;
 for(let t=.16;t<=12;t+=.08){const v=required(t);if(Math.hypot(v.x,v.y,v.z)<=L.P.speed){let a=prev,b=t;for(let j=0;j<14;j++){const m=(a+b)/2,q=required(m);if(Math.hypot(q.x,q.y,q.z)>L.P.speed)a=m;else b=m;}answer=required((a+b)/2);break;}prev=t;}
 return answer;
}
function install(T,H){
 if(!H.root||!H.scene||!H.camera||typeof H.command!=='function')throw Error('ACTION_HOST_INVALID');
 const old=H.root.getObjectByName('EX_StaticDeckMount');if(!old)throw Error('ORIGINAL_MOUNT_NOT_FOUND');
 if(H.root.getObjectByName('ATLAS_W_HEAVY_BATTERY'))throw Error('ACTION_ALREADY_INSTALLED');
 const priorVisible=old.visible;old.visible=false;
 const primary=makeBattery(T);G.AtlasDetail?.decorateBattery(T,primary);H.root.add(primary.root);G.AtlasDetail?.seatBase(T,H.root,primary);
 const definitions=[{id:'bow',label:'BOW TWIN',min:-110,max:110,home:0,cooldown:2.6,battery:primary},
 {id:'port',label:'PORT TWIN',min:-135,max:-15,home:-45,cooldown:1.3},
 {id:'starboard',label:'STARBOARD TWIN',min:15,max:135,home:45,cooldown:1.3}];
 for(let i=1;i<definitions.length;i++){const d=definitions[i],b=makeBattery(T);b.root.name='ATLAS_W_'+d.id.toUpperCase()+'_BATTERY';b.root.scale.setScalar(.46);b.root.position.set(32,7.0,i===1?-6.3:6.3);b.root.userData={...b.root.userData,id:'atlas-game-'+d.id};H.root.add(b.root);G.AtlasDetail?.seatBase(T,H.root,b);G.AtlasDetail?.decorateBattery(T,b);d.battery=b;}
 for(const d of definitions){d.bearing=d.actualBearing=d.home;d.elevation=d.actualElevation=18;d.coolUntil=0;d.lastShot=-100;d.recoil=[{x:0,v:0},{x:0,v:0}];d.battery.turret.rotation.y=-d.home*Math.PI/180;}
 let station=0,battery=primary;
 const gunner=H.operatorAssets?G.AtlasOperator.mount(T,primary,H.operatorAssets):null;let focus=false;const priorNear=H.camera.near;
 const L=G.AtlasFlight,C=G.AtlasActionControls,sim=new L.FlightWorld(H.water),inputs=new C.Inputs(),$=id=>document.getElementById(id);
 const fx=G.AtlasActionFX.create(T,H.scene,{capacity:Math.min(G.innerWidth||900,G.innerHeight||900)<600?360:640});
 let comfort=true,night=true;let disposed=false,bearing=0,elevation=18,actualBearing=0,actualElevation=18,selected=1,assist=false,manualPoint=null,mode=gunner?'third':'chase',lastEpoch=null,lastTime=0,lastShot=-100,notice='',soundOn=false,audio=null,inArc=true,camReady=false,detail=false,lastUI=-Infinity;
 let recoil=definitions[0].recoil;const rounds=new Map(),seen=new Set(),cleanups=[];let directAim=null;
 const panel=document.createElement('section');panel.id='action-hud';panel.setAttribute('aria-label','Drive and fire controls');
 panel.innerHTML='<div id="action-readout"><strong id="a-speed">0.0 kn</strong><span id="a-power">ENGINES OFF</span><span id="a-score">0 / 3</span><button id="a-camera" title="C: change camera">Chase</button><button id="a-sound" aria-pressed="false" title="M: sound">Sound off</button><button id="a-help" title="H: controls">?</button></div><nav id="battery-selector" aria-label="Select gun"><button id="a-prev-gun" aria-label="Previous gun">‹</button><button id="a-gun" title="G: next gun">BOW TWIN</button><button id="a-next-gun" aria-label="Next gun">›</button></nav><button id="a-lock" title="Lock mouse for direct aim; Escape releases">LOCK MOUSE</button><div id="a-aim-pad" role="region" aria-label="Drag here to aim the selected gun"><span>SWIPE TO AIM</span><i>✥</i></div><div id="a-actual-reticle" aria-hidden="true"></div><div id="a-crosshair" aria-hidden="true"><i></i><span id="a-aim-label">AIM</span></div><div id="a-feedback" role="status" aria-live="polite">WASD drive · right-drag or swipe aims · click / Space fires</div><div id="a-drive"><button id="a-ahead" title="W / ↑: throttle ahead" aria-label="Hold forward throttle">▲<small>AHEAD</small></button><button id="a-port" title="A / ←: steer port" aria-label="Hold port steering">◀</button><button id="a-idle" title="X: idle engines">IDLE</button><button id="a-starboard" title="D / →: steer starboard" aria-label="Hold starboard steering">▶</button><button id="a-astern" title="S / ↓: braking then reverse thrust" aria-label="Hold braking and reverse">▼<small>BRAKE / REV</small></button></div><div id="a-fire-cluster"><button id="a-target" title="Tab: next target">NEXT TARGET</button><button id="a-fire" aria-label="Fire twin salvo; hold for repeat"><strong>FIRE</strong><span id="a-reload">SPACE</span></button><div class="a-secondary"><button id="a-assist" aria-pressed="false">AIM ASSIST</button><button id="a-detail">OPTIONS</button></div></div><div id="a-tray" hidden><div id="operator-views" aria-label="Gunner camera"><button id="a-first" title="1: first person">1st person</button><button id="a-third" title="2: over the shoulder">3rd person</button><button id="a-chase" title="3: whole ship">Ship</button><button id="a-focus" title="Z: focus view">Zoom</button><span id="a-crew-status"></span></div><button id="a-look" title="V: look down at your hands">Look at controls / sight</button><button id="a-new">New targets</button><label>Sound level <input id="a-volume" type="range" min="0" max="80" value="35" aria-label="Sound level"></label><button id="a-night" aria-pressed="true">Reduced loudness: on</button><button id="a-comfort" aria-pressed="true">Steady camera: on</button><small>Original synthesized soundscape · headphones optional. No microphone access.</small><label>Traverse <input id="a-bearing" type="range" min="-110" max="110" value="0"></label><label>Elevation <input id="a-elevation" type="range" min="5" max="60" value="18"></label><small>Q/E aim · R/F elevation. Manual aiming turns off the game aim aid.</small></div><div id="a-pause" hidden><b>VOYAGE PAUSED</b><button id="a-resume">RESUME</button></div><div id="a-help-card" hidden><b>DRIVE AND FIRE — TOGETHER</b><p>W / ↑ adds ahead power and starts engines.<br>S / ↓ reduces power, then applies reverse thrust.<br>A/D or ←/→ steer. X idles; the ship still coasts.<br>Space / Fire shoots; hold for repeat salvos.<br>Tab highlights a target; manual aiming stays under your control.<br>Q/E traverse, R/F elevation. G next gun. 1/2 first/third person. C cycles cameras. Z zooms. V looks down at your hands.<br>Right-drag or swipe aims in all active views. Lock Mouse enables free mouse aiming. Left click / Space fires. G changes gun stations.<br>P or Escape pauses. Touch controls support multiple fingers.</p><button id="a-help-close">GOT IT</button><small>Game physics and effects, not calibrated real weapons.</small></div><div id="a-keyboard-hint">WASD / ARROWS <em>drive</em> &nbsp; SPACE <em>fire</em> &nbsp; G <em>gun</em> · RMB <em>aim</em> &nbsp; 1/2 <em>gunner view</em> &nbsp; Z <em>zoom</em></div>';
 document.body.append(panel);document.body.classList.add('action-helm');H.controls.enabled=false;
 const followPosition=new T.Vector3();
 const soundscape=G.AtlasSoundscape?.create(T,{root:H.root,camera:H.camera})||null;
 let engineState=false,cyclingUntil=-1;
 if(soundscape){
  const audioControl=$('audio');if(audioControl){audioControl.textContent='Sound is controlled by M / Sound';audioControl.disabled=true;}
 }
 const targets=new T.Group();targets.name='ATLAS_GAME_PRACTICE_TARGETS';H.scene.add(targets);const targetMeshes=[];
 const floatMat=new T.MeshStandardMaterial({color:0x243744,roughness:.75,metalness:.1}),targetMat=new T.MeshStandardMaterial({color:0xd05e31,roughness:.8}),stripeMat=new T.MeshStandardMaterial({color:0xf7dba2,roughness:.75});
 for(let i=0;i<3;i++){
  const g=new T.Group(),hull=new T.Mesh(new T.CylinderGeometry(6.3,5.5,1.5,10),floatMat);hull.position.y=-4.5;g.add(hull);
  const box=new T.Mesh(new T.BoxGeometry(6.2,7,6.2),targetMat);box.position.y=-.4;g.add(box);
  for(const y of [-2,1]){const stripe=new T.Mesh(new T.BoxGeometry(6.28,.5,6.28),stripeMat);stripe.position.y=y;g.add(stripe);}
  const mast=new T.Mesh(new T.CylinderGeometry(.12,.12,3,6),stripeMat);mast.position.y=4.2;g.add(mast);targets.add(g);targetMeshes.push(g);
 }
 const marker=new T.Mesh(new T.TorusGeometry(9,.2,6,48),new T.MeshBasicMaterial({color:0xffcf7e,transparent:true,opacity:.8}));marker.rotation.x=-Math.PI/2;targets.add(marker);
 const shotGeometry=new T.SphereGeometry(.48,8,6),shotMat=new T.MeshBasicMaterial({color:0xffe5a8});
 const lineMat=new T.LineBasicMaterial({color:0xffb15c,transparent:true,opacity:.9});
 function disposeRound(o){o.mesh.removeFromParent();o.line.removeFromParent();o.line.geometry.dispose();}
 function clearFlight(){for(const o of rounds.values())disposeRound(o);rounds.clear();fx.clear();seen.clear();for(const d of definitions){d.recoil.forEach(r=>{r.x=r.v=0;});d.battery.barrels.forEach(b=>b.position.x=0);d.battery.flashes.forEach(f=>f.visible=false);}}
 function clear(){directAim?.clear();inputs.clear();H.command('helm',0);document.querySelectorAll('#action-hud .pressed').forEach(e=>e.classList.remove('pressed'));}
 function reset(s){soundscape?.reset(s.epoch,s.time);cyclingUntil=-1;sim.reset(s);clearFlight();clear();lastEpoch=s.epoch;lastTime=s.time;selected=1;bearing=actualBearing=0;elevation=actualElevation=18;lastShot=-100;assist=false;manualPoint=null;camReady=false;for(const d of definitions){d.bearing=d.actualBearing=d.home;d.elevation=d.actualElevation=18;d.coolUntil=s.time;d.lastShot=-100;d.battery.turret.rotation.y=-d.home*Math.PI/180;d.battery.elevation.rotation.z=18*Math.PI/180;}bearing=actualBearing=definitions[station].home;notice='Right-drag / swipe to aim. W drives. Click / Space fires.';}
 function saveStation(){Object.assign(definitions[station],{bearing,elevation,actualBearing,actualElevation,lastShot});}
 function chooseGun(index){
  saveStation();clear();station=(index+definitions.length)%definitions.length;
  const d=definitions[station];battery=d.battery;recoil=d.recoil;({bearing,elevation,actualBearing,actualElevation,lastShot}=d);sim.coolUntil=d.coolUntil;
  assist=false;manualPoint=null;camReady=false;gunner?.interact('SELECT '+d.label);notice=d.label+' · manual aim';
  $('a-bearing').min=d.min;$('a-bearing').max=d.max;
 }
 function manualMove(dx,dy){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||H.read().paused||blocked())return;
  assist=false;manualPoint=null;const d=definitions[station];
  bearing=L.clamp(bearing+dx*(focus?.075:.18),d.min,d.max);elevation=L.clamp(elevation-dy*(focus?.055:.13),5,60);
  notice=(bearing===d.min||bearing===d.max?'ARC LIMIT — change gun or steer ship':'MANUAL AIM')+' · '+d.label;
 }
 function target(){return manualPoint||sim.center(sim.targets[selected]);}
 function aim(s,dt){
  const yaw=inputs.axis('aimLeft','aimRight'),pitch=inputs.axis('lower','raise');
  if(yaw||pitch){assist=false;manualPoint=null;bearing=L.clamp(bearing+yaw*55*dt,definitions[station].min,definitions[station].max);elevation=L.clamp(elevation+pitch*30*dt,5,60);}
  inArc=true;
  if(assist){
   const origin=battery.muzzles[0].getWorldPosition(new T.Vector3()).add(battery.muzzles[1].getWorldPosition(new T.Vector3())).multiplyScalar(.5),t=target(),carry=L.carriedVelocity(s,origin);
   const solution=aimFor(L,origin,t,carry);
   if(solution){const v=new T.Vector3(solution.x,solution.y,solution.z).applyQuaternion(H.root.getWorldQuaternion(new T.Quaternion()).invert()),b=Math.atan2(v.z,v.x)*180/Math.PI,e=Math.atan2(v.y,Math.hypot(v.x,v.z))*180/Math.PI;inArc=b>=definitions[station].min&&b<=definitions[station].max&&e>=5&&e<=60;bearing=L.clamp(b,definitions[station].min,definitions[station].max);elevation=L.clamp(e,5,60);}else inArc=false;
  }
  const approach=(a,b,limit)=>a+L.clamp(b-a,-limit,limit);actualBearing=approach(actualBearing,bearing,75*dt);actualElevation=approach(actualElevation,elevation,50*dt);
  battery.turret.rotation.y=-actualBearing*Math.PI/180;battery.elevation.rotation.z=actualElevation*Math.PI/180;saveStation();H.root.updateMatrixWorld(true);
 }
 function sound(kind,p){soundscape?.event(kind,p,sim.time);}
 async function toggleSound(){if(!soundscape){notice='Audio unavailable';return;}soundOn=await soundscape.toggle();notice=soundOn?'Sound enabled':'Sound off';}
 function aligned(){return Math.abs(bearing-actualBearing)<1&&Math.abs(elevation-actualElevation)<1;}
 function fire(){
  if(disposed||document.hidden||H.read().paused||sim.invalid||blocked())return false;
  if(assist&&(!inArc||!aligned())){notice=inArc?'Turret aligning — hold Fire':'Target outside this station arc';return false;}
  const s=H.read();H.root.updateMatrixWorld(true);const starts=battery.muzzles.map(m=>m.getWorldPosition(new T.Vector3()));
  const direction=new T.Vector3(1,0,0).applyQuaternion(battery.elevation.getWorldQuaternion(new T.Quaternion())).normalize();
  sim.coolUntil=definitions[station].coolUntil;const result=sim.fire(s,starts,direction,starts.map(p=>L.carriedVelocity(s,p)));
  if(result.valid){definitions[station].coolUntil=sim.coolUntil=sim.time+definitions[station].cooldown;lastShot=definitions[station].lastShot=sim.time;recoil.forEach(r=>r.v-=8);starts.forEach(p=>fx.muzzle(p,sim.time));sound('shot',starts[0]);soundscape?.event('clack',starts[0],sim.time,{delay:false});cyclingUntil=sim.time+.45;notice='SALVO AWAY';return true;}
  notice=result.reason==='CAPACITY'?'Rounds still in flight — wait for impact':result.reason==='RANGE_COMPLETE'?'All targets hit — use New targets':result.reason==='RELOADING'?'Reloading selected gun':String(result.reason||'Not ready');return false;
 }
 function next(){gunner?.interact('TARGET SELECT');selected=(selected+1)%3;for(let i=0;i<3&&sim.targets[selected].hit;i++)selected=(selected+1)%3;manualPoint=null;notice='Target '+(selected+1)+' selected';}
 function setView(value){
  if(['first','third'].includes(value)&&!gunner){notice='Gunner asset unavailable — ship view remains playable';return;}
  mode=value;focus=false;gunner?.setMode(mode,focus);H.camera.near=['first','third'].includes(mode)?.035:priorNear;H.camera.updateProjectionMatrix();H.controls.enabled=mode==='orbit';camReady=false;if(mode==='orbit')H.restoreView();
 }
 function cameraMode(){const values=gunner?['third','first','chase','orbit']:['chase','gun','orbit'];setView(values[(values.indexOf(mode)+1)%values.length]);}
 function act(a){if(a==='gun')chooseGun(station+1);if(a==='previousGun')chooseGun(station-1);if(a==='look'&&gunner){if(mode!=='first')setView('first');gunner.toggleLook();focus=false;}if(['first','third','chase'].includes(a))setView(a);if(a==='focus'){focus=!focus;gunner?.setMode(mode,focus);}if(a==='fire')fire();if(a==='target')next();if(a==='camera')cameraMode();if(a==='idle')H.command('idle');if(a==='pause'){$('pause').click();clear();}if(a==='sound')toggleSound();if(a==='help'){$('a-help-card').hidden=!$('a-help-card').hidden;clear();}}
 const blocked=()=>disposed||document.hidden||!!document.querySelector('dialog[open]')||!!document.querySelector('.panel:not([hidden])')||!$('a-help-card').hidden;
 cleanups.push(C.bindKeyboard(G,inputs,act,()=>!blocked()));
 for(const [id,action]of [['a-ahead','ahead'],['a-astern','astern'],['a-port','port'],['a-starboard','starboard'],['a-fire','fire']])cleanups.push(C.bindPointer($(id),action,inputs,()=>!blocked()&&!H.read().paused));
 // A short tap fires immediately; holding repeats on simulation steps. Cooldown prevents duplicates.
 $('a-gun').onclick=$('a-next-gun').onclick=()=>chooseGun(station+1);$('a-prev-gun').onclick=()=>chooseGun(station-1);
 $('a-look').onclick=()=>act('look');$('a-first').onclick=()=>setView('first');$('a-third').onclick=()=>setView('third');$('a-chase').onclick=()=>setView('chase');$('a-focus').onclick=()=>act('focus');
 $('a-first').disabled=$('a-third').disabled=!gunner;gunner?.setMode(mode);
 $('a-fire').onclick=()=>fire();$('a-target').onclick=next;$('a-camera').onclick=cameraMode;$('a-idle').onclick=()=>act('idle');$('a-sound').onclick=toggleSound;
 $('a-help').onclick=()=>act('help');$('a-help-close').onclick=()=>$('a-help-card').hidden=true;
 $('a-assist').onclick=()=>{gunner?.interact('AIM MODE');assist=!assist;manualPoint=null;};$('a-detail').onclick=()=>{detail=!detail;$('a-tray').hidden=!detail;};
 $('a-new').onclick=()=>{if(!H.read().paused)reset(H.read());else notice='Resume before resetting targets';};
 for(const [id,key]of [['a-bearing','bearing'],['a-elevation','elevation']])$(id).oninput=e=>{const v=Number(e.target.value);if(!Number.isFinite(v))return;assist=false;manualPoint=null;if(key==='bearing')bearing=L.clamp(v,definitions[station].min,definitions[station].max);else elevation=L.clamp(v,5,60);};
 $('a-volume').oninput=e=>soundscape?.setVolume(Number(e.target.value)/100);
 $('a-night').onclick=()=>{night=!night;soundscape?.setNight(night);$('a-night').setAttribute('aria-pressed',String(night));$('a-night').textContent='Reduced loudness: '+(night?'on':'off');};
 $('a-comfort').onclick=()=>{comfort=!comfort;gunner?.setComfort(comfort);$('a-comfort').setAttribute('aria-pressed',String(comfort));$('a-comfort').textContent='Steady camera: '+(comfort?'on':'off');};
 $('a-resume').onclick=()=>{clear();if(H.read().paused)$('pause').click();};
 const canvas=H.canvas;canvas.tabIndex=0;
 directAim=G.AtlasDirectAim.bind({canvas,pad:$('a-aim-pad'),lockButton:$('a-lock'),enabled:()=>!blocked()&&mode!=='orbit',paused:()=>H.read().paused,
  move:manualMove,fire,hold:v=>v?inputs.hold('mouse:fire','fire'):inputs.release('mouse:fire'),
  zoom:v=>{focus=!!v;gunner?.setMode(mode,focus);},status:s=>{notice=s;}});
 const blur=()=>{clear();soundscape?.silence();},resized=()=>{blur();camReady=false;};G.addEventListener('blur',blur);G.addEventListener('resize',resized);document.addEventListener('visibilitychange',blur);
 reset(H.read());
 function beforeStep(dt){if(blocked()){clear();return;}inputs.step(dt,H.read(),H.command);}
 function tick(s){
  if(disposed)return;
  try{
   if(!sim.valid(s))throw Error('INVALID_HOST');if(s.epoch!==lastEpoch)reset(s);
   const result=sim.observe(s);if(!result.valid){soundscape?.silence();clear();clearFlight();return;}
   const dt=Math.max(0,s.time-lastTime);lastTime=s.time;aim(s,dt);soundscape?.update(s,{slew:gunner?.inspect().crew?.behavior?.gripYaw*440||0,firstPerson:mode==='first'});
   if(s.paused)clear();else if(inputs.has('fire')&&!blocked())fire();
   for(let left=dt;left>1e-8;left-=1/120){const h=Math.min(left,1/120);for(const d of definitions)for(const r of d.recoil){r.v+=(-180*r.x-24*r.v)*h;r.x+=r.v*h;}}
   for(const d of definitions){d.battery.barrels.forEach((b,i)=>b.position.x=d.recoil[i].x);d.battery.flashes.forEach(f=>f.visible=sim.time-d.lastShot<.11);}
   gunner?.update(s,definitions[0].actualBearing,definitions[0].actualElevation,recoil[0].x,sim.time-lastShot);
   if(!s.paused&&s.engine!==engineState){soundscape?.event('cycle',H.root.localToWorld(new T.Vector3(-30,4,0)),sim.time,{delay:false});engineState=s.engine;}
   if(!s.paused&&cyclingUntil>=0&&sim.time>=cyclingUntil){soundscape?.event('cycle',battery.root.getWorldPosition(new T.Vector3()),sim.time,{delay:false});cyclingUntil=-1;}
   for(const impact of sim.impacts){if(seen.has(impact.id))continue;seen.add(impact.id);if(seen.size>64)seen.delete(seen.values().next().value);fx.impact(impact.p,impact.kind,impact.time);sound(impact.kind==='target'?'impact':'splash',impact.p);notice=impact.kind==='target'?'TARGET '+impact.targetId+' DESTROYED':'SPLASH';}
  }catch(e){soundscape?.silence();sim.fail(e.message||'ACTION_UPDATE_FAILED');gunner?.update(null,0,0,0,0);clear();clearFlight();}
 }
 function updateInner(s){
  if(disposed)return;tick(s);if(sim.invalid){$('a-feedback').textContent='RESET VOYAGE — '+sim.reason;return;}fx.update(sim.time,G.innerHeight||720);
  targetMeshes.forEach((g,i)=>{const t=sim.targets[i],c=sim.center(t),age=t.hit?sim.time-t.hitAt:0;g.position.set(c.x,c.y-Math.max(0,age-1)*3,c.z);g.rotation.z=t.hit?Math.min(.9,age*.35):Math.sin(sim.time*.8+i)*.025;g.visible=!t.hit||age<4;});
  const t=target();marker.position.set(t.x,H.water(t.x,t.z,sim.time)+.15,t.z);marker.visible=manualPoint!==null||!sim.targets[selected].hit;
  const active=new Set(sim.shells.map(s=>s.id));for(const[id,o]of rounds)if(!active.has(id)){disposeRound(o);rounds.delete(id);}
  for(const q of sim.shells){if(!rounds.has(q.id)){const mesh=new T.Mesh(shotGeometry,shotMat),line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),lineMat);H.scene.add(mesh,line);rounds.set(q.id,{mesh,line});}const o=rounds.get(q.id);o.mesh.position.copy(q.p);const p=o.line.geometry.attributes.position;p.setXYZ(0,q.p.x,q.p.y,q.p.z);p.setXYZ(1,q.p.x-q.v.x*.14,q.p.y-q.v.y*.14,q.p.z-q.v.z*.14);p.needsUpdate=true;o.line.geometry.computeBoundingSphere();}
  H.controls.enabled=mode==='orbit';
  const br=bearing*Math.PI/180,el=elevation*Math.PI/180;const sightPoint=assist?t:new T.Vector3(Math.cos(br)*Math.cos(el),Math.sin(el),Math.sin(br)*Math.cos(el)).applyQuaternion(H.root.getWorldQuaternion(new T.Quaternion())).multiplyScalar(400).add(battery.muzzles[0].getWorldPosition(new T.Vector3()));
  const operatorCamera=gunner?.camera(H.camera,sightPoint,{portrait:G.innerWidth<G.innerHeight});
  if(mode!=='orbit'&&!operatorCamera){
   H.root.updateMatrixWorld(true);const portrait=G.innerWidth<G.innerHeight,local=mode==='gun'?[14,27,24]:portrait?[-200,110,15]:[-165,85,30];
   const destination=new T.Vector3(...local).applyMatrix4(H.root.matrixWorld),look=mode==='gun'?new T.Vector3(t.x,t.y,t.z):new T.Vector3(85,7,0).applyMatrix4(H.root.matrixWorld).lerp(new T.Vector3(t.x,t.y,t.z),.22);
   const fov=mode==='gun'?60:portrait?64:58;if(H.camera.fov!==fov){H.camera.fov=fov;H.camera.updateProjectionMatrix();}
   // Time-based low-pass follows the ship, never the projectile.
   const delta=camReady?Math.max(0,Math.min(.1,s.time-(update.cameraTime??s.time))):0;
   if(!camReady){followPosition.copy(destination);camReady=true;}else followPosition.lerp(destination,1-Math.exp(-7*delta));H.camera.position.copy(followPosition);update.cameraTime=s.time;
   H.camera.lookAt(look);H.camera.clearViewOffset();
  }
  H.camera.updateMatrixWorld(true);soundscape?.update(s,{slew:gunner?.inspect().crew?.behavior?.gripYaw*440||0,firstPerson:mode==='first'});const screen=new T.Vector3(sightPoint.x,sightPoint.y,sightPoint.z).project(H.camera),cross=$('a-crosshair');cross.hidden=Math.abs(screen.x)>1||Math.abs(screen.y)>.9||screen.z>1;cross.style.left=((screen.x+1)*50)+'%';cross.style.top=((1-screen.y)*50)+'%';cross.dataset.ready=String(inArc&&aligned());
  const cooldown=Math.max(0,definitions[station].coolUntil-sim.time);$('a-fire').disabled=s.paused||sim.invalid||document.hidden||sim.targets.every(t=>t.hit);$('a-reload').textContent=cooldown>.01?cooldown.toFixed(1)+'s':(!assist?'READY':inArc?(aligned()?'READY':'ALIGNING'):'OUT OF ARC');
  $('a-pause').hidden=!s.paused;$('a-camera').textContent=mode==='first'?'1st person':mode==='third'?'3rd person':mode==='gun'?'Gun view':mode==='orbit'?'Free camera':'Chase';$('a-first').setAttribute('aria-pressed',String(mode==='first'));$('a-third').setAttribute('aria-pressed',String(mode==='third'));$('a-chase').setAttribute('aria-pressed',String(mode==='chase'));$('a-focus').setAttribute('aria-pressed',String(focus));$('a-crew-status').textContent=gunner?(gunner.inspect().valid?('CREW · '+(gunner.inspect().crew?.behavior?.activity||'READY')):'GUNNER HIDDEN — INVALID POSE'):'GUNNER UNAVAILABLE';soundOn=soundscape?.inspect().enabled||false;$('a-sound').textContent=soundscape?.inspect().error?'Sound unavailable':soundOn?'Sound on':'Enable sound';$('a-sound').setAttribute('aria-pressed',String(soundOn));$('a-assist').setAttribute('aria-pressed',String(assist));$('a-assist').textContent=assist?'ASSIST ON':'MANUAL';
  $('a-speed').textContent=s.speedKnots.toFixed(1)+' kn';$('a-power').textContent=!s.engine?'W / ▲ TO START':(s.gear<0?'ASTERN ':s.gear>0?'AHEAD ':'NEUTRAL ')+Math.round((s.port+s.starboard)*50)+'%';$('a-score').textContent=sim.hits+' / 3 TARGETS';$('a-aim-label').textContent=!assist?'MANUAL AIM':manualPoint?'AIM POINT':('TARGET '+(selected+1));
  $('a-gun').textContent=definitions[station].label+'  '+(station+1)+'/3';$('a-lock').hidden=mode==='orbit';$('a-aim-pad').hidden=mode==='orbit';
  const actualPoint=new T.Vector3(1,0,0).applyQuaternion(battery.elevation.getWorldQuaternion(new T.Quaternion())).multiplyScalar(400).add(battery.muzzles[0].getWorldPosition(new T.Vector3())).project(H.camera),pip=$('a-actual-reticle');pip.hidden=actualPoint.z>1||Math.abs(actualPoint.x)>1||Math.abs(actualPoint.y)>1;pip.style.left=(50+actualPoint.x*50)+'%';pip.style.top=(50-actualPoint.y*50)+'%';
  const message=sim.invalid?'RESET VOYAGE — '+sim.reason:s.paused?'Paused · P / Resume':assist&&!inArc?'TARGET OUTSIDE GUN ARC':notice;
  if($('a-feedback').textContent!==message)$('a-feedback').textContent=message;
  if(document.activeElement!==$('a-bearing'))$('a-bearing').value=bearing;if(document.activeElement!==$('a-elevation'))$('a-elevation').value=elevation;
 }
 function update(s){try{if(!sim.valid(s)){tick(s);return;}updateInner(s);}catch(e){soundscape?.silence();sim.fail(e.message||'ACTION_RENDER_FAILED');clear();clearFlight();$('a-feedback').textContent='RESET VOYAGE — '+sim.reason;}}
 function dispose(){if(disposed)return;disposed=true;directAim?.dispose();soundscape?.dispose();gunner?.dispose();H.camera.near=priorNear;H.camera.updateProjectionMatrix();clear();cleanups.forEach(f=>f());clearFlight();fx.dispose();old.visible=priorVisible;for(const obj of[...definitions.map(d=>d.battery.root),targets]){obj.removeFromParent();obj.traverse(o=>{o.geometry?.dispose();if(o.material)[].concat(o.material).forEach(m=>m.dispose());});}shotGeometry.dispose();shotMat.dispose();lineMat.dispose();panel.remove();document.body.classList.remove('action-helm');G.removeEventListener('blur',blur);G.removeEventListener('resize',resized);document.removeEventListener('visibilitychange',blur);H.controls.enabled=true;audio?.close().catch(()=>{});delete G.ATLAS_W_RANGE;}
 const inspect=()=>({version:'atlas-w-direct-control-1',station:definitions[station].id,stations:definitions.map(d=>({id:d.id,label:d.label,requested:d.bearing,actual:d.actualBearing,coolUntil:d.coolUntil,position:d.battery.root.position.toArray(),scale:d.battery.root.scale.x})),directAim:directAim?.inspect(),soundscape:soundscape?.inspect()||null,operator:gunner?.inspect()||null,operatorError:H.operatorError||null,focus,mode,assist,manualPoint,requested:{bearing,elevation},actual:{bearing:actualBearing,elevation:actualElevation},inArc,aligned:aligned(),held:[...inputs.tokens.values()],session:sim.inspect(),recoil:recoil.map(r=>({...r})),effects:fx.inspect(),roundMeshes:rounds.size,realWeaponCalibration:false});
 G.ATLAS_W_RANGE={inspect};return {beforeStep,tick,update,clear,inspect,dispose};
}
const api={makeBattery,aimFor,install};G.AtlasGunnery=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
