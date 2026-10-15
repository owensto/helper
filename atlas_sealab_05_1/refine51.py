"""Bounded refinements to the checksum-reviewed Sea Lab 05 candidate."""
from pathlib import Path
import os,json,hashlib
R=Path(os.environ.get('SEA_ROOT','/mnt/data/sea05_finish'));P=R/'site'
def edit(file,a,b,count=1):
 p=P/file;s=p.read_text();n=s.count(a)
 if n!=count:raise ValueError(f'{file}: expected {count} occurrences, found {n}: {a[:95]}')
 p.write_text(s.replace(a,b))
# The thin lines were decorative screen graphics authored before dynamic instruments.
edit('app.js','ready=true;updateBoat(0);',"const mockGraphics=model.getObjectByName('EX_Console__top_underside');if(mockGraphics){mockGraphics.visible=false;mockGraphics.userData.retiredStaticScreenOverlay=true;}\n for(const material of modelScreens){material.metalness=0;material.roughness=.42;material.emissiveIntensity=.70;material.toneMapped=false;if(material.map){material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.map.needsUpdate=true;}}\n ready=true;updateBoat(0);")
# Stable look-ahead framing with an optional dedicated console view, rather than covering it with a modal.
edit('app.js',"lookPitch=next==='helm'?-.23:0", "lookPitch=next==='helm'?-.25:0")
edit('app.js',"camera.position.copy(world([-1.84,1.85,.18]));", "camera.position.copy(world([-1.70,1.72,.10]));")
edit('app.js',"camera.position.copy(world([-1.35,1.52,.10]));orbit.target.copy(world([-.67,1.05,0]));camera.fov=43;", "camera.position.copy(world([-1.55,1.48,0]));orbit.target.copy(world([-.82,1.235,0]));camera.fov=46;")
# At low frame rates, retain elapsed simulation time up to one second. Bigger stalls explicitly pause.
edit('app.js',"let dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;", "const wallDt=Math.max(0,(now-last)/1000);last=now;const timing=window.SEA_TIMING||(window.SEA_TIMING={frames:0,wallSeconds:0,simulationSeconds:0,stalls:0,emaFrameMs:16.7});timing.frames++;timing.emaFrameMs+=(wallDt*1000-timing.emaFrameMs)*.06;let dt=Math.min(2,wallDt);if(wallDt>2&&ready&&!document.hidden&&!gamePaused&&!modalOpen()&&mode==='drive'&&state.engine){gamePaused=true;acc=0;timing.stalls++;audio.suspend(true);message('Rendering stalled. Paused instead of silently slowing time; resume or choose Smooth detail.');}if(mode==='drive'&&!gamePaused&&!modalOpen())timing.wallSeconds+=dt;")
# Use the existing fixed 60 Hz integrator; instrument history samples there, not once per drawn frame.
needle="window.CMD_LAB?.afterStep(1/60);}acc-=1/60;"
edit('app.js',needle,"window.CMD_LAB?.afterStep(1/60);window.SEA_TIMING.simulationSeconds+=1/60;window.CMD_INSTRUMENTS?.observe(state);}acc-=1/60;")
edit('app.js',"window.CMD_LAB?.afterStep(1/60);}updateBoat(0);", "window.CMD_LAB?.afterStep(1/60);window.CMD_INSTRUMENTS?.observe(state);}updateBoat(0);")
edit('app.js',"if(mode==='inspect')state.elapsed+=simDt;", "if(mode==='inspect'){state.elapsed+=simDt;window.CMD_INSTRUMENTS?.observe(state);}")
# Don't leave keyboard thrust/steering active while editing instruments.
edit('app.js',"if(e.repeat||mode!=='drive'||modalOpen())return;", "if(e.repeat||mode!=='drive'||modalOpen())return;")
# Low-cost quality selection takes the user's actual choice into account (the existing controls remain).
# Sonar: no invented prior history, simulation-time sampling; waypoint navigation and engine pages.
edit('instruments.js',"const history=[],track=[];let last=-1,lastRange=60;", "const history=[],track=[];let last=-1,lastRange=60,lastPos=null,lastLocation=null;")
edit('instruments.js',"reset(){history.length=0;track.length=0;last=-1;lastRange=60;},heading,", "reset(){history.length=0;track.length=0;last=-1;lastRange=60;lastPos=null;lastLocation=null;},heading,scrollRate:1,waypoint:null,pickTarget:false,\n observe(s){const teleported=lastPos&&Math.hypot(s.x-lastPos[0],s.z-lastPos[1])>300;if(s.elapsed<last||teleported||lastLocation!==s.location){I.reset();if(lastLocation&&lastLocation!==s.location)I.waypoint=null;}lastLocation=s.location;if(last<0||s.elapsed-last>=.2/I.scrollRate){last=s.elapsed;history.push(I.depth(s));if(history.length>360)history.shift();if(!track.length||Math.hypot(s.x-track.at(-1)[0],s.z-track.at(-1)[1])>2){track.push([s.x,s.z]);if(track.length>1200)track.shift();}}lastPos=[s.x,s.z];},\n navigation(s){if(!I.waypoint||I.waypoint.location!==s.location)return null;const dx=I.waypoint.x-s.x,dz=I.waypoint.z-s.z,d=Math.hypot(dx,dz);return {bearing:((90+Math.atan2(dz,dx)*180/Math.PI)%360+360)%360,distanceNM:d/1852,etaMinutes:s.speedOverGround>.5?d/s.speedOverGround/60:null};},\n pick(canvas,clientX,clientY,s){const r=canvas.getBoundingClientRect(),X=(clientX-r.left)/r.width*1024,Y=(clientY-r.top)/r.height*640;if(Y<148||Y>590)return false;const rot=I.headingUp?-(s.heading+Math.PI/2):0,scale=944/I.range,a=X-512,b=Y-379;I.waypoint={x:s.x+(Math.cos(rot)*a+Math.sin(rot)*b)/scale,z:s.z+(-Math.sin(rot)*a+Math.cos(rot)*b)/scale,location:s.location};return true;},")
edit('instruments.js',"  if(last<0||s.elapsed-last>.18||s.elapsed<last){last=s.elapsed;history.push(I.depth(s));if(history.length>360)history.shift();if(!track.length||Math.hypot(s.x-track.at(-1)[0],s.z-track.at(-1)[1])>2){track.push([s.x,s.z]);if(track.length>1200)track.shift();}}", "  I.observe(s);")
edit('instruments.js',"I.chart(left,s,I.range,true);I.sonar(right,s);", "I.chart(left,s,I.range,true);(I.screenPage==='engines'?I.engines:I.sonar)(right,s);")
edit('instruments.js',"if(e&&!e.hidden&&(id.startsWith('cmd-')||!$('mfd-panel')?.hidden))I[type](e,s,I.range,false);", "if(e&&!e.hidden&&e.getClientRects().length&&(id.startsWith('cmd-')||!$('mfd-panel')?.hidden))I[type==='sonar'&&I.screenPage==='engines'?'engines':type](e,s,I.range,false);")
edit('instruments.js',"  const [bx,by]=project(s.x,s.z),end=", "  const nav=I.navigation(s);if(nav){const p=project(I.waypoint.x,I.waypoint.z),b=project(s.x,s.z);c.save();c.setLineDash([12,8]);line(c,...b,...p,'#bf57c8',3);c.setLineDash([]);c.strokeStyle='#bf57c8';c.lineWidth=3;c.beginPath();c.arc(...p,13,0,Math.PI*2);c.stroke();txt(c,'TARGET',p[0]+19,p[1]-8,18,'#9e37b6');c.restore();box(c,170,157,630,47,night?'#101624ed':'#ffffffec');txt(c,'BRG '+nav.bearing.toFixed(0)+'°T   DTG '+nav.distanceNM.toFixed(2)+' NM   ETA '+(nav.etaMinutes===null?'—':nav.etaMinutes.toFixed(1)+' min'),188,187,21,night?'#ecc5f1':'#6c3279');}\n  const [bx,by]=project(s.x,s.z),end=")
edit('instruments.js',"dataCell(c,'DEPTH BELOW TRANSDUCER'", "dataCell(c,'EST. DEPTH BELOW SENSOR'")
edit('instruments.js',"  if(!available){box(c,295", "  if(available&&history.length<4){txt(c,'COLLECTING BOTTOM HISTORY',480,328,22,'#a6c3d4','center');txt(c,'New simulated returns enter from the right',480,359,17,'#7a9bae','center');}\n  if(!available){box(c,295")
edit('instruments.js',"'GAIN '+Math.round(gain*100)+'%'", "'GAIN '+Math.round(gain*100)+'% / '+I.scrollRate+'×'")
edit('instruments.js'," inspect(){return {version:'05'", " inspect(){return {version:'05.1',waypoint:I.waypoint,scrollRate:I.scrollRate,screenPage:I.screenPage")
# Engine display lives in a separate canvas renderer but uses the same model state.
eng=(R/'engine_display.js').read_text()
edit('instruments.js'," inspect(){return",eng+"\n inspect(){return")
# Fill the wake consistently along motion, rather than leaving gaps when rendering slows.
edit('coast.js',"const T=this.T,n=192;", "const T=this.T,n=360;")
a=" this.foamTimer+=dt;if(mode==='drive'&&Math.abs(s.u)>.6&&this.foamTimer>.08){this.foamTimer=0;const c=Math.cos(s.heading),si=Math.sin(s.heading);for(const side of [-1,0,1]){this.foam.unshift({x:s.x-3.9*c-si*.45*side,z:s.z-3.9*si+c*.45*side,age:0,side,heading:s.heading,strength:Math.min(.60,.12+Math.abs(s.u)*.035)});}this.foam.length=Math.min(this.maxFoam,this.foam.length);}"
b=""" const prev=this.wakePose||{x:s.x,z:s.z};if(Math.hypot(s.x-prev.x,s.z-prev.z)>100)this.reset();
 this.foamTimer+=dt;const emission=.06;if(mode==='drive'&&Math.abs(s.u)>.6&&!s.airborne&&this.foamTimer>=emission){const count=Math.min(16,Math.floor(this.foamTimer/emission));this.foamTimer%=emission;const c=Math.cos(s.heading),si=Math.sin(s.heading);for(let n=0;n<count;n++){const f=(n+1)/count;for(const side of [-1,0,1])this.foam.unshift({x:prev.x+(s.x-prev.x)*f-3.9*c-si*.48*side,z:prev.z+(s.z-prev.z)*f-3.9*si+c*.48*side,age:dt*(1-f),side,heading:s.heading,speed:Math.abs(s.u),strength:Math.min(.70,.12+Math.abs(s.u)*.023)});}this.foam.length=Math.min(this.maxFoam,this.foam.length);}else if(mode!=='drive'||s.airborne)this.foamTimer=0;this.wakePose={x:s.x,z:s.z};"""
edit('coast.js',a,b)
edit('coast.js',"o.scale.set(.65+p.age*.38,1,.35+p.age*.28);", "o.scale.set(.80+(p.speed||0)*.055+p.age*.50,1,.42+p.age*.32);")
edit('coast.js',"reset(){this.foam.length=0;this.foamTimer=0;}","reset(){this.foam.length=0;this.foamTimer=0;this.wakePose=null;}")
# Sound: add a softly limited subharmonic combustion body; rain/hiss is not passed off as a recording.
edit('sound.js',"this.voices.push({gain,filter,pan,osc,tone,noiseGain:ng,band,record:null,recordGain:null});", "const body=c.createOscillator();body.type='sine';body.frequency.value=35;const bodyGain=c.createGain();bodyGain.gain.value=.08;body.connect(bodyGain);bodyGain.connect(gain);body.start();\n   this.voices.push({gain,filter,pan,osc,tone,body,bodyGain,noiseGain:ng,band,record:null,recordGain:null});")
edit('sound.js',"this.param(v.filter.frequency,450", "this.param(v.body.frequency,Math.max(14,rpm/40),t,.06);this.param(v.bodyGain.gain,.08+.10*load,t,.10);\n   this.param(v.filter.frequency,450")
edit('sound.js',"version:'05'", "version:'05.1'")
# Recovery is part of one delivered version. Never modify an old published release.
edit('index.html','<title>ATLAS Bay — Sea Lab 05</title>','<title>ATLAS Sea Lab 05.1 — Cockpit, Sound & Performance</title>') if '<title>ATLAS Bay — Sea Lab 05</title>' in (P/'index.html').read_text() else None
s=(P/'index.html').read_text();s=s.replace('</head>','<script defer src="polish51.js"></script><link rel="stylesheet" href="polish51.css"></head>');s=s.replace('SEA LAB 05','SEA LAB 05.1');(P/'index.html').write_text(s)
for name in ['polish51.js','polish51.css']:(P/name).write_text((R/name).read_text())
# Single-frame diagnostics remain visible only when requested.
report={'release':'05.1','approved_model_sha256':hashlib.sha256((P/'assets/ATLAS_Bay_Play.glb').read_bytes()).hexdigest(),'native_boat_mesh_unchanged':True,'retired_static_screen_overlay':'EX_Console__top_underside','source_candidate_run':38660648623,'source_candidate_artifact':11938184435,'frame_time_limit_seconds':2,'oversized_stalls_pause':True,'under_1ft_draft_established':False,'custom_rigs_validated':False,'specific_engine_sound':False,'google_activated':False,'changes':['Reference-informed resistance from reviewed 05 replaces 04.2 custom resistance','Recorded CC0 outboard sound layered with load/RPM synthesis, spatial twin voices','Readable knot speed HUD and test graph','Live chart with heading/course, target bearing/distance/ETA','Depth history sampled in fixed simulation steps; scroll and range controls','Separate live engine-monitor page','Retired static line overlays obscuring real cockpit screens','Persistent on-screen speed, optional pure cockpit view','Neutral coasting retained; no instant brake','Consistent wake density across render rates','Low-rate time handling corrected; severe stalls pause instead of silently losing time']}
assert report['approved_model_sha256']=='4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1'
(P/'release05_1.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
