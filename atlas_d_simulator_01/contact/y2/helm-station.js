/* Y2 authored physical station. Setup creates only own geometry under audited R7.
 * Sampling is read-only and synchronous: no vessel time, physics, IK or network.
 * Caller evaluates transforms and calls syncVisibility before its render. */
(function(G){'use strict';
const API=G.AtlasDVesselContact||(typeof require==='function'?require('../attachment-adapter.js'):null);
const M=API.math, ID=API.ID, ROOT='Y2_HELM_STATION';
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const bad=r=>({available:false,reason:r,pointWorldM:null,pointVesselM:null,worldFromContact:null});
const near=(a,b,eps=1e-5)=>a?.length===b?.length&&a.every((x,i)=>Number.isFinite(x)&&Math.abs(x-b[i])<eps);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function modeReason(f){
 if(!f||f.activeVesselId!==ID)return 'VESSEL_NOT_ACTIVE';
 if(['securing','deploying'].includes(f.mode))return 'TRANSFORMING_OCCUPANCY_UNSUPPORTED';
 if(['diving','submerged','surfacing'].includes(f.mode)||f.depthM>0.03)return 'SUBMERGED_EXTERIOR_UNSUPPORTED';
 if(f.mode!=='surface'||f.conversion!==0)return 'PACKED_STATION_UNAVAILABLE';
 return null;
}
function install(T,model,spec,y1Manifest,assetHash){
 if(assetHash!==API.ASSET||spec.sourceAssetSHA256!==assetHash||spec.vesselId!==ID||spec.schema!=='atlas-yacht-helm-surfaces/2')throw Error('SOURCE_IDENTITY_MISMATCH');
 if(model.getObjectByName(ROOT))throw Error('STATION_ALREADY_INSTALLED');
 const registry=[];model.traverse(n=>{if(n.name===spec.sourceParent||n.name===spec.sourceSupportMesh)registry.push(n)});
 const parent=registry.find(n=>n.name===spec.sourceParent),support=registry.find(n=>n.name===spec.sourceSupportMesh);
 if(registry.length!==2||!parent||!support)throw Error('SOURCE_LINK_UNAVAILABLE');
 let p=support;while(p&&p!==parent)p=p.parent;if(!p)throw Error('SUPPORT_PARENT_MISMATCH');
 spec=freeze(clone(spec));const specCopy=spec,root=new T.Group();root.name=ROOT;root.position.fromArray(spec.originSourceM);
 const material=(color,metalness=0,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const metal=material('#647880',.72,.3),dark=material('#172f3c',.35,.4),leather=material('#decaaa',0,.72),rubber=material('#243336',0,.92);
 const meshes={},savedGeometry=new Map(),expectedLocal=new Map();
 function box(name,center,size,mat){const n=new T.Mesh(new T.BoxGeometry(...size),mat);n.name=name;n.position.fromArray(center);n.castShadow=true;n.receiveShadow=true;root.add(n);meshes[name]=n;return n;}
 box('Y2_PLATFORM',[0,.065,0],[1.6,.07,.93],dark);
 for(let i=0;i<spec.mountsStationXZ.length;i++){const [x,z]=spec.mountsStationXZ[i];box('Y2_MOUNT_'+i,[x,.015,z],[spec.mountPadXZ[0],.03,spec.mountPadXZ[1]],metal);}
 box('Y2_SEAT_PEDESTAL',[-.34,.35,0],[.18,.50,.18],metal);
 box('Y2_SEAT_BACK',[-.60,.91,0],[.07,.54,.57],leather);
 box('Y2_COLUMN',[.49,.57,0],[.13,.92,.12],metal);
 box('Y2_WHEEL_SHAFT',[.39,1.03,0],[.20,.055,.055],metal);
 const wheel=new T.Mesh(new T.TorusGeometry(.245,.021,8,40),dark);wheel.name='Y2_WHEEL_RIM';wheel.rotation.y=Math.PI/2;wheel.position.set(.30,1.03,0);root.add(wheel);
 box('Y2_WHEEL_SPOKE',[.30,1.03,0],[.035,.027,.47],metal);
 for(const s of spec.surfaces){if(s.kind==='sole-pad')box(s.mesh+'_RISER',[s.boxCenterM[0],.135,s.boxCenterM[2]],[.22,.07,.12],metal);box(s.mesh,s.boxCenterM,s.boxSizeM,s.kind==='cushion'?leather:rubber);}
 for(const n of Object.values(meshes)){n.updateMatrix();expectedLocal.set(n.name,n.matrix.toArray());savedGeometry.set(n.name,{geometry:n.geometry,positions:Array.from(n.geometry.attributes.position.array)});}
 root.updateMatrix();const expectedRoot=root.matrix.toArray();parent.add(root);
 const geom=API.readSourceGeometry(model,y1Manifest,assetHash),base=API.createAdapter(y1Manifest,geom);
 function auditMounts(frame){
  const out=[];const snap=base.sample(frame);if(!snap.available)return {available:false,reason:snap.reason,probes:[]};
  const node=frame.nodes[spec.sourceSupportMesh];if(!node||!M.rigid(node.worldFromLocal))return {available:false,reason:'SUPPORT_TRANSFORM_INVALID',probes:[]};
  const fromSource=frame.nodes[spec.sourceParent]?.worldFromLocal;if(!M.rigid(fromSource))return {available:false,reason:'SOURCE_PARENT_INVALID',probes:[]};
  for(let index=0;index<spec.mountsStationXZ.length;index++){
   const [x,z]=spec.mountsStationXZ[index];
   for(const u of [-.5,0,.5])for(const v of [-.5,0,.5]){
    const point=[spec.originSourceM[0]+x+u*spec.mountPadXZ[0],spec.originSourceM[1]+.02,spec.originSourceM[2]+z+v*spec.mountPadXZ[1]];
    const query=base.queryContact(frame,{regionId:spec.sourceSupportRegion,pointWorldM:M.transform(fromSource,point),expectedFrameToken:snap.frameToken,maxAboveM:.1,maxPenetrationM:0});
    const expected=M.transform(fromSource,[point[0],spec.originSourceM[1],point[2]]);
    out.push({mount:index,available:query.available,reason:query.reason,sourceTriangleIndex:query.sourceTriangleIndex??null,pointWorldM:query.pointWorldM??null,errorM:query.available?Math.hypot(...query.pointWorldM.map((a,i)=>a-expected[i])):null});
   }
  }
  return {available:out.every(x=>x.available&&x.errorM<1e-5),reason:out.every(x=>x.available&&x.errorM<1e-5)?null:'MOUNT_SUPPORT_UNAVAILABLE',probes:out};
 }
 function syncVisibility(frame){root.visible=!modeReason(frame);return root.visible;}
 function sample(frame,currentFrame){
  const source=base.sample(frame);let reason=source.available?modeReason(frame):source.reason;
  if(!reason&&(!currentFrame||!base.matchesCurrentFrame(source.frameToken,currentFrame)))reason='STALE_OWNER_FRAME';
  if(!reason&&modeReason(currentFrame))reason='CURRENT_OCCUPANCY_INVALID';
  if(!reason&&(root.parent!==parent||model.getObjectByName(ROOT)!==root))reason='STATION_DETACHED';
  if(!reason&&!near(root.matrix.toArray(),expectedRoot))reason='STATION_LOCAL_TRANSFORM_CHANGED';
  const parentPose=frame?.nodes?.[spec.sourceParent];
  if(!reason&&(!parentPose?.visible||!near(parent.matrixWorld.toArray(),parentPose.worldFromLocal)))reason='SOURCE_RENDER_TRANSFORM_MISMATCH';
  const world=root.matrixWorld.toArray();
  if(!reason&&(!M.rigid(world)||!near(world,M.multiply(parentPose.worldFromLocal,expectedRoot))))reason='STATION_RENDER_TRANSFORM_INVALID';
  if(!reason&&M.direction(world,[0,1,0])[1]<Math.cos(spec.occupancy.maxWorldTiltRad))reason='STATION_TILT_UNSUPPORTED';
  if(!reason&&root.visible!==true)reason='STATION_NOT_VISIBLE';
  const mounts=reason?{available:false,reason,probes:[]}:auditMounts(frame);
  if(!reason&&!mounts.available)reason=mounts.reason;
  const contacts={};
  for(const s of spec.surfaces){
   const n=meshes[s.mesh],saved=savedGeometry.get(s.mesh);let why=reason;
   if(!why&&(n.parent!==root||root.getObjectByName(s.mesh)!==n||!n.visible))why='CONTACT_MESH_UNAVAILABLE';
   if(!why&&(n.geometry!==saved.geometry||!near(Array.from(n.geometry.attributes.position.array),saved.positions,1e-7)))why='CONTACT_GEOMETRY_CHANGED';
   if(!why&&(!near(n.matrix.toArray(),expectedLocal.get(s.mesh))||!near(n.matrixWorld.toArray(),M.multiply(world,expectedLocal.get(s.mesh)))))why='CONTACT_TRANSFORM_CHANGED';
   if(why){contacts[s.id]={id:s.id,...bad(why)};continue;}
   const basis=[...s.tangentUStation,0,...s.normalStation,0,...s.tangentVStation,0,...s.pointStationM,1],wm=M.multiply(world,basis);
   contacts[s.id]={id:s.id,available:true,reason:null,kind:s.kind,mesh:s.mesh,sourceParent:spec.sourceParent,newGeometry:true,rigJoint:false,
    pointStationM:s.pointStationM.slice(),pointWorldM:wm.slice(12,15),pointVesselM:M.transform(source.vessel.localFromWorld,wm.slice(12,15)),
    normalWorld:M.direction(world,s.normalStation),tangentUWorld:M.direction(world,s.tangentUStation),tangentVWorld:M.direction(world,s.tangentVStation),
    worldFromContact:wm,contactFromWorld:M.inverse(wm),quaternionXYZW:M.quaternion(wm),halfExtentsM:s.halfExtentsM.slice(),maxSupportedRectangleM:s.maxSupportedRectangleM.slice()};
  }
  const ok=!reason&&Object.values(contacts).every(x=>x.available);
  return freeze({schema:spec.schema,available:ok,reason:reason||(!ok?'CONTACTS_INCOMPLETE':null),vesselId:ID,stationRevision:spec.stationRevision,
   frameToken:source.frameToken??null,instanceId:source.instanceId??null,activationEpoch:source.activationEpoch??null,frameId:source.frameId??null,simTimeSeconds:source.simTimeSeconds??null,
   sourceAssetSHA256:assetHash,sourceParent:spec.sourceParent,mode:frame?.mode??null,stationWorldFromLocal:ok?world:null,
   vessel:source.vessel,contacts,mounts,occupancy:{available:ok,seats:ok?1:0,wholeBodyClearance:false,transitionPackingValidated:false},
   bottom:source.bottom,rigJointTargets:null,productionEnabled:false});
 }
 function supportsRectangle(contact,widthM,lengthM,centerUV=[0,0]){
  if(!contact?.available||![widthM,lengthM,...centerUV].every(Number.isFinite)||widthM<=0||lengthM<=0||centerUV.length!==2)return false;
  return widthM<=contact.maxSupportedRectangleM[0]&&lengthM<=contact.maxSupportedRectangleM[1]&&Math.abs(centerUV[0])+widthM/2<=contact.halfExtentsM[0]&&Math.abs(centerUV[1])+lengthM/2<=contact.halfExtentsM[1];
 }
 return Object.freeze({root,meshes,spec:specCopy,base,syncVisibility,sample,auditMounts,supportsRectangle});
}
const out={install,modeReason};if(typeof module!=='undefined')module.exports=out;else G.AtlasDY2Station=out;
})(typeof window!=='undefined'?window:globalThis);
