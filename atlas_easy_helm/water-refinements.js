/* Single-clock water refinements for the pinned standalone Sea13 preview.
 * Smooth wake birth/death is shared by buoyancy sampling and the water shader.
 * Optics corrects the shallow-water path using refraction, not global opacity.
 * No new wake emitter, boat integrator, depth data, terrain, or survey claims.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AtlasWaterRefinements=api;if(root.Sea12Waves)root.ATLAS_WAKE_V4=api.installWaves(root.Sea12Waves);}})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function smooth(a,b,x){const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);}
function envelope(age){if(!Number.isFinite(age)||age<=0||age>=6.0)return 0;return smooth(0,.35,age)*(1-smooth(4.8,6.0,age));}
function sampleWake(packets,x,z,t){let height=0,dx=0,dz=0;if(![x,z,t].every(Number.isFinite))return{height,dx,dz};
 for(const p of packets){const age=t-p.t,ease=envelope(age);if(!ease)continue;const rx=x-p.x,rz=z-p.z,r=Math.hypot(rx,rz),front=rx*p.c+rz*p.s;if(front>1.4||r<.02)continue;
  const radius=1.3+age*2.25,q=r-radius,width=.8+age*.08,fade=p.a*Math.exp(-age*.32)*ease,gate=clamp((1.4-front)/1.4,0,1),e=Math.exp(-q*q/(width*width)),a=fade*gate;
  height+=a*e*Math.sin(q*3);const deriv=a*e*(3*Math.cos(q*3)-2*q/(width*width)*Math.sin(q*3));dx+=deriv*rx/r;dz+=deriv*rz/r;
  if(front>0){dx-=fade*e*Math.sin(q*3)*p.c/1.4;dz-=fade*e*Math.sin(q*3)*p.s/1.4;}
 }return{height,dx,dz};
}
const FADE='fade=w.w*exp(-age*.32)',EASE='smoothstep(0.,.35,age)*(1.-smoothstep(4.8,6.0,age))';
function installWaves(w){if(!w||w.version!==12||!Array.isArray(w.packets)||typeof w.wakeSample!=='function'||typeof w.glsl!=='string'||w.glsl.split(FADE).length!==2||w.glsl.includes(EASE))throw Error('Unsupported wave host: keep its original water field.');
 const original=w.wakeSample,glsl=w.glsl,patched=glsl.replace(FADE,FADE+'*'+EASE),fn=(x,z,t)=>sampleWake(w.packets,x,z,t);w.wakeSample=fn;w.glsl=patched;let disposed=false;
 return Object.freeze({inspect:()=>({installed:!disposed,sharedField:true,newClock:false,packetCapacity:12,attackSeconds:.35,fadeStart:4.8,fadeEnd:6.0,packetExpiry:6.4}),dispose(){if(disposed)return;disposed=true;if(w.wakeSample===fn)w.wakeSample=original;if(w.glsl===patched)w.glsl=glsl;}});
}
function optics(depth,cosine,clarity=.23){if(![depth,cosine,clarity].every(Number.isFinite)||depth<0||clarity<0)throw Error('Finite nonnegative optical inputs required.');const c=clamp(cosine,0,1),cosWater=Math.sqrt(1-(1-c*c)/(1.333*1.333)),path=depth/cosWater,fresnel=.0204+.9796*Math.pow(1-c,5),transmission=Math.exp(-path*clarity*.8);return{cosWater,path,fresnel,transmission,alpha:clamp(1-transmission*(1-fresnel),.07,.997)};}
const OLD_PATH='float path11=depth09/max(.24,abs(eye09.y));';
const NEW_PATH='float cosWaterV4=sqrt(max(.0001,1.-(1.-facing11*facing11)/(1.333*1.333)));\n float path11=depth09/cosWaterV4;';
function patchFragment(text){if(typeof text!=='string'||text.split(OLD_PATH).length!==2)throw Error('Unsupported optical shader; no partial patch.');let s=text.replace(OLD_PATH,NEW_PATH);
 // Foam uses each packet's same smooth expiration. Keep the continuous propwash
 // at its existing strength near the stern, but remove its tail without popping.
 const a='wakeFoam12=max(wakeFoam12,wash12*.75+ring12*.28);';if(s.split(a).length!==2)throw Error('Unsupported wake-foam shader; no partial patch.');
 s=s.replace(a,'wakeFoam12=max(wakeFoam12,(wash12*.75+ring12*.28)*(1.-smoothstep(4.8,6.0,age)));');return s;
}
function installMaterial(mat){if(!mat||typeof mat.onBeforeCompile!=='function')throw Error('An initialized water material is required.');
 const prior=mat.onBeforeCompile,key=mat.customProgramCacheKey;let disposed=false,compiled=false;
 const hook=function(shader,...rest){prior.call(this,shader,...rest);const patched=patchFragment(shader.fragmentShader);shader.fragmentShader=patched;compiled=true;};
 const cache=function(){return (typeof key==='function'?key.call(this):'')+'|easy-water-v4';};mat.onBeforeCompile=hook;mat.customProgramCacheKey=cache;mat.needsUpdate=true;
 return Object.freeze({inspect:()=>({installed:!disposed,shaderPatched:compiled,refractionIndex:1.333,newDepthData:false,screenSpaceRefraction:false}),dispose(){if(disposed)return;disposed=true;if(mat.onBeforeCompile===hook)mat.onBeforeCompile=prior;if(mat.customProgramCacheKey===cache)mat.customProgramCacheKey=key;mat.needsUpdate=true;}});
}
return Object.freeze({envelope,sampleWake,installWaves,optics,patchFragment,installMaterial});
});
