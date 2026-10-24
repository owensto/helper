/* Y13: shared CPU/GPU deep-water wave approximation, SI units.
 * References: GPU Gems ch1; dispersion omega^2=g*k. Authored sea-state amplitudes.
 * No runtime clocks. All wave phase is the selected owner's simulation time.
 */
(function(G){'use strict';
const WAVES=Object.freeze([
 Object.freeze({length:76,angle:.34,weight:.54,phase:.4}),
 Object.freeze({length:29,angle:1.13,weight:.27,phase:2.1}),
 Object.freeze({length:12,angle:-.61,weight:.13,phase:4.0}),
 Object.freeze({length:4.8,angle:2.02,weight:.06,phase:1.2})
]);
const GRAVITY=9.80665, amplitudes=Object.freeze({calm:.16,breeze:.40,swell:.82});
function waveSample(x,z,t,sea='calm'){
 if(![x,z,t].every(Number.isFinite)||!Object.hasOwn(amplitudes,sea))throw new TypeError('Finite SI wave input and a known sea state required');
 let y=0,dx=0,dz=0;const a=amplitudes[sea];
 for(const w of WAVES){const k=2*Math.PI/w.length,c=Math.cos(w.angle),s=Math.sin(w.angle),q=k*(x*c+z*s)-Math.sqrt(GRAVITY*k)*t+w.phase,A=a*w.weight;y+=A*Math.sin(q);dx+=A*k*c*Math.cos(q);dz+=A*k*s*Math.cos(q);}
 const n=Math.hypot(dx,1,dz);return {height:y,dx,dz,normal:[-dx/n,1/n,-dz/n]};
}
function height(x,z,t,sea){return waveSample(x,z,t,sea).height;}
function number(n){return Number(n).toFixed(10);}
const GLSL='vec3 seaWave(vec2 p,float t,float amplitude){vec3 s=vec3(0.);\n'+WAVES.map(w=>{
 const k=2*Math.PI/w.length,c=Math.cos(w.angle),s=Math.sin(w.angle);return `{float q=dot(p,vec2(${number(k*c)},${number(k*s)}))-${number(Math.sqrt(GRAVITY*k))}*t+${number(w.phase)};float a=amplitude*${number(w.weight)};s+=vec3(a*sin(q),a*${number(k*c)}*cos(q),a*${number(k*s)}*cos(q));}`;
}).join('\n')+'\nreturn s;}';
function warp(v){const a=Math.abs(v);return Math.sign(v)*(a<=.64?a*187.5:120+3280*((a-.64)/.36)**2);}
function waterGeometry(T){const g=new T.PlaneGeometry(2,2,160,160).rotateX(-Math.PI/2),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,warp(p.getX(i)),0,warp(p.getZ(i)));p.needsUpdate=true;g.computeBoundingSphere();return g;}
function schlick(cosine,ior=1.333){if(!Number.isFinite(cosine)||!Number.isFinite(ior)||ior<=1)throw new TypeError('Invalid Fresnel input');const f=((1-ior)/(1+ior))**2;return f+(1-f)*(1-Math.min(1,Math.max(0,cosine)))**5;}
function transmission(distance,coeff=[.065,.022,.012]){if(!Number.isFinite(distance)||distance<0||coeff.some(x=>!Number.isFinite(x)||x<0))throw new TypeError('Invalid absorption input');return coeff.map(c=>Math.exp(-distance*c));}
const API={WAVES,GRAVITY,amplitudes,GLSL,height,waveSample,waterGeometry,warp,schlick,transmission};G.AtlasOcean13=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
