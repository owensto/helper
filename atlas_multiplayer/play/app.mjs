import {BoatController,FixedStepper} from '../standalone/controller.mjs';
import {WORLD} from '../standalone/world.mjs';
import {PeerRoom} from './peer-room.mjs';
import {drawChart,createGraphics} from './graphics.mjs';
import {describeFailure} from './assets.mjs';
const $=id=>document.getElementById(id),controller=new BoatController(),stepper=new FixedStepper(controller),keys=new Set();
let throttle=0,last=0,view=0,routeIndex=0,graphics=null,chartOnly=false,loading3D=false,stage='Starting chart',stopped=false,frameId=0;
const diagnostics=[];const multiplayer=document.body.dataset.mode==='multiplayer';
function note(message){$('visualStatus').textContent=message;diagnostics.push(message);if(diagnostics.length>10)diagnostics.shift();}
function clearInput(){keys.clear();throttle=0;controller.input();document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('active'));}
const room=new PeerRoom({read:()=>controller.sample(),onSpawn:p=>{clearInput();controller.place(p);stepper.clear();},onState:info=>{
  $('connection').textContent=info.message;$('count').textContent=info.players>1?`${info.players} boats`:'';
  const busy=['connecting','hosting','connected','stale'].includes(info.state);$('createRoom').disabled=busy;$('joinRoom').disabled=busy;$('leaveRoom').disabled=!busy;
  $('copyInvite').disabled=!room.link;$('inviteOut').value=room.link;
  $('roomStatus').textContent=info.message;
}});
function showPanel(open){$('rooms').hidden=!open;clearInput();}
$('roomsToggle').onclick=()=>showPanel($('rooms').hidden);$('closeRooms').onclick=()=>showPanel(false);
$('createRoom').onclick=()=>{room.start({name:$('name').value||'Captain'}).catch(e=>{$('roomStatus').textContent=e.message;});};
$('joinRoom').onclick=()=>{room.start({name:$('name').value||'Guest',invite:$('inviteIn').value}).catch(e=>{$('roomStatus').textContent=e.message;});};
$('leaveRoom').onclick=()=>{room.leave();clearInput();};
$('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(room.link);$('roomStatus').textContent='Invitation copied. Send it to your friend.';}catch{$('inviteOut').focus();$('inviteOut').select();$('roomStatus').textContent='Copy the selected invitation.';}};
$('power').onclick=()=>{controller.engine=!controller.engine;if(!controller.engine)clearInput();};$('coast').onclick=clearInput;
$('camera').onclick=()=>{view=(view+1)%3;$('camera').textContent=['Chase','Overview','Helm'][view];};
$('visual').onclick=()=>{chartOnly=!chartOnly;$('visual').textContent=chartOnly?'Enable 3D':'Chart view';if(!chartOnly&&!graphics)upgrade();};
$('retry3d').onclick=()=>{chartOnly=false;upgrade();};
$('copyDebug').onclick=async()=>{const report=JSON.stringify(window.ATLAS_OPEN_WATER.inspect(),null,2);try{await navigator.clipboard.writeText(report);$('debugResult').textContent='Diagnostics copied.';}catch{$('debugResult').textContent=report;}};
for(const id of ['power','coast','camera','visual'])$(id).addEventListener('click',()=>(graphics&&!chartOnly?$('sea'):$('chart')).focus({preventScroll:true}));
for(const id of ['sea','chart'])$(id).addEventListener('pointerdown',()=>$(id).focus({preventScroll:true}));
const keymap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea'))return;if(keymap[e.code]){keys.add(keymap[e.code]);e.preventDefault();}if(e.code==='Space'){clearInput();e.preventDefault();}if(!e.repeat&&e.code==='KeyE')$('power').click();if(!e.repeat&&e.code==='KeyC')$('camera').click();});
addEventListener('keyup',e=>{if(keymap[e.code])keys.delete(keymap[e.code]);});addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();stepper.clear();last=0;});
for(const b of document.querySelectorAll('[data-hold]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.hold);b.classList.add('active');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{keys.delete(b.dataset.hold);b.classList.remove('active');});}
$('sea').addEventListener('webglcontextlost',e=>{e.preventDefault();graphics?.dispose();graphics=null;note('3D graphics context lost. Sailing continues in chart view.');});
async function upgrade(){
  if(loading3D||stopped||graphics)return;loading3D=true;$('retry3d').disabled=true;
  try{const g=await createGraphics($('sea'),s=>{stage=s;note(`${s} · chart view playable`);});if(stopped){g.dispose();return;}graphics=g;note('Original Bay boat · 3D ready');}
  catch(e){note(describeFailure(stage,e));$('diagnostics').open=true;}
  finally{loading3D=false;$('retry3d').disabled=false;}
}
function frame(now){
  if(stopped)return;frameId=requestAnimationFrame(frame);if(document.hidden){last=0;return;}
  const dt=last?(now-last)/1000:0;last=now;
  throttle=Math.max(-1,Math.min(1,throttle+((keys.has('up')?1:0)-(keys.has('down')?1:0))*Math.min(dt,.05)*.7));if(keys.has('up')||keys.has('down'))controller.engine=true;
  controller.input({throttle,steer:(keys.has('right')?1:0)-(keys.has('left')?1:0)});stepper.advance(dt);
  const others=room.remotes();let use3D=!!graphics&&!chartOnly;
  if(use3D){try{graphics.draw(controller.pose(),others,view,dt);}catch(e){graphics.dispose();graphics=null;use3D=false;note(describeFailure('3D frame',e));}}
  $('sea').hidden=!use3D;$('chart').hidden=use3D;if(!use3D)drawChart($('chart'),controller,others,routeIndex);
  $('speed').textContent=(Math.abs(controller.speed)*1.94384).toFixed(1);$('throttle').textContent=`Power ${Math.round(controller.throttle*100)}%`;$('power').textContent=controller.engine?'Engine on':'Start engine';
  const p=WORLD.route[routeIndex],d=Math.hypot(controller.x-p.x,controller.z-p.z);if(d<14)routeIndex=(routeIndex+1)%WORLD.route.length;$('route').textContent=`Buoy ${routeIndex+1}/${WORLD.route.length} · ${Math.round(d)} m`;
}
window.ATLAS_OPEN_WATER=Object.freeze({inspect:()=>({version:'public-peer-playtest-1',mode:multiplayer?'peer-playtest':'solo',renderer:graphics&&!chartOnly?'3d':'chart',network:{...room.info},pose:controller.pose(),remotes:room.remotes().map(p=>({name:p.name,pose:p.pose,stale:p.stale})),diagnostics:[...diagnostics],seaLabIntegrated:false})});
if(multiplayer){$('mode').textContent='MULTIPLAYER PLAYTEST';showPanel(true);if(location.hash.includes('room='))$('inviteIn').value=location.href;}
else $('mode').textContent='SOLO SAILING';
try{drawChart($('chart'),controller,[],0);$('starting').hidden=true;note('Chart view ready · preparing 3D');frameId=requestAnimationFrame(frame);upgrade();}catch(e){$('starting').textContent=`Chart startup failed: ${e.message}`;}
addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frameId);room.leave(false);graphics?.dispose();},{once:true});
