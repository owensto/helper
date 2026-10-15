/* Duplicate display refreshes must not erase genuinely sampled sonar history. */
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const sandbox={window:{},document:{getElementById:()=>null}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'site','instruments.js'),'utf8'),sandbox);
const I=sandbox.window.CMD_INSTRUMENTS,tests=[];
for(const offset of [0,.01667,.173,1.7733,7.42,21.975]){
 I.reset();I.scrollRate=1;const s={location:'basin',x:-700,z:-300,elapsed:offset,depth:5,config:{tide:0},airborne:false,heave:0};let previous=0,resets=0;
 for(let n=0;n<3781;n++){s.elapsed+=1/60;s.x+=.3;I.observe(s);if(n%30===0)I.observe(s);if(I.history.length<previous)resets++;previous=I.history.length;}
 assert.equal(resets,0);assert.equal(I.history.length,316);
 tests.push({offset,real_samples:I.history.length,unintended_resets:resets,passed:true});
 const len=I.history.length;for(let n=0;n<100;n++)I.observe(s);assert.equal(I.history.length,len,'Paused display must not invent returns');
 I.waypoint={location:'basin',x:0,z:0};s.location='beaufort';I.observe(s);assert.equal(I.history.length,1);assert.equal(I.waypoint,null);
 s.x+=500;I.observe(s);assert.equal(I.history.length,1,'Teleport clears discontinuous trace');
 s.elapsed=0;I.observe(s);assert.equal(I.history.length,1,'True simulation reset clears trace');
}
console.log(JSON.stringify({passed:true,duplicate_refresh_regressions:tests,paused_no_fake_returns:true,location_waypoint_reset:true,teleport_and_clock_reset:true},null,2));
