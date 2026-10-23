/* SUMARS Y13: baby-blue 6.4m visual concept, detailed acrylic canopy/bolted collar,
 * mounted bucket seats/controls, guarded thrusters. Not a pressure-vessel design. */
(function(G){'use strict';function makePod(T){
 const root=new T.Group();root.name='SUMARS_Kayley_Baby_Blue_Y13';
 function material(name,color,roughness=.35,metalness=0,extra={}){const m=new T.MeshPhysicalMaterial({color,roughness,metalness,...extra});m.name=name;return m;}
 const blue=material('Baby_blue_paint','#8ecae5',.24,.035,{clearcoat:.85,clearcoatRoughness:.12}),lower=material('Lower_hull','#274c61',.40,.05),ivory=material('Ivory_seat_fabric','#d8cdb9',.78,0),trim=material('Brushed_titanium','#9baeb8',.28,.88),rubber=material('Black_rubber','#122a35',.83,0),dash=material('Console_graphite','#183a4a',.37,.08);
 const glass=material('Canopy_glass','#b2cbd5',.06,0,{transmission:.88,thickness:.025,ior:1.49,clearcoat:1,transparent:false,opacity:1,side:T.DoubleSide});
 const light=material('Lamp_lens','#d8efff',.13,.1,{emissive:'#a5dbed',emissiveIntensity:1.2});
 function rounded(w,h,d,r){const g=new T.BoxGeometry(1,1,1,6,6,6),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<a.count;i++){const p=new T.Vector3(a.getX(i)*w,a.getY(i)*h,a.getZ(i)*d),core=new T.Vector3(Math.max(-w/2+r,Math.min(w/2-r,p.x)),Math.max(-h/2+r,Math.min(h/2-r,p.y)),Math.max(-d/2+r,Math.min(d/2-r,p.z))),normal=p.clone().sub(core).normalize();p.copy(core).addScaledVector(normal,r);a.setXYZ(i,p.x,p.y,p.z);n.setXYZ(i,normal.x,normal.y,normal.z);}return g;}
 function add(name,g,m,pos=[0,0,0],sc=[1,1,1],rot=[0,0,0],parent=root){const o=new T.Mesh(g,m);o.name=name;o.position.set(...pos);o.scale.set(...sc);o.rotation.set(...rot);o.castShadow=m!==glass;o.receiveShadow=true;parent.add(o);return o;}
 const box=(name,m,p,size,r=.04,rot=[0,0,0],parent=root)=>add(name,rounded(...size,r),m,p,[1,1,1],rot,parent);
 const sphere=(name,m,p,s)=>add(name,new T.SphereGeometry(1,64,32),m,p,s);
 function pipe(name,points,r,m,parent=root,closed=false){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)),closed);return add(name,new T.TubeGeometry(curve,Math.max(20,points.length*4),r,8,closed),m,[0,0,0],[1,1,1],[0,0,0],parent);}
 sphere('Continuous_baby_blue_hull',blue,[-.15,-.32,0],[3.05,.96,1.33]);sphere('Lower_protective_keel',lower,[-.15,-.81,0],[2.78,.47,1.07]);
 // Double flange and elastomer seal show where the canopy actually joins the hull.
 for(const [y,r,material] of [[.11,.065,trim],[.18,.032,rubber],[.23,.028,trim]])add('Canopy_collar',new T.TorusGeometry(1,r,12,96),material,[.35,y,0],[1.91,1.20,1],[-Math.PI/2,0,0]);
 for(let i=0;i<36;i++){const a=i*Math.PI*2/36;add('Collar_fastener_'+i,new T.CylinderGeometry(.018,.018,.028,6),trim,[.35+1.91*Math.cos(a),.26,1.20*Math.sin(a)]);}
 add('Panoramic_acrylic_canopy',new T.SphereGeometry(1,80,48,0,Math.PI*2,0,Math.PI/2),glass,[.35,.20,0],[1.88,1.84,1.17]);
 const arch=[];for(let i=0;i<=24;i++){const a=i*Math.PI/24;arch.push([-.53,.20+1.54*Math.sin(a),1.04*Math.cos(a)]);}pipe('Rear_canopy_safety_arch',arch,.027,trim);
 box('Cabin_floor',lower,[.3,.18,0],[3.35,.10,1.85],.04);
 const seats=[];
 for(const z of [-.49,.49]){const seat=new T.Group();seat.name=z<0?'Port_bucket_seat':'Starboard_bucket_seat';seat.position.set(-.02,.37,z);root.add(seat);seats.push(seat);
 add('Seat_pedestal',new T.CylinderGeometry(.16,.23,.28,24),trim,[-.07,-.13,0],[1,1,1],[0,0,0],seat);
 box('Cushion',ivory,[.01,.03,0],[.71,.19,.48],.085,[0,0,.035],seat);box('Seat_back',ivory,[-.34,.43,0],[.18,.81,.49],.075,[0,0,-.17],seat);box('Head_rest',ivory,[-.42,.85,0],[.17,.25,.30],.07,[0,0,-.17],seat);
 for(const side of [-1,1]){box('Side_bolster',ivory,[-.17,.30,side*.24],[.46,.19,.10],.045,[0,0,-.12],seat);box('Arm_rest',dash,[.04,.28,side*.29],[.48,.09,.085],.035,[0,0,0],seat);}
 box('Foot_support',rubber,[.64,-.13,0],[.40,.08,.38],.035,[0,0,-.12],seat);
 // Seams are raised narrow piping, not painted floating rectangles.
 pipe('Cushion_piping',[[-.22,.135,-.18],[.25,.135,-.18],[.29,.135,.18],[-.22,.135,.18]],.004,lower,seat,true);
 }
 box('Sculpted_forward_console',blue,[1.24,.64,0],[.38,.27,1.20],.08,[0,0,.12]);
 box('Display_bezel',rubber,[1.035,.71,0],[.038,.21,.57],.018,[0,0,.12]);
 let display=null,texture=null;
 if(typeof document!=='undefined'){display=document.createElement('canvas');display.width=512;display.height=192;texture=new T.CanvasTexture(display);texture.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:texture});add('Actual_owner_display',new T.PlaneGeometry(.52,.18),m,[1.01,.715,0],[1,1,1],[0,-Math.PI/2,0]);}
 for(const z of [-.43,.43]){add('Joystick_boot',new T.CylinderGeometry(.05,.075,.09,20),rubber,[.91,.64,z]);add('Joystick_grip',new T.CapsuleGeometry(.028,.13,6,12),dash,[.91,.73,z],[1,1,1],[0,0,-.18]);pipe('Grab_handle',[[1.34,.74,z],[1.28,.88,z],[1.06,.91,z]],.018,trim);}
 const rotors=[];
 for(const z of [-1.52,1.52]){
 sphere('Thruster_nacelle',blue,[-.85,-.32,z],[1.70,.38,.38]);box('Nacelle_mount',lower,[-.65,-.32,z*.76],[1.0,.15,.50],.06);
 for(const x of [-2.34,-2.20])add('Thruster_guard_ring',new T.TorusGeometry(.29,.040,12,48),trim,[x,-.32,z],[1,1,1],[0,Math.PI/2,0]);
 const rotor=new T.Group();rotor.name='SUMARS_Propulsor_'+z;rotor.position.set(-2.27,-.32,z);root.add(rotor);rotors.push(rotor);
 add('Prop_hub',new T.SphereGeometry(.075,16,10),trim,[0,0,0],[1,1,1],[0,0,0],rotor);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box('Prop_blade',trim,[0,.135*Math.cos(a),.135*Math.sin(a)],[.035,.23,.068],.018,[a,.20,0],rotor);}
 for(let i=0;i<6;i++){const a=i*Math.PI/3;pipe('Guard_spoke',[[-2.36,-.32+.06*Math.cos(a),z+.06*Math.sin(a)],[-2.36,-.32+.29*Math.cos(a),z+.29*Math.sin(a)]],.009,rubber);}
 box('Hydroplane',lower,[-2.10,-.27,z*.70],[.80,.055,.50],.025);sphere('Bow_lamp_housing',trim,[2.47,.08,z*.54],[.13,.13,.13]);sphere('Bow_lamp_lens',light,[2.55,.09,z*.54],[.055,.10,.10]);
 const spot=new T.SpotLight('#c5efff',14,40,.38,.65,1.8);spot.position.set(2.59,.10,z*.54);spot.target.position.set(16,-3,z*.54);root.add(spot,spot.target);
 }
 box('Vertical_tail',blue,[-2.47,.20,0],[.70,.68,.065],.025,[0,0,-.20]);
 for(const z of [-.65,.65]){add('Landing_skid',new T.CapsuleGeometry(.065,3.15,8,16),trim,[-.35,-1.27,z],[1,1,1],[0,0,Math.PI/2]);for(const x of [-1.35,.7])pipe('Skid_leg',[[x,-.75,z],[x,-1.25,z]],.035,trim);}
 for(const x of [-1.7,-1.25,-.8])for(const z of [-1.10,1.10])box('Service_vent',rubber,[x,.12,z],[.22,.022,.05],.009,[0,0,0]);
 if(typeof document!=='undefined'){const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const c=cv.getContext('2d');c.fillStyle='#123b51';c.textAlign='center';c.font='600 118px sans-serif';c.fillText('SUMARS',512,145);c.font='32px sans-serif';c.fillText('K A Y L E Y   /   E X P L O R E',512,205);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:T.DoubleSide});add('SUMARS_starboard_signature',new T.PlaneGeometry(1.60,.40),m,[.38,-.12,1.30]);add('SUMARS_port_signature',new T.PlaneGeometry(1.60,.40),m,[.38,-.12,-1.30],[1,1,1],[0,Math.PI,0]);}
 let stamp=-1;
 root.userData={newAuthoredConcept:true,primaryColor:'#8ecae5',pressureQualified:false,rotors,refined:true,updateDisplay(s){if(!display||Math.floor(s.elapsed*4)===stamp)return;stamp=Math.floor(s.elapsed*4);const c=display.getContext('2d');c.fillStyle='#0b2331';c.fillRect(0,0,512,192);c.fillStyle='#b4edff';c.font='22px monospace';c.fillText('SUMARS  /  LIVE NAVIGATION',22,36);c.font='50px monospace';c.fillText((Math.abs(s.speedMps)/.514444).toFixed(1)+' kn',22,104);c.fillText(s.depthM.toFixed(1)+' m',275,104);c.font='20px monospace';c.fillText('RUDDER '+Math.round(s.rudderAngleRad*180/Math.PI)+'°',22,161);c.fillText(s.paused?'PAUSED':'OWNER LIVE',290,161);texture.needsUpdate=true;}};
 return root;
}
G.AtlasSumarsPod={makePod};if(typeof module!=='undefined')module.exports={makePod};
})(typeof window!=='undefined'?window:globalThis);
