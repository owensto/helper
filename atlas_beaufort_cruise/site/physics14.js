/* Explicit simulation refinements, not sea-trial calibration. Reference mode is unchanged. */
(function(G){'use strict';const cap=(x,a,b)=>Math.max(a,Math.min(b,x));let colliderList=[],grid=new Map();
const P={version:14,tideTarget:1.317,config:{surgeAddedMassDisplacement:.10,surgeAddedMassPlaning:.03,swayAddedMass:.55,yawAddedMass:.20,clutchSeconds:.32,idleForwardN:145,idleReverseN:90},
 clutch(s,dt){const target=s.engine&&s.startTimer===0?s.gear:0;let q=Number.isFinite(s.clutch14)?s.clutch14:0;q+=cap(target-q,-dt/this.config.clutchSeconds,dt/this.config.clutchSeconds);s.clutch14=q;return q;},
 beforeStep(s,dt){if(s.location==='beaufort'&&Number.isFinite(this.tideTarget)){const target=cap(this.tideTarget,.065,2.315);s.config.tide+=(target-(s.config.tide||0))*(1-Math.exp(-dt*.18));if(Math.abs(s.config.tide-target)<1e-5)s.config.tide=target;}},
 installColliders(list){colliderList=list;grid=new Map();for(let i=0;i<list.length;i++){const b=list[i];if(![b.x0,b.x1,b.z0,b.z1,b.y0,b.y1].every(Number.isFinite)||b.x1<b.x0||b.z1<b.z0)throw Error('Invalid source collider');for(let x=Math.floor(b.x0/32);x<=Math.floor(b.x1/32);x++)for(let z=Math.floor(b.z0/32);z<=Math.floor(b.z1/32);z++){const k=x+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}}},
 nearbyObstacles(s){if(!colliderList.length)return G.SEA12_GEO?.colliders||[];const ids=new Set(),cx=Math.floor(s.x/32),cz=Math.floor(s.z/32);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const n of grid.get((cx+i)+','+(cz+j))||[])ids.add(n);const t=s.config.tide||0,low=t+(s.heave||0)-.75,high=t+(s.heave||0)+3.05;return [...ids].map(i=>colliderList[i]).filter(b=>high>=(b.y0+(b.tideRelative?t:0))&&low<=(b.y1+(b.tideRelative?t:0)));},
 inspect(){return{version:14,config:{...this.config},tideTarget:this.tideTarget,colliders:colliderList.length,indexCells:grid.size,referenceCalibrated:false};}};
G.Sea14Physics=P;if(typeof module!=='undefined')module.exports=P;
})(typeof window!=='undefined'?window:globalThis);
