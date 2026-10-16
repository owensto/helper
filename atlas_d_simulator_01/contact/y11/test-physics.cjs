'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
const C=require('./physics.js'),B=require('../../live/atlas-d-core.js'),P=C.PARAMETERS,flat=()=>({known:true,bed:-200}),wave=(x,z,t)=>.6*Math.sin(.05*x+.09*z-1.1*t),tests=[];
const dt=1/60;
function run(name,fn){fn();tests.push({name,passed:true});}
function steps(s,t,bed=flat,w=()=>0,d=dt){for(let i=0;i<Math.round(t/d);i++)s.step(d,bed,w);}
function vessel(){return new C.Vessel({draftM:4.507});}
function power(s,p=1){assert(s.command('engine'));s.command('gear',1);s.command('throttle',p);}
function secure(){const s=vessel();assert(s.command('secure'));steps(s,39);assert.equal(s.mode,'secured');return s;}
run('Zero force / still water preserves equilibrium',()=>{const s=vessel();steps(s,100);for(const k of ['speedMps','swayMps','yawRate','heaveM','roll','pitch'])assert.equal(s[k],0,k);});
run('Added masses and yaw inertia are positive',()=>{assert(Object.values(C.effectiveMass).every(x=>x>0));});
run('Unforced Coriolis plus hull/rudder damping dissipates energy',()=>{const {surge:m1,sway:m2,yaw:m3}=C.effectiveMass;for(const u of [-5,-1,0,1,5])for(const v of [-1,0,1])for(const r of [-.04,0,.04]){const a=C.acceleration(u,v,r,0,.3,0,4.507);assert(m1*u*a[0]+m2*v*a[1]+m3*r*a[2]<=1e-7);}});
run('Numerical unforced kinetic energy falls monotonically',()=>{const s=vessel();s.speedMps=5;s.swayMps=.7;s.yawRate=.035;let E=s.snapshot().kineticEnergyJ;for(let i=0;i<6000;i++){s.step(dt,flat);const next=s.snapshot().kineticEnergyJ;assert(next<=E+1e-5);E=next;}});
run('Full-thrust speed matches analytic force-balance root',()=>{const s=vessel();power(s);steps(s,720);const expected=(-P.surgeLinear+Math.sqrt(P.surgeLinear**2+4*P.surgeQuadratic*P.forwardThrustN))/(2*P.surgeQuadratic);assert(Math.abs(s.speedMps-expected)<1e-4);});
run('Thrust follows the specified time constant',()=>{const s=vessel();power(s);steps(s,P.thrustTimeConstantS);assert(Math.abs(s.thrustN/P.forwardThrustN-(1-Math.exp(-1)))<1e-9);});
run('No speed or yaw teleport at control changes',()=>{const s=vessel();power(s);steps(s,20);const before=[s.speedMps,s.yawRate];s.command('gear',-1);s.command('rudder',1);assert.deepEqual([s.speedMps,s.yawRate],before);s.step(dt,flat);assert(s.speedMps>0);assert(Math.abs(s.yawRate-before[1])<.001);});
run('Rudder respects 5-degree-per-second actuator rate',()=>{const s=vessel();s.command('rudder',1);steps(s,1);assert(Math.abs(s.rudderAngleRad-P.rudderRateRadS)<1e-10);steps(s,10);assert.equal(s.rudderAngleRad,P.rudderMaxRad);});
run('Unpowered stationary rudder cannot turn the hull',()=>{const s=vessel();s.command('rudder',1);steps(s,20);assert.equal(s.yawRate,0);});
run('Positive steering turns starboard and develops sideslip',()=>{const s=vessel();power(s);steps(s,100);s.command('rudder',1);steps(s,40);assert(s.yawRate>0&&s.swayMps<-.1&&s.z>10);});
run('Port/starboard maneuver responses are mirror symmetric',()=>{const a=vessel(),b=vessel();power(a);power(b);steps(a,80);steps(b,80);a.command('rudder',1);b.command('rudder',-1);steps(a,50);steps(b,50);assert(Math.abs(a.x-b.x)<1e-6);assert(Math.abs(a.z+b.z)<1e-6);assert(Math.abs(a.yawRate+b.yawRate)<1e-9);});
run('Bow thruster acts without forward motion and is engine gated',()=>{const a=vessel();a.command('bowThruster',1);steps(a,5);assert.equal(a.yawRate,0);a.command('engine');steps(a,10);assert(a.yawRate>0&&a.swayMps>0);});
run('Wave motion has lag rather than an algebraic pose jump',()=>{const s=vessel();s.observe(flat,()=>1);assert.equal(s.heaveM,0);s.step(dt,flat,()=>1);assert(s.heaveM>0&&s.heaveM<.01);steps(s,40,flat,()=>1);assert(Math.abs(s.heaveM-1)<.001);});
run('Observer calls do not advance vessel/oscillator/actuator state',()=>{const a=vessel(),b=vessel();power(a);power(b);for(let i=0;i<2700;i++){a.step(dt,flat,wave);b.step(dt,flat,wave);b.observe(flat,wave);b.snapshot();b.snapshot();}assert.deepEqual(a.snapshot(),b.snapshot());});
run('Pause freezes motion, wave response, conversion and thrust',()=>{const s=vessel();power(s);steps(s,15,flat,wave);s.command('pause');const before=s.snapshot();steps(s,20,flat,wave);assert.deepEqual(s.snapshot(),before);});
run('Dive requires original exterior closure',()=>{const s=vessel();assert.equal(s.command('dive',null,flat),false);assert.equal(s.depthM,0);});
run('Partial unknown footprint refuses dive',()=>{const s=secure();assert.equal(s.command('dive',null,(x,z)=>x>35?{known:false,bed:null}:flat()),false);});
run('Shallow forward footprint refuses target-depth dive',()=>{const s=secure();assert.equal(s.command('dive',null,(x,z)=>({known:true,bed:x>35?-12:-200})),false);});
run('Tilt reduces reported bottom clearance conservatively',()=>{const s=vessel();const a=s.clearance(flat).clearanceM;s.pitch=.08;s.roll=.1;assert(s.clearance(flat).clearanceM<a-3);});
run('Large lateral drift blocks securing/deployment',()=>{const s=vessel();s.swayMps=.4;assert.equal(s.command('secure'),false);});
run('Original conversion duration retained without world descent',()=>{const s=vessel();s.command('secure');steps(s,10);assert(s.conversion>.25&&s.conversion<.27);assert.equal(s.depthM,0);});
run('Dive, hold, surface and deploy preserve operating interlocks',()=>{const s=secure();assert(s.command('dive',null,flat));steps(s,150);assert.equal(s.mode,'submerged');assert(Math.abs(s.depthM-18)<.1);assert.equal(s.command('deploy'),false);assert(s.command('surface'));steps(s,150);assert.equal(s.mode,'secured');assert.equal(s.depthM,0);assert(s.command('deploy'));steps(s,40);assert.equal(s.mode,'surface');});
run('Unknown coverage interrupts descent and stops submerged translation',()=>{const s=secure();s.command('dive',null,flat);steps(s,20);s.speedMps=1;s.swayMps=.1;const x=s.x,z=s.z,d=s.depthM;s.step(dt,()=>({known:false,bed:null}));assert.equal(s.x,x);assert.equal(s.z,z);assert(s.depthM<=d);assert.equal(s.mode,'surfacing');});
run('Ground contact idles force and translational/yaw velocities',()=>{const s=vessel();power(s);steps(s,20);s.step(dt,()=>({known:true,bed:-2}));assert(s.contact);assert.equal(s.thrustN,0);assert.equal(s.speedMps,0);assert.equal(s.swayMps,0);});
run('Rejected inputs and reset remain finite/versioned',()=>{const s=vessel();assert.equal(s.command('throttle',NaN),false);assert.throws(()=>s.step(Infinity),RangeError);s.reset();assert.equal(s.draftM,5-0.493);assert.equal(s.snapshot().physicsModel,P.id);assert.equal(JSON.parse(JSON.stringify(s.snapshot())).thrustN,0);});
run('60Hz and 120Hz reference trajectories converge',()=>{const a=vessel(),b=vessel();power(a,.7);power(b,.7);a.command('rudder',.4);b.command('rudder',.4);steps(a,80,flat,wave,1/60);steps(b,80,flat,wave,1/120);assert(Math.hypot(a.x-b.x,a.z-b.z)<.3);assert(Math.abs(a.yawRate-b.yawRate)<.0001);assert(Math.abs(a.heaveM-b.heaveM)<.015);});
// Deterministic maneuver measurements. All measurements are simulated, not sea trials.
function maneuvers(Type){
 const s=new Type({draftM:4.507});power(s);let t10=null,t90=null,peakAccel=0,prev=0;
 for(let i=0;i<720*60;i++){s.step(dt,flat);peakAccel=Math.max(peakAccel,(s.speedMps-prev)/dt);prev=s.speedMps;if(t10===null&&s.speedMps>=10/1.943844)t10=(i+1)*dt;if(t90===null&&s.speedMps>=.9*7.2)t90=(i+1)*dt;}
 const speed=s.speedMps,startX=s.x,startZ=s.z;s.command('neutral');let coastTime=null,coastDistance=null;
 for(let i=0;i<1200*60;i++){s.step(dt,flat);if(s.speedMps<.5){coastTime=(i+1)*dt;coastDistance=Math.hypot(s.x-startX,s.z-startZ);break;}}
 const turn=new Type({draftM:4.507});power(turn);steps(turn,720);const ox=turn.x,oz=turn.z;turn.command('rudder',1);let psi=0,prevH=turn.heading,advance=null,tactical=null;const trace=[];
 for(let i=0;i<240*60;i++){turn.step(dt,flat);psi+=Math.atan2(Math.sin(turn.heading-prevH),Math.cos(turn.heading-prevH));prevH=turn.heading;if(i%60===0)trace.push({t:i/60,x:turn.x-ox,z:turn.z-oz,u:turn.speedMps,v:turn.swayMps??0,r:turn.yawRate});if(advance===null&&psi>=Math.PI/2)advance=turn.x-ox;if(tactical===null&&psi>=Math.PI){tactical=Math.abs(turn.z-oz);break;}}
 const crash=new Type({draftM:4.507});power(crash);steps(crash,720);const cx=crash.x;crash.command('gear',-1);let crashTime=null,crashDistance=null;for(let i=0;i<600*60;i++){crash.step(dt,flat);if(crash.speedMps<=0){crashTime=(i+1)*dt;crashDistance=crash.x-cx;break;}}
 return {steadyKnots:speed*1.943844,timeTo10KnotsS:t10,timeTo90PercentS:t90,peakLongitudinalAccelerationMps2:peakAccel,coastToHalfMpsS:coastTime,coastDistanceM:coastDistance,crashStopS:crashTime,crashStopDistanceM:crashDistance,turnAdvanceM:advance,tacticalDiameterM:tactical,turnTrace:trace};
}
const report={passed:true,total:tests.length,tests,model:P.id,units:'SI; displayed speed knots',parameters:P,effectiveMass:C.effectiveMass,scenario:{draftM:4.507,bedM:-200,waves:'calm',dtS:dt,initialState:'rest; full engine/power',maneuverWarmupS:720,turnRudderCommand:1},baseline: maneuvers(B.Vessel),candidate:maneuvers(C.Vessel),limitations:['Simulation measurements only; no sea-trial calibration','3DOF plus decoupled wave response, not full 6DOF hydrodynamics','Depth remains the inherited bounded concept controller','Discrete conservative footprint, no structural/swept collision certification']};
fs.writeFileSync(__dirname+'/physics-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,baseline:{...report.baseline,turnTrace:undefined},candidate:{...report.candidate,turnTrace:undefined}},null,2));
