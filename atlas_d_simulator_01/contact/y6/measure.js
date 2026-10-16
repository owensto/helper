/* Y6 measurement shim, injected before unchanged page scripts. No simulation writes.
 * Timed intervals never capture pixels/video or add geometric queries. Existing Y4
 * samples/checks remain. Browser frame opportunity is not physical screen latency.
 */
(()=>{'use strict';
 const root=window.top,abs=()=>performance.timeOrigin+performance.now();
 if(window===root){
  const M=window.__Y6={active:false,detailed:false,phase:null,current:null,frames:[],raf:[],events:[],eventTiming:[],pending:[],bookkeeping:[],callbackCPU:[],installs:0,rawNativeCalls:0};
  let handle=0;
  const tick=stamp=>{if(!M.active)return;const a=abs();M.raf.push({stamp,absolute:a});handle=requestAnimationFrame(tick);M.callbackCPU.push(abs()-a);};
  M.start=(mode,trial)=>{if(M.active)throw Error('MEASUREMENT_ALREADY_ACTIVE');Object.assign(M,{mode,trial,detailed:mode==='profile',frames:[],raf:[],events:[],eventTiming:[],pending:[],bookkeeping:[],callbackCPU:[],started:abs(),active:true});handle=requestAnimationFrame(tick);};
  M.stop=()=>{M.active=false;cancelAnimationFrame(handle);M.ended=abs();return {mode:M.mode,trial:M.trial,started:M.started,ended:M.ended,frames:M.frames,raf:M.raf,events:M.events,eventTiming:M.eventTiming,bookkeeping:M.bookkeeping,callbackCPU:M.callbackCPU,installs:M.installs};};
  M.calibrate=()=>{const rows=[];let sink=0;const noop=x=>x+1;const timed=x=>{const a=performance.now();const v=noop(x);sink+=performance.now()-a;return v;};for(let j=0;j<6;j++){let a=performance.now();for(let i=0;i<20000;i++)sink+=noop(i);const raw=performance.now()-a;a=performance.now();for(let i=0;i<20000;i++)sink+=timed(i);rows.push({calls:20000,rawMs:raw,twoClockWrapperMs:performance.now()-a});}return {rows,sink};};
 }
 const M=root.__Y6;if(!M)return;
 function timedMethod(proto,key,category,filter=()=>true){const fn=proto?.[key];if(typeof fn!=='function')return;let depth=0;proto[key]=function(...args){if(!M.active||!M.detailed||M.phase!=='preview'||!filter(this)||depth)return fn.apply(this,args);const start=abs();depth++;try{return fn.apply(this,args);}finally{depth--;const cost=abs()-start;const q=M.current;if(q){q[category]=(q[category]||0)+cost;q[category+'Calls']=(q[category+'Calls']||0)+1;}}};}
 function timedSetter(proto,key){const d=Object.getOwnPropertyDescriptor(proto,key);if(!d?.set||!d.configurable)return;Object.defineProperty(proto,key,{...d,set(value){if(!M.active||!M.detailed||M.phase!=='preview')return d.set.call(this,value);const a=abs();try{return d.set.call(this,value);}finally{if(M.current){M.current.domMs+=abs()-a;M.current.domCalls++;}}}});}
 timedSetter(Node.prototype,'textContent');timedSetter(Element.prototype,'className');timedMethod(Element.prototype,'getBoundingClientRect','layoutMs');
 if(window===root)return;
 const eventRecord=e=>{if(!M.active||!e.isTrusted)return;let type=null,expected=null;const id=e.target.id;
  if(e.type==='pointerdown'&&['ad-left','ad-right'].includes(id)){type='rudder';expected=id==='ad-left'?-1:1;}
  if(['pointerup','pointercancel'].includes(e.type)&&['ad-left','ad-right'].includes(id)){type='rudder';expected=0;}
  if(e.type==='input'&&id==='ad-throttle'){type='power';expected=Number(e.target.value)/100;}
  if(!type)return;
  const p={index:M.events.length,event:e.type,target:id,kind:type,expected,pointerType:e.pointerType||null,trusted:true,eventAbsolute:performance.timeOrigin+e.timeStamp,handlerObservedAbsolute:abs(),renderSubmittedAbsolute:null,nextRAFAbsolute:null};M.events.push(p);M.pending.push(p);
 };
 for(const e of ['pointerdown','pointerup','pointercancel','input'])document.addEventListener(e,eventRecord,true);
 try{new PerformanceObserver(list=>{if(!M.active)return;for(const e of list.getEntries())M.eventTiming.push({name:e.name,startAbsolute:performance.timeOrigin+e.startTime,duration:e.duration,processingStartAbsolute:performance.timeOrigin+e.processingStart,processingEndAbsolute:performance.timeOrigin+e.processingEnd,interactionId:e.interactionId,target:e.target?.id||null});}).observe({type:'event',buffered:true,durationThreshold:16});M.eventTimingSupported=true;}catch(e){M.eventTimingSupported=false;}
 function feedback(){if(!M.pending.length)return;const latest=root.Y4?.latest||root.Y6?.latest;if(!latest)return;for(const p of M.pending){if(p.renderSubmittedAbsolute!==null)continue;let match=false;if(p.kind==='rudder')match=latest.physical?.available&&latest.physical.articulation.controlNormalized===p.expected&&latest.state.rudder===p.expected;else match=Math.abs(latest.state.throttle-p.expected)<1e-8&&document.getElementById('ad-power').textContent===Math.round(p.expected*100)+'%';if(match){p.renderSubmittedAbsolute=abs();p.frameId=latest.frame.frameId;p.ownerSeconds=latest.state.elapsed;requestAnimationFrame(()=>{p.nextRAFAbsolute=abs();});}}M.pending=M.pending.filter(p=>p.renderSubmittedAbsolute===null);}
 let api;
 Object.defineProperty(window,'BAYPLAY',{configurable:true,enumerable:true,get:()=>api,set(v){api=v;if(!v?.renderer)return;const renderer=v.renderer,native=renderer.render;
  // Preserve the original call/receiver. A later Y4 assignment captures this native
  // layer; its wrapper and true WebGL submission are measured independently.
  let current=function(...a){if(!M.active)return native.apply(this,a);const start=M.detailed?abs():0,phase=M.phase;M.phase='native';try{return native.apply(this,a);}finally{if(M.detailed&&M.current)M.current.nativeMs+=abs()-start;M.phase=phase;M.rawNativeCalls++;}};
  Object.defineProperty(renderer,'render',{configurable:true,enumerable:true,get:()=>current,set(fn){M.installs++;current=function(...args){if(!M.active||args[0]!==api.scene||!window.ATLAS_D_SIM?.active)return fn.apply(this,args);const a=abs(),q={start:a,nativeMs:0,domMs:0,domCalls:0,layoutMs:0,cameraMs:0,boxMs:0};const prev=M.current,phase=M.phase;M.current=q;M.phase='preview';let result;try{result=fn.apply(this,args);}finally{const end=abs();q.end=end;q.totalSubmissionMs=end-a;q.previewMs=M.detailed?q.totalSubmissionMs-q.nativeMs:null;const t=root.Y4?.latest||root.Y6?.latest;q.observerSelfReportedMs=t?.costMs??null;q.frameId=t?.frame?.frameId;q.ownerSeconds=t?.state?.elapsed;q.rudder=t?.state?.rudder;q.paused=t?.state?.paused;q.contactAvailable=t?.physical?.available;q.sourceUnchanged=t?.sourceUnchanged;M.current=prev;M.phase=phase;M.frames.push(q);const b=abs();feedback();M.bookkeeping.push(abs()-b);}return result;};}});
  const T=window.ATLASRuntime;
  // Mutually exclusive camera API categories. setFromObject is timed separately;
  // allocation/vector math outside these methods stays explicitly in the residual.
  timedMethod(T.Box3.prototype,'setFromObject','boxMs');
  timedMethod(T.PerspectiveCamera.prototype,'updateProjectionMatrix','cameraMs');
  timedMethod(T.Camera.prototype,'clone','cameraCloneMs');
  timedMethod(T.Object3D.prototype,'lookAt','cameraLookMs',o=>o.isCamera);
  M.attached=true;
 }});
})();
