/* Beaufort Harbor4 integration. Uses the owner's frame, water, depth and collider APIs. */
(()=>{'use strict';let timer=null,stopped=false;const until=performance.now()+120000;
function install(){if(stopped)return;if(!window.ATLAS_GAME3?.ready||!SEA14_COAST.inspect().ready){if(performance.now()<until)timer=setTimeout(install,120);return;}if(window.ATLAS_HARBOR4)return;
const A=BAYPLAY,S=A.state,T=ATLASRuntime,C=AtlasHarborCore,D=document,$=id=>D.getElementById(id),app=$('helm09'),canvas=$('scene'),off=new AbortController();
const local=()=>!stopped&&SEA09.bus.mode==='local',listen=(n,t,f,capture=false)=>n.addEventListener(t,f,{capture,signal:off.signal});
const env={get tide(){return S.location==='beaufort'?S.config.tide||0:0;},sample:(x,z,l)=>Sea09World.sample(x,z,l),obstacles:p=>Sea14Physics.nearbyObstacles({...p,heave:0,config:{...S.config,tide:env.tide}})};
const book=new C.RecoveryBook(),pod=new C.Pod(env),models=[],ripples=[],wildGroup=new T.Group();wildGroup.name='H4_DOLPHINS';A.scene.add(wildGroup);
let disposed=false,wildlife=true,lastRig='',noticeAge=0;try{wildlife=localStorage.getItem('atlas-h4-wildlife')!=='off';}catch(_){}
function element(tag,text,cls){const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
const note=element('div','','h4-note');note.hidden=true;note.setAttribute('role','status');app.append(note);
function say(t){note.textContent=t;note.hidden=false;noticeAge=performance.now();}
const viewbar=element('nav','','h4-views');viewbar.id='h4-views';viewbar.setAttribute('aria-label','Camera view');app.append(viewbar);
function button(text,fn,parent=viewbar,id){const b=element('button',text);b.type='button';if(id)b.id=id;listen(b,'click',()=>{if(!local())return;fn();canvas.focus({preventScroll:true});});parent.append(b);return b;}
const first=button('1st',()=>camera.select('first'),viewbar,'h4-first'),third=button('3rd',()=>camera.select(camera.inspect().third),viewbar,'h4-third'),lock=button('Locked',()=>camera.lock(),viewbar,'h4-look');first.setAttribute('aria-label','First-person helm view');third.setAttribute('aria-label','Third-person boat view');
const freebar=element('section','','h4-freebar');freebar.hidden=true;freebar.id='h4-freebar';freebar.append(element('span','Free camera · boat paused · WASD move · E/Q up/down · drag to look'));button('Back to boat',()=>camera.select('chase'),freebar,'h4-return');app.append(freebar);
const nativeView=SEA09.view.bind(SEA09),camera=AtlasHarborCamera({app:A,nativeView,clearBoatKeys:()=>window.ATLAS_HELM_KEYS?.clear(),photo:()=>app.classList.contains('photo14'),blocked:()=>D.hidden||!$('helm09-panel').hidden,waterHeight:(x,z)=>(S.config.tide||0)+BayMotion.surface(x,z,S.elapsed,S.environment),changed(mode){app.classList.toggle('h4-free',mode==='free');$('helm09-pause').disabled=mode==='free';freebar.hidden=mode!=='free';first.setAttribute('aria-pressed',String(mode==='first'));third.setAttribute('aria-pressed',String(mode==='chase'||mode==='orbit'));lock.hidden=!['chase','orbit'].includes(mode);lock.textContent=mode==='orbit'?'Look around':'Locked';lock.setAttribute('aria-pressed',String(mode==='chase'));}},C,T);
const originalFocus=SEA14.visualFocus,focus4=()=>camera.focus()||originalFocus.call(SEA14);SEA14.visualFocus=focus4;
const pointers=new Map();let pinch=0;
function customLook(){return ['orbit','free'].includes(camera.inspect().mode);}
listen(canvas,'pointerdown',e=>{if(!customLook())return;e.preventDefault();e.stopImmediatePropagation();canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId);}catch(_){}if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}},true);
listen(canvas,'pointermove',e=>{if(!customLook())return;const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1)camera.drag(dx,dy);else if(pointers.size===2){const [a,b]=[...pointers.values()],q=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)camera.zoom((pinch-q)*3);pinch=q;}},true);
for(const kind of['pointerup','pointercancel','lostpointercapture'])listen(canvas,kind,e=>{if(!customLook())return;pointers.delete(e.pointerId);pinch=0;e.stopImmediatePropagation();},true);
listen(canvas,'wheel',e=>{if(['orbit','chase'].includes(camera.inspect().mode)){e.preventDefault();e.stopImmediatePropagation();camera.zoom(e.deltaY);}},true);
function editing(e){return e.ctrlKey||e.metaKey||e.altKey||e.isComposing||AtlasHelmInput.editing(e.target);}
listen(window,'keydown',e=>{if(editing(e)||!local()||!$('helm09-panel').hidden)return;
 if(!e.repeat&&['KeyV','Digit1','Digit3','KeyC'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='KeyV')camera.toggle();else if(e.code==='Digit1')camera.select('first');else if(e.code==='Digit3')camera.select(camera.inspect().third);else camera.lock();return;}
 if(camera.isFree()){if(e.code==='Escape'){camera.select('chase');e.preventDefault();e.stopImmediatePropagation();return;}if(camera.key(e.code,true)||['KeyF','KeyR','KeyN','KeyP','KeyZ'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}}
},true);
listen(window,'keyup',e=>{camera.key(e.code,false);},true);listen(window,'blur',()=>{pointers.clear();camera.clear();});listen(D,'visibilitychange',()=>{if(D.hidden){pointers.clear();camera.clear();}});
// Touch flight controls exist only in free-camera mode; do not operate the boat.
const flight=element('div','','h4-flight');for(const [label,code]of[['Forward','KeyW'],['Back','KeyS'],['Left','KeyA'],['Right','KeyD'],['Up','KeyE'],['Down','KeyQ']]){const b=element('button',label);b.type='button';listen(b,'pointerdown',e=>{if(!camera.isFree()||!local())return;e.preventDefault();b.setPointerCapture(e.pointerId);camera.key(code,true);});for(const k of['pointerup','pointercancel','lostpointercapture'])listen(b,k,()=>camera.key(code,false));flight.append(b);}freebar.append(flight);
function setWildlife(value){wildlife=!!value;wildGroup.visible=wildlife&&S.location==='beaufort';try{localStorage.setItem('atlas-h4-wildlife',wildlife?'on':'off');}catch(_){}return wildlife;}
function addDolphins(){pod.seed(S);const factory=AtlasDolphin(T);for(let i=models.length;i<pod.animals.length;i++){const m=factory.create();m.group.scale.setScalar(i===2?.89:1);wildGroup.add(m.group);models.push(m);const ring=new T.Mesh(new T.RingGeometry(.42,.54,40),new T.MeshBasicMaterial({color:0xb8d0cc,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;wildGroup.add(ring);ripples.push(ring);}}
// Decorative fittings are anchored to mapped pier collider centres, never arbitrary shoreline.
const fixtures=[];function dockDetails(){const data=SEA14_COAST.meta?.colliders||[],groups=new Map();for(const c of data)if(c.id.startsWith('pier:')){if(!groups.has(c.id))groups.set(c.id,[]);groups.get(c.id).push(c);}
 const steel=new T.MeshStandardMaterial({color:0x8b969a,metalness:.72,roughness:.36}),rubber=new T.MeshStandardMaterial({color:0x283133,roughness:.90});let total=0;
 for(const floating of[false,true]){const points=[];for(const list of groups.values())for(let i=0;i<list.length;i+=6){const c=list[i];if(!!c.tideRelative!==floating||total>=96)continue;const other=list[Math.min(list.length-1,i+1)],dx=(other.x0+other.x1-c.x0-c.x1)*.5,dz=(other.z0+other.z1-c.z0-c.z1)*.5,h=Math.atan2(dz,dx),w=Math.min(c.x1-c.x0,c.z1-c.z0)*.28;points.push({x:(c.x0+c.x1)/2-Math.sin(h)*w,z:(c.z0+c.z1)/2+Math.cos(h)*w,y:c.y1,h});total++;}
  if(!points.length)continue;const g=new T.Group();g.name='H4_DOCK_HARDWARE_'+(floating?'FLOATING':'FIXED');A.scene.add(g);fixtures.push(g);g.userData.tideRelative=floating;
  for(const [geo,material,part]of[[new T.BoxGeometry(.28,.035,.10),steel,'base'],[new T.CylinderGeometry(.023,.026,.09,8),steel,'post'],[new T.CylinderGeometry(.023,.023,.30,10),steel,'horn'],[new T.CylinderGeometry(.10,.10,.48,12),rubber,'fender']]){const mesh=new T.InstancedMesh(geo,material,points.length),o=new T.Object3D();points.forEach((p,i)=>{o.position.set(p.x,p.y+(part==='fender'?-.20:part==='horn'?.12:part==='post'?.075:.025),p.z);o.rotation.set(0,-p.h,part==='horn'?Math.PI/2:0);if(part==='fender'){o.position.x-=Math.sin(p.h)*.22;o.position.z+=Math.cos(p.h)*.22;}o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);}
 }
 return total;
}
const hardwareCount=dockDetails();
const priorPanel=SEA10.renderPanel;let panelScope=null;
const panel4=function(kind,body){panelScope?.abort();panelScope=new AbortController();const signal=panelScope.signal;
 const add=(text,fn)=>{const b=element('button',text,'h4-card');b.type='button';b.addEventListener('click',()=>{if(b.isConnected&&local())fn();},{signal});body.append(b);return b;};
 if(kind==='h4-camera'||kind==='g3-view'){$('helm09-title').textContent='View & graphics';body.append(element('p','V switches 1st / 3rd person. In third person, choose Locked or drag to Look around.','h4-subtitle'));
 for(const [t,m]of[['First person · at the helm','first'],['Third person · locked behind boat','chase'],['Third person · look around','orbit'],['Free camera · pause boat and explore','free']])add(t,()=>{$('helm09-close').click();camera.select(m);canvas.focus({preventScroll:true});});
 const row=element('label','Graphics','h4-field'),sel=element('select');for(const [v,t]of[['auto','Auto'],['smooth','Performance'],['detailed','Detailed']]){const n=element('option',t);n.value=v;sel.append(n);}sel.value=SEA14.options.graphics;sel.addEventListener('change',()=>SEA14.graphics(sel.value),{signal});row.append(sel);body.append(row);add(wildlife?'Dolphins: on':'Dolphins: off',()=>{setWildlife(!wildlife);SEA09.openPanel('h4-camera');});add('Back to Menu',()=>SEA09.openPanel('d2-menu'));return true;}
 const handled=priorPanel.call(this,kind,body);
 if(kind==='g3-boat'){add('Recover here · stay in Beaufort',()=>{SEA10.recover();});body.append(element('p','Recovery searches recently checked clear water nearby. It does not change regions.','h4-subtitle'));}
 if(kind==='g3-play')add(wildlife?'Dolphins enabled · watch the water':'Enable dolphins',()=>{setWildlife(true);$('helm09-close').click();say('Dolphins surface periodically in known, deeper water. They avoid shore structures and nearby boats.');});
 if(kind==='g3-help')body.append(element('p','Camera: V or 1 / 3 changes perspective; C changes third-person lock/look. Free camera pauses your boat, uses WASD + E/Q, and cannot operate fittings.','h4-subtitle'));
 return handled;
};
SEA10.renderPanel=panel4;
// User requested more available speed. A first untouched session selects the existing
// modeled 450 rig; explicit later rig selections are remembered. No force multiplier.
let preference=null;try{preference=localStorage.getItem('atlas-h4-rig');}catch(_){}
if(local()&&!AtlasDeviceCore.rigAllowed(S)){const key=AtlasDeviceCore.RIGS[preference]?preference:'single450';try{AtlasDeviceCore.applyRig({isLocal:local,read:()=>S,syncRig:()=>{CMD.syncRig();CMD.fill(S.config);A.refresh();}},key);}catch(e){say('Engine setup unchanged: '+e.message);}}
function tick(simDt,wallDt){if(!local()||D.hidden)return;book.observe(S,env);
 if(wildlife&&S.location==='beaufort'){addDolphins();pod.step(S,simDt);for(let i=0;i<models.length;i++){const d=pod.animals[i],m=models[i];m.group.visible=d.active&&C.wildlifeWater(d.x,d.z,env);const sea=(S.config.tide||0)+BayMotion.surface(d.x,d.z,S.elapsed,S.environment);m.group.position.set(d.x,sea-d.depth,d.z);m.group.rotation.set(d.roll,-d.heading,d.pitch||0,'YXZ');m.pose(d.stroke||0,d.speed);const ring=ripples[i],phase=(pod.elapsed+d.phase)%13;ring.visible=m.group.visible&&phase<4;ring.position.set(d.x,sea+.018,d.z);ring.scale.setScalar(.6+phase*.38);ring.material.opacity=phase<4?.12*Math.sin(Math.PI*phase/4):0;}}wildGroup.visible=wildlife&&S.location==='beaufort';
 for(const g of fixtures){g.visible=S.location==='beaufort';if(g.userData.tideRelative)g.position.y=S.config.tide||0;}
 viewbar.hidden=!$('helm09-panel').hidden||app.classList.contains('photo14')||camera.isFree();
 if(!note.hidden&&performance.now()-noticeAge>6500)note.hidden=true;
 const rig=Object.entries(AtlasDeviceCore.RIGS).find(([,v])=>v.hp===S.config.hp&&v.count===S.config.count)?.[0];if(rig&&rig!==lastRig){lastRig=rig;try{localStorage.setItem('atlas-h4-rig',rig);}catch(_){}}
}
function planRecovery(){return book.plan(S,env);}
window.ATLAS_HARBOR4={ready:true,version:4,camera,tick,planRecovery,setWildlife,notice:say,inspect:()=>({version:4,camera:camera.inspect(),recoveryAnchors:book.anchors.length,dolphins:models.length,dolphinEnabled:wildlife,dolphinPositions:pod.animals.map(d=>({x:d.x,z:d.z,depth:d.depth})),dockHardware:hardwareCount,defaultRig:'single450',browserVerified:false,photorealismVerified:false}),dispose(){if(disposed)return;disposed=true;stopped=true;off.abort();panelScope?.abort();camera.dispose();if(SEA10.renderPanel===panel4)SEA10.renderPanel=priorPanel;if(SEA14.visualFocus===focus4)SEA14.visualFocus=originalFocus;$('helm09-pause').disabled=false;models.forEach(m=>m.dispose());for(const g of [...fixtures,wildGroup]){g.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});g.removeFromParent();}for(const n of[note,viewbar,freebar])n.remove();app.classList.remove('harbor4','h4-free');}};
app.classList.add('harbor4');camera.select(A.cameraMode()==='helm'?'first':'chase');tick(0,0);document.title='ATLAS · Beaufort Wildlife & Views';
listen(window,'pagehide',()=>ATLAS_HARBOR4.dispose());
}
addEventListener('pagehide',()=>{clearTimeout(timer);stopped=true;},{once:true});install();})();
