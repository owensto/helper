/* Fictional game mechanics. No real weapon data, ballistics or fire-control model. */
(function(G){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
function point(origin,heading,bearing,reach){const a=heading+bearing;return {x:origin.x+Math.cos(a)*reach,y:1.5,z:origin.z+Math.sin(a)*reach};}
function arc(start,end,t){t=clamp(t,0,1);return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t+Math.sin(Math.PI*t)*24,z:start.z+(end.z-start.z)*t};}
class RangeSession{
 constructor(){this.epoch=null;this.lastTime=-Infinity;this.coolUntil=0;this.shots=0;this.hits=0;this.pending=null;this.lastResult=null;this.targets=[];this.invalid=false;}
 reset(s){if(!this.validState(s))return false;if(s.epoch===this.epoch&&s.time<this.lastTime)return false;this.epoch=s.epoch;this.lastTime=s.time;this.invalid=false;this.pending=null;this.lastResult=null;this.coolUntil=s.time;this.shots=this.hits=0;const o={x:s.x+39*Math.cos(s.heading),z:s.z+39*Math.sin(s.heading)};this.targets=[[-.55,230],[0,300],[.55,370]].map(([a,d],i)=>({...point(o,s.heading,a,d),id:i+1,hit:false}));return true;}
 validState(s){return s&&Number.isSafeInteger(s.epoch)&&s.epoch>=0&&[s.time,s.x,s.z,s.heading].every(Number.isFinite)&&s.time>=0&&typeof s.paused==='boolean';}
 observe(s){if(!this.validState(s)){this.invalid=true;this.pending=null;return {valid:false,reason:'INVALID_HOST'};}if(this.epoch!==s.epoch){this.reset(s);return {valid:true,reset:true};}if(s.time<this.lastTime){this.invalid=true;this.pending=null;return {valid:false,reason:'BACKWARDS_HOST_TIME'};}if(this.invalid)return {valid:false,reason:'REACQUIRE_REQUIRED'};this.lastTime=s.time;if(!s.paused&&this.pending&&s.time>=this.pending.born+this.pending.duration){const shot=this.pending;const target=this.targets.find(t=>!t.hit&&Math.hypot(t.x-shot.end.x,t.z-shot.end.z)<=12);if(target){target.hit=true;this.hits++;}this.lastResult={id:shot.id,hit:!!target,targetId:target?.id??null,end:{...shot.end},time:s.time};this.pending=null;}return {valid:true,reset:false};}
 fire(s,start,end){const o=this.observe(s);if(!o.valid)return o;if(s.paused)return {valid:false,reason:'PAUSED'};if(!finitePoint(start)||!finitePoint(end))return {valid:false,reason:'INVALID_AIM'};if(this.pending||s.time<this.coolUntil)return {valid:false,reason:'RELOADING'};if(this.targets.every(t=>t.hit))return {valid:false,reason:'RANGE_COMPLETE'};this.shots++;this.pending={id:this.shots,born:s.time,duration:1.15,start:{...start},end:{...end}};this.coolUntil=s.time+1.8;return {valid:true,shot:{...this.pending}};}
 cancel(){this.pending=null;}
 inspect(){return {epoch:this.epoch,time:this.lastTime,shots:this.shots,hits:this.hits,coolUntil:this.coolUntil,pending:this.pending?JSON.parse(JSON.stringify(this.pending)):null,lastResult:this.lastResult?JSON.parse(JSON.stringify(this.lastResult)):null,targets:this.targets.map(t=>({...t})),invalid:this.invalid};}
}
const api={RangeSession,point,arc,clamp};G.AtlasRangeLogic=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
