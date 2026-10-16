'use strict';const assert=require('node:assert/strict'),D=require('./site/dynamics10.js');
const tests=[];function test(name,fn){const data=fn();tests.push({name,passed:true,...data});}
const wall={x0:0,x1:.2,z0:-30,z1:30};
function state(vx,vz,dx,dz){return {x:-6+dx,z:dz,heading:0,vx,vz,yaw:0,elapsed:1,totalMassKg:()=>2200};}
test('continuous_collision_no_tunneling',()=>{const s=state(100,0,15,0),e=D.resolveObstacles(s,-6,0,[wall]);assert(e);assert(s.x<0);assert(s.vx<0);return {closing:e.closing,centerX:s.x,afterVx:s.vx};});
test('tangent_momentum_preserved',()=>{const s=state(10,12,1,1.2);s.x=-4;const e=D.resolveObstacles(s,-6,0,[wall]);assert(e);assert.equal(s.vz,12);return {closing:e.closing,tangentVelocity:s.vz};});
test('glancing_less_than_head_on',()=>{const a={kind:'solid',closing:20,deltaV:20,forwardSpeed:20},b={...a,closing:2,deltaV:2},o={damage:true,explosions:true,ejection:true};assert(D.consequence(a,o).explode);assert(!D.consequence(b,o).explode);assert(D.consequence(a,o).damage>D.consequence(b,o).damage);});
test('separation_not_glued_to_dock',()=>{assert.equal(D.sweepCircle(-1.1,0,-1,0,1.2,wall),null);});
test('easter_eggs_off_by_default',()=>{const q=D.consequence({kind:'solid',closing:40,deltaV:35,forwardSpeed:35},{damage:true});assert(!q.explode&&!q.eject);return q;});
test('graphics_cannot_enable_easter_eggs',()=>{const q=D.consequence({kind:'solid',closing:40,deltaV:35,forwardSpeed:35},{graphics:'realistic',damage:true,explosions:false,ejection:false});assert(!q.explode&&!q.eject);});
test('independent_effect_toggles',()=>{const e={kind:'solid',closing:20,deltaV:18,forwardSpeed:20};assert(D.consequence(e,{explosions:true}).explode);assert(!D.consequence(e,{explosions:true}).eject);assert(D.consequence(e,{ejection:true}).eject);assert(!D.consequence(e,{ejection:true}).explode);});
test('no_explosion_on_soft_bottom',()=>{const q=D.consequence({kind:'bottom',closing:30,deltaV:3,forwardSpeed:25},{damage:true,explosions:true,ejection:true});assert(!q.explode&&!q.eject);});
test('reverse_hit_does_not_eject_through_bow',()=>{assert(!D.consequence({kind:'solid',closing:20,deltaV:18,forwardSpeed:-20},{ejection:true}).eject);});
test('weather_transitions_gradually',()=>{const w=new D.Weather();w.choose('squall');const initial=w.current.amp;w.step(1/60);assert(w.current.amp>initial&&w.current.amp<w.target.amp);for(let i=0;i<1800;i++)w.step(1/60);assert(Math.abs(w.current.amp-.56)<.0001);return {waveAmplitude:w.current.amp,rain:w.current.rain};});
test('weather_presets_finite',()=>{for(const key in D.WEATHER){const w=new D.Weather();w.choose(key);for(let i=0;i<600;i++)w.step(1/60);assert([w.current.amp,w.current.rain,w.current.fog,...w.current.wind].every(Number.isFinite));}});
require('./site/performance_data.js');require('./site/performance.js');require('./site/physics.js');const Motion=require('./site/command-motion.js');require('./site/world09.js');
test('damage_prevents_engine_start',()=>{const s=new Motion();s.configure({physics:'seamanship'});s.engineDisabled10=true;assert.equal(s.start(),false);s.engineDisabled10=false;assert(s.start());});
test('fuel_empty_prevents_start',()=>{const s=new Motion();s.configure({physics:'seamanship',fuelGal:0});assert.equal(s.start(),false);});
test('real_model_hits_existing_marina_dock',()=>{const s=new Motion();s.configure({physics:'seamanship'});s.x=0;s.z=3;s.heading=-Math.PI/2;s.vx=0;s.vz=-22;s.setEnvironment('calm');let event;globalThis.Sea10Runtime={beforeStep(){},onImpact(_,e){if(e.kind==='solid')event=e;}};for(let i=0;i<60;i++)s.step(1/60,[{x0:-27,x1:22,z0:-9.7,z1:-6}]);delete globalThis.Sea10Runtime;assert(event);assert(event.closing>14);assert(D.consequence(event,{ejection:true,explosions:true}).eject);return {closing:event.closing,deltaV:event.deltaV};});
console.log(JSON.stringify({passed:true,tests,structurallyValidated:false},null,2));
