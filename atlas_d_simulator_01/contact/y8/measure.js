/* Y8 passive evidence shim. Executes original callbacks/receivers once, unchanged.
 * No new RAF requests, owner steps/commands/state writes, input synthesis, rays,
 * or pixel reads. Match predicates are replayed independently by replay.py.
 */
(()=>{'use strict';
const top=window.top;
const stamp=()=>{const monoMs=performance.now();return {timeOriginMs:performance.timeOrigin,monoMs,absoluteMs:performance.timeOrigin+monoMs,wallUnixMs:Date.now()};};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>finite(x)?x:null;
const bool=x=>typeof x==='boolean'?x:null;
if(window===top){
 const m=window.__Y8={segment:null,segments:[],errors:[],installs:0,sourceMatches:[],originSerial:0,renderSerial:0,eventSerial:0,origins:[],frames:[],events:[],eventTiming:[],overhead:[],seq:0};
 m.begin=(name,timed=false)=>{if(m.segment)throw Error('SEGMENT_ALREADY_ACTIVE');const s={id:++m.seq,name,timed,start:stamp(),end:null};m.segments.push(s);m.segment=s;return s.id;};
 m.end=()=>{if(!m.segment)throw Error('NO_SEGMENT');m.segment.end=stamp();const s=m.segment;m.segment=null;return s.id;};
 m.read=()=>({schema:'atlas-y8-replay/1',segments:m.segments,origins:m.origins,frames:m.frames,events:m.events,eventTiming:m.eventTiming,overhead:m.overhead,errors:m.errors,sourceMatches:m.sourceMatches,installs:m.installs,eventTimingSupported:m.eventTimingSupported??null});
 m.calibrate=()=>{let sink=0;const pairs=[];const plain=x=>x+1,wrapped=x=>{const a=performance.now();const y=plain(x);sink+=performance.now()-a;return y;};for(let j=0;j<6;j++){let a=performance.now();for(let i=0;i<20000;i++)sink+=plain(i);const plainMs=performance.now()-a;a=performance.now();for(let i=0;i<20000;i++)sink+=wrapped(i);pairs.push({calls:20000,plainMs,twoClockWrapperMs:performance.now()-a});}return {pairs,sink,wholeShimOverhead:false};};
 return;
}
const M=top.__Y8;if(!M)return;
const expectedLoop=window.__Y8_EXPECTED_OWNER_LOOP;
let currentRAF=null,ownerFunction=null,api;
function direct(){const s=window.ATLAS_D_SIM?.state;return {available:!!s,elapsedSeconds:number(s?.elapsed),sequence:number(s?.sequence),rudder:number(s?.rudder),throttle:number(s?.throttle),paused:bool(s?.paused),engine:bool(s?.engine),gear:number(s?.gear)};}
function sample(){const t=top.Y4?.latest,s=t?.state,p=t?.physical,f=t?.frame,missing=[];
 const n=(x,k)=>{if(!finite(x)){missing.push({field:k,reason:x==null?'MISSING':'NONFINITE_OR_WRONG_TYPE'});return null;}return x;};
 const node=document.getElementById('ad-power');if(!node)missing.push({field:'powerHUDText',reason:'NODE_UNAVAILABLE'});
 return {observedAt:stamp(),owner:direct(),sampledState:{elapsedSeconds:n(s?.elapsed,'sampledState.elapsedSeconds'),sequence:n(s?.sequence,'sampledState.sequence'),rudder:n(s?.rudder,'sampledState.rudder'),throttle:n(s?.throttle,'sampledState.throttle'),paused:bool(s?.paused)},physical:{available:bool(p?.available),reason:p?.reason??null,controlNormalized:n(p?.articulation?.controlNormalized,'physical.controlNormalized'),wheelAngleRad:n(p?.articulation?.wheelAngleRad,'physical.wheelAngleRad')},powerHUDText:node?.textContent??null,frame:{id:n(f?.frameId,'frame.id'),seconds:n(f?.simTimeSeconds,'frame.seconds'),instanceId:f?.instanceId??null,activationEpoch:n(f?.activationEpoch,'frame.activationEpoch'),simulationEpoch:n(f?.simulationEpoch,'frame.simulationEpoch'),worldRevision:f?.worldRevision??null,frameToken:f?.frameToken??null},fixtureDt:n(t?.mapped?.frame?.dt,'fixtureDt'),sourceUnchanged:bool(t?.sourceUnchanged),missing};
}
function originDelta(o,s){if(!o||o.kind!=='native_owner_raf')return {seconds:null,sequenceDelta:null,status:'NO_NATIVE_OWNER_BOUNDARY'};
 const a=o.ownerBefore,b=s.owner;if(!finite(a.elapsedSeconds)||!finite(b.elapsedSeconds)||!finite(a.sequence)||!finite(b.sequence))return {seconds:null,sequenceDelta:null,status:'STATE_UNAVAILABLE'};
 const d=b.elapsedSeconds-a.elapsedSeconds,q=b.sequence-a.sequence;if(d<0||q<0)return {seconds:null,sequenceDelta:q,status:'RESET_OR_DISCONTINUITY',rawSeconds:d};
 return {seconds:d,sequenceDelta:q,status:d===0?'ZERO_OBSERVED':'ADVANCED',method:'owner.elapsed_at_render - owner.elapsed_at_callback_entry; not requested dt or fixture dt'};
}
function expected(e){if(e.kind==='rudder'){if(e.event==='pointerdown'&&e.target==='ad-left')return -1;if(e.event==='pointerdown'&&e.target==='ad-right')return 1;if(['pointerup','pointercancel'].includes(e.event)&&['ad-left','ad-right'].includes(e.target))return 0;return null;}
 if(e.kind==='power'&&e.event==='input'&&e.target==='ad-throttle'&&typeof e.inputValue==='string'&&e.inputValue.trim()!==''&&Number.isFinite(Number(e.inputValue)))return Number(e.inputValue)/100;return null;}
function predicate(e,r){const reasons=[],v=expected(e),s=r.sample;
 if(v===null||!e.trusted)reasons.push('INVALID_EVENT');
 if(r.segmentId!==e.segmentId||r.start.absoluteMs<e.observed.absoluteMs)reasons.push('NOT_POST_EVENT_SAME_SEGMENT');
 if(e.kind==='rudder'){
  if(s.physical.available!==true)reasons.push('PHYSICAL_UNAVAILABLE');
  if(s.sampledState.rudder===null||s.sampledState.rudder!==v)reasons.push('RUDDER_MISMATCH_OR_MISSING');
  if(s.physical.controlNormalized===null||s.physical.controlNormalized!==v)reasons.push('PHYSICAL_CONTROL_MISMATCH_OR_MISSING');
 }else if(e.kind==='power'){
  if(s.sampledState.throttle===null||v===null||Math.abs(s.sampledState.throttle-v)>=1e-8)reasons.push('POWER_MISMATCH_OR_MISSING');
  if(typeof s.powerHUDText!=='string'||s.powerHUDText!==Math.round(v*100)+'%')reasons.push('HUD_MISMATCH_OR_MISSING');
 }
 return {matched:reasons.length===0,reasons};
}
const nativeRAF=window.requestAnimationFrame,wrappers=new WeakMap();
window.requestAnimationFrame=function(fn){if(typeof fn!=='function')return nativeRAF.apply(this,arguments);
 const text=Function.prototype.toString.call(fn);if(!ownerFunction&&text===expectedLoop){ownerFunction=fn;M.sourceMatches.push({realm:'iframe',matched:true,source:text,at:stamp()});}
 if(!wrappers.has(fn))wrappers.set(fn,function(ts){const previous=currentRAF,seg=M.segment,begin=stamp(),o={id:++M.originSerial,segmentId:seg?.id??null,kind:fn===ownerFunction?'native_owner_raf':'native_other_raf',callbackName:fn.name||null,sourceMatched:fn===ownerFunction,rafTimestampMs:ts,entry:begin,ownerBefore:direct(),exit:null,ownerAfter:null};currentRAF=o;
  try{return fn.apply(this,arguments);}catch(e){if(seg)M.errors.push({originId:o.id,error:String(e)});throw e;}finally{const a=performance.now();o.ownerAfter=direct();o.exit=stamp();if(seg){M.origins.push(o);M.overhead.push({kind:'raf_record_finalize',segmentId:seg.id,ms:performance.now()-a});}currentRAF=previous;}
 });return nativeRAF.call(this,wrappers.get(fn));};
const recordEvent=e=>{if(!M.segment||!e.isTrusted)return;const id=e.target?.id;let kind=null;if(['pointerdown','pointerup','pointercancel'].includes(e.type)&&['ad-left','ad-right'].includes(id))kind='rudder';if(e.type==='input'&&id==='ad-throttle')kind='power';if(!kind)return;
 const a=performance.now(),observed=stamp(),r={id:++M.eventSerial,segmentId:M.segment.id,event:e.type,target:id,kind,trusted:e.isTrusted,pointerId:e.pointerId??null,pointerType:e.pointerType??null,inputValue:typeof e.target.value==='string'?e.target.value:null,eventTimeOriginMs:performance.timeOrigin,eventTimeStampMs:e.timeStamp,eventAbsoluteMs:performance.timeOrigin+e.timeStamp,observed,sampleAtEvent:sample(),expected:null,matchedRenderId:null,matchEndAbsoluteMs:null,followingOwnerRAFId:null,attempts:[]};r.expected=expected(r);M.events.push(r);M.overhead.push({kind:'event_snapshot',segmentId:M.segment.id,ms:performance.now()-a});};
for(const event of ['pointerdown','pointerup','pointercancel','input'])document.addEventListener(event,recordEvent,true);
try{new PerformanceObserver(list=>{if(!M.segment)return;for(const e of list.getEntries())M.eventTiming.push({segmentId:M.segment.id,name:e.name,target:e.target?.id??null,startAbsoluteMs:performance.timeOrigin+e.startTime,durationMs:e.duration,processingStartAbsoluteMs:performance.timeOrigin+e.processingStart,processingEndAbsoluteMs:performance.timeOrigin+e.processingEnd,interactionId:e.interactionId});}).observe({type:'event',buffered:true,durationThreshold:16});M.eventTimingSupported=true;}catch{M.eventTimingSupported=false;}
Object.defineProperty(window,'BAYPLAY',{configurable:true,enumerable:true,get:()=>api,set(v){api=v;if(!v?.renderer)return;const renderer=v.renderer,native=renderer.render;let current=native;
 Object.defineProperty(renderer,'render',{configurable:true,enumerable:true,get:()=>current,set(fn){M.installs++;current=function(...args){if(!M.segment||args[0]!==api.scene)return fn.apply(this,args);const seg=M.segment,start=stamp(),o=currentRAF,r={id:++M.renderSerial,segmentId:seg.id,start,end:null,sample:null,origin:{kind:o?o.kind:'outside_raf_manual_or_diagnostic_unattributed',callbackId:o?.id??null,sourceMatched:o?.sourceMatched??false,rafTimestampMs:o?.rafTimestampMs??null},consumedSimulationDelta:null};let value;
  try{value=fn.apply(this,args);}finally{r.end=stamp();const a=performance.now();r.sample=sample();r.consumedSimulationDelta=originDelta(o,r.sample);M.frames.push(r);
   for(const e of M.events){if(e.segmentId!==seg.id)continue;if(e.matchedRenderId===null){const q=predicate(e,r);e.attempts.push({renderId:r.id,...q});if(q.matched){e.matchedRenderId=r.id;e.matchEndAbsoluteMs=r.end.absoluteMs;}}}
   M.overhead.push({kind:'render_snapshot_and_join',segmentId:seg.id,ms:performance.now()-a});
  }return value;};}});
}});
// Replayable following-owner-callback pairing is derived at readout, not by
// scheduling a synthetic frame. Unmatched/missing origins remain null.
const originalRead=M.read;
M.read=()=>{for(const e of M.events){if(e.matchedRenderId===null)continue;const o=M.origins.find(o=>o.segmentId===e.segmentId&&o.kind==='native_owner_raf'&&o.entry.absoluteMs>e.matchEndAbsoluteMs);e.followingOwnerRAFId=o?.id??null;}return originalRead();};
})();
