/* Shared analytic wave spectrum: identical CPU height/gradient and GPU formula.
   Rendered detail is not a fluid solver or a surveyed wave forecast. */
(function(G){'use strict';
const terms=[[.13,.07,1.1,1],[.05,-.18,.92,.48],[.37,.21,1.8,.16],[.91,.38,2.8,.11],[-.52,1.1,3.1,.07],[1.65,-.81,4.0,.04]];
function sample(x,z,t,amp){let height=0,dx=0,dz=0;for(const[kx,kz,w,a]of terms){const p=kx*x+kz*z-w*t;const h=Math.sin(p)+.10*Math.sin(2*p),d=Math.cos(p)+.20*Math.cos(2*p);height+=a*h;dx+=a*kx*d;dz+=a*kz*d;}return {height:amp*height,dx:amp*dx,dz:amp*dz};}
const fmt=n=>Number.isInteger(n)?n+'.':String(n),phase=([x,z,w])=>`(dot(p,vec2(${fmt(x)},${fmt(z)}))-${fmt(w)}*uBayTime)`;
const height=terms.map(q=>`${fmt(q[3])}*(sin(${phase(q)})+.10*sin(2.*${phase(q)}))`).join('+');
const derivative=i=>terms.map(q=>`${fmt(q[3]*q[i])}*(cos(${phase(q)})+.20*cos(2.*${phase(q)}))`).join('+');
G.Sea11Waves={version:11,terms,sample,glsl:`float sea(vec2 p){return uBayAmp*(${height});}\nvec2 seaSlope11(vec2 p){return uBayAmp*vec2(${derivative(0)},${derivative(1)});}`};
if(typeof module!=='undefined')module.exports=G.Sea11Waves;
})(typeof window!=='undefined'?window:globalThis);
