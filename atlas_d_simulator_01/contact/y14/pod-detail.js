/* Additive visual detailing of Kayley's concept, not pressure engineering or certified hardware. */
(function(G){'use strict';
function detail(T,root){
 const m=(c,r=.4,metal=0)=>new T.MeshPhysicalMaterial({color:c,roughness:r,metalness:metal,clearcoat:metal?0:.55});
 const trim=m('#3a5260',.35,.4),steel=m('#c0c9cc',.22,.95),blue=m('#78bee2',.25,0),dark=m('#102a36',.65,0),ivory=m('#d4c9b7',.8,0);
 const grp=new T.Group();grp.name='SUMARS_Y13_VisualHardware';root.add(grp);
 function add(name,g,mat,pos,rot=[0,0,0],scale=[1,1,1]){const o=new T.Mesh(g,mat);o.name=name;o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;grp.add(o);return o;}
 const outer=add('Elastomer_canopy_gasket',new T.TorusGeometry(1,.038,12,96),dark,[.35,.205,0],[-Math.PI/2,0,0],[1.92,1.21,1]);
 add('Machined_canopy_flange',new T.TorusGeometry(1,.027,10,96),steel,[.35,.16,0],[-Math.PI/2,0,0],[1.97,1.26,1]);
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;add('Canopy_fastener_'+i,new T.CylinderGeometry(.017,.017,.016,6),steel,[.35+1.96*Math.cos(a),.19,1.25*Math.sin(a)]);}
 for(const z of [-1.52,1.52]){
  add('Thruster_duct_'+z,new T.CylinderGeometry(.33,.31,.19,36,1,true),blue,[-2.34,-.32,z],[0,0,Math.PI/2]);
  add('Thruster_duct_inner_'+z,new T.TorusGeometry(.292,.017,8,36),dark,[-2.45,-.32,z],[0,Math.PI/2,0]);
  for(let a=0;a<Math.PI;a+=Math.PI/3)add('Propulsor_guard',new T.BoxGeometry(.022,.56,.012),steel,[-2.47,-.32,z],[a,0,0]);
 }
 for(const x of [-1.35,.8])for(const z of [-.65,.65]){
  add('Skid_attachment_strut',new T.CylinderGeometry(.042,.042,.45,12),steel,[x,-1.04,z]);
  add('Skid_mount_plate',new T.BoxGeometry(.24,.035,.20),trim,[x,-.83,z]);
 }
 for(const z of [-.52,.52]){
  add('Seat_headrest',new T.BoxGeometry(.14,.18,.36),ivory,[-.24,1.18,z],[0,0,-.1]);
  for(const side of [-1,1])add('Seat_armrest',new T.CapsuleGeometry(.035,.42,5,10),dark,[.08,.66,z+side*.28],[0,0,Math.PI/2]);
 }
 add('Emergency_release_visual',new T.CylinderGeometry(.047,.047,.018,20),m('#bc4b35',.5),[.73,.78,.40],[0,0,Math.PI/2]);
 const lamps=[];root.traverse(o=>{if(o.isSpotLight){o.userData.nominalIntensity=o.intensity;lamps.push(o);}if(o.isMesh&&/Bow_lamp/.test(o.name))o.material.emissiveIntensity=.35;});
 root.userData.lightControls=lamps;root.userData.visualHardwareCount=grp.children.length;root.userData.pressureQualified=false;return root;
}
const API={detail};G.AtlasPodDetail13=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
