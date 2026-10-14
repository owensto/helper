/* ATLAS Bay Performance 03 — published reference-curve surge plus modeled handling.
   Reference data belongs to Sportsman Masters 247 / F300, not the ATLAS hull.
   Body axes: x ahead, z starboard. Heading increases toward +z.
   Integrate world velocities so water-relative damping, sideways slip and current
   do not require ad-hoc camera steering. Coefficients are tuning assumptions.
   General modeling reference: Fossen's surge/sway/yaw framework.
   No horsepower, sea-trial, draft, safety or operating-envelope claim. */
(function(global){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const PRESETS={calm:{label:'Calm',amp:.016,current:[0,0],wind:[0,0]},breeze:{label:'Sea breeze',amp:.075,current:[.13,.24],wind:[1.4,3.0]},chop:{label:'Light chop',amp:.15,current:[.23,.35],wind:[3,5]}};
const WAVES=[[.13,.07,1.1,1.0],[.05,-.18,.92,.48],[.37,.21,1.8,.16]];
function surface(x,z,t,p='calm'){const a=PRESETS[p]?.amp??.016;let y=0;for(const [kx,kz,w,s] of WAVES)y+=a*s*Math.sin(kx*x+kz*z-w*t);return y;}
function depth(x,z){let h=5.6+.45*Math.sin(x*.009);for(const [ix,iz,r] of [[205,62,49],[-115,95,43],[95,225,46]]){h=Math.min(h,.1+5.5*smooth(r*.72,r*1.7,Math.hypot(x-ix,z-iz)));}return Math.max(.1,h);}
const PERF=global.BayPerformance||(typeof require==='function'?require('./performance.js'):null);
class BayMotion{
 constructor(){this.environment='calm';this.performanceMode='reference';this.accelTau=7.870792189750;this.reset()}
 reset(){this.referenceTrial=null;this.referenceBurnGal=0;this.unmeteredSeconds=0;this.fuelStartGal=35;this.reserveGal=6.5;this.fuelRemainingGal=35;this.performanceMode=this.performanceMode||'reference';this.x=-8;this.z=0;this.heading=0;this.u=0;this.v=0;this.vx=0;this.vz=0;this.yaw=0;this.throttle=0;this.steer=0;this.rudder=0;this.gear=0;this.engine=false;this.rpm=0;this.trim=.18;this.trimActual=.18;this.startTimer=0;this.distance=0;this.contact=false;this.grounded=false;this.elapsed=0;this.pitch=0;this.roll=0;this.heave=0;this.planing=0;this.speedOverGround=0;this.depth=depth(this.x,this.z);this.environment=this.performanceMode==='reference'?'calm':this.environment||'calm';if(this.performanceMode==='reference')this.trim=this.trimActual=.30;}
 setEnvironment(key){if(PRESETS[key]&&this.performanceMode==='experimental')this.environment=key;}
 setPerformanceMode(mode){if(!['reference','experimental'].includes(mode))throw Error('Unsupported performance mode');this.performanceMode=mode;this.reset();return mode;}
 setReferenceRpm(rpm){if(this.performanceMode!=='reference'||!Number.isFinite(rpm)||rpm<1000||rpm>5800)return false;this.throttle=PERF.throttleForRpm(rpm);return true;}
 armReferenceTest(rpm,kind='steady'){if(!Number.isFinite(rpm)||rpm<1000||rpm>5800)throw Error('Outside measured RPM range');this.performanceMode='reference';this.reset();this.x=-700;this.z=-300;this.heading=0;this.start();this.referenceTrial={kind,rpm,phase:'warming',time:0,warm:0,zeroTo30:null,previousMph:0,complete:false};}

 neutral(){this.throttle=0;this.gear=0;}
 stop(){this.neutral();this.u=0;this.v=0;this.vx=0;this.vz=0;this.yaw=0;this.rudder=0;}
 start(){if(this.gear!==0||this.throttle>.03)return false;this.engine=true;this.startTimer=1.1;return true;}
 step(dt,obstacles=[]){dt=clamp(dt,0,.04);if(!dt)return;this.elapsed+=dt;this.contact=false;this.grounded=false;
  const ref=this.performanceMode==='reference';if(ref){this.environment='calm';this.trim=.30;}
  const tr=this.referenceTrial;if(tr&&!tr.complete){if(tr.phase==='warming'){tr.warm+=dt;this.gear=0;this.throttle=0;if(tr.warm>=3){tr.phase='running';tr.time=0;this.rpm=700;this.startTimer=0;this.gear=1;this.setReferenceRpm(tr.rpm);}}else{this.gear=1;this.setReferenceRpm(tr.rpm);}this.steer=0;}
  const p=PRESETS[this.environment]||PRESETS.calm;const c=Math.cos(this.heading),s=Math.sin(this.heading);
  const rx=this.vx-p.current[0],rz=this.vz-p.current[1];this.u=rx*c+rz*s;this.v=-rx*s+rz*c;
  this.rudder+=(clamp(this.steer,-1,1)-this.rudder)*(1-Math.exp(-3.6*dt));this.trimActual+=(clamp(this.trim,0,1)-this.trimActual)*(1-Math.exp(-2.2*dt));
  this.startTimer=Math.max(0,this.startTimer-dt);const powerOn=this.engine&&this.startTimer===0;
  const targetRPM=this.engine?(this.startTimer?280:(this.gear===0?700+this.throttle*1200:700+this.throttle*(ref?5100:4950))):0;
  this.rpm+=(targetRPM-this.rpm)*(1-Math.exp(-dt/(this.engine?.7:.3)));
  const delivered=clamp((this.rpm-700)/4950,0,1);this.planing=smooth(4,10,Math.max(0,this.u));
  const MASS=ref?PERF.data.testWeightLb*PERF.C.lbToKg:2200,IZZ=14000;
  const thrustBase=powerOn&&this.gear!==0?(300+8200*Math.pow(delivered,1.25))/(1+Math.abs(this.u)*.022):0;
  const excessive=1-.44*smooth(.65,1,this.trimActual),trimEfficiency=1-.16*Math.abs(this.trimActual-.30);
  let thrust=thrustBase*(this.gear<0?-.38:1)*excessive*trimEfficiency;
  const delta=this.rudder*(.52/(1+Math.max(0,this.u)*.018));
  const hump=1+.9*Math.exp(-Math.pow((Math.abs(this.u)-5.4)/2.2,2));
  const drag=80*this.u+(18+10*(1-this.planing))*this.u*Math.abs(this.u)*hump;
  let fx=thrust*Math.cos(delta)-drag,fz=-thrust*Math.sin(delta),moment=-3.65*fz;
  if(ref&&powerOn&&this.gear===1){
   const row=PERF.lookup(Math.max(1000,Math.min(5800,this.rpm)));
   // Below the lowest row, idle maneuvering is a labeled game bridge, NOT extrapolated sea-trial data.
   const target=this.rpm>=1000?row.mps:.8+(Math.max(700,this.rpm)-700)/300*(row.mps-.8);
   const tau=target>=this.u?this.accelTau:4.5;
   // Empirical speed controller. It reproduces the source equilibrium, not a physical propeller/thrust law.
   fx=MASS*(target*Math.cos(delta)-this.u)/tau;
   const turnForce=Math.max(0,80*target+18*target*target+MASS*Math.max(0,target-this.u)/this.accelTau);
   fz=-turnForce*Math.sin(delta);moment=-3.65*fz;
  }
  for(const x of [-2.65,0,2.65]){const local=this.v+this.yaw*x;const fy=-(310+90*Math.abs(this.u))*local-230*local*Math.abs(local);fz+=fy;moment+=x*fy;}
  moment-=1800*this.yaw+7200*this.yaw*Math.abs(this.yaw);
  if(!ref){const ax=p.wind[0]-this.vx,az=p.wind[1]-this.vz;const airx=(ax*c+az*s),airz=(-ax*s+az*c);fx+=1.8*airx*Math.abs(airx);fz+=11*airz*Math.abs(airz);}
  this.vx+=(fx*c-fz*s)/MASS*dt;this.vz+=(fx*s+fz*c)/MASS*dt;this.yaw+=moment/IZZ*dt;this.yaw=clamp(this.yaw,-.6,.6);this.heading+=this.yaw*dt;
  const px=this.x,pz=this.z;this.x+=this.vx*dt;this.z+=this.vz*dt;
  // Sample an elongated set of support points against obstacle rectangles.
  for(const o of obstacles){let hit=false;for(const a of [-3.35,-1.7,0,1.7,3.35]){const x=this.x+a*Math.cos(this.heading),z=this.z+a*Math.sin(this.heading),qx=clamp(x,o.x0,o.x1),qz=clamp(z,o.z0,o.z1);if((x-qx)**2+(z-qz)**2<1.28**2){hit=true;break}}
   if(hit){this.x=px;this.z=pz;this.vx*=.14;this.vz*=.14;this.yaw*=.2;this.contact=true;break}}
  this.depth=depth(this.x,this.z);if(this.depth<.70){this.x=px;this.z=pz;this.vx*=.08;this.vz*=.08;this.throttle=0;this.grounded=true;this.contact=true;}
  if(!global.CMD_LAB?.active && Math.hypot(this.x,this.z)>(this.referenceTrial?850:465)){this.x=px;this.z=pz;this.vx*=.1;this.vz*=.1;this.neutral();this.contact=true;}
  this.speedOverGround=Math.hypot(this.vx,this.vz);this.distance+=Math.hypot(this.x-px,this.z-pz);
  const hc=Math.cos(this.heading),hs=Math.sin(this.heading);this.u=(this.vx-p.current[0])*hc+(this.vz-p.current[1])*hs;this.v=-(this.vx-p.current[0])*hs+(this.vz-p.current[1])*hc;
  const bow=surface(this.x+3*hc,this.z+3*hs,this.elapsed,this.environment),stern=surface(this.x-3*hc,this.z-3*hs,this.elapsed,this.environment),port=surface(this.x+hs,this.z-hc,this.elapsed,this.environment),star=surface(this.x-hs,this.z+hc,this.elapsed,this.environment);
  const pitchTarget=clamp((bow-stern)/6,-.09,.09)+.033*this.planing+(.025+this.trimActual*.06)*Math.exp(-Math.pow((this.u-5.3)/2.6,2))+this.trimActual*.044*this.planing;
  const rollTarget=clamp((port-star)/2+this.yaw*this.u*.017,-.20,.20);
  const ease=1-Math.exp(-2.6*dt);this.pitch+=(pitchTarget-this.pitch)*ease;this.roll+=(rollTarget-this.roll)*ease;this.heave+=((bow+stern+port+star)/4+this.planing*.05-this.heave)*ease;
  if(ref){
   const point=this.gear===1&&powerOn?PERF.lookup(this.rpm):null;
   if(point){const used=Math.min(this.fuelRemainingGal,point.gph*dt/3600);this.referenceBurnGal+=used;this.fuelRemainingGal=Math.max(0,this.fuelRemainingGal-used);}
   else if(this.engine)this.unmeteredSeconds+=dt;
   if(this.engine&&this.fuelRemainingGal<=0){this.engine=false;this.neutral();}
  }
  if(tr&&tr.phase==='running'&&!tr.complete){
   const old=tr.time;tr.time+=dt;const mph=this.speedOverGround/PERF.C.mphToMps;
   if(tr.zeroTo30===null&&mph>=30&&tr.previousMph<30)tr.zeroTo30=old+dt*(30-tr.previousMph)/Math.max(1e-9,mph-tr.previousMph);
   tr.previousMph=mph;
   if(tr.time>=65||(tr.kind==='acceleration'&&tr.zeroTo30!==null)){tr.complete=true;tr.phase='complete';}
  }

 }
 performance(){
 const ref=this.performanceMode==='reference',r=ref&&this.engine&&this.startTimer===0&&this.gear===1?PERF.lookup(this.rpm):null;
 const straight=Math.abs(this.rudder)<.015&&Math.abs(this.yaw)<.003&&Math.abs(this.v)<.025;
 const settled=!!r&&straight&&Math.abs(this.u-r.mps)<.03;
 const status=!ref?'EXPERIMENTAL / NO MEASURED CURVE':!this.engine?'REFERENCE READY':this.startTimer>0?'STARTUP / MODELED':this.gear!==1?'IDLE / REVERSE UNMEASURED':!r?'BELOW MEASURED RPM':!straight?'TURNING / MODELED':settled?'STEADY / REFERENCE MATCH':'TRANSIENT / MODELED';
 const estimate=r?PERF.range(r.rpm,this.fuelRemainingGal,this.reserveGal):null;
 return {mode:this.performanceMode,sourceId:PERF.data.id,referenceBoat:PERF.data.boat,atlasValidated:false,status,lookup:r,straight,settled,fuelRemainingGal:this.fuelRemainingGal,curveFuelUsedGal:this.referenceBurnGal,unmeteredSeconds:this.unmeteredSeconds,balanceIsUpperBound:this.unmeteredSeconds>0,reserveGal:this.reserveGal,range:estimate,trial:this.referenceTrial};
 }
 snapshot(){return {performanceMode:this.performanceMode,reference:this.performance(),x:this.x,z:this.z,heading:this.heading,speed:this.u,sway:this.v,speedOverGround:this.speedOverGround,throttle:this.throttle,steer:this.steer,rudder:this.rudder,gear:this.gear,engine:this.engine,rpm:this.rpm,trim:this.trimActual,planing:this.planing,pitch:this.pitch,roll:this.roll,distance:this.distance,depth:this.depth,environment:this.environment,contact:this.contact,grounded:this.grounded}}
}
BayMotion.REFERENCE=PERF;BayMotion.PRESETS=PRESETS;BayMotion.WAVES=WAVES;BayMotion.surface=surface;BayMotion.depth=depth;global.BayMotion=BayMotion;if(typeof module!=='undefined')module.exports=BayMotion;
})(typeof window!=='undefined'?window:globalThis);
