/* CORE Bay physical surfaces: clipped triangles from the pinned render asset, not rig joints. */
(function(G){'use strict';
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const fail=m=>{throw Error(m);};
function clip(poly,axis,sign,limit){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=limit-sign*a[axis],db=limit-sign*b[axis];if(da>=-1e-12)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
function rigid(T,a){if(!Array.isArray(a)||a.length!==16||!a.every(Number.isFinite))fail('NONFINITE_MATRIX');const m=new T.Matrix4().fromArray(a),e=m.elements;for(let i=0;i<3;i++)for(let j=0;j<3;j++){let dot=0;for(let k=0;k<3;k++)dot+=e[i*4+k]*e[j*4+k];if(Math.abs(dot-(i===j?1:0))>1e-6)fail('NONRIGID_MATRIX');}if(Math.abs(m.determinant()-1)>1e-6||Math.abs(e[3])+Math.abs(e[7])+Math.abs(e[11])+Math.abs(e[15]-1)>1e-8)fail('NONRIGID_MATRIX');return m;}
function bind(T,A,spec){
 const records=[],V=a=>new T.Vector3().fromArray(a),root=A.boat;
 for(const c of spec.contacts){
  const matches=[];A.model.traverse(n=>{if(n.name===c.source.runtimeName)matches.push(n);});if(matches.length!==1||!matches[0].isMesh)fail('SOURCE_NODE_UNAVAILABLE:'+c.id);
  const node=matches[0],geo=node.geometry,pos=geo.getAttribute('position'),ix=geo.getIndex(),version=pos.version,indexVersion=ix?.version;
  if(!ix||!pos||pos.itemSize!==3)fail('SOURCE_GEOMETRY_UNAVAILABLE');
  const parent=node.parent,localMatrix=node.matrix.clone(),m=rigid(T,c.contactToSource),inv=m.clone().invert(),normal=new T.Vector3().setFromMatrixColumn(m,1),vertices=[],triangles=[],witnesses=new Map(),indexWitnesses=new Map(),ancestry=[];for(let n=node;n&&n!==A.model;n=n.parent)ancestry.push([n,n.parent]);
  const read=i=>new T.Vector3().fromBufferAttribute(pos,ix.getX(i));
  const seed=[0,1,2].map(k=>read(c.source.seedTriangle*3+k));const center=new T.Vector3();seed.forEach((p,i)=>center.addScaledVector(p,c.source.seedBarycentric[i]));if(center.distanceTo(new T.Vector3().setFromMatrixPosition(m))>1e-7)fail('SOURCE_SEED_MISMATCH:'+c.id);
  for(let face=0;face<ix.count/3;face++){
   const tri=[0,1,2].map(k=>read(face*3+k));const n=new T.Triangle(...tri).getNormal(new T.Vector3());if(n.dot(normal)<c.finitePatch.minNormalDot)continue;
   let poly=tri.map(p=>p.clone().applyMatrix4(inv).toArray());const [x,z]=c.finitePatch.halfExtentsM,y=c.finitePatch.maxNormalDistanceM;
   for(const [axis,half] of [[0,x],[1,y],[2,z]])for(const sign of [-1,1]){if(poly.length)poly=clip(poly,axis,sign,half);}
   if(poly.length<3)continue;
   const src=poly.map(p=>V(p).applyMatrix4(m));let contributed=false;
   for(let k=1;k<src.length-1;k++){const t=new T.Triangle(src[0].clone(),src[k].clone(),src[k+1].clone());if(t.getArea()<1e-12)continue;triangles.push({triangle:t,face});vertices.push(...t.a.toArray(),...t.b.toArray(),...t.c.toArray());contributed=true;}
   if(contributed)for(let k=0;k<3;k++){const slot=face*3+k,i=ix.getX(slot);indexWitnesses.set(slot,i);witnesses.set(i,new T.Vector3().fromBufferAttribute(pos,i).toArray());}
  }
  if(!triangles.length)fail('EMPTY_PHYSICAL_PATCH:'+c.id);
  records.push({c,node,parent,localMatrix,geo,pos,ix,version,indexVersion,m,inv,normal,triangles,vertices,witnesses,indexWitnesses,ancestry,overlay:null});
 }
 function validate(r){if(r.node.parent!==r.parent||r.node.geometry!==r.geo||r.geo.getAttribute('position')!==r.pos||r.geo.getIndex()!==r.ix||r.pos.version!==r.version||r.ix.version!==r.indexVersion)fail('SOURCE_GEOMETRY_CHANGED');
  for(const [slot,i]of r.indexWitnesses)if(r.ix.getX(slot)!==i)fail('SOURCE_INDEX_CHANGED');for(const [node,parent]of r.ancestry)if(node.parent!==parent)fail('SOURCE_HIERARCHY_CHANGED');
  for(const [i,p]of r.witnesses)for(let k=0;k<3;k++)if(r.pos.getComponent(i,k)!==p[k])fail('SOURCE_VERTEX_CHANGED');
  let n=r.node;while(n&&n!==A.model){if(n.visible===false)fail('SOURCE_SURFACE_HIDDEN');n=n.parent;}if(n!==A.model)fail('SOURCE_HIERARCHY_CHANGED');
  if(r.node.matrix.elements.some((v,i)=>Math.abs(v-r.localMatrix.elements[i])>1e-9))fail('SOURCE_LOCAL_FRAME_CHANGED');
 }
 function sample(){const out={};root.updateWorldMatrix(true,false);const rootInv=rigid(T,root.matrixWorld.toArray()).invert();for(const r of records){validate(r);r.node.updateWorldMatrix(true,false);const world=rigid(T,r.node.matrixWorld.toArray()).multiply(r.m),vessel=rootInv.clone().multiply(world);out[r.c.id]={available:true,id:r.c.id,source:{...r.c.source},contactToVessel:vessel.toArray(),contactToWorld:world.toArray(),worldToContact:world.clone().invert().toArray(),normalWorld:new T.Vector3().setFromMatrixColumn(world,1).toArray(),tangentWorld:new T.Vector3().setFromMatrixColumn(world,0).toArray(),pointWorld:new T.Vector3().setFromMatrixPosition(world).toArray(),finitePatch:r.c.finitePatch,triangles:r.triangles.length};}return freeze(out);}
 function query(id,worldPoint){const r=records.find(r=>r.c.id===id);if(!r)fail('UNKNOWN_CONTACT');validate(r);r.node.updateWorldMatrix(true,false);const p=V(worldPoint).applyMatrix4(r.node.matrixWorld.clone().invert()),q=new T.Vector3();let best=null;for(const {triangle,face} of r.triangles){triangle.closestPointToPoint(p,q);const d=q.distanceTo(p);if(!best||d<best.distanceM)best={distanceM:d,sourceTriangle:face,pointSource:q.toArray(),signedNormalM:p.clone().sub(q).dot(triangle.getNormal(new T.Vector3()))};}return freeze(best);}
 function queryRay(id,worldPoint){const r=records.find(r=>r.c.id===id);if(!r||!Array.isArray(worldPoint)||worldPoint.length!==3||!worldPoint.every(Number.isFinite))fail('INVALID_CONTACT_PROBE');validate(r);r.node.updateWorldMatrix(true,false);const p=V(worldPoint).applyMatrix4(r.node.matrixWorld.clone().invert()),ray=new T.Ray(p.clone().addScaledVector(r.normal,.05),r.normal.clone().negate()),hit=new T.Vector3();let best=null;for(const {triangle,face}of r.triangles){if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit)){const d=ray.origin.distanceTo(hit);if(d<=.1&&(!best||d<best.rayDistanceM))best={rayDistanceM:d,signedNormalM:d-.05,sourceTriangle:face,pointSource:hit.toArray()};}}const local=p.clone().applyMatrix4(r.inv),[hx,hz]=r.c.finitePatch.halfExtentsM;return freeze({available:!!best,...best,edgeMarginM:Math.min(hx-Math.abs(local.x),hz-Math.abs(local.z)),probeContact:local.toArray()});}
 function show(value){for(const r of records){if(value&&!r.overlay){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(r.vertices,3));g.computeVertexNormals();const mat=new T.MeshBasicMaterial({color:r.c.kind==='cushion'?0x70d5b4:r.c.kind==='wheel-grip'?0xe5ae61:0x80bfe9,side:T.DoubleSide,transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});r.overlay=new T.Mesh(g,mat);r.overlay.name='C2_PHYSICAL_'+r.c.id;r.node.add(r.overlay);}if(r.overlay)r.overlay.visible=!!value;}}
 function dispose(){for(const r of records)if(r.overlay){r.overlay.removeFromParent();r.overlay.geometry.dispose();r.overlay.material.dispose();r.overlay=null;}}
 return Object.freeze({sample,query,queryRay,show,dispose,audit:()=>freeze(records.map(r=>({id:r.c.id,sourceNode:r.c.source.nodeIndex,sourceTriangles:[...new Set(r.triangles.map(t=>t.face))],clippedTriangles:r.triangles.length,areaM2:r.triangles.reduce((a,t)=>a+t.triangle.getArea(),0),witnessVertices:r.witnesses.size}))) });
}
const api=Object.freeze({bind,rigid,freeze,clip});G.CoreBayContactC2=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
