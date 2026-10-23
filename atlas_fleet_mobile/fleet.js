/* Fleet entry: existing ATLAS-W artwork, no combat, crew, or shared-physics capability. */
(()=>{'use strict';
const query=new URL(location.href).searchParams.get('vessel');
const id=query===null||query==='yacht'?'yacht':query==='warship'?'warship':null;
if(!id)throw Error('UNKNOWN_VESSEL');
const warship=id==='warship';
const config=Object.freeze({id,name:warship?'ATLAS-W':'ATLAS 83',
  label:warship?'Surface warship':'Motor yacht',wakeX:warship?-62.5:-41,
  poses:warship?{exterior:[[-100,57,132],[0,10,0]],bridge:[[18,13.2,7.0],[105,13.2,7.0]],stern:[[-84,23,42],[-48,7,0]],foredeck:[[53,12,-5],[10,15,0]],top:[[0,196,.1],[0,7,0]]}:null,
  portraitExterior:warship?[-181,110,270]:null});
let provenance=null;
function hex(a){return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function buildModel(T){
 if(!warship)return buildAtlas83(T);
 const metaResponse=await fetch('warship-asset.json');if(!metaResponse.ok)throw Error('Warship asset record unavailable');
 provenance=await metaResponse.json();
 if(provenance.gitBlob!=='826f70bfaae812538aca710ab9f10a09fae70a24'||provenance.bytes!==6244704)throw Error('Unexpected warship source');
 const response=await fetch('assets/ATLAS_W.glb');if(!response.ok)throw Error('Warship model unavailable');
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength!==provenance.bytes||hex(await crypto.subtle.digest('SHA-256',buffer))!==provenance.sha256)throw Error('Warship integrity check failed');
 const gltf=await new T.GLTFLoader().parseAsync(buffer,new URL('assets/',location.href).href);
 const root=gltf.scene;root.name='ATLAS_W_FLEET';root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
 if(size.x<124||size.x>140||size.z<17||size.z>35||box.min.y>0||box.max.y<20)throw Error('Unexpected warship units or axes');
 let meshes=0,triangles=0;const screws=[];
 root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;o.castShadow=true;o.receiveShadow=true;}if(o.name.startsWith('MOV_Screw_'))screws.push({o,rest:o.quaternion.clone(),angle:0});});
 const rudders=[];root.traverse(o=>{if(o.isMesh&&/^Rudder(?:_|$)/i.test(o.name)){o.geometry.computeBoundingBox();const c=o.geometry.boundingBox.getCenter(new T.Vector3());rudders.push({o,position:o.position.clone(),rotation:o.quaternion.clone(),center:c});}});
 root.userData={identity:'atlas-w-original-surface-v1',vesselId:'atlas-w',sourceSHA:provenance.sourceSHA,sourcePath:provenance.sourcePath,sourceAssetSHA256:provenance.sha256,sourceGitBlob:provenance.gitBlob,units:'metres',axes:'+X forward, +Y up, +Z starboard',bounds:{min:box.min.toArray(),max:box.max.toArray()},meshes,triangles,submersible:false,combat:false,humanContact:false};
 return {root,update(s,dt){for(let i=0;i<screws.length;i++){const q=screws[i];q.angle+=(s.engine?s.gear*(.8+(i?s.starboard:s.port)*5):0)*dt;q.o.quaternion.copy(q.rest).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),q.angle));}for(const q of rudders){const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-s.rudder);q.o.quaternion.copy(q.rotation).multiply(turn);q.o.position.copy(q.position).add(q.center).sub(q.center.clone().applyQuaternion(turn));}}};
}
function mount(){
 document.title=config.name+' — Mobile Fleet';document.body.dataset.vessel=id;
 const button=document.querySelector('.brand');button.textContent=config.name+' ▾';button.setAttribute('aria-label','Choose vessel; current '+config.name);
 document.querySelector('#scene').setAttribute('aria-label',config.name+' in fictional open water');document.querySelector('#helm').setAttribute('aria-label',config.name+' controls');
 const chooser=document.getElementById('fleet-dialog');button.onclick=e=>{e.preventDefault();document.getElementById('pause').textContent==='Pause'&&document.getElementById('pause').click();chooser.showModal();};
 document.getElementById('fleet-close').onclick=()=>chooser.close();
 document.querySelectorAll('[data-vessel]').forEach(a=>{a.setAttribute('aria-current',a.dataset.vessel===id?'page':'false');});
 if(warship){document.querySelector('[data-camera="bridge"]').innerHTML='<span>02</span> Bridge wing';document.querySelector('[data-camera="stern"]').innerHTML='<span>03</span> Flight deck';document.querySelector('#settings details').innerHTML='<summary>About ATLAS-W</summary><p>Your original 125-metre surface-warship visual concept, including its hangar, aft flight deck, workboat and integrated mast. Artwork is unchanged; no weapons operation or submarine mode.</p><p>This first sailing integration uses its own disclosed, authored twin-screw handling and conservative vessel-specific footprint. It is not real-warship performance, a damage model, full-body clearance or navigation guidance.</p><p>Bridge wing is an external camera, not a new bridge interior. Walkable interiors, original handling animations, crew and multiplayer are not integrated.</p><a href="README.md" target="_blank" rel="noopener">Source and assumptions</a>';}
}
window.AtlasFleet={config,buildModel,mount,dynamics:()=>warship?AtlasW:Atlas83,source:()=>provenance};
})();
