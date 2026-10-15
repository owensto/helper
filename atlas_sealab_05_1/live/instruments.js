/* ATLAS MFD 05. Original instrument artwork. Geography from NOAA ENC derivative.
 * All vessel motion is simulated. Echo texture is illustrative, not live sonar.
 * NO DATA is retained; no fish targets, bottom materials or precision are invented. */
(()=>{'use strict';
const history=[],track=[];let last=-1,lastRange=60,lastPos=null,lastLocation=null;
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),KNOT=3600/1852,FT=3.280839895;
const heading=s=>((90+s.heading*180/Math.PI)%360+360)%360;
function txt(c,t,x,y,size=20,color='#dce9ed',align='left',weight=500){c.fillStyle=color;c.font=`${weight} ${size}px system-ui, sans-serif`;c.textAlign=align;c.fillText(String(t),x,y);}
function prep(canvas){const c=canvas.getContext('2d');c.setTransform(canvas.width/1024,0,0,canvas.height/640,0,0);c.clearRect(0,0,1024,640);return c;}
function box(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}
function line(c,x,y,X,Y,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();}
function header(c,title,tag){box(c,0,0,1024,46,'#061723');txt(c,'ATLAS',20,31,25,'#e5f4f1','left',750);txt(c,title,145,30,19,'#a9bfc8');txt(c,tag,1002,30,18,'#79d9c6','right',600);}
function dataCell(c,label,value,unit,x,width){line(c,x+width,57,x+width,133,'#36545e');txt(c,label,x+19,76,17,'#9bb1ba');txt(c,value,x+17,125,48,'#f6fbfa','left',650);txt(c,unit,x+width-14,124,18,'#8db1bb','right');}
function dm(v,lat){const abs=Math.abs(v),deg=Math.floor(abs);return String(deg).padStart(lat?2:3,'0')+'° '+((abs-deg)*60).toFixed(3)+'′ '+(lat?(v>=0?'N':'S'):(v>=0?'E':'W'));}
const I=window.CMD_INSTRUMENTS={range:1852,follow:true,center:null,screenPage:'sonar',theme:'day',headingUp:false,gain:.55,depthRange:0,history,track,
 reset(){history.length=0;track.length=0;last=-1;lastRange=60;lastPos=null;lastLocation=null;},heading,scrollRate:1,waypoint:null,pickTarget:false,
 observe(s){const teleported=lastPos&&Math.hypot(s.x-lastPos[0],s.z-lastPos[1])>300;if(s.elapsed<last||teleported||lastLocation!==s.location){I.reset();if(lastLocation&&lastLocation!==s.location)I.waypoint=null;}lastLocation=s.location;if(last<0||s.elapsed-last+1e-8>=.2/I.scrollRate){last=last<0?s.elapsed:last+.2/I.scrollRate;history.push(I.depth(s));if(history.length>360)history.shift();if(!track.length||Math.hypot(s.x-track.at(-1)[0],s.z-track.at(-1)[1])>2){track.push([s.x,s.z]);if(track.length>1200)track.shift();}}lastPos=[s.x,s.z];},
 navigation(s){if(!I.waypoint||I.waypoint.location!==s.location)return null;const dx=I.waypoint.x-s.x,dz=I.waypoint.z-s.z,d=Math.hypot(dx,dz);return {bearing:((90+Math.atan2(dz,dx)*180/Math.PI)%360+360)%360,distanceNM:d/1852,etaMinutes:s.speedOverGround>.5?d/s.speedOverGround/60:null};},
 pick(canvas,clientX,clientY,s){const r=canvas.getBoundingClientRect(),X=(clientX-r.left)/r.width*1024,Y=(clientY-r.top)/r.height*640;if(Y<148||Y>590)return false;const rot=I.headingUp?-(s.heading+Math.PI/2):0,scale=944/I.range,a=X-512,b=Y-379;I.waypoint={x:s.x+(Math.cos(rot)*a+Math.sin(rot)*b)/scale,z:s.z+(-Math.sin(rot)*a+Math.cos(rot)*b)/scale,location:s.location};return true;},
 course(s){return s.speedOverGround>.15?((90+Math.atan2(s.vz,s.vx)*180/Math.PI)%360+360)%360:null;},
 depth(s){return Number.isFinite(s.depth)&&!s.airborne?Math.max(0,s.depth+(s.config?.tide||0)-.45+(s.heave||0)):null;},
 draw(s,left,right){
  I.observe(s);
  I.chart(left,s,I.range,true);(I.screenPage==='engines'?I.engines:I.sonar)(right,s);
  for(const [id,type] of [['cmd-map','chart'],['cmd-sonar','sonar'],['mfd-chart','chart'],['mfd-echo','sonar']]){const e=$(id);if(e&&!e.hidden&&e.getClientRects().length&&(id.startsWith('cmd-')||!$('mfd-panel')?.hidden))I[type==='sonar'&&I.screenPage==='engines'?'engines':type](e,s,I.range,false);}
 },
 chart(canvas,s,range,mini){
  const c=prep(canvas),geo=s.location==='beaufort'&&window.BayGeo?.ready,G=window.BayGeo,night=I.theme==='night';
  header(c,'CHARTPLOTTER',geo?'SIM GPS • BEAUFORT':'SIM GPS • TEST BASIN');
  box(c,0,46,1024,102,'#0e2735');const hdg=heading(s),cog=I.course(s);
  dataCell(c,'SPEED OVER GROUND',(s.speedOverGround*KNOT).toFixed(1),'kn',0,342);
  dataCell(c,'HEADING',String(Math.round(hdg)%360).padStart(3,'0'),'°T',342,340);
  dataCell(c,'COURSE OVER GROUND',cog===null?'—':String(Math.round(cog)%360).padStart(3,'0'),'°T',682,342);
  const water=night?'#112d40':'#c8e8ee',land=night?'#4e594d':'#e7dfbd',shore=night?'#929580':'#9d967e',grid=night?'#254454':'#aecfd6';
  box(c,0,148,1024,442,water);
  const cx=I.follow||mini?s.x:(I.center?.[0]??s.x),cz=I.follow||mini?s.z:(I.center?.[1]??s.z),scale=944/range,rotation=I.headingUp?-(s.heading+Math.PI/2):0;
  const cs=Math.cos(rotation),sn=Math.sin(rotation),project=(x,z)=>{const a=(x-cx)*scale,b=(z-cz)*scale;return [512+cs*a-sn*b,379+sn*a+cs*b];};
  c.save();c.beginPath();c.rect(0,148,1024,442);c.clip();
  for(let x=0;x<1024;x+=128)line(c,x,148,x,590,grid);for(let y=148;y<590;y+=110)line(c,0,y,1024,y,grid);
  if(geo){c.fillStyle=land;c.strokeStyle=shore;c.lineWidth=2;for(const rings of G.data.land){c.beginPath();for(const ring of rings){ring.forEach((p,i)=>{const [x,y]=project(...p);i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath();}c.fill('evenodd');c.stroke();}
   if(range<7500){const cells=new Set();for(const p of G.data.soundings){const [x,y]=project(p[0],p[1]);if(x<18||x>978||y<175||y>565)continue;const key=Math.round(x/50)+','+Math.round(y/32);if(cells.has(key))continue;cells.add(key);txt(c,(p[2]*FT).toFixed(p[2]*FT<10?1:0),x,y,19,night?'#85b7c8':'#3e6178','center',500);}}
  }else{c.fillStyle=land;for(const [x,z,r]of[[205,62,49],[-115,95,43],[95,225,46]]){const p=project(x,z);c.beginPath();c.arc(...p,r*scale,0,Math.PI*2);c.fill();}}
  c.strokeStyle=night?'#b576f1':'#9347a8';c.lineWidth=3;c.beginPath();track.forEach((p,i)=>{const [x,y]=project(...p);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
  const nav=I.navigation(s);if(nav){const p=project(I.waypoint.x,I.waypoint.z),b=project(s.x,s.z);c.save();c.setLineDash([12,8]);line(c,...b,...p,'#bf57c8',3);c.setLineDash([]);c.strokeStyle='#bf57c8';c.lineWidth=3;c.beginPath();c.arc(...p,13,0,Math.PI*2);c.stroke();txt(c,'TARGET',p[0]+19,p[1]-8,18,'#9e37b6');c.restore();box(c,170,157,630,47,night?'#101624ed':'#ffffffec');txt(c,'BRG '+nav.bearing.toFixed(0)+'°T   DTG '+nav.distanceNM.toFixed(2)+' NM   ETA '+(nav.etaMinutes===null?'—':nav.etaMinutes.toFixed(1)+' min'),188,187,21,night?'#ecc5f1':'#6c3279');}
  const [bx,by]=project(s.x,s.z),end=project(s.x+s.vx*30,s.z+s.vz*30);c.save();c.setLineDash([9,7]);line(c,bx,by,...end,night?'#90e8e0':'#077e91',3);c.restore();
  c.save();c.translate(bx,by);c.rotate(s.heading+Math.PI/2+rotation);c.shadowColor='#00142180';c.shadowBlur=8;c.fillStyle='#087f95';c.strokeStyle='#ffffff';c.lineWidth=3;c.beginPath();c.moveTo(0,-23);c.lineTo(12,16);c.lineTo(0,11);c.lineTo(-12,16);c.closePath();c.fill();c.stroke();c.restore();
  c.fillStyle=night?'#061723df':'#f9fbf1e8';c.fillRect(18,164,140,36);txt(c,I.headingUp?'HEADING UP':'NORTH UP',30,188,17,night?'#cbe2df':'#3d626c');
  c.save();c.translate(970,200);c.rotate(rotation);c.strokeStyle=night?'#c9e2eb':'#294759';c.lineWidth=2;c.beginPath();c.moveTo(0,20);c.lineTo(0,-20);c.lineTo(-5,-10);c.moveTo(0,-20);c.lineTo(5,-10);c.stroke();txt(c,'N',0,-25,16,night?'#c9e2eb':'#294759','center');c.restore();
  const scaleMeters=range/4,bar=scaleMeters*scale;box(c,20,548,bar+22,31,night?'#071723dc':'#ffffffd9');line(c,31,566,31+bar,566,'#1b4855',3);line(c,31,560,31,571,'#1b4855',2);line(c,31+bar,560,31+bar,571,'#1b4855',2);txt(c,(scaleMeters/1852).toFixed(2)+' NM',43,560,15,night?'#cae3e8':'#1b4855');c.restore();
  box(c,0,590,1024,50,'#091d29');const ll=geo?G.toLL(s.x,s.z):null;txt(c,ll?dm(ll.lat,true)+'   '+dm(ll.lng,false):'FICTIONAL TEST COORDINATES',20,611,17);txt(c,geo?'NOAA-derived • SOUNDINGS ft • NOT NAVIGATION':'SIMULATION ONLY',20,632,14,'#9fae9f');txt(c,(range/1852).toFixed(2)+' NM',1000,617,23,'#dce9ed','right');
  if(!mini){if($('chart-coords'))$('chart-coords').textContent=ll?dm(ll.lat,true)+' · '+dm(ll.lng,false):'Fictional test basin';if($('map-scale'))$('map-scale').textContent=(range/1852).toFixed(2)+' NM';if($('chart-title'))$('chart-title').textContent=geo?'BEAUFORT / SIM GPS':'TEST BASIN / SIM GPS';}
 },
 sonar(canvas,s){
  const c=prep(canvas),d=I.depth(s),available=Number.isFinite(d),gain=I.gain;
  header(c,'ECHO SOUNDER','CHART-DERIVED SIMULATION');box(c,0,46,1024,102,'#0e2735');
  dataCell(c,'EST. DEPTH BELOW SENSOR',available?(d*FT).toFixed(1):'—','ft',0,375);
  dataCell(c,'SPEED / GROUND',(s.speedOverGround*KNOT).toFixed(1),'kn',375,302);
  const count=s.config?.count||1,rpm=s.engine?Math.round(s.rpm):0;
  dataCell(c,count===2?'PORT / STBD RPM':'ENGINE RPM',count===2?(Math.round(s.portRpm/100)/10).toFixed(1)+' / '+(Math.round(s.starboardRpm/100)/10).toFixed(1):rpm.toLocaleString(),count===2?'k':'',677,347);
  const max=Math.max(0,...history.filter(Number.isFinite).map(v=>v*FT));const wanted=[15,30,60,120,240,480].find(v=>v>max*1.25)||480;
  if(wanted>lastRange||max<lastRange*.32)lastRange=wanted;const range=I.depthRange||lastRange;
  const top=164,bottom=518,left=62,right=912,plotH=bottom-top;
  const g=c.createLinearGradient(0,top,0,bottom);g.addColorStop(0,'#091e3b');g.addColorStop(.6,'#082847');g.addColorStop(1,'#142b3b');box(c,left,top,right-left,plotH,g);
  c.save();c.beginPath();c.rect(left,top,right-left,plotH);c.clip();const sw=(right-left)/360;
  // Pixel texture is intentionally synthetic: it decorates the estimated bottom, not fish.
  history.forEach((dep,i)=>{if(!Number.isFinite(dep))return;const x=left+(360-history.length+i)*sw,y=top+clamp(dep*FT/range,0,1)*plotH;
   const seed=Math.sin(i*19.51+dep*3.29)*.5+.5;const thick=5+gain*12+seed*2;
   const fill=c.createLinearGradient(0,y,0,Math.max(y+1,bottom));fill.addColorStop(0,'#ffe569');fill.addColorStop(.10,'#ee9032');fill.addColorStop(.35,'#aa4b23');fill.addColorStop(1,'#372a2b');c.fillStyle=fill;c.fillRect(x,y,sw+1,bottom-y);
   c.fillStyle='#ffefaf';c.globalAlpha=.45+gain*.35;c.fillRect(x,y,sw+1,2);c.globalAlpha=1;
   c.fillStyle='rgba(26,76,113,.25)';for(let j=0;j<4;j++){const yy=top+((i*29+j*83)%320)/320*Math.max(0,y-top-8);c.fillRect(x,yy,sw+1,1+gain*2);}
   c.fillStyle='#a74523';c.globalAlpha=.22;c.fillRect(x,y+thick+seed*9,sw+1,2);c.globalAlpha=1;
  });c.restore();
  for(let i=0;i<5;i++){const y=top+plotH*i/4;line(c,left,y,right,y,'#e4edf219',1);txt(c,(range*i/4).toFixed(0),48,y+6,18,'#a8c3ce','right');}
  txt(c,'ft',24,153,16,'#a8c3ce');line(c,938,top,938,bottom,'#294458',1);txt(c,'NOW',969,156,16,'#89b1c3','center');
  box(c,950,top,36,plotH,'#081c2c');if(available){const y=top+clamp(d*FT/range,0,1)*plotH;box(c,950,y,36,8,'#ffe887');box(c,950,y+8,36,Math.max(0,bottom-y-8),'#86401e');}
  if(available&&history.length<4){txt(c,'COLLECTING BOTTOM HISTORY',480,328,22,'#a6c3d4','center');txt(c,'New simulated returns enter from the right',480,359,17,'#7a9bae','center');}
  if(!available){box(c,295,295,515,91,'#071b2be8');txt(c,s.airborne?'NO RETURN — SENSOR CLEAR':'NO DATA / NO BOTTOM ESTIMATE',552,330,24,'#ffe4aa','center',650);txt(c,'No valid chart coverage at this simulated position',552,363,16,'#a7bdc4','center');}
  box(c,0,533,1024,107,'#091d29');const ref=s.performanceMode==='reference',pr=ref?s.performance():null;const fuel=ref?(pr.lookup?pr.lookup.gph.toFixed(1)+' US gph':'UNMETERED'):(s.lastFuelRate||0).toFixed(1)+' US gph';
  txt(c,'RANGE '+range+' ft'+(!I.depthRange?' AUTO':''),22,560,18);txt(c,'GAIN '+Math.round(gain*100)+'% / '+I.scrollRate+'×',343,560,18);txt(c,'TRIM '+Math.round(s.trimActual*100)+'%',592,560,18);txt(c,s.gear===1?'FORWARD':s.gear===-1?'REVERSE':'NEUTRAL',1001,560,18,'#82dfc4','right');
  txt(c,`${count} × ${s.config?.hp||300} HP  •  ${fuel} ${ref?'REFERENCE':'MODELED'}`,22,592,21,'#dceae8');txt(c,'Bottom estimate from sparse chart points. Echo texture synthetic. No fish detection.',22,625,17,'#c5b895');
 },
 engines(canvas,s){
  const c=prep(canvas),count=s.config?.count||1,ref=s.performanceMode==='reference';
  header(c,'ENGINE MONITOR',ref?'F300 REFERENCE • SIM':'CUSTOM RIG • MODELED');
  box(c,0,46,1024,594,'#091d29');
  const rpms=count===2?[s.portRpm||0,s.starboardRpm||0]:[s.portRpm||s.rpm||0];
  const gear=s.gear===1?'FORWARD':s.gear===-1?'REVERSE':'NEUTRAL';
  const gauge=(cx,cy,r,rpm,label)=>{const start=Math.PI*.72,end=Math.PI*2.28;
   c.lineCap='round';c.strokeStyle='#1d3b4a';c.lineWidth=21;c.beginPath();c.arc(cx,cy,r,start,end);c.stroke();
   const progress=clamp(rpm/6500,0,1);c.strokeStyle=rpm>6000?'#e9b477':'#62d5bd';c.beginPath();c.arc(cx,cy,r,start,start+(end-start)*progress);c.stroke();
   for(let n=0;n<=6;n++){const a=start+(end-start)*n/6.5;line(c,cx+Math.cos(a)*(r-15),cy+Math.sin(a)*(r-15),cx+Math.cos(a)*(r-30),cy+Math.sin(a)*(r-30),'#aec3c8',2);txt(c,n,cx+Math.cos(a)*(r-47),cy+Math.sin(a)*(r-47)+5,17,'#b1c8ce','center');}
   const a=start+(end-start)*progress;line(c,cx,cy,cx+Math.cos(a)*(r-27),cy+Math.sin(a)*(r-27),'#eeeee1',3);
   c.fillStyle='#1c4653';c.beginPath();c.arc(cx,cy,8,0,Math.PI*2);c.fill();
   box(c,cx-83,cy+12,166,74,'#091d29');txt(c,Math.round(rpm).toLocaleString(),cx,cy+50,48,'#f2f9f5','center',650);txt(c,'RPM',cx,cy+77,16,'#9bb3bf','center');txt(c,label,cx,cy-r-32,20,'#b3d8d6','center',600);
  };
  if(count===1)gauge(306,295,137,rpms[0],'SINGLE OUTBOARD');else{gauge(268,282,133,rpms[0],'PORT');gauge(756,282,133,rpms[1],'STARBOARD');}
  if(count===1){txt(c,'SPEED / GROUND',648,176,19,'#91aab6');txt(c,(s.speedOverGround*KNOT).toFixed(1),648,257,82,'#ebfaf5','left',650);txt(c,'kn',839,257,32,'#71cfb9');txt(c,'HEADING '+Math.round(heading(s))+'°T',648,305,26);txt(c,gear,648,350,22,'#8edac5');}
  const bar=(label,val,x,y,w)=>{txt(c,label,x,y,18,'#94b4bc');txt(c,Math.round(val*100)+'%',x+w,y,20,'#e5f3ee','right');box(c,x,y+13,w,10,'#294752');box(c,x,y+13,w*clamp(val,0,1),10,'#78d6bd');};
  bar('THROTTLE',s.throttle,40,445,420);bar('ENGINE TRIM',s.trimActual,555,445,420);
  const pr=ref?s.performance():null,fuel=ref?(pr.lookup?pr.lookup.gph:null):(s.lastFuelRate||0),used=ref?s.referenceBurnGal:s.fuelUsedGal;
  line(c,25,494,995,494,'#34535f');txt(c,'FUEL FLOW',35,523,17,'#92b0bb');txt(c,fuel===null?'UNMETERED':fuel.toFixed(1)+' US gph',35,563,34);
  txt(c,'FUEL USED / '+(ref?'CURVE':'MODEL'),390,523,17,'#92b0bb');txt(c,(used||0).toFixed(2)+' US gal',390,563,34);
  txt(c,`${count} × ${s.config?.hp||300} HP`,980,523,23,'#85dac7','right',650);txt(c,s.engine?(s.startTimer>0?'STARTING':gear):'ENGINE OFF',980,562,25,'#dce8e3','right');
  txt(c,'Simulated signals. No invented oil-pressure, temperature or battery-health readings.',24,622,17,'#b9b49b');
 },

 inspect(){return {version:'05.1',waypoint:I.waypoint,scrollRate:I.scrollRate,screenPage:I.screenPage,theme:I.theme,headingUp:I.headingUp,rangeM:I.range,rangeNM:I.range/1852,gain:I.gain,historySamples:history.length,liveSonar:false,depthSource:'NOAA-derived sparse interpolation / simulation'};}
};})();
