'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const B=require('../../bolster-state.js'),rows=[];
function test(name,f){try{const result=f();rows.push({name,passed:true,result:result??null});}catch(e){rows.push({name,passed:false,error:e.stack});}}
const phase=(v,t)=>B.classify(v,t,[v*B.angleRad,v*B.angleRad]);
test('Recorded returned-down residual is unavailable, not relabeled settled',()=>{for(const v of [0.00004539981247581407,0.00004539987344409541]){assert.equal(phase(v,0).downStable,false);assert.equal(phase(v,0).transitioning,true);}});
test('Exact down and exact up are distinct endpoints',()=>{assert.equal(phase(0,0).downStable,true);assert.equal(phase(1,1).downStable,false);assert.equal(phase(1,1).settled,true);});
test('Command departure invalidates even before any geometric movement',()=>{assert.equal(phase(0,1).transitioning,true);assert.equal(phase(1,0).transitioning,true);});
test('Read never accepts a nonzero residual, including below snap threshold',()=>{for(const v of [Number.EPSILON,0.5e-5,1e-5,1.00001e-5,.001,.01])assert.equal(phase(v,0).downStable,false);});
test('Zero fitting dt cannot fabricate a settled pose',()=>assert.equal(B.advance(.5e-5,0,0),.5e-5));
test('Both endpoint approach thresholds, unchanged exponential away from stop',()=>{const dt=.01;for(const target of [0,1])for(const gap of [.5e-5,.99999e-5,1.00001e-5,2e-5,.01]){const value=target===0?gap*Math.exp(4*dt):1-gap*Math.exp(4*dt);const raw=value+(target-value)*(1-Math.exp(-4*dt)),next=B.advance(value,target,dt);assert.equal(next,Math.abs(target-raw)<=B.snapThreshold?target:raw);}});
test('All 101 start values move monotonically without overshoot and actually seat',()=>{for(const target of [0,1])for(let i=0;i<=100;i++){let v=i/100,last=v;for(let j=0;j<250;j++){v=B.advance(v,target,1/60);assert.ok(v>=0&&v<=1);assert.ok(Math.abs(target-v)<=Math.abs(target-last));last=v;}assert.equal(v,target);}});
test('Malformed aggregate, sparse angles and target values reject',()=>{for(const v of [NaN,Infinity,-.1,1.1])assert.equal(phase(v,0).phase,'invalid');for(const t of [.5,NaN,Infinity])assert.equal(phase(0,t).phase,'invalid');assert.equal(B.classify(0,0,new Array(2)).phase,'invalid');});
test('Per-pivot mismatch rejects despite zero aggregate',()=>{assert.equal(B.classify(0,0,[0,.00001]).phase,'invalid');assert.equal(B.classify(0,0,[0,1e-13]).downStable,false);});
test('Invalid fitting step throws rather than advancing a foreign clock',()=>{for(const x of [[NaN,0,.01],[0,.5,.01],[0,1,-1],[0,1,NaN]])assert.throws(()=>B.advance(...x));});
const report={revision:B.revision,sourceSHA:process.env.GITHUB_SHA||'LOCAL_UNPUBLISHED',passed:rows.every(x=>x.passed),tests:rows,scope:'pure owner fitting law and endpoint predicate, not actual host or human contact'};
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
