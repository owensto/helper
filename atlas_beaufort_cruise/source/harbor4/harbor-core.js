/* SI units, X forward/Z starboard/Y up. Shared production policies; no DOM or clocks. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasHarborCore=a;})(globalThis,()=>{'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function smooth(a,b,x){const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q);}
function overlapHull(p,b,pad=.45){
 const c=Math.cos(p.heading),s=Math.sin(p.heading),cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,dx=cx-p.x,dz=cz-p.z,ex=(b.x1-b.x0)/2,ez=(b.z1-b.z0)/2,L=4.65+pad,W=1.55+pad;
 return Math.abs(dx)<=ex+Math.abs(c)*L+Math.abs(s)*W && Math.abs(dz)<=ez+Math.abs(s)*L+Math.abs(c)*W && Math.abs(dx*c+dz*s)<=L+ex*Math.abs(c)+ez*Math.abs(s) && Math.abs(-dx*s+dz*c)<=W+ex*Math.abs(s)+ez*Math.abs(c);
}
function checkedPose(p,env,minDepth=1.65){
 if(!p||![p.x,p.z,p.heading].every(Number.isFinite)||!['beaufort','basin'].includes(p.location))return false;
 const tide=p.location==='beaufort'?(Number.isFinite(env.tide)?env.tide:0):0,c=Math.cos(p.heading),s=Math.sin(p.heading);
 for(const [a,b]of [[0,0],[4.6,0],[-4.6,0],[3.5,1.6],[3.5,-1.6],[-3.5,1.6],[-3.5,-1.6]]){
  const q=env.sample(p.x+c*a-s*b,p.z+s*a+c*b,p.location);
  if(!q||q.known!==true||q.land||!Number.isFinite(q.depth)||q.depth+tide<minDepth)return false;
 }
 return !env.obstacles(p).some(b=>overlapHull(p,b));
}
class RecoveryBook{
 constructor(){this.anchors=[];this.next=-Infinity;this.location=null;}
 observe(s,env){if(this.location!==s.location){this.anchors=[];this.next=-Infinity;this.location=s.location;}if(s.elapsed<this.next-2)this.next=-Infinity;
  if(!Number.isFinite(s.elapsed)||s.elapsed<this.next)return;this.next=s.elapsed+1;
  if(s.destroyed10||s.engineDisabled10||s.contact||s.grounded||s.airborne||Math.abs(s.roll||0)>.18||Math.abs(s.pitch||0)>.2)return;
  const p={x:s.x,z:s.z,heading:s.heading,location:s.location,t:s.elapsed};if(!checkedPose(p,env))return;
  const last=this.anchors.at(-1);if(last&&Math.hypot(last.x-p.x,last.z-p.z)<5)return;
  this.anchors.push(p);if(this.anchors.length>120)this.anchors.shift();
 }
 plan(s,env){
  // Recheck at today's scenario tide. An old "safe" breadcrumb is not authoritative.
  for(let i=this.anchors.length-1;i>=0;i--){const p=this.anchors[i],d=Math.hypot(p.x-s.x,p.z-s.z);
   if(p.location===s.location&&d>=6&&d<=450&&checkedPose(p,env))return {...p,reason:'last checked clear water',distance:d};}
  // Near-site search only: never silently substitute a sandbox or distant launch.
  for(const r of[12,20,32,48,72,108,156])for(let i=0;i<24;i++){
   const a=s.heading+Math.PI+i*Math.PI/12,p={x:s.x+Math.cos(a)*r,z:s.z+Math.sin(a)*r,heading:s.heading,location:s.location};
   if(checkedPose(p,env))return {...p,reason:'nearby checked water',distance:r};
  }
  return null;
 }
}
function restoreSnapshot(s){return {elapsed:s.elapsed,distance:s.distance,fuelUsedGal:s.fuelUsedGal,environment:s.environment,trim:s.trim,trimActual:s.trimActual,config:{...s.config},performanceMode:s.performanceMode};}
function restoreAfterRecovery(s,save,p,surface){
 s.config={...save.config,location:p.location};s.location=p.location;s.environment=save.environment;s.performanceMode=save.performanceMode;
 for(const k of['elapsed','distance','fuelUsedGal'])if(Number.isFinite(save[k]))s[k]=save[k];
 s.x=p.x;s.z=p.z;s.heading=p.heading;s.engine=false;s.throttle=0;s.gear=0;s.steer=0;s.rudder=0;s.rpm=0;s.startTimer=0;s.clutch14=0;
 for(const k of['vx','vz','u','v','yaw','verticalVel','pitchVel','rollVel','pitch','roll','speedOverGround'])s[k]=0;
 if(Number.isFinite(save.trim))s.trim=save.trim;if(Number.isFinite(save.trimActual))s.trimActual=save.trimActual;s.heave=surface(p.x,p.z,s.elapsed,s.environment);s.hullHealth10=100;s.destroyed10=false;s.engineDisabled10=false;s.contact=false;s.grounded=false;s.airborne=false;s.groundForce=0;s.wasBottomContact=false;s.bottomClearance=null;s.lastHardImpact10=-99;
}
function chasePose(s,yaw=0,elevation=.29,distance=14){const a=s.heading+Math.PI+yaw,d=clamp(distance,7,42),h=clamp(elevation,.08,1.1),y=(s.config?.tide||0)+(s.heave||0);
 return {position:[s.x+Math.cos(a)*Math.cos(h)*d,y+1.25+Math.sin(h)*d,s.z+Math.sin(a)*Math.cos(h)*d],target:[s.x+Math.cos(s.heading)*2.0,y+1.15,s.z+Math.sin(s.heading)*2.0]};}
function opticalPath(depth,cosAir){const c=clamp(cosAir,0,1);return Math.max(0,depth)/Math.sqrt(1-(1-c*c)/(1.333*1.333));}
function wildlifeWater(x,z,env,radius=2.4){const q=env.sample(x,z,'beaufort');return !!q&&q.known===true&&!q.land&&Number.isFinite(q.depth)&&q.depth+env.tide>2.8&&!env.obstacles({x,z,heading:0,location:'beaufort'}).some(b=>x>b.x0-radius&&x<b.x1+radius&&z>b.z0-radius&&z<b.z1+radius);}
class Pod{
 constructor(env){this.env=env;this.animals=[];this.elapsed=0;this.initialized=false;this.nextSeed=-Infinity;}
 seed(s){if(this.initialized||s.location!=='beaufort'||s.elapsed<this.nextSeed)return;this.initialized=true;this.nextSeed=s.elapsed+3;const env=this.env;
  for(let i=0;i<3;i++){let found=null;for(let j=0;j<40;j++){const a=s.heading+.55+j*.83,r=75+((j*19+i*11)%100),x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r;if(wildlifeWater(x,z,env)&&wildlifeWater(x+Math.cos(a)*12,z+Math.sin(a)*12,env)){found={id:i,x,z,heading:a+Math.PI/2,phase:i*2.2,depth:1,speed:2.15+i*.12,active:true,blocked:0};break;}}if(found)this.animals.push(found);}if(!this.animals.length)this.initialized=false;
 }
 step(s,dt){if(!Number.isFinite(dt)||dt<=0||s.location!=='beaufort')return;this.seed(s);const total=Math.min(4,dt),steps=Math.ceil(total/.10);for(let sub=0;sub<steps;sub++){const slice=total/steps,t=Number.isFinite(s.elapsed)?s.elapsed-total+(sub+1)*slice:this.elapsed+slice;this.integrate(s,slice,t);}}
 integrate(s,dt,t){this.elapsed=t;
  for(const d of this.animals){if(!d.active)continue;const dist=Math.hypot(d.x-s.x,d.z-s.z),a=Math.atan2(d.z-s.z,d.x-s.x);
   let desired=d.heading+Math.sin(this.elapsed*.12+d.phase)*.20*dt;if(dist<48)desired=a;else if(dist>260)desired=a+Math.PI;
   const speed=d.speed*(dist<48?1.35:1);d.heading+=clamp(angle(desired-d.heading),-.7*dt,.7*dt);
   let nx=d.x+Math.cos(d.heading)*speed*dt,nz=d.z+Math.sin(d.heading)*speed*dt;
   if(wildlifeWater(nx+Math.cos(d.heading)*5,nz+Math.sin(d.heading)*5,this.env)&&wildlifeWater(nx,nz,this.env)){d.x=nx;d.z=nz;d.blocked=0;}else{d.heading+=1.1*dt;d.blocked+=dt;}
   // Brief, staggered breathing rolls, not a constant jumping display.
   const cycle=((this.elapsed+d.phase)%13+13)%13,breath=smooth(0,1.15,cycle)*(1-smooth(2.5,4.1,cycle));
   d.depth=1.25-1.12*breath;d.pitch=.07*Math.sin((cycle-.4)*Math.PI/2.8)*breath;d.roll=.045*Math.sin(this.elapsed*.6+d.phase);
   d.stroke=this.elapsed*(2.5+speed*.30)+d.phase;d.surface=breath>.72;
  }
 }
}
return Object.freeze({clamp,mix,angle,smooth,overlapHull,checkedPose,RecoveryBook,restoreSnapshot,restoreAfterRecovery,chasePose,opticalPath,wildlifeWater,Pod});});
