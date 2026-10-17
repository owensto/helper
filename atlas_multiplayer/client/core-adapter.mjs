import { createRoomClient } from './room-client.mjs';
import { RemoteBuffer } from './interpolation.mjs';
const failure=code=>Object.assign(new Error(code),{code});
// Only prepareLocal is asynchronous. Do not await a renderer/cleanup/observer in CORE's frame.
function syncResult(value) {
  if(value!==null && (typeof value==='object'||typeof value==='function') && typeof value.then==='function') {
    Promise.resolve(value).catch(()=>{}); // Observe rejection; cannot cancel arbitrary host side effects.
    throw failure('ASYNC_CALLBACK_UNSUPPORTED');
  }
  return value;
}

/** CORE owns every controller/render hook. Callback failures cannot escape into its frame loop. */
export async function createCoreAdapter({enabled=false,host,world,vesselId,...options}={}) {
  if(!enabled)return Object.freeze({info:Object.freeze({state:'disabled'}),render:()=>0,dispose:()=>{},subscribe:()=>()=>{}});
  const hooks={};
  for(const key of ['readLocal','prepareLocal','exitLocal','renderRemote','removeRemote']) {
    try{const fn=host?.[key];if(typeof fn!=='function')throw new Error();hooks[key]=fn.bind(host);}
    catch{throw failure('HOST_ADAPTER_REQUIRED:'+key);}
  }
  let begun=false,prepared=false,disposed=false,tearingDown=false,stopQueued=false;
  let rootFault=null,cleanupIncomplete=false,statusSinkDisabled=false,hostFailures=0,observerFailures=0;
  const warnings=new Set(),attemptedRemovals=new Set(),observers=new Map();
  let statusSink=null;
  try{const fn=host.networkStatus;if(typeof fn==='function')statusSink=fn.bind(host);}
  catch{statusSinkDisabled=true;warnings.add('HOST_STATUS_FAILED');hostFailures++;}
  const buffer=new RemoteBuffer();
  function callbackFailure(error,code,required=false){
    if(error?.code==='ASYNC_CALLBACK_UNSUPPORTED'){
      warnings.add('HOST_ASYNC_HOOK_UNSUPPORTED');
      if(required)cleanupIncomplete=true;
    }
    warn(code);
  }
  const client=await createRoomClient({...options,world,
    readSample:()=>{
      let sample;
      try{sample=syncResult(hooks.readLocal());}
      catch(error){
        callbackFailure(error,'HOST_READ_FAILED',true);
        const safe=new Set(['HOST_FRAME_INVALID','HOST_CLOCK_REGRESSION','STALE_WORLD_REVISION','HOST_IDENTITY_MISMATCH','CORE_RECOVERY_REQUIRED']);
        throw failure(safe.has(error?.code)?error.code:'HOST_FRAME_INVALID');
      }
      if(sample?.vesselId!==vesselId)throw failure('VESSEL_SWITCH_REQUIRES_REJOIN');
      return {pose:sample.pose,clock:sample.clock??null};
    },
    onWelcome:async context=>{
      begun=true;
      let accepted;
      try{accepted=await hooks.prepareLocal(context);}catch{throw failure('HOST_PREPARE_FAILED');}
      if(context.signal.aborted)return false;
      prepared=accepted===true;return prepared;
    }
  });
  const info=()=>({...client.info,...(rootFault?{state:'error',error:rootFault}:{}),
    cleanupIncomplete,warnings:[...warnings]});
  function warn(code,observer=false){warnings.add(code);if(observer)observerFailures++;else hostFailures++;}
  function notify(type,detail){
    let failed=false;
    for(const fn of [...(observers.get(type)||[])]){
      try{syncResult(fn(structuredClone(detail)));}catch(error){
        observers.get(type)?.delete(fn);warn(error?.code==='ASYNC_CALLBACK_UNSUPPORTED'?'OBSERVER_ASYNC_UNSUPPORTED':'OBSERVER_FAILED',true);failed=true;
      }
    }
    if(failed&&type!=='status')notify('status',info());
  }
  function status(){
    if(!statusSinkDisabled&&statusSink){
      try{syncResult(statusSink(info()));}catch(error){statusSinkDisabled=true;callbackFailure(error,'HOST_STATUS_FAILED');}
    }
    notify('status',info());
  }
  function stopForFault(code){
    rootFault??=client.info.state==='error'?client.info.error:code;
    prepared=false;
    if(!stopQueued&&!tearingDown&&!disposed){
      stopQueued=true;
      // Leave after the current WebSocket/EventTarget callback completes, avoiding reentrant dialing.
      queueMicrotask(()=>{stopQueued=false;if(!disposed)client.leave();status();});
    }
  }
  function remove(id){
    if(attemptedRemovals.has(id))return;
    attemptedRemovals.add(id);
    try{syncResult(hooks.removeRemote(id));}catch(error){
      cleanupIncomplete=true;callbackFailure(error,'HOST_REMOVE_FAILED',true);stopForFault('HOST_REMOVE_FAILED');
    }
  }
  const snapshot=event=>{
    if(disposed||rootFault)return;
    try{for(const id of buffer.ingest(event.detail,event.detail.selfId))remove(id);}
    catch{warn('HOST_FRAME_INVALID');stopForFault('HOST_FRAME_INVALID');}
    if(!rootFault)notify('snapshot',event.detail);
  };
  const exit=event=>{
    if(tearingDown)return;
    tearingDown=true;prepared=false;
    for(const id of buffer.clear())remove(id);
    if(begun){
      begun=false;
      try{syncResult(hooks.exitLocal(event.detail.reason));}catch(error){
        cleanupIncomplete=true;callbackFailure(error,'HOST_EXIT_FAILED',true);stopForFault('HOST_EXIT_FAILED');
      }
    }
    tearingDown=false;notify('exit',{reason:event.detail.reason,cleanupIncomplete});status();
  };
  client.addEventListener('snapshot',snapshot);client.addEventListener('status',status);client.addEventListener('exit',exit);
  async function start(action,name,invite){
    if(disposed)throw failure('ADAPTER_DISPOSED');
    if(cleanupIncomplete)throw failure('HOST_CLEANUP_REQUIRED');
    if(stopQueued)throw failure('ADAPTER_STOPPING');
    if(['idle','error'].includes(client.info.state)){rootFault=null;attemptedRemovals.clear();}
    try{return await client[action]({name,vesselId,...(invite?{invite}:{})});}
    catch(e){throw rootFault?failure(rootFault):e;}
  }
  return {
    get info(){return info();},
    get stats(){return {...client.stats,hostFailures,observerFailures,cleanupIncomplete};},
    get worldHash(){return client.worldHash;},
    get transportRoomAgeSeconds(){return client.roomAgeSeconds;},
    create:name=>start('create',name),join:(name,invite)=>start('join',name,invite),
    invite:()=>client.invite(),leave:()=>client.leave(),
    subscribe:(type,fn)=>{
      if(!['status','snapshot','exit'].includes(type)||typeof fn!=='function')throw failure('BAD_SUBSCRIPTION');
      if(disposed)return ()=>{};
      if(!observers.has(type))observers.set(type,new Set());observers.get(type).add(fn);
      return ()=>observers.get(type)?.delete(fn);
    },
    render:()=>{
      if(disposed||!prepared||rootFault)return 0;
      try{
        const poses=buffer.sample(client.serverNow,client.connected);
        for(const peer of poses)syncResult(hooks.renderRemote(structuredClone(peer)));
        return poses.length;
      }catch(error){callbackFailure(error,'HOST_RENDER_FAILED',true);stopForFault('HOST_RENDER_FAILED');return 0;}
    },
    dispose:()=>{
      if(disposed)return;disposed=true;client.leave();
      client.removeEventListener('snapshot',snapshot);client.removeEventListener('status',status);client.removeEventListener('exit',exit);
      observers.clear();
    }
  };
}
