'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {RangeSession,point,arc}=require('./logic.js');
function state(o={}){return {time:0,epoch:0,paused:false,x:0,z:0,heading:0,...o};}
function fresh(){const r=new RangeSession();r.observe(state());return r;}
const start={x:50,y:12,z:0};
test('three unhit game targets',()=>A.deepEqual(fresh().targets.map(t=>t.hit),[false,false,false]));
test('fire creates one bounded salvo',()=>{const r=fresh();A.equal(r.fire(state(),start,r.targets[1]).valid,true);A.equal(r.shots,1);A.equal(r.fire(state(),start,r.targets[1]).reason,'RELOADING');});
test('no immediate hit on button press',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);A.equal(r.hits,0);});
test('hit committed at game arc end',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);r.observe(state({time:1.2}));A.equal(r.hits,1);A.equal(r.lastResult.targetId,2);});
test('off-target salvo is a miss',()=>{const r=fresh();r.fire(state(),start,{x:200,y:1,z:400});r.observe(state({time:1.2}));A.equal(r.hits,0);A.equal(r.lastResult.hit,false);});
test('pause rejects fire',()=>A.equal(fresh().fire(state({paused:true}),start,{x:300,y:1,z:0}).reason,'PAUSED'));
test('paused repeated observation freezes effects and score',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);r.observe(state({time:.5}));const before=r.inspect();for(let i=0;i<10;i++)r.observe(state({time:.5,paused:true}));A.deepEqual(r.inspect(),before);});
test('cooldown survives impact',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);r.observe(state({time:1.2}));A.equal(r.fire(state({time:1.3}),start,r.targets[0]).reason,'RELOADING');A.equal(r.fire(state({time:1.8}),start,r.targets[0]).valid,true);});
test('epoch reset clears salvo, score and cooldown',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);r.observe(state({time:1.2}));r.observe(state({epoch:1}));A.equal(r.hits+r.shots,0);A.equal(r.pending,null);A.equal(r.coolUntil,0);});
test('backwards same-epoch time invalidates',()=>{const r=fresh();r.observe(state({time:2}));A.equal(r.observe(state({time:1})).valid,false);A.equal(r.fire(state({time:3}),start,r.targets[0]).valid,false);});
test('malformed host cannot fire',()=>{const r=fresh();A.equal(r.fire(state({time:NaN}),start,r.targets[0]).valid,false);A.equal(r.pending,null);});
test('malformed aim rejected without increment',()=>{const r=fresh();A.equal(r.fire(state(),{x:NaN,y:1,z:0},r.targets[0]).reason,'INVALID_AIM');A.equal(r.shots,0);});
test('closing cancels flight without scoring',()=>{const r=fresh();r.fire(state(),start,r.targets[1]);r.cancel();r.observe(state({time:5}));A.equal(r.hits,0);});
test('three targets clear and further fire blocked',()=>{const r=fresh();for(let i=0;i<3;i++){r.fire(state({time:i*2}),start,r.targets[i]);r.observe(state({time:i*2+1.2}));}A.equal(r.hits,3);A.equal(r.fire(state({time:7}),start,r.targets[0]).reason,'RANGE_COMPLETE');});
test('reset yields new fixed targets relative to vessel',()=>{const r=fresh();r.reset(state({x:100,z:30,heading:Math.PI/2}));A(Math.abs(r.targets[1].x-100)<1e-7);A(Math.abs(r.targets[1].z-369)<1e-7);});
test('visual arc reaches only its frozen endpoints',()=>{const end={x:300,y:1.5,z:50};A.deepEqual(arc(start,end,0),start);const q=arc(start,end,1);A(Math.abs(q.y-end.y)<1e-9);A.equal(q.x,end.x);A(arc(start,end,.5).y>24);});
test('independent instances never share score',()=>{const a=fresh(),b=fresh();a.fire(state(),start,a.targets[1]);a.observe(state({time:2}));A.equal(b.hits+b.shots,0);});
test('original model and yacht physics retained',()=>{for(const [p,h]of Object.entries({'assets/ATLAS_W.glb':'cfce666ed4c79446e7ad7c86be45385db7056618be4cdb233e4bf2b79241f27f','physics.js':'a60b52e0771d294e773d6fc4e5a509677d14b1fc26a519dc0f6348f415707627'}))A.equal(crypto.createHash('sha256').update(fs.readFileSync('./site/'+p)).digest('hex'),h);});
test('actual Three geometry contains two separate large barrels',()=>{global.window=global;global.self=global;require('./site/vendor/runtime.js');const T=global.ATLASRuntime,{makeBattery}=require('./gunnery.js'),b=makeBattery(T);b.root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(b.root);A.equal(b.barrels.length,2);A.equal(b.muzzles.length,2);A(box.max.x-box.min.x>15);A(box.max.z-box.min.z>7);for(const o of b.muzzles)A(o.getWorldPosition(new T.Vector3()).x>51);});
