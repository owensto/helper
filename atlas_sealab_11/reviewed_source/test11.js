const assert=require('assert');const W=require('./site/waves11.js');
const tests=[];function test(name,fn){fn();tests.push({name,passed:true});}
test('Six identical-source wave components',()=>assert.equal(W.terms.length,6));
test('Analytic wave slopes agree with finite differences',()=>{for(let i=0;i<50;i++){const x=i*13.7,z=i*-7.3,t=i*.21,a=.45,q=W.sample(x,z,t,a),e=1e-4;assert(Math.abs(q.dx-(W.sample(x+e,z,t,a).height-W.sample(x-e,z,t,a).height)/(2*e))<1e-6);assert(Math.abs(q.dz-(W.sample(x,z+e,t,a).height-W.sample(x,z-e,t,a).height)/(2*e))<1e-6);}});
test('Calm amplitude has a flat zero-amplitude limit',()=>assert.equal(W.sample(4,9,100,0).height,0));
test('Wave amplitude remains bounded',()=>{for(let i=0;i<2000;i++)assert(Math.abs(W.sample(i*.8,i*.7,i*.17,.6).height)<1.6);});
const fs=require('fs'),vm=require('vm');const context={console,window:null};context.window=context;vm.createContext(context);for(const name of ['performance_data.js','performance.js','physics.js','waves11.js','dynamics10.js','command-motion.js','world09.js'])vm.runInContext(fs.readFileSync('./site/'+name,'utf8'),context);
test('Production buoyancy samples shared wave function',()=>{context.BayMotion.PRESETS.weather10={amp:.31,wind:[1,2],current:[0,0]};for(let i=0;i<50;i++)assert(Math.abs(context.BayMotion.surface(i,i/2,i/3,'weather10')-W.sample(i,i/2,i/3,.31).height)<1e-12);});
test('Boat wave response finite through all sea states',()=>{for(const preset of ['calm','breeze','swell']){const b=new context.BayMotion();b.configure({location:'basin',conditions:preset});b.x=-300;b.z=-300;b.setEnvironment(preset);let lo=Infinity,hi=-Infinity;for(let i=0;i<1200;i++){b.step(1/60,[]);lo=Math.min(lo,b.heave);hi=Math.max(hi,b.heave);assert([b.heave,b.roll,b.pitch].every(Number.isFinite));}assert(hi-lo<5);}});
console.log(JSON.stringify({passed:true,tests},null,2));
