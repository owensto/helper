/* Zero new textures/meshes. Optical and wind cues use the existing materials,
 * time and weather. Pixel-sized detail fades instead of adding distant shimmer. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasSurface5=a;})(globalThis,()=>{'use strict';
function coastal(kind,sh){
 if(['marsh','moss','leaves'].includes(kind)){
  sh.vertexShader='uniform float coastTime14;uniform float coastWind14;\n'+sh.vertexShader;
  const a='coastP14=(modelMatrix*vec4(transformed,1.)).xyz;';if(!sh.vertexShader.includes(a))throw Error('Plant material anchor changed');
  const weight=kind==='marsh'?'clamp((coastP14.y-.7)/1.8,0.,1.)':kind==='moss'?'0.65':'0.22';
  sh.vertexShader=sh.vertexShader.replace(a,a+`float plantWeight5=${weight};float bend5=sin(coastP14.x*.39+coastP14.z*.27+coastTime14*1.6)*.075*min(coastWind14*.18,1.5)*plantWeight5;
transformed.x+=bend5/max(.00001,length(modelMatrix[0].xyz));transformed.z+=bend5*.45/max(.00001,length(modelMatrix[2].xyz));coastP14=(modelMatrix*vec4(transformed,1.)).xyz;`);
 }
 if(['land','bank','seawall'].includes(kind)){
  const a='#include <color_fragment>';if(!sh.fragmentShader.includes(a))throw Error('Shoreline material anchor changed');
  sh.fragmentShader=sh.fragmentShader.replace(a,a+`\nfloat tideEdge5=1.-smoothstep(coastTide14+.02,coastTide14+.32,coastP14.y);float tideBand5=smoothstep(coastTide14-.38,coastTide14+.01,coastP14.y)*tideEdge5;
float edgeNoise5=n14(coastP14.xz*.7);diffuseColor.rgb*=1.-tideBand5*(.08+.08*edgeNoise5);`);
 }
}
function water(sh){
 sh.fragmentShader='uniform float propLoad5;uniform vec4 propPose5;\n'+sh.fragmentShader;
 const a='float foam11=clamp(';if(!sh.fragmentShader.includes(a))throw Error('Water foam anchor changed');
 sh.fragmentShader=sh.fragmentShader.replace(a,`vec2 propDelta5=vDryWorld.xz-propPose5.xy;float aft5=-dot(propDelta5,propPose5.zw),side5=dot(propDelta5,vec2(-propPose5.w,propPose5.z));
float jetWidth5=.28+max(0.,aft5)*.19;float jet5=propLoad5*smoothstep(-.2,.3,aft5)*(1.-smoothstep(1.8,4.0,aft5))*exp(-side5*side5/(jetWidth5*jetWidth5))*(.22+.12*grain11);
wakeFoam12=max(wakeFoam12*mix(.18,1.,propLoad5),jet5);\n`+a);
 // Existing five taps remain, but soften an obvious image-edge rectangle.
 const mix='valid12*fresnel09*.52*(1.-foam11)';if(!sh.fragmentShader.includes(mix))throw Error('Reflection blend anchor changed');
 sh.fragmentShader=sh.fragmentShader.replace(mix,'valid12*smoothstep(0.,.065,min(min(uv12.x,1.-uv12.x),min(uv12.y,1.-uv12.y)))*fresnel09*.44*(1.-foam11)');
}
return Object.freeze({coastal,water});});
