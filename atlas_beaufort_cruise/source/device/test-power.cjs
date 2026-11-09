'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),C=require('./device-core.js');const site=path.resolve(process.argv[2]);
const G={console};G.window=G;vm.createContext(G);for(const n of ['performance_data.js','performance.js','physics.js','waves11.js','cruise/water-refinements.js','dynamics10.js','shore12.js','terrain14.js','physics14.js','command-motion.js','world09.js'])vm.runInContext(fs.readFileSync(site+'/'+n,'utf8'),G);
const rows=[];for(const [key,r]of Object.entries(C.RIGS))for(const throttle of key==='single300'?[.22,1]:[1]){
 const S=new G.BayMotion();S.configure({location:'basin',physics:'seamanship'});S.x=-1200;S.z=-800;S.setEnvironment('calm');
 C.applyRig({isLocal:()=>true,read:()=>S,syncRig(){}},key);S.start();for(let i=0;i<180;i++)S.step(1/60,[]);S.gear=1;S.throttle=throttle;
 let t30=null;for(let i=0;i<5400;i++){S.step(1/60,[]);if(t30===null&&S.speedOverGround*.44704**-1>=30)t30=(i+1)/60;for(const n of ['x','z','vx','vz','heave','pitch','roll','rpm'])assert(Number.isFinite(S[n]),n);assert(Math.abs(S.pitch)<=.55&&Math.abs(S.roll)<=.6);}
 rows.push({rig:key,horsepower:r.count*r.hp,throttlePercent:throttle*100,secondsTo30mph:t30,knots:S.speedOverGround*3600/1852,mph:S.speedOverGround/.44704,propWet:S.propWet,loadKg:S.totalMassKg()});
 // The powered rig still keeps momentum on reversal; no instant speed assignment.
 S.gear=-1;S.step(1/60,[]);assert(S.u>0);for(let i=0;i<2400;i++)S.step(1/60,[]);assert(S.u<0);
}
const a=rows.find(x=>x.rig==='single300'&&x.throttlePercent===100),b=rows.find(x=>x.rig==='single450'),c=rows.find(x=>x.rig==='twin300');assert(a.knots>40&&a.knots<46);assert(b.knots>a.knots+4);assert(c.knots>b.knots+2);assert(rows[0].knots<a.knots);
console.log(JSON.stringify({passed:true,scope:'90s calm authored test-basin runs; modeled performance, not observed device speed or sea trials',rows},null,2));
