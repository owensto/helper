'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('./preview.js');
function headingRange(values){assert(values.length>1&&values.every(Number.isFinite),'Finite heading trace required');let position=0,min=0,max=0;for(let i=1;i<values.length;i++){const delta=values[i]-values[i-1];position+=Math.atan2(Math.sin(delta),Math.cos(delta));min=Math.min(min,position);max=Math.max(max,position);}return max-min;}
if(process.argv.includes('--audit-browser')){
 const p=path.join(__dirname,'evidence/browser.json'),r=JSON.parse(fs.readFileSync(p,'utf8'));
 const corrected=headingRange(r.motionTrace.map(x=>x.state.heading));
 r.motion.rawWrappedHeadingRangeRad=r.motion.headingRangeRad;r.motion.headingRangeRad=corrected;
 r.headingAudit={method:'Accumulate signed atan2(sin(delta),cos(delta)) increments across zero/2pi',thresholdRad:.003,passed:corrected>.003,changesOwnerState:false};
 r.passed=r.passed&&r.headingAudit.passed;fs.writeFileSync(p,JSON.stringify(r,null,2));assert(r.headingAudit.passed,'Actual unwrapped turn must meet the original threshold');
 console.log(JSON.stringify({layout:r.layout,headingAudit:r.headingAudit,headingRangeRad:corrected}));
}else{
 let n=0;const tests=[];function test(name,f){f();n++;tests.push({name,passed:true});}
 test('portrait free region stays above dock',()=>{const r=L.region(390,788,166,{x:12,y:450},false);assert.deepEqual(r,{available:true,x:8,y:174,width:374,height:268,reason:null});});
 test('landscape free region stays left of dock',()=>{const r=L.region(844,334,166,{x:494,y:8},true);assert.equal(r.width,478);assert.equal(r.height,152);assert(r.available);});
 test('hidden controls enlarge portrait view',()=>{assert(L.region(390,788,166,{x:12,y:726},false).height>L.region(390,788,166,{x:12,y:450},false).height);});
 test('too little space explicit unavailable',()=>assert.equal(L.region(390,250,166,{x:12,y:195},false).available,false));
 test('nonfinite viewport rejected',()=>assert.equal(L.region(NaN,788,166,{x:12,y:450},false).available,false));
 test('camera distance scales with available area, not vessel state',()=>{const a=L.region(390,788,166,{x:12,y:450},false),b=L.region(390,788,166,{x:12,y:726},false);assert(L.distance(1,a,390,788)>L.distance(1,b,390,788));assert.equal(L.distance(1,{available:false},390,788),null);});
 test('loads exact Y3 contacts and Y2 identity rather than new contracts',()=>{const html=fs.readFileSync(path.join(__dirname,'preview.html'),'utf8'),js=fs.readFileSync(path.join(__dirname,'preview.js'),'utf8');assert(html.includes('../y3/helm-station.js'));assert(html.includes('../y2/identity-map.js'));assert(js.includes("fetch('../y3/station.json')"));});
 test('preview cannot advance or issue owner controls',()=>{const js=fs.readFileSync(path.join(__dirname,'preview.js'),'utf8');for(const banned of ['testStep(','.command(','.step(','.state.reset(','requestAnimationFrame(','setInterval('])assert(!js.includes(banned),banned);});
 test('heading across north/east datum wraps without a false full turn',()=>{assert(Math.abs(headingRange([Math.PI*2-.02,0,.015])-.035)<1e-12);});
 test('equivalent wrapped stationary headings cannot pass turning gate',()=>{assert(headingRange([0,Math.PI*2,0])<1e-12);assert.throws(()=>headingRange([0,NaN]));});
 const out={passed:true,total:n,tests};fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});fs.writeFileSync(path.join(__dirname,'evidence/preview-tests.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
}
