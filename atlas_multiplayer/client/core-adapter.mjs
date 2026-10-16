import { createRoomClient } from './room-client.mjs';
import { RemoteBuffer } from './interpolation.mjs';

/** CORE supplies all controller/renderer hooks. No Bay globals, dimensions or physics stepping. */
export async function createCoreAdapter({enabled=false,host,world,vesselId,...options}={}) {
  if(!enabled)return Object.freeze({info:Object.freeze({state:'disabled'}),render:()=>0,dispose:()=>{},subscribe:()=>()=>{}});
  for(const key of ['readLocal','prepareLocal','exitLocal','renderRemote','removeRemote']) {
    if(typeof host?.[key]!=='function')throw new Error('HOST_ADAPTER_REQUIRED:'+key);
  }
  let begun=false,prepared=false,disposed=false;
  const buffer=new RemoteBuffer();
  const client=await createRoomClient({...options,world,
    readSample:()=>{
      const sample=host.readLocal();
      if(sample?.vesselId!==vesselId)throw Object.assign(new Error('VESSEL_SWITCH_REQUIRES_REJOIN'),{code:'VESSEL_SWITCH_REQUIRES_REJOIN'});
      return {pose:sample.pose,clock:sample.clock??null};
    },
    onWelcome:async context=>{
      begun=true;
      const accepted=await host.prepareLocal(context);
      if(context.signal.aborted)return false;
      prepared=accepted===true;return prepared;
    }
  });
  const snapshot=event=>{
    for(const id of buffer.ingest(event.detail,event.detail.selfId))host.removeRemote(id);
  };
  const status=event=>host.networkStatus?.({...event.detail});
  const exit=event=>{
    for(const id of buffer.clear())host.removeRemote(id);
    prepared=false;
    if(begun){begun=false;host.exitLocal(event.detail.reason);}
  };
  client.addEventListener('snapshot',snapshot);client.addEventListener('status',status);client.addEventListener('exit',exit);
  return {
    get info(){return client.info;},get stats(){return {...client.stats};},get worldHash(){return client.worldHash;},
    get transportRoomAgeSeconds(){return client.roomAgeSeconds;},
    create:name=>client.create({name,vesselId}),join:(name,invite)=>client.join({name,vesselId,invite}),
    invite:()=>client.invite(),leave:()=>client.leave(),
    subscribe:(type,fn)=>{
      const listener=e=>fn(e.detail);client.addEventListener(type,listener);
      return ()=>client.removeEventListener(type,listener);
    },
    render:()=>{
      if(disposed||!prepared)return 0;
      const poses=buffer.sample(client.serverNow,client.connected);
      for(const peer of poses)host.renderRemote(peer);
      return poses.length;
    },
    dispose:()=>{
      if(disposed)return;disposed=true;client.leave();
      client.removeEventListener('snapshot',snapshot);client.removeEventListener('status',status);client.removeEventListener('exit',exit);
    }
  };
}
