/* Versioned solo-fleet owner. SI units; +X bow, +Y up, +Z starboard.
   Y11 force/inertia formulation generalized to actual per-vessel footprint.
   Authored parameters, synthetic offshore water. Not CFD, navigation or sea-trial calibration.
   One step(dt) consumer; no timers/RAF/global writes in this module. */
(function(G){'use strict';
const F=G.AtlasFleet||(typeof require==='function'?require('./fleet.js'):null),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite;
function bed(x,z){const hill=(a,b,c,d)=>Math.exp(-Math.pow((x-a)/c,2)-Math.pow((z-b)/d,2));return -78+98*hill(-1350,-650,520,620)+112*hill(1650,350,680,850)+63*hill(650,-100,220,260)+3*Math.sin(x*.004)*Math.sin(z*.003);}
function bottom(x,z){return finite(x)&&finite(z)&&Math.abs(x)<2800&&Math.abs(z)<2800?{known:true,bed:bed(x,z),source:'Authored offshore scenario, not Beaufort soundings'}:{known:false,bed:null,source:'No scenario depth coverage'};}
function wave(x,z,t,sea='calm'){const a=sea==='swell'?.55:sea==='breeze'?.3:.12;return a*(.6*Math.sin(.045*x+.025*z-1.05*t)+.28*Math.sin(-.08*x+.095*z-1.7*t)+.12*Math.sin(.19*x+.07*z-2.4*t));}
function masses(p){return [p.mass*(1+p.addedSurge),p.mass*(1+p.addedSway),p.mass*(p.length**2+p.beam**2)/12*(1+p.addedYaw)];}
function force(p,u,v,r,thrust,delta,bow,draft){let X=thrust-p.dragLinear*u-p.dragQuadratic*u*Math.abs(u),Y=-p.swayLinear*v,N=-p.yawLinear*r;const dx=p.length/16;
 for(let i=0;i<16;i++){const x=-p.length/2+(i+.5)*dx,q=v+x*r,f=-.5*p.rho*p.crossflowCd*draft*dx*q*Math.abs(q);Y+=f;N+=x*f;}
 const wash=p.propwash*Math.sign(thrust)*Math.sqrt(Math.abs(thrust)/(p.rho*p.diskArea)),ur=u+wash,vr=v+p.rudderLever*r,sn=Math.sin(delta),cs=Math.cos(delta),vn=ur*sn+vr*cs;
 const normal=-.5*p.rho*p.rudderArea*2.2*Math.hypot(ur,vr)*vn;X+=normal*sn;Y+=normal*cs;N+=p.rudderLever*normal*cs;
 const by=p.bowThrust*bow/(1+(u/1.5)**2);Y+=by;N+=p.bowLever*by;return [X,Y,N];}
function acceleration(p,u,v,r,thrust=0,delta=0,bow=0,draft=p.draft){const [X,Y,N]=force(p,u,v,r,thrust,delta,bow,draft),[mx,my,iz]=masses(p);return [(X+my*v*r)/mx,(Y-mx*u*r)/my,(N+(mx-my)*u*v)/iz];}
function rk(p,a,dt,thrust,delta,bow){const f=b=>acceleration(p,...b,thrust,delta,bow),add=(a,b,s)=>a.map((v,i)=>v+b[i]*s),k1=f(a),k2=f(add(a,k1,dt/2)),k3=f(add(a,k2,dt/2)),k4=f(add(a,k3,dt));return a.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
function oscillator(v,r,target,period,damping,dt){const w=2*Math.PI/period;r+=(w*w*(target-v)-2*damping*w*r)*dt;return [v+r*dt,r];}
class Vessel{
 constructor(profile){if(!profile?.id)throw Error('A known fleet profile is required');this.p=profile;this.reset();}
 reset(){Object.assign(this,{x:0,z:0,heading:0,speedMps:0,swayMps:0,yawRate:0,elapsed:0,sequence:0,engine:false,gear:0,throttle:0,rudder:0,bowThruster:0,thrustN:0,rudderAngleRad:0,bowActual:0,depthM:0,targetDepthM:this.p.key==='pod'?12:18,verticalMps:0,mode:this.p.needsSecure?'surface':'secured',conversion:this.p.needsSecure?0:1,heaveM:0,roll:0,pitch:0,heaveRate:0,rollRate:0,pitchRate:0,paused:false,pauseReason:null,contact:false,depthKnown:false,clearanceM:null,waterDepthM:null,message:'Ready. Start propulsion, select Forward, then add power.'});this.observe(bottom);}
 pause(reason='manual'){this.paused=true;this.pauseReason=reason;this.rudder=0;this.bowThruster=0;}
 resume(){this.paused=false;this.pauseReason=null;}
 clearInputs(reason='Focus lost. Power idled.'){this.throttle=0;this.rudder=0;this.bowThruster=0;this.message=reason;}
 reject(m){this.message=m;return false;}
 command(name,value,sample=bottom){
  if(name==='pause'){this.paused?this.resume():this.pause();return true;}
  if(name==='neutral'){this.gear=0;this.throttle=0;this.message='Neutral. Momentum remains; use reverse thrust to slow sooner.';return true;}
  if(name==='engine'){if(!this.engine&&(this.gear!==0||this.throttle>.01))return this.reject('Select Neutral and idle power before starting.');this.engine=!this.engine;if(!this.engine){this.throttle=0;this.gear=0;}this.message=this.engine?'Propulsion ready. Select Forward and add power.':'Propulsion off. Coasting.';return true;}
  if(name==='gear'&&[-1,0,1].includes(value)){this.gear=value;if(value===0)this.throttle=0;return true;}
  if(['throttle','rudder','bowThruster'].includes(name)&&finite(value)){this[name]=clamp(value,name==='throttle'?0:-1,1);return true;}
  if(name==='targetDepth'&&finite(value)){if(!['surface','secured'].includes(this.mode)||this.depthM>.02)return this.reject('Choose the target while surfaced.');this.targetDepthM=clamp(value,4,this.p.maxDepth);return true;}
  if(['secure','dive','surface','deploy'].includes(name)&&!this.p.submersible)return this.reject('ATLAS-W is a surface vessel. Dive controls are unavailable.');
  if(name==='secure'){if(!this.p.needsSecure)return this.reject('This submarine is already in its dive configuration.');if(this.mode!=='surface')return this.reject('The exterior is already secured or moving.');if(Math.hypot(this.speedMps,this.swayMps)>.5||this.gear!==0||this.throttle>.01)return this.reject('Neutral, idle, and below 1 knot to recover tenders and close the yacht.');this.mode='securing';this.message='Recovering tenders and securing the original exterior…';return true;}
  if(name==='dive'){if(this.mode!=='secured'||this.conversion<.999)return this.reject('Secure the original yacht exterior before diving.');if(Math.hypot(this.speedMps,this.swayMps)>1.5||this.throttle>.2)return this.reject('Reduce speed and power before descending.');const q=this.clearance(sample,this.x,this.z,this.targetDepthM);if(!q.known)return this.reject('Dive blocked: bottom depth is unknown under part of this vessel.');if(q.clearanceM<this.p.margin)return this.reject('Dive blocked: insufficient bottom clearance at the requested depth.');this.mode='diving';this.message='Descending to '+this.targetDepthM+' m. Target depth is an authored scenario limit.';return true;}
  if(name==='surface'){if(!['diving','submerged','surfacing'].includes(this.mode))return this.reject('Already on the surface.');this.mode='surfacing';this.message='Ascending. Exterior remains secured.';return true;}
  if(name==='deploy'){if(!this.p.needsSecure)return this.reject('No yacht exterior to deploy on this submarine.');if(this.mode!=='secured'||this.depthM>.02)return this.reject('Surface fully before opening the yacht.');if(Math.hypot(this.speedMps,this.swayMps)>.5||this.gear!==0||this.throttle>.01)return this.reject('Neutral, idle, and below 1 knot before reopening.');this.mode='deploying';this.message='Restoring original yacht decks and tenders…';return true;}
  return this.reject('Command unavailable.');
 }
 clearance(sample,x=this.x,z=this.z,depth=this.depthM,water=this.heaveM,heading=this.heading){let min=Infinity,known=true;const c=Math.cos(heading),s=Math.sin(heading),p=this.p;
  for(let i=0;i<13;i++)for(const b of [-p.beam/2,0,p.beam/2]){const a=(i/12-.5)*p.length,q=sample(x+c*a-s*b,z+s*a+c*b);if(!q?.known||!finite(q.bed)){known=false;continue;}min=Math.min(min,water-depth-p.draft-q.bed);}
  const center=sample(x,z),tilt=Math.abs(Math.sin(this.pitch))*p.length/2+Math.abs(Math.sin(this.roll))*p.beam/2;return {known,clearanceM:known&&finite(min)?min-tilt:null,waterDepthM:center?.known&&finite(center.bed)?water-center.bed:null};
 }
 observe(sample){const q=this.clearance(sample);this.depthKnown=q.known;this.clearanceM=q.clearanceM;this.waterDepthM=q.waterDepthM;return q;}
 targets(waves){const p=this.p,c=Math.cos(this.heading),s=Math.sin(this.heading),h=(a,b)=>{const y=waves(this.x+c*a-s*b,this.z+s*a+c*b,this.elapsed);return finite(y)?y:0;},a=p.length*.39,b=p.beam*.42,bow=h(a,0),stern=h(-a,0),port=h(0,-b),star=h(0,b),fade=Math.exp(-this.depthM/4),heel=-this.speedMps*this.yawRate*p.forceHeight/(9.80665*p.rollGm)*fade;return [(bow+stern+port+star)/4*fade,clamp((port-star)/(2*b)*fade+heel,-.18,.18),clamp((bow-stern)/(2*a),-.09,.09)*fade];}
 step(dt,sample=bottom,waves=(x,z,t)=>wave(x,z,t)){
  if(!finite(dt)||dt<0||dt>.25)throw new RangeError('dt must be finite, 0–0.25 seconds');if(this.paused||dt===0)return;
  this.elapsed+=dt;this.sequence++;this.contact=false;const p=this.p;
  if(this.mode==='securing'){this.throttle=0;this.gear=0;this.conversion=clamp(this.conversion+dt/p.conversionSeconds,0,1);if(this.conversion===1){this.mode='secured';this.message='Exterior secured. Dive when ready.';}}
  if(this.mode==='deploying'){this.throttle=0;this.gear=0;this.conversion=clamp(this.conversion-dt/p.conversionSeconds,0,1);if(this.conversion===0){this.mode='surface';this.message='Yacht exterior restored.';}}
  const thrust=this.engine?this.gear*this.throttle*(this.depthM>1?p.subThrust:p.forwardThrust)*(this.gear<0?p.reverseFraction:1):0,n=Math.ceil(dt*60),ds=dt/n;
  for(let i=0;i<n;i++){this.thrustN+=(thrust-this.thrustN)*(1-Math.exp(-ds/p.thrustTau));this.rudderAngleRad+=clamp(this.rudder*p.rudderMax-this.rudderAngleRad,-p.rudderRate*ds,p.rudderRate*ds);this.bowActual+=((this.engine?this.bowThruster:0)-this.bowActual)*(1-Math.exp(-ds/p.bowTau));[this.speedMps,this.swayMps,this.yawRate]=rk(p,[this.speedMps,this.swayMps,this.yawRate],ds,this.thrustN,this.rudderAngleRad,this.bowActual);const target=this.targets(waves);[this.heaveM,this.heaveRate]=oscillator(this.heaveM,this.heaveRate,target[0],p.heavePeriod,p.heaveDamping,ds);[this.roll,this.rollRate]=oscillator(this.roll,this.rollRate,target[1],p.rollPeriod,p.rollDamping,ds);[this.pitch,this.pitchRate]=oscillator(this.pitch,this.pitchRate,target[2],p.pitchPeriod,p.pitchDamping,ds);}
  const h=(this.heading+this.yawRate*dt+Math.PI*2)%(Math.PI*2),c=Math.cos(h),s=Math.sin(h),nx=this.x+(c*this.speedMps-s*this.swayMps)*dt,nz=this.z+(s*this.speedMps+c*this.swayMps)*dt,q=this.clearance(sample,nx,nz,this.depthM,this.heaveM,h);
  if(!q.known){this.speedMps=0;this.swayMps=0;this.yawRate=0;this.throttle=0;this.thrustN=0;this.message='Scenario boundary: water depth unknown. Change vessel to restart at the safe launch.';}
  else if(q.clearanceM<.05){this.speedMps=0;this.swayMps=0;this.yawRate=0;this.thrustN=0;this.throttle=0;this.contact=true;this.message='Bottom contact. Power idled; surface or reverse clear.';}
  else{this.x=nx;this.z=nz;this.heading=h;}
  const target=['diving','submerged'].includes(this.mode)?this.targetDepthM:this.mode==='surfacing'?0:this.depthM,vr=clamp((target-this.depthM)*.25,-p.ascentRate,p.diveRate);this.verticalMps+=(vr-this.verticalMps)*(1-Math.exp(-.85*dt));let nd=Math.max(0,this.depthM+this.verticalMps*dt);const vq=this.clearance(sample,this.x,this.z,nd);
  if(nd>this.depthM&&(!vq.known||vq.clearanceM<p.margin)){nd=this.depthM;this.verticalMps=0;this.mode='surfacing';this.message='Descent stopped: clearance/coverage lost. Safety ascent.';}
  this.depthM=nd;if(this.mode==='diving'&&Math.abs(nd-this.targetDepthM)<.08&&Math.abs(this.verticalMps)<.04){this.mode='submerged';this.message='Depth hold. Explore with low power.';}
  if(this.mode==='surfacing'&&nd<.03&&Math.abs(this.verticalMps)<.03){this.depthM=0;this.verticalMps=0;this.mode='secured';this.message=p.needsSecure?'Surface reached. Neutral and reopen yacht when stopped.':'Surface reached.';}
  this.observe(sample);if(![this.x,this.z,this.heading,this.speedMps,this.swayMps,this.yawRate,this.depthM,this.heaveM,this.roll,this.pitch].every(finite)){this.pause('invalid');throw Error('Nonfinite dynamics rejected');}
 }
 snapshot(){const [mx,my,iz]=masses(this.p);return {vesselId:this.p.id,profile:this.p.modelVersion,x:this.x,z:this.z,heading:this.heading,speedMps:this.speedMps,swayMps:this.swayMps,yawRate:this.yawRate,elapsed:this.elapsed,sequence:this.sequence,engine:this.engine,gear:this.gear,throttle:this.throttle,rudder:this.rudder,bowThruster:this.bowThruster,thrustN:this.thrustN,rudderAngleRad:this.rudderAngleRad,depthM:this.depthM,targetDepthM:this.targetDepthM,verticalMps:this.verticalMps,mode:this.mode,conversion:this.conversion,heaveM:this.heaveM,roll:this.roll,pitch:this.pitch,paused:this.paused,pauseReason:this.pauseReason,contact:this.contact,depthKnown:this.depthKnown,clearanceM:this.clearanceM,waterDepthM:this.waterDepthM,kineticEnergyJ:.5*(mx*this.speedMps**2+my*this.swayMps**2+iz*this.yawRate**2)};}
}
const API={Vessel,force,acceleration,masses,bottom,bed,wave};G.AtlasFleetDynamics=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
