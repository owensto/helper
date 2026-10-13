/* Deliberately uncalibrated recreational handling. Not a sea-trial prediction. */
(function(global){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class BayMotion {
 constructor(){this.reset()}
 reset(){this.x=-8;this.z=0;this.heading=0;this.u=0;this.vx=0;this.vz=0;this.yaw=0;this.throttle=0;this.steer=0;this.gear=0;this.engine=false;this.distance=0;this.contact=false;this.elapsed=0;}
 step(dt,obstacles=[]){dt=clamp(Number(dt)||0,0,.04);this.elapsed+=dt;this.contact=false;
  const thrust=this.engine?this.gear*this.throttle*(this.gear<0?1.75:4.8):0;
  this.u+=(thrust-.16*this.u-.022*this.u*Math.abs(this.u))*dt;
  if(Math.abs(this.u)<.006 && !thrust)this.u=0;
  const targetYaw=this.steer*this.u*.065/(1+Math.abs(this.u)*.08);
  this.yaw+=(targetYaw-this.yaw)*(1-Math.exp(-3.3*dt));this.heading+=this.yaw*dt;
  const f=Math.min(1,dt*2.2);this.vx+=(Math.cos(this.heading)*this.u-this.vx)*f;this.vz+=(Math.sin(this.heading)*this.u-this.vz)*f;
  const px=this.x,pz=this.z;this.x+=this.vx*dt;this.z+=this.vz*dt;
  for(const o of obstacles){let hit=false;
   for(const a of [-3.3,-1.6,0,1.6,3.3]){const x=this.x+a*Math.cos(this.heading),z=this.z+a*Math.sin(this.heading);const qx=clamp(x,o.x0,o.x1),qz=clamp(z,o.z0,o.z1);if((x-qx)**2+(z-qz)**2<1.28**2){hit=true;break}}
   if(hit){this.x=px;this.z=pz;this.u*=.08;this.vx=0;this.vz=0;this.yaw*=.3;this.contact=true;break}
  }
  if(Math.hypot(this.x,this.z)>520){this.x=px;this.z=pz;this.u=0;this.vx=0;this.vz=0;this.contact=true;}
  this.distance+=Math.hypot(this.x-px,this.z-pz);
 }
 stop(){this.throttle=0;this.gear=0;this.u=0;this.vx=0;this.vz=0;this.yaw=0;}
 snapshot(){return {x:this.x,z:this.z,heading:this.heading,speed:this.u,throttle:this.throttle,steer:this.steer,gear:this.gear,engine:this.engine,distance:this.distance}}
}
global.BayMotion=BayMotion;if(typeof module!=='undefined')module.exports=BayMotion;
})(typeof window!=='undefined'?window:globalThis);
