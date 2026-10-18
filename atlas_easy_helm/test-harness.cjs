'use strict';
/* Reuse the original test fixture without changing its 34 assertions or product
   source. The three added host/DOM primitives model the V2 receiving contract.
   This remains a synthetic interface, NOT a browser or layout engine. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=path.join(__dirname,'test.cjs'),text=fs.readFileSync(file,'utf8'),at=text.indexOf('(async()=>{');
assert(at>0,'Original fixture boundary changed');
const context=vm.createContext({require,__dirname,module:{exports:{}},console,EventTarget,Event,AbortController,URL,queueMicrotask});
vm.runInContext(text.slice(0,at)+'\nmodule.exports={fixture,host};',context,{filename:file});
const original=context.module.exports;
module.exports={host:original.host,fixture(){
 const f=original.fixture();
 f.h.paused=()=>false;f.h.closePanel=()=>f.h.calls.push(['closePanel']);
 const prototype=Object.getPrototypeOf(f.controls['helm09-key']);
 prototype.removeAttribute=function(name){delete this.attrs[name];};
 return f;
}};
