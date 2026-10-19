/* Keyboard intents on the ONE native frame loop. No timer, propulsion or new clock. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasHelmInput=a;})(globalThis,()=>{'use strict';
const codes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyZ','Space']);
function code(e){if(e.code)return e.code;const k=String(e.key||'');return k===' '?'Space':/^[wasdqz]$/i.test(k)?'Key'+k.toUpperCase():k;}
function editing(n){for(let i=0;n&&i<15;i++,n=n.parentNode){const tag=String(n.tagName||'').toUpperCase();if(n.isContentEditable||n.getAttribute?.('contenteditable')==='true'||n.getAttribute?.('role')==='textbox'||['TEXTAREA','SELECT'].includes(tag)||tag==='INPUT'&&n.type!=='range')return true;}return false;}
function owns(e){return codes.has(code(e));}
class Keyboard{
 constructor(h){this.h=h;this.keys=new Set();this.active=true;this.steering=false;this.lastSteer=0;}
 clear(){this.keys.clear();if(this.steering){this.steering=false;this.lastSteer=0;if(this.h.local())this.h.dispatch('steering',0);}}
 guard(){if(!this.h.local()||this.h.blocked()||editing(this.h.focus())){this.clear();return false;}return true;}
 down(e){if(!owns(e))return false;if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||editing(e.target)||!this.guard())return false;
  if(String(e.target?.tagName).toUpperCase()==='INPUT'&&e.target.type==='range'&&code(e).startsWith('Arrow'))return false;
  e.preventDefault?.();e.stopImmediatePropagation?.();const c=code(e);if(c==='Space'){if(!e.repeat){this.h.dispatch('throttle',0);this.h.dispatch('gear',0);}this.keys.delete('KeyW');this.keys.delete('ArrowUp');return true;}
  this.keys.add(c);return true;
 }
 up(e){const c=code(e);if(!owns(e))return false;this.keys.delete(c);if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(c)&&!['KeyA','KeyD','ArrowLeft','ArrowRight'].some(k=>this.keys.has(k))&&this.steering){this.steering=false;this.lastSteer=0;if(this.h.local())this.h.dispatch('steering',0);}return true;}
 tick(dt){if(!this.active||!this.guard()||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);const s=this.h.read(),has=(...k)=>k.some(v=>this.keys.has(v));
  const power=Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown'));
  if(power&&Number.isFinite(s.throttle)){const v=s.throttle+dt*(power>0?.36:-.50);this.h.dispatch('throttle',Math.max(0,Math.min(this.h.docking()?.22:1,v)));}
  const left=has('KeyA','ArrowLeft'),right=has('KeyD','ArrowRight');
  if(left||right){if(this.h.pointerHeld())return;const target=Number(right)-Number(left);this.lastSteer=target===0?0:Math.max(-1,Math.min(1,this.lastSteer+target*dt*2));this.steering=true;this.h.dispatch('steering',this.lastSteer);}
  const trim=Number(has('KeyQ'))-Number(has('KeyZ'));if(trim&&s.performanceMode!=='reference'&&Number.isFinite(s.trim))this.h.dispatch('trim',Math.max(0,Math.min(1,s.trim+trim*dt*.35)));
 }
 dispose(){if(!this.active)return;this.clear();this.active=false;}
}
function install(h){const k=new Keyboard(h),W=h.window,D=h.document,off=new AbortController(),opts={capture:true,signal:off.signal};
 W.addEventListener('keydown',e=>k.down(e),opts);W.addEventListener('keyup',e=>k.up(e),opts);
 W.addEventListener('blur',()=>k.clear(),opts);D.addEventListener('visibilitychange',()=>{if(D.hidden)k.clear();},opts);D.addEventListener('focusin',e=>{if(editing(e.target))k.clear();},opts);
 const old=k.dispose.bind(k);k.dispose=()=>{old();off.abort();};k.owns=owns;return k;
}
return Object.freeze({Keyboard,install,owns,editing,code});});
