/* Unified game controls. Stateful held inputs; no key-repeat dependence. */
(function(G){'use strict';
 const MAP=Object.freeze({KeyW:'ahead',ArrowUp:'ahead',KeyS:'astern',ArrowDown:'astern',KeyA:'port',ArrowLeft:'port',KeyD:'starboard',ArrowRight:'starboard',Space:'fire',KeyQ:'aimLeft',KeyE:'aimRight',KeyR:'raise',KeyF:'lower'});
 const SHORT=Object.freeze({Digit1:'first',Digit2:'third',Digit3:'chase',KeyG:'gun',BracketLeft:'previousGun',BracketRight:'gun',KeyZ:'focus',KeyV:'look',Tab:'target',KeyC:'camera',KeyX:'idle',KeyP:'pause',Escape:'pause',KeyH:'help',KeyM:'sound'});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function editable(e){return !!e?.target?.closest?.('input,select,textarea,[contenteditable="true"]');}
 class Inputs{
  constructor(){this.tokens=new Map();this.lastHelm=0;}
  hold(token,action){if(typeof token==='string'&&typeof action==='string')this.tokens.set(token,action);}
  release(token){this.tokens.delete(token);}
  has(action){return [...this.tokens.values()].includes(action);}
  axis(negative,positive){return Number(this.has(positive))-Number(this.has(negative));}
  clear(){this.tokens.clear();this.lastHelm=0;}
  step(dt,s,command){
   if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('INVALID_INPUT_STEP');
   if(s.paused){this.clear();return;}
   const axis=this.axis('astern','ahead');
   if(axis){
    if(!s.engine)command('engine');
    // Demand opposite thrust to brake; ramp through idle, never teleport velocity.
    const p=(s.port+s.starboard)/2;
    if(s.gear!==axis&&p>.015){command('port',Math.max(0,p-dt*.8));command('starboard',Math.max(0,p-dt*.8));}
    else {if(s.gear!==axis)command('gear',axis);const power=clamp(p+dt*.42,0,1);command('port',power);command('starboard',power);}
   }
   const helm=this.axis('port','starboard');
   if(helm||this.lastHelm!==0)command('helm',helm);
   this.lastHelm=helm;
  }
 }
 function bindKeyboard(target,inputs,act,enabled=()=>true){
  const down=e=>{if(e.code==='Escape'&&G.document?.pointerLockElement)return;if(!enabled()||editable(e))return;const action=MAP[e.code],single=SHORT[e.code];if(!action&&!single)return;e.preventDefault();if(action){inputs.hold('key:'+e.code,action);if(action==='fire'&&!e.repeat)act('fire');}else if(!e.repeat)act(single);};
  const up=e=>{if(MAP[e.code]){inputs.release('key:'+e.code);if(enabled()&&!editable(e))e.preventDefault();}};
  target.addEventListener('keydown',down);target.addEventListener('keyup',up);
  return ()=>{target.removeEventListener('keydown',down);target.removeEventListener('keyup',up);inputs.clear();};
 }
 function bindPointer(el,action,inputs,enabled=()=>true){
  const held=new Set();
  const down=e=>{if(!enabled()||el.disabled||e.button>0)return;e.preventDefault();const token='pointer:'+e.pointerId;held.add(e.pointerId);inputs.hold(token,action);el.classList.add('pressed');try{el.setPointerCapture(e.pointerId);}catch(_){}};
  const up=e=>{held.delete(e.pointerId);inputs.release('pointer:'+e.pointerId);if(!held.size)el.classList.remove('pressed');};
  el.addEventListener('pointerdown',down);for(const k of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(k,up);
  return ()=>{el.removeEventListener('pointerdown',down);for(const k of ['pointerup','pointercancel','lostpointercapture'])el.removeEventListener(k,up);for(const id of held)inputs.release('pointer:'+id);held.clear();el.classList.remove('pressed');};
 }
 const api={MAP,SHORT,Inputs,bindKeyboard,bindPointer,editable};G.AtlasActionControls=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
