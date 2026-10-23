/* SUMARS / Kayley's baby-blue exploration pod. New authored 6.4 m visual concept.
   Not a pressure-hull or life-support design; no human rig or occupancy claim. */
(function(G){'use strict';
function makePod(T){
 const root=new T.Group();root.name='SUMARS_Kayley_Baby_Blue';
 const mat=(color,roughness=.34,metalness=.2)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const blue=mat('#9ed6ef',.25,.28),deep=mat('#4d809c',.33,.3),ivory=mat('#eee4d2',.67,.02),metal=mat('#b9c5cc',.19,.84),black=mat('#142e3c',.5,.2);
 const glass=new T.MeshPhysicalMaterial({color:'#9fd1df',roughness:.08,metalness:.08,transparent:true,opacity:.30,transmission:0,clearcoat:1,clearcoatRoughness:.08,side:T.DoubleSide,depthWrite:false});
 const lamp=new T.MeshStandardMaterial({color:'#effaff',emissive:'#a1e6ff',emissiveIntensity:2,roughness:.2});
 const add=(name,geo,m,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0],parent=root)=>{const o=new T.Mesh(geo,m);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=m!==glass;o.receiveShadow=true;parent.add(o);return o;};
 const sphere=(name,m,pos,scale)=>add(name,new T.SphereGeometry(1,48,28),m,pos,scale);
 sphere('Continuous_baby_blue_hull',blue,[-.15,-.32,0],[3.05,.96,1.33]);
 sphere('Lower_protective_keel',deep,[-.15,-.79,0],[2.8,.49,1.08]);
 add('Cabin_floor',new T.CylinderGeometry(1,1,.10,56),deep,[.35,.11,0],[1.86,1,1.16]);
 const dome=add('Panoramic_canopy',new T.SphereGeometry(1,64,36,0,Math.PI*2,0,Math.PI/2),glass,[.35,.18,0],[1.91,1.87,1.20]);dome.renderOrder=5;
 add('Canopy_seal',new T.TorusGeometry(1,.028,12,80),metal,[.35,.20,0],[1.91,1.20,1],[-Math.PI/2,0,0]);
 for(const z of [-.52,.52]){
  const seat=new T.Group();seat.name=z<0?'Left_ivory_seat':'Right_ivory_seat';seat.position.set(.10,.33,z);root.add(seat);
  add('Seat_cushion',new T.BoxGeometry(.70,.13,.50),ivory,[0,.06,0],[1,1,1],[0,0,0],seat);
  add('Seat_back',new T.BoxGeometry(.14,.68,.50),ivory,[-.33,.39,0],[1,1,1],[0,0,-.13],seat);
  add('Seat_base',new T.CylinderGeometry(.16,.22,.23,20),black,[0,-.12,0],[1,1,1],[0,0,0],seat);
 }
 add('Forward_console',new T.BoxGeometry(.23,.20,1.20),blue,[1.22,.65,0],[1,1,1],[0,0,.12]);
 const screen=mat('#102836',.13,.1);screen.emissive=new T.Color('#0b8eb3');screen.emissiveIntensity=.7;
 add('Cockpit_display',new T.BoxGeometry(.025,.12,.58),screen,[1.09,.70,0],[1,1,1],[0,0,.12]);
 const rotors=[];
 for(const z of [-1.52,1.52]){
  sphere('Blue_thruster_nacelle',blue,[-.85,-.32,z],[1.70,.38,.38]);
  add('Thruster_mount',new T.BoxGeometry(1.0,.16,.50),deep,[-.65,-.32,z*.76]);
  add('Silver_thruster_ring',new T.TorusGeometry(.29,.047,12,40),metal,[-2.34,-.32,z],[1,1,1],[0,Math.PI/2,0]);
  const rotor=new T.Group();rotor.name='Propulsor_'+z;rotor.position.set(-2.35,-.32,z);root.add(rotor);
  add('Propeller_hub',new T.SphereGeometry(.075,16,10),metal,[0,0,0],[1,1,1],[0,0,0],rotor);
  for(let i=0;i<4;i++){add('Blade',new T.BoxGeometry(.025,.22,.065),black,[0,Math.cos(i*Math.PI/2)*.13,Math.sin(i*Math.PI/2)*.13],[1,1,1],[i*Math.PI/2,0,0],rotor);}
  rotors.push(rotor);
  add('Rear_dive_fin',new T.BoxGeometry(.72,.055,.51),deep,[-2.18,-.27,z*.7]);
  sphere('Bow_lamp',lamp,[2.50,.08,z*.54],[.11,.10,.10]);
  const light=new T.SpotLight('#c4f1ff',25,30,.36,.55,1.8);light.position.set(2.55,.10,z*.54);light.target.position.set(12,-2,z*.54);root.add(light,light.target);
 }
 add('Tail_stabilizer',new T.BoxGeometry(.73,.69,.055),blue,[-2.48,.19,0],[1,1,1],[0,0,-.22]);
 for(const z of [-.65,.65])add('Landing_skid',new T.CapsuleGeometry(.075,3.15,8,16),metal,[-.35,-1.27,z],[1,1,1],[0,0,Math.PI/2]);
 if(typeof document!=='undefined'){
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const cx=cv.getContext('2d');cx.clearRect(0,0,1024,256);cx.fillStyle='#16364a';cx.font='600 125px sans-serif';cx.textAlign='center';cx.fillText('SUMARS',512,145);cx.font='38px sans-serif';cx.fillText('K A Y L E Y',512,211);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide});
  add('SUMARS_port_signature',new T.PlaneGeometry(1.65,.42),m,[.35,-.12,-1.285],[1,1,1],[0,Math.PI,0]);
  add('SUMARS_starboard_signature',new T.PlaneGeometry(1.65,.42),m,[.35,-.12,1.285]);
 }
 root.userData={newAuthoredConcept:true,primaryColor:'#9ed6ef',pressureQualified:false,rotors};return root;
}
G.AtlasSumarsPod={makePod};if(typeof module!=='undefined')module.exports={makePod};
})(typeof window!=='undefined'?window:globalThis);
