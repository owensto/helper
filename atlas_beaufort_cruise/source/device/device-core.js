/* Device Helm 2: input/presentation policy, not a second physics clock. */
(function(g,f){const a=f();if(typeof module==='object')module.exports=a;else g.AtlasDeviceCore=a;})(globalThis,()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const RIGS=Object.freeze({single300:Object.freeze({count:1,hp:300,engineKg:277,label:'Single 300'}),single450:Object.freeze({count:1,hp:450,engineKg:437,label:'Single 450 · faster'}),twin300:Object.freeze({count:2,hp:300,engineKg:277,label:'Twin 300s · most power'})});
function steerAt(x,box){if(!Number.isFinite(x)||!box||!Number.isFinite(box.left)||!(box.width>0))return 0;const v=clamp((x-box.left)/box.width*2-1,-1,1),dead=.06;return Math.abs(v)<=dead?0:Math.sign(v)*Math.pow((Math.abs(v)-dead)/(1-dead),1.35);}
function trimText(s){if(!s||![s.trim,s.trimActual].every(Number.isFinite))return 'Trim —';const a=Math.round(s.trimActual*100),b=Math.round(s.trim*100);return 'Trim '+a+'%'+(Math.abs(a-b)>1?' → '+b+'%':'');}
function clearance(s,feet=true){const c=s?.bottomClearance;if(!Number.isFinite(c))return {tone:'unknown',text:'Depth unknown'};if(c<=0)return{tone:'contact',text:'Bottom contact'};const n=c*(feet?3.280839895:1);return{tone:c<.55?'shallow':'normal',text:(n<.1?'<0.1':n.toFixed(1))+' '+(feet?'ft':'m')+' under '+(s.bottomPart==='PROP'?'prop':'hull')};}
function rigAllowed(s){if(!s||s.performanceMode==='reference')return 'Reference mode has a fixed engine.';if(s.destroyed10||s.engineDisabled10)return 'Recover the boat before changing engines.';if(s.engine||s.startTimer>0)return 'Switch off the engine first.';if(s.gear!==0||s.throttle!==0)return 'Select Neutral and idle power first.';if(!Number.isFinite(s.speedOverGround)||s.speedOverGround>.5)return 'Let the boat slow below 1 knot first.';return null;}
function applyRig(host,key){if(host.isLocal()!==true)throw Error('Local boat only.');const rig=RIGS[key];if(!rig)throw Error('Unknown engine setup.');const s=host.read(),why=rigAllowed(s);if(why)throw Error(why);const old=s.config;s.config={...old,count:rig.count,hp:rig.hp,engineKg:rig.engineKg,split:0};try{host.syncRig();}catch(e){s.config=old;try{host.syncRig();}catch(_){}throw e;}return rig;}
function changePower(host,n){if(host.isLocal()!==true||!Number.isFinite(n))return false;host.dispatch('throttle',clamp(n,0,host.docking()?.22:1));return true;}
function fullPower(host){if(host.isLocal()!==true)throw Error('Local boat only.');host.setDocking(false);host.dispatch('throttle',1);}
/* The native actuator smooths rudder motion. This supplies a fine proportional
   target instead of snapping to the old fixed +/-72% on every press. */
class Steering{
 constructor(host){this.h=host;this.pointer=null;this.value=0;this.closed=false;}
 start(id,x,box){if(this.closed||this.pointer!==null||this.h.isLocal()!==true||this.h.paused())return false;this.pointer=id;this.h.held(true);this.move(id,x,box);return true;}
 move(id,x,box){if(this.closed||this.pointer!==id||this.h.isLocal()!==true)return false;this.value=steerAt(x,box);this.h.dispatch('steering',this.value);return true;}
 release(id){if(this.pointer===null||id!==undefined&&id!==this.pointer)return false;this.pointer=null;this.value=0;this.h.held(false);if(this.h.isLocal()===true)this.h.dispatch('steering',0);return true;}
 key(v){if(this.closed||this.h.isLocal()!==true||this.h.paused()||!Number.isFinite(v))return false;this.value=clamp(v,-1,1);this.h.held(this.value!==0);this.h.dispatch('steering',this.value);return true;}
 reset(){this.pointer=null;this.value=0;this.h.held(false);if(!this.closed&&this.h.isLocal()===true)this.h.dispatch('steering',0);}
 dispose(){if(this.closed)return;this.reset();this.closed=true;}
}
function renderScale(mode,dpr=1,software=false){if(software)return .5;const d=Number.isFinite(dpr)&&dpr>0?dpr:1;return Math.min(d,mode==='detailed'?1.5:mode==='smooth'?.75:1);}
/* Layout targets are deterministic CSS dimensions, not a rendered result. */
function layout(w,h){const wide=w>=760||(w>=680&&h<=560),header=56,bottom=wide?134:184;return {wide,header,bottom,unobstructedHeight:Math.max(0,h-header-bottom-24)};}
return Object.freeze({RIGS,steerAt,trimText,clearance,rigAllowed,applyRig,changePower,fullPower,Steering,renderScale,layout});});
