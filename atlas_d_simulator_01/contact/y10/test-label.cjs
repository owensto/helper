'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {label,paint}=require('./boarding-label.js'),tests=[];
function test(name,fn){fn();tests.push({name,passed:true});}
const loading={ready:false,error:null},ready={ready:true,error:null},error={ready:false,error:'Failed to fetch'};
test('Initial disabled board action is labeled loading',()=>assert.equal(label(loading,'Board original ATLAS D'),'Loading original ATLAS D…'));
test('Native download progress stays truthful',()=>assert.equal(label(loading,'Loading ATLAS D · 57%'),'Loading ATLAS D · 57%'));
test('100% downloaded is not initialized readiness',()=>assert.equal(label(loading,'Loading ATLAS D · 100%'),'Loading ATLAS D · 100%'));
test('Actual ready state replaces completed progress',()=>assert.equal(label(ready,'Loading ATLAS D · 100%'),'Board original ATLAS D'));
test('Unknown-total loading stays unchanged',()=>assert.equal(label(loading,'Loading original ATLAS D…'),'Loading original ATLAS D…'));
test('Native error offers retry rather than boarding',()=>assert.equal(label(error,'Retry ATLAS D'),'Retry ATLAS D — load error'));
test('Reported error wins over retained ready flag',()=>assert.equal(label({...error,ready:true},'Board original ATLAS D'),'Retry ATLAS D — load error'));
test('Recovered readiness does not retain an old error label',()=>assert.equal(label(ready,'Retry ATLAS D — load error'),'Board original ATLAS D'));
test('Missing or nonboolean readiness is not invented',()=>{for(const s of [null,{}, {ready:'true'},{ready:1}])assert.equal(label(s,'x'),null);});
test('Returning from the yacht keeps the ready label',()=>assert.equal(label(ready,'Board original ATLAS D'),'Board original ATLAS D'));
test('No button is harmless',()=>assert.equal(paint(null,ready),false));
test('Repeated paint writes nothing',()=>{const b={textContent:'Board original ATLAS D'};assert.equal(paint(b,ready),false);});
test('Every state changes only text and preserves native gates and handler',()=>{
 for(const [status,disabled] of [[loading,true],[ready,false],[error,false]]){
  const handler=()=>{},b={textContent:'old'};
  Object.defineProperties(b,{disabled:{get:()=>disabled,set:()=>assert.fail('disabled changed')},hidden:{get:()=>false,set:()=>assert.fail('hidden changed')},onclick:{get:()=>handler,set:()=>assert.fail('handler changed')}});
  const before=JSON.stringify(status);assert(paint(b,Object.freeze(status)));assert.equal(b.disabled,disabled);assert.equal(b.onclick,handler);assert.equal(JSON.stringify(status),before);
 }
});
test('Presentation has no state/control/clock authority',()=>{
 const s=fs.readFileSync(path.join(__dirname,'boarding-label.js'),'utf8');
 for(const re of [/\.disabled\s*=/,/\.hidden\s*=/,/\.onclick\s*=/,/\.ready\s*=/,/\.command\(/,/\.step\(/,/testStep\(/,/dispatchEvent\(/,/\.click\(/,/requestAnimationFrame\(/,/setInterval\(/,/setTimeout\(/,/location\.reload/])assert(!re.test(s),String(re));
});
test('Y9 CSS, pause component and Y4 observer are reused rather than copied/modified',()=>{
 const s=fs.readFileSync(path.join(__dirname,'preview.html'),'utf8');assert(s.includes('<base href="../y9/">'));assert(s.includes('src="../y4/preview.js"'));assert(s.includes('src="pause-recovery.js"'));assert(s.includes('src="../y10/boarding-label.js"'));assert(!fs.existsSync(path.join(__dirname,'preview.css')));
});
console.log(JSON.stringify({passed:true,total:tests.length,tests},null,2));
