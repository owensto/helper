/* ATLAS-W: game-scale Newtonian projectiles. No real weapon calibration. */
(function(G){'use strict';
 const P=Object.freeze({gravity:9.81,drag:0.008,speed:62,step:1/120,cooldown:2.6,maxAge:18,maxShells:8});
 const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite),copy=p=>({x:p.x,y:p.y,z:p.z});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function advance(p,v,dt,wind={x:0,y:0,z:0},gravity=P.gravity,drag=P.drag){
  if(!finite(p)||!finite(v)||!finite(wind)||!Number.isFinite(dt)||dt<0)throw Error('INVALID_FLIGHT_STEP');
  const q=copy(p),u=copy(v),f=drag>0?-Math.expm1(-drag*dt)/drag:dt,h=drag>0?(dt-f)/drag:dt*dt/2,e=Math.exp(-drag*dt);
  for(const k of ['x','y','z']){const a=(k==='y'?-gravity:0)+drag*wind[k];q[k]+=v[k]*f+a*h;u[k]=v[k]*e+a*f;}
  return {p:q,v:u};
 }
 function sphereHit(a,b,c,r){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,x=a.x-c.x,y=a.y-c.y,z=a.z-c.z;
  const A=dx*dx+dy*dy+dz*dz,C=x*x+y*y+z*z-r*r;if(C<=0)return 0;if(A<1e-18)return null;
  const B=2*(x*dx+y*dy+z*dz),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;
 }
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 class FlightWorld{
  constructor(water=()=>0){this.water=water;this.epoch=null;this.time=0;this.observed=-Infinity;this.remainder=0;this.invalid=false;this.reason='';this.coolUntil=0;this.shots=0;this.hits=0;this.shells=[];this.impacts=[];this.targets=[];this.serial=0;}
  valid(s){return s&&Number.isSafeInteger(s.epoch)&&s.epoch>=0&&[s.time,s.x,s.z,s.heading].every(Number.isFinite)&&s.time>=0&&typeof s.paused==='boolean';}
  reset(s){
   if(!this.valid(s)||(s.epoch===this.epoch&&s.time<this.observed-1e-9))return false;
   this.epoch=s.epoch;this.time=this.observed=s.time;this.remainder=0;this.invalid=false;this.reason='';this.shells=[];this.impacts=[];this.coolUntil=s.time;this.shots=this.hits=this.serial=0;
   const x=s.x+39*Math.cos(s.heading),z=s.z+39*Math.sin(s.heading);
   this.targets=[[-.48,200],[0,260],[.48,320]].map(([angle,distance],i)=>({id:i+1,x:x+Math.cos(s.heading+angle)*distance,z:z+Math.sin(s.heading+angle)*distance,radius:5.8,hit:false,hitAt:null}));return true;
  }
  fail(reason){this.invalid=true;this.reason=reason;this.shells=[];return {valid:false,reason};}
  height(x,z,t){const y=this.water(x,z,t);if(!Number.isFinite(y))throw Error('INVALID_WATER');return y;}
  center(t,time=this.time){return {x:t.x,y:this.height(t.x,t.z,time)+5.8,z:t.z};}
  observe(s){
   if(!this.valid(s))return this.fail('INVALID_HOST');
   if(s.epoch!==this.epoch){this.reset(s);return {valid:true,reset:true,dt:0};}
   if(s.time<this.observed-1e-9)return this.fail('BACKWARDS_HOST_TIME');
   if(this.invalid)return {valid:false,reason:this.reason};
   const dt=Math.max(0,s.time-this.observed);if(dt<1e-9)return {valid:true,reset:false,dt:0};this.observed=s.time;
   if(dt>.25)return this.fail('TIME_GAP_RESET_REQUIRED');
   this.remainder+=dt;
   try{while(this.remainder>=P.step-1e-10){this.step(P.step);this.remainder-=P.step;}}
   catch(e){return this.fail(e.message||'INVALID_FLIGHT');}
   return {valid:true,reset:false,dt};
  }
  step(dt){
   const endTime=this.time+dt,active=[];
   for(const shot of this.shells){
    const next=advance(shot.p,shot.v,dt);let first=Infinity,hit=null;
    for(const target of this.targets){if(target.hit)continue;const h=sphereHit(shot.p,next.p,this.center(target,endTime),target.radius);if(h!==null&&h<first){first=h;hit=target;}}
    const d0=shot.p.y-this.height(shot.p.x,shot.p.z,this.time),d1=next.p.y-this.height(next.p.x,next.p.z,endTime);
    if(d0<=0){first=0;hit=null;}else if(d1<=0){let a=0,b=1;for(let j=0;j<12;j++){const f=(a+b)/2,q=lerp(shot.p,next.p,f);if(q.y>this.height(q.x,q.z,this.time+dt*f))a=f;else b=f;}if(b<first){first=b;hit=null;}}
    if(Number.isFinite(first)){
     const q=lerp(shot.p,next.p,first),at=this.time+dt*first;
     if(hit){hit.hit=true;hit.hitAt=at;this.hits++;}
     this.impacts.push({id:shot.id,kind:hit?'target':'water',targetId:hit?.id??null,p:q,time:at});if(this.impacts.length>12)this.impacts.shift();
    }else if(endTime-shot.born<P.maxAge){shot.previous=shot.p;shot.p=next.p;shot.v=next.v;active.push(shot);}
   }
   this.shells=active;this.time=endTime;
  }
  fire(s,starts,direction,inherited={x:0,y:0,z:0}){
   const o=this.observe(s);if(!o.valid)return o;
   if(s.paused)return {valid:false,reason:'PAUSED'};
   if(!Array.isArray(starts)||starts.length!==2||!starts.every(finite)||!finite(direction)||!finite(inherited))return {valid:false,reason:'INVALID_LAUNCH'};
   if(this.targets.every(t=>t.hit))return {valid:false,reason:'RANGE_COMPLETE'};
   if(this.time<this.coolUntil-1e-9)return {valid:false,reason:'RELOADING'};
   if(this.shells.length+2>P.maxShells)return {valid:false,reason:'CAPACITY'};
   const norm=Math.hypot(direction.x,direction.y,direction.z);if(norm<.9||norm>1.1||direction.y<-.01)return {valid:false,reason:'INVALID_DIRECTION'};
   this.shots++;this.coolUntil=this.time+P.cooldown;
   for(const p of starts){const v={x:direction.x/norm*P.speed+inherited.x,y:direction.y/norm*P.speed+inherited.y,z:direction.z/norm*P.speed+inherited.z};this.shells.push({id:++this.serial,born:this.time,p:copy(p),previous:copy(p),v,origin:copy(p)});}
   return {valid:true,ids:this.shells.slice(-2).map(p=>p.id),time:this.time};
  }
  cancel(){this.shells=[];}
  inspect(){return JSON.parse(JSON.stringify({epoch:this.epoch,time:this.time,observed:this.observed,shots:this.shots,hits:this.hits,coolUntil:this.coolUntil,shells:this.shells,targets:this.targets,impacts:this.impacts,invalid:this.invalid,reason:this.reason}));}
 }
 function carriedVelocity(s,muzzle){
  const c=Math.cos(s.heading),h=Math.sin(s.heading),u=s.forwardMps??0,v=s.sideMps??0,r=s.yawRate??0;
  return {x:c*u-h*v-r*(muzzle.z-s.z),y:0,z:h*u+c*v+r*(muzzle.x-s.x)};
 }
 const api={P,FlightWorld,advance,sphereHit,carriedVelocity,clamp};G.AtlasFlight=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
