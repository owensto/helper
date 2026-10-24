import {BoatController,FixedStepper} from '../standalone/controller.mjs';
import {WORLD} from '../standalone/world.mjs';
import {PeerRoom} from './peer-room.mjs';
import {drawChart,createGraphics} from './graphics.mjs';
import {describeFailure} from './assets.mjs';
import {navigationTarget} from './crew-plan.mjs';
import {fillDestinations,fillCrewTargets,renderCrewPlan} from './crew-ui.mjs';
import {renderRoster,roomSummary} from './lobby-ui.mjs';
const $=id=>document.getElementById(id),controller=new BoatController(),stepper=new FixedStepper(controller),keys=new Set();
let throttle=0,last=0,view=0,routeIndex=0,graphics=null,chartOnly=false,loading3D=false,stage='Starting chart',stopped=false,frameId=0,lastRoster='',lastRoomState='solo',wake=null,wakeGeneration=0;
const diagnostics=[];const multiplayer=document.body.dataset.mode==='multiplayer';
function note(message){$('visualStatus').textContent=message;diagnostics.push(message);if(diagnostics.length>10)diagnostics.shift();}
function clearInput(){keys.clear();throttle=0;controller.input();document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('active'));}
function releaseWake(){wakeGeneration++;try{wake?.release();}catch{}wake=null;$('keepAwake').textContent='Keep screen awake';}
const room=new PeerRoom({read:()=>controller.sample(),onSpawn:p=>{clearInput();controller.place(p);stepper.clear();},onResume:clearInput,onState:info=>{
  $('connection').textContent=info.message;$('count').textContent=roomSummary(info);$('lobbyCount').textContent=roomSummary(info);
  const busy=['connecting','hosting','connected','stale','reconnecting'].includes(info.state);
  $('createRoom').disabled=busy;$('joinRoom').disabled=busy;$('leaveRoom').disabled=!busy;$('name').disabled=busy;$('inviteIn').disabled=busy;
  $('copyInvite').disabled=!room.link;$('shareInvite').disabled=!room.link;$('inviteOut').value=room.link;
  $('roomStatus').textContent=info.message+(info.reconnectSeconds!==null&&info.reconnectSeconds!==undefined?` (${info.reconnectSeconds}s left)`:'');
  $('latency').textContent=info.latencyMs===null||info.latencyMs===undefined?'':`${info.latencyMs} ms to host`;
  $('sailNow').disabled=!['hosting','connected'].includes(info.state);$('hostAdvice').hidden=info.state!=='hosting';
  $('keepAwake').disabled=!['hosting','connected','stale'].includes(info.state);
  const signature=JSON.stringify(info.roster||[]);if(signature!==lastRoster){lastRoster=signature;renderRoster(document,$('crew'),info);fillCrewTargets(document,$('trackCrew'),info.roster||[]);}
  if(info.state!==lastRoomState&&['reconnecting','stale','error'].includes(info.state))clearInput();
  renderCrewPlan(document,info);$('navigator').hidden=!busy;if(!busy)releaseWake();lastRoomState=info.state;
}});
function focusHelm(){(graphics&&!chartOnly?$('sea'):$('chart')).focus({preventScroll:true});}
function showPanel(open){$('rooms').hidden=!open;$('roomsToggle').setAttribute('aria-expanded',String(open));clearInput();if(!open)focusHelm();}
$('roomsToggle').onclick=()=>showPanel($('rooms').hidden);$('closeRooms').onclick=()=>showPanel(false);$('sailNow').onclick=()=>showPanel(false);
$('createRoom').onclick=()=>{room.start({name:$('name').value||'Captain'}).catch(e=>{$('roomStatus').textContent=e.message;});};
$('joinRoom').onclick=()=>{if(!$('inviteIn').value.trim()){$('roomStatus').textContent='Paste the invitation from your host first.';return;}room.start({name:$('name').value||'Guest',invite:$('inviteIn').value.trim()}).catch(e=>{$('roomStatus').textContent=e.message;});};
$('setRally').onclick=()=>room.command('destination',$('rallyChoice').value);
$('readyCrew').onclick=()=>room.command('ready',!room.info.roster?.find(p=>p.self)?.ready);
$('departCrew').onclick=()=>room.command('depart');$('cancelCruise').onclick=()=>room.command('cancel');
$('trackCrew').onchange=()=>{clearInput();focusHelm();};
$('leaveRoom').onclick=()=>{room.leave();clearInput();};
async function copyInvite(){if(!room.link)return;try{await navigator.clipboard.writeText(room.link);$('roomStatus').textContent='Copied. Send this same invitation to up to seven friends.';}catch{$('inviteOut').focus();$('inviteOut').select();$('roomStatus').textContent='Copy the selected invitation.';}}
$('copyInvite').onclick=copyInvite;
$('shareInvite').onclick=async()=>{if(!room.link)return;try{if(navigator.share)await navigator.share({title:'Atlas D — join my crew',text:'Join my eight-captain sailing room.',url:room.link});else await copyInvite();}catch(e){if(e.name!=='AbortError')await copyInvite();}};
$('keepAwake').onclick=async()=>{try{if(!navigator.wakeLock?.request){$('roomStatus').textContent='Screen wake lock is unavailable. Keep this tab visible manually.';return;}const generation=++wakeGeneration,lock=await navigator.wakeLock.request('screen');if(generation!==wakeGeneration||document.hidden||!['hosting','connected','stale'].includes(room.info.state)){await lock.release();return;}wake=lock;$('keepAwake').textContent='Screen awake';lock.addEventListener('release',()=>{if(wake===lock){wake=null;$('keepAwake').textContent='Keep screen awake';}});}catch{$('roomStatus').textContent='Could not keep the screen awake. Keep this tab visible manually.';}};
$('power').onclick=()=>{controller.engine=!controller.engine;if(!controller.engine)clearInput();};$('coast').onclick=clearInput;
$('camera').onclick=()=>{view=(view+1)%3;$('camera').textContent=['Chase','Overview','Helm'][view];};
$('visual').onclick=()=>{chartOnly=!chartOnly;$('visual').textContent=chartOnly?'Enable 3D':'Chart view';if(!chartOnly&&!graphics)upgrade();};
$('retry3d').onclick=()=>{chartOnly=false;upgrade();};
$('copyDebug').onclick=async()=>{const report=JSON.stringify(window.ATLAS_OPEN_WATER.inspect(),null,2);try{await navigator.clipboard.writeText(report);$('debugResult').textContent='Diagnostics copied.';}catch{$('debugResult').textContent=report;}};
for(const id of ['power','coast','camera','visual'])$(id).addEventListener('click',focusHelm);
for(const id of ['sea','chart'])$(id).addEventListener('pointerdown',()=>$(id).focus({preventScroll:true}));
const keymap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{if(e.code==='Escape'){showPanel(false);return;}if(!$('rooms').hidden||e.target.closest?.('input,textarea,select,option,button,summary,a'))return;if(keymap[e.code]){keys.add(keymap[e.code]);e.preventDefault();}if(e.code==='Space'){clearInput();e.preventDefault();}if(!e.repeat&&e.code==='KeyE')$('power').click();if(!e.repeat&&e.code==='KeyC')$('camera').click();});
addEventListener('keyup',e=>{if(keymap[e.code])keys.delete(keymap[e.code]);});addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();stepper.clear();last=0;if(document.hidden)releaseWake();});
for(const b of document.querySelectorAll('[data-hold]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(!$('rooms').hidden)return;b.setPointerCapture(e.pointerId);keys.add(b.dataset.hold);b.classList.add('active');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{keys.delete(b.dataset.hold);b.classList.remove('active');});}
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
  const others=room.remotes(),plan=room.navigation(),slot=$('trackCrew').value==='rally'?null:Number($('trackCrew').value),nav=navigationTarget(controller.pose(),others,plan.plan,slot);
  if(!$('navigator').hidden){
    $('navName').textContent=nav?.name||(slot===null?'No shared destination':'Teammate updates unavailable');
    $('navDistance').textContent=nav?`${Math.round(nav.distance)} m · ${Math.round(nav.bearing)}°${nav.arrived?' · nearby':''}`:'Waiting for fresh crew updates';
    $('navArrow').style.transform=`rotate(${nav?.relativeBearing||0}deg)`;
    $('cruiseStatus').textContent=!['hosting','connected'].includes(room.info.state)?'Crew updates delayed · reconnecting':plan.destination?(plan.countdown===null?`${plan.ready}/${plan.total} ready · ${plan.arrived} near destination`:plan.countdown>0?`Depart together in ${plan.countdown}…`:`Cruise underway · ${plan.arrived}/${plan.total} near destination`):'Choose a destination in Room';
  }
  let use3D=!!graphics&&!chartOnly;
  if(use3D){try{graphics.draw(controller.pose(),others,view,dt,room.slot??0,nav);}catch(e){graphics.dispose();graphics=null;use3D=false;note(describeFailure('3D frame',e));}}
  $('sea').hidden=!use3D;$('chart').hidden=use3D;$('labels').hidden=!use3D;if(!use3D)drawChart($('chart'),controller,others,routeIndex,room.slot??0,nav);
  $('speed').textContent=(Math.abs(controller.speed)*1.94384).toFixed(1);$('throttle').textContent=`Power ${Math.round(controller.throttle*100)}%`;$('power').textContent=controller.engine?'Engine on':'Start engine';
  const p=WORLD.route[routeIndex],d=Math.hypot(controller.x-p.x,controller.z-p.z);if(d<14)routeIndex=(routeIndex+1)%WORLD.route.length;$('route').textContent=`Buoy ${routeIndex+1}/${WORLD.route.length} · ${Math.round(d)} m`;
}
window.ATLAS_OPEN_WATER=Object.freeze({inspect:()=>({version:'crew8-p4-rally',mode:multiplayer?'peer-playtest':'solo',renderer:graphics&&!chartOnly?'3d':'chart',network:{state:room.info.state,players:room.info.players,connected:room.info.connected,capacity:8,latencyMs:room.info.latencyMs??null,signaling:room.signaling},roster:(room.info.roster||[]).map(({id,...p})=>p),crewPlan:{...room.plan},traffic:{...room.metrics},pose:controller.pose(),remotes:room.remotes().map(p=>({name:p.name,slot:p.slot,pose:p.pose,stale:p.stale})),diagnostics:[...diagnostics],seaLabIntegrated:false})});
fillDestinations(document,$('rallyChoice'));renderRoster(document,$('crew'),{roster:[]});
if(multiplayer){$('mode').textContent='CREW 8 · RALLY';showPanel(true);if(location.hash.includes('room=')){$('inviteIn').value=location.href;$('joinHint').textContent='Invitation detected. Enter your name and press Join room.';}}
else $('mode').textContent='SOLO SAILING';
try{drawChart($('chart'),controller,[],0);$('starting').hidden=true;note('Chart view ready · preparing 3D');frameId=requestAnimationFrame(frame);upgrade();}catch(e){$('starting').textContent=`Chart startup failed: ${e.message}`;}
addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frameId);room.leave(false);releaseWake();graphics?.dispose();},{once:true});
