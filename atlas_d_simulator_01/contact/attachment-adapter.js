/* ATLAS D Y1: synchronous read-only attachment/contact adapter.
 * No clock, simulation step, global runtime patch, human, IK, networking or forces.
 * Caller owns current frame identity, active-vessel lifecycle and pose evaluation.
 */
(function (G) {
  'use strict';
  const ID='atlas-d-original-r7', SCHEMA='atlas-vessel-contact/1';
  const ASSET='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48';
  const MODES=['surface','securing','secured','diving','submerged','surfacing','deploying'];
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const vec=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(finite);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length=a=>Math.hypot(...a);
  const normal=a=>{const l=length(a);return l>1e-12?a.map(v=>v/l):null;};
  const bad=(reason,extra={})=>({available:false,reason,...extra});
  const clone=x=>JSON.parse(JSON.stringify(x));
  function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
  function transform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
  function direction(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]];}
  function rigid(m){
    if(!vec(m,16)||m.slice(12,15).some(v=>Math.abs(v)>1e8))return false;
    const x=m.slice(0,3),y=m.slice(4,7),z=m.slice(8,11),e=1e-5;
    return Math.abs(m[3])+Math.abs(m[7])+Math.abs(m[11])+Math.abs(m[15]-1)<e&&
      [x,y,z].every(v=>Math.abs(dot(v,v)-1)<e)&&Math.abs(dot(x,y))+Math.abs(dot(x,z))+Math.abs(dot(y,z))<e&&Math.abs(dot(x,cross(y,z))-1)<e;
  }
  function inverse(m){
    const r=[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,0,0,0,1];
    const t=direction(r,m.slice(12,15));r[12]=-t[0];r[13]=-t[1];r[14]=-t[2];return r;
  }
  function multiply(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
  function quaternion(m){
    const trace=m[0]+m[5]+m[10];let x,y,z,w,s;
    if(trace>0){s=2*Math.sqrt(trace+1);w=s/4;x=(m[6]-m[9])/s;y=(m[8]-m[2])/s;z=(m[1]-m[4])/s;}
    else if(m[0]>m[5]&&m[0]>m[10]){s=2*Math.sqrt(1+m[0]-m[5]-m[10]);w=(m[6]-m[9])/s;x=s/4;y=(m[4]+m[1])/s;z=(m[8]+m[2])/s;}
    else if(m[5]>m[10]){s=2*Math.sqrt(1+m[5]-m[0]-m[10]);w=(m[8]-m[2])/s;x=(m[4]+m[1])/s;y=s/4;z=(m[9]+m[6])/s;}
    else{s=2*Math.sqrt(1+m[10]-m[0]-m[5]);w=(m[1]-m[4])/s;x=(m[8]+m[2])/s;y=(m[9]+m[6])/s;z=s/4;}
    const norm=Math.hypot(x,y,z,w),sign=w<0?-1:1;return [x,y,z,w].map(v=>v/norm*sign);
  }
  const matrixFrame=m=>({available:true,reason:null,worldFromLocal:m.slice(),localFromWorld:inverse(m),positionWorldM:m.slice(12,15),quaternionWorldXYZW:quaternion(m)});
  const token=f=>JSON.stringify([ID,f.instanceId,f.activationEpoch,f.frameId,f.simTimeSeconds]);
  function validFrame(f){
    if(!f||typeof f!=='object')return 'FRAME_UNAVAILABLE';
    if(f.activeVesselId!==ID)return 'VESSEL_NOT_ACTIVE';
    if(f.vesselId!==ID)return 'VESSEL_ID_MISMATCH';
    if(f.sourceAssetSHA256!==ASSET)return 'ASSET_IDENTITY_MISMATCH';
    if(typeof f.instanceId!=='string'||!f.instanceId||!Number.isSafeInteger(f.activationEpoch)||f.activationEpoch<0||!Number.isSafeInteger(f.frameId)||f.frameId<0||!finite(f.simTimeSeconds)||f.simTimeSeconds<0)return 'FRAME_IDENTITY_UNAVAILABLE';
    if(!MODES.includes(f.mode)||!finite(f.conversion)||f.conversion<0||f.conversion>1||!finite(f.depthM)||f.depthM<0)return 'STATE_INVALID';
    if(f.mode==='surface'&&(f.conversion>1e-6||f.depthM>0.03))return 'STATE_INCONSISTENT';
    if(['secured','diving','submerged','surfacing'].includes(f.mode)&&Math.abs(f.conversion-1)>1e-6)return 'STATE_INCONSISTENT';
    if(['secured','securing','deploying'].includes(f.mode)&&f.depthM>0.03)return 'STATE_INCONSISTENT';
    if(!rigid(f.worldFromVessel))return 'VESSEL_TRANSFORM_INVALID';
    if(!f.nodes||typeof f.nodes!=='object')return 'NODE_POSES_UNAVAILABLE';
    if(!f.bottom||typeof f.bottom.known!=='boolean')return 'BOTTOM_KNOWLEDGE_UNAVAILABLE';
    if(f.bottom.known&&(!finite(f.bottom.waterDepthM)||!finite(f.bottom.clearanceM)))return 'BOTTOM_KNOWLEDGE_INVALID';
    return null;
  }
  function supportReason(f,region){
    if(['securing','deploying'].includes(f.mode))return 'TRANSFORMING_OCCUPANCY_UNSUPPORTED';
    if(f.depthM>0.03||['diving','submerged','surfacing'].includes(f.mode))return 'SUBMERGED_EXTERIOR_UNSUPPORTED';
    if(!region.allowedModes.includes(f.mode))return 'REGION_NOT_SUPPORTED_IN_CONFIGURATION';
    return null;
  }
  function insideXZ(p,b){return p[0]>=b[0]&&p[0]<=b[1]&&p[2]>=b[2]&&p[2]<=b[3];}
  function barycentric(p,tri){
    const u=sub(tri[1],tri[0]),v=sub(tri[2],tri[0]),w=sub(p,tri[0]);
    const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),wu=dot(w,u),wv=dot(w,v),den=uu*vv-uv*uv;
    if(Math.abs(den)<1e-14)return null;
    const b=(wu*vv-wv*uv)/den,c=(wv*uu-wu*uv)/den,a=1-b-c;
    return Math.min(a,b,c)>=-1e-7?[a,b,c]:null;
  }
  function nodePose(f,name){
    const p=f.nodes[name];if(!p)return bad('SOURCE_NODE_UNAVAILABLE',{sourceNode:name});
    if(p.visible!==true)return bad('SOURCE_NODE_NOT_VISIBLE',{sourceNode:name});
    if(!rigid(p.worldFromLocal))return bad('NODE_TRANSFORM_INVALID',{sourceNode:name});
    return {...matrixFrame(p.worldFromLocal),sourceNode:name};
  }
  function createAdapter(manifest,geometry){
    if(manifest?.schemaVersion!==SCHEMA||manifest?.vesselId!==ID||manifest?.sourceAssetSHA256!==ASSET)throw new TypeError('Unsupported source identity or manifest schema');
    const M=freeze(clone(manifest)),geom={};
    for(const region of M.regions){
      if(!vec(region.boundsXZ,4)||!vec(region.heightRangeM,2))throw new TypeError('Invalid contact region');
      const source=geometry?.[region.id];
      if(!source?.available){geom[region.id]=bad(source?.reason||'SOURCE_GEOMETRY_UNAVAILABLE');continue;}
      if(source.sourceNode!==region.sourceMesh||source.sourceAssetSHA256!==ASSET)throw new TypeError('Contact geometry provenance mismatch');
      const triangles=[];
      for(const t of source.triangles||[]){
        if(!Number.isSafeInteger(t.index)||t.index<0||!Array.isArray(t.points)||t.points.length!==3||!t.points.every(p=>vec(p,3)))throw new TypeError('Invalid source triangle');
        const n=normal(cross(sub(t.points[1],t.points[0]),sub(t.points[2],t.points[0])));
        if(!n||n[1]<region.normalLocalYMin)continue;
        const ys=t.points.map(p=>p[1]);if(Math.max(...ys)<region.heightRangeM[0]||Math.min(...ys)>region.heightRangeM[1])continue;
        triangles.push({index:t.index,points:clone(t.points),normal:n});
      }
      geom[region.id]=triangles.length?freeze({available:true,reason:null,triangles}):bad('NO_REVIEWED_SOURCE_TRIANGLES');
    }
    function sample(f){
      const reason=validFrame(f);
      if(reason)return freeze(bad(reason,{schemaVersion:SCHEMA,vesselId:ID,frameToken:null,
        vessel:bad(reason,{worldFromLocal:null,localFromWorld:null,positionWorldM:null,quaternionWorldXYZW:null}),
        decks:Object.fromEntries(M.frames.map(d=>[d.id,bad(reason,{id:d.id,sourceNode:d.sourceNode,worldFromLocal:null,localFromWorld:null})])),
        helmAttachmentAvailable:false,helmAnchors:Object.fromEntries(M.helmAnchors.map(a=>[a.id,bad(reason,{id:a.id,role:a.role,sourceNode:null,worldFromLocal:null,positionWorldM:null})])),
        regions:M.regions.map(r=>bad(reason,{id:r.id,deckFrame:r.deckFrame})),bottom:{known:false,waterDepthM:null,clearanceM:null}}));
      const vessel=matrixFrame(f.worldFromVessel),decks={},helmAnchors={};
      for(const d of M.frames){const p=nodePose(f,d.sourceNode);decks[d.id]={...p,id:d.id,occupiedInterior:false};if(p.available)decks[d.id].vesselFromDeck=multiply(vessel.localFromWorld,p.worldFromLocal);}
      for(const a of M.helmAnchors)helmAnchors[a.id]=bad(a.reason,{id:a.id,role:a.role,sourceNode:null,worldFromLocal:null,positionWorldM:null});
      const regions=M.regions.map(r=>{const p=nodePose(f,r.sourceMesh);const reason=supportReason(f,r)||(!geom[r.id].available?geom[r.id].reason:!p.available?p.reason:!decks[r.deckFrame]?.available?'DECK_FRAME_UNAVAILABLE':null);return {id:r.id,deckFrame:r.deckFrame,sourceMesh:r.sourceMesh,available:!reason,reason,pointProbeOnly:true,triangleCount:geom[r.id].triangles?.length||0};});
      return freeze({available:true,reason:null,schemaVersion:SCHEMA,vesselId:ID,frameToken:token(f),instanceId:f.instanceId,activationEpoch:f.activationEpoch,frameId:f.frameId,simTimeSeconds:f.simTimeSeconds,
        mode:f.mode,conversion:f.conversion,depthM:f.depthM,vessel,decks,helmAttachmentAvailable:false,helmAnchors,regions,
        velocities:bad('NOT_PROVIDED_BY_HOST'),bottom:{known:f.bottom.known,waterDepthM:f.bottom.known?f.bottom.waterDepthM:null,clearanceM:f.bottom.known?f.bottom.clearanceM:null}});
    }
    function queryContact(f,request){
      const snap=sample(f);if(!snap.available)return bad(snap.reason,{frameToken:null});
      if(!request||request.expectedFrameToken!==snap.frameToken)return bad('STALE_OR_MISSING_FRAME_TOKEN',{frameToken:snap.frameToken});
      if(!vec(request.pointWorldM,3))return bad('PROBE_POINT_INVALID',{frameToken:snap.frameToken});
      const above=request.maxAboveM??0.25,below=request.maxPenetrationM??0.10;
      if(!finite(above)||!finite(below)||above<0||above>0.5||below<0||below>0.2)return bad('PROBE_BAND_INVALID',{frameToken:snap.frameToken});
      const selected=request.regionId?M.regions.filter(r=>r.id===request.regionId):M.regions;
      if(!selected.length)return bad('UNKNOWN_REGION',{frameToken:snap.frameToken});
      let best=null,eligible=false,inBounds=false;const denied=[];
      for(const r of selected){
        const status=snap.regions.find(x=>x.id===r.id);
        if(!status.available){denied.push(status.reason);continue;}
        eligible=true;const p=nodePose(f,r.sourceMesh),localPoint=transform(p.localFromWorld,request.pointWorldM);
        if(!insideXZ(localPoint,r.boundsXZ))continue;inBounds=true;
        for(const tri of geom[r.id].triangles){
          // Deck-local vertical ray, not nearest-plane projection: projections
          // can fall outside both faces at a curved-mesh ridge/seam.
          const a=tri.points[0],n=tri.normal;
          const q=[localPoint[0],a[1]-(n[0]*(localPoint[0]-a[0])+n[2]*(localPoint[2]-a[2]))/n[1],localPoint[2]];
          const d=dot(sub(localPoint,q),n);if(d>above||d< -below)continue;
          const b=barycentric(q,tri.points);if(!b)continue;
          const worldNormal=direction(p.worldFromLocal,tri.normal);
          if(worldNormal[1]<Math.cos(M.supportPolicy.maximumWorldSlopeRadians))continue;
          if(best&&Math.abs(d)>=Math.abs(best.signedDistanceM)-1e-12)continue;
          const worldPoint=transform(p.worldFromLocal,q),deck=snap.decks[r.deckFrame];
          best={available:true,reason:null,schemaVersion:SCHEMA,vesselId:ID,frameToken:snap.frameToken,regionId:r.id,deckFrame:r.deckFrame,sourceMesh:r.sourceMesh,sourceTriangleIndex:tri.index,
            pointWorldM:worldPoint,pointVesselM:transform(snap.vessel.localFromWorld,worldPoint),pointDeckM:transform(deck.localFromWorld,worldPoint),pointMeshLocalM:q,
            normalWorld:worldNormal,signedDistanceM:d,barycentric:b,pointProbeOnly:true,forcesApplied:false,medium:'air',bottom:snap.bottom};
        }
      }
      return freeze(best||bad(!eligible?(denied[0]||'CONTACTS_UNAVAILABLE'):!inBounds?'OUTSIDE_SUPPORTED_REGION':'NO_SURFACE_WITHIN_PROBE_BAND',{frameToken:snap.frameToken}));
    }
    function matchesCurrentFrame(frameToken,f){return validFrame(f)===null&&typeof frameToken==='string'&&frameToken===token(f);}
    return Object.freeze({sample,queryContact,matchesCurrentFrame,manifest:M});
  }
  // Duck-typed Three.js readers. They only copy already evaluated source data;
  // no updateMatrixWorld, pose evaluation, render, simulation or caching occurs.
  function sourceRegistry(model){const nodes=new Map(),duplicates=new Set();model?.traverse?.(o=>{if(!o.name)return;if(nodes.has(o.name))duplicates.add(o.name);else nodes.set(o.name,o);});return {nodes,duplicates};}
  function readSourceGeometry(model,manifest,sourceAssetSHA256){
    if(sourceAssetSHA256!==ASSET)throw new TypeError('Exact R7 asset identity required');
    const registry=sourceRegistry(model),output={};
    for(const r of manifest.regions){
      if(registry.duplicates.has(r.sourceMesh)){output[r.id]=bad('DUPLICATE_SOURCE_NODE');continue;}
      const mesh=registry.nodes.get(r.sourceMesh),p=mesh?.geometry?.attributes?.position,idx=mesh?.geometry?.index;
      if(!p){output[r.id]=bad('SOURCE_GEOMETRY_UNAVAILABLE');continue;}
      const triangles=[],count=idx?idx.count:p.count;
      if(count%3!==0){output[r.id]=bad('SOURCE_TOPOLOGY_UNSUPPORTED');continue;}
      for(let k=0;k<count;k+=3){
        const pts=[0,1,2].map(j=>{const i=idx?idx.getX(k+j):k+j;return [p.getX(i),p.getY(i),p.getZ(i)];});
        if(!pts.every(v=>vec(v,3)))throw new TypeError('Nonfinite source geometry');
        const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[2]),ys=pts.map(p=>p[1]),b=r.boundsXZ;
        if(Math.max(...xs)<b[0]||Math.min(...xs)>b[1]||Math.max(...zs)<b[2]||Math.min(...zs)>b[3]||Math.max(...ys)<r.heightRangeM[0]||Math.min(...ys)>r.heightRangeM[1])continue;
        const n=normal(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));if(!n||n[1]<r.normalLocalYMin)continue;
        triangles.push({index:k/3,points:pts});
      }
      output[r.id]={available:triangles.length>0,reason:triangles.length?null:'NO_REVIEWED_SOURCE_TRIANGLES',sourceNode:r.sourceMesh,sourceAssetSHA256,triangles};
    }
    return output;
  }
  function capturePose(model,vesselGroup,ownerFrame,manifest){
    const f={...ownerFrame,nodes:{},worldFromVessel:null};
    if(vesselGroup?.matrixWorld?.elements)f.worldFromVessel=Array.from(vesselGroup.matrixWorld.elements);
    const {nodes,duplicates}=sourceRegistry(model),names=new Set([...manifest.frames.map(r=>r.sourceNode),...manifest.regions.map(r=>r.sourceMesh)]);
    for(const name of names){const n=nodes.get(name);if(!n||duplicates.has(name))continue;let visible=true;for(let p=n;p;p=p.parent)if(p.visible===false)visible=false;
      f.nodes[name]={visible,worldFromLocal:n.matrixWorld?.elements?Array.from(n.matrixWorld.elements):null};}
    return f;
  }
  const API=Object.freeze({ID,SCHEMA,ASSET,createAdapter,readSourceGeometry,capturePose,math:Object.freeze({transform,direction,inverse,multiply,quaternion,rigid})});
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else G.AtlasDVesselContact=API;
})(typeof window!=='undefined'?window:globalThis);
