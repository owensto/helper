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
