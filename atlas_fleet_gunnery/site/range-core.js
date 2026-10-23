/* Fictional arcade practice only. No real gun or ballistic calibration. */
(function(G){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),D=Math.PI/180;
const GUNS=Object.freeze([
 Object.freeze({id:'bow',name:'Bow cannon',base:[39.3,7.7,0],pivot:[1,1.3,0],barrel:5.5,yaw:[-75,75],home:0,cooldown:.85,damage:100}),
 Object.freeze({id:'port',name:'Port repeater',base:[34.5,7.5,-6.5],pivot:[.2,1.1,0],barrel:2.5,yaw:[-130,-15],home:-65,cooldown:.18,damage:35}),
 Object.freeze({id:'starboard',name:'Starboard repeater',base:[34.5,7.5,6.5],pivot:[.2,1.1,0],barrel:2.5,yaw:[15,130],home:65,cooldown:.18,damage:35})
]);
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
function direction(yaw,elevation){const a=yaw*D,e=elevation*D;return [Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a)];}
function intersectSphere(o,d,c,r){if(!finite3(o)||!finite3(d)||!finite3(c)||!(r>0))return null;const q=o.map((x,i)=>x-c[i]),b=q.reduce((s,x,i)=>s+x*d[i],0),cc=q.reduce((s,x)=>s+x*x,0)-r*r,disc=b*b-cc;if(disc<0)return null;const t=-b-Math.sqrt(disc);return t>=0?t:(-b+Math.sqrt(disc)>=0?-b+Math.sqrt(disc):null);}
function trace(o,d,targets,max=900){if(!finite3(o)||!finite3(d)||Math.abs(Math.hypot(...d)-1)>1e-5)throw Error('INVALID_SHOT_RAY');let distance=max,targetId=null,kind='miss';if(d[1]<-1e-6&&o[1]>0){const t=-o[1]/d[1];if(t<distance){distance=t;kind='splash';}}
 for(const t of targets){if(t.hp<=0)continue;const n=intersectSphere(o,d,t.point,t.radius);if(n!==null&&n<distance){distance=n;targetId=t.id;kind='hit';}}
 return {distance,point:o.map((x,i)=>x+d[i]*distance),targetId,kind};}
class Range{
 constructor(){this.epoch=null;this.time=0;this.blocked=true;this.active=false;this.held=false;this.selected=0;this.yaw=0;this.elevation=-2;this.revision=0;this.reset([]);}
 reset(targets){if(!Array.isArray(targets)||targets.some(t=>!finite3(t.point)||!Number.isFinite(t.radius)||t.radius<=0||typeof t.id!=='string')||new Set(targets.map(t=>t.id)).size!==targets.length)throw Error('INVALID_TARGETS');this.targets=targets.map(t=>({...t,point:[...t.point],hp:100}));this.shots=[];this.events=[];this.eventSerial=0;this.total=0;this.hits=0;this.destroyed=0;this.held=false;this.nextFire=-Infinity;this.revision++;}
 sync(s){if(!s||!Number.isFinite(s.time)||s.time<0||!Number.isSafeInteger(s.epoch)||s.epoch<0||typeof s.paused!=='boolean'){this.blocked=true;this.held=false;throw Error('INVALID_CLOCK');}
  const fresh=this.epoch!==s.epoch;if(fresh){this.epoch=s.epoch;this.time=s.time;this.shots=[];this.held=false;this.nextFire=-Infinity;}
  if(!fresh&&s.time<this.time-1e-8){this.blocked=true;this.held=false;throw Error('BACKWARDS_TIME');}
  this.time=s.time;this.blocked=s.paused||s.hidden===true;
  if(this.blocked){this.held=false;return;}
  const alive=[];for(const shot of this.shots){if(this.time+1e-8<shot.finishAt){alive.push(shot);continue;}const t=this.targets.find(x=>x.id===shot.targetId);let kind=shot.kind;
   if(t&&t.hp>0){t.hp=Math.max(0,t.hp-shot.damage);this.hits++;if(t.hp===0)this.destroyed++;}else if(t){kind='miss';}
   this.events.push({seq:++this.eventSerial,type:'impact',id:shot.id,time:this.time,kind,targetId:shot.targetId,point:shot.end});}
  this.shots=alive;this.events=this.events.slice(-128);
 }
 select(i){if(!Number.isInteger(i)||!GUNS[i])throw Error('UNKNOWN_GUN');this.selected=i;this.held=false;this.yaw=GUNS[i].home;this.elevation=-2;}
 aim(y,e){if(!Number.isFinite(y+e))throw Error('INVALID_AIM');this.yaw=clamp(y,...GUNS[this.selected].yaw);this.elevation=clamp(e,-7,45);}
 fire(o,d){if(!this.active||this.blocked||this.time+1e-8<this.nextFire)return null;if(this.shots.length>=24)return null;const hit=trace(o,d,this.targets),g=GUNS[this.selected];this.nextFire=this.time+g.cooldown;
  const shot={id:this.revision+':'+(++this.total),gun:g.id,origin:[...o],direction:[...d],end:hit.point,kind:hit.kind,targetId:hit.targetId,startAt:this.time,finishAt:this.time+Math.max(.08,hit.distance/300),damage:g.damage};this.shots.push(shot);this.events.push({seq:++this.eventSerial,type:'shot',id:shot.id,time:this.time,gun:g.id});this.events=this.events.slice(-128);return shot;}
 read(){return {enabled:this.active,blocked:this.blocked,epoch:this.epoch,time:this.time,revision:this.revision,selected:GUNS[this.selected].id,yaw:this.yaw,elevation:this.elevation,holding:this.held,shots:this.total,hits:this.hits,destroyed:this.destroyed,pending:this.shots.length,targets:this.targets.map(t=>({id:t.id,hp:t.hp,point:[...t.point]})),events:this.events.map(e=>({...e}))};}
}
G.AtlasRangeCore={Range,GUNS,trace,direction,intersectSphere};if(typeof module!=='undefined')module.exports=G.AtlasRangeCore;
})(typeof window!=='undefined'?window:globalThis);
