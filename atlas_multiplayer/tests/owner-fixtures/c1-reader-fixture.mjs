// Explicitly synthetic samples in the shape read from the pinned C1 contract.
// This fixture does not instantiate C1, Sea Lab, Three.js, a captain or a yacht.
import {C1_REVISION,C1_BASELINE,C1_BAY} from '../../client/c1-reader.mjs';
import {worldFingerprint} from '../../shared/world.mjs';
export const OWNER_SHA='36903985f2182c902427fed77d4e28c61a7639ca';
export const multiply=(a,b)=>Array.from({length:16},(_,i)=>{
  const col=Math.floor(i/4),row=i%4;return [0,1,2,3].reduce((n,k)=>n+a[k*4+row]*b[col*4+k],0);
});
const hamilton=(a,b)=>[
  a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
  a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
  a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
];
export function transform({heading=0,roll=0,pitch=0,p=[10,2,-30]}={}){
  const y=-heading,x=roll,z=pitch,c=Math.cos,s=Math.sin;
  const ry=[c(y),0,-s(y),0,0,1,0,0,s(y),0,c(y),0,0,0,0,1];
  const rx=[1,0,0,0,0,c(x),s(x),0,0,-s(x),c(x),0,0,0,0,1];
  const rz=[c(z),s(z),0,0,-s(z),c(z),0,0,0,0,1,0,0,0,0,1];
  const m=multiply(multiply(ry,rx),rz);m.splice(12,3,...p);
  const q=hamilton(hamilton([0,s(y/2),0,c(y/2)],[s(x/2),0,0,c(x/2)]),[0,0,s(z/2),c(z/2)]);
  const inv=[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,
    -(m[0]*p[0]+m[1]*p[1]+m[2]*p[2]),-(m[4]*p[0]+m[5]*p[1]+m[6]*p[2]),-(m[8]*p[0]+m[9]*p[1]+m[10]*p[2]),1];
  return {position:[...p],quaternionXYZW:q,scale:[1,1,1],localToWorld:m,worldToLocal:inv};
}
export async function fixture(){
  const world={revision:C1_REVISION,baseline:C1_BASELINE,scene:'basin',fixture:'synthetic-reader-shape-only'};
  const worldRevision='sl12-c1-sha256:'+await worldFingerprint(world);
  const d={revision:C1_REVISION,worldRevision,baseline:{publicSHA:C1_BASELINE,resultSHA:C1_BASELINE},world,
    units:{length:'metres',time:'seconds',angle:'radians',velocity:'metres/second',angularVelocity:'radians/second',quaternion:'unit XYZW',matrices:'column-major 4x4, column vectors'},
    coordinates:{handedness:'right',local:{forward:'+X',up:'+Y',starboard:'+Z'},world:{east:'+X',up:'+Y',south:'+Z'}},
    authority:{roomPhysicsOrigin:null},vessels:{[C1_BAY]:{available:true,pose:true},'atlas-d-original-r7':{available:false,pose:false}},
    sceneSupported:true,synchronizedRoomPhysics:false,remotePhysics:false,sharedCollisions:false,crews:false};
  const sample={revision:C1_REVISION,worldRevision,vesselId:C1_BAY,entityId:null,authority:'local-client',poseStage:'render-committed',
    clock:{domain:'client-simulation',epoch:0,seconds:0,fixedStepSeconds:1/60,derivedStepIndex:0,paused:false,mode:'drive',resettable:true,roomOrigin:null},
    transform:transform(),controls:{engine:true,gear:1,throttle:.5,steering:0,rudder:0,trim:0},
    condition:{grounded:false,airborne:false,destroyed:false,ejected:false}};
  const calls={describe:0,readPose:0,writes:0};let failure=null;
  const reader={describe:async()=>{calls.describe++;return structuredClone(d);},readPose:(id,rev)=>{
    calls.readPose++;if(failure)throw Error(failure);
    if(id!==C1_BAY||rev!==sample.worldRevision)throw Error('STALE_WORLD_REVISION');
    return structuredClone(sample);
  }};
  const options={reader,ownerSourceSha:OWNER_SHA,worldRevision,vesselId:C1_BAY,playerId:'a'.repeat(32),entityId:'boat:'+'a'.repeat(32)};
  return {d,sample,reader,options,calls,fail:reason=>{failure=reason;}};
}
