/* Mobile driving intents only. Ticked by the existing vessel loop; no new clock. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasMobile6=a;})(globalThis,()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),approach=(a,b,d)=>a+clamp(b-a,-d,d);
function waterSpeed(s){return Number.isFinite(s.u)&&Number.isFinite(s.v)?Math.hypot(s.u,s.v):Math.max(0,Number(s.speedOverGround)||0);}
function steeringLimit(s){const v=waterSpeed(s);return clamp(1/(1+(v/13)**2),.20,1);}
function dragSteer(dx,width){if(!Number.isFinite(dx)||!(width>0))return 0;const v=clamp(dx/Math.max(45,width*.44),-1,1),a=Math.abs(v);return a<.04?0:Math.sign(v)*Math.pow((a-.04)/.96,1.35);}
function isTouch(e){return e?.pointerType==='touch'||e?.pointerType==='pen';}
function coarse(W){return !!W?.matchMedia?.('(pointer: coarse)').matches;}
// A long frame never becomes a burst of unobserved high-speed physics on touch.
// Normal 30/60/120Hz time and the existing 1/60 integration step are unchanged.
function shouldHold(dt,acc,touch,active){return !!(touch&&active&&(!Number.isFinite(dt)||dt<0||dt+acc>12/60+1e-8));}
function surfaceStepCount(dt,acc=0){return Math.floor((Math.max(0,dt)+Math.max(0,acc)+1e-10)*60);}
function create(H,C){
 const native=new C.Steering(H);let closed=false,touch=false,raw=0,value=0,anchor=0,width=1,pointer=null;
 let powerPointer=null,powerAnchor=0,powerWidth=1,powerBase=0,powerTarget=null,lastSent=null,gear=H.read().gear;
 const enabled=()=>!closed&&H.isLocal()===true&&!H.paused()&&!H.blocked?.();
 function cancelPower(){powerPointer=null;powerTarget=null;lastSent=null;}
 function reset(){native.reset();pointer=null;touch=false;raw=value=0;H.held(false);}
 function tick(dt){
  if(!enabled()){if(pointer!==null||value||native.pointer!==null||native.value)reset();cancelPower();return;}
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);const s=H.read();
  if(touch&&pointer!==null){const desired=raw*steeringLimit(s),rate=waterSpeed(s)>10?1.25:3;
   value=approach(value,desired,rate*dt);H.dispatch('steering',value);}
  if(s.gear!==gear){cancelPower();gear=s.gear;}
  if(powerTarget!==null){
   // External gear/keyboard/idle/recovery actions win over a queued touch ramp.
   if(lastSent!==null&&Math.abs(s.throttle-lastSent)>1e-7){cancelPower();return;}
   powerTarget=clamp(powerTarget,0,H.docking()?.22:1);
   const next=approach(s.throttle,powerTarget,(powerTarget>s.throttle?.65:2.2)*dt);
   if(Math.abs(next-s.throttle)>1e-8){H.dispatch('throttle',next);lastSent=H.read().throttle;}
   if(Math.abs(H.read().throttle-powerTarget)<1e-7){powerTarget=null;lastSent=null;}
  }
 }
 const steering={
  get pointer(){return touch?pointer:native.pointer;},get value(){return touch?value:native.value;},
  start(id,x,box,type){if(!enabled()||pointer!==null||native.pointer!==null||!Number.isFinite(x)||!(box?.width>0))return false;
   if(type!=='touch'&&type!=='pen')return native.start(id,x,box);
   touch=true;pointer=id;anchor=x;width=box.width;raw=value=0;H.held(true);H.dispatch('steering',0);return true;},
  move(id,x,box){if(!touch)return native.move(id,x,box);if(!enabled()||id!==pointer||!Number.isFinite(x))return false;raw=dragSteer(x-anchor,width);return true;},
  release(id){if(!touch)return native.release(id);if(pointer===null||id!==undefined&&id!==pointer)return false;reset();return true;},
  key(v){reset();return native.key(v);},reset,dispose(){if(closed)return;reset();cancelPower();native.dispose();closed=true;}
 };
 const power={
  start(e,box){if(!isTouch(e)||!enabled()||powerPointer!==null||!Number.isFinite(e.clientX)||!(box?.width>0))return false;
   powerPointer=e.pointerId;powerAnchor=e.clientX;powerWidth=box.width;powerBase=H.read().throttle;powerTarget=null;lastSent=null;gear=H.read().gear;return true;},
  move(e){if(powerPointer!==e.pointerId||!enabled()||!Number.isFinite(e.clientX))return false;
   powerTarget=clamp(powerBase+(e.clientX-powerAnchor)/Math.max(80,powerWidth),0,H.docking()?.22:1);lastSent=H.read().throttle;return true;},
  end(e,cancel=false){if(powerPointer!==e.pointerId)return false;powerPointer=null;if(cancel)cancelPower();return true;},
  request(n){if(!enabled()||!Number.isFinite(n))return false;powerTarget=clamp(n,0,H.docking()?.22:1);lastSent=H.read().throttle;gear=H.read().gear;return true;},
  idle(){cancelPower();if(H.isLocal()===true)H.dispatch('throttle',0);},
  full(){if(!enabled())return;H.setDocking(false);power.request(1);},
  cancel:cancelPower,get pointer(){return powerPointer;},get target(){return powerTarget;}
 };
 return {steering,power,tick,cancel(){reset();cancelPower();},inspect:()=>({touchSteering:touch,pointerHeld:steering.pointer!==null,steeringTarget:steering.value,steeringLimit:steeringLimit(H.read()),powerTarget}),dispose:()=>steering.dispose()};
}
return Object.freeze({create,coarse,isTouch,steeringLimit,dragSteer,waterSpeed,shouldHold,surfaceStepCount});});
