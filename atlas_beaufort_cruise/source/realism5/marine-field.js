/* Analytic derivatives of the SAME existing wave field; SI units and native clock.
 * No new sea spectrum or hydrodynamic coefficients. The material derivative at
 * each support includes vessel translation and yaw, not just wave time motion. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasMarineField=a;})(globalThis,()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function smooth(a,b,x){const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q);}
function dsmooth(a,b,x){if(x<=a||x>=b)return 0;const q=(x-a)/(b-a);return 6*q*(1-q)/(b-a);}
function wake(packets,x,z,t,derivatives=true){let height=0,dx=0,dz=0,dt=0;
 for(const p of packets){const age=t-p.t;if(age<=0||age>=6)continue;
  const rise=smooth(0,.35,age),fall=1-smooth(4.8,6,age),ease=rise*fall;
  const rx=x-p.x,rz=z-p.z,r=Math.hypot(rx,rz),front=rx*p.c+rz*p.s;if(front>1.4||r<.02)continue;
  const q=r-(1.3+age*2.25),width=.8+age*.08,w2=width*width,gate=clamp((1.4-front)/1.4,0,1),e=Math.exp(-q*q/w2),fade=p.a*Math.exp(-age*.32),sn=Math.sin(q*3),factor=fade*ease*gate*e;
  height+=factor*sn;if(!derivatives)continue;
  const cs=Math.cos(q*3),radial=factor*(3*cs-2*q/w2*sn);dx+=radial*rx/r;dz+=radial*rz/r;
  if(front>0){const cut=fade*ease*e*sn/1.4;dx-=cut*p.c;dz-=cut*p.s;}
  const de=dsmooth(0,.35,age)*fall-rise*dsmooth(4.8,6,age);
  // Differentiate envelope, exponential decay, expanding Gaussian, and phase.
  dt+=fade*gate*e*((de-.32*ease+ease*(4.5*q/w2+.16*q*q/(w2*width)))*sn-6.75*ease*cs);
 }
 return {height,dx,dz,dt};
}
function sample(w,x,z,t,amp){const a=amp===0?{height:0,dx:0,dz:0,dt:0}:w.sample(x,z,t,amp),b=wake(w.packets,x,z,t);return {height:a.height+b.height,dx:a.dx+b.dx,dz:a.dz+b.dz,dt:a.dt+b.dt};}
function height(w,x,z,t,amp){let h=0;if(amp!==0)for(const [kx,kz,omega,a]of w.terms){const p=kx*x+kz*z-omega*t;h+=a*(Math.sin(p)+.085*Math.sin(2*p));}return amp*h+wake(w.packets,x,z,t,false).height;}
function encounter(v,vx,vz,yaw,rx,rz){return v.dt+v.dx*(vx-yaw*rz)+v.dz*(vz+yaw*rx);}
function propLoad(s){return s.engine&&s.startTimer===0&&!s.airborne?clamp(Math.abs(s.clutch14||0)*(s.propWet||0)*(.13+.87*clamp(s.throttle||0,0,1)),0,1):0;}
return Object.freeze({sample,height,wake,encounter,propLoad});});
