/* Original procedural art. Three is loaded only after the /play/ shell is usable. */
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const waveGLSL=`uniform float waveStrength;float wave(vec2 p,float t){return waveStrength*(sin(p.x*.58+t*.85)*.13+sin(p.y*.42-t*.65)*.17+sin(p.x*1.8+p.y*1.3+t*1.2)*.035+sin(p.x*5.8-p.y*4.3+t*1.7)*.012);}`;
const waterVertex=`uniform float time; varying vec3 pos; ${waveGLSL}
void main(){vec3 p=position;p.z+=wave(vec2(p.x,-p.y),time);vec4 world=modelMatrix*vec4(p,1.);pos=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
const waterFragment=`precision highp float;
uniform float time;uniform vec3 deep;uniform vec3 shallow;uniform vec3 skyColor;uniform vec3 sunDir;uniform float night;uniform float underwater;uniform float shoreWidth;uniform float riverFlow;uniform float flats;uniform sampler2D waveNormal;uniform sampler2D reflectionMap;uniform mat4 reflectionMatrix;uniform float reflectionReady;
varying vec3 pos;${waveGLSL}
void main(){
 vec2 p=pos.xz;float a=wave(p,time);vec2 flow=vec2(.08,-1.)*time*riverFlow*.42;
 vec3 ripple=texture2D(waveNormal,(p+flow)*.085+vec2(time*.009,-time*.006)).xyz*2.-1.;
 vec3 ripple2=texture2D(waveNormal,(p+flow)*.19+vec2(-time*.008,time*.012)).xyz*2.-1.;
 vec3 n=normalize(vec3((ripple.x+ripple2.x*.45)*.19*waveStrength,1.,(ripple.y+ripple2.y*.45)*.19*waveStrength));
 vec3 v=normalize(cameraPosition-pos);float fresnel=.035+.92*pow(1.-max(dot(n,v),0.),4.);
 float bank=shoreWidth+sin(p.y*.105)*1.5+sin(p.y*.27)*.6;
 float shore=bank-abs(p.x);float depth=clamp(shore*(flats>.5?.025:.12),.02,1.);
 vec3 base=mix(shallow,deep,depth)*mix(1.,.22,night);
 // Refraction tint and caustics remain inexpensive, with no depth readback.
 vec2 refract=p+n.xz*.7;
 float lace=pow(.5+.5*sin(refract.x*4.8+sin(refract.y*4.+time)*1.4),14.)*pow(.5+.5*cos(refract.y*4.5-time*.6+sin(refract.x*4.)),8.);
 base+=shallow*lace*(.12+flats*.18)*(1.-depth);
 vec3 r=reflect(-v,n);vec3 reflection=mix(skyColor,vec3(.35,.48,.44),pow(1.-abs(r.y),5.));
 vec4 rc=reflectionMatrix*vec4(pos,1.);vec2 uv=rc.xy/rc.w*.5+.5+n.xz*.012;
 reflection=mix(reflection,texture2D(reflectionMap,clamp(uv,.002,.998)).rgb,reflectionReady*.75);
 float glint=pow(max(dot(reflect(-sunDir,n),v),0.),110.);
 float sparkle=pow(max(dot(normalize(sunDir+v),n),0.),460.);
 vec3 color=mix(base,reflection,fresnel*.88)+mix(vec3(1.,.69,.3),vec3(.5,.7,1.),night)*(glint*.85+sparkle*.75)*(1.-night*.8);
 float foam=(1.-smoothstep(.05,1.15,abs(shore-.25+a*.8)))*(.4+.6*pow(.5+.5*sin(p.y*13.+time*1.7+sin(p.x*9.)),3.));
 color=mix(color,vec3(.83,.91,.76)*mix(1.,.25,night),foam*.17);
 float fog=1.-exp(-length(cameraPosition-pos)*.007);color=mix(color,skyColor,fog*.55);
 gl_FragColor=vec4(color,underwater>.5?.2:.91);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const skyFragment=`varying vec3 p;uniform vec3 top;uniform vec3 bottom;
float hash(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float cloudNoise(vec2 v){return noise(v)*.55+noise(v*2.03)*.27+noise(v*4.11)*.12+noise(v*8.23)*.06;}
void main(){vec3 d=normalize(p);float h=clamp(d.y*1.6,0.,1.);vec3 color=mix(bottom,top,pow(h,.65));
 vec2 q=d.xz/max(.12,d.y+.24)*2.4;float clouds=cloudNoise(q+vec2(4.,7.));float coverage=smoothstep(.49,.7,clouds)*smoothstep(.01,.14,d.y)*(1.-smoothstep(.6,.95,d.y));
 vec3 cloudColor=mix(bottom*.8,vec3(.9,.9,.85),smoothstep(.5,.75,clouds));color=mix(color,cloudColor,coverage*.7);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
const floorVertex=`varying vec2 uvp;varying float distanceToCamera;void main(){uvp=position.xy;vec4 mv=modelViewMatrix*vec4(position,1.);distanceToCamera=length(mv.xyz);gl_Position=projectionMatrix*mv;}`;
const floorFragment=`varying vec2 uvp;varying float distanceToCamera;uniform float time;uniform float underwater;uniform vec3 color;
void main(){vec2 p=uvp;float a=sin(p.x*2.+sin(p.y*2.+time*.6));float b=cos(p.y*2.7+sin(p.x*2.4-time*.7));float c=pow(1.-abs(a+b)*.5,18.);vec3 sand=color+vec3(.12,.22,.17)*c;float fog=1.-exp(-distanceToCamera*(underwater>.5?.06:.02));gl_FragColor=vec4(mix(sand,vec3(.045,.2,.18),fog),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function mat(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.83,flatShading:false,...extra});}
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
function fin(points,color){
 const edge=new T.CatmullRomCurve3(points.map(p=>V(...p)),true,'centripetal').getPoints(28),center=points.reduce((a,p)=>a.add(V(...p)),V()).multiplyScalar(1/points.length),triangles=[];for(let i=0;i<edge.length-1;i++)triangles.push(...center.toArray(),...edge[i].toArray(),...edge[i+1].toArray());const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(triangles,3));g.computeVertexNormals();
 const m=new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.39,metalness:.12});m.onBeforeCompile=s=>{s.vertexShader='varying vec3 finPoint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfinPoint=position;');s.fragmentShader='varying vec3 finPoint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat ray=pow(.5+.5*sin(atan(finPoint.y,finPoint.x+.05)*72.),18.);diffuseColor.rgb*=.76+ray*.24;');};m.customProgramCacheKey=()=> 'fin-rays';return new T.Mesh(g,m);
}
// Alpha cards retain individual needles and leaves at phone resolution.
function foliageTexture(kind,seed=17){
 const rng=window.CastwardGame.random(seed),c=document.createElement('canvas');c.width=512;c.height=kind==='pine'?768:512;const x=c.getContext('2d'),w=c.width,h=c.height;
 const stroke=(ax,ay,bx,by,color,width)=>{x.strokeStyle=color;x.lineWidth=width;x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();};
 const leaf=(px,py,r,a,tint)=>{x.fillStyle=tint;x.beginPath();x.ellipse(px,py,r,r*.38,a,0,Math.PI*2);x.fill();};
 if(kind==='pine'){
  stroke(256,760,256,18,'#68604c',7);
  for(let row=0;row<38;row++){const y=12+row*18,reach=Math.min(205,(2+row*5.8)*(.72+rng()*.38));for(const side of [-1,1]){const end=256+side*reach*(.62+rng()*.38),ey=y+8+rng()*32;stroke(256,y,end,ey,'#626451',3);for(let j=0;j<30;j++){const t=j/30,px=256+(end-256)*t,py=y+(ey-y)*t;const twig=(5+16*(1-t))*(.6+rng()*.5)*Math.min(1,(row+1)/8);for(let k=0;k<5;k++){const q=k/5;stroke(px+side*twig*q,py-14*q,px+side*(twig*q+(3+rng()*7)*Math.min(1,(row+1)/6)),py-14*q-2-rng()*6,['#56664b','#758363','#899176','#3d503b'][Math.floor(rng()*4)],1.5);stroke(px-side*3,py+3,px+side*(twig*.8),py+12,'#5f7252',1.3);}}}}
 }else if(kind==='broadleaf'||kind==='mangrove'){
  // Irregular branches with overlapping clusters; no geometric crown outline.
  for(let b=0;b<18;b++){const a=b*2.399,r=50+rng()*160,cx=256+Math.cos(a)*r,cy=240+Math.sin(a)*r*.8;stroke(256,500,cx,cy,'#6d6955',3+rng()*5);for(let i=0;i<95;i++){const angle=rng()*6.28,d=Math.sqrt(rng())*(40+rng()*30);leaf(cx+Math.cos(angle)*d,cy+Math.sin(angle)*d,5+rng()*10,rng()*6.28,['#667a49','#7b8957','#3f583b','#52683f','#929b67'][Math.floor(rng()*5)]);}}
 }else if(kind==='palm'){
  x.strokeStyle='#a9a779';x.lineWidth=4;x.beginPath();x.moveTo(25,270);x.bezierCurveTo(160,100,340,110,490,330);x.stroke();
  for(let i=0;i<75;i++){const t=i/75,px=25+465*t,py=270-490*t+550*t*t;for(const side of [-1,1]){const length=Math.sin(t*Math.PI)**.65*110;const ex=px+length*.55,ey=py+side*length; x.fillStyle=['#82905b','#596e43','#9b9f68'][i%3];x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+length*.27,py+side*length*.5,ex,ey);x.quadraticCurveTo(px+length*.1,py+side*length*.48,px-3,py+2);x.fill();}}
 }else if(kind==='moss'){
  for(let i=0;i<100;i++){let px=60+rng()*390,py=rng()*90;const end=160+rng()*340; x.strokeStyle=['#8a9582','#a4aa92','#6f806b'][i%3];x.lineWidth=1+rng()*2;x.beginPath();x.moveTo(px,py);while(py<end){py+=7;px+=Math.sin(py*.07+i)*3;x.lineTo(px,py);}x.stroke();}
 }else{
  for(let i=0;i<(kind==='reed'?28:90);i++){const px=30+rng()*450,top=30+rng()*330,lean=(rng()-.5)*130; x.fillStyle=['#8b9460','#68774a','#b0a77a','#526746'][i%4];x.beginPath();x.moveTo(px,512);x.quadraticCurveTo(px+lean*.2,top+100,px+lean,top);x.quadraticCurveTo(px+lean*.3+5,top+120,px+5,512);x.fill();if(kind==='reed'&&i%3===0){stroke(px+lean,top+25,px+lean*.95,top-8,'#5e5036',6);}}
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function foliageMaterial(kind,wind,color='#c1c5ae'){
 const material=mat(color,{map:foliageTexture(kind),alphaTest:.38,side:T.DoubleSide,roughness:1,emissive:'#626b4e',emissiveIntensity:.14});
 material.onBeforeCompile=s=>{s.uniforms.windTime=wind;s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float phase=0.;
  #ifdef USE_INSTANCING
  phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.3;
  #endif
  transformed.x+=sin(windTime*1.25+phase+position.y*2.)*pow(max(uv.y,0.),2.)*.035;
  transformed.z+=sin(windTime*.8+phase)*uv.y*.018;`);};material.customProgramCacheKey=()=> 'foliage-wind';return material;
}
function rockGeometry(seed){
 const g=new T.IcosahedronGeometry(1,2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+Math.sin(x*5+seed)*Math.sin(z*4-seed)*.17+Math.cos(y*7+x*3+seed)*.1;p.setXYZ(i,x*n,y*n*.8,z*n);}
 g.computeVertexNormals();return g;
}
function rockMaterial(ice){
 const m=mat(ice?'#a7b4b5':'#8a8471',{roughness:.92});m.onBeforeCompile=s=>{s.vertexShader='varying vec3 stoneWorld;varying vec3 stoneNormal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 rockPoint=vec4(transformed,1.);vec3 rockNormal=normal;
 #ifdef USE_INSTANCING
 rockPoint=instanceMatrix*rockPoint;rockNormal=mat3(instanceMatrix)*rockNormal;
 #endif
 stoneWorld=(modelMatrix*rockPoint).xyz;stoneNormal=normalize(mat3(modelMatrix)*rockNormal);`);s.fragmentShader='varying vec3 stoneWorld;varying vec3 stoneNormal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float mineral=sin(stoneWorld.x*17.+sin(stoneWorld.z*25.))*sin(stoneWorld.y*29.+stoneWorld.z*12.);
 diffuseColor.rgb*=.86+mineral*.16;
 float wet=1.-smoothstep(.02,.48,stoneWorld.y);diffuseColor.rgb*=1.-wet*.44;
 ${ice?'':'float moss=smoothstep(.45,.85,stoneNormal.y)*smoothstep(.3,.8,stoneWorld.y)*(.5+.5*sin(stoneWorld.x*5.+stoneWorld.z*7.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.23,.09),moss*.65);'}`);};m.customProgramCacheKey=()=> 'shore-stone-'+ice;return m;
}
function iceGeometry(radius,height){
 const g=new T.CylinderGeometry(radius,radius,height,96),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),n=1+Math.sin(a*13)*.018+Math.cos(a*29)*.009+Math.sin(a*43)*.005;p.setXYZ(i,x*n,p.getY(i),z*n);}g.computeVertexNormals();return g;
}
function iceTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),rng=window.CastwardGame.random(71);x.fillStyle='#d5dfdc';x.fillRect(0,0,512,512);
 for(let i=0;i<1200;i++){x.fillStyle=`rgba(255,255,245,${rng()*.16})`;x.fillRect(rng()*512,rng()*512,2+rng()*10,1+rng()*4);}
 for(let i=0;i<16;i++){let px=rng()*512,py=rng()*512;x.beginPath();x.moveTo(px,py);for(let j=0;j<7;j++){px+=(rng()-.5)*36;py+=10+rng()*16;x.lineTo(px,py);}x.strokeStyle='#8daba677';x.lineWidth=.5+rng()*.6;x.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,4);return t;
}
function terrainTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),pixels=x.createImageData(256,256),rng=window.CastwardGame.random(29);
 for(let y=0;y<256;y++)for(let z=0;z<256;z++){const i=(y*256+z)*4,v=205+Math.sin(z*.24+Math.sin(y*.18)*3)*Math.cos(y*.32)*12+Math.sin(z*.93-y*.77)*7+rng()*24;pixels.data.set([v,v,v,255],i);}x.putImageData(pixels,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(9,18);t.anisotropy=4;return t;
}
function grainTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d'),rng=window.CastwardGame.random(41);x.fillStyle='#a69a7f';x.fillRect(0,0,256,128);for(let i=0;i<950;i++){const y=rng()*128;x.strokeStyle=`rgba(${rng()>.5?'49,43,30':'220,211,184'},${.03+rng()*.16})`;x.lineWidth=.4+rng();x.beginPath();x.moveTo(0,y);for(let q=0;q<=256;q+=16)x.lineTo(q,y+Math.sin(q*.03+i)*2);x.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}

function fishTexture(s){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d'),rng=window.CastwardGame.random(window.CastwardGame.seed(s.id));
 const shade=x.createLinearGradient(0,0,0,256);shade.addColorStop(0,'#7b8279');shade.addColorStop(.43,'#e6e7da');shade.addColorStop(.64,'#f2eee0');shade.addColorStop(1,'#fff9e7');x.fillStyle=shade;x.fillRect(0,0,1024,256);
 if(s.id==='rainbow-trout'){const band=x.createLinearGradient(0,82,0,168);band.addColorStop(0,'#d4d3c300');band.addColorStop(.5,'#c76c8a');band.addColorStop(1,'#d4d3c300');x.fillStyle=band;x.fillRect(0,82,1024,86);}
 if(['largemouth-bass','common-snook','striped-bass','striper'].includes(s.id)){
  const striped=['striped-bass','striper'].includes(s.id),rows=striped?7:1;x.strokeStyle=s.id==='common-snook'?'#263b32':'#34462e';
  for(let row=0;row<rows;row++){x.lineWidth=striped?3:s.id==='common-snook'?5:13;x.beginPath();for(let i=0;i<1024;i+=5){const y=striped?68+row*20:129+Math.sin(i*.032)*2;i?x.lineTo(i,y):x.moveTo(i,y);}x.stroke();if(s.id==='largemouth-bass')for(let i=70;i<880;i+=40){x.fillStyle='#3b4a32aa';x.fillRect(i,114+rng()*8,22+rng()*22,22+rng()*9);}}
 }
 if(s.id==='red-drum'){x.fillStyle='#292b24';x.beginPath();x.ellipse(108,109,19,15,-.3,0,Math.PI*2);x.fill();}
 if(['trout','salmon'].includes(s.shape)&&s.id!=='atlantic-tarpon')for(let i=0;i<330;i++){const px=rng()*940,py=rng()*145;if(s.id==='atlantic-salmon'&&py>110)continue;x.fillStyle=s.id==='brook-trout'||s.id==='lake-trout'?'#d9dfb7':s.id==='brown-trout'&&i%4===0?'#984832':'#26342b';x.beginPath();x.ellipse(px,py,2+rng()*2.7,1.3+rng()*2.2,rng()*3,0,Math.PI*2);x.fill();}
 // Small overlapping scale edges avoid a regular dot-grid pattern.
 for(let row=0;row<34;row++)for(let col=0;col<110;col++){const px=col*10+(row%2)*5,py=row*8;x.strokeStyle=`rgba(255,255,235,${.05+rng()*.15})`;x.lineWidth=.6;x.beginPath();x.arc(px,py,4,.15,2.8);x.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}

export function fishModel(s){
 const group=new T.Group(),body=new T.BufferGeometry(),verts=[],colors=[],uvs=[],indices=[];
 const c=new T.Color(s.id==='rainbow-trout'?'#c1c5bc':s.color),belly=new T.Color('#e7e5d8'),back=s.id==='rainbow-trout'?new T.Color('#52695b'):c.clone().multiplyScalar(.55);
 const long=['pike','billfish','sail','slim','sturgeon'].includes(s.shape),round=s.shape==='round',trout=['trout','salmon'].includes(s.shape),length=long?1.35:trout?1.28:s.id==='red-drum'?1.16:1;
 const profile=[[-1.3,.055],[-1.12,.075],[-.94,.13],[-.72,.22],[-.46,.30],[-.17,.34],[.12,.35],[.39,.32],[.62,.255],[.8,.17],[.94,.105],[1,.055]];if(s.id==='largemouth-bass'){profile[8][1]=.30;profile[9][1]=.24;profile[10][1]=.17;profile[11][1]=.105;}else if(['red-drum','common-snook','striped-bass'].includes(s.id)){profile[9][1]=.20;profile[10][1]=.13;profile[11][1]=.075;}const curve=new T.CatmullRomCurve3(profile.map(([a,b])=>V(a,b,0))),rings=curve.getPoints(44).map(p=>[p.x,p.y]),sides=28;
 for(let i=0;i<rings.length;i++)for(let j=0;j<sides;j++){
  const [x,r]=rings[i],a=j/sides*Math.PI*2,up=Math.cos(a);
  verts.push(x*length,up*r*(round?1.4:trout?.87:1)+.035*Math.sin((x+1)*2),Math.sin(a)*r*(round?.48:.65));
  let shade=c.clone().lerp(up>.2?back:belly,up>.2?(up-.2)*.9:Math.max(0,-up)*.85);
  uvs.push((x+1.3)/2.3,up*.5+.5);
  if(s.id==='brook-trout'&&up<-.2)shade.lerp(new T.Color('#d78342'),.45);
  colors.push(shade.r,shade.g,shade.b);
  if(i<rings.length-1){const k=i*sides+j,n=i*sides+(j+1)%sides;indices.push(k,n,k+sides,n,n+sides,k+sides);}
 }
 body.setAttribute('position',new T.Float32BufferAttribute(verts,3));body.setAttribute('color',new T.Float32BufferAttribute(colors,3));body.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));body.setIndex(indices);body.computeVertexNormals();
 const skin=new T.MeshPhysicalMaterial({color:'#ffffff',map:fishTexture(s),vertexColors:true,metalness:.32,roughness:.24,clearcoat:.88,clearcoatRoughness:.12}),swim={value:0};
 skin.onBeforeCompile=shader=>{
  shader.uniforms.swim=swim;
  shader.vertexShader='uniform float swim;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat bend=pow(clamp((.5-position.x)/2.,0.,1.),1.6);transformed.z+=sin(swim+position.x*2.8)*bend*.13;');
 };
 skin.customProgramCacheKey=()=> 'fish-swim';
 const shell=mesh(body,skin,group);shell.castShadow=true;group.userData.swim=swim;
 const finColor=new T.Color(s.color).multiplyScalar(.66);
 const tail=new T.Group();tail.position.x=-1.27*length;group.add(tail);const fork=['tuna','slim','round','billfish','sail'].includes(s.shape)||s.id==='atlantic-salmon'?-.34:-.50;
 tail.add(fin([[0,0,0],[-.18,.09,0],[-.58,.43,.02],[-.5,.17,0],[fork,0,0],[-.5,-.17,0],[-.58,-.43,.02],[-.18,-.09,0]],finColor));tail.scale.set(trout?.82:1,trout?.72:.9,1);group.userData.tail=tail;
 group.add(fin([[-.78,.16,0],[-.54,s.shape==='sail'?1.2:trout?.44:.55,0],[-.36,.41,0],[.02,.29,0],[-.32,.27,0]],finColor));
 if(['bass','perch'].includes(s.shape))group.add(fin([[.46,.23,0],[.35,.49,0],[.22,.47,0],[.12,.42,0],[.02,.31,0]],finColor));
 if(trout)group.add(fin([[-.98,.13,0],[-.9,.23,0],[-.8,.22,0],[-.76,.16,0]],finColor));
 group.add(fin([[-.73,-.15,0],[-.8,-.35,0],[-.62,-.33,0],[-.4,-.22,0]],finColor));
 for(const sign of [-1,1]){
  const p=fin([[.38,-.09,sign*.21],[.22,-.22,sign*.32],[-.16,-.32,sign*.43],[-.07,-.16,sign*.28]],finColor);group.add(p);
  group.add(fin([[-.15,-.25,sign*.1],[-.28,-.36,sign*.21],[-.45,-.38,sign*.24],[-.37,-.25,sign*.12]],finColor));
  const eye=mesh(new T.SphereGeometry(.043,8,6),mat('#d6bd67',{roughness:.22,flatShading:false}),group,.76*length,.085,sign*.137);
  mesh(new T.SphereGeometry(.026,8,6),mat('#091c22',{roughness:.14,flatShading:false}),eye,.012,0,sign*.041);
  mesh(new T.SphereGeometry(.008,6,4),new T.MeshBasicMaterial({color:'#ffffff'}),eye,.019,.014,sign*.068);
  const mouth=[V(.73*length,-.06,sign*.13),V(.9*length,-.035,sign*.09),V(1.01*length,.015,sign*.045)];group.add(new T.Line(new T.BufferGeometry().setFromPoints(mouth),new T.LineBasicMaterial({color:'#34433b',transparent:true,opacity:.7})));
  const gill=new T.EllipseCurve(.54*length,0,.09,.25,-1.25,1.25,false,0).getPoints(12).map(v=>V(v.x,v.y,sign*(.19-Math.abs(v.y)*.16)));
  group.add(new T.Line(new T.BufferGeometry().setFromPoints(gill),new T.LineBasicMaterial({color:new T.Color(s.color).multiplyScalar(.5),transparent:true,opacity:.7})));
 }
 if(['billfish','sail'].includes(s.shape)){const bill=mesh(new T.ConeGeometry(.045,1.15,8),mat(s.color),group,1.82,.02,0);bill.rotation.z=-Math.PI/2;}
 // Consolidate static fins and eye parts by material. Keep the body and tail animated.
 group.updateMatrixWorld(true);const batches=new Map();group.traverse(o=>{if(!o.isMesh||o===shell||o.parent===tail)return;const key=o.material.color.getHex()+':'+o.material.type+':'+o.material.side;const batch=batches.get(key)||{material:o.material,parts:[],nodes:[]};const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);batch.parts.push(g);batch.nodes.push(o);batches.set(key,batch);});
 for(const batch of batches.values()){const positions=[],normals=[];for(const g of batch.parts){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));for(const o of batch.nodes){o.removeFromParent();o.geometry.dispose();if(o.material!==batch.material)o.material.dispose();}mesh(geometry,batch.material,group);}
 return group;
}
export class Scene3D{
 constructor(canvas,onFailure){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.layer=document.createElement('canvas');this.layer.className='game-webgl';this.layer.setAttribute('aria-hidden','true');canvas.before(this.layer);
  try{this.renderer=new T.WebGLRenderer({canvas:this.layer,antialias:false,alpha:false,powerPreference:'high-performance'});}catch(e){this.layer.remove();throw e;}
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.layer.addEventListener('webglcontextlost',e=>{e.preventDefault();onFailure();});
  this.scene=new T.Scene();this.scene.background=new T.Color('#367b75');this.camera=new T.PerspectiveCamera(48,1,.1,450);this.camera.position.set(0,5.5,13);this.look=V(0,.1,-13);this.camera.lookAt(this.look);
  this.scene.fog=new T.FogExp2('#b8c9bc',.012);this.hemi=new T.HemisphereLight('#dcece7','#455e43',2.6);this.scene.add(this.hemi);this.sun=new T.DirectionalLight('#fff0ce',2);this.sun.position.set(-35,30,-65);this.scene.add(this.sun);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:150});this.sun.shadow.bias=-.0008;this.sun.shadow.normalBias=.04;
  this.sky=mesh(new T.SphereGeometry(240,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#7fa7b5')},bottom:{value:new T.Color('#edcf9c')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:skyFragment}),this.scene);
  this.sunDisc=mesh(new T.SphereGeometry(.85,16,12),new T.MeshBasicMaterial({color:'#fff1c4',fog:false,toneMapped:false}),this.scene,-47,22,-110);
  this.moon=mesh(new T.SphereGeometry(3,16,12),new T.MeshBasicMaterial({color:'#e8f0e5',fog:false}),this.scene,-10,16,-110);
  const starPositions=[];for(let i=0;i<180;i++){const a=i*2.399,r=100+Math.sin(i)*30;starPositions.push(Math.sin(a)*r,25+(i*17)%95,-Math.abs(Math.cos(a)*r)-40);}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));this.stars=new T.Points(sg,new T.PointsMaterial({color:'#e6f2e9',size:.35}));this.scene.add(this.stars);
  this.reflectionTarget=new T.WebGLRenderTarget(384,256);this.reflectionCamera=new T.PerspectiveCamera();this.reflectionMatrix=new T.Matrix4();this.reflectionFrame=0;this.reflectionPlane=new T.Plane(V(0,1,0),-.05);this.terrain=new T.Group();this.scene.add(this.terrain);this.school=new T.Group();this.scene.add(this.school);this.fishes=[];
  const pixels=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,a=x/128*Math.PI*2,b=y/128*Math.PI*2;pixels[i]=128+Math.sin(a*5+b*3)*64+Math.cos(a*11-b*7)*28;pixels[i+1]=128+Math.cos(b*7+a*2)*64+Math.sin(b*13-a*5)*28;pixels[i+2]=240;pixels[i+3]=255;}this.waveNormal=new T.DataTexture(pixels,128,128);this.waveNormal.wrapS=this.waveNormal.wrapT=T.RepeatWrapping;this.waveNormal.magFilter=this.waveNormal.minFilter=T.LinearFilter;this.waveNormal.needsUpdate=true;
  this.water=mesh(new T.PlaneGeometry(340,340,40,40),new T.ShaderMaterial({uniforms:{time:{value:0},deep:{value:new T.Color('#123e40')},shallow:{value:new T.Color('#4b9b80')},skyColor:{value:new T.Color('#d6c9aa')},sunDir:{value:V(-.4,.55,-.7).normalize()},night:{value:0},underwater:{value:0},shoreWidth:{value:11.8},riverFlow:{value:0},flats:{value:0},waveStrength:{value:1},waveNormal:{value:this.waveNormal},reflectionMap:{value:this.reflectionTarget.texture},reflectionMatrix:{value:this.reflectionMatrix},reflectionReady:{value:0}},vertexShader:waterVertex,fragmentShader:waterFragment,transparent:true,side:T.DoubleSide,depthWrite:false}),this.scene);this.water.rotation.x=-Math.PI/2;this.water.renderOrder=2;
  this.floor=mesh(new T.PlaneGeometry(320,320),new T.ShaderMaterial({uniforms:{time:{value:0},underwater:{value:0},color:{value:new T.Color('#5b8170')}},vertexShader:floorVertex,fragmentShader:floorFragment}),this.scene,0,-3,0);this.floor.rotation.x=-Math.PI/2;
  this.lure=mesh(new T.SphereGeometry(.07,8,6),mat('#e8b54e',{metalness:.6,roughness:.2}),this.scene);this.lureForms={spoon:this.lure.geometry,spinner:new T.SphereGeometry(.07,8,6),fly:new T.ConeGeometry(.05,.24,7),jig:new T.ConeGeometry(.065,.3,8)};this.float=mesh(new T.CylinderGeometry(.05,.07,.28,10),mat('#ffdf8c'),this.scene);
  this.linePositions=new Float32Array(36*3);const lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(this.linePositions,3));this.line=new T.Line(lg,new T.LineBasicMaterial({color:'#f7edce',transparent:true,opacity:.8}));this.scene.add(this.line);
  this.arc=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#f5d081',dashSize:.22,gapSize:.2,transparent:true,opacity:.85}));this.scene.add(this.arc);
  this.angler=new T.Group();this.scene.add(this.angler);this.makeAngler();
  this.splashData=[];this.particlePositions=new Float32Array(100*3);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(this.particlePositions,3));this.particles=new T.Points(pg,new T.PointsMaterial({color:'#e5fff3',size:.09,transparent:true,opacity:.8}));this.scene.add(this.particles);
  this.makeEffects();this.trophyGroup=new T.Group();this.scene.add(this.trophyGroup);this.trophyGroup.visible=false;
  this.ray=new T.Raycaster();this.plane=new T.Plane(V(0,1,0),0);this.temp=V();this.quality='auto';this.scale=1;this.frameTimes=[];this.elapsed=0;this.resize();
 }
 makeEffects(){
  const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d'),gradient=c.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,225,160,.65)');gradient.addColorStop(.2,'rgba(255,202,126,.26)');gradient.addColorStop(1,'rgba(255,177,102,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);
  this.sunHalo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(tex),color:'#ffd4a1',transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false}));this.sunHalo.scale.set(18,18,1);this.scene.add(this.sunHalo);
  const drop=document.createElement('canvas');drop.width=drop.height=32;const dc=drop.getContext('2d');dc.fillStyle='#fff';dc.beginPath();dc.arc(16,16,13,0,Math.PI*2);dc.fill();this.particles.material.map=new T.CanvasTexture(drop);this.particles.material.alphaTest=.1;
  this.ripples=[];this.rippleGroup=new T.Group();this.scene.add(this.rippleGroup);
  for(let i=0;i<12;i++){const ring=mesh(new T.RingGeometry(.94,1,48),new T.MeshBasicMaterial({color:'#e0f0d1',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),this.rippleGroup);ring.rotation.x=-Math.PI/2;ring.renderOrder=3;ring.visible=false;this.ripples.push({ring,life:0});}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(32,32,0,32,32,32);sg.addColorStop(0,'rgba(5,24,19,.42)');sg.addColorStop(.35,'rgba(5,24,19,.23)');sg.addColorStop(1,'rgba(5,24,19,0)');sc.fillStyle=sg;sc.fillRect(0,0,64,64);
  this.contactShadow=mesh(new T.PlaneGeometry(2.5,2.5),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),this.scene,-2,.34,6.5);this.contactShadow.rotation.x=-Math.PI/2;this.contactShadow.renderOrder=3;
  this.postTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});this.postScene=new T.Scene();this.postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.postMaterial=new T.ShaderMaterial({uniforms:{source:{value:this.postTarget.texture},pixel:{value:new T.Vector2(1,1)}},depthTest:false,depthWrite:false,vertexShader:'varying vec2 texcoord;void main(){texcoord=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;uniform vec2 pixel;varying vec2 texcoord;
   vec3 bright(vec2 uv){vec3 c=texture2D(source,uv).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-1.)*.15;}
   void main(){vec3 c=texture2D(source,texcoord).rgb;vec3 glow=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 dir=vec2(cos(a),sin(a))*pixel;glow+=bright(texcoord+dir*3.)*.075+bright(texcoord+dir*8.)*.05+bright(texcoord+dir*15.)*.025;}gl_FragColor=vec4(c+glow,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});mesh(new T.PlaneGeometry(2,2),this.postMaterial,this.postScene);
  this.catchScene=new T.Scene();this.catchScene.background=new T.Color('#193e36');this.catchScene.add(new T.HemisphereLight('#edf5ff','#59665d',2.2));const key=new T.DirectionalLight('#fff4e7',2.8);key.position.set(-2,4,5);this.catchScene.add(key);const rim=new T.DirectionalLight('#bed8e2',3.2);rim.position.set(2,2,-2);this.catchScene.add(rim);this.catchCamera=new T.OrthographicCamera(-3.2,3.2,1.46,-1.46,.1,30);this.catchCamera.position.set(0,.3,8);this.catchCamera.lookAt(0,0,0);
 }
 showCatch(species){
  if(this.catchModel){this.disposeGroup(this.catchModel);this.catchScene.remove(this.catchModel);this.catchModel=null;}
  if(species){this.catchModel=fishModel(species);this.catchModel.scale.setScalar(['billfish','sail','pike','slim','sturgeon'].includes(species.shape)?1.2:1.5);this.catchScene.add(this.catchModel);this.catchAt=-1;this.catchStart=this.elapsed;}
 }
 catchImage(species){
  const width=880,height=400,target=new T.WebGLRenderTarget(width,height);target.texture.colorSpace=T.SRGBColorSpace;
  const renderer=this.renderer,previous=renderer.getRenderTarget(),viewport=renderer.getViewport(new T.Vector4()),scissor=renderer.getScissor(new T.Vector4()),clipped=renderer.getScissorTest(),visible=this.catchModel?.visible;
  const subject=fishModel(species);subject.scale.setScalar(['billfish','sail','pike','slim','sturgeon'].includes(species.shape)?1.2:1.5);subject.rotation.set(.05,-.38,-.04);this.catchScene.add(subject);if(this.catchModel)this.catchModel.visible=false;
  try{renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.render(this.catchScene,this.catchCamera);const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),data=context.createImageData(width,height);for(let y=0;y<height;y++)data.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);context.putImageData(data,0,0);return canvas;}
  finally{this.catchScene.remove(subject);this.disposeGroup(subject);target.dispose();if(this.catchModel)this.catchModel.visible=visible;renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(clipped);}
 }
 drawCatch(g){
  if(!this.catchModel||g.state!=='caught')return;
  const target=document.getElementById('catch-art');if(!target||target.getBoundingClientRect().bottom<0)return;
  if(this.elapsed-this.catchAt<1/24&&this.catchAt>=0)return;this.catchAt=this.elapsed;
  this.catchModel.rotation.y=-.38+(g.reduced?0:Math.sin((this.elapsed-this.catchStart)*.6)*.08);this.catchModel.rotation.z=-.04;
  this.catchModel.userData.swim.value=g.reduced?0:this.elapsed*2;this.catchModel.userData.tail.rotation.y=g.reduced?0:Math.sin(this.elapsed*2)*.12;
  const h=Math.min(this.h,this.w/2.2),w=h*2.2;this.renderer.setViewport(0,0,w,h);this.renderer.setScissor(0,0,w,h);this.renderer.setScissorTest(true);this.renderer.render(this.catchScene,this.catchCamera);
  const ratio=this.renderer.getPixelRatio();target.getContext('2d').drawImage(this.layer,0,this.layer.height-h*ratio,w*ratio,h*ratio,0,0,target.width,target.height);
  this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,this.w,this.h);
 }
 renderScene(g){
  this.drawCatch(g);
  if((this.quality==='high'||(this.quality==='auto'&&this.w>=900))&&this.scale>.78){this.renderer.setRenderTarget(this.postTarget);this.renderer.render(this.scene,this.camera);this.renderer.setRenderTarget(null);this.renderer.render(this.postScene,this.postCamera);}
  else this.renderer.render(this.scene,this.camera);
 }
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.w=w;this.h=h;this.canvas.width=w;this.canvas.height=h;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.setQuality(this.quality);}
 setQuality(value){this.quality=value;const low=value==='low'||(value==='auto'&&(this.w<600||(navigator.hardwareConcurrency||4)<=4));const high=value==='high'||(value==='auto'&&this.w>=900);this.baseRatio=low?(value==='low'?.85:Math.min(devicePixelRatio,1.25)):high?Math.min(Math.max(devicePixelRatio,1.5),1.8):Math.min(Math.max(devicePixelRatio,1.25),1.35);const reflectionWidth=low?256:high?512:384;this.reflectionTarget.setSize(reflectionWidth,Math.round(reflectionWidth*2/3));this.reflectionFrame=0;this.renderer.setPixelRatio(this.baseRatio*this.scale);this.renderer.setSize(this.w,this.h,false);this.renderer.shadowMap.enabled=high;this.renderer.shadowMap.needsUpdate=high;this.postTarget.setSize(high?Math.round(this.w*this.baseRatio*this.scale):1,high?Math.round(this.h*this.baseRatio*this.scale):1);this.postMaterial.uniforms.pixel.value.set(1/(this.w*this.baseRatio*this.scale),1/(this.h*this.baseRatio*this.scale));}
 makeAngler(){
  const jacket=mat('#697367',{roughness:.95}),skin=mat('#b48d72'),dark=mat('#424d43'),vest=mat('#555e4f'),leather=mat('#9a8865');
  this.angler.position.set(-2,.25,6.4);
  // 1.84 m figure with a 0.23 m head. Rounded shoulders, tapered waist and full-length legs.
  this.chest=mesh(new T.CapsuleGeometry(.205,.33,6,16),jacket,this.angler,0,1.23,0);this.chest.scale.set(1.18,1,.67);
  const waist=mesh(new T.CapsuleGeometry(.17,.15,5,14),dark,this.angler,0,.93,0);waist.scale.set(1.18,1,.72);
  for(const side of [-1,1]){
   const thigh=mesh(new T.CapsuleGeometry(.098,.27,5,12),dark,this.angler,side*.115,.68,side*.025);thigh.rotation.z=side*.035;
   mesh(new T.CapsuleGeometry(.073,.27,5,12),dark,this.angler,side*.13,.29,-.025);
   const boot=mesh(new T.CapsuleGeometry(.075,.14,5,12),mat('#333b34'),this.angler,side*.13,.085,-.08);boot.rotation.x=Math.PI/2;
   const panel=mesh(new T.CapsuleGeometry(.092,.23,5,12),vest,this.angler,side*.107,1.23,-.125);panel.scale.z=.42;
   const pocket=mesh(new T.CapsuleGeometry(.07,.035,4,10),leather,this.angler,side*.11,1.13,-.16);pocket.scale.z=.38;
  }
  mesh(new T.CylinderGeometry(.058,.071,.1,12),skin,this.angler,0,1.56,0);
  const head=mesh(new T.SphereGeometry(1,20,16),skin,this.angler,0,1.695,-.007);head.scale.set(.084,.115,.097);
  for(const side of [-1,1]){const ear=mesh(new T.SphereGeometry(1,8,8),skin,this.angler,side*.083,1.69,0);ear.scale.set(.014,.028,.018);}
  // Close-fitting cloth cap with a curved forward bill.
  const cap=mesh(new T.SphereGeometry(.092,20,10,0,Math.PI*2,0,Math.PI/2),mat('#4c5549'),this.angler,0,1.738,0);cap.scale.set(1,.8,1.12);
  const bill=mesh(new T.SphereGeometry(1,20,8),mat('#4c5549'),this.angler,0,1.737,-.102);bill.scale.set(.092,.009,.094);bill.rotation.x=-.1;
  this.castArm=new T.Group();this.castArm.position.set(.215,1.42,0);this.angler.add(this.castArm);
  const upper=mesh(new T.CapsuleGeometry(.065,.22,5,12),jacket,this.castArm,.015,-.13,-.035);upper.rotation.x=.28;
  const forearm=mesh(new T.CapsuleGeometry(.052,.2,5,12),jacket,this.castArm,.015,-.27,-.18);forearm.rotation.x=1.18;
  const hand=mesh(new T.CapsuleGeometry(.037,.055,5,10),skin,this.castArm,.015,-.30,-.325);hand.rotation.x=1.1;
  const leftUpper=mesh(new T.CapsuleGeometry(.063,.22,5,12),jacket,this.angler,-.215,1.28,-.035);leftUpper.rotation.x=.25;leftUpper.rotation.z=-.15;
  const leftFore=mesh(new T.CapsuleGeometry(.05,.23,5,12),jacket,this.angler,-.115,1.12,-.19);leftFore.rotation.set(.95,0,-.65);
  const leftHand=mesh(new T.CapsuleGeometry(.035,.05,4,10),skin,this.angler,-.01,1.05,-.3);leftHand.rotation.x=1.1;
  this.rodGroup=new T.Group();this.rodGroup.position.set(.015,-.30,-.325);this.castArm.add(this.rodGroup);
  this.rodBend={value:0};const rodMaterial=mat('#353d35',{metalness:.35,roughness:.35});rodMaterial.onBeforeCompile=shader=>{shader.uniforms.bend=this.rodBend;shader.vertexShader='uniform float bend;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=bend*pow(position.y/3.1,2.);');};const blank=new T.CylinderGeometry(.007,.018,3.1,8,24);blank.translate(0,1.55,0);mesh(blank,rodMaterial,this.rodGroup);
  mesh(new T.CylinderGeometry(.031,.033,.29,10),leather,this.rodGroup,0,.07,0);
  mesh(new T.TorusGeometry(.068,.019,8,20),mat('#8b9390',{metalness:.8,roughness:.24}),this.rodGroup,0,.18,.07);
  this.rodTip=V();this.angler.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 }
 disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m.map?.dispose();m.dispose();}}});group.clear();}
 environment(water,biome){
  this.disposeGroup(this.terrain);this.windTime={value:0};this.type=water;this.biome=biome;
  const ice=water==='ice',tropical=['flats','offshore','reef'].includes(water)||biome==='tropical',open=water==='offshore',river=water==='river';
  const rng=window.CastwardGame.random(window.CastwardGame.seed(water+(biome||'')));
  const land=new T.Color(ice?'#e0e9e2':tropical?(river?'#6d7950':'#ddd2aa'):'#6e7a4a');
  const groundMap=terrainTexture(),groundMaterial=mat('#ffffff',{vertexColors:true,map:groundMap,bumpMap:groundMap,bumpScale:.16,roughness:1});
  const object=new T.Object3D();
  const instances=(geo,material,count,place)=>{const m=new T.InstancedMesh(geo,material,count);for(let i=0;i<count;i++){object.position.set(0,0,0);object.rotation.set(0,0,0);object.scale.set(1,1,1);place(object,i);object.updateMatrix();m.setMatrixAt(i,object.matrix);}m.computeBoundingSphere();m.receiveShadow=true;this.terrain.add(m);return m;};
  const bankX=z=>(river?11.8:25)+Math.sin(z*.105)*1.5+Math.sin(z*.27)*.6;
  if(open){instances(new T.IcosahedronGeometry(1,2),mat('#7c9187'),7,(o,i)=>{o.position.set(-100+i*9,-1,-105-i*2);o.scale.set(12,4+Math.sin(i)*2,14);});}
  if(!open){
   for(const side of [-1,1]){
    const g=new T.PlaneGeometry(32,150,32,80);g.rotateX(-Math.PI/2);const p=g.attributes.position,colors=[];
    for(let i=0;i<p.count;i++){const u=(p.getX(i)+16)/32,z=p.getZ(i)-55,x=side*(bankX(z)+u*32);p.setXYZ(i,x,-.35+Math.sin(u*Math.PI/2)*2.5+Math.sin(z*.35)*u*.35,z);const edge=u*32;const c=new T.Color(ice?'#dce3df':edge<1.1?(tropical?'#b8ab87':'#514f3d'):edge<2.5?(tropical?'#c7b997':'#827a61'):land).multiplyScalar(.82+Math.sin(x*3+z*2)*.06+rng()*.15);colors.push(c.r,c.g,c.b);}
    if(side<0){const indices=g.index.array;for(let i=0;i<indices.length;i+=3){const next=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=next;}}
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const bank=mesh(g,groundMaterial,this.terrain);bank.receiveShadow=true;
   }
   if(!tropical)for(let layer=0;layer<3;layer++){
    const geo=new T.PlaneGeometry(350,110,128,20);geo.rotateX(-Math.PI/2);const at=geo.attributes.position,colors=[];
    for(let i=0;i<at.count;i++){const x=at.getX(i),z=at.getZ(i),ridge=.5+Math.sin(x*.043+layer*1.6)*.3+Math.sin(x*.11+layer)*.15;const height=(9+ridge*30+Math.sin(x*.27+z*.09)*2+Math.sin(x*.53+z*.38)*1.2+Math.sin(x*1.3+z*.73)*.45)*(1-Math.exp(-x*x/1800)*.6)*Math.pow(Math.max(0,1-Math.abs(z)/56),.75);at.setY(i,height);const col=new T.Color(height>29?'#dce4df':layer===2?'#8c9da4':layer===1?'#6d8582':'#526e64');col.multiplyScalar(.85+Math.sin(x*.7+z*.8)*Math.sin(x*.27-z*.3)*.13);if(height<8)col.multiplyScalar(.88);colors.push(col.r,col.g,col.b);}
    geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,groundMaterial,this.terrain,0,-1,-122-layer*42);
   }
   const treeSites=Array.from({length:tropical?64:170},(_,i)=>{const z=14-rng()*130;return{x:(i%2?1:-1)*(bankX(z)+2+rng()*22),z,h:4+rng()*(z>0?4:10),angle:rng()*Math.PI};});
   const card=new T.PlaneGeometry(1,1,1,5);card.translate(0,.5,0);
   const plant=(kind,sites,width=1,cross=2)=>{const m=instances(card.clone(),foliageMaterial(kind,this.windTime,ice?'#c5cfc6':'#c6c8b0'),sites.length*cross,(o,i)=>{const t=sites[Math.floor(i/cross)];o.position.set(t.x,t.y??.3,t.z);o.scale.set(t.h*width,t.h,1);o.rotation.y=t.angle+(i%cross)*Math.PI/cross;});for(let i=0;i<m.count;i++)m.setColorAt(i,new T.Color().setHSL(.23+rng()*.035,.06+rng()*.12,.69+rng()*.25));m.castShadow=true;return m;};
   if(!tropical){
    plant('pine',treeSites.filter((t,i)=>ice||i%4),.72,3);
    if(!ice){const broad=treeSites.filter((t,i)=>i%4===0);plant('broadleaf',broad,1.2,3);instances(new T.CylinderGeometry(.065,.19,1,8),mat('#635e4d'),broad.length,(o,i)=>{const t=broad[i];o.position.set(t.x,t.h*.3,t.z);o.scale.y=t.h*.6;});}
   }else{
    const palms=treeSites.filter((t,i)=>i%3===0);
    instances(new T.CylinderGeometry(.07,.17,1,9,5),mat('#8c8266',{map:grainTexture()}),palms.length,(o,i)=>{const t=palms[i];o.position.set(t.x,t.h*.5,t.z);o.scale.y=t.h;o.rotation.z=Math.sin(i)*.09;});
    const frond=new T.PlaneGeometry(1,1,6,3);frond.translate(.46,0,0);const fp=frond.attributes.position;for(let i=0;i<fp.count;i++)fp.setZ(i,Math.sin(fp.getX(i)*Math.PI)*.12-(fp.getX(i)**2)*.65);
    instances(frond,foliageMaterial('palm',this.windTime,'#c6c7a3'),palms.length*9,(o,i)=>{const t=palms[Math.floor(i/9)];o.position.set(t.x,t.h,t.z);o.rotation.set(-Math.PI/2,(i%3-.8)*.16,t.angle+(i%9)*Math.PI*2/9);o.scale.set(3.3+rng(),2.8+rng(),2);});
    const mangroves=treeSites.filter((t,i)=>i%3!==0).map(t=>({...t,h:t.h*.55}));plant('mangrove',mangroves,1.5,3);
    const rootGeo=new T.TubeGeometry(new T.CatmullRomCurve3([V(0,1.9,0),V(.25,1.3,0),V(.8,.65,0),V(1.1,-.35,0)]),7,.045,5,false);
    instances(rootGeo,mat('#6f6c52'),mangroves.length*5,(o,i)=>{const t=mangroves[Math.floor(i/5)];o.position.set(t.x,0,t.z);o.rotation.y=i*2.4;o.scale.setScalar(.8+t.h*.12);});
    if(river||water==='flats')plant('moss',mangroves.slice(0,20).map(t=>({...t,y:t.h*.45,h:1.6})),.7,2);
   }
   // Far cards read as a continuous, irregular canopy through distance haze.
   for(let layer=0;layer<3;layer++){
    const distant=Array.from({length:66},(_,i)=>({x:(i-33)*5.4,z:-125-layer*27+rng()*9,h:5+rng()*10,y:tropical?-.4:layer*.6,angle:rng()*3}));
    if(tropical)mesh(new T.BoxGeometry(360,.5,10),mat('#74806a'),this.terrain,0,-.15,-128-layer*27);
    const trees=plant(tropical?'mangrove':'pine',distant,tropical?1.6:.8,1);trees.material.color.set(['#798b7c','#8b9b92','#a1ada4'][layer]);trees.castShadow=false;
   }
   for(let variant=0;variant<4;variant++){
    const rocks=instances(rockGeometry(variant*2.17),rockMaterial(ice),23,(o,i)=>{const z=15-rng()*125;o.position.set((i%2?1:-1)*(bankX(z)+rng()*2.8-.5),-.12+rng()*.2,z);const r=.18+Math.pow(rng(),2)*1.55;o.scale.set(r*(.9+rng()),r*(.45+rng()*.5),r*(.7+rng()));o.rotation.set(rng()*.8,rng()*6,rng()*.4);});rocks.castShadow=true;for(let i=0;i<rocks.count;i++)rocks.setColorAt(i,new T.Color().setHSL(.08+rng()*.09,.06+rng()*.2,.58+rng()*.32));
   }
   if(!ice){
    const grassSites=Array.from({length:380},(_,i)=>{const z=16-rng()*110;return{x:(i%2?1:-1)*(bankX(z)+.6+rng()*4),z,y:.08+rng()*.22,h:.35+rng()*.75,angle:rng()*6};});plant('grass',grassSites,1.25,2);
    if(river||water==='lake'||water==='flats'){const reeds=Array.from({length:80},(_,i)=>{const z=14-rng()*48;return{x:(i%2?1:-1)*(bankX(z)-.35+rng()),z,y:-.15,h:1+rng()*1.5,angle:rng()*6};});plant('reed',reeds,.8,2);}
   }

  }
  instances(rockGeometry(9),rockMaterial(ice),open?0:50,(o)=>{const size=.35+rng();o.position.set((rng()-.5)*48,-2.5,8-rng()*60);o.scale.set(size,size*.7,size);o.rotation.set(rng(),rng()*6,rng());});
  if(water==='reef'){
   const coral=instances(new T.IcosahedronGeometry(1,1),mat('#d89d7f'),80,(o,i)=>{o.position.set((rng()-.5)*35,-2.65,5-rng()*40);o.scale.set(.2+rng()*.5,.4+rng()*.8,.25+rng()*.5);});for(let i=0;i<80;i++)coral.setColorAt(i,new T.Color(['#e9b0a1','#ad9acc','#e5cc8c','#b9ccac'][i%4]));
   instances(new T.CylinderGeometry(.06,.16,.85,5),mat('#c99b9a'),90,(o)=>{o.position.set((rng()-.5)*28,-2.2,3-rng()*30);o.rotation.set((rng()-.5)*.8,0,(rng()-.5)*.8);});
  }
  if(ice){
   const frost=iceTexture(),iceSurface=mat('#d8e2dc',{map:frost,bumpMap:frost,bumpScale:.03,roughness:.65});
   for(const side of [-1,1]){const sheet=mesh(iceGeometry(9,.35),iceSurface,this.terrain,side*12,.15,-4);sheet.scale.z=3;sheet.receiveShadow=true;}
   const platform=mesh(iceGeometry(4,.28),iceSurface,this.terrain,-2,0,7.5);platform.scale.z=.6;
   for(const side of [-1,1]){const shack=new T.Group();shack.position.set(side*13,0,-15-side*9);this.terrain.add(shack);mesh(new T.BoxGeometry(2.8,2.7,3.4),mat(side<0?'#766251':'#697976',{map:grainTexture()}),shack,0,1.4,0).castShadow=true;for(const slope of [-1,1]){const roof=mesh(new T.BoxGeometry(1.95,.15,3.9),mat('#e8ede3'),shack,slope*.8,3.15,0);roof.rotation.z=-slope*.48;roof.castShadow=true;}mesh(new T.BoxGeometry(.8,1.7,.06),mat('#354d4b'),shack,0,1,-1.74);mesh(new T.BoxGeometry(.65,.6,.08),new T.MeshBasicMaterial({color:'#ebc582'}),shack,.8,1.8,-1.75);mesh(new T.CylinderGeometry(.12,.12,1.1,6),mat('#526563'),shack,.8,3.5,0);}
  }else if(river||water==='lake'){
   const wood=mat('#8f846d',{map:grainTexture(),roughness:.95});instances(new T.BoxGeometry(2.4,.16,.38),wood,22,(o,i)=>{o.position.set(-2,.15,4.8+i*.43);});
   instances(new T.CylinderGeometry(.09,.14,2,7),mat('#73694f'),8,(o,i)=>{o.position.set(-2+(i%2?1.05:-1.05),-.3,5+Math.floor(i/2)*2.4);});
   const post=mesh(new T.CylinderGeometry(.1,.12,1,7),wood,this.terrain,-3.1,.65,5);post.castShadow=true;
   const rope=new T.TorusGeometry(.2,.025,5,16);mesh(rope,mat('#d4c49a'),this.terrain,-3.1,.35,5).rotation.x=Math.PI/2;
  }else{
   // Open skiff: flared topsides, a shallow V bottom, bow deck and transom.
   const boat=new T.Group();boat.position.set(-2,0,6.8);this.terrain.add(boat);
   const outline=[[-.92,2.55],[-1.04,.8],[-.91,-1.3],[-.62,-2.15],[0,-2.75],[.62,-2.15],[.91,-1.3],[1.04,.8],[.92,2.55]],positions=[],indices=[];
   for(const [x,z] of outline){positions.push(x,.39,z,x*.8,-.24,z*.92);}
   for(let i=0;i<outline.length;i++){const a=i*2,b=((i+1)%outline.length)*2;indices.push(a,b,a+1,b,b+1,a+1);}
   const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(positions,3));hull.setIndex(indices);hull.computeVertexNormals();mesh(hull,mat('#b8c0b8',{metalness:.42,roughness:.38,side:T.DoubleSide}),boat);
   const deckShape=new T.Shape();outline.forEach(([x,z],i)=>i?deckShape.lineTo(x*.83,-z*.93):deckShape.moveTo(x*.83,-z*.93));deckShape.closePath();const deck=mesh(new T.ShapeGeometry(deckShape),mat('#a5aaa0',{roughness:.9}),boat,0,.04,0);deck.rotation.x=-Math.PI/2;
   const railPoints=outline.map(([x,z])=>V(x,.4,z));railPoints.push(railPoints[0]);mesh(new T.TubeGeometry(new T.CatmullRomCurve3(railPoints,false,'centripetal'),48,.033,6,false),mat('#d0d4c9',{metalness:.7,roughness:.28}),boat);
   for(const z of [-1.3,1.7])mesh(new T.BoxGeometry(1.65,.12,.48),mat('#a1a592',{map:grainTexture()}),boat,0,.3,z);
   const bowShape=new T.Shape();bowShape.moveTo(-.7,1.8);bowShape.lineTo(0,2.55);bowShape.lineTo(.7,1.8);bowShape.closePath();const bow=mesh(new T.ShapeGeometry(bowShape),mat('#c0c3b3'),boat,0,.34,0);bow.rotation.x=-Math.PI/2;
   const motor=mesh(new T.CapsuleGeometry(.21,.28,5,12),mat('#343c3c',{metalness:.55,roughness:.28}),boat,0,.42,2.72);motor.scale.set(.8,1,.9);mesh(new T.BoxGeometry(.12,.65,.13),mat('#4c5350',{metalness:.7}),boat,0,-.08,2.72);

  }
  const colors={river:['#193b35','#6b7860'],lake:['#183a45','#728e83'],ice:['#204958','#9ac6c8'],flats:['#177b79','#9edac1'],offshore:['#103c5e','#498fa9'],reef:['#176b78','#89d1ba']}[water];
  if(tropical&&river){colors[0]='#204d3b';colors[1]='#869764';}
  this.water.material.uniforms.riverFlow.value=river?1:0;this.water.material.uniforms.flats.value=water==='flats'?1:0;this.water.material.uniforms.waveStrength.value={river:.55,lake:1,ice:.45,flats:.6,offshore:1.7,reef:.9}[water];this.water.material.uniforms.deep.value.set(colors[0]);this.water.material.uniforms.shallow.value.set(colors[1]);this.water.material.uniforms.shoreWidth.value=open?1000:river?11.8:25;
  this.floor.material.uniforms.color.value.set(tropical?'#819b77':'#65897a');this.floor.position.y=open?-22:water==='lake'?-6:-3;
  this.terrain.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});this.renderer.shadowMap.needsUpdate=true;
 }
 syncFish(world){const signature=world.fish.map(f=>f.species.id).join();if(this.signature===signature)return;this.signature=signature;this.disposeGroup(this.school);this.fishes=world.fish.map(f=>{const m=fishModel(f.species);m.scale.setScalar(.65);this.school.add(m);return m;});}
 position(p,depth=-.7){return V((p.x-.5)*38,depth,(p.y-.49)*78-25);}
 screen(p){const depth=['net','caught'].includes(this.lastGame?.state)?(this.cameraMode==='landing'?1.1:-.25):-.7;const v=this.position(p,depth).project(this.camera);return {x:(v.x+1)/2,y:(1-v.y)/2};}
 input(p){this.ray.setFromCamera(new T.Vector2(p.x*2-1,1-p.y*2),this.camera);const v=this.ray.ray.intersectPlane(this.plane,this.temp);return v?{x:T.MathUtils.clamp(v.x/38+.5,.15,.88),y:T.MathUtils.clamp((v.z+25)/78+.49,.49,.86),t:p.t}:p;}
 splash(x,y,big=false){const p=this.position({x,y},.12);for(let j=0;j<(big?3:2);j++){const r=this.ripples.find(r=>r.life<=0)||this.ripples[0];r.life=2.2+j*.3;r.age=-j*.18;r.ring.position.copy(p);r.ring.visible=true;}for(let i=0;i<(big?24:12);i++){const a=i*2.4;this.splashData.push({p:p.clone(),v:V(Math.cos(a)*(big?2:1),1+Math.random()*2,Math.sin(a)*(big?2:1)),life:1});}this.splashData=this.splashData.slice(-100);}
 releaseFish(){this.releaseStart=this.elapsed;this.showCatch(null);}
 showTrophy(species){this.disposeGroup(this.trophyGroup);this.trophy=species||null;if(species){
  const backdrop=mesh(new T.PlaneGeometry(28,22),mat('#183b35'),this.trophyGroup,0,0,-1.2);
  const mount=mesh(new T.CylinderGeometry(2.1,2.1,.16,48),mat('#856b48',{roughness:.65}),this.trophyGroup,0,0,-.4);mount.rotation.x=Math.PI/2;mount.scale.set(1.35,1,.65);
  const trim=mesh(new T.TorusGeometry(2.12,.024,6,64),mat('#c6ac6a',{metalness:.6,roughness:.35}),this.trophyGroup,0,0,-.29);trim.scale.set(1.35,.65,1);
  const f=fishModel(species);f.scale.setScalar(1.4);this.trophyGroup.add(f);
  const label=document.createElement('canvas');label.width=768;label.height=128;const c=label.getContext('2d');c.fillStyle='#d9c99c';c.fillRect(0,0,768,128);c.fillStyle='#284336';c.textAlign='center';c.font='600 33px sans-serif';c.fillText(species.name.toUpperCase(),384,56);c.font='16px sans-serif';c.fillText('CASTWARD FIELD CLUB  /  CATCH & RELEASE',384,96);
  const texture=new T.CanvasTexture(label);texture.colorSpace=T.SRGBColorSpace;mesh(new T.PlaneGeometry(3.1,.52),new T.MeshBasicMaterial({map:texture}),this.trophyGroup,0,-1.85,0);
  const key=new T.PointLight('#fff2d3',38,18,2);key.position.set(1,3,4);this.trophyGroup.add(key);this.trophyGroup.position.set(0,3,4);
 }}

 draw(g,dt){
  const start=performance.now();this.elapsed+=dt;this.lastGame=g;if(this.type!==g.water||this.biome!==g.biome)this.environment(g.water,g.biome);this.syncFish(g.world);
  const night=g.day==='night',dusk=g.day==='dusk',day=g.day==='day';const palette=night?['#071c32','#3c6674']:dusk?['#788cae','#f4ad72']:day?['#7faec5','#d5dfce']:['#83a9b8','#efc287'];
  this.sky.material.uniforms.top.value.set(palette[0]);this.sky.material.uniforms.bottom.value.set(palette[1]);this.water.material.uniforms.skyColor.value.set(palette[1]);this.water.material.uniforms.night.value=night?1:0;
  this.scene.fog.color.set(night?'#274d60':dusk?'#b6a598':day?'#acc5bf':'#c4b99b');this.scene.fog.density=g.weather==='rain'?.024:g.day==='dawn'?.008:.0065;this.sun.intensity=night?.35:day?2:2.5;this.hemi.intensity=night?.8:2.15;this.sunDisc.visible=!night;this.moon.visible=night;this.stars.visible=night;this.sunDisc.position.set(-32,day?65:dusk?14:18,-110);this.sunHalo.position.copy(this.sunDisc.position);this.sunHalo.visible=!night;this.sunHalo.material.opacity=day?.35:.8;this.sun.color.set(night?'#94c5e2':day?'#fff0d3':'#ffd091');this.sun.position.copy(this.sunDisc.position).multiplyScalar(.55);this.water.material.uniforms.sunDir.value.copy(this.sunDisc.position).normalize();this.renderer.toneMappingExposure=night?.9:day?1:1.08;this.contactShadow.visible=this.angler.visible;const lightKey=g.day+g.weather;if(this.lightKey!==lightKey){this.lightKey=lightKey;this.renderer.shadowMap.needsUpdate=true;}
  this.windTime.value=g.reduced?0:this.elapsed;this.water.material.uniforms.time.value=g.reduced?0:this.elapsed;this.floor.material.uniforms.time.value=g.reduced?0:this.elapsed;
  const world=g.world;let leader=world.fish.reduce((a,b)=>a.interest>b.interest?a:b);const following=g.state==='wait'&&leader.interest>.32&&leader.interest<.93;const jumping=g.state==='reel'&&world.jump>0;let cut='bank';if(!g.reduced&&following)cut='underwater';if(!g.reduced&&jumping)cut='jump';if(!g.reduced&&(g.state==='caught'||g.state==='net'))cut='landing';if(this.trophy)cut='trophy';this.cameraMode=cut;this.water.visible=cut!=='trophy';this.floor.visible=cut!=='trophy';this.terrain.visible=cut!=='trophy';
  this.water.material.uniforms.underwater.value=cut==='underwater'?1:0;this.floor.material.uniforms.underwater.value=cut==='underwater'?1:0;this.sky.visible=cut!=='underwater';if(cut==='underwater'){this.sunDisc.visible=this.sunHalo.visible=this.moon.visible=this.stars.visible=false;}
  this.fishes.forEach((m,i)=>{const f=world.fish[i];const hooked=f===world.hooked;let depth=-(.4+(f.depth||1)*.35);if(hooked)depth=jumping?Math.sin((1.3-world.jump)/1.3*Math.PI)*3.1:cut==='landing'?1.1:-.25;m.position.copy(this.position(f,depth));m.rotation.y=-f.angle;m.rotation.z=hooked&&jumping?Math.cos(world.jump*3)*.4:0;m.userData.tail.rotation.y=g.reduced?0:Math.sin(this.elapsed*(hooked?12:5)+i)*.4;m.userData.swim.value=g.reduced?0:this.elapsed*(hooked?12:5)+i;if(g.state==='caught'&&this.releaseStart!=null){const release=Math.min(2,this.elapsed-this.releaseStart);if(hooked){m.position.x+=release*4;m.position.y-=release*1.2;m.rotation.y=-.4;m.userData.swim.value=this.elapsed*14;}}else this.releaseStart=null;m.visible=!this.trophy&&(this.w>=600||hooked||cut==='underwater'||f.interest>.15);});
  const lp=this.position(world.lure,-Math.min(world.depth||1.5,4)*.3);if(world.hooked&&['reel','net'].includes(g.state)){const hookedMesh=this.fishes[world.fish.indexOf(world.hooked)];if(hookedMesh)lp.copy(hookedMesh.localToWorld(V(1,0,0)));}if(world.phase==='flight')lp.y=16*world.flight*(1-world.flight)+.1;const tackle=g.lure||'spoon';this.lure.geometry=this.lureForms[tackle]||this.lureForms.spoon;this.lure.scale.set(tackle==='spoon'?1.4:1,tackle==='spoon'?2.8:1,tackle==='spoon'?.25:1);this.lure.material.color.set(tackle==='fly'?'#786b42':tackle==='spoon'?'#b78a4c':'#a8bbbc');this.lure.rotation.z=tackle==='fly'?1.2:.4;this.lure.rotation.y=this.elapsed*(tackle==='spinner'?9:1);this.lure.position.copy(lp);this.float.position.copy(lp);this.float.position.y=world.phase==='flight'?lp.y:.2+Math.sin(this.elapsed*4)*.04;this.lure.visible=['wait','bite','reel','net'].includes(g.state);this.float.visible=this.lure.visible;
  this.angler.visible=cut==='bank'||cut==='jump';this.angler.position.x=-2+(world.boat-.5)*10;this.angler.rotation.y=-g.rod*.12;this.rodGroup.rotation.z=-g.rod*.28;const castTime=world.flight||0;this.rodGroup.rotation.x=g.state==='aim'?.35+g.power*.65:world.phase==='flight'?(castTime<.24?.85-castTime*8.3:-1.14+Math.exp(-(castTime-.24)*10)*.15):-1.03+(g.state==='reel'?world.tension*.24:0);this.castArm.rotation.x=g.state==='aim'?-.45:world.phase==='flight'?-.45+Math.sin(world.flight*Math.PI)*.65:Math.sin(this.elapsed*1.3)*.025;this.angler.rotation.x=world.phase==='flight'?Math.sin(world.flight*Math.PI)*.08:0;this.chest.scale.y=1+(g.reduced?0:Math.sin(this.elapsed*1.7)*.007);this.rodBend.value=g.state==='reel'?world.tension*.9:world.phase==='flight'?Math.sin(castTime*15)*Math.exp(-castTime*4)*.62:g.state==='aim'?-.16:.035;this.angler.updateMatrixWorld(true);this.rodGroup.localToWorld(this.rodTip.set(0,3.1,this.rodBend.value));
  this.line.visible=this.lure.visible&&!this.trophy;for(let i=0;i<36;i++){const t=i/35;this.temp.lerpVectors(this.rodTip,lp,t);const sag=(g.state==='reel'?1-world.tension:1)*1.6;this.temp.y-=sag*(Math.cosh(1)-Math.cosh((t-.5)*2))/(Math.cosh(1)-1);this.linePositions[i*3]=this.temp.x;this.linePositions[i*3+1]=this.temp.y;this.linePositions[i*3+2]=this.temp.z;}this.line.geometry.attributes.position.needsUpdate=true;this.line.geometry.computeBoundingSphere();
  this.arc.visible=g.state==='aim';if(this.arc.visible){const target=this.position(g.aim,.1),points=[];for(let i=0;i<30;i++){const t=i/29,p=this.rodTip.clone().lerp(target,t);p.y+=16*t*(1-t);points.push(p);}this.arc.geometry.dispose();this.arc.geometry=new T.BufferGeometry().setFromPoints(points);this.arc.computeLineDistances();}
  let cp=V(this.w<600?-1.15:-.6,3.35,11.6),look=V(this.w<600?-.1:0,1.2,-20);if(cut==='underwater'){const p=this.fishes[world.fish.indexOf(leader)].position;cp=p.clone().add(V(2,-.1,2.7));look=p.clone().lerp(lp,.35);}else if(cut==='jump'){const p=this.position(world.lure,1);cp=p.clone().add(V(5,2,7));look=p;}else if(cut==='landing'){const p=this.position(world.lure,1);cp=p.clone().add(V(3,1.1,5));look=p;}else if(cut==='trophy'){cp=V(0,3,12);look=V(0,3,4);}
  const lerp=g.reduced?1:Math.min(1,dt*(cut==='underwater'?12:3.4));this.camera.position.lerp(cp,lerp);this.look.lerp(look,lerp);this.camera.lookAt(this.look);this.trophyGroup.visible=!!this.trophy;if(this.trophy)this.trophyGroup.rotation.y=g.reduced?0:Math.sin(this.elapsed*.35)*.2;
  this.splashData=this.splashData.filter(p=>p.life>0);this.particlePositions.fill(0);this.splashData.forEach((p,i)=>{if(!g.reduced){p.life-=dt;p.v.y-=dt*5;p.p.addScaledVector(p.v,dt);}else p.life=0;this.particlePositions.set([p.p.x,p.p.y,p.p.z],i*3);});this.particles.geometry.attributes.position.needsUpdate=true;this.particles.geometry.setDrawRange(0,this.splashData.length);this.particles.frustumCulled=false;
  if(!g.reduced&&cut==='bank'&&this.elapsed>(this.nextRise||0)){this.nextRise=this.elapsed+(this.lure.visible?1.5:5);const at=this.lure.visible?world.lure:world.fish[Math.floor(this.elapsed)%world.fish.length];const r=this.ripples.find(r=>r.life<=0);if(r){r.life=2;r.age=0;r.ring.position.copy(this.position(at,.17));}}
  for(const r of this.ripples){if(r.life>0){r.age+=dt;r.life-=dt;r.ring.visible=r.age>=0&&cut!=='trophy'&&!g.reduced;const radius=.3+Math.max(0,r.age)*1.8;r.ring.scale.setScalar(radius);r.ring.material.opacity=Math.max(0,r.life/2.5)*.26;r.ring.position.y=.17+Math.sin(this.elapsed)*.015;}else r.ring.visible=false;}
  this.scene.fog.density=cut==='underwater'?.055:this.scene.fog.density;if(cut==='underwater')this.scene.fog.color.set('#367b75');const reflectionKey=g.water+g.biome+g.day+cut;if(this.reflectionKey!==reflectionKey){this.reflectionFrame=0;this.reflectionKey=reflectionKey;}
  if(cut!=='underwater'&&cut!=='trophy'&&this.reflectionFrame++%(this.w<600?10:5)===0){
   const rc=this.reflectionCamera;rc.copy(this.camera);rc.position.y=-this.camera.position.y;rc.up.set(0,1,0);rc.lookAt(this.look.x,-this.look.y,this.look.z);rc.updateMatrixWorld();this.reflectionMatrix.multiplyMatrices(rc.projectionMatrix,rc.matrixWorldInverse);
   const hidden=[this.water,this.floor,this.school,this.angler,this.particles,this.line,this.arc,this.lure,this.float,this.trophyGroup,this.rippleGroup,this.contactShadow],states=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);this.renderer.clippingPlanes=[this.reflectionPlane];this.renderer.setRenderTarget(this.reflectionTarget);this.renderer.render(this.scene,rc);this.renderer.setRenderTarget(null);this.renderer.clippingPlanes=[];hidden.forEach((o,i)=>o.visible=states[i]);this.water.material.uniforms.reflectionReady.value=1;
  }
  this.renderScene(g);this.overlay(g);
  if(dt>0){this.frameTimes.push(g.frameSeconds||dt);if(this.frameTimes.length>=120){const mean=this.frameTimes.reduce((a,b)=>a+b)/this.frameTimes.length;this.fps=Math.round(1/mean);const ordered=this.frameTimes.slice().sort((a,b)=>a-b),sustained=ordered[Math.floor(ordered.length*.75)];this.stableWindows=sustained<.0169?(this.stableWindows||0)+1:0;if(sustained>.0175&&this.scale>.65){this.scale=Math.max(.65,this.scale-.12);this.setQuality(this.quality);this.stableWindows=0;}else if(this.stableWindows>=3&&this.scale<1){this.scale=Math.min(1,this.scale+.04);this.setQuality(this.quality);this.stableWindows=0;}this.frameTimes=[];}}

  this.drawMs=performance.now()-start;
 }
 overlay(g){const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);const p=this.screen(g.world.lure);this.lureScreen=p;
  if(['wait','bite','net'].includes(g.state)){c.strokeStyle=g.state==='bite'?'#ffd775':'#e4e6c7aa';c.lineWidth=1.5;c.beginPath();c.arc(p.x*w,p.y*h,g.state==='net'?27:12,0,Math.PI*2);c.stroke();if(g.state==='net'){c.font='bold 12px sans-serif';c.fillStyle='#fff4cc';c.textAlign='center';c.fillText('NET',p.x*w,p.y*h-35);}}
  if(g.state==='reel'&&this.w>=600){const x=w*.84,y=h*.82;c.strokeStyle='#e3d9b2aa';c.lineWidth=2;c.beginPath();c.arc(x,y,w*.065,0,Math.PI*2);c.stroke();c.font='9px sans-serif';c.fillStyle='#fff1cf';c.textAlign='center';c.fillText('CIRCLE TO REEL',x,y+3);const a=this.elapsed*(g.holding?9:2);c.fillStyle='#ebbf6d';c.beginPath();c.arc(x+Math.cos(a)*w*.065,y+Math.sin(a)*w*.065,5,0,Math.PI*2);c.fill();}
  if(g.world.gear?.sonar&&['lake','flats','offshore','reef'].includes(g.water)){c.fillStyle='#071f24cc';c.fillRect(16,h-142,110,95);c.strokeStyle='#73cbb178';for(let i=1;i<4;i++){c.beginPath();c.moveTo(20,h-142+i*23);c.lineTo(121,h-142+i*23);c.stroke();}c.fillStyle='#8cd5bc';c.font='9px monospace';c.textAlign='left';c.fillText('SONAR / '+(g.world.depth||1.5).toFixed(1)+' m',22,h-127);for(const f of g.world.fish){c.beginPath();c.arc(25+f.x*90,h-110+(f.depth||1)*3,3,0,Math.PI*2);c.fill();}}
 }
 dispose(){this.disposeGroup(this.scene);for(const form of Object.values(this.lureForms))form.dispose();this.waveNormal.dispose();this.reflectionTarget.dispose();this.postTarget.dispose();this.disposeGroup(this.postScene);this.disposeGroup(this.catchScene);this.renderer.dispose();this.layer.remove();}
}
