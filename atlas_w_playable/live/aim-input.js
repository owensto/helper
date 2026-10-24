/* Direct game input. No camera-mode-dependent aiming or hidden auto-lock. */
(function(G){'use strict';
function bind({canvas,pad,lockButton,enabled,paused,move,fire,hold,zoom,status,window:GWindow=G,document:D=G.document}){
 const points=new Map(),listeners=[];let disposed=false,locked=false;
 const on=(node,type,fn,opts)=>{node?.addEventListener(type,fn,opts);listeners.push(()=>node?.removeEventListener(type,fn,opts));};
 function usable(){return !disposed&&enabled();}
 function reset(){points.clear();hold(false);zoom(false);pad?.classList.remove('pressed');}
 function hint(message){if(status)status(message);}
 function focusCanvas(){try{canvas.focus({preventScroll:true});}catch(_){}}
 function down(e){
  if(!usable())return;
  const touch=e.pointerType==='touch'||e.pointerType==='pen';
  if(e.button>2)return;if(touch)e.preventDefault();focusCanvas();
  const aiming=touch||e.button===2;
  points.set(e.pointerId,{x:e.clientX,y:e.clientY,aiming,touch});
  try{e.currentTarget?.setPointerCapture(e.pointerId);}catch(_){}
  if(aiming){pad?.classList.add('pressed');if(!touch)zoom(true);hint(paused()?'Paused — Resume to move the turret':'MANUAL AIM');}
  else if(e.button===0&&paused())hint('Paused — Resume before firing');
 }
 function motion(e){
  if(!usable())return;
  if(locked&&e.pointerType!=='touch')return; // locked motion is handled once, on mousemove
  const p=points.get(e.pointerId);if(!p||!p.aiming||(!p.touch&&((e.buttons??2)&2)===0))return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||paused())return;
  move(dx,dy);e.preventDefault();
 }
 function up(e){const p=points.get(e.pointerId);if(!p)return;points.delete(e.pointerId);if(!p.aiming)hold(false);if(![...points.values()].some(p=>p.aiming)){zoom(false);pad?.classList.remove('pressed');}}
 for(const node of [canvas,pad].filter(Boolean)){
  on(node,'pointerdown',down);on(node,'pointermove',motion);for(const t of ['pointerup','pointercancel','lostpointercapture'])on(node,t,up);
  on(node,'contextmenu',e=>e.preventDefault());
 }
 // Mouse button events preserve RMB aim + LMB fire: Pointer Events only emits
 // pointerdown for the first pressed mouse button, not each additional button.
 on(canvas,'mousedown',e=>{if(!usable())return;if(e.button===2){for(const p of points.values())if(!p.touch){p.aiming=true;p.x=e.clientX;p.y=e.clientY;}zoom(true);return;}if(e.button!==0||paused())return;e.preventDefault();focusCanvas();hold(true);fire();});
 on(D,'mouseup',e=>{if(e.button===0)hold(false);if(e.button===2){for(const p of points.values())if(!p.touch)p.aiming=false;zoom(false);}});
 on(D,'mousemove',e=>{if(!locked||!usable()||paused())return;const x=Number(e.movementX),y=Number(e.movementY);if(Number.isFinite(x)&&Number.isFinite(y))move(x,y);});
 on(D,'pointerlockchange',()=>{locked=D.pointerLockElement===canvas;reset();if(lockButton){lockButton.textContent=locked?'MOUSE ACTIVE · ESC':'LOCK MOUSE';lockButton.setAttribute('aria-pressed',String(locked));}hint(locked?'Mouse aims · left click fires · Esc releases':'Right-drag or swipe to aim');});
 on(D,'pointerlockerror',()=>{hint('Mouse lock unavailable — right-drag or swipe to aim');reset();});
 on(GWindow,'blur',reset);on(GWindow,'resize',reset);on(D,'visibilitychange',()=>{reset();if(D.hidden&&D.pointerLockElement===canvas)D.exitPointerLock?.();});
 if(lockButton)lockButton.onclick=async()=>{
  if(!usable())return;
  if(D.pointerLockElement===canvas){D.exitPointerLock?.();return;}
  if(typeof canvas.requestPointerLock!=='function'){hint('Use right-drag or swipe to aim on this browser');return;}
  try{focusCanvas();await canvas.requestPointerLock();}catch(_){hint('Mouse lock unavailable — use right-drag or swipe');}
 };
 return {clear(){reset();if(D.pointerLockElement===canvas)D.exitPointerLock?.();},inspect:()=>({locked,pointers:points.size,disposed}),dispose(){if(disposed)return;disposed=true;reset();listeners.forEach(f=>f());if(lockButton)lockButton.onclick=null;if(D.pointerLockElement===canvas)D.exitPointerLock?.();}};
}
G.AtlasDirectAim={bind};if(typeof module!=='undefined')module.exports=G.AtlasDirectAim;
})(globalThis);
