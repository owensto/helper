/* Physical-contact envelope only. No inferred identity, rig offsets or host clock. */
(function(G){'use strict';
const Y1=G.AtlasDVesselContact||(typeof require==='function'?require('../attachment-adapter.js'):null),ID=Y1.ID;
const str=x=>typeof x==='string'&&x.length>0&&x.length<=256;
const int=x=>Number.isSafeInteger(x)&&x>=0;
const no=reason=>({available:false,valid:false,reason,attachment:null,physicalContacts:null,productionEnabled:false});
const near=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===16&&b.length===16&&a.every((x,i)=>Number.isFinite(x)&&Math.abs(x-b[i])<1e-5);
// SHA-256 is a deterministic correlation digest here, NOT authentication.
// Cross-checked against node:crypto for ASCII, Unicode and block boundaries.
function digest(text){
 const bytes=new TextEncoder().encode(text),data=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);data.set(bytes);data[bytes.length]=128;
 const dv=new DataView(data.buffer);dv.setUint32(data.length-4,bytes.length*8);
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let hash=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const r=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let off=0;off<data.length;off+=64){const w=new Uint32Array(64);for(let i=0;i<16;i++)w[i]=dv.getUint32(off+4*i);
  for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(r(x,7)^r(x,18)^(x>>>3))+w[i-7]+(r(y,17)^r(y,19)^(y>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h]=hash;for(let i=0;i<64;i++){const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  hash=hash.map((x,i)=>(x+[a,b,c,d,e,f,g,h][i])>>>0);
 }
 return hash.map(x=>x.toString(16).padStart(8,'0')).join('');
}
function mapPhysical(station,y1,current,context){
 if(!station?.available)return no(station?.reason||'STATION_UNAVAILABLE');
 if(!y1?.available||y1.vesselId!==ID||station.vesselId!==ID)return no('YACHT_FRAME_UNAVAILABLE');
 if(!current||current.activeVesselId!==ID||current.vesselId!==ID||!str(current.instanceId)||!int(current.activationEpoch)||!int(current.frameId)||!Number.isFinite(current.simTimeSeconds)||current.simTimeSeconds<0)return no('OWNER_IDENTITY_MISSING');
 if(current.sourceAssetSHA256!==Y1.ASSET||current.mode!=='surface'||current.conversion!==0||!Number.isFinite(current.depthM)||current.depthM<0||current.depthM>0.03)return no('OWNER_OCCUPANCY_CHANGED');
 const token=JSON.stringify([ID,current.instanceId,current.activationEpoch,current.frameId,current.simTimeSeconds]);
 if(y1.frameToken!==token||station.frameToken!==token||station.instanceId!==current.instanceId||station.activationEpoch!==current.activationEpoch||station.frameId!==current.frameId||station.simTimeSeconds!==current.simTimeSeconds)return no('STALE_OWNER_FRAME');
 if(!context||!/^([0-9a-f]{40})$/.test(context.coreSourceSHA||'')||!str(context.hostSessionId)||!str(context.worldRevision)||context.clock?.domain!=='client-simulation'||!int(context.clock.epoch)||!Number.isFinite(context.clock.seconds)||!Number.isFinite(context.dt)||context.dt<0||context.dt>.1)return no('EXPLICIT_HOST_MAPPING_UNAVAILABLE');
 if(context.coreSourceSHA!==current.coreSourceSHA||context.hostSessionId!==current.hostSessionId||context.worldRevision!==current.worldRevision||context.clock.epoch!==current.simulationEpoch||context.clock.seconds!==current.simTimeSeconds)return no('HOST_EPOCH_WORLD_MISMATCH');
 if(!Y1.math.rigid(current.worldFromVessel)||!near(current.worldFromVessel,y1.vessel.worldFromLocal)||!near(station.vessel.worldFromLocal,y1.vessel.worldFromLocal)||!near(Y1.math.inverse(current.worldFromVessel),y1.vessel.localFromWorld))return no('RENDER_TRANSFORM_MISMATCH');
 if(context.scope!=='isolated-fixture'){
  if(context.coreDescriptor?.revision!=='sealab12-core-integration/1.0.0')return no('CORE_DESCRIPTOR_UNAVAILABLE');
  if(context.coreDescriptor.vessels?.[ID]?.available!==true)return no('CORE_YACHT_ADAPTER_UNAVAILABLE');
  return no('CORE_HUMANS_Y2_ACCEPTANCE_NOT_RECORDED');
 }
 const epoch='c1h/1:'+digest(JSON.stringify(['c1-humans-map/1',context.coreSourceSHA,context.hostSessionId,current.instanceId,'client-simulation',context.clock.epoch]));
 const identity={vesselId:ID,vesselInstanceId:current.instanceId,attachmentActivationEpoch:current.activationEpoch,
  renderFrameId:current.frameId,ownerFrameToken:token,simulationEpoch:epoch,worldRevision:context.worldRevision,
  identityToken:JSON.stringify([token,context.hostSessionId,context.clock.epoch,context.worldRevision]),
  entityId:null,playerId:null,characterId:null,identityAuthority:'isolated-owner-fixture; no transport identity'};
 return {available:true,valid:false,reason:'HUMANS_RIG_OFFSETS_UNAVAILABLE',scope:context.scope,productionEnabled:false,
  identity,frame:{epoch,time:context.clock.seconds,dt:context.dt},
  transform:{epoch,time:context.clock.seconds,localToWorld:y1.vessel.worldFromLocal.slice(),worldToLocal:y1.vessel.localFromWorld.slice()},
  attachment:null,physicalContacts:station.contacts,geometryRevision:station.stationRevision,
  wholeBodyClearance:false,rigOffsetRevision:null,networkSequence:null,bottom:y1.bottom};
}
const out={mapPhysical,digest};if(typeof module!=='undefined')module.exports=out;else G.AtlasDY2Identity=out;
})(typeof window!=='undefined'?window:globalThis);
