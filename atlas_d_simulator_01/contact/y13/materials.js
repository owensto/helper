/* Per-vessel finishing, not replacement original geometry. Procedural physical-scale
 * grain is bound to the evaluated vessel frame, so it does not swim as boats move. */
(function(G){'use strict';
function create(T,sea){const shaders=[],owned=[];let targetMatrix=new T.Matrix4();
 function physical(base,over){const m=base.isMeshPhysicalMaterial?base.clone():new T.MeshPhysicalMaterial({color:base.color,roughness:base.roughness,metalness:base.metalness});for(const k of ['map','normalMap','roughnessMap','metalnessMap','side','alphaTest','transparent','opacity','depthWrite'])if(base[k]!==undefined)m[k]=base[k];if(base.emissive)m.emissive.copy(base.emissive);if(base.emissiveIntensity!=null)m.emissiveIntensity=base.emissiveIntensity;Object.assign(m,over);return m;}
 function decorate(m,kind){m.userData.realismKind=kind;m.onBeforeCompile=sh=>{sh.uniforms.realismFrame={value:targetMatrix};sh.uniforms.realismTime={value:0};sh.uniforms.realismSea={value:.18};shaders.push(sh);sh.vertexShader='varying vec3 realismWorld;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n realismWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.fragmentShader=`varying vec3 realismWorld;uniform mat4 realismFrame;uniform float realismTime;uniform float realismSea;${sea.glsl}\nfloat grain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,43.177)))*43758.5453);}\n`+sh.fragmentShader;
 const color=kind==='teak'?`float seam=1.-smoothstep(.002,.006,abs(fract(lp.z/.13)-.5)*.13);float plank=floor(lp.z/.13);float wood=.94+.06*sin(lp.x*5.1+plank*13.)+.025*sin(lp.x*133.+plank);diffuseColor.rgb*=mix(wood,.24,seam);`:
 kind==='sub'?`float sx=abs(fract(lp.x/.85)-.5)*.85;float sy=abs(fract(lp.y/.55)-.5)*.55;float seam=1.-smoothstep(.003,.012,min(sx,sy));diffuseColor.rgb*=mix(.96,.82,seam);`:
 kind==='naval'?`float streak=.97+.018*sin(lp.x*13.1+.4*sin(lp.y*.7))+.012*sin(lp.z*11.);diffuseColor.rgb*=streak;`:
 kind==='paint'?`diffuseColor.rgb*=.985+.015*sin(lp.x*.61)*sin(lp.y*2.7);`:'';
 sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec3 lp=(realismFrame*vec4(realismWorld,1.)).xyz;${color}\nfloat seaY=seaSample(realismWorld.xz,realismTime,realismSea).x;float wet=1.-smoothstep(-.12,.30,realismWorld.y-seaY);diffuseColor.rgb*=mix(1.,.72,wet);`);
 if(['paint','naval','sub','teak'].includes(kind))sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,max(.15,roughnessFactor*.58),wet);');
 sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>\nfloat dist=length(cameraPosition-realismWorld);float waterPath=0.;if(cameraPosition.y<0.&&realismWorld.y<0.)waterPath=dist;else if(realismWorld.y<0.)waterPath=dist*clamp(-realismWorld.y/max(cameraPosition.y-realismWorld.y,.001),0.,1.);else if(cameraPosition.y<0.)waterPath=dist*clamp(-cameraPosition.y/max(realismWorld.y-cameraPosition.y,.001),0.,1.);vec3 trans=exp(-vec3(.072,.032,.018)*waterPath);gl_FragColor.rgb=gl_FragColor.rgb*trans+vec3(.035,.17,.22)*(1.-trans);`);
 };m.customProgramCacheKey=()=>`y13-${kind}`;return m;}
 function finish(root,p){shaders.length=0;root.traverse(o=>{if(!o.isMesh)return;let hidden=false,hull=false;for(let n=o;n;n=n.parent){if(/^(SYS_|ENG_|INT_|FX_)/.test(n.name))hidden=true;if(/Hull/.test(n.name))hull=true;}if(hidden){o.visible=false;return;}
 const source=Array.isArray(o.material)?o.material:[o.material];const mapped=source.map(a=>{const n=(a.name||'').toLowerCase();let kind='metal',over={};
 if(n.includes('glass')){kind='glass';over={color:new T.Color('#abc7cc'),roughness:.065,metalness:0,transparent:false,opacity:1,depthWrite:true,transmission:.78,thickness:.015,ior:1.5,clearcoat:1};}
 else if(p.key==='pod'){kind=/fabric/.test(n)?'fabric':/paint|hull/.test(n)?'paint':'metal';}
 else if(n.includes('teak')){kind='teak';over={color:new T.Color('#977249'),roughness:.78,metalness:0,clearcoat:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};}
 else if(n==='sub'){kind='sub';over={color:new T.Color('#253e46'),roughness:.67,metalness:0,clearcoat:.10};}
 else if(n==='naval'){kind='naval';over={color:new T.Color(hull?'#617582':'#819097'),roughness:.57,metalness:.02,clearcoat:.04};}
 else if(n.includes('darkdeck')){kind='naval';over={color:new T.Color('#344249'),roughness:.93,metalness:0};}
 else if(p.key==='d'&&hull){kind='paint';over={color:new T.Color('#1c3b50'),roughness:.24,metalness:.05,clearcoat:.85,clearcoatRoughness:.14};}
 else if(p.key==='d'&&/ceramic|pearl|white/.test(n)){kind='paint';over={color:new T.Color('#e4e2d6'),roughness:.31,metalness:0,clearcoat:.45,clearcoatRoughness:.19};}
 else if(/chrome|silver/.test(n)){kind='metal';over={metalness:.88,roughness:.28};}
 const m=decorate(physical(a,over),kind);m.name=a.name;return m;});o.material=Array.isArray(o.material)?mapped:mapped[0];o.castShadow=!mapped.some(m=>m.transmission>.1||m.transparent);o.receiveShadow=true;});}
 function update(player,state,seaName){if(!player||!state)return;targetMatrix.copy(player.matrixWorld).invert();for(const sh of shaders){sh.uniforms.realismTime.value=state.elapsed;sh.uniforms.realismSea.value=sea.scales[seaName]??.18;}}
 return {finish,decorate,update,stats:()=>({compiledMaterials:shaders.length})};}
G.AtlasRealismMaterials={create};
})(typeof window!=='undefined'?window:globalThis);
