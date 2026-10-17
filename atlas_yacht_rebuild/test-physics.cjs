'use strict';
const assert=require('node:assert/strict');const {Vessel,P,wave,depth}=require('./site/physics.js');
const results=[];function test(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:String(e.stack)});}}
function run(v,t,dt=1/60){for(let i=0;i<Math.round(t/dt);i++)v.step(dt);return v;}
function underway(){const v=new Vessel();v.command('engine');v.command('gear',1);v.command('port',1);v.command('starboard',1);return v;}
test('engine-off commanded power cannot create thrust',()=>{const v=new Vessel();v.port=v.starboard=1;run(v,30);assert.equal(v.u,0);});
test('twin forward acceleration with thrust lag',()=>{const v=underway();v.step(1/60);assert(v.thrustP>0&&v.thrustP<P.maxThrust/100);run(v,30);assert(v.u>.5);});
test('matched engines do not spontaneously yaw in calm water',()=>{const v=underway();run(v,100);assert.equal(v.r,0);assert.equal(v.heading,0);});
test('differential thrust turns without rudder',()=>{const v=underway();v.command('starboard',.2);run(v,35);assert(v.r>0);});
test('starboard rudder gives positive yaw at forward speed',()=>{const v=underway();run(v,120);v.command('helm',1);run(v,30);assert(v.r>0);});
test('rudder is rate limited and saturates at thirty degrees',()=>{const v=underway();v.command('helm',1);v.step(.01);assert(v.rudder<=P.rudderRate*.01+1e-12);run(v,20);assert(Math.abs(v.rudder-P.rudderLimit)<1e-8);});
test('neutral retains momentum and fades thrust',()=>{const v=underway();run(v,120);const speed=v.u;v.command('gear',0);v.step(1/60);assert(v.u>speed*.99);run(v,30);assert(Math.abs(v.thrustP)<4);assert(v.u>0&&v.u<speed);});
test('astern creates negative forward speed from rest',()=>{const v=underway();v.command('gear',-1);run(v,30);assert(v.u<-.5);});
test('pause freezes state and clock exactly',()=>{const v=underway();run(v,20);v.command('pause');const s=JSON.stringify(v.read());run(v,30);assert.equal(JSON.stringify(v.read()),s);});
test('reset increments epoch and disables propulsion',()=>{const v=underway();run(v,20);v.command('reset');assert.equal(v.epoch,1);assert.equal(v.engine,false);assert.equal(v.time,0);assert.equal(v.x,0);});
test('invalid time steps rejected',()=>{for(const dt of [NaN,Infinity,-.01,.2])assert.throws(()=>new Vessel().step(dt));});
test('input bounds and invalid gear rejected',()=>{const v=new Vessel();v.command('port',5);assert.equal(v.port,1);v.command('gear',55);assert.equal(v.gear,0);v.command('helm',NaN);assert.equal(v.helm,0);});
test('60 Hz and 120 Hz straight trajectories converge',()=>{const a=run(underway(),120),b=run(underway(),120,1/120);assert(Math.abs(a.u-b.u)<.01);assert(Math.abs(a.x-b.x)<.3);});
test('wave motion is finite and bounded in all sea states',()=>{for(let sea=0;sea<3;sea++){const v=new Vessel();v.sea=sea;run(v,120);assert(Math.abs(v.heave)<1);assert(Math.abs(v.roll)<.2);assert(Math.abs(v.pitch)<.1);}});
test('unknown water is not reported as known depth',()=>{assert.equal(depth(13000,0),null);assert.equal(depth(NaN,0),null);assert.equal(depth(2100,-2300),0);});
test('unknown boundary stops footprint progression',()=>{const v=underway();v.x=11970;run(v,100);assert(v.grounded);assert(v.x<12000);});
test('bow thruster is engine dependent',()=>{const a=new Vessel();a.bow=1;run(a,10);assert.equal(a.r,0);a.command('engine');run(a,10);assert(a.r>0);});
test('same controls produce deterministic state',()=>{assert.deepEqual(run(underway(),60).read(),run(underway(),60).read());});
const v=underway();run(v,600);const cruise=v.read();v.command('gear',0);run(v,120);const coast=v.read();
const report={passed:results.every(r=>r.passed),tests:results,simulatedNotSeaTrial:true,parameters:P,measurements:{cruiseAfter600Seconds:cruise,neutralAfter120Seconds:coast}};require('fs').writeFileSync('physics-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
