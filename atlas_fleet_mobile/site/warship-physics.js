/* ATLAS-W authored prototype handling; not calibrated or naval-engineering data. */
/* ATLAS 83: standalone concept dynamics. SI units, +X forward, +Y up, +Z starboard.
   Authored coefficients; no sea-trial calibration or engineering certification. */
(function(G){'use strict';
const P=Object.freeze({length:125,beam:18,draft:4.85,mass:6000000,surgeMass:7200000,swayMass:11000000,yawInertia:8.0e9,propSpacing:8.2,maxThrust:250000,reverseFactor:.55,thrustLag:3.5,rudderLimit:.5235987756,rudderRate:.0523598776,linearDrag:11500,quadraticDrag:4200,swayDrag:160000,yawDrag:7.0e8,bowForce:70000});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),approach=(v,t,n)=>v+clamp(t-v,-n,n);
function wave(x,z,t,sea=0){const a=[.09,.25,.57][sea]??.09;return a*(.62*Math.sin(.052*x+.033*z-.74*t)+.28*Math.sin(-.038*x+.079*z-1.02*t)+.1*Math.sin(.12*x-.07*z-1.4*t));}
function depth(x,z){if(!Number.isFinite(x+z)||Math.hypot(x,z)>12000)return null;const island=1-Math.hypot((x-2100)/700,(z+2300)/520);return island>-.22?Math.max(0, -island*95):80;}
class Vessel{
 constructor(){this.reset();}
 reset(){Object.assign(this,{x:0,z:0,heading:0,u:0,v:0,r:0,time:0,engine:false,paused:false,gear:0,port:0,starboard:0,helm:0,rudder:0,thrustP:0,thrustS:0,bow:0,sea:0,heave:0,roll:0,pitch:0,heaveV:0,rollV:0,pitchV:0,track:[],grounded:false,headingHold:false,targetHeading:0,epoch:(this.epoch??-1)+1});}
 command(k,v){if(k==='engine'){this.engine=!this.engine;if(!this.engine){this.port=this.starboard=0;}}else if(k==='pause')this.paused=!this.paused;else if(k==='gear'&&[-1,0,1].includes(v))this.gear=v;else if(['port','starboard'].includes(k)&&Number.isFinite(v))this[k]=clamp(v,0,1);else if(['helm','bow'].includes(k)&&Number.isFinite(v)){this[k]=clamp(v,-1,1);if(k==='helm')this.headingHold=false;}else if(k==='sea'&&[0,1,2].includes(v))this.sea=v;else if(k==='hold'){this.headingHold=!this.headingHold;this.targetHeading=this.heading;}else if(k==='idle'){this.port=this.starboard=0;this.bow=0;}else if(k==='reset')this.reset();}
 step(dt){if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('INVALID_STEP');if(this.paused||dt===0)return;this.time+=dt;
  if(this.headingHold){let e=Math.atan2(Math.sin(this.targetHeading-this.heading),Math.cos(this.targetHeading-this.heading));this.helm=clamp(e*3-this.r*14,-1,1);}
  this.rudder=approach(this.rudder,this.helm*P.rudderLimit,P.rudderRate*dt);
  const f=this.engine?this.gear*(this.gear<0?P.reverseFactor:1):0,lag=1-Math.exp(-dt/P.thrustLag);
  this.thrustP+=(P.maxThrust*this.port*f-this.thrustP)*lag;this.thrustS+=(P.maxThrust*this.starboard*f-this.thrustS)*lag;
  const rudderForce=(2800*this.u*Math.abs(this.u)+.12*Math.abs(this.thrustP+this.thrustS))*Math.sin(this.rudder),bow=this.engine?this.bow*P.bowForce:0;
  const du=(this.thrustP+this.thrustS-P.linearDrag*this.u-P.quadraticDrag*this.u*Math.abs(this.u))/P.surgeMass+this.r*this.v;
  const dv=(-rudderForce+bow-P.swayDrag*this.v-100000*this.v*Math.abs(this.v))/P.swayMass-this.r*this.u;
  const dr=(rudderForce*52+bow*45+(this.thrustP-this.thrustS)*P.propSpacing/2-P.yawDrag*this.r-1.2e9*this.r*Math.abs(this.r))/P.yawInertia;
  this.u+=du*dt;this.v+=dv*dt;this.r+=dr*dt;this.heading+=this.r*dt;
  const c=Math.cos(this.heading),s=Math.sin(this.heading),nx=this.x+(c*this.u-s*this.v)*dt,nz=this.z+(s*this.u+c*this.v)*dt;
  this.grounded=false;for(const a of [-64,-45,-25,0,25,45,64])for(const b of [-11.5,0,11.5]){const d=depth(nx+c*a-s*b,nz+s*a+c*b);if(d===null||d<P.draft+.5)this.grounded=true;}
  if(!this.grounded){this.x=nx;this.z=nz;}else{this.u*=Math.exp(-6*dt);this.v*=Math.exp(-6*dt);this.r*=Math.exp(-4*dt);}
  const h=wave(this.x,this.z,this.time,this.sea),fore=wave(this.x+c*25,this.z+s*25,this.time,this.sea),aft=wave(this.x-c*25,this.z-s*25,this.time,this.sea),port=wave(this.x+s*5,this.z-c*5,this.time,this.sea),star=wave(this.x-s*5,this.z+c*5,this.time,this.sea);
  for(const [key,target,w,damp]of [['heave',h,1.05,.86],['pitch',(fore-aft)/50,.9,.85],['roll',(port-star)/10+this.r*this.u*.003,1.2,.84]]){this[key+'V']+=(w*w*(target-this[key])-2*damp*w*this[key+'V'])*dt;this[key]+=this[key+'V']*dt;}
  if(!this.track.length||this.time-this.track[this.track.length-1].t>.5){this.track.push({x:this.x,z:this.z,t:this.time});if(this.track.length>600)this.track.shift();}
 }
 read(){return {x:this.x,z:this.z,heading:this.heading,speedKnots:Math.hypot(this.u,this.v)*1.943844,forwardMps:this.u,sideMps:this.v,yawRate:this.r,time:this.time,engine:this.engine,paused:this.paused,gear:this.gear,port:this.port,starboard:this.starboard,helm:this.helm,rudder:this.rudder,thrustP:this.thrustP,thrustS:this.thrustS,heave:this.heave,roll:this.roll,pitch:this.pitch,grounded:this.grounded,depthM:depth(this.x,this.z),epoch:this.epoch};}
}
G.AtlasW={P,Vessel,wave,depth};if(typeof module!=='undefined')module.exports=G.AtlasW;
})(globalThis);

// ATLAS_REBUILD_POLISH_02
