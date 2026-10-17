'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),{holdChannel,bindHold}=require('./mobile.js');
function rig(){const values=[],c=holdChannel(v=>values.push(v));return {c,values,last:()=>values.at(-1)};}
test('release returns helm to center',()=>{const r=rig();r.c.press(1,-1);assert.equal(r.last(),-1);r.c.release(1);assert.equal(r.last(),0);});
test('opposing simultaneous fingers: latest wins, release restores remaining',()=>{const r=rig();r.c.press(1,-1);r.c.press(2,1);assert.equal(r.last(),1);r.c.release(2);assert.equal(r.last(),-1);r.c.release(1);assert.equal(r.last(),0);});
test('older pointer release cannot clear newer held steering',()=>{const r=rig();r.c.press(1,-1);r.c.press(2,1);r.c.release(1);assert.equal(r.last(),1);});
test('clear followed by stale pointerup does not reactivate',()=>{const r=rig();r.c.press(1,-1);r.c.clear();r.c.release(1);assert.equal(r.last(),0);assert.equal(r.c.count(),0);});
test('unknown pointer release changes nothing',()=>{const r=rig();r.c.press(1,1);r.c.release(15);assert.equal(r.last(),1);});
test('reject nonfinite value and invalid pointer id',()=>{const r=rig();r.c.press('1',1);r.c.press(1,NaN);assert.equal(r.c.count(),0);});
function button(){const h={},classes=new Set();return {h,addEventListener(n,f){(h[n]??=[]).push(f);},setPointerCapture(){},classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)},emit(n,e={}){(h[n]||[]).forEach(f=>f({preventDefault(){},pointerId:1,button:0,pointerType:'touch',...e}));}};}
for(const reason of ['pointerup','pointercancel','lostpointercapture'])test(reason+' centers bound pointer',()=>{const r=rig(),b=button();bindHold(b,r.c,-1);b.emit('pointerdown');assert.equal(r.last(),-1);b.emit(reason);assert.equal(r.last(),0);});
test('failed pointer capture cannot leave active steering',()=>{const r=rig(),b=button();b.setPointerCapture=()=>{throw Error('disconnected');};bindHold(b,r.c,1);b.emit('pointerdown');assert.equal(r.c.count(),0);});
test('keyboard hold released on blur',()=>{const r=rig(),b=button();bindHold(b,r.c,1);b.emit('keydown',{code:'Space'});assert.equal(r.last(),1);b.emit('blur');assert.equal(r.last(),0);});
test('right mouse button never commands steering',()=>{const r=rig(),b=button();bindHold(b,r.c,1);b.emit('pointerdown',{button:2,pointerType:'mouse'});assert.equal(r.c.count(),0);});
