/* Y14 force-based solo simulation. Uniform current-relative surge/sway/yaw,
 * above-water wind force, spatially averaged wave excitation and force-limited depth.
 * Fossen relative-motion form informs the current treatment; coefficients are authored,
 * not tank/CFD/sea-trial calibrated. This is NOT a complete 6DOF pressure/ballast model.
 * No clocks or global controller edits: one existing fixed-step owner calls step().
 */
(function(G){'use strict';
const B=G.AtlasFleetDynamics||(typeof require==='function'?require('../y12/dynamics.js'):null),F=G.AtlasFleet||(typeof require==='function'?require('../y12/fleet.js'):null),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite;
const ENV=Object.freeze({still:Object.freeze({name:'Still water',currentX:0,currentZ:0,windX:0,windZ:0}),coastal:Object.freeze({name:'Coastal drift',currentX:.30,currentZ:.45,windX:3,windZ:-4}),crosswind:Object.freeze({name:'Crosswind',currentX:0,currentZ:.75,windX:0,windZ:9})});
const extra=Object.freeze({d:{windFrontM2:125,windSideM2:720,windHeightM:8,verticalTau:3,verticalAcceleration:.07},n:{windFrontM2:32,windSideM2:110,windHeightM:4,verticalTau:2.7,verticalAcceleration:.09},pod:{windFrontM2:3.5,windSideM2:5.2,windHeightM:.6,verticalTau:1.3,verticalAcceleration:.12},w:{windFrontM2:220,windSideM2:1250,windHeightM:10,verticalTau:3.5,verticalAcceleration:.06}});
const profiles=Object.freeze(Object.fromEntries(Object.entries(F.FLEET).map(([k,p])=>[k,Object.freeze({...p,...extra[k],modelVersion:'atlas-sumars-y14-current-depth-1'})])));
function relative(u,v,heading,e){const c=Math.cos(heading),s=Math.sin(heading),cx=c*e.currentX+s*e.currentZ,cz=-s*e.currentX+c*e.currentZ;return {u:u-cx,v:v-cz,currentU:cx,currentV:cz};}
function wind(p,u,v,heading,depth,e){const c=Math.cos(heading),s=Math.sin(heading),x=c*e.windX+s*e.windZ-u,z=-s*e.windX+c*e.windZ-v,exposed=Math.exp(-Math.max(0,depth)/1.2);const X=.5*1.225*p.windFrontM2*.85*x*Math.abs(x)*exposed,Y=.5*1.225*p.windSideM2*1.05*z*Math.abs(z)*exposed;return [X,Y,Y*p.length*.06];}
function derivatives(p,a,thrust,delta,bow,depth,e){const [u,v,r,h]=a,rel=relative(u,v,h,e),acc=B.acceleration(p,rel.u,rel.v,r,thrust,delta,bow,p.draft),W=wind(p,u,v,h,depth,e),[mx,my,iz]=B.masses(p);return [acc[0]+r*rel.currentV+W[0]/mx,acc[1]-r*rel.currentU+W[1]/my,acc[2]+W[2]/iz,r];}
function integrate(p,a,dt,thrust,delta,bow,depth,e){const f=b=>derivatives(p,b,thrust,delta,bow,depth,e),add=(x,y,k)=>x.map((v,i)=>v+y[i]*k),k1=f(a),k2=f(add(a,k1,dt/2)),k3=f(add(a,k2,dt/2)),k4=f(add(a,k3,dt));return a.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
function oscillator(x,v,target,period,zeta,dt){const w=2*Math.PI/period;v+=(w*w*(target-x)-2*zeta*w*v)*dt;return [x+v*dt,v];}
function waveTargets(s,p,fun){let sum=0,wx=0,wz=0,xx=0,zz=0,n=0;const c=Math.cos(s.heading),v=Math.sin(s.heading);for(let i=0;i<7;i++)for(const j of [-1,0,1]){const a=(i/6-.5)*p.length*.85,b=j*p.beam*.4,h=fun(s.x+c*a-v*b,s.z+v*a+c*b,s.elapsed);if(!finite(h))continue;sum+=h;wx+=a*h;wz+=b*h;xx+=a*a;zz+=b*b;n++;}const fade=Math.exp(-s.depthM/4),W=wind(p,s.speedMps,s.swayMps,s.heading,s.depthM,s.environment),heel=(-s.speedMps*s.yawRate*p.forceHeight+W[1]*p.windHeightM/p.mass)/(9.80665*p.rollGm);return [n?sum/n*fade:0,clamp((-wz/(zz||1)+heel)*fade,-.18,.18),clamp(wx/(xx||1)*fade,-.09,.09)];}
class Vessel extends B.Vessel{
 constructor(profile){super(profiles[profile?.key]||profile);if(!finite(this.p.windSideM2))throw Error('Y14 profile required');}
 reset(){super.reset();this.environment=ENV.still;this.environmentKey='still';this.verticalForceN=0;this.shaftPhase=0;this.waveHeightMeanM=0;this.lastAcceleration=[0,0,0];}
 setEnvironment(key){if(!Object.hasOwn(ENV,key))return false;this.environment=ENV[key];this.environmentKey=key;this.message=key==='still'?'Still water: no current or wind.':'Environmental forces active: '+ENV[key].name+'. Course may differ from heading.';return true;}
 command(name,value,sample=B.bottom){if(name==='environment')return this.setEnvironment(value);return super.command(name,value,sample);}
 step(dt,sample=B.bottom,waves=B.wave){
  if(!finite(dt)||dt<0||dt>.25)throw new RangeError('Finite step 0–0.25 seconds required');if(this.paused||dt===0)return;
  const p=this.p;this.elapsed+=dt;this.sequence++;this.contact=false;
  if(this.mode==='securing'){this.throttle=0;this.gear=0;this.conversion=clamp(this.conversion+dt/p.conversionSeconds,0,1);if(this.conversion===1){this.mode='secured';this.message='Exterior secured. Dive when ready.';}}
  if(this.mode==='deploying'){this.throttle=0;this.gear=0;this.conversion=clamp(this.conversion-dt/p.conversionSeconds,0,1);if(this.conversion===0){this.mode='surface';this.message='Yacht exterior restored.';}}
  const subBlend=clamp(this.depthM/4,0,1),thrust=this.engine?this.gear*this.throttle*(p.forwardThrust*(1-subBlend)+p.subThrust*subBlend)*(this.gear<0?p.reverseFraction:1):0;
  const count=Math.max(1,Math.ceil(dt*60)),ds=dt/count;
  for(let i=0;i<count;i++){
   this.thrustN+=(thrust-this.thrustN)*(-Math.expm1(-ds/p.thrustTau));this.rudderAngleRad+=clamp(this.rudder*p.rudderMax-this.rudderAngleRad,-p.rudderRate*ds,p.rudderRate*ds);this.bowActual+=((this.engine?this.bowThruster:0)-this.bowActual)*(-Math.expm1(-ds/p.bowTau));
   const before=[this.speedMps,this.swayMps,this.yawRate,this.heading];let next=integrate(p,before,ds,this.thrustN,this.rudderAngleRad,this.bowActual,this.depthM,this.environment);
   const mid=(before[3]+next[3])*.5,u=(before[0]+next[0])*.5,v=(before[1]+next[1])*.5,nx=this.x+(Math.cos(mid)*u-Math.sin(mid)*v)*ds,nz=this.z+(Math.sin(mid)*u+Math.cos(mid)*v)*ds,nh=(next[3]%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
   const q=this.clearance(sample,nx,nz,this.depthM,this.heaveM,nh);
   if(!q.known||q.clearanceM<.05){this.speedMps=this.swayMps=this.yawRate=this.thrustN=this.throttle=0;this.contact=q.known;this.message=q.known?'Bottom contact. Power idled; surface or reverse clear.':'Unknown bottom coverage. Motion stopped; return to the fleet to relaunch.';}
   else{[this.speedMps,this.swayMps,this.yawRate]=next;this.heading=nh;this.x=nx;this.z=nz;}
   this.lastAcceleration=[(this.speedMps-before[0])/ds,(this.swayMps-before[1])/ds,(this.yawRate-before[2])/ds];
   const targets=waveTargets(this,p,waves);this.waveHeightMeanM=targets[0];[this.heaveM,this.heaveRate]=oscillator(this.heaveM,this.heaveRate,targets[0],p.heavePeriod,p.heaveDamping,ds);[this.roll,this.rollRate]=oscillator(this.roll,this.rollRate,targets[1],p.rollPeriod,p.rollDamping,ds);[this.pitch,this.pitchRate]=oscillator(this.pitch,this.pitchRate,targets[2],p.pitchPeriod,p.pitchDamping,ds);
   const movingDepth=['diving','submerged','surfacing'].includes(this.mode);if(movingDepth){const target=this.mode==='surfacing'?0:this.targetDepthM,desired=clamp((target-this.depthM)*.20,-p.ascentRate,p.diveRate),verticalMass=p.mass*1.25,drag=.16*this.verticalMps+.12*this.verticalMps*Math.abs(this.verticalMps),accel=clamp((desired-this.verticalMps)*.60,-p.verticalAcceleration,p.verticalAcceleration),demand=verticalMass*(accel+drag),maxForce=verticalMass*(p.verticalAcceleration+.16*p.diveRate+.12*p.diveRate**2);
    this.verticalForceN+=(clamp(demand,-maxForce,maxForce)-this.verticalForceN)*(-Math.expm1(-ds/p.verticalTau));this.verticalMps+=(this.verticalForceN/verticalMass-drag)*ds;let nd=Math.max(0,this.depthM+this.verticalMps*ds),vq=this.clearance(sample,this.x,this.z,nd);
    if(nd>this.depthM&&(!vq.known||vq.clearanceM<p.margin)){nd=this.depthM;this.verticalMps=0;this.verticalForceN=0;this.mode='surfacing';this.message='Descent blocked by bottom margin or unknown coverage. Safety ascent.';}this.depthM=nd;
    if(this.mode==='diving'&&Math.abs(nd-this.targetDepthM)<.08&&Math.abs(this.verticalMps)<.04){this.mode='submerged';this.message='Depth hold. Forces and vertical rate shown in Instruments.';}
    if(this.mode==='surfacing'&&nd<.03&&Math.abs(this.verticalMps)<.06){this.depthM=0;this.verticalMps=0;this.verticalForceN=0;this.mode='secured';this.message=p.needsSecure?'Surface reached. Neutral and reopen when stopped.':'Surface reached.';}
   }else{this.verticalMps=0;this.verticalForceN=0;}
   this.shaftPhase=(this.shaftPhase+Math.sign(this.thrustN)*Math.sqrt(Math.abs(this.thrustN)/p.forwardThrust)*10*ds)%(Math.PI*2);
  }
  this.observe(sample);if(![this.x,this.z,this.heading,this.speedMps,this.swayMps,this.yawRate,this.depthM,this.verticalMps,this.heaveM,this.roll,this.pitch].every(finite)){this.pause('invalid');throw Error('Nonfinite dynamics rejected');}
 }
 snapshot(){const s=super.snapshot(),r=relative(this.speedMps,this.swayMps,this.heading,this.environment),c=Math.cos(this.heading),q=Math.sin(this.heading),gx=c*this.speedMps-q*this.swayMps,gz=q*this.speedMps+c*this.swayMps,sog=Math.hypot(gx,gz);return {...s,environment:this.environmentKey,currentX:this.environment.currentX,currentZ:this.environment.currentZ,windX:this.environment.windX,windZ:this.environment.windZ,speedOverGroundMps:sog,speedThroughWaterMps:Math.hypot(r.u,r.v),waterRelativeSurgeMps:r.u,waterRelativeSwayMps:r.v,groundVelocityX:gx,groundVelocityZ:gz,courseOverGroundRad:sog>.05?((Math.atan2(gx,-gz)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)):null,verticalForceN:this.verticalForceN,verticalForceFractionWeight:this.verticalForceN/(this.p.mass*9.80665),shaftPhase:this.shaftPhase,waveHeightMeanM:this.waveHeightMeanM,accelerationMps2:this.lastAcceleration.slice()};}
}
const API={Vessel,profiles,ENV,relative,wind,derivatives,integrate,waveTargets,bed:B.bed,bottom:B.bottom,wave:B.wave};G.AtlasSimulation14=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
