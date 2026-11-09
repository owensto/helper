/* Y14 navigation. SI local east/south coordinates; north is -Z. Fictional chart,
   not live GPS, radar, sonar or navigational guidance. Reads snapshots only. */
(function(G){'use strict';
const finite=Number.isFinite,clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),NM=1852,KNOT=1852/3600;
const bearing=(dx,dz)=>((Math.atan2(dx,-dz)*180/Math.PI)%360+360)%360;
const circularError=(target,actual)=>((target-actual+540)%360)-180;
const heading=h=>(90+h*180/Math.PI+360)%360;
function velocity(s){return {x:s.groundVelocityX??Math.cos(s.heading)*s.speedMps-Math.sin(s.heading)*s.swayMps,z:s.groundVelocityZ??Math.sin(s.heading)*s.speedMps+Math.cos(s.heading)*s.swayMps};}
function routeInfo(s,waypoint,origin){const g=velocity(s),sog=Math.hypot(g.x,g.z),h=heading(s.heading),cog=sog>.08?bearing(g.x,g.z):null;
 const info={headingDeg:h,courseDeg:cog,groundKn:sog/KNOT,waterKn:Math.hypot(s.speedMps,s.swayMps)/KNOT,leewayDeg:cog===null?null:circularError(cog,h),rangeM:null,bearingDeg:null,etaSeconds:null,crossTrackM:null,closingMps:null};
 if(waypoint){const dx=waypoint.x-s.x,dz=waypoint.z-s.z,d=Math.hypot(dx,dz);info.rangeM=d;info.bearingDeg=d>1?bearing(dx,dz):null;const closing=d>1?(dx*g.x+dz*g.z)/d:0;info.closingMps=closing;info.etaSeconds=closing>.15?d/closing:null;
  if(origin){const ax=waypoint.x-origin.x,az=waypoint.z-origin.z,L=Math.hypot(ax,az);info.crossTrackM=L>1?(ax*(s.z-origin.z)-az*(s.x-origin.x))/L:0;}}
 return info;}
function lookAhead(s,p,sample,horizon=60){const g=velocity(s),speed=Math.hypot(g.x,g.z),distance=Math.max(p.length,Math.min(700,speed*horizon)),angle=speed>.08?Math.atan2(g.z,g.x):s.heading,c=Math.cos(angle),sn=Math.sin(angle);let min=Infinity,known=true;
 const tilt=Math.abs(Math.sin(s.pitch))*p.length/2+Math.abs(Math.sin(s.roll))*p.beam/2;
 for(let i=0;i<=12;i++)for(const b of [-p.beam/2,0,p.beam/2]){const a=distance*i/12+p.length/2,q=sample(s.x+c*a-sn*b,s.z+sn*a+c*b);if(!q?.known||!finite(q.bed)){known=false;continue;}min=Math.min(min,(s.heaveM||0)-s.depthM-p.draft-q.bed-tilt);}
 return {known,minClearanceM:known&&finite(min)?min:null,distanceM:distance,horizonSeconds:horizon,warning:!known?'Unknown depth ahead':min<p.margin?'Shallow water ahead':null};}
class Navigator{
 constructor(){this.reset();}
 reset(){this.waypoints=[];this.origin=null;this.track=[];this.lastTime=-Infinity;this.lastSequence=-1;this.serial=null;this.arrivals=0;}
 add(x,z,s,sample){if(![x,z].every(finite))return {ok:false,reason:'Invalid waypoint'};if(this.waypoints.length>=8)return {ok:false,reason:'Route has 8 waypoints'};const q=sample(x,z);if(!q?.known||!finite(q.bed))return {ok:false,reason:'Waypoint outside chart coverage'};if(q.bed>=-s.depthM-.5)return {ok:false,reason:'Waypoint is on land or above your dive depth'};if(!this.waypoints.length)this.origin={x:s.x,z:s.z};this.waypoints.push({x,z});return {ok:true};}
 clear(){this.waypoints=[];this.origin=null;this.arrivals=0;}
 update(s,p,sample,serial){if(this.serial!==serial||s.sequence<this.lastSequence){this.reset();this.serial=serial;}this.lastSequence=s.sequence;
  if(!s.paused&&s.elapsed-this.lastTime>=.5){this.track.push({x:s.x,z:s.z});if(this.track.length>500)this.track.shift();this.lastTime=s.elapsed;}
  const goal=this.waypoints[0];if(goal&&!s.paused&&Math.hypot(goal.x-s.x,goal.z-s.z)<Math.max(10,p.length*.15)){this.origin=this.waypoints.shift();this.arrivals++;}
  return {...routeInfo(s,this.waypoints[0],this.origin),ahead:lookAhead(s,p,sample),waypointCount:this.waypoints.length,arrivals:this.arrivals,underKeelM:s.clearanceM,depthKnown:s.depthKnown};
 }
}
function createUI(canvas,read,readProfile,sample,onChange){
 const nav=new Navigator(),ctx=canvas.getContext('2d'),cache=typeof document!=='undefined'?document.createElement('canvas'):null;cache.width=320;cache.height=220;const bg=cache.getContext('2d');let range=1500,center={x:0,z:0},cacheKey='',last=null,editing=false;
 const project=(x,z)=>({x:160+(x-center.x)/range*320,y:110+(z-center.z)/range*320});
 function unproject(x,y){return {x:center.x+(x-160)*range/320,z:center.z+(y-110)*range/320};}
 function background(){const key=[center.x,center.z,range].join(':');if(cacheKey===key)return;cacheKey=key;
  for(let y=0;y<220;y+=4)for(let x=0;x<320;x+=4){const q=unproject(x+2,y+2),d=sample(q.x,q.z),v=d?.known?-d.bed:null;bg.fillStyle=v===null?'#2f3f48':v<0?'#b6b193':v<5?'#c6d5be':v<15?'#548b8c':v<30?'#285d70':v<60?'#173e57':'#0e2c43';bg.fillRect(x,y,4,4);if(v>0&&[5,15,30,60].some(a=>Math.abs(v-a)<.5)){bg.fillStyle='#a5d9df55';bg.fillRect(x,y,3,1);}}
  bg.strokeStyle='#badce216';bg.lineWidth=1;for(let x=0;x<=320;x+=40){bg.beginPath();bg.moveTo(x,0);bg.lineTo(x,220);bg.stroke();}for(let y=0;y<220;y+=40){bg.beginPath();bg.moveTo(0,y);bg.lineTo(320,y);bg.stroke();}
  bg.font='10px system-ui';bg.fillStyle='#a9cbd2';for(let y=30;y<220;y+=65)for(let x=30;x<320;x+=90){const p=unproject(x,y),q=sample(p.x,p.z);if(q?.known&&q.bed<0)bg.fillText(Math.round(-q.bed).toString(),x,y);}
 }
 function draw(s,p){center={x:Math.round(s.x/25)*25,z:Math.round(s.z/25)*25};background();ctx.clearRect(0,0,320,220);ctx.drawImage(cache,0,0);
  const line=(pts,color,dash=[])=>{if(!pts.length)return;ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash(dash);ctx.beginPath();pts.forEach((a,i)=>{const q=project(a.x,a.z);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();ctx.setLineDash([]);};line(nav.track,'#91cde570');line([{x:s.x,z:s.z},...nav.waypoints],'#e9c887',[5,4]);
  nav.waypoints.forEach((q,i)=>{const v=project(q.x,q.z);ctx.fillStyle='#f6d18a';ctx.beginPath();ctx.arc(v.x,v.y,4,0,7);ctx.fill();ctx.font='11px system-ui';ctx.fillText(String(i+1),v.x+6,v.y-6);});
  const o=project(s.x,s.z),g=velocity(s);ctx.strokeStyle='#93def0';ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+g.x*60/range*320,o.y+g.z*60/range*320);ctx.stroke();ctx.save();ctx.translate(o.x,o.y);ctx.rotate(s.heading);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-5);ctx.lineTo(-3,0);ctx.lineTo(-6,5);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='#e7f1f2';ctx.font='bold 11px system-ui';ctx.fillText('N ↑',10,18);ctx.font='9px system-ui';ctx.fillStyle='#afc9d2';ctx.fillText((range/NM).toFixed(2)+' NM ACROSS',10,209);ctx.fillText('SIMULATED CHART',210,209);
 }
 canvas.addEventListener('click',e=>{if(!editing)return;const s=read();if(!s)return;const b=canvas.getBoundingClientRect(),pt=unproject((e.clientX-b.left)*320/b.width,(e.clientY-b.top)*220/b.height),result=nav.add(pt.x,pt.z,s,sample);if(result.ok&&last){last={...last,...routeInfo(s,nav.waypoints[0],nav.origin),waypointCount:nav.waypoints.length};draw(s,readProfile());}onChange(result);});
 return {nav,setEditing:v=>{editing=!!v;canvas.classList.toggle('plotting',editing);},zoom:factor=>{range=clamp(range*factor,250,5000);cacheKey='';},update:(s,p,serial)=>{last=nav.update(s,p,sample,serial);if(!canvas.closest('[hidden]'))draw(s,p);return last;},inspect:()=>({last,waypoints:nav.waypoints.map(p=>({...p})),trackCount:nav.track.length,rangeM:range,editing}),reset:()=>{nav.reset();cacheKey='';last=null;editing=false;canvas.classList.remove('plotting');const button=canvas.parentElement?.querySelector('#plot-route');if(button)button.setAttribute('aria-pressed','false');}};
}
const API={heading,bearing,circularError,routeInfo,lookAhead,Navigator,createUI,KNOT,NM};G.AtlasNavigation14=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
