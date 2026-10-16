import {FixtureController,regressionScenario} from './host.mjs';
import {FIXTURE_WORLD,FIXTURE_VESSEL} from './world.mjs';
import {endpoint} from './config.mjs';
const query=new URLSearchParams(location.search),controller=new FixtureController(),remotes=new Map();
const hooks={prepare:0,restore:0,exit:0,render:0,remove:0},statuses=[];let saved=null,adapter=null,delayMs=0,forcedId=null;
const host={
  readLocal:()=>({vesselId:forcedId||FIXTURE_VESSEL,pose:controller.pose()}),
  prepareLocal:async context=>{
    hooks.prepare++;if(context.resumed)hooks.restore++;
    saved??=controller.snapshot();
    if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
    if(context.signal.aborted)return false;
    controller.apply(context.pose);return true;
  },
  exitLocal:()=>{hooks.exit++;if(saved){controller.apply(saved);controller.velocity=[...saved.velocity];controller.elapsed=saved.elapsed;saved=null;}},
  renderRemote:peer=>{hooks.render++;remotes.set(peer.entityId,structuredClone(peer));},
  removeRemote:id=>{hooks.remove++;remotes.delete(id);},
  networkStatus:info=>{if(statuses.at(-1)!==info.state)statuses.push(info.state);if(statuses.length>64)statuses.shift();}
};
if(query.get('noimport')!=='1'){
  const {createCoreAdapter}=await import('/client/core-adapter.mjs');
  adapter=await createCoreAdapter({enabled:query.get('network')!=='off',host,world:FIXTURE_WORLD,allowFixture:true,
    vesselId:FIXTURE_VESSEL,endpoint,baseUrl:location.origin+location.pathname});
  const {mountInviteControls}=await import('/client/invite-controls.mjs');
  mountInviteControls({adapter,parent:document.getElementById('controls'),fixture:true,baseUrl:location.href});
}
const canvas=document.getElementById('motion'),ctx=canvas.getContext('2d');
function glyph(pose,name,stale,local){
  const x=110+pose.p[0]*4,y=150+pose.p[2]*4;ctx.save();ctx.translate(x,y);
  const q=pose.q;const heading=-Math.atan2(2*(q[3]*q[1]+q[0]*q[2]),1-2*(q[1]**2+q[2]**2));
  ctx.rotate(heading);ctx.fillStyle=stale?'#73838c':local?'#f2d27b':'#80d2ee';
  ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-12,-7);ctx.lineTo(-8,0);ctx.lineTo(-12,7);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=stale?'#a9aeb0':'#eaf5fc';ctx.font='15px system-ui';ctx.fillText(name+(stale?' — stale':''),x-12,y+30);
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;controller.step(dt);adapter?.render();
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#214655';
  for(let x=30;x<canvas.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for(let y=30;y<canvas.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
  glyph(controller.pose(),'Local fixture craft',false,true);for(const peer of remotes.values())glyph(peer.pose,peer.name,peer.stale,false);
  document.getElementById('motion-state').textContent=`Local X ${controller.p[0].toFixed(2)} m · ${remotes.size} remote craft · ${adapter?.info.state||'baseline'}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.getElementById('map').onclick=()=>{const panel=document.getElementById('map-panel');panel.hidden=!panel.hidden;};
window.fixture={ready:true,inspect:()=>({info:adapter?.info||{state:'baseline'},local:controller.snapshot(),
  remotes:[...remotes.values()],hooks:{...hooks},statuses:[...statuses],stats:adapter?.stats||null,worldHash:adapter?.worldHash,
  transportRoomAgeSeconds:adapter?.transportRoomAgeSeconds??null,mapOpen:!document.getElementById('map-panel').hidden}),
  setVelocity:(x,z)=>{controller.velocity=[x,z];},forceVessel:id=>{forcedId=id;},setPrepareDelay:ms=>{delayMs=ms;},
  regression:()=>regressionScenario(),dispose:()=>adapter?.dispose()};
