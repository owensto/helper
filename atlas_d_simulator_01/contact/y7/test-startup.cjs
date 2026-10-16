'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=__dirname,source=fs.readFileSync(path.join(root,'startup-observer.js'),'utf8'),test=fs.readFileSync(path.join(root,'verify.py'),'utf8');
const rows=[];function run(name,fn){fn();rows.push({name,passed:true});}
run('Observer contains no owner writes or substitute command/step/resume',()=>{assert(!/state\.[a-zA-Z]+\s*=(?!=)/.test(source));assert(!/\.(command|testStep|setPaused)\s*\(/.test(source));assert(!/dispatchEvent\s*\(/.test(source));});
run('Observer does not add a render loop or profile renderer',()=>{assert(!/requestAnimationFrame\s*\(/.test(source));assert(!/renderer\.|Raycaster|setInterval|PerformanceObserver/.test(source));assert(source.includes('native.call(this,wrappers.get(callback))'));});
run('Startup prohibits capture and retains actual visibility rather than emulating hidden',()=>{assert(test.includes("assert not diagnosing,'Screenshot prohibited during startup diagnosis'"));assert(!/setWebLifecycleState|setDocumentVisibility|dispatchEvent|\.command\(|\.testStep\(/.test(test));});
run('Both layouts and both observer modes use repeated fresh contexts',()=>{assert(test.includes('range(3)'));assert(test.includes("['events-only','loop-boundary']"));assert(test.includes('browser.new_context'));assert(test.includes('same runner')||test.includes('oneRunnerBothLayouts'));});
fs.mkdirSync(path.join(root,'evidence'),{recursive:true});fs.writeFileSync(path.join(root,'evidence','harness-tests.json'),JSON.stringify({passed:true,total:rows.length,scope:'Static harness guards, not browser scenario count',tests:rows},null,2));console.log(JSON.stringify({passed:true,total:rows.length,tests:rows},null,2));
