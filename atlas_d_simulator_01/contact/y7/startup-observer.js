/* Test-only passive lifecycle trace. No state writes, automatic Resume, renderer
 * hooks, extra RAF loop, CPU/performance profile or visibility emulation. */
(()=>{'use strict';
 const mode=window.__Y7_MODE||'events-only';
 const out=window.__Y7={mode,events:[],ownerLoopTransitions:[],firstOwnerBoundaries:[],errors:[],timeOrigin:performance.timeOrigin,ownerLoopSource:null};
 let tail=false,revision=0,ownerFunction=null,previous=null,loops=0;
 const watched=['pointerdown','pointerup','pointercancel','click','input','change','blur','focus','visibilitychange','resize','pageshow','pagehide'];
 function state(){const p=window.ATLAS_D_SIM,s=p?.state;if(!s)return null;return {ready:p.ready,active:p.active,paused:s.paused,message:s.message,elapsed:s.elapsed,sequence:s.sequence,engine:s.engine,gear:s.gear,throttle:s.throttle,rudder:s.rudder,bowThruster:s.bowThruster,mode:s.mode,depthM:s.depthM};}
 function base(){return {at:performance.now(),absolute:performance.timeOrigin+performance.now(),realm:window===window.top?'top':'iframe',hidden:document.hidden,visibility:document.visibilityState,hasFocus:document.hasFocus(),width:innerWidth,height:innerHeight,state:state()};}
 function push(kind,extra={}){const row={...base(),kind,...extra};out.events.push(row);if(out.events.length>1500)out.events.shift();return row;}
 function relevant(e){return !['blur','focus'].includes(e.type)||e.target===window;}
 function event(e,phase){if(!relevant(e))return;const t=e.target;if(phase==='capture'&&(e.type==='visibilitychange'||(e.type==='click'&&['ad-board','ad-reset','ad-exit'].includes(t.id))))revision++;
  push('event',{event:e.type,phase,trusted:e.isTrusted,windowTarget:t===window,target:t.id||t.nodeName||'window',pointerType:e.pointerType||null,pointerId:e.pointerId??null,key:e.key||null});}
 for(const type of watched){const target=type==='visibilitychange'?document:window;target.addEventListener(type,e=>event(e,'capture'),true);}
 out.attachTail=()=>{if(tail)return;tail=true;for(const type of watched){const target=type==='visibilitychange'?document:window;target.addEventListener(type,e=>event(e,'after-owner'),false);}const nodes=['ad-pause','ad-notice'].map(id=>document.getElementById(id)).filter(Boolean);if(nodes.length){const mo=new MutationObserver(()=>push('display',{pauseLabel:document.getElementById('ad-pause')?.textContent,notice:document.getElementById('ad-notice')?.textContent}));for(const n of nodes)mo.observe(n,{subtree:true,childList:true,characterData:true});}push('tail-attached');};
 out.mark=label=>push('checkpoint',{label,pauseLabel:document.getElementById('ad-pause')?.textContent,notice:document.getElementById('ad-notice')?.textContent});
 if(mode==='loop-boundary'){
  const native=window.requestAnimationFrame,wrappers=new WeakMap();
  window.requestAnimationFrame=function(callback){
   if(typeof callback!=='function')return native.apply(this,arguments);
   if(!ownerFunction&&Function.prototype.toString.call(callback).includes('Rendering stalled. Paused instead of pretending simulated time kept up.')){ownerFunction=callback;out.ownerLoopSource=Function.prototype.toString.call(callback);}
   if(callback!==ownerFunction)return native.apply(this,arguments);
   if(!wrappers.has(callback))wrappers.set(callback,function(timestamp){
    const before=base(),prior=previous,rev=revision;let returned;
    try{returned=callback.apply(this,arguments);}catch(e){out.errors.push(String(e));throw e;}finally{
     const after=base();loops++;const entry={timestamp,previousTimestamp:prior?.timestamp??null,privateLastDirectlyRead:false,consecutiveNoLastReset:!!(prior&&prior.revision===rev&&revision===rev),before,after};
     if(loops<=5)out.firstOwnerBoundaries.push(entry);
     if(before.state?.paused!==after.state?.paused||before.state?.active!==after.state?.active)out.ownerLoopTransitions.push(entry);
     previous={timestamp,revision};
    }return returned;
   });
   return native.call(this,wrappers.get(callback));
  };
 }
 out.read=()=>({mode:out.mode,timeOrigin:out.timeOrigin,events:out.events,ownerLoopTransitions:out.ownerLoopTransitions,firstOwnerBoundaries:out.firstOwnerBoundaries,ownerLoopSource:out.ownerLoopSource,errors:out.errors,current:base()});
 push('observer-installed');
})();
