/* Y14 chart/instruments presenter. Reads owner snapshots only; no timer or steering writes. */
(function(G){'use strict';
function create(doc,read,sample,onLayout){
 const N=G.AtlasNavigation14,$=id=>doc.getElementById(id),route=new N.Route(),canvas=$('chart'),ctx=canvas.getContext('2d'),raster=doc.createElement('canvas');raster.width=raster.height=224;const rc=raster.getContext('2d');
 let range=1400,follow=true,center={x:0,z:0},lastRaster='',lastReview=-Infinity,review=null,lastS=null,lastP=null,report=null,open=false,draws=0,down=null,lastInstance=null,revision=0;
 const deg=a=>a===null||a===undefined?'—':String(Math.round(a*180/Math.PI)%360).padStart(3,'0')+'°';
 const distance=d=>d>=1852?(d/1852).toFixed(2)+' nm':Math.round(d)+' m';
 const eta=s=>s===null||!Number.isFinite(s)?'—':s<3600?Math.ceil(s/60)+' min':(s/3600).toFixed(1)+' h';
 function text(id,v){const e=$(id);if(e&&e.textContent!==String(v))e.textContent=String(v);}
 function reset(){route.reset();lastReview=-Infinity;review=null;lastInstance=null;lastRaster='';revision++;}
 function chartOpen(value){open=value;$('chart-panel').hidden=!value;$('chart-open').setAttribute('aria-expanded',String(value));if(value){const box=canvas.getBoundingClientRect();canvas.width=Math.round(box.width*1.5);canvas.height=Math.round(box.height*1.5);draw();}onLayout?.(value);}
 function reason(r){return {WAYPOINT_TOO_SHALLOW:'This waypoint has insufficient bottom clearance.',UNKNOWN_BOTTOM:'No bottom coverage at that waypoint.',ROUTE_LIMIT_8:'Eight waypoints maximum. Clear or undo to add another.',POSITION_UNAVAILABLE:'Wait until a vessel is ready.'}[r]||r;}
 function add(x,z){const r=read();if(!r?.state||!r.profile)return;const q=route.add(x,z,r.state,r.profile,sample);text('chart-hint',q.ok?route.lastMessage:reason(q.reason));revision++;update(r.state,r.profile,r.instance,true);}
 function xy(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};}
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointerup',e=>{if(down&&e.pointerId===down.id&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<9){const q=xy(e),p=N.screenToWorld(q.x,q.y,canvas.width,canvas.height,center,range);add(p.x,p.z);}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
 $('chart-open').onclick=()=>chartOpen(!open);$('chart-close').onclick=()=>chartOpen(false);
 $('chart-zoom-in').onclick=()=>{range=Math.max(200,range/1.6);lastRaster='';draw();};$('chart-zoom-out').onclick=()=>{range=Math.min(2800,range*1.6);lastRaster='';draw();};
 $('chart-follow').onclick=()=>{follow=!follow;$('chart-follow').setAttribute('aria-pressed',String(follow));if(!follow)center={x:0,z:0};draw();};
 $('route-clear').onclick=()=>{route.clear();text('chart-hint',route.lastMessage);revision++;draw();};$('route-undo').onclick=()=>{route.undo();revision++;draw();};$('route-home').onclick=()=>add(0,0);
 $('instruments-open').onclick=()=>{const e=$('instrument-panel');e.hidden=!e.hidden;$('instruments-open').setAttribute('aria-expanded',String(!e.hidden));};$('instruments-close').onclick=()=>{$('instrument-panel').hidden=true;$('instruments-open').setAttribute('aria-expanded','false');};
 function draw(){if(!open||!lastS)return;const s=lastS,p=lastP,W=canvas.width,H=canvas.height;if(follow)center={x:s.x,z:s.z};const rasterKey=[Math.round(center.x/10),Math.round(center.z/10),range,p.draft,s.depthM.toFixed(1)].join(':');
  if(lastRaster!==rasterKey){const image=rc.createImageData(224,224);for(let y=0;y<224;y++)for(let x=0;x<224;x++){const w=N.screenToWorld(x+.5,y+.5,224,224,center,range),b=sample(w.x,w.z);let col;if(!b.known)col=[59,64,78];else if(b.bed>0)col=[84,99,78];else if(-b.bed<p.draft+s.depthM+p.margin)col=[149,101,76];else if(-b.bed<20)col=[78,137,149];else if(-b.bed<45)col=[38,101,128];else col=[18,62,89];if(b.known&&b.bed<0&&Math.abs(b.bed/10-Math.round(b.bed/10))<.045)col=col.map(v=>Math.min(255,v+22));const i=(y*224+x)*4;image.data.set([...col,255],i);}rc.putImageData(image,0,0);lastRaster=rasterKey;}
  ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,0,0,W,H);
  const to=(x,z)=>N.worldToScreen(x,z,W,H,center,range);ctx.strokeStyle='#c1e5ed24';ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(W*i/4,0);ctx.lineTo(W*i/4,H);ctx.moveTo(0,H*i/4);ctx.lineTo(W,H*i/4);ctx.stroke();}
  ctx.strokeStyle='#8fced1';ctx.lineWidth=2;ctx.beginPath();route.track.forEach((q,i)=>{const a=to(q.x,q.z);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);});ctx.stroke();
  if(review?.samples){ctx.strokeStyle=review.status==='clear'?'#d5e9cb':'#ffbd8d';ctx.setLineDash([5,5]);ctx.beginPath();review.samples.forEach((q,i)=>{const a=to(q.x,q.z);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);});ctx.stroke();ctx.setLineDash([]);}
  if(route.points.length){ctx.strokeStyle='#f7cf8a';ctx.lineWidth=2.5;ctx.beginPath();if(route.start){const a=to(route.start.x,route.start.z);ctx.moveTo(a.x,a.y);}for(const p of route.points){const a=to(p.x,p.z);ctx.lineTo(a.x,a.y);}ctx.stroke();}
  route.points.forEach((q,i)=>{const a=to(q.x,q.z);ctx.beginPath();ctx.arc(a.x,a.y,8,0,Math.PI*2);ctx.fillStyle=i<route.active?'#8caaa9':'#f4d08b';ctx.fill();ctx.fillStyle='#123047';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),a.x,a.y);});
  const home=to(0,0);ctx.strokeStyle='#d4e4ec';ctx.strokeRect(home.x-4,home.y-4,8,8);
  const a=to(s.x,s.z);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(s.heading);ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-6);ctx.lineTo(-4,0);ctx.lineTo(-8,6);ctx.closePath();ctx.fillStyle='#fff7df';ctx.strokeStyle='#0a283b';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore();
  ctx.textBaseline='top';ctx.textAlign='left';ctx.font='600 12px system-ui';ctx.fillStyle='#e5f0f5';ctx.fillText('N ↑',12,10);ctx.textAlign='right';ctx.fillText(distance(range*2)+' ACROSS',W-12,10);ctx.font='10px system-ui';ctx.fillText('LOCAL METRES · NOT A NAVIGATION CHART',W-12,H-20);draws++;
 }
 function update(s,p,instance,force=false){if(!s||!p)return;if(lastInstance!==instance){reset();lastInstance=instance;}lastS=s;lastP=p;route.observe(s,p);
  if(force||s.elapsed-lastReview>=.5||lastReview===-Infinity){review=N.lookAhead(s,p,sample);report=route.read(s,p,sample);lastReview=s.elapsed;}else report=N.solution(s,route.points[route.active],route.active?route.points[route.active-1]:route.start);
  text('nav-cog',deg(report.courseOverGroundRad));text('nav-stw',(s.speedThroughWaterMps/N.KNOT).toFixed(1)+' kn');text('nav-clearance',s.clearanceM===null?'UNKNOWN':s.clearanceM.toFixed(1)+' m');text('nav-bearing',deg(report.waypoint?.bearingRad));text('nav-range',report.waypoint?distance(report.waypoint.distanceM):'Tap chart');text('nav-eta',eta(report.waypoint?.etaSeconds??null));
  text('nav-route-name',report.waypoint?.name||(route.points.length?'ROUTE COMPLETE':'NO ROUTE'));
  const err=report.waypoint?.headingErrorRad;text('nav-guidance',err===undefined?'Steer manually':Math.abs(err)<.08?'On bearing':(err>0?'Starboard ':'Port ')+Math.round(Math.abs(err)*180/Math.PI)+'° to bearing');
  text('nav-warning',review?.status==='unknown'?'UNKNOWN WATER AHEAD':review?.status==='danger'?'SHALLOW WATER AHEAD':'30 s sampled path · '+(review?.minimumClearanceM?.toFixed(1)??'—')+' m min clearance');$('nav-warning').dataset.state=review?.status||'unknown';
  const cur=Math.hypot(s.currentX,s.currentZ);text('instrument-current',(cur/N.KNOT).toFixed(2)+' kn toward '+deg(N.bearing(s.currentX,s.currentZ)));text('instrument-wind',(Math.hypot(s.windX,s.windZ)/N.KNOT).toFixed(1)+' kn from '+deg(N.bearing(-s.windX,-s.windZ)));text('instrument-stw',(s.speedThroughWaterMps/N.KNOT).toFixed(2)+' kn');text('instrument-sog',(s.speedOverGroundMps/N.KNOT).toFixed(2)+' kn');text('instrument-cog',deg(report.courseOverGroundRad));text('instrument-depth',s.depthM.toFixed(2)+' m');text('instrument-vertical',s.verticalMps.toFixed(2)+' m/s '+(s.verticalMps>=0?'down':'up'));text('instrument-force',(s.verticalForceN/1000).toFixed(1)+' kN');text('instrument-thrust',(s.thrustN/1000).toFixed(1)+' kN');text('instrument-rudder',(s.rudderAngleRad*180/Math.PI).toFixed(1)+'°');
  if(open)draw();
 }
 return {reset,update,chartOpen,inspect:()=>({open,rangeM:range,follow,routePoints:route.points.map(p=>({...p})),active:route.active,trackSamples:route.track.length,navigation:report,lookAhead:review,draws,revision})};
}
G.AtlasNavigationUI14={create};if(typeof module!=='undefined')module.exports={create};
})(typeof window!=='undefined'?window:globalThis);
