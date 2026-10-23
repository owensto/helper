/* Restrained, anti-aliased surface treatment. No change to world geometry or depth.
 * Realistic graphics remains an aim; GPU appearance requires rendered review. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasHarborFinish=a;})(globalThis,()=>{'use strict';
function reflection(shader){const old='vec2 uv12=vReflect12.xy/vReflect12.w+surf09.xz*.013;';if(!shader.includes(old))throw Error('Reflection shader anchor changed');
 let s=shader.replace(old,'vec2 uv12=vReflect12.xy/vReflect12.w+surf09.xz*.0035;');
 const line='vec3 rr12=texture2D(reflection12,clamp(uv12,.005,.995)).rgb;';if(!s.includes(line))throw Error('Reflection fetch changed');
 s=s.replace(line,`vec2 du12=vec2(1./512.,1./256.);vec2 ruv12=clamp(uv12,vec2(.008),vec2(.992));
vec3 rr12=texture2D(reflection12,ruv12).rgb*.40;
rr12+=(texture2D(reflection12,ruv12+vec2(du12.x,0.)).rgb+texture2D(reflection12,ruv12-vec2(du12.x,0.)).rgb+texture2D(reflection12,ruv12+vec2(0.,du12.y)).rgb+texture2D(reflection12,ruv12-vec2(0.,du12.y)).rgb)*.15;`);
 s=s.replace('valid12*fresnel09*.85*(1.-foam11)','valid12*fresnel09*.52*(1.-foam11)');return s;
}
function material(kind,sh){if(!['wood','dockFloat','bank','land','paving','roof'].includes(kind))return false;const a='#include <color_fragment>';if(!sh.fragmentShader.includes(a))throw Error('Material color anchor missing');
 const code=['wood','dockFloat'].includes(kind)?`
// Broad individual-board value variation; thin seams fade below pixel resolution.
vec2 h4p=coastP14.xz;float h4rows=h4p.y/.22;float h4fw=max(fwidth(h4rows),.001);float h4joint=1.-smoothstep(.025,.025+h4fw,min(fract(h4rows),1.-fract(h4rows)));
float h4board=h14(vec2(floor(h4rows),floor(h4p.x/2.8)));
diffuseColor.rgb*=mix(.91,1.06,h4board)*(1.-.12*h4joint*(1.-smoothstep(.12,.8,h4fw)));
`:`
float h4broad=n14(coastP14.xz*.30),h4fine=n14(coastP14.xz*3.1);
float h4fade=1.-smoothstep(35.,130.,length(vViewPosition));
diffuseColor.rgb*=.94+.09*h4broad+(.04*h4fine-.02)*h4fade;
`;
 sh.fragmentShader=sh.fragmentShader.replace(a,a+code);return true;
}
return Object.freeze({reflection,material});});
