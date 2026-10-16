/* Wave geometry + depth-dependent transparency over a real bottom mesh.
 * One shared wave field and bathymetry, not a flat blue plane over fake readings. */
(()=>{'use strict';function install(){if(!window.SEA08?.ready||!SEA06.inspect().waterMask)return setTimeout(install,100);
 const A=BAYPLAY,T=ATLASRuntime,S=A.state,W=Sea09World,coast=A.coast,mat=coast.water.material;
 const report={ready:false,terrainVertices:0,terrainRebuilds:0,knownSamples:0,renderedBottom:true,referenceSurvey:false};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=129;const ctx=canvas.getContext('2d'),img=ctx.createImageData(129,129);
 const tex=new T.CanvasTexture(canvas);tex.generateMipmaps=false;
 const origin={value:new T.Vector2()},bathymetry={value:tex},tide={value:0},clarity={value:.23},clock={value:0};let tile='',compiled=null;
 const g=new T.PlaneGeometry(512,512,128,128);g.rotateX(-Math.PI/2);const pos=g.attributes.position,colors=new Float32Array(pos.count*3);g.setAttribute('color',new T.BufferAttribute(colors,3));
 const sand=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide});
 sand.onBeforeCompile=sh=>{sh.uniforms.groundClock09=clock;sh.vertexShader='varying vec3 g09;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','g09=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
 sh.fragmentShader='uniform float groundClock09;varying vec3 g09;\n'+sh.fragmentShader;
 sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float ripple09=.5+.5*sin(g09.x*4.2+sin(g09.z*1.3)*.8);diffuseColor.rgb*=.88+.12*ripple09;
 float cx09=sin(g09.x*2.1+sin(g09.z*1.7+groundClock09*.48)*1.3+groundClock09*.21);
 float cz09=sin(g09.z*2.6+cos(g09.x*1.9-groundClock09*.37)*1.1);
 float c09=pow(1.-abs(cx09*cz09),18.);
 diffuseColor.rgb+=vec3(.035,.044,.030)*c09*exp(min(0.,g09.y)*.38)*step(g09.y,0.);`);};
 const bed=new T.Mesh(g,sand);bed.name='SEA09_SHARED_BATHYMETRY';bed.receiveShadow=true;A.scene.add(bed);report.terrainVertices=pos.count;
 origin.value.set(1e8,1e8);const rebuild=SEA13_STREAM.bindTerrain({A,T,g,pos,bed,ctx,img,tex,origin,report});
 // Retain the proven hull-local dry-interior mask from the previous build.
 const compile=mat.onBeforeCompile.bind(mat);mat.onBeforeCompile=sh=>{compile(sh);compiled=sh;sh.uniforms.bottom09=bathymetry;sh.uniforms.origin09=origin;sh.uniforms.tide09=tide;sh.uniforms.clarity09=clarity;
  sh.vertexShader=sh.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 vec2 wp09=position.xz+uWorldOffset;
 vec2 slope11=seaSlope11(wp09);float dx09=slope11.x;float dz09=slope11.y;
 objectNormal=normalize(vec3(-dx09,1.,-dz09));`);
  sh.fragmentShader='uniform sampler2D bottom09;uniform vec2 origin09;uniform float tide09;uniform float clarity09;\n'+sh.fragmentShader;
  sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 uv09=(vBayWorld.xz-origin09+vec2(256.))/512.;vec4 b09=texture2D(bottom09,vec2(uv09.x,1.-uv09.y));
 float bed09=(b09.r*65280.+b09.g*255.)/65535.*128.-64.;
 float known09=step(0.,uv09.x)*step(0.,uv09.y)*step(uv09.x,1.)*step(uv09.y,1.)*step(.99,b09.b);
 float depth09=mix(20.,max(0.,vBayWorld.y+tide09-bed09),known09);
 if(known09>.5&&vBayWorld.y+tide09<bed09-.02)discard;
 vec3 eye09=normalize(cameraPosition-vDryWorld);
 vec3 surf09=normalize(cross(dFdx(vDryWorld),dFdy(vDryWorld)));
 float fresnel09=.025+.93*pow(1.-abs(dot(surf09,eye09)),5.);
 diffuseColor.rgb=mix(vec3(.13,.47,.43),vec3(.018,.18,.23),1.-exp(-depth09*.19));
 diffuseColor.a=clamp(1.-exp(-depth09*clarity09)*(1.-fresnel09),.10,.995);`);
 };
 mat.customProgramCacheKey=()=> 'atlas-water09-shared-bottom-v1';mat.transparent=true;mat.depthWrite=false;mat.opacity=1;mat.color.set('#ffffff');mat.roughness=.18;mat.metalness=.12;mat.normalScale.set(.36,.36);mat.needsUpdate=true;coast.water.renderOrder=2;coast.water.geometry.dispose();coast.water.geometry=new T.PlaneGeometry(1800,1800,240,240);coast.water.geometry.rotateX(-Math.PI/2);
 const wg=coast.water.geometry,wp=wg.attributes.position,wu=wg.attributes.uv;
 const warp=v=>{const n=Math.abs(v)/7.5;return Math.sign(v)*(n<=80?n*.5:40+860*Math.pow((n-80)/40,2));};
 for(let i=0;i<wp.count;i++){const x=warp(wp.getX(i)),z=warp(wp.getZ(i));wp.setX(i,x);wp.setZ(i,z);wu.setXY(i,x/1800+.5,.5-z/1800);}
 wp.needsUpdate=true;wu.needsUpdate=true;wg.computeBoundingSphere();report.nearWaterGridMetres=.5;report.waterVertices=wp.count;

 // Distant water remains opaque. Keep it below bathymetry, not through shallows.
 const previous=SEA06.beforeRender.bind(SEA06);SEA06.beforeRender=()=>{previous();rebuild();tide.value=S.location==='beaufort'?(S.config.tide||0):0;clock.value=S.elapsed;
 const wx=Math.round(S.x/2)*2,wz=Math.round(S.z/2)*2;coast.water.position.set(wx,tide.value,wz);
 if(coast.waterShader)coast.waterShader.uniforms.uWorldOffset.value.set(wx,wz);
 const normal=coast.water.material.normalMap;if(normal)normal.offset.set(S.elapsed*.0011+wx/1800*normal.repeat.x,S.elapsed*.0007-wz/1800*normal.repeat.y);
 coast.ocean.visible=true;coast.ocean.position.y=-8;};
 window.SEA09_WATER={ready:true,inspect:()=>({...report,shaderCompiled:!!compiled,turbidity:clarity.value,origin:origin.value.toArray()}),setClarity(v){clarity.value=Math.max(.10,Math.min(.9,Number(v)||.23));},sample:()=>W.inspect(S),bed};rebuild();report.ready=true;
 }install();})();
