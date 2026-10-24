/** Advisory group navigation only. Never changes a boat, simulation time or input. */
import {WORLD} from '../standalone/world.mjs';
export const DEPARTURE_DELAY_MS=5000, ARRIVAL_RADIUS_M=22, FRESH_MS=1800;
export const DESTINATIONS=Object.freeze([
  ...WORLD.route.map((p,i)=>Object.freeze({id:`buoy-${i+1}`,name:`Buoy ${i+1}`,x:p.x,z:p.z})),
  Object.freeze({id:'harbor',name:'Harbor rendezvous',x:-135,z:250})
]);
export const destinationOf=id=>DESTINATIONS.find(d=>d.id===id)||null;
export const emptyPlan=()=>({revision:0,destination:null,departAt:null});
export function checkedPlan(plan,previous=null){
  if(!plan||Object.keys(plan).some(k=>!['revision','destination','departAt'].includes(k))||!Number.isSafeInteger(plan.revision)||plan.revision<0||
    (plan.destination!==null&&!destinationOf(plan.destination))||
    (plan.departAt!==null&&(!Number.isFinite(plan.departAt)||plan.departAt<0||plan.destination===null)))throw Error('BAD_CREW_PLAN');
  if(previous&&(plan.revision<previous.revision||(plan.revision===previous.revision&&JSON.stringify([plan.destination,plan.departAt])!==JSON.stringify([previous.destination,previous.departAt]))))throw Error('CREW_PLAN_REPLAY');
  return {...plan};
}
export function freshCaptain(p,now){return p.connected===true&&p.visible===true&&p.pose!==null&&Number.isFinite(p.updatedAt)&&now-p.updatedAt>=0&&now-p.updatedAt<=FRESH_MS;}
export function departureAllowed(players,now){return players.length>=2&&players.every(p=>p.ready===true&&freshCaptain(p,now));}
export function cancelUnsafeCountdown(plan,players,now){
  if(plan.departAt!==null&&now<plan.departAt&&!departureAllowed(players,now))return {...plan,revision:plan.revision+1,departAt:null};
  return plan;
}
export function crewProgress(plan,players,now){
  const destination=destinationOf(plan?.destination),fresh=players.filter(p=>freshCaptain(p,now));
  return {destination,ready:players.filter(p=>p.ready&&freshCaptain(p,now)).length,total:players.length,
    arrived:destination?fresh.filter(p=>Math.hypot(p.pose.p[0]-destination.x,p.pose.p[2]-destination.z)<=ARRIVAL_RADIUS_M).length:0,
    countdown:plan?.departAt===null||plan?.departAt===undefined?null:Math.max(0,Math.ceil((plan.departAt-now)/1000))};
}
export function navigationTarget(pose,others,plan,slot=null){
  const selected=slot===null?null:others.find(p=>p.slot===slot&&!p.stale);
  const destination=slot===null?destinationOf(plan?.destination):null;
  const target=selected?{name:`${selected.slot+1} · ${selected.name}`,x:selected.pose.p[0],z:selected.pose.p[2]}:destination;
  if(!target)return null;
  const dx=target.x-pose.p[0],dz=target.z-pose.p[2],distance=Math.hypot(dx,dz);
  const [qx,qy,qz,qw]=pose.q,heading=Math.atan2(2*(qx*qz-qw*qy),1-2*(qy*qy+qz*qz));
  const bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;
  const facing=(heading*180/Math.PI+90+360)%360;
  return {...target,distance,bearing,relativeBearing:(bearing-facing+540)%360-180,arrived:distance<=ARRIVAL_RADIUS_M};
}
