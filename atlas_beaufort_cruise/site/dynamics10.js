/* Deterministic sandbox collision and weather helpers. SI units.
 * These are gameplay approximations, not structural or injury thresholds. */
(function(G){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sweepCircle(x,z,dx,dz,r,o){
 const qx=clamp(x,o.x0,o.x1),qz=clamp(z,o.z0,o.z1),ox=x-qx,oz=z-qz,dist=Math.hypot(ox,oz);
 if(dist<r-1e-6){
  let nx=ox/Math.max(dist,1e-9),nz=oz/Math.max(dist,1e-9);
  if(dist<1e-7){const faces=[[Math.abs(x-o.x0),-1,0],[Math.abs(x-o.x1),1,0],[Math.abs(z-o.z0),0,-1],[Math.abs(z-o.z1),0,1]].sort((a,b)=>a[0]-b[0]);[,nx,nz]=faces[0];}
  // Do not glue the boat to a dock: tangential and separating motion are allowed.
  if(dx*nx+dz*nz< -1e-9)return {t:0,nx,nz};return null;
 }
 let best=null;
 function take(t,nx,nz){if(t>=-1e-8&&t<=1&&dx*nx+dz*nz< -1e-9&&(!best||t<best.t))best={t:Math.max(0,t),nx,nz};}
 if(Math.abs(dx)>1e-10)for(const[xx,nx]of[[o.x0-r,-1],[o.x1+r,1]]){const t=(xx-x)/dx,zz=z+t*dz;if(zz>=o.z0&&zz<=o.z1)take(t,nx,0);}
 if(Math.abs(dz)>1e-10)for(const[zz,nz]of[[o.z0-r,-1],[o.z1+r,1]]){const t=(zz-z)/dz,xx=x+t*dx;if(xx>=o.x0&&xx<=o.x1)take(t,0,nz);}
 const a=dx*dx+dz*dz;
 if(a>1e-12)for(const[cx,cz]of[[o.x0,o.z0],[o.x0,o.z1],[o.x1,o.z0],[o.x1,o.z1]]){const rx=x-cx,rz=z-cz,b=2*(rx*dx+rz*dz),d=b*b-4*a*(rx*rx+rz*rz-r*r);if(d<0)continue;const t=(-b-Math.sqrt(d))/(2*a);if(t>=0&&t<=1){const nx=(x+t*dx-cx)/r,nz=(z+t*dz-cz)/r;take(t,nx,nz);}}
 return best;
}
function resolveObstacles(s,px,pz,obstacles){
 const c=Math.cos(s.heading),sn=Math.sin(s.heading),dx=s.x-px,dz=s.z-pz;let first=null;
 for(const [oi,o]of obstacles.entries())for(const a of [-3.2,-1.6,0,1.6,3.2]){const q=sweepCircle(px+a*c,pz+a*sn,dx,dz,1.20,o);if(q&&(!first||q.t<first.t))first={...q,a,oi};}
 if(!first)return null;
 const {nx,nz,t,a,oi}=first,inward=-(s.vx*nx+s.vz*nz);if(inward<=0)return null;
 const vx=s.vx,vz=s.vz,m=s.totalMassKg?s.totalMassKg():2200,lever=a*(c*nz-sn*nx),inertia=m*5.8;
 const impulse=1.04*inward/(1/m+lever*lever/inertia),dv=impulse/m;
 s.x=px+dx*Math.max(0,t-.0001)+nx*.002;s.z=pz+dz*Math.max(0,t-.0001)+nz*.002;
 s.vx+=dv*nx;s.vz+=dv*nz;s.yaw=clamp(s.yaw+impulse*lever/inertia,-1.1,1.1);s.contact=true;
 // Retain tangential momentum. The former collision cancelled both axes.
 return {kind:'solid',obstacle:oi,time:s.elapsed,x:s.x+a*c-nx*1.2,z:s.z+a*sn-nz*1.2,nx,nz,closing:inward,deltaV:dv,vx,vz,forwardSpeed:vx*c+vz*sn,mass:m,energy:.5*m*inward*inward};
}
function consequence(e,opts={}){
 const solid=e.kind==='solid'||e.kind==='shore';
 const damage=opts.damage?clamp((e.closing-1.4)*(solid?5.5:1.8),0,100):0;
 return {damage,explode:!!opts.explosions&&solid&&e.closing>=14&&e.deltaV>=6,eject:!!opts.ejection&&solid&&e.closing>=7&&e.deltaV>=4&&e.forwardSpeed>3};
}
const WEATHER={
 clear:{label:'Clear & calm',amp:.025,wind:[.2,.3],current:[0,0],rain:0,fog:.0012,cloud:0},
 breeze:{label:'Sea breeze',amp:.125,wind:[1.4,3],current:[.13,.24],rain:0,fog:.0018,cloud:.12},
 swell:{label:'Open-water swell',amp:.45,wind:[2,4],current:[.2,.12],rain:0,fog:.0023,cloud:.3},
 rain:{label:'Rain',amp:.22,wind:[3,5],current:[.23,.35],rain:.7,fog:.005,cloud:.85},
 fog:{label:'Fog',amp:.06,wind:[.5,1.1],current:[.10,.16],rain:0,fog:.018,cloud:.95},
 squall:{label:'Squall',amp:.56,wind:[7,10],current:[.23,.35],rain:1,fog:.008,cloud:1}
};
class Weather{
 constructor(){this.name='breeze';this.current=JSON.parse(JSON.stringify(WEATHER.breeze));this.target=JSON.parse(JSON.stringify(this.current));}
 choose(name){if(!WEATHER[name])throw Error('Unknown weather preset');this.name=name;this.target=JSON.parse(JSON.stringify(WEATHER[name]));return this.target;}
 step(dt){const a=1-Math.exp(-clamp(dt,0,.04)/2.4);for(const k of ['amp','rain','fog','cloud'])this.current[k]+=(this.target[k]-this.current[k])*a;for(const k of ['wind','current'])for(let i=0;i<2;i++)this.current[k][i]+=(this.target[k][i]-this.current[k][i])*a;return this.current;}
}
const api={version:10,sweepCircle,resolveObstacles,consequence,Weather,WEATHER};G.Sea10Dynamics=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
