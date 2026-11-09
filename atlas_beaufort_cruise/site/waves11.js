/* Dispersive eight-component height field. SI units; finite-depth linear-wave
 * dispersion at a fixed 8 m reference depth, bounded second-order crest shaping.
 * This is NOT a Navier-Stokes solver or a surveyed wave spectrum. */
(function(G){'use strict';
const spec=[[42,.28,.78],[26,.59,.44],[15,-.20,.25],[8.5,.92,.13],[5.0,-.7,.075],[3.1,.4,.038],[1.9,1.2,.018],[1.2,-1.1,.009]];
const terms=spec.map(([L,d,a])=>{const k=2*Math.PI/L;return [k*Math.cos(d),k*Math.sin(d),Math.sqrt(9.81*k*Math.tanh(k*8)),a];});
function sample(x,z,t,amp){let height=0,dx=0,dz=0,dt=0;for(const[kx,kz,w,a]of terms){const p=kx*x+kz*z-w*t,h=Math.sin(p)+.085*Math.sin(2*p),d=Math.cos(p)+.17*Math.cos(2*p);height+=a*h;dx+=a*kx*d;dz+=a*kz*d;dt-=a*w*d;}return {height:amp*height,dx:amp*dx,dz:amp*dz,dt:amp*dt};}
const f=n=>Number(n).toFixed(9),phase=([x,z,w])=>`(dot(p,vec2(${f(x)},${f(z)}))-${f(w)}*uBayTime)`;
const ht=terms.map(q=>`${f(q[3])}*(sin(${phase(q)})+.085*sin(2.*${phase(q)}))`).join('+');
const dv=i=>terms.map(q=>`${f(q[3]*q[i])}*(cos(${phase(q)})+.17*cos(2.*${phase(q)}))`).join('+');
// Wavelets are stored at their emission locations, not stuck to the current boat.
const N=12,packets=[],state={last:-99,x:0,z:0,loc:null,owner:null,emissions:0};
function reset(){packets.length=0;state.last=-99;state.emissions=0;}
function advance(s,delta){if(state.owner!==s||s.location!==state.loc||s.elapsed<state.last-.01||Math.hypot(s.x-state.x,s.z-state.z)>100)reset();state.owner=s;state.loc=s.location;state.x=s.x;state.z=s.z;
 for(let i=packets.length-1;i>=0;i--)if(s.elapsed-packets[i].t>6.4)packets.splice(i,1);
 if(s.elapsed-state.last>=.52){state.last=s.elapsed;const speed=Math.hypot(s.u||0,s.v||0);if(speed>1.4&&!s.airborne&&!s.grounded){const c=Math.cos(s.heading),sn=Math.sin(s.heading),direction=s.u<0?-1:1;packets.unshift({x:s.x-3.4*c*direction,z:s.z-3.4*sn*direction,t:s.elapsed,a:Math.min(.16,(speed-1.4)*.009),c:c*direction,s:sn*direction});if(packets.length>N)packets.length=N;state.emissions++;}}
}
function wakeSample(x,z,t){let h=0,dx=0,dz=0;for(const p of packets){const age=t-p.t;if(age<0||age>6.4)continue;const rx=x-p.x,rz=z-p.z,r=Math.hypot(rx,rz),front=rx*p.c+rz*p.s;if(front>1.4||r<.02)continue;const radius=1.3+age*2.25,q=r-radius,width=.8+age*.08,fade=p.a*Math.exp(-age*.32),gate=Math.min(1,Math.max(0,(1.4-front)/1.4)),e=Math.exp(-q*q/(width*width)),a=fade*gate;h+=a*e*Math.sin(q*3.0);const deriv=a*e*(3*Math.cos(q*3)-2*q/(width*width)*Math.sin(q*3));dx+=deriv*rx/r;dz+=deriv*rz/r;if(front>0){dx-=fade*e*Math.sin(q*3)*p.c/1.4;dz-=fade*e*Math.sin(q*3)*p.s/1.4;}}
 return {height:h,dx,dz};}
const wakeGL=`uniform vec4 uWake12[12];uniform vec2 uWakeDir12[12];uniform int uWakeCount12;
vec3 wakeField12(vec2 p){vec3 r=vec3(0.);for(int i=0;i<12;i++){if(i>=uWakeCount12)break;vec4 w=uWake12[i];float age=uBayTime-w.z;if(age<0.||age>6.4)continue;vec2 d=p-w.xy;float len=length(d);float front=dot(d,uWakeDir12[i]);if(front>1.4||len<.02)continue;float q=len-(1.3+age*2.25),width=.8+age*.08;float fade=w.w*exp(-age*.32),gate=clamp((1.4-front)/1.4,0.,1.),e=exp(-q*q/(width*width));float h=fade*gate*e*sin(q*3.);float der=fade*gate*e*(3.*cos(q*3.)-2.*q/(width*width)*sin(q*3.));vec2 grad=der*d/len;if(front>0.)grad-=fade*e*sin(q*3.)*uWakeDir12[i]/1.4;r+=vec3(h,grad);}return r;}`;
const glsl=`${wakeGL}\nfloat sea(vec2 p){return uBayAmp*(${ht})+wakeField12(p).x;}\nvec2 seaSlope11(vec2 p){return uBayAmp*vec2(${dv(0)},${dv(1)})+wakeField12(p).yz;}`;
const api={version:12,referenceDepth:8,terms,spec,sample,glsl,packets,advance,wakeSample,reset,inspect:()=>({components:terms.length,referenceDepth:8,wakePackets:packets.length,emissions:state.emissions,capacity:N})};G.Sea11Waves=api;G.Sea12Waves=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
