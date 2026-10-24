/* Y14 ocean (Y13-derived) and atmospheric presentation. No simulation writes or independent clock.
 * Water geometry, normals, vessel excitation and wake height use AtlasOcean13.
 * Planar reflection is an optical approximation, not SSR/ray tracing or fluid CFD.
 */
(function(G){'use strict';
function create(T,scene,renderer,D,software=false){
 const O=G.AtlasOcean13,V=(...a)=>new T.Vector3(...a);
 const finishUniforms={time:{value:0},underwater:{value:0}};
 const U={time:finishUniforms.time,amplitude:{value:O.amplitudes.calm},origin:{value:new T.Vector2()},color:{value:new T.Color('#064654')},horizon:{value:new T.Color('#9fbdc7')},sunDirection:{value:V(.45,.58,.38).normalize()},sunColor:{value:new T.Color('#fff0d6')},under:finishUniforms.underwater,reflection:{value:null},reflectionMatrix:{value:new T.Matrix4()},reflectionOn:{value:0}};
 const cloudGLSL=`float hashSky(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noiseSky(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashSky(i),hashSky(i+vec2(1.,0.)),f.x),mix(hashSky(i+vec2(0.,1.)),hashSky(i+vec2(1.,1.)),f.x),f.y);}float cloudSky(vec2 p){return noiseSky(p)*.55+noiseSky(p*2.1)*.27+noiseSky(p*4.3)*.13+noiseSky(p*8.1)*.05;}`;
 const skyU={zenith:{value:new T.Color('#5486ae')},horizon:U.horizon,sun:U.sunDirection,sunColor:U.sunColor};
 const sky=new T.Mesh(new T.SphereGeometry(4500,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyU,vertexShader:'varying vec3 skyDir;void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 skyDir;uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sun;uniform vec3 sunColor;${cloudGLSL}void main(){vec3 d=normalize(skyDir);float h=pow(max(0.,d.y),.50);vec3 col=mix(horizon,zenith,h);vec2 cp=d.xz/max(d.y+.17,.15)*1.6;float cloud=smoothstep(.54,.78,cloudSky(cp+vec2(3.1,8.7)))*smoothstep(.0,.24,d.y)*.47;col=mix(col,vec3(.85,.88,.87),cloud);float s=max(dot(d,sun),0.);col+=sunColor*(pow(s,2800.)*2.+pow(s,35.)*.12);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`}));sky.name='Y13_Atmosphere';scene.add(sky);
 const bedGLSL='float hill(vec2 p,vec2 c,vec2 r){vec2 q=(p-c)/r;return exp(-dot(q,q));}float bed(vec2 p){return -78.+98.*hill(p,vec2(-1350.,-650.),vec2(520.,620.))+112.*hill(p,vec2(1650.,350.),vec2(680.,850.))+63.*hill(p,vec2(650.,-100.),vec2(220.,260.))+3.*sin(p.x*.004)*sin(p.y*.003);}';
 const material=new T.ShaderMaterial({side:T.DoubleSide,uniforms:U,vertexShader:`uniform float time;uniform float amplitude;uniform vec2 origin;uniform mat4 reflectionMatrix;varying vec3 worldPosition13;varying vec4 reflection13;${O.GLSL}void main(){vec3 p=position;p.xz+=origin;vec3 s=seaWave(p.xz,time,amplitude);p.y=s.x;worldPosition13=p;reflection13=reflectionMatrix*vec4(p,1.);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;uniform float amplitude;uniform vec3 color;uniform vec3 horizon;uniform vec3 sunDirection;uniform vec3 sunColor;uniform float under;uniform float reflectionOn;uniform sampler2D reflection;varying vec3 worldPosition13;varying vec4 reflection13;${O.GLSL}${bedGLSL}
 void main(){vec3 p=worldPosition13;float bottom=bed(p.xz);if(bottom>p.y+.03)discard;
 vec3 w=seaWave(p.xz,time,amplitude);float distanceToEye=length(cameraPosition-p);float detail=exp(-distanceToEye*.004);
 vec2 capillary=detail*.022*vec2(sin(p.x*1.21+p.z*.56-time*2.3)+.4*sin(p.z*2.2-p.x*.97+time*3.1),sin(p.z*1.37-p.x*.41+time*2.6)+.4*sin(p.x*2.03+p.z*.83-time*3.5));
 vec3 n=normalize(vec3(-w.y+capillary.x,1.,-w.z+capillary.y));vec3 eye=normalize(cameraPosition-p);float cosTheta=abs(dot(n,eye));float fresnel=.0203731878+.9796268122*pow(1.-clamp(cosTheta,0.,1.),5.);
 vec3 reflectedSky=mix(horizon,vec3(.12,.24,.35),max(0.,reflect(-eye,n).y)*.65);
 vec2 uv=reflection13.xy/max(reflection13.w,.0001)+n.xz*.012;float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
 vec3 reflected=texture2D(reflection,clamp(uv,.001,.999)).rgb;reflectedSky=mix(reflectedSky,reflected,valid*reflectionOn);
 float shallow=smoothstep(-17.,-.4,bottom);vec3 body=mix(color,vec3(.055,.28,.24),shallow*.55);vec3 col=mix(body,reflectedSky,clamp(fresnel+.09,0.,1.));
 vec3 halfV=normalize(sunDirection+eye);float ggx=pow(max(dot(n,halfV),0.),240.);col+=sunColor*ggx*.75*(1.-under);
 float whitecap=smoothstep(.25,.34,length(w.yz))*amplitude;col=mix(col,vec3(.70,.82,.80),whitecap*.3);
 float mist=1.-exp(-distanceToEye*.00018);col=mix(col,horizon,mist);col=mix(col,vec3(.022,.15,.19)+reflectedSky*.15,under*.72);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
 const water=new T.Mesh(O.waterGeometry(T),material);water.name='Y13_PhaseMatched_Water';water.frustumCulled=false;scene.add(water);
 const target=new T.WebGLRenderTarget(software?256:512,software?256:512,{depthBuffer:true});target.texture.colorSpace=T.LinearSRGBColorSpace;U.reflection.value=target.texture;
 const mirrorCamera=new T.PerspectiveCamera(),plane=new T.Plane(V(0,1,0),-.015),normal=V(0,1,0),dir=V(),up=V(),eye=V(),look=V();let reflectionCalls=0,renderCalls=0,lastReflectionFrame=-999;const matrix=new T.Matrix4();
 function reflect(camera,frame,exclude=[],quality='auto'){
  renderCalls++;if(camera.position.y<.3||quality==='smooth'||(software&&quality!=='high')){U.reflectionOn.value=0;return;}
  if(frame-lastReflectionFrame<(software?12:6)&&U.reflectionOn.value)return;
  camera.updateMatrixWorld();mirrorCamera.copy(camera);mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);mirrorCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);mirrorCamera.position.copy(camera.position);mirrorCamera.position.y*=-1;
  camera.getWorldDirection(dir);look.copy(camera.position).add(dir);look.y*=-1;up.copy(camera.up).transformDirection(camera.matrixWorld).reflect(normal);mirrorCamera.up.copy(up);mirrorCamera.lookAt(look);mirrorCamera.updateMatrixWorld(true);
  matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);matrix.multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);U.reflectionMatrix.value.copy(matrix);
  const hidden=[water,...exclude],visibility=hidden.map(o=>o.visible),previousTarget=renderer.getRenderTarget(),previousPlanes=renderer.clippingPlanes,previousShadow=renderer.shadowMap.autoUpdate,previousClear=renderer.autoClear;
  try{hidden.forEach(o=>o.visible=false);renderer.clippingPlanes=[plane];renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,mirrorCamera);reflectionCalls++;U.reflectionOn.value=1;lastReflectionFrame=frame;}
  finally{hidden.forEach((o,i)=>o.visible=visibility[i]);renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previousPlanes;renderer.shadowMap.autoUpdate=previousShadow;renderer.autoClear=previousClear;}
 }
 const wake=new T.Group();wake.name='Y13_PathFollowing_Foam';scene.add(wake);const wakeData=[];let key=null,lastSeq=-1;
 const geometry=new T.BufferGeometry(),verts=new Float32Array(32*2*2*3),rgba=new Float32Array(32*2*2*4),indices=[];
 for(let side=0;side<2;side++)for(let i=0;i<31;i++){const a=side*64+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 geometry.setAttribute('position',new T.BufferAttribute(verts,3));geometry.setAttribute('color',new T.BufferAttribute(rgba,4));geometry.setIndex(indices);geometry.setDrawRange(0,0);
 const wakeMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexColors:true,vertexShader:'attribute vec4 color;varying vec4 foamColor;void main(){foamColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec4 foamColor;void main(){gl_FragColor=foamColor;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 // A custom vec4 color attribute carries alpha; vertexColors is disabled to avoid a duplicate built-in color declaration.
 wakeMat.vertexColors=false;
 const wakeMesh=new T.Mesh(geometry,wakeMat);wakeMesh.frustumCulled=false;wake.add(wakeMesh);
 function update(state,p,sea,camera,instance){
  const t=state?.elapsed||0;U.time.value=t;U.amplitude.value=O.amplitudes[sea]||O.amplitudes.calm;U.under.value=camera.position.y<(O.height(camera.position.x,camera.position.z,t,sea)-.12)?1:0;
  sky.visible=!U.under.value;wake.visible=!U.under.value;
  if(!state){geometry.setDrawRange(0,0);return;}
  U.origin.value.set(Math.round(state.x/8)*8,Math.round(state.z/8)*8);
  if(key!==instance||state.sequence<lastSeq){wakeData.length=0;key=instance;lastSeq=-1;lastReflectionFrame=-999;}
  const newest=wakeData[0];if(state.sequence!==lastSeq&&(!newest||t-newest.t>=.45)){
   const speed=Math.hypot(state.speedMps,state.swayMps);if(state.depthM<1.2&&speed>.25){const c=Math.cos(state.heading),s=Math.sin(state.heading);wakeData.unshift({x:state.x-c*p.length*.46,z:state.z-s*p.length*.46,h:state.heading,t,speed});if(wakeData.length>32)wakeData.pop();}lastSeq=state.sequence;
  }
  for(let side=0;side<2;side++)for(let i=0;i<32;i++){
   const q=wakeData[Math.min(i,wakeData.length-1)];if(!q)continue;const age=t-q.t,fade=Math.exp(-age/6)*Math.min(1,q.speed/4),sign=side?1:-1;const center=sign*(p.beam*.40+age*q.speed*.12),half=Math.max(.08,p.beam*.035+age*.17);
   for(let edge=0;edge<2;edge++){const b=center+(edge?half:-half),x=q.x-Math.sin(q.h)*b,z=q.z+Math.cos(q.h)*b,j=(side*64+i*2+edge)*3,k=(side*64+i*2+edge)*4;verts[j]=x;verts[j+1]=O.height(x,z,t,sea)+.035;verts[j+2]=z;rgba[k]=.70;rgba[k+1]=.82;rgba[k+2]=.81;rgba[k+3]=fade*.24*(edge?.55:1);}
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.setDrawRange(0,wakeData.length>1?indices.length:0);
 }
 function lighting(mood){const golden=mood==='golden',night=mood==='night';skyU.zenith.value.set(night?'#233b60':golden?'#637d98':'#5486ae');U.horizon.value.set(night?'#61748d':golden?'#c7b294':'#9fbdc7');U.color.value.set(night?'#062d40':golden?'#164b54':'#064654');U.sunColor.value.set(golden?'#ffd0a0':night?'#9abadd':'#fff0d6');lastReflectionFrame=-999;}
 function environment(){const pm=new T.PMREMGenerator(renderer),s=new T.Scene(),copy=sky.clone();copy.visible=true;s.add(copy);const env=pm.fromScene(s,.04);pm.dispose();return env.texture;}
 return {water,sky,wake,U,finishUniforms,update,reflect,lighting,environment,inspect:()=>({reflectionCalls,renderCalls,reflectionEnabled:U.reflectionOn.value===1,reflectionSize:target.width,softwareAutoReflectionDisabled:software,wakeSamples:wakeData.length,waveSurfaceShared:true,phaseOrigin:U.origin.value.toArray()})};
}
const API={create};G.AtlasEnvironment13=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
