/* Sightseeing objectives only. No route safety, teleport, steering or throttle commands. */
(function(g,f){const a=f();if(typeof module==='object'&&module.exports)module.exports=a;else g.AtlasBeaufortTrip=a;})(globalThis,()=>{
'use strict';
const stops=Object.freeze([
 Object.freeze({id:'marina',name:'Marina waterfront',x:-340,z:-145,radius:65}),
 Object.freeze({id:'park',name:'Waterfront Park',x:210,z:-235,radius:65}),
 Object.freeze({id:'bridge',name:'Woods Bridge approach',x:510,z:-40,radius:65})]);
function observe(index,state,sample){const goal=stops[index];if(!goal||!state||state.location!=='beaufort'||![state.x,state.z,state.speedOverGround].every(Number.isFinite))return{available:false,arrived:false,text:'Beaufort trip unavailable'};
 const distance=Math.hypot(goal.x-state.x,goal.z-state.z),knots=state.speedOverGround*3600/1852;
 const known=sample?.known===true&&sample.land!==true&&Number.isFinite(sample.depth);const contact=state.grounded===true||state.contact===true;
 return{available:true,arrived:known&&!contact&&distance<=goal.radius&&knots<3,distance,knots,goal,
  text:!known?'Depth unknown here · no safe-route claim':contact?'Bottom or obstacle contact · reduce power':distance<=goal.radius?(knots<3?'Stop reached. Choose the next stop when ready.':'Approaching stop · slow below 3 knots'):'Follow the map bearing, watching depth. This is not a checked route.'};}
return{stops,observe};});
