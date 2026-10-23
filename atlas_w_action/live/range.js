/* ATLAS-W Action Helm: simultaneous driving and game-only target practice. */
(function(G){'use strict';
function makeBattery(T){
 const root=new T.Group();root.name='ATLAS_W_HEAVY_BATTERY';root.position.set(39,7.7,0);
 const steel=new T.MeshStandardMaterial({color:0x75858d,roughness:.65,metalness:.35}),dark=new T.MeshStandardMaterial({color:0x26363f,roughness:.7,metalness:.5}),trim=new T.MeshStandardMaterial({color:0xd5b578,roughness:.6});
 function mesh(geo,mat,parent,pos){const o=new T.Mesh(geo,mat);o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 mesh(new T.CylinderGeometry(3.7,4.1,.65,24),dark,root,[0,.28,0]);
 const turret=new T.Group();root.add(turret);mesh(new T.BoxGeometry(6.8,3.4,6.0),steel,turret,[-.4,2.05,0]);
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
 const priorVisible=old.visible;old.visible=false;const battery=makeBattery(T);H.root.add(battery.root);
 const L=G.AtlasFlight,C=G.AtlasActionControls,sim=new L.FlightWorld(H.water),inputs=new C.Inputs(),$=id=>document.getElementById(id);
 const fx=G.AtlasActionFX.create(T,H.scene,{capacity:Math.min(G.innerWidth||900,G.innerHeight||900)<600?360:640});
 let disposed=false,bearing=0,elevation=18,actualBearing=0,actualElevation=18,selected=1,assist=true,manualPoint=null,mode='chase',lastEpoch=null,lastTime=0,lastShot=-100,notice='',soundOn=false,audio=null,inArc=true,camReady=false,detail=false,lastUI=-Infinity;
 const recoil=[{x:0,v:0},{x:0,v:0}],rounds=new Map(),seen=new Set(),cleanups=[];
 const panel=document.createElement('section');panel.id='action-hud';panel.setAttribute('aria-label','Drive and fire controls');
 panel.innerHTML='<div id="action-readout"><strong id="a-speed">0.0 kn</strong><span id="a-power">ENGINES OFF</span><span id="a-score">0 / 3</span><button id="a-camera" title="C: change camera">Chase</button><button id="a-sound" aria-pressed="false" title="M: sound">Sound off</button><button id="a-help" title="H: controls">?</button></div><div id="a-crosshair" aria-hidden="true"><i></i><span id="a-aim-label">AIM</span></div><div id="a-feedback" role="status" aria-live="polite">WASD / arrows to drive · Space to fire</div><div id="a-drive"><button id="a-ahead" title="W / ↑: throttle ahead" aria-label="Hold forward throttle">▲<small>AHEAD</small></button><button id="a-port" title="A / ←: steer port" aria-label="Hold port steering">◀</button><button id="a-idle" title="X: idle engines">IDLE</button><button id="a-starboard" title="D / →: steer starboard" aria-label="Hold starboard steering">▶</button><button id="a-astern" title="S / ↓: braking then reverse thrust" aria-label="Hold braking and reverse">▼<small>BRAKE / REV</small></button></div><div id="a-fire-cluster"><button id="a-target" title="Tab: next target">NEXT TARGET</button><button id="a-fire" aria-label="Fire twin salvo; hold for repeat"><strong>FIRE</strong><span id="a-reload">SPACE</span></button><div class="a-secondary"><button id="a-assist" aria-pressed="true">AIM ASSIST</button><button id="a-detail">MORE</button></div></div><div id="a-tray" hidden><button id="a-new">New targets</button><label>Traverse <input id="a-bearing" type="range" min="-65" max="65" value="0"></label><label>Elevation <input id="a-elevation" type="range" min="5" max="55" value="18"></label><small>Q/E aim · R/F elevation. Manual aiming turns off the game aim aid.</small></div><div id="a-pause" hidden><b>VOYAGE PAUSED</b><button id="a-resume">RESUME</button></div><div id="a-help-card" hidden><b>DRIVE AND FIRE — TOGETHER</b><p>W / ↑ adds ahead power and starts engines.<br>S / ↓ reduces power, then applies reverse thrust.<br>A/D or ←/→ steer. X idles; the ship still coasts.<br>Space / Fire shoots; hold for repeat salvos.<br>Tab selects target. Click or tap water to aim there.<br>Q/E traverse, R/F elevation. C changes camera.<br>P or Escape pauses. Touch controls support multiple fingers.</p><button id="a-help-close">GOT IT</button><small>Game physics and effects, not calibrated real weapons.</small></div><div id="a-keyboard-hint">WASD / ARROWS <em>drive</em> &nbsp; SPACE <em>fire</em> &nbsp; TAB <em>target</em> &nbsp; C <em>camera</em></div>';
 document.body.append(panel);document.body.classList.add('action-helm');H.controls.enabled=false;
 const followPosition=new T.Vector3();
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
 function clearFlight(){for(const o of rounds.values())disposeRound(o);rounds.clear();fx.clear();seen.clear();recoil.forEach(r=>{r.x=r.v=0;});battery.barrels.forEach(b=>b.position.x=0);battery.flashes.forEach(f=>f.visible=false);}
 function clear(){inputs.clear();H.command('helm',0);document.querySelectorAll('#action-hud .pressed').forEach(e=>e.classList.remove('pressed'));}
 function reset(s){sim.reset(s);clearFlight();clear();lastEpoch=s.epoch;lastTime=s.time;selected=1;bearing=actualBearing=0;elevation=actualElevation=18;lastShot=-100;assist=true;manualPoint=null;camReady=false;notice='Ready — drive and fire together';}
 function target(){return manualPoint||sim.center(sim.targets[selected]);}
 function aim(s,dt){
  const yaw=inputs.axis('aimLeft','aimRight'),pitch=inputs.axis('lower','raise');
  if(yaw||pitch){assist=false;manualPoint=null;bearing=L.clamp(bearing+yaw*36*dt,-65,65);elevation=L.clamp(elevation+pitch*22*dt,5,55);}
  inArc=true;
  if(assist){
   const origin=battery.muzzles[0].getWorldPosition(new T.Vector3()).add(battery.muzzles[1].getWorldPosition(new T.Vector3())).multiplyScalar(.5),t=target(),carry=L.carriedVelocity(s,origin);
   const solution=aimFor(L,origin,t,carry);
   if(solution){const v=new T.Vector3(solution.x,solution.y,solution.z).applyQuaternion(H.root.getWorldQuaternion(new T.Quaternion()).invert()),b=Math.atan2(v.z,v.x)*180/Math.PI,e=Math.atan2(v.y,Math.hypot(v.x,v.z))*180/Math.PI;inArc=Math.abs(b)<=65&&e>=5&&e<=55;bearing=L.clamp(b,-65,65);elevation=L.clamp(e,5,55);}else inArc=false;
  }
  const approach=(a,b,limit)=>a+L.clamp(b-a,-limit,limit);actualBearing=approach(actualBearing,bearing,40*dt);actualElevation=approach(actualElevation,elevation,25*dt);
  battery.turret.rotation.y=-actualBearing*Math.PI/180;battery.elevation.rotation.z=actualElevation*Math.PI/180;H.root.updateMatrixWorld(true);
 }
 function sound(kind,p){
  if(!soundOn||!audio||audio.state!=='running')return;const t=audio.currentTime,dist=H.camera.position.distanceTo(new T.Vector3(p.x,p.y,p.z)),g=audio.createGain();g.gain.value=0;g.connect(audio.destination);
  const volume=Math.min(.22,.22/(1+dist/220));g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.9);
  const noise=audio.createBuffer(1,Math.floor(audio.sampleRate*.8),audio.sampleRate),arr=noise.getChannelData(0);for(let i=0;i<arr.length;i++)arr[i]=(Math.random()*2-1)*Math.pow(1-i/arr.length,2);
  const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),osc=audio.createOscillator();src.buffer=noise;filter.type='lowpass';filter.frequency.setValueAtTime(kind==='shot'?1100:600,t);filter.frequency.exponentialRampToValueAtTime(80,t+.8);src.connect(filter);filter.connect(g);osc.frequency.setValueAtTime(kind==='shot'?85:55,t);osc.frequency.exponentialRampToValueAtTime(25,t+.7);osc.connect(g);src.start(t);osc.start(t);osc.stop(t+.85);src.onended=()=>{src.disconnect();filter.disconnect();osc.disconnect();g.disconnect();};
 }
 function toggleSound(){soundOn=!soundOn;if(soundOn){try{const Audio=G.AudioContext||G.webkitAudioContext;audio=audio||new Audio();audio.resume().catch(()=>{});}catch(_){soundOn=false;notice='Audio unavailable';}}}
 function aligned(){return Math.abs(bearing-actualBearing)<1&&Math.abs(elevation-actualElevation)<1;}
 function fire(){
  if(disposed||document.hidden||H.read().paused||sim.invalid||blocked())return false;
  if(!inArc||!aligned()){notice=inArc?'Turret aligning — hold Fire':'Turn toward the selected target';return false;}
  const s=H.read();H.root.updateMatrixWorld(true);const starts=battery.muzzles.map(m=>m.getWorldPosition(new T.Vector3()));
  const direction=new T.Vector3(1,0,0).applyQuaternion(battery.elevation.getWorldQuaternion(new T.Quaternion())).normalize();
  const result=sim.fire(s,starts,direction,starts.map(p=>L.carriedVelocity(s,p)));
  if(result.valid){lastShot=sim.time;recoil.forEach(r=>r.v-=8);starts.forEach(p=>fx.muzzle(p,sim.time));sound('shot',starts[0]);notice='SALVO AWAY';return true;}
  return false;
 }
 function next(){selected=(selected+1)%3;for(let i=0;i<3&&sim.targets[selected].hit;i++)selected=(selected+1)%3;manualPoint=null;assist=true;notice='Target '+(selected+1)+' selected';}
 function cameraMode(){mode=mode==='chase'?'gun':mode==='gun'?'orbit':'chase';H.controls.enabled=mode==='orbit';camReady=false;if(mode==='orbit')H.restoreView();}
 function act(a){if(a==='fire')fire();if(a==='target')next();if(a==='camera')cameraMode();if(a==='idle')H.command('idle');if(a==='pause'){$('pause').click();clear();}if(a==='sound')toggleSound();if(a==='help'){$('a-help-card').hidden=!$('a-help-card').hidden;clear();}}
 const blocked=()=>disposed||document.hidden||!!document.querySelector('dialog[open]')||!!document.querySelector('.panel:not([hidden])')||!$('a-help-card').hidden;
 cleanups.push(C.bindKeyboard(G,inputs,act,()=>!blocked()));
 for(const [id,action]of [['a-ahead','ahead'],['a-astern','astern'],['a-port','port'],['a-starboard','starboard'],['a-fire','fire']])cleanups.push(C.bindPointer($(id),action,inputs,()=>!blocked()&&!H.read().paused));
 // A short tap fires immediately; holding repeats on simulation steps. Cooldown prevents duplicates.
 $('a-fire').onclick=()=>fire();$('a-target').onclick=next;$('a-camera').onclick=cameraMode;$('a-idle').onclick=()=>act('idle');$('a-sound').onclick=toggleSound;
 $('a-help').onclick=()=>act('help');$('a-help-close').onclick=()=>$('a-help-card').hidden=true;
 $('a-assist').onclick=()=>{assist=!assist;manualPoint=null;};$('a-detail').onclick=()=>{detail=!detail;$('a-tray').hidden=!detail;};
 $('a-new').onclick=()=>{if(!H.read().paused)reset(H.read());else notice='Resume before resetting targets';};
 for(const [id,key]of [['a-bearing','bearing'],['a-elevation','elevation']])$(id).oninput=e=>{const v=Number(e.target.value);if(!Number.isFinite(v))return;assist=false;manualPoint=null;if(key==='bearing')bearing=L.clamp(v,-65,65);else elevation=L.clamp(v,5,55);};
 $('a-resume').onclick=()=>{clear();if(H.read().paused)$('pause').click();};
 const canvas=H.canvas,ray=new T.Raycaster();let down=null;
 function aimAt(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),H.camera);const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());if(!point||point.distanceTo(H.root.position)>800||point.distanceTo(H.root.position)<75)return;manualPoint={x:point.x,y:H.water(point.x,point.z,sim.time)+1,z:point.z};assist=true;notice='Aiming at water point';}
 const pointerDown=e=>{if(e.button!==0||blocked())return;down={id:e.pointerId,x:e.clientX,y:e.clientY};if(mode!=='orbit')aimAt(e);};
 const pointerMove=e=>{if(down&&down.id===e.pointerId&&mode!=='orbit')aimAt(e);};
 const pointerUp=e=>{if(down?.id===e.pointerId){if(mode==='orbit'&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6)aimAt(e);down=null;}};
 canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
 const blur=()=>{down=null;clear();},resized=()=>{blur();camReady=false;};G.addEventListener('blur',blur);G.addEventListener('resize',resized);document.addEventListener('visibilitychange',blur);
 reset(H.read());
 function beforeStep(dt){if(blocked()){clear();return;}inputs.step(dt,H.read(),H.command);}
 function tick(s){
  if(disposed)return;
  try{
   if(!sim.valid(s))throw Error('INVALID_HOST');if(s.epoch!==lastEpoch)reset(s);
   const result=sim.observe(s);if(!result.valid){clear();clearFlight();return;}
   const dt=Math.max(0,s.time-lastTime);lastTime=s.time;aim(s,dt);
   if(s.paused)clear();else if(inputs.has('fire')&&!blocked())fire();
   for(let left=dt;left>1e-8;left-=1/120){const h=Math.min(left,1/120);for(const r of recoil){r.v+=(-180*r.x-24*r.v)*h;r.x+=r.v*h;}}
   battery.barrels.forEach((b,i)=>b.position.x=recoil[i].x);battery.flashes.forEach(f=>f.visible=sim.time-lastShot<.11);
   for(const impact of sim.impacts){if(seen.has(impact.id))continue;seen.add(impact.id);if(seen.size>64)seen.delete(seen.values().next().value);fx.impact(impact.p,impact.kind,impact.time);sound('impact',impact.p);notice=impact.kind==='target'?'TARGET '+impact.targetId+' DESTROYED':'SPLASH';}
  }catch(e){sim.fail(e.message||'ACTION_UPDATE_FAILED');clear();clearFlight();}
 }
 function updateInner(s){
  if(disposed)return;tick(s);if(sim.invalid){$('a-feedback').textContent='RESET VOYAGE — '+sim.reason;return;}fx.update(sim.time,G.innerHeight||720);
  targetMeshes.forEach((g,i)=>{const t=sim.targets[i],c=sim.center(t),age=t.hit?sim.time-t.hitAt:0;g.position.set(c.x,c.y-Math.max(0,age-1)*3,c.z);g.rotation.z=t.hit?Math.min(.9,age*.35):Math.sin(sim.time*.8+i)*.025;g.visible=!t.hit||age<4;});
  const t=target();marker.position.set(t.x,H.water(t.x,t.z,sim.time)+.15,t.z);marker.visible=manualPoint!==null||!sim.targets[selected].hit;
  const active=new Set(sim.shells.map(s=>s.id));for(const[id,o]of rounds)if(!active.has(id)){disposeRound(o);rounds.delete(id);}
  for(const q of sim.shells){if(!rounds.has(q.id)){const mesh=new T.Mesh(shotGeometry,shotMat),line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),lineMat);H.scene.add(mesh,line);rounds.set(q.id,{mesh,line});}const o=rounds.get(q.id);o.mesh.position.copy(q.p);const p=o.line.geometry.attributes.position;p.setXYZ(0,q.p.x,q.p.y,q.p.z);p.setXYZ(1,q.p.x-q.v.x*.14,q.p.y-q.v.y*.14,q.p.z-q.v.z*.14);p.needsUpdate=true;o.line.geometry.computeBoundingSphere();}
  H.controls.enabled=mode==='orbit';
  if(mode!=='orbit'){
   H.root.updateMatrixWorld(true);const portrait=G.innerWidth<G.innerHeight,local=mode==='gun'?[14,27,24]:portrait?[-200,110,15]:[-165,85,30];
   const destination=new T.Vector3(...local).applyMatrix4(H.root.matrixWorld),look=mode==='gun'?new T.Vector3(t.x,t.y,t.z):new T.Vector3(85,7,0).applyMatrix4(H.root.matrixWorld).lerp(new T.Vector3(t.x,t.y,t.z),.22);
   const fov=mode==='gun'?60:portrait?64:58;if(H.camera.fov!==fov){H.camera.fov=fov;H.camera.updateProjectionMatrix();}
   // Time-based low-pass follows the ship, never the projectile.
   const delta=camReady?Math.max(0,Math.min(.1,s.time-(update.cameraTime??s.time))):0;
   if(!camReady){followPosition.copy(destination);camReady=true;}else followPosition.lerp(destination,1-Math.exp(-7*delta));H.camera.position.copy(followPosition);update.cameraTime=s.time;
   H.camera.lookAt(look);H.camera.clearViewOffset();
  }
  H.camera.updateMatrixWorld(true);const screen=new T.Vector3(t.x,t.y,t.z).project(H.camera),cross=$('a-crosshair');cross.hidden=Math.abs(screen.x)>1||Math.abs(screen.y)>.9||screen.z>1;cross.style.left=((screen.x+1)*50)+'%';cross.style.top=((1-screen.y)*50)+'%';cross.dataset.ready=String(inArc&&aligned());
  const cooldown=Math.max(0,sim.coolUntil-sim.time);$('a-fire').disabled=s.paused||sim.invalid||document.hidden||sim.targets.every(t=>t.hit);$('a-reload').textContent=cooldown>.01?cooldown.toFixed(1)+'s':inArc?(aligned()?'READY':'ALIGNING'):'TURN SHIP';
  $('a-pause').hidden=!s.paused;$('a-camera').textContent=mode==='gun'?'Gun view':mode==='orbit'?'Free camera':'Chase';$('a-sound').textContent=soundOn?'Sound on':'Sound off';$('a-sound').setAttribute('aria-pressed',String(soundOn));$('a-assist').setAttribute('aria-pressed',String(assist));$('a-assist').textContent=assist?'ASSIST ON':'MANUAL';
  $('a-speed').textContent=s.speedKnots.toFixed(1)+' kn';$('a-power').textContent=!s.engine?'W / ▲ TO START':(s.gear<0?'ASTERN ':s.gear>0?'AHEAD ':'NEUTRAL ')+Math.round((s.port+s.starboard)*50)+'%';$('a-score').textContent=sim.hits+' / 3 TARGETS';$('a-aim-label').textContent=manualPoint?'AIM POINT':('TARGET '+(selected+1));
  const message=sim.invalid?'RESET VOYAGE — '+sim.reason:s.paused?'Paused · P / Resume':!inArc?'TURN SHIP TOWARD TARGET':notice;
  if($('a-feedback').textContent!==message)$('a-feedback').textContent=message;
  if(document.activeElement!==$('a-bearing'))$('a-bearing').value=bearing;if(document.activeElement!==$('a-elevation'))$('a-elevation').value=elevation;
 }
 function update(s){try{if(!sim.valid(s)){tick(s);return;}updateInner(s);}catch(e){sim.fail(e.message||'ACTION_RENDER_FAILED');clear();clearFlight();$('a-feedback').textContent='RESET VOYAGE — '+sim.reason;}}
 function dispose(){if(disposed)return;disposed=true;clear();cleanups.forEach(f=>f());clearFlight();fx.dispose();old.visible=priorVisible;for(const obj of[battery.root,targets]){obj.removeFromParent();obj.traverse(o=>{o.geometry?.dispose();if(o.material)[].concat(o.material).forEach(m=>m.dispose());});}shotGeometry.dispose();shotMat.dispose();lineMat.dispose();panel.remove();document.body.classList.remove('action-helm');G.removeEventListener('blur',blur);G.removeEventListener('resize',resized);document.removeEventListener('visibilitychange',blur);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);H.controls.enabled=true;audio?.close().catch(()=>{});delete G.ATLAS_W_RANGE;}
 const inspect=()=>({version:'atlas-w-action-helm-3',mode,assist,manualPoint,requested:{bearing,elevation},actual:{bearing:actualBearing,elevation:actualElevation},inArc,aligned:aligned(),held:[...inputs.tokens.values()],session:sim.inspect(),recoil:recoil.map(r=>({...r})),effects:fx.inspect(),roundMeshes:rounds.size,realWeaponCalibration:false});
 G.ATLAS_W_RANGE={inspect};return {beforeStep,tick,update,clear,inspect,dispose};
}
const api={makeBattery,aimFor,install};G.AtlasGunnery=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
