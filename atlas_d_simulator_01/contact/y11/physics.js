/* ATLAS D Y11 / authored concept dynamics. NOT sea-trial calibration.
   Basis: M nu_dot + C(nu)nu + D(nu)nu = tau (Fossen marine craft model).
   SI; body u forward(+X), v starboard(+Z), r heading rate toward +Z.
   3DOF maneuvering + separately damped heave/roll/pitch; NOT full 6DOF hydrodynamics.
   Original operating state machine and its fail-closed depth interlocks retained.
*/
(function(G){'use strict';
const B=G.AtlasDCore||(typeof require==='function'?require('../../live/atlas-d-core.js'):null);
if(!B)throw Error('Load the original AtlasDCore first');
const S=B.SPEC,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=Number.isFinite;
const P=Object.freeze({id:'atlas-d-y11-3dof-1',massKg:2400000,addedSurgeFraction:.05,addedSwayFraction:.8,addedYawFraction:.25,
 surgeLinear:12000,surgeQuadratic:2800,swayLinear:200000,yawLinear:60000000,crossflowCd:1.0,waterDensity:1025,
 forwardThrustN:231552,reverseFraction:.42,submergedThrustN:61200,thrustTimeConstantS:2.5,
 rudderAreaM2:4.2,rudderNormalCoefficient:2.2,rudderLeverM:-32,rudderMaxRad:Math.PI/6,rudderRateRadS:5*Math.PI/180,
 propellerDiskAreaM2:80,propwashFactor:.6,bowThrustN:35000,bowLeverM:32,
 heavePeriodS:6.5,rollPeriodS:9.5,pitchPeriodS:7.5,heaveDampingRatio:.72,rollDampingRatio:.5,pitchDampingRatio:.68,
 rollGmM:2.5,cgForceHeightM:2.0,validatedBySeaTrials:false,parameterSource:'Authored concept assumptions; not vessel measurements'});
const MX=P.massKg*(1+P.addedSurgeFraction),MY=P.massKg*(1+P.addedSwayFraction),IZ=P.massKg*(S.lengthM**2+S.beamM**2)/12*(1+P.addedYawFraction);
function forces(u,v,r,thrust,delta,bow,draft){
 let X=thrust-P.surgeLinear*u-P.surgeQuadratic*u*Math.abs(u),Y=-P.swayLinear*v,N=-P.yawLinear*r;
 // Distributed hull crossflow: each strip opposes its local lateral velocity.
 const dx=S.lengthM/16;
 for(let i=0;i<16;i++){const x=-S.lengthM/2+(i+.5)*dx,q=v+x*r,f=-.5*P.waterDensity*P.crossflowCd*draft*dx*q*Math.abs(q);Y+=f;N+=x*f;}
 const wash=P.propwashFactor*Math.sign(thrust)*Math.sqrt(Math.abs(thrust)/(P.waterDensity*P.propellerDiskAreaM2));
 const ur=u+wash,vr=v+P.rudderLeverM*r,sn=Math.sin(delta),cs=Math.cos(delta),vn=ur*sn+vr*cs;
 const normal=-.5*P.waterDensity*P.rudderAreaM2*P.rudderNormalCoefficient*Math.hypot(ur,vr)*vn;
 X+=normal*sn;Y+=normal*cs;N+=P.rudderLeverM*normal*cs;
 const by=P.bowThrustN*bow/(1+(u/1.5)**2);Y+=by;N+=P.bowLeverM*by;
 return {X,Y,N};
}
function acceleration(u,v,r,thrust=0,delta=0,bow=0,draft=4.507){const f=forces(u,v,r,thrust,delta,bow,draft);return [(f.X+MY*v*r)/MX,(f.Y-MX*u*r)/MY,(f.N+(MX-MY)*u*v)/IZ];}
function integrate(a,dt,thrust,delta,bow,draft){const f=b=>acceleration(...b,thrust,delta,bow,draft),plus=(x,k,s)=>x.map((v,i)=>v+s*k[i]);const k1=f(a),k2=f(plus(a,k1,dt/2)),k3=f(plus(a,k2,dt/2)),k4=f(plus(a,k3,dt));return a.map((x,i)=>x+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
function oscillator(value,rate,target,period,zeta,dt){const w=2*Math.PI/period;const a=w*w*(target-value)-2*zeta*w*rate;rate+=a*dt;return [value+rate*dt,rate];}
class Vessel extends B.Vessel{
 reset(){super.reset();Object.assign(this,{swayMps:0,thrustN:0,rudderAngleRad:0,bowActual:0,heaveRate:0,rollRate:0,pitchRate:0,accelForwardMps2:0,accelStarboardMps2:0,forceX:0,forceZ:0,momentYaw:0});}
 command(name,value,sample=B.provingSample){
  if(['secure','deploy','dive'].includes(name)&&Math.abs(this.swayMps)>.2)return this.reject('Wait for lateral drift to settle before changing vessel configuration.');
  return super.command(name,value,sample);
 }
 clearance(sample,x=this.x,z=this.z,depth=this.depthM,waterLevel=this.heaveM,heading=this.heading){
  const q=super.clearance(sample,x,z,depth,waterLevel,heading);
  // Additional conservative tilt allowance. Original 39-point footprint is not reduced.
  const tilt=Math.abs(Math.sin(this.pitch))*S.lengthM/2+Math.abs(Math.sin(this.roll))*S.beamM/2;
  if(q.clearanceM!==null)q.clearanceM-=tilt;
  return q;
 }
 observe(sample,wave=()=>0){const q=this.clearance(sample);this.depthKnown=q.known;this.clearanceM=q.clearanceM;this.waterDepthM=q.waterDepthM;return q;}
 waveTargets(wave){
  const c=Math.cos(this.heading),s=Math.sin(this.heading),h=(a,b)=>{const y=wave(this.x+c*a-s*b,this.z+s*a+c*b,this.elapsed);return finite(y)?y:0;};
  const bow=h(32,0),stern=h(-32,0),port=h(0,-6),starboard=h(0,6),fade=Math.exp(-this.depthM/4);
  // Stable, authored restoring model. No claimed real-vessel RAOs or hydrostatic calibration.
  const turnHeel=-this.speedMps*this.yawRate*P.cgForceHeightM/(9.80665*P.rollGmM)*fade;
  return [(bow+stern+port+starboard)/4*fade,clamp((port-starboard)/12*fade+turnHeel,-.18,.18),clamp((bow-stern)/64,-.09,.09)*fade];
 }
 step(dt,sample=B.provingSample,wave=()=>0){
  if(!finite(dt)||dt<0||dt>.25)throw new RangeError('Use a finite simulation step between 0 and 0.25 seconds.');
  if(this.paused||dt===0)return;
  this.elapsed+=dt;this.sequence++;this.contact=false;
  if(this.mode==='securing'){this.conversion=clamp(this.conversion+dt/S.conversionSeconds,0,1);this.throttle=0;this.gear=0;if(this.conversion>=1){this.mode='secured';this.message='Exterior secured. Choose a depth and Dive.';}}
  else if(this.mode==='deploying'){this.conversion=clamp(this.conversion-dt/S.conversionSeconds,0,1);this.throttle=0;this.gear=0;if(this.conversion<=0){this.mode='surface';this.message='Surface yacht arrangement restored.';}}
  const targetThrust=this.engine?this.gear*this.throttle*(this.depthM>1?P.submergedThrustN:P.forwardThrustN)*(this.gear<0?P.reverseFraction:1):0;
  const n=Math.ceil(dt/(1/60)),ds=dt/n;
  for(let i=0;i<n;i++){
   this.thrustN+=(targetThrust-this.thrustN)*(1-Math.exp(-ds/P.thrustTimeConstantS));
   this.rudderAngleRad+=clamp(this.rudder*P.rudderMaxRad-this.rudderAngleRad,-P.rudderRateRadS*ds,P.rudderRateRadS*ds);
   this.bowActual+=((this.engine?this.bowThruster:0)-this.bowActual)*(1-Math.exp(-ds/1.2));
   [this.speedMps,this.swayMps,this.yawRate]=integrate([this.speedMps,this.swayMps,this.yawRate],ds,this.thrustN,this.rudderAngleRad,this.bowActual,this.draftM);
   const targets=this.waveTargets(wave);
   [this.heaveM,this.heaveRate]=oscillator(this.heaveM,this.heaveRate,targets[0],P.heavePeriodS,P.heaveDampingRatio,ds);
   [this.roll,this.rollRate]=oscillator(this.roll,this.rollRate,targets[1],P.rollPeriodS,P.rollDampingRatio,ds);
   [this.pitch,this.pitchRate]=oscillator(this.pitch,this.pitchRate,targets[2],P.pitchPeriodS,P.pitchDampingRatio,ds);
  }
  const f=forces(this.speedMps,this.swayMps,this.yawRate,this.thrustN,this.rudderAngleRad,this.bowActual,this.draftM);
  this.forceX=f.X;this.forceZ=f.Y;this.momentYaw=f.N;this.accelForwardMps2=f.X/MX;this.accelStarboardMps2=f.Y/MY;
  const h=(this.heading+this.yawRate*dt+2*Math.PI)%(2*Math.PI),c=Math.cos(h),s=Math.sin(h);
  const nx=this.x+(c*this.speedMps-s*this.swayMps)*dt,nz=this.z+(s*this.speedMps+c*this.swayMps)*dt;
  const q=this.clearance(sample,nx,nz,this.depthM,this.heaveM,h);
  if(!q.known&&this.depthM>.1){this.speedMps=0;this.swayMps=0;this.yawRate=0;this.message='Movement blocked: unknown bottom coverage while submerged. Surface to continue.';}
  else if(q.known&&q.clearanceM<.05){this.speedMps=0;this.swayMps=0;this.yawRate=0;this.thrustN=0;this.contact=true;this.throttle=0;this.message='BOTTOM CONTACT — propulsion idled. Surface or move clear.';}
  else{this.x=nx;this.z=nz;this.heading=h;}
  // Retained bounded depth controller: intentionally not a validated ballast/pressure model.
  let target=['diving','submerged'].includes(this.mode)?this.targetDepthM:this.mode==='surfacing'?0:this.depthM;
  const requested=clamp((target-this.depthM)*.22,-S.maxAscentRateMps,S.maxDiveRateMps);
  this.verticalMps+=(requested-this.verticalMps)*(1-Math.exp(-.8*dt));
  let nextDepth=Math.max(0,this.depthM+this.verticalMps*dt);const vq=this.clearance(sample,this.x,this.z,nextDepth);
  if(nextDepth>this.depthM&&(!vq.known||vq.clearanceM<S.bottomMarginM)){nextDepth=this.depthM;this.verticalMps=0;this.mode='surfacing';this.message='Descent stopped: bottom margin or chart coverage lost. Automatic simulated ascent engaged.';}
  this.depthM=nextDepth;
  if(this.mode==='diving'&&Math.abs(this.depthM-this.targetDepthM)<.06&&Math.abs(this.verticalMps)<.04){this.mode='submerged';this.message='Depth hold engaged. Concept depth control; not pressure-rated.';}
  if(this.mode==='surfacing'&&this.depthM<.03&&Math.abs(this.verticalMps)<.03){this.depthM=0;this.verticalMps=0;this.mode='secured';this.message='Surface reached. Neutral, idle and Deploy yacht to reopen.';}
  this.ballast=this.depthM>.03?clamp(.5+(target-this.depthM)*.015,.42,.58):this.mode==='diving'?.58:0;
  this.observe(sample,wave);
  if(![this.x,this.z,this.heading,this.speedMps,this.swayMps,this.yawRate,this.heaveM,this.roll,this.pitch].every(finite)){this.paused=true;throw Error('Nonfinite dynamics; simulation stopped.');}
 }
 snapshot(){return {...super.snapshot(),physicsModel:P.id,swayMps:this.swayMps,thrustN:this.thrustN,rudderAngleRad:this.rudderAngleRad,bowActual:this.bowActual,heaveRate:this.heaveRate,rollRate:this.rollRate,pitchRate:this.pitchRate,kineticEnergyJ:.5*(MX*this.speedMps**2+MY*this.swayMps**2+IZ*this.yawRate**2)};}
}
const API={...B,Vessel,PARAMETERS:P,acceleration,forces,effectiveMass:{surge:MX,sway:MY,yaw:IZ}};
G.AtlasDY11=API;G.AtlasDCore=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
