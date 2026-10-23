'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const Y=require('./site/physics.js'),W=require('./site/warship-physics.js');
function run(v,seconds){for(let i=0;i<seconds*60;i++)v.step(1/60);return v.read();}
function engine(){const v=new W.Vessel();v.command('engine');v.command('gear',1);v.command('port',.8);v.command('starboard',.8);return v;}
test('yacht dynamics exact original bytes',()=>assert.equal(crypto.createHash('sha256').update(fs.readFileSync('./site/physics.js')).digest('hex'),'a60b52e0771d294e773d6fc4e5a509677d14b1fc26a519dc0f6348f415707627'));
test('yacht and warship are different identities and parameter objects',()=>{assert.notEqual(W.Vessel,Y.Vessel);assert.notEqual(W.P,Y.P);assert.equal(W.P.length,125);assert.equal(Y.P.length,82.9);});
test('warship starts engine off, neutral, no leftover controls',()=>{const s=new W.Vessel().read();assert.equal(s.engine,false);assert.equal(s.gear,0);assert.equal(s.port+s.starboard+s.speedKnots,0);});
test('forward thrust moves real state',()=>{const s=run(engine(),25);assert(s.forwardMps>.4);assert(s.x>3);assert(Math.abs(s.sideMps)<1e-8);});
test('pause freezes all state',()=>{const v=engine();run(v,5);v.command('pause');const before=v.read();run(v,3);assert.deepEqual(v.read(),before);});
test('reset clears heading hold and restores clean voyage',()=>{const v=engine();run(v,5);v.command('hold');const e=v.epoch;v.reset();assert.equal(v.engine,false);assert.equal(v.headingHold,false);assert.equal(v.gear,0);assert.equal(v.time,0);assert.equal(v.epoch,e+1);});
test('port and starboard steering mirror',()=>{const a=engine(),b=engine();a.command('helm',1);b.command('helm',-1);run(a,60);run(b,60);assert(Math.abs(a.heading+b.heading)<1e-8);assert(a.heading>.05);});
test('engine differential produces yaw',()=>{const a=engine();a.command('starboard',0);run(a,25);assert(a.r>0);});
test('neutral keeps momentum',()=>{const v=engine();run(v,50);const before=v.u;v.command('gear',0);v.step(1/60);assert(v.u>before*.9);});
test('unknown depth fails conservative footprint',()=>{const v=engine();v.x=12050;v.step(1/60);assert.equal(v.grounded,true);});
test('warship footprint exceeds yacht footprint',()=>{const s=fs.readFileSync('./site/warship-physics.js','utf8');assert(s.includes('[-63,-45,-25,0,25,45,63]'));assert(s.includes('[-9.5,0,9.5]'));});
test('two-vessel states do not alias',()=>{const y=new Y.Vessel(),w=engine();run(w,5);assert.equal(y.time,0);assert.equal(y.engine,false);});
test('invalid steps reject',()=>{const v=new W.Vessel();for(const d of [-1,NaN,Infinity,.2])assert.throws(()=>v.step(d));});
test('warship asset exact original Git identity',()=>{const b=fs.readFileSync('./site/assets/ATLAS_W.glb'),m=JSON.parse(fs.readFileSync('./site/warship-asset.json'));assert.equal(b.length,6244704);assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex'),'826f70bfaae812538aca710ab9f10a09fae70a24');assert.equal(crypto.createHash('sha256').update(b).digest('hex'),m.sha256);});
