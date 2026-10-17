import {WORLD,VESSEL_ID} from '/world.mjs';
import {BoatController,FixedStepper} from '/controller.mjs';
import {createGameHost} from '/host.mjs';
import {createCoreAdapter} from '/client/core-adapter.mjs';
import {mountInviteControls} from '/client/invite-controls.mjs';
const $=id=>document.getElementById(id),T=window.ATLASRuntime;
const controller=new BoatController(),stepper=new FixedStepper(controller),keys=new Set(),remote=new Map();
let adapter,ui,renderer,scene,camera,boat,template,viewMode=0,last=0,hudAt=0,accel=0,routeIndex=0,completed=0,raf=0,disposed=false;
const cameraPoint=T?new T.Vector3():null,lookPoint=T?new T.Vector3():null,radar=$('radar').getContext('2d');
const setRooms=open=>{$('rooms').hidden=!open;$('roomsToggle').setAttribute('aria-expanded',String(open));};
$('roomsToggle').onclick=()=>setRooms($('rooms').hidden);$('closeRooms').onclick=()=>setRooms(false);$('retry').onclick=()=>location.reload();
function clearInput(){keys.clear();accel=0;controller.input();document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('active'));}
function fail(message){$('loading').hidden=true;$('notice').hidden=false;$('noticeText').textContent=message;}
function togglePower(){controller.engine=!controller.engine;if(!controller.engine)clearInput();}
$('power').onclick=togglePower;$('coast').onclick=clearInput;$('camera').onclick=()=>{viewMode=(viewMode+1)%3;$('camera').textContent='Camera: '+['chase','orbit','helm'][viewMode];};
$('routeReset').onclick=()=>{routeIndex=0;completed=0;};
const keyMap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{
  if(e.target.closest?.('input,textarea,button,details'))return;
  if(keyMap[e.code]){keys.add(keyMap[e.code]);e.preventDefault();}
  if(!e.repeat&&e.code==='KeyE')togglePower();if(!e.repeat&&e.code==='KeyC')$('camera').click();
  if(e.code==='Space'){clearInput();e.preventDefault();}
});
addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});
addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();last=0;stepper.clear();});
for(const button of document.querySelectorAll('[data-hold]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.hold);button.classList.add('active');});
  const release=()=>{keys.delete(button.dataset.hold);button.classList.remove('active');};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
}
function mesh(geometry,color){return new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.8,metalness:0}));}
function buildScenery(){
  scene=new T.Scene();scene.background=new T.Color('#95bbca');scene.fog=new T.FogExp2('#95bbca',.0011);
  scene.add(new T.HemisphereLight('#dbf8ff','#2c4b43',2.8));const sun=new T.DirectionalLight('#fff3d7',3.2);sun.position.set(-200,350,160);scene.add(sun);
  const water=new T.Mesh(new T.PlaneGeometry(12000,12000,1,1),new T.ShaderMaterial({
    uniforms:{time:{value:0}},vertexShader:`varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`precision highp float;varying vec3 vWorld;uniform float time;void main(){vec2 p=vWorld.xz;float a=sin(p.x*.21+p.y*.16-time*1.2);float b=sin(p.x*.09-p.y*.25-time*.73);float c=sin(p.x*.047+p.y*.054+time*.3);float sparkle=pow(max(0.,a*b),12.);vec3 deep=vec3(.017,.21,.29);vec3 light=vec3(.04,.34,.40);vec3 col=mix(deep,light,.48+.14*a+.13*b+.12*c)+sparkle*.07;float fog=1.-exp(-length(cameraPosition.xz-p)*.0015);gl_FragColor=vec4(mix(col,vec3(.584,.733,.792),fog),1.);}`
  }));water.rotation.x=-Math.PI/2;water.position.y=-.2;water.name='water';scene.add(water);
  for(const island of WORLD.islands){
    const beach=mesh(new T.CylinderGeometry(island.radius*.96,island.radius,2,48),'#c9ba8b');beach.position.set(island.x,.2,island.z);scene.add(beach);
    const land=mesh(new T.SphereGeometry(1,20,12),'#536b48');land.scale.set(island.radius*.91,16,island.radius*.9);land.position.set(island.x,0,island.z);scene.add(land);
    for(let n=0;n<8;n++){const angle=n*2.4,dist=island.radius*(.18+.035*n),x=island.x+Math.cos(angle)*dist,z=island.z+Math.sin(angle)*dist;
      const tree=mesh(new T.ConeGeometry(3.5,15,7),'#314f41');tree.position.set(x,18,z);scene.add(tree);}
  }
  for(const [index,p] of WORLD.route.entries()){
    const group=new T.Group();group.position.set(p.x,0,p.z);const base=mesh(new T.CylinderGeometry(1.15,1.5,.8,12),'#e8b75e');base.position.y=.35;group.add(base);
    const pole=mesh(new T.CylinderGeometry(.12,.12,4,8),'#f6edd2');pole.position.y=2;group.add(pole);const top=mesh(new T.SphereGeometry(.48,10,8),'#e8b75e');top.position.y=4;group.add(top);group.name='buoy-'+index;scene.add(group);
  }
  // Fixed visual harbor markers are outside all distinct initial boat slots.
  const dock=mesh(new T.BoxGeometry(245,1.1,5),'#574f43');dock.position.set(-140,-.2,303);scene.add(dock);
  for(let n=0;n<10;n++){const p=mesh(new T.CylinderGeometry(.28,.4,3.8,8),'#c2b59b');p.position.set(-260+n*25,1.1,305);scene.add(p);}
}
function remoteBoat(peer){
  let item=remote.get(peer.entityId);
  if(!item){
    const model=template.clone(true),halo=mesh(new T.TorusGeometry(6,.13,5,36),'#e5c683');halo.rotation.x=Math.PI/2;halo.position.y=.4;
    const group=new T.Group();group.add(model,halo);scene.add(group);item={group,halo,name:peer.name,stale:false,pose:peer.pose};remote.set(peer.entityId,item);
  }
  item.group.position.fromArray(peer.pose.p);item.group.quaternion.fromArray(peer.pose.q);item.pose=peer.pose;item.name=peer.name;item.stale=peer.stale;item.halo.visible=!peer.stale;
  // No remote physics, character, propeller solver or second wave clock.
}
function removeRemote(id){const r=remote.get(id);if(r){scene.remove(r.group);r.halo.geometry.dispose();r.halo.material.dispose();remote.delete(id);}}
function status(info){
  const labels={idle:'Free sail · Solo',connected:'Private room · Connected',connecting:'Connecting…',joining:'Joining room…',reconnecting:'Connection lost · Reconnecting…',error:'Room offline · Solo available'};
  $('connection').textContent=labels[info.state]||info.state;$('connectionDot').classList.toggle('online',info.state==='connected');
  $('rosterCount').textContent=info.state==='connected'?`${info.players} / 8 boats`:'';
  if(info.state==='reconnecting')clearInput();
}
function navigation(){
  radar.clearRect(0,0,190,190);radar.save();radar.translate(95,95);
  radar.strokeStyle='#779c9f77';radar.lineWidth=1;for(const radius of [30,60,87]){radar.beginPath();radar.arc(0,0,radius,0,Math.PI*2);radar.stroke();}
  radar.beginPath();radar.arc(0,0,87,0,Math.PI*2);radar.clip();
  for(const i of WORLD.islands){radar.fillStyle='#768969';radar.beginPath();radar.arc((i.x-controller.x)*.16,(i.z-controller.z)*.16,i.radius*.16,0,Math.PI*2);radar.fill();}
  WORLD.route.forEach((p,i)=>{radar.fillStyle=i===routeIndex?'#f5d58e':'#8badb5';radar.fillRect((p.x-controller.x)*.16-2,(p.z-controller.z)*.16-2,4,4);});
  for(const p of remote.values()){radar.fillStyle=p.stale?'#647e87':'#b8e8cf';radar.beginPath();radar.arc((p.pose.p[0]-controller.x)*.16,(p.pose.p[2]-controller.z)*.16,3.5,0,Math.PI*2);radar.fill();}
  radar.rotate(controller.heading);radar.fillStyle='#f1deae';radar.beginPath();radar.moveTo(7,0);radar.lineTo(-4,-4);radar.lineTo(-2,0);radar.lineTo(-4,4);radar.closePath();radar.fill();radar.restore();
}
function hud(){
  $('speed').textContent=(Math.abs(controller.speed)*1.94384).toFixed(1);
  const bearing=((controller.heading*180/Math.PI+90)%360+360)%360;
  $('heading').textContent=`${String(Math.round(bearing)%360).padStart(3,'0')}°`;
  $('throttle').textContent=`Throttle ${Math.round(controller.throttle*100)}%`;
  $('gear').textContent=controller.throttle>.01?'FORWARD':controller.throttle<-.01?'REVERSE':'NEUTRAL';
  $('power').textContent=controller.engine?'Engine on':'Start engine';$('power').setAttribute('aria-pressed',String(controller.engine));
  const buoy=WORLD.route[routeIndex],distance=Math.hypot(controller.x-buoy.x,controller.z-buoy.z);
  if(distance<14){routeIndex=(routeIndex+1)%WORLD.route.length;if(routeIndex===0)completed++;}
  $('routeLabel').textContent=`Buoy ${routeIndex+1} / 5${completed?` · ${completed} lap${completed===1?'':'s'}`:''}`;
  $('routeDistance').textContent=`${Math.round(distance)} metres`;
  navigation();
}
function frame(now){
  if(disposed)return;raf=requestAnimationFrame(frame);if(document.hidden){last=0;return;}
  const dt=last?(now-last)/1000:0;last=now;
  accel=Math.max(-1,Math.min(1,accel+((keys.has('up')?1:0)-(keys.has('down')?1:0))*Math.min(dt,.05)*.7));
  if(keys.has('up')||keys.has('down'))controller.engine=true;
  controller.input({throttle:accel,steer:(keys.has('right')?1:0)-(keys.has('left')?1:0)});
  if(!['connecting','joining','reconnecting'].includes(adapter.info.state))stepper.advance(dt);else stepper.clear();
  const pose=controller.pose();boat.position.fromArray(pose.p);boat.quaternion.fromArray(pose.q);adapter.render();
  scene.getObjectByName('water').material.uniforms.time.value=controller.seconds;
  const h=controller.heading,x=controller.x,z=controller.z;
  if(viewMode===0){cameraPoint.set(x-Math.cos(h)*21,12,z-Math.sin(h)*21);lookPoint.set(x+Math.cos(h)*9,1.5,z+Math.sin(h)*9);}
  else if(viewMode===1){cameraPoint.set(x-27,31,z+36);lookPoint.set(x,0,z);}
  else {cameraPoint.set(x-Math.cos(h)*1.8,2.7,z-Math.sin(h)*1.8);lookPoint.set(x+Math.cos(h)*45,2.5,z+Math.sin(h)*45);}
  camera.position.lerp(cameraPoint,last===now&&dt===0?1:1-Math.exp(-Math.min(dt,.1)*5));camera.lookAt(lookPoint);
  renderer.render(scene,camera);
  if(now-hudAt>100){hudAt=now;hud();}
}
async function boot(){
  if(!T)throw Error("RENDERER_ASSET_UNAVAILABLE");
  renderer=new T.WebGLRenderer({canvas:$('sea'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.25,10000);buildScenery();
  const resize=()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};addEventListener('resize',resize);resize();
  // All model/runtime assets are packaged with this service. No CDN or SeaLab request.
  const gltf=await new T.GLTFLoader().loadAsync('/assets/boat.glb',e=>{if(e.total)$('loadProgress').value=Math.round(e.loaded/e.total*100);});
  template=gltf.scene;template.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  boat=new T.Group();boat.add(template.clone(true));scene.add(boat);
  const host=createGameHost(controller,{renderRemote:remoteBoat,removeRemote,networkStatus:status,clearInput});
  const endpoint=new URL('/ws',location.href);endpoint.protocol=location.protocol==='https:'?'wss:':'ws:';
  adapter=await createCoreAdapter({enabled:true,host,world:WORLD,vesselId:VESSEL_ID,endpoint:endpoint.href,baseUrl:location.origin+'/'});
  ui=mountInviteControls({adapter,parent:$('roomMount'),baseUrl:location.href});
  if(new URLSearchParams(location.hash.slice(1)).has('room'))setRooms(true);
  $('loading').hidden=true;hud();raf=requestAnimationFrame(frame);
  // Read-only diagnostics for repeatable acceptance; no private invitation/resume tokens.
  window.ATLAS_OPEN_WATER=Object.freeze({inspect:()=>({app:'atlas-d-open-water',seaLabIntegrated:false,network:adapter.info,stats:adapter.stats,pose:controller.pose(),clock:controller.sample().clock,remotes:[...remote.values()].map(r=>({name:r.name,stale:r.stale,pose:structuredClone(r.pose)})),droppedGaps:stepper.droppedGaps})});
}
addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);adapter?.dispose();ui?.dispose();renderer?.dispose();},{once:true});
boot().catch(error=>{console.error('Open Water initialization failed:',error);fail('The 3D game could not start. Check that WebGL is enabled and that the boat asset finished loading. The room service has not been joined.');});
