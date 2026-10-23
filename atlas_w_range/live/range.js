/* ATLAS-W game range. Visual realism, not real-weapon calibration. */
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
function install(T,H){
 if(!H.root||!H.scene||!H.camera||typeof H.read!=='function')throw Error('RANGE_HOST_INVALID');
 const old=H.root.getObjectByName('EX_StaticDeckMount');if(!old)throw Error('ORIGINAL_MOUNT_NOT_FOUND');
 if(H.root.getObjectByName('ATLAS_W_HEAVY_BATTERY'))throw Error('RANGE_ALREADY_INSTALLED');
 const oldVisible=old.visible;old.visible=false;
 const battery=makeBattery(T);H.root.add(battery.root);
 const L=G.AtlasFlight,sim=new L.FlightWorld(H.water||(()=>0)),$=id=>document.getElementById(id);
 let open=false,disposed=false,bearing=0,elevation=18,actualBearing=0,actualElevation=18,selected=1,follow=false,soundOn=false,audio=null,lastShot=-Infinity,notice='',wasEnabled=true;
 let lastEpoch=null,lastTime=0;const recoil=[{x:0,v:0},{x:0,v:0}],rounds=new Map(),effects=[],seen=new Set();
 const targetRoot=new T.Group();targetRoot.name='ATLAS_FLOATING_GAME_TARGETS';H.scene.add(targetRoot);targetRoot.visible=false;
 const targetMeshes=[];
 const targetMat=new T.MeshStandardMaterial({color:0xc75c35,roughness:.7}),ringMat=new T.MeshStandardMaterial({color:0xf4dba3,roughness:.6}),floatMat=new T.MeshStandardMaterial({color:0x223d47,roughness:.8});
 for(let i=0;i<3;i++){
  const group=new T.Group();const orb=new T.Mesh(new T.SphereGeometry(5.8,16,12),targetMat);group.add(orb);
  for(const r of [2.1,4.1]){const ring=new T.Mesh(new T.TorusGeometry(r,.22,5,32),ringMat);ring.position.z=Math.sqrt(5.8*5.8-r*r)+.04;group.add(ring);}
  const base=new T.Mesh(new T.CylinderGeometry(7.5,8,.8,16),floatMat);base.position.y=-5.8;group.add(base);targetRoot.add(group);targetMeshes.push(group);
 }
 const selectedRing=new T.Mesh(new T.TorusGeometry(10,.24,5,32),new T.MeshBasicMaterial({color:0xe8ce89}));selectedRing.rotation.x=-Math.PI/2;targetRoot.add(selectedRing);
 const launch=document.createElement('button');launch.id='g-open';launch.textContent='Heavy guns · live test';launch.setAttribute('aria-controls','g-panel');launch.setAttribute('aria-expanded','false');document.body.append(launch);
 const panel=document.createElement('section');panel.id='g-panel';panel.hidden=true;panel.setAttribute('aria-label','ATLAS-W game target practice');
 panel.innerHTML='<div class="g-top"><div><div class="g-tag">ATLAS-W / PHYSICS PREVIEW</div><strong>HEAVY TWIN BATTERY</strong></div><button id="g-close" aria-label="Return to sailing">×</button></div><div class="g-aim"><label for="g-bearing">TRAVERSE <output id="g-bearing-value">Center</output><input id="g-bearing" type="range" min="-60" max="60" value="0" step="1"></label><label for="g-elevation">ELEVATION <output id="g-elevation-value">18°</output><input id="g-elevation" type="range" min="5" max="55" value="18" step="1"></label></div><div class="g-actions"><button id="g-target">Next target</button><button id="g-fire">FIRE SALVO</button><button id="g-reset">New targets</button></div><div class="g-options"><button id="g-follow" aria-pressed="false">Follow shot: off</button><button id="g-sound" aria-pressed="false">Sound: off</button><button id="g-resume">Resume</button></div><div class="g-foot"><span id="g-status" role="status" aria-live="polite">Ready</span><span id="g-score">Hits 0 / 3</span></div><small class="g-help">Aim with traverse and elevation. Shots fall under gravity; targets score only on collision. Preview—not calibrated naval ballistics.</small>';
 document.body.append(panel);
 const disposeMesh=p=>{p.removeFromParent();p.geometry?.dispose();if(p.material)[].concat(p.material).forEach(m=>m.dispose());};
 function clearFX(){for(const obj of rounds.values()){disposeMesh(obj.mesh);disposeMesh(obj.trail);}rounds.clear();while(effects.length)disposeMesh(effects.pop().mesh);seen.clear();battery.flashes.forEach(f=>f.visible=false);recoil.forEach(r=>{r.x=r.v=0;});battery.barrels.forEach(b=>b.position.x=0);}
 function reset(s){if(!sim.reset(s))return false;clearFX();lastEpoch=s.epoch;lastTime=s.time;lastShot=-Infinity;selected=1;bearing=0;elevation=18;actualBearing=0;actualElevation=18;notice='Fresh targets · elevation changes the flight';return true;}
 function nextTarget(){const s=H.read();const t=sim.targets[selected];if(!t)return;const x=s.x+39*Math.cos(s.heading),z=s.z+39*Math.sin(s.heading),a=Math.atan2(t.z-z,t.x-x)-s.heading;bearing=L.clamp(Math.atan2(Math.sin(a),Math.cos(a))*180/Math.PI,-60,60);notice='Target '+t.id+' selected · adjust elevation manually';}
 function sync(s){
  $('g-bearing').value=bearing;$('g-elevation').value=elevation;
  $('g-bearing-value').textContent=Math.round(actualBearing)+'°';$('g-elevation-value').textContent=Math.round(actualElevation)+'°';
  const cooldown=Math.max(0,sim.coolUntil-sim.time),complete=sim.targets.length===3&&sim.targets.every(t=>t.hit);
  $('g-fire').disabled=s.paused||document.hidden||sim.invalid||cooldown>1e-8||complete||sim.shells.length+2>L.P.maxShells;
  $('g-fire').textContent=s.paused?'PAUSED':complete?'COMPLETE':cooldown>1e-8?'RELOAD '+cooldown.toFixed(1)+'s':'FIRE SALVO';
  $('g-resume').hidden=!s.paused;$('g-score').textContent='Hits '+sim.hits+' / 3 · Salvos '+sim.shots;
  const message=sim.invalid?'Reset voyage: '+sim.reason:s.paused?'Paused — tap Resume':complete?'Range cleared. New targets?':notice||'Ready · projectiles use gravity and drag';
  if($('g-status').textContent!==message)$('g-status').textContent=message;
 }
 function setOpen(value){
  if(disposed)return;open=!!value;panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));targetRoot.visible=open;document.body.classList.toggle('range-active',open);H.clearInputs();
  if(open){document.querySelectorAll('.panel').forEach(p=>p.hidden=true);document.body.classList.remove('sheet-open');wasEnabled=H.controls.enabled;H.controls.enabled=false;nextTarget();}
  else{sim.cancel();clearFX();H.controls.enabled=wasEnabled;H.restoreView();}sync(H.read());
 }
 function enableAudio(){try{const C=G.AudioContext||G.webkitAudioContext;if(!C)throw Error('Unavailable');audio=audio||new C();audio.resume().catch(()=>{});return true;}catch(_){notice='Sound unavailable in this browser';return false;}}
 function boom(){if(!soundOn||!audio||audio.state!=='running')return;const t=audio.currentTime,gain=audio.createGain();gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.5);gain.connect(audio.destination);const osc=audio.createOscillator();osc.frequency.setValueAtTime(90,t);osc.frequency.exponentialRampToValueAtTime(32,t+.4);osc.connect(gain);osc.start(t);osc.stop(t+.52);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 function effect(p,kind,born,index=0){
  const water=kind==='water',smoke=kind==='smoke',geo=water?new T.TorusGeometry(2,.32,5,24):new T.SphereGeometry(smoke?.8:1.2,8,6);
  const mat=new T.MeshBasicMaterial({color:water?0xe7f2eb:smoke?0x9ca5a2:0xffcc7b,transparent:true,opacity:smoke?.45:.8,depthWrite:false});const mesh=new T.Mesh(geo,mat);mesh.position.set(p.x,p.y,p.z);if(water)mesh.rotation.x=-Math.PI/2;H.scene.add(mesh);effects.push({mesh,kind,born,p:{...p},index});
  while(effects.length>40)disposeMesh(effects.shift().mesh);
 }
 function fire(){
  if(!open||disposed||document.hidden)return;const s=H.read();update(s);if(s.paused||sim.invalid)return;
  H.root.updateMatrixWorld(true);const origins=battery.muzzles.map(m=>{const v=m.getWorldPosition(new T.Vector3());return {x:v.x,y:v.y,z:v.z};});
  const direction=new T.Vector3(1,0,0).applyQuaternion(battery.elevation.getWorldQuaternion(new T.Quaternion())).normalize();
  const result=sim.fire(s,origins,{x:direction.x,y:direction.y,z:direction.z},L.carriedVelocity(s,origins[0]));
  if(result.valid){lastShot=sim.time;recoil.forEach(r=>r.v-=8);notice='Salvo in flight · actual muzzle direction';origins.forEach((p,i)=>effect(p,'smoke',sim.time,i));boom();}else notice=result.reason;
  sync(s);
 }
 launch.onclick=()=>setOpen(true);$('g-close').onclick=()=>setOpen(false);$('g-fire').onclick=fire;
 $('g-bearing').oninput=e=>{const v=Number(e.target.value);if(Number.isFinite(v))bearing=L.clamp(v,-60,60);sync(H.read());};
 $('g-elevation').oninput=e=>{const v=Number(e.target.value);if(Number.isFinite(v))elevation=L.clamp(v,5,55);sync(H.read());};
 $('g-target').onclick=()=>{for(let i=0;i<3;i++){selected=(selected+1)%3;if(!sim.targets[selected].hit)break;}nextTarget();sync(H.read());};
 $('g-reset').onclick=()=>{const s=H.read();if(!s.paused){reset(s);nextTarget();}sync(s);};
 $('g-follow').onclick=()=>{follow=!follow;$('g-follow').textContent='Follow shot: '+(follow?'on':'off');$('g-follow').setAttribute('aria-pressed',String(follow));};
 $('g-sound').onclick=()=>{soundOn=!soundOn&&enableAudio();$('g-sound').textContent='Sound: '+(soundOn?'on':'off');$('g-sound').setAttribute('aria-pressed',String(soundOn));};
 $('g-resume').onclick=()=>{if(H.read().paused)$('pause').click();};
 const onSwitch=()=>{if(open)setOpen(false);},onKey=e=>{if(e.code==='Escape'&&open)setOpen(false);if(e.code==='KeyF'&&open&&!e.repeat&&!/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName||'')){e.preventDefault();fire();}};
 document.querySelector('.brand').addEventListener('click',onSwitch,true);G.addEventListener('keydown',onKey);
 reset(H.read());
 function updateInner(s){
  if(disposed)return;
  if(!sim.valid(s)){sim.fail('INVALID_HOST');clearFX();sync({paused:true});return;}
  if(s.epoch!==lastEpoch)reset(s);
  const result=sim.observe(s);if(!result.valid){clearFX();sync(s);return;}
  const dt=Math.max(0,Math.min(.25,s.time-lastTime));lastTime=s.time;
  const approach=(a,b,max)=>a+L.clamp(b-a,-max,max);actualBearing=approach(actualBearing,bearing,40*dt);actualElevation=approach(actualElevation,elevation,25*dt);
  battery.turret.rotation.y=-actualBearing*Math.PI/180;battery.elevation.rotation.z=actualElevation*Math.PI/180;
  for(let left=dt;left>1e-8;left-=1/120){const h=Math.min(left,1/120);for(const r of recoil){r.v+=(-180*r.x-24*r.v)*h;r.x+=r.v*h;}}
  battery.barrels.forEach((b,i)=>b.position.x=recoil[i].x);battery.flashes.forEach(f=>f.visible=open&&sim.time-lastShot<.11);
  if(open){
   targetMeshes.forEach((g,i)=>{const t=sim.targets[i],c=sim.center(t);g.position.set(c.x,c.y,c.z);g.lookAt(s.x,c.y,s.z);if(t.hit){const a=Math.min(1,Math.max(0,(sim.time-t.hitAt)/1.1));g.scale.setScalar(Math.max(.05,1-a));g.position.y-=a*8;g.visible=a<1;}else{g.visible=true;g.scale.setScalar(1);}});
   const target=sim.targets[selected],tc=sim.center(target);selectedRing.position.set(tc.x,tc.y-5.5,tc.z);selectedRing.visible=!target.hit;
   H.root.updateMatrixWorld(true);let cp=new T.Vector3(21,27,24).applyMatrix4(H.root.matrixWorld),look=new T.Vector3(tc.x,tc.y,tc.z);
   if(follow&&sim.shells.length){const shot=sim.shells[0];cp.set(shot.p.x-20,shot.p.y+12,shot.p.z+25);look.set(shot.p.x+8,shot.p.y,shot.p.z);}
   const a=Math.max(0,sim.time-lastShot);if(a<.6){const shake=.12*Math.exp(-8*a);cp.y+=Math.sin(a*90)*shake;}
   H.camera.position.copy(cp);H.camera.lookAt(look);H.camera.clearViewOffset();
   const w=G.innerWidth,h=G.innerHeight,b=panel.getBoundingClientRect();if(w>h&&h<=600)H.camera.setViewOffset(w,h,Math.round((w-b.x)/2),0,w,h);else H.camera.setViewOffset(w,h,0,Math.round((h-b.top-90)/2),w,h);
  }
  const active=new Set(sim.shells.map(s=>s.id));
  for(const [id,o] of rounds){if(!active.has(id)){disposeMesh(o.mesh);disposeMesh(o.trail);rounds.delete(id);}}
  for(const shot of sim.shells){
   if(!rounds.has(shot.id)){const mesh=new T.Mesh(new T.SphereGeometry(.55,8,6),new T.MeshBasicMaterial({color:0xffe6ad}));const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const trail=new T.Line(geo,new T.LineBasicMaterial({color:0xffb86d,transparent:true,opacity:.65}));H.scene.add(mesh,trail);rounds.set(shot.id,{mesh,trail});}
   const o=rounds.get(shot.id);o.mesh.position.set(shot.p.x,shot.p.y,shot.p.z);const a=o.trail.geometry.attributes.position;a.setXYZ(0,shot.p.x,shot.p.y,shot.p.z);a.setXYZ(1,shot.p.x-shot.v.x*.09,shot.p.y-shot.v.y*.09,shot.p.z-shot.v.z*.09);a.needsUpdate=true;o.trail.geometry.computeBoundingSphere();o.mesh.visible=o.trail.visible=open;
  }
  for(const impact of sim.impacts){if(seen.has(impact.id))continue;seen.add(impact.id);if(seen.size>64)seen.delete(seen.values().next().value);notice=impact.kind==='target'?'HIT · Target '+impact.targetId:'Water impact · adjust elevation';effect(impact.p,impact.kind,impact.time);if(impact.kind==='water')for(let i=0;i<5;i++)effect(impact.p,'spray',impact.time,i);}
  for(let i=effects.length-1;i>=0;i--){const f=effects[i],a=Math.max(0,sim.time-f.born),life=f.kind==='smoke'?1.6:1.2;if(a>life){disposeMesh(f.mesh);effects.splice(i,1);continue;}f.mesh.visible=open;f.mesh.material.opacity=(1-a/life)*(f.kind==='smoke'?.45:.8);f.mesh.scale.setScalar(f.kind==='water'?1+a*8:1+a*(f.kind==='smoke'?3:2));if(f.kind==='smoke')f.mesh.position.set(f.p.x-a*2,f.p.y+a*4,f.p.z+Math.sin(f.index)*a);if(f.kind==='spray'){const angle=f.index*2.4;f.mesh.scale.setScalar(.5+a*.4);f.mesh.position.set(f.p.x+Math.cos(angle)*a*4,f.p.y+8*a-4.9*a*a,f.p.z+Math.sin(angle)*a*4);}}
  sync(s);
 }
 function update(s){try{return updateInner(s);}catch(e){sim.fail(e.message||'RANGE_UPDATE_FAILED');clearFX();sync(s||{paused:true});}}
 const api={update,inspect:()=>({version:'atlas-w-flight-preview-2',open,requested:{bearing,elevation},actual:{bearing:actualBearing,elevation:actualElevation},follow,soundOn,battery:battery.root.userData,originalMountHidden:!old.visible,session:sim.inspect(),visualProjectileCount:rounds.size,effects:effects.length,recoil:recoil.map(x=>({...x})),realWeaponCalibration:false}),dispose(){if(disposed)return;setOpen(false);disposed=true;old.visible=oldVisible;for(const obj of [battery.root,targetRoot]){obj.removeFromParent();obj.traverse(o=>{o.geometry?.dispose();if(o.material)[].concat(o.material).forEach(m=>m.dispose());});}launch.remove();panel.remove();document.querySelector('.brand').removeEventListener('click',onSwitch,true);G.removeEventListener('keydown',onKey);if(audio)audio.close().catch(()=>{});if(G.ATLAS_W_RANGE?.inspect===api.inspect)delete G.ATLAS_W_RANGE;}};
 G.ATLAS_W_RANGE={inspect:api.inspect};if(new URLSearchParams(G.location?.search||'').get('range')==='1')setOpen(true);return api;
}
const api={makeBattery,install};G.AtlasGunnery=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
