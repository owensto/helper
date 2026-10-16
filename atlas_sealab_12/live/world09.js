/* Single source of bathymetry for the rendered seabed, sounder and contact model.
 * Basin = authored sandbox. Beaufort = interpolated downloaded NOAA soundings,
 * NOT survey-grade bathymetry. Unknown coverage stays null. All units are SI. */
(function(G){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const islands=[[205,62,49],[-115,95,43],[95,225,46]];
function basinBed(x,z){
 let bed=-5.6-.45*Math.sin(x*.009);
 islands.forEach(([ix,iz,r],seed)=>{const dx=x-ix,dz=z-iz,a=Math.atan2(dz,dx),rr=Math.hypot(dx,dz)/(r*(1+.04*Math.sin(a*5+seed)+.06*Math.sin(a*3+seed)));
  const radii=[0,.28,.53,.69,.8,1,1.38,1.9],heights=[4.6,4.1,2.65,1.22,.18,-.20,-.8,-5.9];
  if(rr<1.9){let i=1;while(radii[i]<rr)i++;bed=Math.max(bed,mix(heights[i-1],heights[i],(rr-radii[i-1])/(radii[i]-radii[i-1])));}
 });
 const bar=-5.8+5.68*Math.exp(-(((x-85)/32)**2)-(((z+40)/68)**2));return Math.max(bed,bar);
}
const World={version:9,units:'metres',islands,basinBed,
 sample(x,z,location='basin'){
  if(location!=='beaufort'){const bed=basinBed(x,z);return {bed,depth:-bed,known:true,land:bed>0,source:'Authored practice-bay terrain'};}
  const q=G.BayGeo?.sample(x,z);if(!q||!Number.isFinite(q.depth))return {bed:null,depth:null,known:false,outside:!!q?.outside,source:q?.status||'No chart coverage'};
  return {bed:q.land?2.05:-q.depth,depth:q.land?-2.05:q.depth,known:true,land:!!q.land,source:q.status};
 },
 contact(s){const c=Math.cos(s.heading),sn=Math.sin(s.heading),tide=s.location==='beaufort'?(s.config?.tide||0):0;
  const mass=s.totalMassKg?s.totalMassKg():2124;const draft=clamp(.46+(mass-2124)/12000,.32,.72);
  const samples=[[2.8,0,draft*.66,'BOW'],[0,0,draft,'KEEL'],[-2.9,0,draft*.9,'STERN'],[-4.12,0,.82-.39*(s.trimActual||0),'PROP']];
  let worst=null,hullClearance=Infinity;for(const[a,b,d,part]of samples){const x=s.x+c*a-sn*b,z=s.z+sn*a+c*b,q=this.sample(x,z,s.location);if(!q.known)continue;
   const y=tide+(s.heave||0)+(s.pitch||0)*a-(s.roll||0)*b-d,clearance=y-q.bed;
   if(part!=='PROP')hullClearance=Math.min(hullClearance,clearance);
   if(!worst||clearance<worst.clearance)worst={part,x,z,bed:q.bed,clearance,depth:tide+G.BayMotion.surface(x,z,s.elapsed,s.environment)-q.bed,draft:d};
  }if(worst)worst.hullClearance=Number.isFinite(hullClearance)?hullClearance:null;return worst;
 },
 inspect(s){const q=this.sample(s.x,s.z,s.location),tide=s.location==='beaufort'?(s.config?.tide||0):0;
  return {...q,waterDepth:q.known?tide+G.BayMotion.surface(s.x,s.z,s.elapsed,s.environment)-q.bed:null,contact:this.contact(s)};
 }
};G.Sea09World=World;if(typeof module!=='undefined')module.exports=World;
})(typeof window!=='undefined'?window:globalThis);
