/* Y14: advisory navigation in the AUTHORED offshore scene, never a real chart.
 * Coordinates are metres, +X east, +Z south; vessel heading +X at zero, clockwise.
 * Pure observations. Does not steer, write vessel state or advance simulation time.
 */
(function(G){'use strict';
const finite=Number.isFinite,TAU=2*Math.PI,NM=1852,KNOT=1852/3600;
const wrap=a=>((a%TAU)+TAU)%TAU,angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function bearing(dx,dz){return Math.hypot(dx,dz)<1e-8?null:wrap(Math.atan2(dx,-dz));}
function heading(psi){return wrap(psi+Math.PI/2);}
function worldVelocity(s){const c=Math.cos(s.heading),q=Math.sin(s.heading);return {x:c*s.speedMps-q*s.swayMps,z:q*s.speedMps+c*s.swayMps};}
function solution(s,waypoint,legStart=null){
 if(!s||![s.x,s.z,s.heading,s.speedMps,s.swayMps].every(finite))return {available:false,reason:'STATE_UNAVAILABLE'};
 const vel=worldVelocity(s),sog=Math.hypot(vel.x,vel.z),cog=sog>.05?bearing(vel.x,vel.z):null;
 const info={available:true,headingRad:heading(s.heading),courseOverGroundRad:cog,speedOverGroundMps:sog,velocity:vel,waypoint:null};
 if(!waypoint||![waypoint.x,waypoint.z].every(finite))return info;
 const dx=waypoint.x-s.x,dz=waypoint.z-s.z,dist=Math.hypot(dx,dz),brg=bearing(dx,dz),vmg=dist>1e-8?(vel.x*dx+vel.z*dz)/dist:0;
 let cross=null;if(legStart){const lx=waypoint.x-legStart.x,lz=waypoint.z-legStart.z,L=Math.hypot(lx,lz);if(L>1e-8)cross=(lx*(s.z-legStart.z)-lz*(s.x-legStart.x))/L;}
 info.waypoint={...waypoint,distanceM:dist,bearingRad:brg,headingErrorRad:brg===null?0:angle(brg-info.headingRad),velocityMadeGoodMps:vmg,etaSeconds:vmg>.1?dist/vmg:null,crossTrackM:cross};return info;
}
function footprintClearance(s,p,x,z,psi,sample){
 if(!s||!p||![x,z,psi,s.depthM,s.heaveM,s.pitch,s.roll].every(finite))return {known:false,clearanceM:null};
 let min=Infinity,known=true;const c=Math.cos(psi),q=Math.sin(psi),tilt=Math.abs(Math.sin(s.pitch))*p.length/2+Math.abs(Math.sin(s.roll))*p.beam/2;
 for(let i=0;i<13;i++)for(const b of [-p.beam/2,0,p.beam/2]){const a=(i/12-.5)*p.length,v=sample(x+c*a-q*b,z+q*a+c*b);if(!v?.known||!finite(v.bed)){known=false;continue;}min=Math.min(min,s.heaveM-s.depthM-p.draft-tilt-v.bed);}
 return {known,clearanceM:known?min:null};
}
function lookAhead(s,p,sample,seconds=30){
 if(!s||!p)return {status:'unavailable',reason:'NO_ACTIVE_VESSEL',samples:[]};
 const a=[];let x=s.x,z=s.z,psi=s.heading;for(let t=0;t<=seconds;t+=3){if(t>0){const r=s.yawRate||0,mid=psi+r*1.5;x+=(Math.cos(mid)*s.speedMps-Math.sin(mid)*s.swayMps)*3;z+=(Math.sin(mid)*s.speedMps+Math.cos(mid)*s.swayMps)*3;psi+=r*3;}a.push({seconds:t,x,z,heading:psi,...footprintClearance(s,p,x,z,psi,sample)});}
 const bad=a.find(q=>!q.known||q.clearanceM<p.margin);return {status:bad?(!bad.known?'unknown':'danger'):'clear',reason:bad?(!bad.known?'UNKNOWN_BOTTOM_AHEAD':'LOW_CLEARANCE_AHEAD'):'SAMPLED_PATH_CLEAR',firstConcernSeconds:bad?.seconds??null,minimumClearanceM:a.every(q=>q.known)?Math.min(...a.map(q=>q.clearanceM)):null,samples:a,predictionSeconds:seconds,assumesConstantVelocityAndTurnRate:true};
}
function checkLeg(start,end,s,p,sample){
 const distance=Math.hypot(end.x-start.x,end.z-start.z),n=Math.min(160,Math.max(1,Math.ceil(distance/25))),psi=distance>1e-8?Math.atan2(end.z-start.z,end.x-start.x):s.heading;let min=Infinity;
 for(let i=0;i<=n;i++){const x=start.x+(end.x-start.x)*i/n,z=start.z+(end.z-start.z)*i/n,q=footprintClearance(s,p,x,z,psi,sample);if(!q.known)return {status:'unknown',clearanceM:null};min=Math.min(min,q.clearanceM);}
 return {status:min<p.margin?'danger':'clear',clearanceM:min};
}
class Route{
 constructor(){this.reset();}
 reset(){this.points=[];this.active=0;this.start=null;this.track=[];this.lastTime=null;this.lastSequence=-1;this.serial=0;this.lastMessage='Tap the chart to add a waypoint.';}
 add(x,z,s,p,sample){if(![x,z].every(finite)||!s||!p)return {ok:false,reason:'POSITION_UNAVAILABLE'};if(this.points.length>=8)return {ok:false,reason:'ROUTE_LIMIT_8'};const q=footprintClearance(s,p,x,z,s.heading,sample);if(!q.known)return {ok:false,reason:'UNKNOWN_BOTTOM'};if(q.clearanceM<p.margin)return {ok:false,reason:'WAYPOINT_TOO_SHALLOW'};
  const previous=this.points.length?this.points[this.points.length-1]:{x:s.x,z:s.z};const leg=checkLeg(previous,{x,z},s,p,sample);if(!this.points.length){this.start={x:s.x,z:s.z};this.active=0;}
  const point={id:++this.serial,name:'WP '+this.serial,x,z};this.points.push(point);this.lastMessage=leg.status==='clear'?'Waypoint added. Follow the bearing; steer manually.':'Waypoint added, but its direct leg crosses low/unknown water. Re-plan the route.';return {ok:true,point,leg};
 }
 clear(){this.points=[];this.active=0;this.start=null;this.lastMessage='Route cleared.';}
 undo(){if(this.points.length){this.points.pop();this.active=Math.min(this.active,this.points.length);}if(!this.points.length)this.start=null;}
 observe(s,p){if(!s||s.sequence===this.lastSequence)return;this.lastSequence=s.sequence;if(this.lastTime!==null&&s.elapsed<this.lastTime){this.track=[];this.lastTime=null;}
  if(!s.paused&&(this.lastTime===null||s.elapsed-this.lastTime>=.5)){this.track.push({x:s.x,z:s.z,elapsed:s.elapsed});if(this.track.length>500)this.track.shift();this.lastTime=s.elapsed;}
  const target=this.points[this.active];if(target&&!s.paused&&Math.hypot(s.x-target.x,s.z-target.z)<=Math.max(12,p.length*.2)){this.active++;this.lastMessage=this.active===this.points.length?'Route complete. You still control power and steering.':'Waypoint reached. Follow the next bearing.';}
 }
 read(s,p,sample){const t=this.points[this.active],legStart=this.active===0?this.start:this.points[this.active-1];return {...solution(s,t,legStart),routeCount:this.points.length,activeIndex:this.active,complete:this.points.length>0&&this.active===this.points.length,leg:t?checkLeg({x:s.x,z:s.z},t,s,p,sample):null};}
}
function screenToWorld(px,py,width,height,center,range){if(![px,py,width,height,range,center.x,center.z].every(finite)||width<=0||height<=0||range<=0)throw TypeError('Invalid chart projection');const scale=2*range/Math.min(width,height);return {x:center.x+(px-width/2)*scale,z:center.z+(py-height/2)*scale};}
function worldToScreen(x,z,width,height,center,range){const scale=Math.min(width,height)/(2*range);return {x:width/2+(x-center.x)*scale,y:height/2+(z-center.z)*scale};}
const API={NM,KNOT,wrap,angle,bearing,heading,worldVelocity,solution,footprintClearance,lookAhead,checkLeg,Route,screenToWorld,worldToScreen};G.AtlasNavigation14=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
