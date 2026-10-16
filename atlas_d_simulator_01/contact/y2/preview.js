/* Review harness only. Original host advances all motion; no second simulation. */
(async()=>{'use strict';
const X=AtlasDVesselContact,H=AtlasDY2Station,J=AtlasDY2Identity;
const spec=await (await fetch('station.json')).json(),manifest=await (await fetch('../anchors.json')).json();
const iframe=document.getElementById('host'),status=document.getElementById('status'),list=document.getElementById('contacts');
const out=window.Y2={ready:false,error:null,activationEpoch:0,simulationEpoch:0,frames:0,history:[],costMs:[],view:'station',enabled:true};
let h,T,P,group,station,lastActive=false,camera,lastOriginalCamera;
const local=v=>new T.Vector3(...v).applyMatrix4(station.root.matrixWorld);
function ownerFrame(){const s=P.state.snapshot(),active=P.active;if(active!==lastActive){out.activationEpoch++;lastActive=active;}
 return {vesselId:X.ID,activeVesselId:active?X.ID:'atlas-bay-25-sealab12',sourceAssetSHA256:X.ASSET,instanceId:'y2-fixture-r7-instance',activationEpoch:out.activationEpoch,frameId:out.frames,simTimeSeconds:s.elapsed,mode:s.mode,conversion:s.conversion,depthM:s.depthM,bottom:{known:s.depthKnown,waterDepthM:s.waterDepthM,clearanceM:s.clearanceM},coreSourceSHA:'36903985f2182c902427fed77d4e28c61a7639ca',hostSessionId:'y2-isolated-owner-host',simulationEpoch:out.simulationEpoch,worldRevision:'y2-r7-authored-proving-ground-fixture'};}
function fresh(){return X.capturePose(P.model,group,ownerFrame(),manifest);}
function observe(originalCam){
 const began=performance.now(),before=JSON.stringify(P.state.snapshot());out.frames++;lastOriginalCamera=originalCam;
 const frame=fresh();station.syncVisibility(frame);const current=fresh(),y1=station.base.sample(frame),physical=station.sample(frame,current);
 const context={scope:'isolated-fixture',coreSourceSHA:current.coreSourceSHA,hostSessionId:current.hostSessionId,worldRevision:current.worldRevision,clock:{domain:'client-simulation',epoch:current.simulationEpoch,seconds:current.simTimeSeconds},dt:0};
 const mapped=J.mapPhysical(physical,y1,current,context),rays=[];
 if(physical.available)for(const c of Object.values(physical.contacts)){
  const n=new T.Vector3(...c.normalWorld),p=new T.Vector3(...c.pointWorldM),hit=new T.Raycaster(p.clone().addScaledVector(n,.05),n.clone().negate(),0,.1).intersectObject(station.meshes[c.mesh],false)[0];
  rays.push({id:c.id,hit:!!hit,errorM:hit?hit.point.distanceTo(p):null,normalError:hit?hit.face.normal.clone().transformDirection(station.meshes[c.mesh].matrixWorld).distanceTo(n):null,faceIndex:hit?.faceIndex??null});
 }
 const cost=performance.now()-began;
 out.latest={physical,mapped,y1,frame,current,rays,sourceUnchanged:before===JSON.stringify(P.state.snapshot()),state:P.state.snapshot(),costMs:cost,visible:station.root.visible};
 out.history.push(out.latest);if(out.history.length>256)out.history.shift();out.costMs.push(cost);if(out.costMs.length>512)out.costMs.shift();
 status.className=physical.available?'ok':'bad';status.textContent=[physical.available?'5/5 PHYSICAL CONTACTS AVAILABLE':physical.reason,`${frame.mode.toUpperCase()} · host ${frame.simTimeSeconds.toFixed(3)} s`,`${physical.mounts.probes.filter(x=>x.available).length}/36 original-mesh mount probes`,`Activation ${frame.activationEpoch} ≠ simulation epoch ${frame.simulationEpoch}`,mapped.available?'Identity/transform handoff available':mapped.reason,'Rig targets: UNAVAILABLE','Production activation: OFF'].join('\n');
 list.replaceChildren();for(const c of Object.values(physical.contacts)){const d=document.createElement('div');d.textContent=c.id+' · '+(c.available?c.kind:c.reason);list.append(d);}
 return out.latest;
}
function connect(){try{
 h=iframe.contentWindow;if(!h.ATLAS_D_SIM?.ready)return setTimeout(connect,100);T=h.ATLASRuntime;P=h.ATLAS_D_SIM;group=h.BAYPLAY.scene.getObjectByName('ATLAS_D_PLAYER');
 station=H.install(T,P.model,spec,manifest,X.ASSET);out.station=station;camera=new T.PerspectiveCamera(46,1,.01,2000);
 h.document.getElementById('ad-reset').addEventListener('click',()=>{out.simulationEpoch++;},true);
 const original=h.BAYPLAY.renderer.render.bind(h.BAYPLAY.renderer);
 h.BAYPLAY.renderer.render=function(scene,cam){if(scene!==h.BAYPLAY.scene||!out.enabled)return original(scene,cam);observe(cam);
  if(out.view==='station'&&P.active){const size=h.BAYPLAY.renderer.getSize(new T.Vector2());camera.aspect=size.x/size.y;camera.updateProjectionMatrix();camera.position.copy(local([-2.1,1.8,2.2]));camera.lookAt(local([0,.58,0]));return original(scene,camera);}
  return original(scene,cam);
 };
 out.refresh=()=>{if(P.active)P.testStep(0);else h.BAYPLAY.renderer.render(h.BAYPLAY.scene,h.BAYPLAY.camera);return out.latest;};
 out.current=fresh;out.context=()=>({scope:'isolated-fixture',coreSourceSHA:'36903985f2182c902427fed77d4e28c61a7639ca',hostSessionId:'y2-isolated-owner-host',worldRevision:'y2-r7-authored-proving-ground-fixture',clock:{domain:'client-simulation',epoch:out.simulationEpoch,seconds:P.state.elapsed},dt:0});
 out.physicalAgain=()=>station.sample(out.latest.frame,fresh());
 document.getElementById('station-view').onclick=()=>{out.view='station';out.refresh();};document.getElementById('overview').onclick=()=>{out.view='overview';out.refresh();};out.ready=true;
}catch(e){out.error=String(e);status.textContent=out.error;console.error(e);}}
if(iframe.contentDocument?.readyState==='complete')connect();else iframe.addEventListener('load',connect,{once:true});
})().catch(e=>{window.Y2={ready:false,error:String(e)};console.error(e);});
