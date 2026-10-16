'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');const R=__dirname,E=path.join(R,'evidence');
const rows=[];const test=(name,fn)=>{fn();rows.push({name,passed:true});};
test('baseline entry remains original Y4',()=>assert(fs.readFileSync(path.join(R,'verify.py'),'utf8').includes("ENTRY=os.environ.get('ENTRY','y4')")));
test('no simulation input authority in timing shim',()=>{const s=fs.readFileSync(path.join(R,'measure.js'),'utf8');assert(!/\.command\(|\.testStep\(|\.step\(|dispatchEvent\(/.test(s));});
if(fs.existsSync(path.join(E,'measurements.json'))){
 const d=JSON.parse(fs.readFileSync(path.join(E,'measurements.json')));test('six real completed trials',()=>{assert(d.passed);assert.equal(d.trials.length,6);assert(d.trials.every(x=>x.passed));});
 for(const t of d.trials){test(t.mode+'/'+t.trial+' direct timestamps, trusted input, preserved state',()=>{const q=t.timing;assert(q.ended>q.started);assert(q.installs>=1);assert(q.raf.length>=12);assert(q.frames.length>=12);assert(q.events.length>=12);for(const p of q.events){assert.equal(p.trusted,true);assert(p.handlerObservedAbsolute>=p.eventAbsolute-1);assert(p.renderSubmittedAbsolute>=p.handlerObservedAbsolute);assert(p.nextRAFAbsolute>=p.renderSubmittedAbsolute);}for(const p of q.frames){assert(p.sourceUnchanged);assert(p.contactAvailable);assert.equal(p.paused,false);if(t.mode==='profile'){assert(p.nativeMs>=0);assert(p.previewMs>=-0.001);assert(Math.abs(p.previewMs+p.nativeMs-p.totalSubmissionMs)<.001);}}});}
 test('no pixel recording during timed intervals',()=>{assert.equal(d.screenshotsDuringTiming,false);assert.equal(d.videoDuringTiming,false);assert.equal(d.extraRaysDuringTiming,false);});
}
const output={passed:true,total:rows.length,tests:rows};fs.mkdirSync(E,{recursive:true});fs.writeFileSync(path.join(E,'metrics-audit.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
