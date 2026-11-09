'use strict';
/* Real bundled Three.js geometry + new scene adapter; in-memory asset fetch, NO browser or GPU. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const site=path.resolve(process.argv[2]),results=[];let disposeEvents=0,colliders=null;
const W={console,performance,crypto:crypto.webcrypto,AbortController,Blob,Response,DecompressionStream,setTimeout,clearTimeout,setInterval,clearInterval,Uint8Array,Int8Array,Int16Array,Float32Array,ArrayBuffer,Map,Set};W.window=W;W.globalThis=W;const handlers={};W.addEventListener=(k,f)=>{handlers[k]=f;};
W.fetch=async url=>{const p=path.resolve(site,url);assert(p.startsWith(site+path.sep));return new Response(fs.readFileSync(p));};
vm.createContext(W);for(const n of ['runtime.js','cruise/stream-core.js','cruise/coast-stream.js'])vm.runInContext(fs.readFileSync(path.join(site,n),'utf8'),W,{filename:n});
const T=W.ATLASRuntime,root=new T.Group(),base={status:{}},report={},state={location:'beaufort',x:0,z:0,vx:0,vz:0,elapsed:0,config:{tide:1.317}};
W.Sea14Physics={installColliders(x){colliders=x;}};W.SEA14_COAST={meta:null};W.SEA14={options:{graphics:'auto'},visualFocus:()=>null};W.SEA10={inspect:()=>({weather:{current:{wind:[2,3],rain:0}}})};
const clock={value:0},tide={value:0},wind={value:0},wet={value:0};
const materials=[];W.AtlasCruiseCoast.bind({T,base,material:()=>{const m=new T.MeshStandardMaterial({vertexColors:true});materials.push(m);return m;},report,clock,tide,wind,wet});
(async()=>{try{
 const manifest=await base.load({state},root);assert.equal(colliders.length,2921);assert.equal(manifest.counts.piers,19);assert.equal(report.ready,true);assert(root.children.length>=3);results.push({name:'Foundation and nearest detail create real Three.js meshes; all physical colliders registered',passed:true,groups:root.children.length});
 let vertices=0;root.updateMatrixWorld(true);root.traverse(m=>{if(m.isMesh){m.geometry.addEventListener('dispose',()=>disposeEvents++);const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,c=m.geometry.attributes.color;assert.equal(p.count,n.count);assert.equal(p.count,c.count);assert(Number.isFinite(m.geometry.boundingSphere.radius));const b=new T.Box3().setFromObject(m);assert(Number.isFinite(b.min.x));vertices+=p.count;}});results.push({name:'Actual quantized position/normal/color attributes and transformed bounds remain finite',passed:true,vertices});
 base.update({state},root);let docks=[];root.traverse(m=>{if(m.userData.coast14?.kind==='dockFloat')docks.push(m);});assert(docks.length>0);const y=docks[0].position.y;state.config.tide+=.5;base.update({state},root);assert(Math.abs(docks[0].position.y-y-.5)<1e-9);assert.equal(colliders.length,2921);results.push({name:'Tide moves floating dock meshes without changing collider membership',passed:true});
 const original={x:state.x,z:state.z};W.SEA14.visualFocus=()=>({x:510,z:-40});base.update({state},root);assert.deepEqual({x:state.x,z:state.z},original);results.push({name:'Scenic-camera focus does not relocate the vessel',passed:true});
 W.ATLAS_CRUISE_STREAM.dispose();assert.equal(root.children.length,0);assert(disposeEvents>0);assert.equal(colliders.length,2921);results.push({name:'Scene disposal releases geometry without deleting physical obstacles',passed:true,disposedObserved:disposeEvents});
 console.log(JSON.stringify({passed:true,scope:'Bundled Three.js CPU objects and exact geometry, with file-backed in-memory IO. No WebGL/browser or rendering certification.',tests:results},null,2));
}catch(e){W.ATLAS_CRUISE_STREAM?.dispose();console.log(JSON.stringify({passed:false,error:e.stack,tests:results},null,2));process.exitCode=1;}})();
