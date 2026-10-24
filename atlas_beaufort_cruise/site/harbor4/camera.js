/* Four views, one native frame loop. Free inspection pauses the local vessel;
 * no fitting interaction or vessel controls can leak into the free camera. */
(function(G,f){if(typeof module==='object')module.exports=f;else G.AtlasHarborCamera=f;})(globalThis,function(H,C,T){'use strict';
const A=H.app,S=A.state,cam=A.camera;let mode='chase',third='chase',yaw=0,elevation=.29,distance=14,freeYaw=0,freePitch=-.12,savedPause=null,internal=false,snap=true;
const keys=new Set(),lookAt=new T.Vector3(),desired=new T.Vector3(),target=new T.Vector3(),dir=new T.Vector3(),right=new T.Vector3();
function isFree(){return mode==='free'||mode==='wildlife';}
function clear(){keys.clear();H.clearBoatKeys();}
function select(next){if(!['first','chase','orbit','free','wildlife'].includes(next))throw Error('Unknown view');
 clear();const wasFree=mode==='free';if(wasFree&&next!=='free'){const paused=savedPause;savedPause=null;A.setPaused(paused===true);}
 if(next==='free'&&!wasFree){savedPause=A.isPaused();A.setPaused(true);cam.getWorldDirection(dir);freeYaw=Math.atan2(dir.z,dir.x);freePitch=Math.asin(C.clamp(dir.y,-1,1));}
 mode=next;internal=true;try{if(next==='first')H.nativeView('helm');else if(next!=='free')H.nativeView('follow');}finally{internal=false;}
 if(next==='wildlife'){distance=9;yaw=0;elevation=.14;}mode=next;if(next==='chase'||next==='orbit')third=next;snap=true;H.changed?.(mode);return mode;
}
function onNative(next){if(internal)return;if(mode==='free'){const old=savedPause;savedPause=null;A.setPaused(old===true);}clear();mode=next==='helm'?'first':next==='follow'?third:next==='orbit'?'orbit':'native';if(mode==='orbit')third='orbit';snap=true;H.changed?.(mode);}
function drag(dx,dy){if(!Number.isFinite(dx+dy))return;if(mode==='orbit'||mode==='wildlife'){yaw=C.angle(yaw-dx*.005);elevation=C.clamp(elevation+dy*.004,.08,1.12);}else if(mode==='free'){freeYaw=C.angle(freeYaw+dx*.004);freePitch=C.clamp(freePitch-dy*.003,-1.35,1.35);}}
function zoom(delta){if(mode==='orbit'||mode==='chase'||mode==='wildlife')distance=C.clamp(distance*Math.exp(C.clamp(delta,-300,300)*.0015),7,42);}
function key(code,down){if(mode!=='free')return false;if(['KeyW','KeyS','KeyA','KeyD','KeyE','KeyQ','Space','ShiftLeft','ShiftRight'].includes(code)){down?keys.add(code):keys.delete(code);return true;}return false;}
function update(dt){if(H.photo())return false;if(mode==='first'||mode==='native')return false;dt=Number.isFinite(dt)?C.clamp(dt,0,.10):0;
 if(mode==='wildlife'){
  const animal=H.wildlife?.();if(!animal)return false;
  const a=animal.heading+Math.PI+yaw,d=C.clamp(distance,7,42);desired.set(animal.x+Math.cos(a)*d,Math.max(H.waterHeight(animal.x,animal.z)+1.15,animal.y+1.15+Math.sin(elevation)*d),animal.z+Math.sin(a)*d);
  target.set(animal.x+.5*Math.cos(animal.heading),animal.y+.16,animal.z+.5*Math.sin(animal.heading));
  if(snap){cam.position.copy(desired);lookAt.copy(target);snap=false;}else{cam.position.lerp(desired,1-Math.exp(-dt*6));lookAt.lerp(target,1-Math.exp(-dt*8));}
  cam.up.set(0,1,0);cam.lookAt(lookAt);cam.updateMatrixWorld();return true;
 }
 if(mode==='free'){
  if(H.blocked())keys.clear();const horizontal=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),lateral=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),vertical=Number(keys.has('KeyE')||keys.has('Space'))-Number(keys.has('KeyQ'));
  const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?32:10)*dt,den=Math.max(1,Math.hypot(horizontal,lateral,vertical));
  dir.set(Math.cos(freeYaw)*Math.cos(freePitch),Math.sin(freePitch),Math.sin(freeYaw)*Math.cos(freePitch));right.set(-Math.sin(freeYaw),0,Math.cos(freeYaw));
  cam.position.addScaledVector(dir,horizontal*speed/den).addScaledVector(right,lateral*speed/den);cam.position.y+=vertical*speed/den;cam.position.y=C.clamp(cam.position.y,.25,140);
  const dx=cam.position.x-S.x,dz=cam.position.z-S.z,r=Math.hypot(dx,dz);if(r>1600){cam.position.x=S.x+dx*1600/r;cam.position.z=S.z+dz*1600/r;}
  cam.up.set(0,1,0);cam.lookAt(target.copy(cam.position).add(dir));cam.updateMatrixWorld();return true;
 }
 const p=C.chasePose(S,mode==='chase'?0:yaw,elevation,distance);desired.fromArray(p.position);target.fromArray(p.target);
 // Never drag the camera underneath the local water surface.
 desired.y=Math.max(desired.y,H.waterHeight(desired.x,desired.z)+.65);
 if(snap||cam.position.distanceTo(desired)>90){cam.position.copy(desired);lookAt.copy(target);snap=false;}else{const a=1-Math.exp(-dt*7);cam.position.lerp(desired,a);lookAt.lerp(target,1-Math.exp(-dt*10));}
 cam.up.set(0,1,0);cam.lookAt(lookAt);cam.updateMatrixWorld();return true;
}
return {select,onNative,update,drag,zoom,key,clear,isFree,toggle(){return select(mode==='first'?third:'first');},lock(){return select(mode==='orbit'?'chase':'orbit');},focus(){return isFree()?{x:cam.position.x,z:cam.position.z}:null;},inspect:()=>({mode,third,yaw,elevation,distance,freeCameraPausesBoat:mode==='free',wildlifeView:mode==='wildlife',boatInputsDisabled:isFree(),held:keys.size}),dispose(){clear();if(mode==='free'&&savedPause!==null)A.setPaused(savedPause);mode='native';}};
});
