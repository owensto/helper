/* Reproduces the R8 diagnostic bug using the actual pinned host Three runtime. */
'use strict';const assert=require('assert/strict'),path=require('path');global.window=global;require(path.join(__dirname,'../../../live/runtime.js'));const T=ATLASRuntime;
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0],3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0],4));g.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0],4));
const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial()),bone=new T.Bone(),group=new T.Group();mesh.add(bone);group.add(mesh);group.updateMatrixWorld(true);mesh.bind(new T.Skeleton([bone]));group.position.set(-1.6,1.06,.18);group.updateWorldMatrix(true,true);
const p=new T.Vector3();mesh.applyBoneTransform(0,p);mesh.localToWorld(p);const stale=p.toArray();assert(p.distanceTo(group.position)>.5);
group.updateWorldMatrix(true,false);group.updateMatrixWorld(true);p.set(0,0,0);mesh.applyBoneTransform(0,p);mesh.localToWorld(p);assert(p.distanceTo(group.position)<1e-10);
console.log(JSON.stringify({passed:true,test:'virtual SkinnedMesh matrix refresh',staleWorld:stale,correctWorld:p.toArray(),scope:'actual host Three.js one-bone diagnostic, not human skin acceptance'},null,2));
