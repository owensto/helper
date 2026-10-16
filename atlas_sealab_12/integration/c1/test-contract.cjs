'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const API=require('./host-hooks.js'),D=JSON.parse(fs.readFileSync(path.join(__dirname,'descriptor.json'),'utf8'));
const tests=[];function test(name,f){f();tests.push({name,passed:true});}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('Exact reviewed/public baseline and descriptor version',()=>{assert.equal(D.revision,API.revision);assert.equal(D.baseline.publicSHA,'a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff');assert.equal(D.baseline.reviewSourceSHA,'5c62a713b014b97a47bb65b65ec05f382a23ac77');});
test('Host manifest fingerprint bound in implementation',()=>{const h=hash(API.canonical(D.hostFiles));assert.equal(h,D.baseline.hostFilesCanonicalSHA256);assert.ok(fs.readFileSync(path.join(__dirname,'host-hooks.js'),'utf8').includes(h));});
test('Full descriptor pinned against tampering',()=>{assert.ok(fs.readFileSync(path.join(__dirname,'host-hooks.js'),'utf8').includes(hash(API.canonical(D))));});
test('Canonical order and finite-number policy',()=>{assert.equal(API.canonical({b:2,a:[1,null]}),'{"a":[1,null],"b":2}');assert.throws(()=>API.canonical({a:Infinity}),/NON_FINITE/);assert.throws(()=>API.canonical(undefined),/UNSUPPORTED/);});
test('Recursive immutable arrays and nested pose structures',()=>{const v=API.freeze({m:[1,2],deep:{q:[0,0,0,1]}});assert.throws(()=>{v.m[0]=3;},TypeError);assert.throws(()=>{v.deep.q.push(0);},TypeError);});
test('Yacht cannot inherit Bay pose, spawn or helm capability',()=>{const v=D.vessels['atlas-d-original-r7'];assert.equal(v.available,false);for(const k of ['spawn','restore','helmAnchors','transitionOccupancy'])assert.equal(v[k],null);});
test('Current captain position corrected; pivots not fabricated contact targets',()=>{const v=D.vessels['atlas-bay-25-sealab12'].anchors;assert.deepEqual(v.captainRootLocal,[-1.60,1.06,.18]);for(const k of ['seatContact','leftGrip','rightGrip','leftSole','rightSole','transitionOccupancy'])assert.equal(v[k],null);});
test('No integration-owned timers, render loop, transport or physics step',()=>{const text=fs.readFileSync(path.join(__dirname,'host-hooks.js'),'utf8');assert.ok(!/setInterval\s*\(|setTimeout\s*\(|requestAnimationFrame\s*\(|new WebSocket\s*\(|\.step\s*\(/.test(text));});
test('All receiving owners must ACK exact revision and candidate',()=>{assert.deepEqual(Object.keys(D.ackRequired).sort(),['HUMANS','MULTIPLAYER','YACHT']);assert.equal(D.combinedAcceptance,false);assert.equal(D.authority.roomPhysicsOrigin,null);});
(async()=>{await assert.rejects(API.attach({...D,revision:'bad'}),/DESCRIPTOR_MISMATCH/);tests.push({name:'Changed descriptor fails closed before host access',passed:true});console.log(JSON.stringify({passed:true,scope:'descriptor/static-only, no browser or combined claim',tests},null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
