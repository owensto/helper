/* Y13 shared sea surface. Prescribed finite-depth linear gravity waves at reference
 * depth 78 m; NOT a measured sea spectrum or near-shore shoaling calculation.
 * Horizontal maneuvering remains the unchanged Y12 force model. */
(function(G){'use strict';
const old=G.AtlasFleetDynamics||(typeof require==='function'?require('../y12/dynamics.js'):null);
const g=9.80665,referenceDepth=78;
const bands=[[96,.34,.30,.4],[47,.65,.25,2.1],[23,-.40,.19,4.4],[11,1.2,.13,.8],[5.5,-.9,.08,3.6],[2.7,.15,.05,5.1]].map(([length,angle,a,phase])=>{const k=2*Math.PI/length;return Object.freeze({length,k,kx:k*Math.cos(angle),kz:k*Math.sin(angle),a,phase,omega:Math.sqrt(g*k*Math.tanh(k*referenceDepth))});});
const scales=Object.freeze({calm:.18,breeze:.58,swell:1.12});
function surface(x,z,t,sea='calm'){const scale=typeof sea==='number'?sea:(scales[sea]??scales.calm);let y=0,dx=0,dz=0,dt=0;for(const b of bands){const phase=b.kx*x+b.kz*z-b.omega*t+b.phase,s=Math.sin(phase),c=Math.cos(phase),a=b.a*scale;y+=a*s;dx+=a*b.kx*c;dz+=a*b.kz*c;dt-=a*b.omega*c;}return {y,dx,dz,dt};}
function wave(x,z,t,sea='calm'){return surface(x,z,t,sea).y;}
function planeFit(p,x,z,heading,time,waves){const c=Math.cos(heading),s=Math.sin(heading);let sw=0,sh=0,sx2=0,sz2=0,sxh=0,szh=0;
 // Symmetric elliptical waterplane quadrature: 9 length stations x 3 beam samples.
 for(let i=0;i<9;i++){const q=(i-4)/4,a=q*p.length*.46,w=Math.sqrt(Math.max(.07,1-q*q)),half=p.beam*.43*w;for(const qz of [-1,0,1]){const b=qz*half,weight=w*(qz===0?2:1),h=waves(x+c*a-s*b,z+s*a+c*b,time);if(!Number.isFinite(h))continue;sw+=weight;sh+=weight*h;sx2+=weight*a*a;sz2+=weight*b*b;sxh+=weight*a*h;szh+=weight*b*h;}}
 return {height:sw?sh/sw:0,pitch:sx2?sxh/sx2:0,roll:sz2?-szh/sz2:0,samples:27};}
class Vessel extends old.Vessel{
 step(dt,sample=old.bottom,waves=wave){return super.step(dt,sample,waves);}
 targets(waves){const q=planeFit(this.p,this.x,this.z,this.heading,this.elapsed,waves),fade=Math.exp(-this.depthM/4),heel=-this.speedMps*this.yawRate*this.p.forceHeight/(9.80665*this.p.rollGm)*fade;return [q.height*fade,Math.max(-.18,Math.min(.18,q.roll*fade+heel)),Math.max(-.09,Math.min(.09,q.pitch))*fade];}
}
class WakeHistory{
 constructor(max=160){this.max=max;this.reset();}
 reset(){this.points=[];this.last=-Infinity;this.id=null;}
 sample(s,p){if(this.id!==p.id){this.reset();this.id=p.id;}if(s.elapsed<this.last)this.reset();if(s.elapsed<=this.last+.12)return false;this.last=s.elapsed;if(s.depthM>1.3){this.points=[];return false;}const speed=Math.hypot(s.speedMps,s.swayMps);if(speed<.15)return false;this.points.push({x:s.x-Math.cos(s.heading)*p.length*.47,z:s.z-Math.sin(s.heading)*p.length*.47,heading:s.heading,time:s.elapsed,speed,beam:p.beam});while(this.points.length>this.max)this.points.shift();return true;}
}
const num=n=>Number(n).toPrecision(14),glsl='vec4 seaSample(vec2 p,float t,float scale){vec4 q=vec4(0.);'+bands.map(b=>`{float a=${num(b.a)}*scale;float ph=dot(p,vec2(${num(b.kx)},${num(b.kz)}))-${num(b.omega)}*t+${num(b.phase)};float c=cos(ph);q+=vec4(a*sin(ph),a*${num(b.kx)}*c,a*${num(b.kz)}*c,-a*${num(b.omega)}*c);}`).join('')+'return q;}';
const API={...old,Vessel,wave,surface,planeFit,WakeHistory,bands,scales,glsl,referenceDepth};G.AtlasRealismSea=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
