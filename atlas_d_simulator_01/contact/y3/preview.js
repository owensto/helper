/* Isolated review observer. One existing yacht render loop; its actual rudder drives the wheel. */
(async()=>{'use strict';
const X=AtlasDVesselContact,H=AtlasDY3Station,J=AtlasDY2Identity;
const spec=await(await fetch('station.json')).json(),manifest=await(await fetch('../anchors.json')).json();
const iframe=document.getElementById('host'),status=document.getElementById('status'),list=document.getElementById('contacts');
const out=window.Y3={ready:false,error:null,activationEpoch:0,simulationEpoch:0,frames:0,history:[],costMs:[],view:'station',enabled:true,exhaustiveMounts:false};
let h,T,P,group,station,lastActive=false,camera,lastOriginalCamera,lastList='';
const local=v=>new T.Vector3(...v).applyMatrix4(station.root.matrixWorld);
function ownerFrame(){const s=P.state.snapshot(),active=P.active;if(active!==lastActive){out.activationEpoch++;lastActive=active;}
 return {vesselId:X.ID,activeVesselId:active?X.ID:'atlas-bay-25-sealab12',sourceAssetSHA256:X.ASSET,instanceId:'y3-fixture-r7-instance',activationEpoch:out.activationEpoch,frameId:out.frames,simTimeSeconds:s.elapsed,mode:s.mode,conversion:s.conversion,depthM:s.depthM,controls:{rudder:s.rudder},bottom:{known:s.depthKnown,waterDepthM:s.waterDepthM,clearanceM:s.clearanceM},coreSourceSHA:'36903985f2182c902427fed77d4e28c61a7639ca',hostSessionId:'y3-isolated-owner-host',simulationEpoch:out.simulationEpoch,worldRevision:'y3-r7-authored-proving-ground-fixture'};}
function fresh(){return X.capturePose(P.model,group,ownerFrame(),manifest);}
function observe(originalCam){
 const began=performance.now(),before=JSON.stringify(P.state.snapshot());out.frames++;lastOriginalCamera=originalCam;
 const frame=fresh(),evaluated=station.evaluate(frame,fresh()),current=fresh(),y1=station.base.sample(frame),physical=station.sample(frame,current,{exhaustiveMounts:out.exhaustiveMounts});
 const context={scope:'isolated-fixture',coreSourceSHA:current.coreSourceSHA,hostSessionId:current.hostSessionId,worldRevision:current.worldRevision,clock:{domain:'client-simulation',epoch:current.simulationEpoch,seconds:current.simTimeSeconds},dt:0};
 const mapped=J.mapPhysical(physical,y1,current,context),rays=[];
 if(physical.available)for(const c of Object.values(physical.contacts)){
  const n=new T.Vector3(...c.normalWorld),p=new T.Vector3(...c.pointWorldM),hit=new T.Raycaster(p.clone().addScaledVector(n,.05),n.clone().negate(),0,.1).intersectObject(station.meshes[c.mesh],false)[0];
  rays.push({id:c.id,hit:!!hit,errorM:hit?hit.point.distanceTo(p):null,normalError:hit?hit.face.normal.clone().transformDirection(station.meshes[c.mesh].matrixWorld).distanceTo(n):null,faceIndex:hit?.faceIndex??null});
 }
 const cost=performance.now()-began;
 out.latest={physical,mapped,y1,frame,current,evaluated,rays,sourceUnchanged:before===JSON.stringify(P.state.snapshot()),state:P.state.snapshot(),costMs:cost,visible:station.root.visible,cache:station.diagnostics()};
 out.history.push(out.latest);if(out.history.length>256)out.history.shift();out.costMs.push(cost);if(out.costMs.length>512)out.costMs.shift();
 status.className=physical.available?'ok':'bad';status.textContent=[physical.available?'5/5 PHYSICAL CONTACTS AVAILABLE':physical.reason,`${frame.mode.toUpperCase()} · owner ${frame.simTimeSeconds.toFixed(3)} s`,`Actual owner rudder: ${frame.controls.rudder}`,physical.articulation.available?`Wheel: ${(physical.articulation.wheelAngleRad*180/Math.PI).toFixed(1)}° (authored mapping)`:'Wheel/control unavailable',`${physical.mounts.probes.filter(x=>x.available).length}/36 source support witnesses`,`${physical.mounts.method||'Unavailable'} · ${physical.mounts.freshRayCount??0} fresh mount rays`,`Activation ${frame.activationEpoch} ≠ clock epoch ${frame.simulationEpoch}`,'Rig targets / production: OFF'].join('\n');
 const text=Object.values(physical.contacts).map(c=>c.id+' · '+(c.available?(c.articulated?'evaluated moving grip':c.kind):c.reason)).join('\n');if(text!==lastList){list.textContent=text;lastList=text;}
 return out.latest;
}
function benchmark(count=40){
 const f=fresh();station.evaluate(f,f);const fast=[],full=[];let maxError=0;
 for(let i=0;i<count;i++){
  let t=performance.now();const a=station.sample(f,f);fast.push(performance.now()-t);t=performance.now();const b=station.sample(f,f,{exhaustiveMounts:true});full.push(performance.now()-t);
  if(!a.available||!b.available)throw Error('BENCHMARK_CONTACT_UNAVAILABLE');
  for(let n=0;n<36;n++){const p=a.mounts.probes[n],q=b.mounts.probes[n];if(p.sourceTriangleIndex!==q.sourceTriangleIndex)throw Error('CACHE_TRIANGLE_MISMATCH');maxError=Math.max(maxError,Math.hypot(...p.pointWorldM.map((v,k)=>v-q.pointWorldM[k])));}
 }
 const summary=a=>{a.sort((x,y)=>x-y);return {samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
 return {optimized:summary(fast),exhaustive:summary(full),maxMountPointErrorM:maxError,matchedAll36Triangles:true,diagnosticOnly:true,includesRender:false};
}
function connect(){try{
 h=iframe.contentWindow;if(!h.ATLAS_D_SIM?.ready)return setTimeout(connect,100);T=h.ATLASRuntime;P=h.ATLAS_D_SIM;group=h.BAYPLAY.scene.getObjectByName('ATLAS_D_PLAYER');
 station=H.install(T,P.model,spec,manifest,X.ASSET);out.station=station;camera=new T.PerspectiveCamera(46,1,.01,2000);
 h.document.getElementById('ad-reset').addEventListener('click',()=>{out.simulationEpoch++;},true);
 const original=h.BAYPLAY.renderer.render.bind(h.BAYPLAY.renderer);
 h.BAYPLAY.renderer.render=function(scene,cam){if(scene!==h.BAYPLAY.scene||!out.enabled)return original(scene,cam);observe(cam);
  if(out.view==='station'&&P.active){const size=h.BAYPLAY.renderer.getSize(new T.Vector2());camera.aspect=size.x/size.y;camera.updateProjectionMatrix();camera.position.copy(local([-1.9,1.55,1.35]));camera.lookAt(local([0,.85,0]));return original(scene,camera);}return original(scene,cam);
 };
 out.refresh=()=>{if(P.active)P.testStep(0);else h.BAYPLAY.renderer.render(h.BAYPLAY.scene,h.BAYPLAY.camera);return out.latest;};out.current=fresh;out.benchmark=benchmark;
 out.physicalAgain=()=>station.sample(out.latest.frame,fresh());
 document.getElementById('station-view').onclick=()=>{out.view='station';out.refresh();};document.getElementById('overview').onclick=()=>{out.view='overview';out.refresh();};out.ready=true;
}catch(e){out.error=String(e);status.textContent=out.error;console.error(e);}}
if(iframe.contentDocument?.readyState==='complete')connect();else iframe.addEventListener('load',connect,{once:true});
})().catch(e=>{window.Y3={ready:false,error:String(e)};console.error(e);});
