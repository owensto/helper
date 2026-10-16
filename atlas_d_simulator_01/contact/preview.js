/* Diagnostic harness only. Observes the pinned host renderer; never steps a
 * vessel or creates a human. Test scripts operate the host's existing controls.
 * setTimeout below only waits for asset readiness, not a vessel clock.
 */
(async()=>{'use strict';
 const X=window.AtlasDVesselContact,M=await (await fetch('anchors.json')).json();
 const iframe=document.getElementById('host'),svg=document.getElementById('overlay'),data=document.getElementById('data');
 const output=window.Y1={ready:false,error:null,enabled:true,history:[],latest:null,frame:null,costMs:[],epoch:0,observedFrames:0};
 let h,T,P,adapter,group,lastActive=null,camera;
 const el=(name,attributes,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attributes))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
 function projected(p){const v=new T.Vector3(...p).project(camera),r=iframe.getBoundingClientRect();return [r.left+(v.x*.5+.5)*r.width,r.top+(-v.y*.5+.5)*r.height,v.z>-1&&v.z<1];}
 function marker(point,label,ok,dy){const [x,y,visible]=projected(point);if(!visible)return;const color=ok?'#8ef0c1':'#ffca89';el('circle',{cx:x,cy:y,r:5,fill:'#122d3c',stroke:color,'stroke-width':2});el('line',{x1:x,y1:y,x2:x+20,y2:y+dy,stroke:color});el('text',{x:x+24,y:y+dy+4,fill:color,'font-size':11,'font-family':'system-ui','paint-order':'stroke',stroke:'#102936','stroke-width':3},label);}
 function ownerFrame(){
   const active=!!P.active;if(lastActive!==active){output.epoch++;lastActive=active;}
   const s=P.state.snapshot();
   return {vesselId:X.ID,activeVesselId:active?X.ID:'atlas-bay-25',sourceAssetSHA256:M.sourceAssetSHA256,instanceId:'y1-pinned-r7-instance',activationEpoch:output.epoch,
     frameId:output.observedFrames,simTimeSeconds:s.elapsed,mode:s.mode,conversion:s.conversion,depthM:s.depthM,
     bottom:{known:s.depthKnown,waterDepthM:s.waterDepthM,clearanceM:s.clearanceM}};
 }
 function observe(cam){
   camera=cam;output.observedFrames++;
   if(!output.enabled)return;
   const before=JSON.stringify(P.state.snapshot()),start=performance.now();
   const f=X.capturePose(P.model,group,ownerFrame(),M),sample=adapter.sample(f),probes=[];
   svg.replaceChildren();
   if(sample.available){
     let i=0;
     for(const r of M.regions){
       const mesh=P.model.getObjectByName(r.sourceMesh);const point=new T.Vector3(...r.previewPointLocalM).applyMatrix4(mesh.matrixWorld);
       const q=adapter.queryContact(f,{regionId:r.id,pointWorldM:point.toArray(),expectedFrameToken:sample.frameToken});
       const row={id:r.id,available:q.available,reason:q.reason,query:q};
       // Independent THREE.Raycaster intersection against the unmodified actual mesh.
       if(q.available){
         const direction=new T.Vector3(0,-1,0).transformDirection(mesh.matrixWorld);
         const ray=new T.Raycaster(point,direction,0,0.75),hits=ray.intersectObject(mesh,false);
         if(hits.length){const target=new T.Vector3(...q.pointWorldM);row.rayErrorM=hits[0].point.distanceTo(target);
           const ix=mesh.geometry.index,pos=mesh.geometry.attributes.position,k=q.sourceTriangleIndex*3;
           const a=new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(k):k),b=new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(k+1):k+1),c=new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(k+2):k+2);
           const n=b.sub(a).cross(c.sub(a)).normalize().transformDirection(mesh.matrixWorld);row.normalError=n.distanceTo(new T.Vector3(...q.normalWorld));
           const world=new T.Vector3(...q.pointDeckM).applyMatrix4(P.model.getObjectByName(M.frames.find(d=>d.id===r.deckFrame).sourceNode).matrixWorld);row.deckRoundTripErrorM=world.distanceTo(target);
         }else row.rayErrorM=null;
       }
       marker(q.available?q.pointWorldM:point.toArray(),r.id+(q.available?'':' · unavailable'),q.available,++i%2?-23:23);
       probes.push(row);
     }
     const origin=group.getWorldPosition(new T.Vector3()).toArray();const o=projected(origin);
     for(const [axis,offset,color]of [['+X forward',[9,0,0],'#f7ae97'],['+Y up',[0,9,0],'#bfe2b7'],['+Z starboard',[0,0,9],'#9dcfee']]){const p=projected(new T.Vector3(...offset).applyMatrix4(group.matrixWorld).toArray());if(o[2]&&p[2]){el('line',{x1:o[0],y1:o[1],x2:p[0],y2:p[1],stroke:color,'stroke-width':2});el('text',{x:p[0]+4,y:p[1]-4,fill:color,'font-family':'system-ui','font-size':10,stroke:'#122d3c','stroke-width':2,'paint-order':'stroke'},axis);}}
   }
   const cost=performance.now()-start;output.costMs.push(cost);if(output.costMs.length>512)output.costMs.shift();
   const state=P.state.snapshot(),row={sample,probes,state,observedFrames:output.observedFrames,hostSimulationTimeSeconds:state.elapsed,adapterOwnsClock:false,
     sourceStateUnchanged:before===JSON.stringify(state),vesselMatrix:group.matrixWorld.elements.slice(),cameraPosition:cam.position.toArray(),costMs:cost};
   output.latest=row;output.frame=f;output.history.push(row);if(output.history.length>256)output.history.shift();
   data.className=sample.available?'good':'bad';data.textContent=[sample.available?`${state.mode.toUpperCase()} · frame ${f.frameId}`:sample.reason,`Host time ${state.elapsed.toFixed(3)} s`,`${probes.filter(p=>p.available).length}/3 support patches`,
     'Helm seat / 2 hands / 2 feet:', 'UNAVAILABLE IN ORIGINAL R7',sample.available?`Bottom ${sample.bottom.known?'known':'UNKNOWN — stays null'}`:'Yacht attachments invalidated',`Epoch ${output.epoch} · same host pose`].join('\n');
 }
 function connect(){
   try{h=iframe.contentWindow;if(!h.ATLAS_D_SIM?.ready)return setTimeout(connect,100);T=h.ATLASRuntime;P=h.ATLAS_D_SIM;group=h.BAYPLAY.scene.getObjectByName('ATLAS_D_PLAYER');
     const geometry=X.readSourceGeometry(P.model,M,M.sourceAssetSHA256);adapter=X.createAdapter(M,geometry);
     output.geometryCounts=Object.fromEntries(Object.entries(geometry).map(([k,g])=>[k,g.triangles?.length||0]));output.adapter=adapter;
     const render=h.BAYPLAY.renderer.render.bind(h.BAYPLAY.renderer);
     h.BAYPLAY.renderer.render=function(scene,cam){const result=render(scene,cam);if(scene===h.BAYPLAY.scene)observe(cam);return result;};
     output.inspect=()=>output.latest;output.freshSample=()=>adapter.sample(X.capturePose(P.model,group,ownerFrame(),M));
     output.tokenValid=t=>adapter.matchesCurrentFrame(t,X.capturePose(P.model,group,ownerFrame(),M));
     output.ready=true;data.textContent='Source audited. Board original ATLAS D to inspect contacts.';
   }catch(e){output.error=String(e);data.textContent='Y1 error: '+String(e);console.error(e);}
 }
 if(iframe.contentDocument?.readyState==='complete')connect();else iframe.addEventListener('load',connect,{once:true});
})().catch(e=>{window.Y1={ready:false,error:String(e)};console.error(e);});
