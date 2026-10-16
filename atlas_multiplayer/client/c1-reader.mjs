/** MP-owned receiver for the versioned CORE C1 reader. No host globals or write capability. */
import {canonical,finite,PLAYER_ID,validatePose,validateSourceClock,nextSourceClock,worldFingerprint} from '../shared/world.mjs';
export const C1_REVISION='sealab12-core-integration/1.0.0';
export const C1_BASELINE='a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff';
export const C1_BAY='atlas-bay-25-sealab12';
const WORLD=/^sl12-c1-sha256:[a-f0-9]{64}$/;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const frozen=value=>{
  if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;
};
const array=(value,n,max=1e7)=>Array.isArray(value)&&value.length===n&&value.every(x=>finite(x,max));
const near=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance;
/** Validate the supplied rigid transform; never reconstruct motion from heading/Euler state. */
export function rigidPose(transform) {
  const t=transform;
  if(!t||!array(t.position,3)||!array(t.quaternionXYZW,4,1.001)||!array(t.scale,3,2)||
    !array(t.localToWorld,16)||!array(t.worldToLocal,16)||t.scale.some(x=>!near(x,1))||
    !near(Math.hypot(...t.quaternionXYZW),1))fail('HOST_FRAME_INVALID');
  const [x,y,z,w]=t.quaternionXYZW,[px,py,pz]=t.position,m=t.localToWorld,inv=t.worldToLocal;
  // This is a consistency check on an existing pose, not a physics integration step.
  const expected=[1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,
    2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,
    2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,px,py,pz,1];
  if(expected.some((n,i)=>!near(n,m[i])))fail('HOST_FRAME_INVALID');
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const product=[0,1,2,3].reduce((n,k)=>n+m[k*4+row]*inv[col*4+k],0);
    if(!near(product,row===col?1:0,1e-5))fail('HOST_FRAME_INVALID');
  }
  return {p:[...t.position],q:[...t.quaternionXYZW]};
}

/** Must be bound by CORE after explicit membership/placement approval. Construction is read-only.
 * ownerSourceSha is an audit reference, NOT cryptographic attestation of the running host.
 * Full hook objects containing `local` are rejected; only the separate reader is accepted.
 */
export async function createC1PoseReceiver({reader,ownerSourceSha,worldRevision,vesselId,playerId,entityId}={}) {
  if(!reader||typeof reader.describe!=='function'||typeof reader.readPose!=='function'||'local' in reader||'spawnLocal' in reader||'restoreLocal' in reader)fail('READ_ONLY_READER_REQUIRED');
  if(!/^[a-f0-9]{40}$/.test(ownerSourceSha||'')||!WORLD.test(worldRevision||''))fail('C1_CONTEXT_REQUIRED');
  if(!PLAYER_ID.test(playerId||'')||entityId!=='boat:'+playerId)fail('HOST_IDENTITY_MISMATCH');
  if(vesselId!==C1_BAY)fail(vesselId==='atlas-d-original-r7'?'YACHT_ADAPTER_UNAVAILABLE':'UNKNOWN_VESSEL');
  let d;
  try{d=await reader.describe();}catch{fail('C1_DESCRIPTOR_UNAVAILABLE');}
  if(d?.revision!==C1_REVISION||d?.baseline?.publicSHA!==C1_BASELINE||d?.baseline?.resultSHA!==C1_BASELINE||
     d.worldRevision!==worldRevision||d.authority?.roomPhysicsOrigin!==null||d.synchronizedRoomPhysics!==false||
     d.remotePhysics!==false||d.sharedCollisions!==false||d.crews!==false||d.sceneSupported!==true)fail('C1_DESCRIPTOR_MISMATCH');
  const units={length:'metres',time:'seconds',angle:'radians',velocity:'metres/second',angularVelocity:'radians/second',
    quaternion:'unit XYZW',matrices:'column-major 4x4, column vectors'};
  const coordinates={handedness:'right',local:{forward:'+X',up:'+Y',starboard:'+Z'},world:{east:'+X',up:'+Y',south:'+Z'}};
  if(Object.entries(units).some(([k,v])=>d.units?.[k]!==v)||
     Object.entries(coordinates).some(([k,v])=>canonical(d.coordinates?.[k]??null)!==canonical(v))||
     d.vessels?.[vesselId]?.available!==true||d.vessels[vesselId].pose!==true)fail('C1_DESCRIPTOR_MISMATCH');
  let hash;try{hash=await worldFingerprint(d.world);}catch{fail('C1_DESCRIPTOR_MISMATCH');}
  if(worldRevision!=='sl12-c1-sha256:'+hash)fail('C1_DESCRIPTOR_MISMATCH');
  const identity=frozen({ownerSourceSha,revision:C1_REVISION,worldRevision,vesselId,playerId,entityId});
  let previous=null,invalid=null;
  function readLocal(){
    if(invalid)fail(invalid);
    try{
      const s=reader.readPose(vesselId,worldRevision);
      if(s?.revision!==C1_REVISION||s?.worldRevision!==worldRevision)fail('STALE_WORLD_REVISION');
      if(s.vesselId!==vesselId||s.entityId!==null||s.authority!=='local-client'||s.poseStage!=='render-committed')fail('HOST_IDENTITY_MISMATCH');
      const c=s.clock;
      if(!c||c.domain!=='client-simulation'||c.resettable!==true||c.roomOrigin!==null||
         typeof c.paused!=='boolean'||!['drive','inspect'].includes(c.mode)||!near(c.fixedStepSeconds,1/60,1e-12))fail('HOST_CLOCK_REGRESSION');
      const clock=nextSourceClock(previous,validateSourceClock({domain:c.domain,epoch:c.epoch,seconds:c.seconds}));
      if(!s.condition||['grounded','airborne','destroyed','ejected'].some(k=>typeof s.condition[k]!=='boolean'))fail('HOST_FRAME_INVALID');
      if(s.condition.destroyed||s.condition.ejected)fail('CORE_RECOVERY_REQUIRED');
      const transform=rigidPose(s.transform);
      // C1 deliberately exposes no RPM reading. Null is unknown, never fabricated zero.
      const pose=validatePose({...transform,engine:s.controls?.engine,rpm:null,gear:s.controls?.gear});
      previous=clock;
      return frozen({vesselId,pose,clock});
    }catch(e){
      const safe=new Set(['STALE_WORLD_REVISION','HOST_IDENTITY_MISMATCH','HOST_FRAME_INVALID','HOST_CLOCK_REGRESSION','CORE_RECOVERY_REQUIRED']);
      invalid=e?.code==='SOURCE_CLOCK_REGRESSION'||e?.code==='BAD_SOURCE_CLOCK'||e?.message==='SOURCE_CLOCK_REGRESSION'||e?.message==='BAD_SOURCE_CLOCK'?'HOST_CLOCK_REGRESSION':
        (safe.has(e?.code)?e.code:e?.message==='STALE_WORLD_REVISION'?'STALE_WORLD_REVISION':'HOST_FRAME_INVALID');
      fail(invalid);
    }
  }
  return Object.freeze({identity,readLocal});
}
