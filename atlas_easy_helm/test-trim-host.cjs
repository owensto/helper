'use strict';
/* Executes the exact published trim Bus and production vessel step, without
   a renderer. This proves state coupling, NOT rendered motor movement. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),M=require('./motor-music.js');
const site=process.env.ATLAS13_SITE;if(!site)throw Error('Set ATLAS13_SITE to the exact public13 site.');
const pins=require('./base-pins.json').files,files=['performance_data.js','performance.js','physics.js','waves11.js','dynamics10.js','shore12.js','command-motion.js','world09.js'];
const ctx={console};ctx.window=ctx;vm.createContext(ctx);for(const n of files){const raw=fs.readFileSync(path.join(site,n));if(pins[n])assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),pins[n]);vm.runInContext(raw.toString(),ctx);}
const text=fs.readFileSync(path.join(site,'helm09.js'),'utf8');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),pins['helm09.js']);
const begin=text.indexOf(' const Bus='),end=text.indexOf(' async function ignition()',begin);assert(begin>=0&&end>begin);const busCode=text.slice(begin,end);
let refreshes=0;const s=new ctx.BayMotion();s.configure({location:'basin',physics:'seamanship'});s.x=-1200;s.z=-800;s.setEnvironment('calm');const before={throttle:s.throttle,engine:s.engine,gear:s.gear,elapsed:s.elapsed};
const bus=new Function('S','A','events','cap','status','let sequence=0;'+busCode+'return Bus;')(s,{refresh:()=>refreshes++},[],(v,a,b)=>Math.max(a,Math.min(b,v)),()=>{});
const down=M.trimTarget(s,-1),actualBefore=s.trimActual;bus.dispatch('trim',down);assert.equal(s.trim,down);assert.equal(s.trimActual,actualBefore);assert.equal(s.elapsed,before.elapsed);
for(const k of ['engine','gear','throttle'])assert.equal(s[k],before[k]);assert.equal(refreshes,1);
for(let i=0;i<180;i++)s.step(1/60,[]);const low=s.trimActual;assert(Math.abs(low-down)<.001);
bus.dispatch('trim',.9);for(let i=0;i<240;i++)s.step(1/60,[]);const high=s.trimActual;assert(high>.89&&high>low);assert.equal(s.engine,before.engine);assert(Number.isFinite(s.pitch));
const contactLow=ctx.Sea09World.inspect(Object.assign(Object.create(s),{trimActual:0}));
const contactHigh=ctx.Sea09World.inspect(Object.assign(Object.create(s),{trimActual:1}));
assert(contactLow.known&&contactHigh.known);assert(contactHigh.contact.clearance>contactLow.contact.clearance);
console.log(JSON.stringify({passed:true,scope:'Exact published Bus + production fixed steps; no browser/render/audio claims',busSHA256:crypto.createHash('sha256').update(busCode).digest('hex'),tests:[{name:'Trim Up/Down delegates to exact Bus without changing engine/gear/throttle/clock',passed:true},{name:'Owner motor actuator moves from requested down to up after fixed steps',passed:true,low,high},{name:'Same depth field reflects altered under-prop clearance',passed:true,lowClearance:contactLow.contact.clearance,highClearance:contactHigh.contact.clearance}]},null,2));
