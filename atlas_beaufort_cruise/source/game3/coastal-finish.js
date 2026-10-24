/* Distance-filtered material detail on the existing land; no new geography/colliders.
   Analytic detail normals and roughness, not replacement geometry or photogrammetry. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasCoastalFinish=a;})(globalThis,()=>{'use strict';
const supported=new Set(['land','bank','wood','dockFloat','building','roof','paving','trunk']);
function apply(kind,sh){if(!supported.has(kind))return false;
 const anchor='#include <normal_fragment_maps>',rough='#include <roughnessmap_fragment>';
 if(!sh.fragmentShader.includes(anchor)||!sh.fragmentShader.includes(rough))throw Error('Coastal material shader contract changed.');
 if(sh.fragmentShader.includes('g3DetailFade'))throw Error('Coastal finish already installed.');
 const wood=['wood','dockFloat','trunk'].includes(kind),strength=wood?.055:kind==='bank'?.08:kind==='land'?.045:.023;
 // World-space projections stay continuous across streamed mesh chunks. Fine
 // grain tapers with pixel footprint and distance instead of shimmering at range.
 const detail=`\nfloat g3Dist=length(vViewPosition);float g3DetailFade=1.-smoothstep(28.,100.,g3Dist);
 vec3 g3P=coastP14;float g3Freq=${wood?'18.0':'7.0'};
 float g3Footprint=max(fwidth(g3P.x),max(fwidth(g3P.y),fwidth(g3P.z)))*g3Freq;
 g3DetailFade*=1.-smoothstep(.25,1.5,g3Footprint);
 vec3 g3Grad=vec3(sin(g3P.x*g3Freq+g3P.z*.73),sin(g3P.y*5.7+g3P.x*.3)*.4,cos(g3P.z*g3Freq+g3P.x*.61));
 vec3 g3ViewGrad=mat3(viewMatrix)*g3Grad;
 normal=normalize(normal-(g3ViewGrad-normal*dot(normal,g3ViewGrad))*${strength.toFixed(3)}*g3DetailFade);
`;
 sh.fragmentShader=sh.fragmentShader.replace(anchor,anchor+detail);
 const wet=kind==='land'||kind==='bank'?'max(coastWet14,1.-smoothstep(coastTide14+.04,coastTide14+.42,coastP14.y))':'coastWet14';
 sh.fragmentShader=sh.fragmentShader.replace(rough,rough+`\nfloat g3Wet=clamp(${wet},0.,1.);roughnessFactor=clamp(roughnessFactor*(1.-g3Wet*.23),.48,1.);\n`);
 return true;
}
return Object.freeze({apply,supported:[...supported]});});
