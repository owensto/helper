/* Original procedural surface detail and fictional deck equipment. No new downloads. */
(function(G){'use strict';
function surfaceData(size=128,kind='paint'){
 const color=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=((Math.imul(x+17,374761393)^Math.imul(y+23,668265263))>>>0)%4096/4095;
  const seam=kind==='paint'&&(x<2||y<2),streak=kind==='paint'&&x%31<2?Math.max(0,1-y/size)*.08:0;
  const grit=kind==='deck'?(n-.5)*.17:(n-.5)*.035;
  const shade=Math.max(.55,Math.min(1,.94+grit-(seam?.1:0)-streak));
  const i=(y*size+x)*4;
  color.set([shade*255,shade*255,Math.min(255,shade*257),255],i);
  const r=kind==='deck'?225+n*24:158+n*44;
  rough.set([r,r,r,255],i);const h=seam?85:kind==='deck'?100+n*55:125+n*8;height.set([h,h,h,255],i);
 }
 return {color,rough,height,size,kind};
}
function batchStatic(T,group){
 const buckets=new Map();group.updateMatrixWorld(true);
 for(const m of [...group.children]){if(!m.isMesh||m.isInstancedMesh||Array.isArray(m.material))continue;const list=buckets.get(m.material)||[];list.push(m);buckets.set(m.material,list);}
 for(const [material,meshes]of buckets){if(meshes.length<2)continue;const buffers={position:[],normal:[],uv:[]};
  for(const m of meshes){m.updateMatrix();const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);const count=g.attributes.position.count;
   for(const key of Object.keys(buffers)){const a=g.attributes[key];buffers[key].push(a?new Float32Array(a.array):new Float32Array(count*(key==='uv'?2:3)));}g.dispose();m.removeFromParent();m.geometry.dispose();}
  const g=new T.BufferGeometry();for(const [key,arrays]of Object.entries(buffers)){const data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let n=0;for(const a of arrays){data.set(a,n);n+=a.length;}g.setAttribute(key,new T.BufferAttribute(data,key==='uv'?2:3));}
  g.computeBoundingSphere();const m=new T.Mesh(g,material);m.name='Batched visual detail';m.castShadow=m.receiveShadow=true;group.add(m);
 }
}
function install(T,{root,scene,renderer}){
 const ownedGeo=new Set(),ownedMat=new Set(),textures=new Set(),restores=[];let updated=false,disposed=false;
 function tex(data,size,srgb=false){const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);t.needsUpdate=true;textures.add(t);return t;}
 const sets={};for(const kind of ['paint','deck']){const d=surfaceData(256,kind);sets[kind]={map:tex(d.color,d.size,true),roughnessMap:tex(d.rough,d.size),bumpMap:tex(d.height,d.size)};}
 let surfaced=0;
 root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material))return;
  const old=o.material,kind=/darkdeck/.test(old.name||'')?'deck':/naval|silver|white/.test(old.name||'')?'paint':null;
  if(!kind)return;
  const oldGeo=o.geometry,geo=oldGeo.clone(),p=geo.attributes.position,n=geo.attributes.normal,uv=new Float32Array(p.count*2),colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n?.getX(i)||0),ny=Math.abs(n?.getY(i)||0),nz=Math.abs(n?.getZ(i)||0);
   if(kind==='deck'||ny>.82){uv[i*2]=x/4;uv[i*2+1]=z/4;}else if(nx>nz){uv[i*2]=z/4;uv[i*2+1]=y/3;}else{uv[i*2]=x/6;uv[i*2+1]=y/3;}
   const hull=/Hull/.test(o.name),wet=hull?Math.exp(-Math.pow((y+.1)/.38,2)):0;
   colors[i*3]=1-wet*.18;colors[i*3+1]=1-wet*.12;colors[i*3+2]=1-wet*.15;
  }
  geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setAttribute('color',new T.BufferAttribute(colors,3));
  const m=old.clone();Object.assign(m,sets[kind]);m.vertexColors=true;m.roughness=kind==='deck'?.94:.72;m.metalness=kind==='deck'?.02:.16;m.bumpScale=kind==='deck'?.018:.009;m.envMapIntensity=.75;m.needsUpdate=true;
  o.geometry=geo;o.material=m;ownedGeo.add(geo);ownedMat.add(m);restores.push(()=>{o.geometry=oldGeo;o.material=old;});surfaced++;
 });
 root.updateMatrixWorld(true);const sources=[];root.traverse(o=>{if(o.isMesh&&/EX_Superstructure__naval/.test(o.name))sources.push(o);});const ray=new T.Raycaster();
 const group=new T.Group();group.name='ATLAS_DETAIL_EQUIPMENT';root.add(group);
 const paint=new T.MeshStandardMaterial({color:0x667780,metalness:.3,roughness:.58,...sets.paint}),rubber=new T.MeshStandardMaterial({color:0x18262c,roughness:.92}),steel=new T.MeshStandardMaterial({color:0x9faeb3,metalness:.75,roughness:.3});[paint,rubber,steel].forEach(m=>ownedMat.add(m));
 function box(name,size,pos,mat=paint){const g=new T.BoxGeometry(...size),m=new T.Mesh(g,mat);m.name=name;m.position.set(...pos);m.castShadow=m.receiveShadow=true;group.add(m);ownedGeo.add(g);return m;}
 // Layered service doors and louvres on the outer deckhouse surfaces; visual only.
 for(const side of [-1,1])for(const x of [-21,-12,0,12,24]){
  ray.set(new T.Vector3(x,8.05,side*20),new T.Vector3(0,0,-side));const hit=ray.intersectObjects(sources,false)[0];if(!hit)continue;const z=hit.point.z+side*.035;box('Recessed service panel',[1.1,1.9,.06],[x,8.05,z],rubber);box('Painted service door',[1,1.8,.055],[x,8.05,z+side*.04]);
  box('Door handle',[.09,.28,.09],[x+.34,8.05,z+side*.1],steel);
  for(let k=0;k<5;k++)box('Louvre blade',[.72,.055,.09],[x,8.37+k*.12,z+side*.09],rubber);
 }
 // Instanced fasteners on added panels: one draw call rather than one per bolt.
 const boltGeo=new T.SphereGeometry(.035,5,4);ownedGeo.add(boltGeo);const bolts=new T.InstancedMesh(boltGeo,steel,80),dummy=new T.Object3D();let bi=0;
 for(const side of [-1,1])for(const x of [-21,-12,0,12,24]){ray.set(new T.Vector3(x,8.05,side*20),new T.Vector3(0,0,-side));const hit=ray.intersectObjects(sources,false)[0];if(!hit)continue;for(const dx of [-.45,.45])for(const dy of [-.83,-.25,.25,.83]){dummy.position.set(x+dx,8.05+dy,hit.point.z+side*.14);dummy.updateMatrix();bolts.setMatrixAt(bi++,dummy.matrix);}}bolts.count=bi;bolts.name='Instanced panel fasteners';group.add(bolts);
 // Navigation light housings and visible lens, not additional dynamic light sources.
 for(const [z,c]of [[-7.83,0xc6362b],[7.83,0x36996c]]){box('Navigation lamp base',[.48,.28,.34],[18.3,12,z],rubber);const m=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.4,roughness:.25});ownedMat.add(m);box('Navigation light lens',[.26,.18,.24],[18.32,12.14,z],m);}
 batchStatic(T,group);group.traverse(o=>{if(o.geometry)ownedGeo.add(o.geometry);});
 function decorateWake(wake){
  const p=wake.geometry.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=i%2;uv[i*2+1]=Math.floor(i/2)/30;}
  wake.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const edge=Math.pow(Math.max(0,Math.sin(Math.PI*x/(size-1))),.8),n=(Math.sin(x*.27+y*.19)*Math.cos(y*.31-x*.11)+1)/2,a=edge*(.25+.75*n);const i=(y*size+x)*4;data.set([255,a*255,255,255],i);}
  wake.material.alphaMap=tex(data,size);wake.material.opacity=.34;wake.material.needsUpdate=true;
 }
 return {decorateWake,update(s){if(disposed)return;updated=true;group.visible=true;},inspect:()=>({surfacedMeshes:surfaced,detailMeshes:group.children.length,textures:textures.size,updated,disposed}),dispose(){if(disposed)return;disposed=true;restores.forEach(f=>f());group.removeFromParent();ownedGeo.forEach(g=>g.dispose());ownedMat.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
function decorateBattery(T,b){
 const group=new T.Group();group.name='GUN_VISUAL_DETAIL';b.turret.add(group);
 const steel=new T.MeshStandardMaterial({color:0x394e5a,metalness:.48,roughness:.5}),light=new T.MeshStandardMaterial({color:0x92a5ac,metalness:.65,roughness:.32}),dark=new T.MeshStandardMaterial({color:0x1e2b32,roughness:.88});
 function mesh(g,m,p){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 // Sloped side armor cheeks soften the previous plain box silhouette.
 for(const side of [-1,1]){
  const o=mesh(new T.BoxGeometry(5.8,2.8,.28),steel,[-.4,2.1,side*3.03]);o.rotation.x=side*.12;
  mesh(new T.BoxGeometry(2.3,1.15,.08),dark,[-1.2,1.7,side*3.23]);
  for(let k=0;k<8;k++)mesh(new T.BoxGeometry(1.85,.045,.10),light,[-1.2,1.28+k*.12,side*3.28]);
  const pipe=mesh(new T.CylinderGeometry(.11,.11,2.6,8),light,[1.5,1.7,side*2.82]);pipe.rotation.z=.32;
 }
 const ring=mesh(new T.TorusGeometry(3.72,.045,6,48),light,[0,.62,0]);ring.rotation.x=Math.PI/2;
 const geom=new T.CylinderGeometry(.065,.065,.08,6),bolts=new T.InstancedMesh(geom,light,32),d=new T.Object3D();for(let i=0;i<32;i++){const a=i/32*Math.PI*2;d.position.set(Math.cos(a)*3.45,.63,dummy=0);}
 for(const slide of b.barrels)for(const x of [2.9,4.2,8.4]){const m=new T.Mesh(new T.CylinderGeometry(.51,.51,.17,20),steel);m.rotation.z=-Math.PI/2;m.position.x=x;slide.add(m);}
 batchStatic(T,group);return group;
}
function seatBase(T,root,battery){
 root.updateMatrixWorld(true);const decks=[];root.traverse(o=>{if(o.isMesh&&/^EX_Deck__/.test(o.name))decks.push(o);});
 if(!decks.length)return false;
 const local=battery.root.position.clone(),origin=root.localToWorld(new T.Vector3(local.x,35,local.z)),dir=new T.Vector3(0,-1,0).transformDirection(root.matrixWorld);
 const ray=new T.Raycaster(origin,dir),hit=ray.intersectObjects(decks,false)[0];if(!hit)return false;
 const p=root.worldToLocal(hit.point.clone());battery.root.position.y=p.y+.045*battery.root.scale.y;
 battery.root.userData.deckAttachment={source:hit.object.name,triangle:hit.faceIndex,point:p.toArray(),visualContactOnly:true};return true;
}
G.AtlasDetail={install,surfaceData,decorateBattery,batchStatic,seatBase};if(typeof module!=='undefined')module.exports=G.AtlasDetail;
})(globalThis);
