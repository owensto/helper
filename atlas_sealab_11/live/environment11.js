/* Coastal scenery: terrain comes from the same bathymetry as contact/depth.
   Instanced vegetation and rocks are decorative, not new invisible obstacles. */
(()=>{'use strict';function install(){if(!window.SEA10?.ready)return setTimeout(install,100);
const A=BAYPLAY,T=ATLASRuntime,S=A.state,W=Sea09World,mat=A.coast.water.material;
const report={ready:false,waveComponents:Sea11Waves.terms.length,terrainMatchesWorld:true,photogrammetry:false,trees:0,grass:0,rocks:0,shaderCompiled:false};
const clock={value:0},wind={value:0},sky={value:new T.Color('#adc7d0')};
// Upgrade water optics in-place, retaining terrain coverage and dry cockpit mask.
const prevCompile=mat.onBeforeCompile.bind(mat);mat.onBeforeCompile=sh=>{prevCompile(sh);sh.uniforms.time11=clock;sh.uniforms.sky11=sky;sh.uniforms.amp11={value:.12};sh.uniforms.shallow11={value:0};report.shaderCompiled=true;report.shader=sh;
sh.fragmentShader='uniform float time11;uniform vec3 sky11;uniform float amp11;uniform float shallow11;\n'+sh.fragmentShader;
const old=`vec3 eye09=normalize(cameraPosition-vDryWorld);
 vec3 surf09=normalize(cross(dFdx(vDryWorld),dFdy(vDryWorld)));
 float fresnel09=.025+.93*pow(1.-abs(dot(surf09,eye09)),5.);
 diffuseColor.rgb=mix(vec3(.13,.47,.43),vec3(.018,.18,.23),1.-exp(-depth09*.19));
 diffuseColor.a=clamp(1.-exp(-depth09*clarity09)*(1.-fresnel09),.10,.995);`;
if(!sh.fragmentShader.includes(old))throw Error('Water optics anchor changed');
sh.fragmentShader=sh.fragmentShader.replace(old,`vec3 eye09=normalize(cameraPosition-vDryWorld);
 vec3 surf09=normalize(cross(dFdx(vDryWorld),dFdy(vDryWorld)));if(surf09.y<0.)surf09=-surf09;
 float detail11=sin(vDryWorld.x*3.1+time11*2.2+sin(vDryWorld.z*.87))*sin(vDryWorld.z*4.4-time11*1.8);
 surf09=normalize(surf09+vec3(detail11*.035,0.,sin(vDryWorld.z*2.7+time11*1.9)*.035));
 float facing11=clamp(dot(surf09,eye09),0.,1.);
 float fresnel09=.0204+.9796*pow(1.-facing11,5.);
 float path11=depth09/max(.24,abs(eye09.y));
 float transmission11=exp(-path11*clarity09*.80);
 vec3 scatter11=mix(vec3(.10,.36,.29),vec3(.014,.095,.125),1.-exp(-depth09*.24));
 diffuseColor.rgb=mix(scatter11,sky11*.65,fresnel09*.65);
 diffuseColor.a=clamp(1.-transmission11*(1.-fresnel09),.07,.997);
 float grain11=.55+.45*sin(vDryWorld.x*5.7+sin(vDryWorld.z*6.2+time11))*sin(vDryWorld.z*8.1-time11*2.1);
 float shore11=known09*(1.-smoothstep(.08,.62,depth09))*smoothstep(0.,.075,depth09)*(.48+.52*sin(time11*1.25-vDryWorld.x*.23+vDryWorld.z*.17));
 float crest11=smoothstep(.22,.5,amp11)*smoothstep(amp11*.94,amp11*1.55,vBayWorld.y)*(1.-smoothstep(65.,190.,length(cameraPosition-vDryWorld)));
 float foam11=clamp((shore11*.70+crest11*.36)*grain11,0.,.75);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.81,.88,.82),foam11);diffuseColor.a=max(diffuseColor.a,foam11*.92);
 float hazard11=known09*(1.-smoothstep(.35,1.1,depth09))*shallow11;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.48,.12),hazard11*.27);`);
};mat.customProgramCacheKey=()=> 'atlas11-depth-optics';mat.roughness=.155;mat.metalness=.035;mat.envMapIntensity=.9;mat.normalScale.set(.27,.27);mat.needsUpdate=true;
// Hide only the original basin island surfaces and their simple lollipop trees.
for(const o of [...A.scene.children])if(/^Basin island /.test(o.name)||(o.isInstancedMesh&&o.count===22&&(o.material===A.coast.mats.green||o.material===A.coast.mats.wood))){o.visible=false;o.userData.replacedBy11=true;}
const basin11={value:S.location==='basin'?1:0},ground=SEA09_WATER.bed.material,priorGround=ground.onBeforeCompile.bind(ground);
const islandCoverage=W.islands.map(([x,z,r])=>`(abs(g09.x-(${x.toFixed(3)}))<${(r*2.15).toFixed(3)}&&abs(g09.z-(${z.toFixed(3)}))<${(r*2.15).toFixed(3)})`).join('||');
ground.onBeforeCompile=sh=>{priorGround(sh);sh.uniforms.basin11=basin11;sh.fragmentShader='uniform float basin11;\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n if(basin11>.5&&('+islandCoverage+'))discard;');};ground.customProgramCacheKey=()=> 'atlas11-island-ground-coverage';ground.needsUpdate=true;
const group=new T.Group();group.name='SEA11_COASTAL_SCENERY';A.scene.add(group);
let seed=11973;function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
function material(color,rough=.92){return new T.MeshStandardMaterial({color,roughness:rough});}
const clockHook=m=>{m.onBeforeCompile=sh=>{sh.uniforms.time11=clock;sh.uniforms.wind11=wind;sh.vertexShader='uniform float time11;uniform float wind11;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(time11*1.7+position.x*3.)*pow(max(0.,position.y),2.)*.065*wind11;');};};
const landMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.98});
landMaterial.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 land11;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','land11=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');sh.fragmentShader='varying vec3 land11;\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float grains11=fract(sin(dot(floor(land11.xz*19.),vec2(12.9898,78.233)))*43758.5453);
 float dune11=.5+.5*sin(land11.x*2.4+sin(land11.z*.58));
 diffuseColor.rgb*=.90+.06*grains11+.08*dune11;
 diffuseColor.rgb*=mix(.64,1.,smoothstep(-.05,1.,land11.y));`);};
// Bathymetry-coincident island meshes extend beyond the camera-following seabed.
for(const[ix,iz,r]of W.islands){const size=r*4.3,geo=new T.PlaneGeometry(size,size,112,112);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const x=ix+p.getX(i),z=iz+p.getZ(i),y=W.basinBed(x,z);p.setY(i,y);const blend=Math.max(0,Math.min(1,(y-.7)/2.2+Math.sin(x*.19)*Math.sin(z*.14)*.14));const color=new T.Color('#d4c398').lerp(new T.Color('#778452'),blend*blend*(3-2*blend));color.multiplyScalar(.91+.09*(.5+.5*Math.sin(x*.23)*Math.cos(z*.19)));c.set([color.r,color.g,color.b],i*3);}geo.setAttribute('color',new T.BufferAttribute(c,3));geo.computeVertexNormals();const m=new T.Mesh(geo,landMaterial);m.name='SEA11_CONTINUOUS_ISLAND';m.position.set(ix,0,iz);m.receiveShadow=true;group.add(m);}
const trunkMat=material('#655344'),leafMat=material('#ffffff'),rockMat=material('#888e7d');
const trunks=new T.InstancedMesh(new T.CylinderGeometry(.14,.24,1,7),trunkMat,90),leaves=new T.InstancedMesh(new T.SphereGeometry(1,7,5),leafMat,720),rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,1),rockMat,210);
const grassGeo=new T.PlaneGeometry(.16,1,1,3);grassGeo.translate(0,.5,0);
const gp=grassGeo.attributes.position;for(let i=0;i<gp.count;i++){const h=gp.getY(i);gp.setX(i,gp.getX(i)*(1.-h*.97)+h*h*.16);}grassGeo.computeVertexNormals();const grassMat=material('#7a8952');grassMat.side=T.DoubleSide;clockHook(grassMat);const grass=new T.InstancedMesh(grassGeo,grassMat,21600);
const dummy=new T.Object3D();let ti=0,li=0,ri=0,gi=0;
function put(mesh,i,x,y,z,sx,sy,sz,ry=0,rz=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,ry,rz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
for(const[ix,iz,r]of W.islands){for(let j=0;j<30;j++){const a=random()*Math.PI*2,rad=r*(.10+.48*Math.sqrt(random())),x=ix+Math.cos(a)*rad,z=iz+Math.sin(a)*rad,y=W.basinBed(x,z);if(y<1.6)continue;const h=3.7+random()*3.6;put(trunks,ti++,x,y+h/2,z,1,h,1,a,(random()-.5)*.18);for(let k=0;k<8;k++){const angle=k*2.399,radius=k===0?0:.7+random()*1.8;put(leaves,li++,x+Math.cos(angle)*radius,y+h-.5+random()*1.7,z+Math.sin(angle)*radius,1.1+random()*1.2,.85+random()*.85,1.1+random()*1.2,angle);leaves.setColorAt(li-1,new T.Color().setHSL(.22+random()*.07,.20+random()*.15,.16+random()*.10));}}
for(let j=0;j<70;j++){const a=random()*Math.PI*2,rad=r*(.63+.42*random()),x=ix+Math.cos(a)*rad,z=iz+Math.sin(a)*rad,y=W.basinBed(x,z);const scale=.32+random()*1.3;put(rocks,ri++,x,y+scale*.25,z,scale,scale*.55,scale*(.7+random()),a);}
for(let j=0;j<1200;j++){const a=random()*Math.PI*2,rad=r*(.4+.55*Math.sqrt(random())),x=ix+Math.cos(a)*rad,z=iz+Math.sin(a)*rad,y=W.basinBed(x,z);if(y<.25||y>3.5)continue;for(let k=0;k<6;k++){const gx=x+(random()-.5)*.65,gz=z+(random()-.5)*.65;put(grass,gi++,gx,W.basinBed(gx,gz),gz,.7+random()*.6,.24+random()*.56,1,random()*Math.PI,(random()-.5)*.42);}}}
trunks.count=ti;leaves.count=li;rocks.count=ri;grass.count=gi;for(const m of[trunks,leaves,rocks,grass]){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();group.add(m);}trunks.castShadow=leaves.castShadow=rocks.castShadow=true;report.trees=ti;report.grass=gi;report.rocks=ri;
// One weathered wooden shelter and a path: scenery sits on dry terrain, not water.
const wood=material('#9b8a6b'),roof=material('#50685e',.65);function box(x,y,z,w,h,d,m){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
const cx=-117,cz=94,cy=W.basinBed(cx,cz);box(cx,cy+.2,cz,8,.4,5,wood);for(const x of[-3.5,3.5])for(const z of[-2,2])box(cx+x,cy+1.65,cz+z,.17,3,.17,wood);const roofMesh=box(cx,cy+3.25,cz,8.7,.16,5.7,roof);roofMesh.rotation.z=.08;
// Reusable floating waypoint pin, only when the user explicitly sets a waypoint.
const pinGroup=new T.Group();pinGroup.name='SEA11_WAYPOINT';const pole=new T.Mesh(new T.CylinderGeometry(.028,.028,2.4,8),material('#eef1d6'));pole.position.y=1.2;const flag=new T.Mesh(new T.PlaneGeometry(1.2,.7),new T.MeshBasicMaterial({color:'#edc775',side:T.DoubleSide}));flag.position.set(.6,2.1,0);pinGroup.add(pole,flag);A.scene.add(pinGroup);
const original=SEA06.beforeRender.bind(SEA06);SEA06.beforeRender=()=>{original();for(const o of A.coast.original||[])if(o.userData.replacedBy11)o.visible=false;clock.value=S.elapsed;wind.value=Math.min(2,Math.hypot(...(BayMotion.PRESETS[S.environment]?.wind||[0,0]))/5);group.visible=S.location==='basin';basin11.value=group.visible?1:0;const sh=report.shader;if(sh){sh.uniforms.amp11.value=BayMotion.PRESETS[S.environment]?.amp||0;sh.uniforms.shallow11.value=window.SEA11?.options.shallowAssist?1:0;sky.value.set(SEA10.inspect().weather.current.cloud>.45?'#929fa8':'#afcbd6');}const point=CMD_INSTRUMENTS.waypoint;pinGroup.visible=!!point&&point.location===S.location;if(pinGroup.visible){pinGroup.position.set(point.x,BayMotion.surface(point.x,point.z,S.elapsed,S.environment)+(S.location==='beaufort'?S.config.tide:0),point.z);pinGroup.rotation.y=-S.heading;}};
report.ready=true;window.SEA11_ENV={ready:true,inspect:()=>({ready:report.ready,waveComponents:report.waveComponents,trees:ti,grass:gi,rocks:ri,shaderCompiled:report.shaderCompiled,terrainMatchesWorld:true,photogrammetry:false,overlappingBottomSuppressed:true,sceneryLocation:'Authored practice bay',waypointVisible:pinGroup.visible}),group};A.refresh();
}install();})();
