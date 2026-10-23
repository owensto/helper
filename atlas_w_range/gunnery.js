/* ATLAS-W heavy battery: fictional arcade target practice; not a weapon simulator. */
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
 if(!H.root||!H.scene||typeof H.read!=='function')throw Error('RANGE_HOST_INVALID');
 const old=H.root.getObjectByName('EX_StaticDeckMount');if(!old)throw Error('ORIGINAL_MOUNT_NOT_FOUND');
 const oldVisible=old.visible;old.visible=false;const battery=makeBattery(T);H.root.add(battery.root);
 const L=G.AtlasRangeLogic,session=new L.RangeSession(),$=id=>document.getElementById(id);
 let open=false,bearing=0,reach=300,selected=1,renderedShot=0,resultId=0,projectiles=[],lastEpoch=null,resetCount=0,lastNotice='',disposed=false;
 const range=new T.Group();range.name='ARCADE_FLOATING_TARGET_RANGE';H.scene.add(range);range.visible=false;
 const targetMeshes=[];
 const targetMaterial=new T.MeshStandardMaterial({color:0xdd663f,roughness:.7}),rimMat=new T.MeshStandardMaterial({color:0xf5dcab,roughness:.65}),baseMat=new T.MeshStandardMaterial({color:0x31464d,roughness:.8});
 for(let i=0;i<3;i++){
  const g=new T.Group(),float=new T.Mesh(new T.CylinderGeometry(7,8,1.1,16),baseMat);float.position.y=-.9;g.add(float);
  const board=new T.Mesh(new T.CylinderGeometry(6,6,.55,24),targetMaterial);board.rotation.x=Math.PI/2;board.position.y=7;g.add(board);
  for(const r of [2.2,4.4]){const ring=new T.Mesh(new T.TorusGeometry(r,.25,5,32),rimMat);ring.position.set(0,7,.35);g.add(ring);}
  const center=new T.Mesh(new T.SphereGeometry(.7,10,6),rimMat);center.position.set(0,7,.4);g.add(center);range.add(g);targetMeshes.push(g);
 }
 const reticle=new T.Mesh(new T.TorusGeometry(9,.28,6,40),new T.MeshBasicMaterial({color:0xeacb7c,depthTest:false}));reticle.rotation.x=-Math.PI/2;range.add(reticle);
 const splash=new T.Mesh(new T.TorusGeometry(5,.65,5,32),new T.MeshBasicMaterial({color:0xdcece7,transparent:true,opacity:.7,depthWrite:false}));splash.rotation.x=-Math.PI/2;splash.visible=false;H.scene.add(splash);
 const launch=document.createElement('button');launch.id='g-open';launch.textContent='Heavy guns · target range';launch.setAttribute('aria-controls','g-panel');launch.setAttribute('aria-expanded','false');document.body.append(launch);
 const panel=document.createElement('section');panel.id='g-panel';panel.hidden=true;panel.setAttribute('aria-label','Fictional heavy battery target practice');panel.innerHTML='<div class="g-top"><div><div class="g-tag">ATLAS-W / ARCADE PRACTICE</div><strong>HEAVY TWIN BATTERY</strong></div><button id="g-close" aria-label="Close gun controls">×</button></div><div class="g-aim"><label for="g-bearing">AIM <output id="g-bearing-value">Center</output><input id="g-bearing" type="range" min="-60" max="60" value="0" step="1"></label><label for="g-reach">SHOT REACH <output id="g-reach-value">300</output><input id="g-reach" type="range" min="160" max="470" value="300" step="5"></label></div><div class="g-actions"><button id="g-target">Next target</button><button id="g-fire">FIRE SALVO</button><button id="g-reset">New targets</button></div><div class="g-foot"><span id="g-status" role="status" aria-live="polite">Ready</span><span id="g-score">Hits 0 / 3 · Salvos 0</span></div>';document.body.append(panel);
 function clearEffects(){for(const p of projectiles){H.scene.remove(p);p.geometry.dispose();p.material.dispose();}projectiles=[];battery.flashes.forEach(f=>f.visible=false);splash.visible=false;renderedShot=0;resultId=0;}
 function initialize(s){session.reset(s);clearEffects();selected=1;bearing=0;reach=300;resetCount++;lastEpoch=s.epoch;}
 function muzzle(){H.root.updateMatrixWorld(true);return battery.muzzles[0].getWorldPosition(new T.Vector3());}
 function aim(s){const o={x:s.x+39*Math.cos(s.heading),z:s.z+39*Math.sin(s.heading)};return L.point(o,s.heading,bearing*Math.PI/180,reach);}
 function snapTarget(index){const s=H.read();session.observe(s);const t=session.targets[index];if(!t)return;const x=s.x+39*Math.cos(s.heading),z=s.z+39*Math.sin(s.heading),a=Math.atan2(t.z-z,t.x-x)-s.heading;bearing=L.clamp(Math.atan2(Math.sin(a),Math.cos(a))*180/Math.PI,-60,60);reach=L.clamp(Math.hypot(t.x-x,t.z-z),160,470);selected=index;}
 function sync(s){$('g-bearing').value=bearing;$('g-reach').value=reach;$('g-bearing-value').textContent=Math.abs(bearing)<.5?'Center':Math.round(Math.abs(bearing))+'° '+(bearing<0?'port':'stbd');$('g-reach-value').textContent=Math.round(reach);const complete=session.targets.every(t=>t.hit),cool=s.time<session.coolUntil;const blocked=s.paused||document.hidden||session.invalid||!!session.pending||cool||complete;$('g-fire').disabled=blocked;$('g-fire').textContent=s.paused?'PAUSED':complete?'COMPLETE':session.pending||cool?'RELOADING':'FIRE SALVO';$('g-score').textContent='Hits '+session.hits+' / 3 · Salvos '+session.shots;const text=s.paused?'Paused — use Resume above':session.invalid?'Reset voyage to reacquire':complete?'Range cleared. New targets?':session.pending?'Salvo in flight…':cool?'Reloading…':lastNotice||'Ready · tap Next target to aim';if($('g-status').textContent!==text)$('g-status').textContent=text;}
 function setOpen(value){const s=H.read();open=value;launch.setAttribute('aria-expanded',String(open));panel.hidden=!open;range.visible=open;document.body.classList.toggle('range-active',open);H.clearInputs();if(open){document.querySelectorAll('.panel').forEach(p=>p.hidden=true);document.body.classList.remove('sheet-open');H.controls.enabled=false;snapTarget(selected);}else{session.cancel();clearEffects();H.controls.enabled=true;H.restoreView();}sync(s);}
 launch.onclick=()=>setOpen(true);$('g-close').onclick=()=>setOpen(false);
 $('g-bearing').oninput=e=>{if(!H.read().paused)bearing=Number(e.target.value);sync(H.read());};$('g-reach').oninput=e=>{if(!H.read().paused)reach=Number(e.target.value);sync(H.read());};
 $('g-target').onclick=()=>{if(H.read().paused)return;let next=(selected+1)%3;for(let i=0;i<3&&session.targets[next]?.hit;i++)next=(next+1)%3;snapTarget(next);lastNotice='Target '+(next+1)+' selected';sync(H.read());};
 $('g-reset').onclick=()=>{const s=H.read();if(s.paused)return;initialize(s);snapTarget(1);lastNotice='New floating targets';sync(s);};
 $('g-fire').onclick=()=>{if(!open||document.hidden)return;const s=H.read();update(s);const v=muzzle(),a=aim(s),r=session.fire(s,{x:v.x,y:v.y,z:v.z},a);lastNotice=r.valid?'':r.reason;sync(s);};
 const onModal=()=>{if(open)setOpen(false);};document.querySelector('.brand').addEventListener('click',onModal,true);
 const onEscape=e=>{if(e.code==='Escape'&&open)setOpen(false);};window.addEventListener('keydown',onEscape);
 initialize(H.read());
 function update(s){
  if(disposed)return;
  if(s.epoch!==lastEpoch)initialize(s);
  const valid=session.observe(s);if(!valid.valid){clearEffects();sync(s);return;}
  battery.turret.rotation.y=-bearing*Math.PI/180;battery.elevation.rotation.z=.10+(reach-160)/310*.14;
  const shot=session.pending;
  const age=shot?s.time-shot.born:Infinity;const kick=age<.6?Math.sin(Math.min(age/.6,1)*Math.PI)*.8:0;battery.barrels.forEach(b=>b.position.x=-kick);battery.flashes.forEach(f=>f.visible=!!shot&&age<.13);
  if(open){
   const a=aim(s);reticle.position.set(a.x,.65,a.z);
   for(let i=0;i<targetMeshes.length;i++){const t=session.targets[i],g=targetMeshes[i];g.position.set(t.x,t.hit?-15:1.5,t.z);g.lookAt(s.x,1.5,s.z);g.visible=!t.hit;}
   // Deliberately composed game camera: not a real gunner sight or firing solution.
   H.root.updateMatrixWorld(true);H.camera.position.copy(new T.Vector3(21,24,23).applyMatrix4(H.root.matrixWorld));H.camera.lookAt(new T.Vector3(a.x,7,a.z));H.camera.clearViewOffset();
   const w=innerWidth,h=innerHeight,b=panel.getBoundingClientRect();if(w>h&&h<=600)H.camera.setViewOffset(w,h,Math.round((w-b.x)/2),0,w,h);else H.camera.setViewOffset(w,h,0,Math.round((h-b.top-90)/2),w,h);
  }
  if(shot&&shot.id!==renderedShot){clearEffects();renderedShot=shot.id;for(let i=0;i<2;i++){const p=new T.Mesh(new T.SphereGeometry(.65,8,6),new T.MeshBasicMaterial({color:0xffe5ac}));H.scene.add(p);projectiles.push(p);}}
  if(shot){const q=L.arc(shot.start,shot.end,(s.time-shot.born)/shot.duration);projectiles.forEach((p,i)=>p.position.set(q.x,q.y,q.z+(i?1.3:-1.3)));}
  else if(projectiles.length){for(const p of projectiles){H.scene.remove(p);p.geometry.dispose();p.material.dispose();}projectiles=[];}
  const hit=session.lastResult;if(hit&&hit.id!==resultId){resultId=hit.id;lastNotice=hit.hit?'HIT · Target '+hit.targetId:'Splash · adjust aim';splash.position.set(hit.end.x,.7,hit.end.z);}
  if(hit){const t=s.time-hit.time;splash.visible=t<1.1&&open;splash.scale.setScalar(1+t*5);splash.material.opacity=Math.max(0,.8-t*.7);}
  sync(s);
 }
 const api={update,inspect:()=>({version:'fictional-heavy-twin-1',open,bearing,reach,selected,battery:battery.root.userData,originalMountHidden:!old.visible,session:session.inspect(),resetCount,visualProjectileCount:projectiles.length,realBallistics:false}),dispose(){if(disposed)return;setOpen(false);disposed=true;old.visible=oldVisible;for(const group of [battery.root,range,splash]){group.removeFromParent();group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});}launch.remove();panel.remove();document.querySelector('.brand').removeEventListener('click',onModal,true);window.removeEventListener('keydown',onEscape);}};
 G.ATLAS_W_RANGE={inspect:api.inspect};return api;
}
const api={makeBattery,install};G.AtlasGunnery=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
