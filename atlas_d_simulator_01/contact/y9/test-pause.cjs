'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {reduce,STALL,HIDDEN}=require('./pause-recovery.js'),tests=[];
function test(name,fn){fn();tests.push({name,passed:true});}
const active={active:true,paused:false,message:'Propulsion ready. Select Forward or Reverse.'};
test('Running does not show a pause card',()=>assert.equal(reduce(null,active).visible,false));
test('Inactive yacht never shows an old pause',()=>assert.equal(reduce(null,{active:false,paused:true,message:STALL}).visible,false));
test('Missing/nonboolean state never invents active pause',()=>{for(const s of [null,{}, {active:1,paused:true},{active:true,paused:'true'}])assert.equal(reduce(null,s).visible,false);});
test('Fresh actual owner stall reason is explicit',()=>assert.equal(reduce(reduce(null,active),{...active,paused:true,message:STALL}).reason,'stall'));
test('Witnessed manual pause overrides retained stall text',()=>{const prev=reduce(null,{...active,message:STALL});assert.equal(reduce(prev,{...active,paused:true,message:STALL},true).reason,'manual');});
test('Manual transition must really be false to true',()=>assert.notEqual(reduce({active:true,paused:true,reason:'unknown',message:STALL},{active:true,paused:true,message:STALL},true).reason,'manual'));
test('Unwitnessed pause with stale stall message stays unknown',()=>assert.equal(reduce(reduce(null,{...active,message:STALL}),{...active,paused:true,message:STALL}).reason,'unknown'));
test('Manual paused reason survives unrelated propulsion text',()=>{const p=reduce(active,{...active,paused:true},true);assert.equal(reduce(p,{...active,paused:true,message:'Propulsion off.'}).reason,'manual');});
test('New hidden-tab reason recorded but no automatic recovery',()=>{const p=reduce(active,{...active,paused:true,message:HIDDEN});assert.equal(p.reason,'visibility');assert.equal(p.visible,true);});
test('Resume removes pause state despite stale reason text',()=>assert.equal(reduce({active:true,paused:true,reason:'stall',message:STALL},{active:true,paused:false,message:STALL}).visible,false));
test('Null owner reason remains explicitly unavailable',()=>assert.equal(reduce(active,{active:true,paused:true,message:null}).reason,'unknown'));
test('Reducer never mutates owner input',()=>{const p=Object.freeze({...active}),s=Object.freeze({...active,paused:true});reduce(p,s,true);assert.equal(s.message,active.message);});
test('No direct command, stepping, synthetic click, new RAF or owner assignment',()=>{const s=fs.readFileSync(path.join(__dirname,'pause-recovery.js'),'utf8');for(const re of [/\.command\(/,/\.step\(/,/testStep\(/,/dispatchEvent\(/,/\.click\(/,/requestAnimationFrame\(/,/P\.state\.[\w]+\s*=/,/button\.onclick\s*=(?!=)/])assert(!re.test(s),String(re));});
test('Original Y4 presentation reused byte for byte before Y9 CSS suffix',()=>{const s=fs.readFileSync(path.join(__dirname,'preview.css'),'utf8'),b=fs.readFileSync(path.join(__dirname,'../y4/preview.css'),'utf8');assert(s.startsWith(b));});
console.log(JSON.stringify({passed:true,total:tests.length,tests},null,2));
