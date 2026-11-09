/* Empirical reference utilities. No measured performance is attributed to ATLAS. */
(function(g){'use strict';
const data=g.BAY_REFERENCE_DATA||(typeof require==='function'?require('./performance_data.js'):null);
if(!data)throw new Error('Reference performance data is missing.');
const C={mphToMps:.44704,mpsToKn:3600/1852,usGalToL:3.785411784,lbToKg:.45359237};
function lookup(rpm){
 if(!Number.isFinite(rpm)||rpm<1000||rpm>5800)return null;
 const a=data.rows;let i=a.findIndex(r=>r.rpm>=rpm);if(i<0)return null;
 let p=a[i],q=i?a[i-1]:p,t=p.rpm===q.rpm?0:(rpm-q.rpm)/(p.rpm-q.rpm);
 const mph=q.mph+(p.mph-q.mph)*t,gph=q.gph+(p.gph-q.gph)*t;
 const exact=a.find(r=>Math.abs(r.rpm-rpm)<1e-7);
 return {rpm,mph,mps:mph*C.mphToMps,kn:mph*C.mphToMps*C.mpsToKn,gph,lph:gph*C.usGalToL,derivedMpg:mph/gph,publishedMpg:exact?exact.publishedMpg:null,measuredRow:!!exact,betweenRpm:exact?[exact.rpm,exact.rpm]:[q.rpm,p.rpm]};
}
function range(rpm,fuelGal,reserveGal){
 const r=lookup(rpm);if(!r||!Number.isFinite(fuelGal)||!Number.isFinite(reserveGal)||fuelGal<0||reserveGal<0||fuelGal>data.fuelCapacityUsGal)return null;
 const available=Math.max(0,fuelGal-reserveGal),hours=available/r.gph;
 return {hours,nauticalMiles:r.kn*hours,statuteMiles:r.mph*hours,usableGal:available,assumedFuelGal:fuelGal,reserveGal,estimated:true};
}
const api={data,C,lookup,range,clampRpm:r=>Math.max(1000,Math.min(5800,Number(r)||1000)),throttleForRpm:r=>(r-700)/5100};
g.BayPerformance=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
