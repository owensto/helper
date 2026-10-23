/* Original bottlenose-shaped skinned geometry. Not a stock sphere/capsule stand-in.
 * Reference anatomy: NOAA Fisheries + NPS. Positions and skin weights in metres.
 * This is authored game wildlife, not a biological or population model. */
(function(G,f){if(typeof module==='object')module.exports=f;else G.AtlasDolphin=f;})(globalThis,function(T){'use strict';
const profile=[[-1.38,.038,.055,-.01],[-1.18,.065,.07,-.01],[-.95,.12,.105,0],[-.65,.21,.185,.01],[-.3,.285,.255,.025],[0,.32,.28,.04],[.35,.30,.265,.05],[.65,.265,.225,.07],[.84,.225,.20,.065],[.98,.145,.155,.015],[1.08,.070,.10,-.08],[1.33,.061,.077,-.09],[1.48,.018,.025,-.08]];
function interp(x,k){let i=0;while(i<profile.length-2&&x>profile[i+1][0])i++;const a=profile[Math.max(0,i-1)],b=profile[i],c=profile[i+1],d=profile[Math.min(profile.length-1,i+2)],u=(x-b[0])/(c[0]-b[0]),m1=(c[k]-a[k])/(c[0]-a[0])*(c[0]-b[0]),m2=(d[k]-b[k])/(d[0]-b[0])*(c[0]-b[0]);return (2*u**3-3*u*u+1)*b[k]+(u**3-2*u*u+u)*m1+(-2*u**3+3*u*u)*c[k]+(u**3-u*u)*m2;}
const stations=[.70,.10,-.50,-1.02,-1.38];
function geometry(){const p=[],co=[],idx=[],si=[],sw=[];
 function v(x,y,z,shade=null){const n=p.length/3;p.push(x,y,z);const q=shade??Math.max(0,Math.min(1,(y+.30)/.58));const variation=.012*Math.sin(x*7.1+z*5.8),col=new T.Color();col.setRGB(.72-.42*q+variation,.75-.40*q+variation,.74-.34*q+variation,T.SRGBColorSpace);co.push(col.r,col.g,col.b);
  let a=0,b=0,w=0;if(x<stations[0]){a=stations.length-1;b=a;for(let i=0;i<stations.length-1;i++)if(x<=stations[i]&&x>=stations[i+1]){a=i;b=i+1;w=(stations[i]-x)/(stations[i]-stations[i+1]);break;}}
  si.push(a,b,0,0);sw.push(1-w,w,0,0);return n;}
 function tube(rows,count,point){const start=p.length/3;rows.forEach((row,i)=>{for(let j=0;j<=count;j++)v(...point(row,2*Math.PI*j/count,i));});for(let i=0;i<rows.length-1;i++)for(let j=0;j<count;j++){const a=start+i*(count+1)+j,b=a+1,c=a+count+1,d=c+1;idx.push(a,b,c,b,d,c);}
 for(const end of[0,rows.length-1]){const points=Array.from({length:count},(_,j)=>point(rows[end],2*Math.PI*j/count,end)),center=[0,1,2].map(k=>points.reduce((a,p)=>a+p[k],0)/count),ci=v(...center,points[0][3]),base=start+end*(count+1);for(let j=0;j<count;j++)end===0?idx.push(ci,base+j+1,base+j):idx.push(ci,base+j,base+j+1);}
 return start;}
 tube(Array.from({length:65},(_,i)=>-1.38+i*(2.86/64)),28,(x,t)=>[x,interp(x,3)+Math.max(.004,interp(x,1))*Math.cos(t),Math.max(.004,interp(x,2))*Math.sin(t)]);
 // Dorsal: swept, tapered, curved foil rather than a triangular billboard.
 const dorsal=[[.24,.20,-.43,.052],[.31,.17,-.30,.044],[.39,.105,-.225,.034],[.47,.015,-.21,.026],[.54,-.09,-.24,.018],[.60,-.20,-.29,.010],[.64,-.31,-.33,.002]];
 tube(dorsal,16,(r,t)=>[(r[1]+r[2])/2+(r[1]-r[2])/2*Math.cos(t),r[0],r[3]*Math.sin(t),.85]);
 for(const side of[-1,1]){
  const pec=[[.23,.50,.12,-.11,.035],[.34,.40,.03,-.19,.026],[.48,.22,-.10,-.29,.017],[.59,.00,-.18,-.36,.009],[.63,-.16,-.18,-.38,.002]];
  tube(pec,16,(r,t)=>[(r[1]+r[2])/2+(r[1]-r[2])/2*Math.cos(t),r[3]+r[4]*Math.sin(t)*side,r[0]*side,.65]);
  const fluke=[[0,-1.20,-1.39,.030],[.10,-1.12,-1.52,.035],[.24,-1.15,-1.57,.024],[.36,-1.29,-1.55,.013],[.43,-1.48,-1.50,.002]];
  tube(fluke,16,(r,t)=>[(r[1]+r[2])/2+(r[1]-r[2])/2*Math.cos(t),r[3]*Math.sin(t)*side-.012,r[0]*side,.60]);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(co,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function create(){const group=new T.Group();group.name='H4_BOTTLENOSE_DOLPHIN';const g=geometry(),mat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.32,metalness:0,clearcoat:.18,clearcoatRoughness:.35,side:T.DoubleSide});const body=new T.SkinnedMesh(g,mat);body.name='Anatomical skinned bottlenose';const bones=stations.map(()=>new T.Bone());for(let i=0;i<bones.length;i++){bones[i].name='spine'+i;bones[i].position.x=i===0?stations[i]:stations[i]-stations[i-1];if(i)bones[i-1].add(bones[i]);}body.add(bones[0]);body.bind(new T.Skeleton(bones));body.frustumCulled=false;body.castShadow=true;group.add(body);
 const dark=new T.MeshStandardMaterial({color:0x182329,roughness:.30});for(const side of[-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.0155,12,8),dark);eye.position.set(.835,.06,.189*side);group.add(eye);
  const line=new T.CatmullRomCurve3([new T.Vector3(1.46,-.081,.018*side),new T.Vector3(1.28,-.11,.071*side),new T.Vector3(1.06,-.115,.095*side),new T.Vector3(.94,-.088,.135*side),new T.Vector3(.81,-.060,.181*side)]);const mouth=new T.Mesh(new T.TubeGeometry(line,20,.0025,4,false),dark);group.add(mouth);}
 const blow=new T.Mesh(new T.SphereGeometry(.035,16,8),dark);blow.scale.set(.62,.15,1);blow.position.set(.56,.332,0);group.add(blow);
 function pose(t,speed=2.4){bones[0].rotation.z=0;for(let i=1;i<bones.length;i++)bones[i].rotation.z=(.018+i*.028)*Math.sin(t-i*.52)*Math.min(1.4,.6+speed*.16);body.skeleton.update();}
 function dispose(){const geometries=new Set(),materials=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());body.skeleton.dispose();group.removeFromParent();}
 return {group,body,bones,pose,dispose,inspect:()=>({vertices:g.attributes.position.count,triangles:g.index.count/3,bones:bones.length,length:2.86,originalGeometry:true,photorealismVerified:false})};
}
return {create,geometry};});
