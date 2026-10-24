/* Render-only finish layer. Original mesh/animation/scale/asset bytes unchanged.
 * Optical/detail parameters are authored art assumptions, not measured material data.
 */
(function(G){'use strict';
const RULES=Object.freeze({
 enamel:{roughness:.25,metalness:0,clearcoat:.82,clearcoatRoughness:.16},
 naval:{roughness:.63,metalness:0,clearcoat:.12,clearcoatRoughness:.42},
 rubber:{roughness:.78,metalness:0,clearcoat:0},
 steel:{roughness:.25,metalness:.94,clearcoat:0},
 bronze:{roughness:.31,metalness:.9,clearcoat:0},
 teak:{roughness:.72,metalness:0,clearcoat:.12},
 fabric:{roughness:.91,metalness:0,clearcoat:0},
 window:{roughness:.085,metalness:0,clearcoat:1,clearcoatRoughness:.045},
 acrylic:{roughness:.045,metalness:0,clearcoat:1,ior:1.49,transmission:.94,thickness:.035,attenuationDistance:4},
 deck:{roughness:.88,metalness:0,clearcoat:0}
});
function classify(name,key,node=''){
 const n=name.toLowerCase();
 if(/panoramic_canopy/i.test(node))return 'acrylic';
 if(/Canopy_seal|Silver_thruster_ring|Propeller_hub|Landing_skid|Canopy_fastener|Machined_canopy_flange|Propulsor_guard|Skid_attachment_strut/i.test(node))return 'steel';
 if(/canopy_gasket|Seat_armrest|thruster_duct_inner/i.test(node))return 'rubber';
 if(/Seat_cushion|Seat_back|Seat_headrest/i.test(node))return 'fabric';
 if(/glass/.test(n))return 'window';
 if(/chrome|titanium|stainless|silver/.test(n))return 'steel';
 if(/bronze/.test(n))return 'bronze';
 if(/teak/.test(n))return 'teak';
 if(/linen|fabric|ivory_seat/.test(n+' '+node.toLowerCase()))return 'fabric';
 if(/darkdeck|landing surface/.test(n))return 'deck';
 if(n==='sub' || /rubber|black|shadow gaps/.test(n))return 'rubber';
 if(n==='naval')return 'naval';
 return 'enamel';
}
function decorateShader(material,kind,shared,T){
 const code={teak:1,naval:2,rubber:3,fabric:4,deck:5}[kind]||0;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uOceanTime=shared.time;shader.uniforms.uUnderwater=shared.underwater;
  shader.uniforms.uFinishKind={value:code};
  shader.vertexShader='varying vec3 vFinishLocal;varying vec3 vFinishWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishLocal=position;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vFinishWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader='varying vec3 vFinishLocal;varying vec3 vFinishWorld;uniform float uOceanTime;uniform float uUnderwater;uniform float uFinishKind;float grainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(uFinishKind>.5 && uFinishKind<1.5){
    float plank=floor(vFinishLocal.z/.145);float across=fract(vFinishLocal.z/.145);float len=fract((vFinishLocal.x+mod(plank,3.)*.64)/2.1);
    float caulk=1.-smoothstep(.008,.023,min(across,1.-across));float end=1.-smoothstep(.002,.007,min(len,1.-len));
    float grain=.025*sin(vFinishLocal.x*31.+sin(vFinishLocal.z*200.))+ .018*sin(vFinishLocal.x*85.+vFinishLocal.z*450.);
    float tone=.92+.14*grainHash(vec2(plank,floor((vFinishLocal.x+mod(plank,3.)*.64)/2.1)));
    diffuseColor.rgb*=tone+grain;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.04,.034,.027),max(caulk*.72,end*.5));
   }else if(uFinishKind>2.5 && uFinishKind<3.5){
    float seam=1.-smoothstep(.006,.014,min(fract(vFinishLocal.x/.8),1.-fract(vFinishLocal.x/.8)));
    diffuseColor.rgb*=.96+.04*grainHash(floor(vFinishLocal.xz*80.));diffuseColor.rgb*=1.-seam*.09;
   }else if(uFinishKind>1.5){diffuseColor.rgb*=.94+.06*grainHash(floor(vFinishLocal.xz*130.));}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float wetLine=(1.-smoothstep(-.16,.20,vFinishWorld.y));roughnessFactor=mix(roughnessFactor,roughnessFactor*.70,wetLine);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   if(uUnderwater>.5){float d=length(vFinishWorld-cameraPosition);vec3 tr=exp(-vec3(.065,.022,.012)*d);float depth=max(0.,-vFinishWorld.y);float downLight=exp(-depth*.018);outgoingLight=outgoingLight*tr*downLight+vec3(.009,.080,.105)*(vec3(1.)-tr);}
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'atlas-realism14-'+kind;
}
function apply(T,root,p,shared){
 const audit=[],cache=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const src=Array.isArray(o.material)?o.material:[o.material];
  const mats=src.map(old=>{
   if(old.isMeshBasicMaterial)return old;
   const kind=classify(old.name||'',p.key,o.name),r=RULES[kind],opts={color:old.color?.clone()||new T.Color('#e7e6de'),name:old.name||o.name,side:old.side,...r};
   const cacheKey=[old.uuid,kind,p.key,/FIXED_Hull/.test(o.name),/baby_blue_hull|thruster_nacelle|Tail_stabilizer/.test(o.name),/Lower_protective_keel/.test(o.name)].join(':');
   if(cache.has(cacheKey)){const cached=cache.get(cacheKey);audit.push({node:o.name,kind,reused:true});return cached;}
   const m=new T.MeshPhysicalMaterial(opts);cache.set(cacheKey,m);
   for(const k of ['map','normalMap','normalScale','aoMap','aoMapIntensity','bumpMap','bumpScale','roughnessMap','metalnessMap','alphaMap','alphaTest'])if(old[k]!=null)m[k]=old[k];
   if(old.emissive){m.emissive.copy(old.emissive);m.emissiveIntensity=old.emissiveIntensity||0;}
   if(p.key==='d'&&/FIXED_Hull/.test(o.name)){m.color.set('#1f4861');m.roughness=.26;m.clearcoat=.86;}
   if(p.key==='d'&&/Ceramic_pearl/.test(old.name||''))m.color.set('#d8dfdc');
   if(kind==='window'){m.color.set('#17333f');m.ior=1.5;m.opacity=1;m.transparent=false;m.transmission=0;}
   if(kind==='teak'){m.color.set('#9b7850');m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;}
   if(kind==='fabric')m.color.set('#d4c9b7');
   if(kind==='rubber'&&p.key==='n')m.color.set('#172b33');
   if(kind==='naval')m.color.set('#78858b');
   if(p.key==='w'&&kind==='enamel'){m.roughness=.60;m.clearcoat=.08;}
   if(kind==='acrylic'){m.color.set('#f0f9fc');m.attenuationColor=new T.Color('#b1e1e8');m.transparent=false;m.depthWrite=true;m.side=T.DoubleSide;}
   if(p.key==='pod'&&/baby_blue_hull|thruster_nacelle|Tail_stabilizer/.test(o.name)){m.color.set('#78bee2');m.clearcoat=.9;m.roughness=.22;}
   if(/Lower_protective_keel/.test(o.name)){m.color.set('#193c4f');m.roughness=.65;m.clearcoat=.1;}
   decorateShader(m,kind,shared,T);
   audit.push({node:o.name,source:old.name,kind,roughness:m.roughness,metalness:m.metalness,transmission:m.transmission});return m;
  });o.material=Array.isArray(o.material)?mats:mats[0];o.castShadow=!mats.some(m=>m.transmission>.5||m.transparent);o.receiveShadow=true;
 });return audit;
}
const API={RULES,classify,apply};G.AtlasMaterials13=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
