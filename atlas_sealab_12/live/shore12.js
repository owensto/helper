/* Swept shoreline footprint; resolve contact normal and retain along-bank speed.
 * Land polygons are approximate. This is not a structural damage solver. */
(function(G){'use strict';const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
function normalAt(x,z,px,pz,loc){if(loc==='beaufort'&&G.BayGeo?.data){let best=Infinity,result=null;for(const rings of G.BayGeo.data.land)for(const ring of rings)for(let j=0;j<ring.length;j++){const a=ring[j],b=ring[(j+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(l<1e-9)continue;const t=cap(((x-a[0])*dx+(z-a[1])*dz)/l,0,1),qx=a[0]+t*dx,qz=a[1]+t*dz,d=(x-qx)**2+(z-qz)**2;if(d<best){best=d;let nx=-dz/Math.sqrt(l),nz=dx/Math.sqrt(l);if((px-qx)*nx+(pz-qz)*nz<0){nx=-nx;nz=-nz;}result={nx,nz};}}if(result)return result;}
const W=G.Sea09World,e=.7,gx=W.sample(x+e,z,loc).bed-W.sample(x-e,z,loc).bed,gz=W.sample(x,z+e,loc).bed-W.sample(x,z-e,loc).bed,n=Math.hypot(gx,gz);return n>.001?{nx:-gx/n,nz:-gz/n}:{nx:(px-x)/Math.max(.001,Math.hypot(px-x,pz-z)),nz:(pz-z)/Math.max(.001,Math.hypot(px-x,pz-z))};}
function resolve(s,px,pz){const W=G.Sea09World;if(!W)return null;const dx=s.x-px,dz=s.z-pz,c=Math.cos(s.heading),sn=Math.sin(s.heading),distance=Math.hypot(dx,dz);if(distance<1e-9)return null;const steps=Math.min(20,Math.max(1,Math.ceil(distance/.35))),samples=[[3.25,0],[1.5,-1.12],[1.5,1.12],[-2.9,-1.05],[-2.9,1.05]],loc=s.location;
const blocked=(x,z)=>{const q=W.sample(x,z,loc);return !!q.outside||(q.known&&q.bed>(loc==='beaufort'?(s.config.tide||0):0)+.045);};
let first=null;for(const[a,b]of samples){const ox=c*a-sn*b,oz=sn*a+c*b;if(blocked(px+ox,pz+oz))continue;for(let j=1;j<=steps;j++){const t=j/steps;if(blocked(px+dx*t+ox,pz+dz*t+oz)){let lo=(j-1)/steps,hi=t;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(blocked(px+dx*m+ox,pz+dz*m+oz))hi=m;else lo=m;}if(!first||lo<first.t)first={t:lo,x:px+dx*hi+ox,z:pz+dz*hi+oz,a,b,oldx:px+ox,oldz:pz+oz};break;}}}
if(!first)return null;const n=normalAt(first.x,first.z,first.oldx,first.oldz,loc),vn=s.vx*n.nx+s.vz*n.nz;if(vn>=0)return null;const vx=s.vx,vz=s.vz,closing=-vn,m=s.totalMassKg?s.totalMassKg():2200;
s.x=px+dx*first.t+n.nx*.003;s.z=pz+dz*first.t+n.nz*.003;
// Inelastic bank impact: shed the into-bank component, not all forward motion.
s.vx-=vn*n.nx;s.vz-=vn*n.nz;s.vx*=.97;s.vz*=.97;s.yaw=cap((s.yaw||0)+closing*(first.a*(c*n.nz-sn*n.nx)-first.b*(sn*n.nz+c*n.nx))*.013,-1,1);s.contact=true;s.grounded=true;
s.shoreHits12=(s.shoreHits12||0)+1;s.shoreContact12={x:first.x,z:first.z,...n,closing};return {kind:'shore',time:s.elapsed,x:first.x,z:first.z,...n,closing,deltaV:closing,forwardSpeed:vx*c+vz*sn,vx,vz,mass:m};}
G.Sea12Shore={resolve,normalAt};if(typeof module!=='undefined')module.exports=G.Sea12Shore;
})(typeof window!=='undefined'?window:globalThis);
