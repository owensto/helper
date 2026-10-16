/* CORE-owned c1-humans-map/1. No human solver, transport, RAF, or physics step. */
(function(G){'use strict';
const MAP='c1-humans-map/1',C1='36903985f2182c902427fed77d4e28c61a7639ca',DESIGN='atlas-bay-25-sealab12';
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const copy=o=>freeze(JSON.parse(JSON.stringify(o)));const text=x=>typeof x==='string'&&x.length>0&&x.trim()===x;
const hex64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);const counter=x=>Number.isSafeInteger(x)&&x>=0;
// Small synchronous SHA256 keeps epoch construction on the same owner sample.
// Tested against Node crypto, including UTF8 and multiple-block inputs.
function sha256(input){const bytes=new TextEncoder().encode(input),size=Math.ceil((bytes.length+9)/64)*64,b=new Uint8Array(size);b.set(bytes);b[bytes.length]=128;const dv=new DataView(b.buffer);dv.setUint32(size-4,(bytes.length*8)>>>0);dv.setUint32(size-8,Math.floor(bytes.length/0x20000000));const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],W=new Uint32Array(64),rr=(v,n)=>(v>>>n)|(v<<(32-n));for(let o=0;o<size;o+=64){for(let i=0;i<16;i++)W[i]=dv.getUint32(o+4*i);for(let i=16;i<64;i++){const x=W[i-15],y=W[i-2];W[i]=(rr(x,7)^rr(x,18)^(x>>>3))+W[i-16]+(rr(y,17)^rr(y,19)^(y>>>10))+W[i-7];}let[a,c,d,e,f,g,h,j]=H;for(let i=0;i<64;i++){const t1=(j+(rr(f,6)^rr(f,11)^rr(f,25))+((f&g)^(~f&h))+K[i]+W[i])>>>0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&c)^(a&d)^(c&d)))>>>0;j=h;h=g;g=f;f=(e+t1)>>>0;e=d;d=c;c=a;a=(t1+t2)>>>0;}[a,c,d,e,f,g,h,j].forEach((v,i)=>H[i]=(H[i]+v)>>>0);}return H.map(v=>v.toString(16).padStart(8,'0')).join('');}
function epoch(scope,instance,n){if(!text(scope)||!text(instance)||!counter(n))throw Error('INVALID_EPOCH_REGISTRATION');return 'c1h/1:'+sha256(JSON.stringify([MAP,C1,scope,instance,'client-simulation',n]));}
function createBridge(current){if(typeof current!=='function')throw Error('PRIVATE_CONTEXT_PROVIDER_REQUIRED');let previous=null,lastSeen=-1,blockedFrame=-1,highestEpoch=-1,timeHighWater=-Infinity;
 const reject=(reason)=>{previous=null;let trusted;try{trusted=current()?.frameId;}catch{}if(counter(trusted))blockedFrame=Math.max(blockedFrame,trusted);return freeze({valid:false,reason,dt:0,reset:true,skipUpdate:true});};
 function consume(p){try{const c=current();if(!c||!c.registered)return reject('NO_PRIVATE_REGISTRATION',p?.frameId);
  for(const k of ['runtimeScopeId','vesselInstanceId','worldRevision','stationId','designId'])if(!text(c[k])||p?.[k]!==c[k])return reject('INDEPENDENT_CONTEXT_MISMATCH:'+k,p?.frameId);
  for(const k of ['modelSHA256','physicalContactSHA256','rigProfileSHA256'])if(!hex64(c[k])||p?.[k]!==c[k])return reject('PROFILE_CONTEXT_MISMATCH:'+k,p?.frameId);
  if(c.designId!==DESIGN)return reject('YACHT_OR_UNKNOWN_DESIGN_UNAVAILABLE',p?.frameId);
  if(!counter(c.activationEpoch)||p.activationEpoch!==c.activationEpoch)return reject('ACTIVATION_EPOCH_MISMATCH',p?.frameId);
  if(!counter(c.frameId)||p.frameId!==c.frameId||p.frameId<lastSeen)return reject('STALE_OWNER_FRAME',p?.frameId);
  const clock=p.clock,cc=c.clock;if(!clock||!cc||cc.domain!=='client-simulation'||clock.domain!==cc.domain||!counter(cc.epoch)||clock.epoch!==cc.epoch||!Number.isFinite(cc.seconds)||cc.seconds<0||clock.seconds!==cc.seconds)return reject('INVALID_CLOCK_CONTEXT',p.frameId);
  if(cc.epoch<highestEpoch)return reject('CLOCK_EPOCH_ROLLBACK');if(cc.epoch>highestEpoch){highestEpoch=cc.epoch;timeHighWater=-Infinity;}if(cc.seconds<timeHighWater)return reject('BACKWARDS_HOST_TIME');timeHighWater=Math.max(timeHighWater,cc.seconds);
  if(c.invalidReason)return reject(c.invalidReason,p.frameId);
  if(!Number.isFinite(c.roll)||!Number.isFinite(c.pitch)||p.roll!==c.roll||p.pitch!==c.pitch)return reject('INDEPENDENT_MOTION_MISMATCH');
  if(p.frameId===blockedFrame)return reject('FRESH_FRAME_REQUIRED',p.frameId);
  const key=JSON.stringify([c.runtimeScopeId,c.vesselInstanceId,c.designId,c.worldRevision,c.stationId,c.modelSHA256,c.physicalContactSHA256,c.rigProfileSHA256,c.activationEpoch,clock.epoch]);
  if(previous&&p.frameId===previous.frameId){if(key!==previous.key||clock.seconds!==previous.seconds||p.roll!==previous.frame.roll||p.pitch!==previous.frame.pitch)return reject('SAME_FRAME_CHANGED',p.frameId);return freeze({valid:true,skipUpdate:true,reset:false,frame:{...previous.frame,dt:0}});}
  lastSeen=p.frameId;let dt=previous&&previous.key===key?clock.seconds-previous.seconds:0,reset=!previous||previous.key!==key;
  if(dt<0)return reject('BACKWARDS_HOST_TIME',p.frameId);
  if(dt>.1)return reject('HOST_TIME_GAP_REBASE_REQUIRED',p.frameId);
  const frame={time:clock.seconds,dt,epoch:epoch(c.runtimeScopeId,c.vesselInstanceId,clock.epoch),roll:p.roll,pitch:p.pitch,acceleration:[0,0,0],accelerationAvailable:false,balanceMode:'roll-pitch-only'};
  if(!Number.isFinite(frame.roll)||!Number.isFinite(frame.pitch))return reject('NONFINITE_POSE',p.frameId);
  previous={frameId:p.frameId,key,seconds:clock.seconds,frame};return freeze({valid:true,skipUpdate:false,reset,frame});
 }catch(e){return reject('INVALID_OWNER_PACKET',p?.frameId);}}
 return Object.freeze({consume,invalidate:reason=>reject(reason||'EXPLICIT_INVALIDATION',lastSeen)});
}
// Only this immutable owner pin can be used by a future scoped review build.
// A missing ACK cannot equal another missing value and grant construction.
const REVIEW_PINS=freeze({humanSHA:'10ed9c2f8d0c392828f238e686bcc689517d34f9',profileSHA256:'2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902',physicalContactSHA256:'cc2a82dc89e3abfee8fd6a7d5def9dd153da179abb4c834dc91b09924d237f58',modelSHA256:'b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82',rigSHA256:'e80b6e82ac31c3bfb1134952e0bcb9b840fedc26b71dc90e9b387ae8cd28ecd3',animationSHA256:'b0f10003c14416330d30c41fe26d7ec86bc34e3b39ca9bd91ca78a54db415b94',scope:'LIMITED_CONTACT_REVIEW',ownerACK:'pr1:6209504553',modules:{'captain12-adapter.mjs':'0767111188ff1c62c8b68c44f8132f8d292089ed','rig.mjs':'a39a40b7dfa8151705bfa325abe557ae75f706fd','contact.mjs':'882a3b189131c3544deba20b2a08c08616ed5a14','ik.mjs':'a71fe32b2a4c9c547593cfa541f742e72b53ad4f','pose-contract.mjs':'6107ae4151e70f7a54f473999faf96538a47f8c4','transform-contract.mjs':'497351fd363f99d922f3a63509100d4f0dd3f881'}});
function receiverAcceptance(result,attachmentValid,bound){
 if(result?.valid===false||attachmentValid!==true)throw Error(result?.reason||'HUMANS_RECEIVER_REJECTED');
 if(!Number.isFinite(bound)||bound<0||!Number.isFinite(result?.maxError)||result.maxError<0||result.maxError>bound)throw Error('HUMAN_JOINT_RESIDUAL_EXCEEDED');
 return result;
}
function restoreOwnedCallback(holder,key,owned,prior){if(holder[key]!==owned)return false;holder[key]=prior;return true;}
function profileTargets(T,profile,frames,rootInverseQuaternion){const points={},quats={};for(const[id,o]of Object.entries(profile.offsets)){const f=frames[id],matrix=new T.Matrix4().fromArray(f.contactToVessel);points[id]=new T.Vector3().fromArray(o.positionContactM).applyMatrix4(matrix).toArray();if(o.orientationContactXYZW)quats[id]=rootInverseQuaternion.clone().multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().fromArray(f.contactToWorld))).multiply(new T.Quaternion().fromArray(o.orientationContactXYZW)).normalize().toArray();}return{points,quats};}
function initializeProbeSet(T,rig,profile,contacts){
 // HUMANS' exact calibration selection, used once on the SAME preloaded rig.
 // No fixture model, offset retuning or substitute human solver is introduced.
 rig.group.position.fromArray(profile.requiredRoot.position);rig.group.quaternion.fromArray(profile.requiredRoot.rotationXYZW);rig.group.scale.fromArray(profile.requiredRoot.scale);
 const frames=Object.fromEntries(contacts.contacts.map(c=>[c.id,{contactToVessel:c.restContactToVessel,contactToWorld:c.restContactToVessel}]));
 const {points,quats}=profileTargets(T,profile,frames,new T.Quaternion()),root=rig.group.position;
 const local=id=>new T.Vector3().fromArray(points[id]).sub(root).toArray();
 rig.update({mode:'helm',time:0,seat:local('seat'),feet:[local('leftFoot'),local('rightFoot')],hands:[local('leftHand'),local('rightHand')],handOrientations:[quats.leftHand,quats.rightHand],footOrientations:[quats.leftFoot,quats.rightFoot],torsoPitch:profile.torsoPitchRad,lean:[0,0],breath:0});
 rig.group.updateWorldMatrix(true,true);const meshes=[],sole=[];rig.group.traverse(o=>{if(!o.isSkinnedMesh)return;const mi=meshes.length;meshes.push(o);o.skeleton.update();const a=o.geometry.attributes;for(const i of new Set(o.geometry.index.array)){let w=0;for(let j=0;j<4;j++)if(/Foot|Toe/.test(o.skeleton.bones[a.skinIndex.getComponent(i,j)].name))w+=a.skinWeight.getComponent(i,j);if(w<.7)continue;const v=new T.Vector3().fromBufferAttribute(a.position,i);o.applyBoneTransform(i,v);o.localToWorld(v);if(v.y<.366)sole.push({id:v.z<.18?'leftFoot':'rightFoot',mesh:mi,index:i});}});
 if(sole.length!==84)throw Error('H4_SOLE_WITNESS_COUNT_MISMATCH:'+sole.length);
 const probes=[...Object.entries(profile.skinProbes).map(([id,p])=>({id,...p})),...sole];
 return{meshes,probes:freeze(probes),selection:'exact H4 zero-time profile selection: Foot|Toe skin weights >=0.7, vessel Y<0.366, side about Z0.18; selected once, no best-frame filtering'};
}
function skinContactTrace(T,captain,grant,physical){captain.updateWorldMatrix(true,true);for(const m of grant.probeSet.meshes)m.skeleton.update();const rows=[],contacts={};let valid=true;for(const p of grant.probeSet.probes){const m=grant.probeSet.meshes[p.mesh],v=new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,p.index);m.applyBoneTransform(p.index,v);m.localToWorld(v);const q=physical.queryRay(p.id,v.toArray()),range=p.id==='seat'?grant.profile.bounds.seatProbeNormalRangeM:p.id.endsWith('Hand')?grant.profile.bounds.handProbeNormalRangeM:grant.profile.bounds.soleProbeNormalRangeM;const ok=q.available&&q.signedNormalM>=range[0]-1e-7&&q.signedNormalM<=range[1]+1e-7&&q.edgeMarginM>=-1e-7;valid=valid&&ok;const row={...p,valid:!!ok,sourceTriangle:q.sourceTriangle??null,normalM:q.signedNormalM??null,edgeMarginM:q.edgeMarginM};rows.push(row);let a=contacts[p.id]||(contacts[p.id]={count:0,minNormalM:Infinity,maxNormalM:-Infinity,minEdgeMarginM:Infinity,failures:0});a.count++;if(Number.isFinite(q.signedNormalM)){a.minNormalM=Math.min(a.minNormalM,q.signedNormalM);a.maxNormalM=Math.max(a.maxNormalM,q.signedNormalM);}a.minEdgeMarginM=Math.min(a.minEdgeMarginM,q.edgeMarginM);if(!ok)a.failures++;}return{valid,probeCount:rows.length,soleCount:84,contacts,failures:rows.filter(q=>!q.valid),numericToleranceM:1e-7,wholeBodyClearance:false};}
const reviewCapabilities=new WeakMap();
async function preloadReview({T,candidate}){
 if(!text(REVIEW_PINS.ownerACK)||candidate?.humanACK!==REVIEW_PINS.ownerACK)throw Error('SCOPED_HUMANS_OWNER_ACK_REQUIRED');
 if(candidate.correctedHumanSHA!==REVIEW_PINS.humanSHA||candidate.rigProfileSHA256!==REVIEW_PINS.profileSHA256||candidate.physicalContactSHA256!==REVIEW_PINS.physicalContactSHA256||candidate.humanActivation!==true||candidate.productionEnabled!==false||candidate.reviewScope!==REVIEW_PINS.scope)throw Error('EXACT_LIMITED_REVIEW_MANIFEST_REQUIRED');
 const hash=async(a,algorithm='SHA-256')=>Array.from(new Uint8Array(await crypto.subtle.digest(algorithm,a)),v=>v.toString(16).padStart(2,'0')).join(''),enc=new TextEncoder();
 const read=async(p,want,git=false)=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error('RECEIVER_ASSET_UNAVAILABLE:'+p);const a=new Uint8Array(await r.arrayBuffer());let bytes=a;if(git){const h=enc.encode('blob '+a.length+'\0');bytes=new Uint8Array(h.length+a.length);bytes.set(h);bytes.set(a,h.length);}if(await hash(bytes,git?'SHA-1':'SHA-256')!==want)throw Error('RECEIVER_BYTE_ATTESTATION_FAILED:'+p);return a;};
 const manifestResponse=await fetch('c2-candidate.json',{cache:'no-store'});if(!manifestResponse.ok)throw Error('CANDIDATE_MANIFEST_UNAVAILABLE');
 const manifestBytes=new Uint8Array(await manifestResponse.arrayBuffer()),expectedManifest=G.document?.querySelector('meta[name="c2-manifest"]')?.content;
 if(!hex64(expectedManifest)||await hash(manifestBytes)!==expectedManifest)throw Error('INDEPENDENT_CANDIDATE_FINGERPRINT_REQUIRED');
 const manifested=JSON.parse(new TextDecoder().decode(manifestBytes));if(JSON.stringify(manifested)!==JSON.stringify(candidate))throw Error('CANDIDATE_OBJECT_MISMATCH');
 if(!candidate.assets||Object.keys(candidate.assets).length<110)throw Error('COMPLETE_CANDIDATE_ASSETS_REQUIRED');
 for(const [p,d]of Object.entries(candidate.assets)){if(!/^[\w./-]+$/.test(p)||p.includes('..')||!hex64(d))throw Error('INVALID_CANDIDATE_ASSET');await read(p,d);}
 const profileBytes=await read('human/profiles/bay12/profile.json',REVIEW_PINS.profileSHA256),profile=freeze(JSON.parse(new TextDecoder().decode(profileBytes)));
 if(profile.productionEnabled!==false||profile.status!=='LIMITED_CONTACT_REVIEW_ONLY_NOT_GAMEPLAY_ACCEPTED'||profile.physicalContactSHA256!==REVIEW_PINS.physicalContactSHA256||profile.modelSHA256!==REVIEW_PINS.modelSHA256)throw Error('UNACCEPTED_PROFILE_SCOPE');
 for(const [name,h]of Object.entries(REVIEW_PINS.modules))await read('human/src/'+name,h,true);
 const [rigBytes,clipBytes]=await Promise.all([read('human/assets/RocketboxCaptain.glb',REVIEW_PINS.rigSHA256),read('human/assets/animations.json',REVIEW_PINS.animationSHA256)]);
 const {createHelmRig}=await import('./human/src/rig.mjs'),{makeCaptain12Build}=await import('./human/src/captain12-adapter.mjs');
 const gltf=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(rigBytes.buffer,'',resolve,reject)),rig=createHelmRig(gltf,JSON.parse(new TextDecoder().decode(clipBytes)),{heightM:profile.heightM});
 const contactBytes=await read('c2-contacts.json',REVIEW_PINS.physicalContactSHA256),probeSet=initializeProbeSet(T,rig,profile,JSON.parse(new TextDecoder().decode(contactBytes)));
 let sample=freeze({valid:false,reason:'AWAITING_CORE_COMMITTED_FRAME'}),buildCount=0;
 const factory=makeCaptain12Build({rig,sampleHost:()=>sample,onUnsupported:()=>{}});
 const handle=Object.freeze({build(){const out=factory();buildCount++;return out;}});
 reviewCapabilities.set(handle,{profile,rig,probeSet,candidate:copy(candidate),get buildCount(){return buildCount;},setSample:p=>{sample=copy(p);},claimed:false});return handle;
}

const sessions=new WeakMap();
async function install({T,A,core,spec,inputs,candidate,receiver=null,approvedProfile=null,reviewHandle=null}){
 if(sessions.has(A))throw Error('C2_ALREADY_REGISTERED');
 const reservation=Object.freeze({pending:true});sessions.set(A,reservation);let rollback=()=>{};try{
 if(candidate.c1SourceSHA!==C1||spec.designId!==DESIGN||candidate.physicalContactSHA256!==inputs.physicalContactSHA256)throw Error('C2_BASELINE_MISMATCH');
 const physical=G.CoreBayContactC2.bind(T,A,spec);rollback=()=>physical.dispose();
 const boat=A.boat,model=A.model,S=A.state,captain=boat.getObjectByName('SEA12_CAPTAIN');if(!captain)throw Error('CAPTAIN_UNAVAILABLE');
 const scope=crypto.randomUUID(),instance=crypto.randomUUID(),profileDigest=reviewHandle?REVIEW_PINS.profileSHA256:sha256('C2_PHYSICAL_ONLY_NO_RIG_PROFILE');
 const grant=reviewHandle?reviewCapabilities.get(reviewHandle):null;
 if(receiver||approvedProfile||reviewHandle&&!grant||candidate.humanActivation&&!grant)throw Error('BYTE_ATTESTED_PRIVATE_REVIEW_CAPABILITY_REQUIRED');
 const verifiedProfile=!!grant;
 if(verifiedProfile&&(grant.claimed||grant.buildCount!==1||grant.rig.group!==captain||JSON.stringify(grant.candidate)!==JSON.stringify(candidate)||!text(REVIEW_PINS.ownerACK)))throw Error('MATCHING_HUMANS_SHA_ACK_PROFILE_REQUIRED');
 const profile=grant?.profile; if(grant)grant.claimed=true;
 let descriptor=await core.reader.describe(),refreshing=false,serial=0,activation=0,lastLifecycle=null,current=null,latest=null,disposed=false,seenCaptain=captain;
 const bridge=createBridge(()=>current),samples=[],skinSamples=[],events=[],noThrow=reason=>{try{if(events.at(-1)?.reason!==reason){events.push({reason,frameId:serial});if(events.length>128)events.shift();}}catch{}};
 const originalBefore=G.SEA06.beforeRender,sourceStep=S.step,priorAnimate=captain.userData.animateCaptain;
 const deferredAnimate=()=>({valid:false,reason:'AWAITING_COMMITTED_OWNER_FRAME'});
 rollback=()=>{if(G.SEA06.beforeRender===before)G.SEA06.beforeRender=originalBefore;restoreOwnedCallback(captain.userData,'animateCaptain',deferredAnimate,priorAnimate);physical.dispose();};
 // Physical-only mode observes the original captain. Positive mode is a receiver
 // preloaded through the existing ensureDriver factory BEFORE C1 attachment.
 const ownerAnimate=verifiedProfile?priorAnimate:null;
 if(verifiedProfile){if(typeof ownerAnimate!=='function')throw Error('EXISTING_FACTORY_LIFECYCLE_REQUIRED');captain.userData.animateCaptain=deferredAnimate;}
 const rigid=a=>G.CoreBayContactC2.rigid(T,a);
 function invalidate(reason){latest=freeze({valid:false,reason,productionEnabled:false});bridge.invalidate(reason);noThrow(reason);if(verifiedProfile&&captain.userData.animateCaptain===deferredAnimate){grant.setSample(latest);try{ownerAnimate(A,S);}catch(e){captain.children.forEach(o=>o.visible=false);captain.userData.attachmentValid=false;noThrow('RECEIVER_EXCEPTION_CONTAINED');}}}
 function reDescribe(){if(refreshing)return;refreshing=true;core.reader.describe().then(d=>{descriptor=d;}).catch(e=>noThrow(String(e.message))).finally(()=>refreshing=false);}
 function commit(){if(disposed)return;serial++;const started=performance.now();try{
  if(verifiedProfile&&captain.userData.animateCaptain!==deferredAnimate)throw Error('CAPTAIN_HOOK_OWNERSHIP_LOST');
  if(A.boat!==boat||A.model!==model||A.state!==S||S.step!==sourceStep||A.scene.getObjectByName('SEA12_CAPTAIN')!==seenCaptain)throw Error('PRIVATE_RUNTIME_IDENTITY_CHANGED');
  const p=core.reader.readPose(DESIGN,descriptor.worldRevision),op=G.SEA10.inspect();captain.updateWorldMatrix(true,false);const captainLocal=captain.matrix.clone();
  const inv=rigid(p.transform.worldToLocal),mat=rigid(p.transform.localToWorld),identity=mat.clone().multiply(inv).elements;if(identity.some((v,i)=>Math.abs(v-(i%5===0?1:0))>1e-8))throw Error('INVERSE_MISMATCH');
  if(mat.elements.some((v,i)=>Math.abs(v-boat.matrixWorld.elements[i])>1e-8))throw Error('INDEPENDENT_RENDER_MISMATCH');
  const e=captainLocal.elements,rootExpected=[1,0,0,0,0,1,0,0,0,0,1,0,-1.60,1.06,.18,1];
  let invalid=op.ejected?'CAPTAIN_EJECTED':S.destroyed10?'VESSEL_DESTROYED':S.airborne?'AIRBORNE_OCCUPANCY_UNSUPPORTED':captain.parent!==boat?'CAPTAIN_DETACHED':e.some((v,i)=>Math.abs(v-rootExpected[i])>1e-7)?'CAPTAIN_ROOT_PROFILE_MISMATCH':A.inspect().bolsters.value>.01||A.inspect().bolsters.target>.01?'BOLSTER_TRANSITION_UNAVAILABLE':null;
  const lifecycle=JSON.stringify([p.clock.epoch,invalid,descriptor.worldRevision]);if(lastLifecycle!==null&&lastLifecycle!==lifecycle)activation++;lastLifecycle=lifecycle;
  current=freeze({registered:true,runtimeScopeId:scope,vesselInstanceId:instance,designId:DESIGN,stationId:spec.stationId,modelSHA256:spec.modelSHA256,physicalContactSHA256:inputs.physicalContactSHA256,rigProfileSHA256:profileDigest,worldRevision:descriptor.worldRevision,frameId:serial,activationEpoch:activation,clock:p.clock,roll:p.motion.renderEulerYXZ[0],pitch:p.motion.renderEulerYXZ[2],invalidReason:invalid});
  const tick=bridge.consume({...current,roll:p.motion.renderEulerYXZ[0],pitch:p.motion.renderEulerYXZ[2]});if(!tick.valid){invalidate(tick.reason);return;}
  const contactFrames=physical.sample();
  if(verifiedProfile){const w=A.model.getObjectByName('PLAY_STEERING');if(!w||!Number.isFinite(w.rotation.x))throw Error('WHEEL_POSE_UNAVAILABLE');if(Math.abs(w.rotation.x)>profile.bounds.wheelAngleAbsMaxRad||Math.abs(current.roll)>profile.bounds.rollAbsMaxRad||Math.abs(current.pitch)>profile.bounds.pitchAbsMaxRad)throw Error('H4_REVIEW_MOTION_BOUNDS_EXCEEDED');}
  latest=copy({valid:verifiedProfile,reason:verifiedProfile?null:'CORRECTED_HUMANS_PROFILE_ACK_PENDING',productionEnabled:false,limitedReviewEnabled:verifiedProfile,physicalAvailable:true,mapping:MAP,context:current,frame:tick.frame,reset:tick.reset,skipUpdate:tick.skipUpdate,physicalContacts:contactFrames,transform:{epoch:tick.frame.epoch,time:tick.frame.time,localToWorld:p.transform.localToWorld,worldToLocal:p.transform.worldToLocal},ejected:false});
  // Offsets and orientations come from exact HUMANS-owned profile bytes.
  if(verifiedProfile&&!tick.skipUpdate){
   const attachment={vesselId:DESIGN,revision:'bay-contact/1:'+sha256(JSON.stringify([DESIGN,spec.modelSHA256,inputs.physicalContactSHA256,profileDigest]))},quats={};
   const captainInvQ=new T.Quaternion().setFromRotationMatrix(captain.matrixWorld).invert();
   for(const [id,o]of Object.entries(profile.offsets)){const f=contactFrames[id];if(!f?.available)throw Error('PHYSICAL_CONTACT_UNAVAILABLE:'+id);attachment[id]=new T.Vector3().fromArray(o.positionContactM).applyMatrix4(new T.Matrix4().fromArray(f.contactToVessel)).toArray();if(o.orientationContactXYZW)quats[id]=captainInvQ.clone().multiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().fromArray(f.contactToWorld))).multiply(new T.Quaternion().fromArray(o.orientationContactXYZW)).normalize().toArray();}
   latest=copy({...latest,attachment,rigPose:{torsoPitch:profile.torsoPitchRad,handOrientations:[quats.leftHand,quats.rightHand],footOrientations:[quats.leftFoot,quats.rightFoot],balanceGain:profile.bounds.rollPitchVisualGain}});grant.setSample(latest);
   const accepted=receiverAcceptance(ownerAnimate(A,S),captain.userData.attachmentValid,profile.bounds.jointResidualMaxM);
   const skin=skinContactTrace(T,captain,grant,physical);skinSamples.push({frameId:serial,time:p.clock.seconds,epoch:p.clock.epoch,dt:tick.frame.dt,reset:tick.reset,jointErrorM:accepted.maxError,wheel:A.model.getObjectByName('PLAY_STEERING').rotation.x,roll:current.roll,pitch:current.pitch,...skin});if(skinSamples.length>2000)skinSamples.shift();
   if(!skin.valid)throw Error('HUMAN_PHYSICAL_CONTACT_REJECTED');
   latest=copy({...latest,receiverAccepted:true,rigResult:accepted,skin});
  }
  let max=0;for(const [id,f]of Object.entries(contactFrames)){const q=physical.query(id,f.pointWorld);max=Math.max(max,q.distanceM);}
  samples.push({frameId:serial,time:p.clock.seconds,epoch:p.clock.epoch,activationEpoch:activation,dt:tick.frame.dt,reset:tick.reset,physicalErrorM:max,captainUUID:captain.uuid,receiverUpdated:verifiedProfile&&!tick.skipUpdate,physicalContacts:5,cpuMs:performance.now()-started});if(samples.length>2000)samples.shift();
 }catch(e){invalidate(e.message||'C2_INVALID_SAMPLE');if(/WORLD/.test(e.message))reDescribe();}}
 function before(){originalBefore();commit();}
 G.SEA06.beforeRender=before;
 function dispose(){if(disposed)return;invalidate('C2_DISPOSED');disposed=true;if(G.SEA06.beforeRender===before)G.SEA06.beforeRender=originalBefore;if(verifiedProfile)restoreOwnedCallback(captain.userData,'animateCaptain',deferredAnimate,priorAnimate);physical.dispose();sessions.delete(A);}
 const api=Object.freeze({read:()=>latest?copy({...latest,context:latest.context?Object.fromEntries(Object.entries(latest.context).filter(([k])=>!['runtimeScopeId','vesselInstanceId'].includes(k))):null}):null,inspect:()=>copy({mapping:MAP,privateRegistration:true,frameId:serial,activationEpoch:activation,positiveFactoryEnabled:verifiedProfile,reason:latest?.reason||null,worldRevision:descriptor.worldRevision,physicalAudit:physical.audit(),samples,skinSamples,probeSet:grant?{selection:grant.probeSet.selection,probes:grant.probeSet.probes}:null,events,existingCaptainUUID:captain.uuid,yachtAvailable:false,multiplayer:false}),showContacts:physical.show,queryContact:physical.query,dispose});sessions.set(A,api);commit();return api;
 }catch(error){try{rollback();}catch{}finally{if(sessions.get(A)===reservation)sessions.delete(A);}throw error;}
}
const api=Object.freeze({revision:MAP,sha256,epoch,createBridge,receiverAcceptance,restoreOwnedCallback,preloadReview,install});G.CoreBayHelmC2=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
