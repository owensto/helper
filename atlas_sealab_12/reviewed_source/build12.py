"""Version 12, assertion-checked patches against the published Sea Lab 11."""
from pathlib import Path
import shutil,json
r=Path(__file__).parent;site=r/'site'
def patch(name,a,b,n=1):
 p=site/name;s=p.read_text();assert s.count(a)==n,(name,a[:90],s.count(a));p.write_text(s.replace(a,b))
for name in ['captain12.js','shore12.js','water12.js','geo12.js','experience12.js','experience12.css']:shutil.copy2(r/name,site/name)
shutil.copy2(r/'waves12.js',site/'waves11.js')
for name in ['beaufort_features12.json','sources.json']:shutil.copy2(r/'external'/name,site/'assets'/name)
for name in ['leaflet.js','leaflet.css','LEAFLET_LICENSE.txt']:shutil.copy2(r/'external'/name,site/name)
patch('index.html','<script defer src="command-motion.js">','<script defer src="shore12.js"></script><script defer src="captain12.js"></script><script defer src="command-motion.js">')
patch('index.html','</head>','<link rel="stylesheet" href="leaflet.css"><script defer src="leaflet.js"></script><script defer src="water12.js"></script><script defer src="geo12.js"></script><script defer src="experience12.js"></script><link rel="stylesheet" href="experience12.css"></head>')
patch('command-motion.js','if(G.Sea10Runtime)G.Sea10Runtime.beforeStep(this,dt);this.elapsed+=dt;','if(G.Sea10Runtime)G.Sea10Runtime.beforeStep(this,dt);if(G.Sea12Waves)G.Sea12Waves.advance(this,dt);this.elapsed+=dt;')
patch('command-motion.js','const surgeResponse=fx*this.u>=0&&!sport?0.74:1;','const surgeResponse=1;this.acceleration12=fx/M;')
# Retain horsepower-limited thrust and mass; remove only the arbitrary 26% damper.
p=site/'command-motion.js';s=p.read_text();a=s.index(" if(this.location==='beaufort'&&G.BayGeo?.ready){");b=s.index(' // Contact uses the very same seabed',a)
s=s[:a]+''' if(this.location==='beaufort'){
  const hit=G.Sea10Dynamics?.resolveObstacles(this,px,pz,G.SEA12_GEO?.colliders||[]);if(hit)G.Sea10Runtime?.onImpact(this,hit);
 }else{const hit=G.Sea10Dynamics?.resolveObstacles(this,px,pz,obstacles);if(hit)G.Sea10Runtime?.onImpact(this,hit);}
 const shore=G.Sea12Shore?.resolve(this,px,pz);if(shore)G.Sea10Runtime?.onImpact(this,shore);
'''+s[b:];p.write_text(s)
patch('command-motion.js',"G.Sea11Waves.sample(x,z,t,(presets[p]||presets.calm).amp).height;","G.Sea11Waves.sample(x,z,t,(presets[p]||presets.calm).amp).height+(G.Sea12Waves?.wakeSample(x,z,t).height||0);")
patch('coast.js','sh.uniforms.uBayTime={value:0};','sh.uniforms.uWake12={value:Array.from({length:12},()=>new T.Vector4())};sh.uniforms.uWakeDir12={value:Array.from({length:12},()=>new T.Vector2())};sh.uniforms.uWakeCount12={value:0};sh.uniforms.uBayTime={value:0};')
# More samples across the bow and stern reduce single-corner wobble. Retain total
# support/damping and gravitational acceleration; no cosmetic boat-only bobbing.
patch('command-motion.js','spring=M*omega*omega/4, damping=M*(sport?1.0:1.15)/4;','spring=M*omega*omega/6, damping=M*(sport?1.0:1.15)/6;')
patch('command-motion.js','[[2.6,-.85],[2.6,.85],[-2.6,-.85],[-2.6,.85]]','[[2.6,-.75],[2.6,.75],[0,-.95],[0,.95],[-2.6,-.85],[-2.6,.85]]')
patch('command-motion.js','M*9.81/4','M*9.81/6',2)
# Live chart is not a pause menu; preserve a manually paused state.
patch('access11.js',"const panelKind=SEA09.inspect().panel,toolOpen=(!$('helm09-panel').hidden&&panelKind!=='radio')||!$('helm09-mapcard').hidden;","const panelKind=SEA09.inspect().panel,toolOpen=(!$('helm09-panel').hidden&&panelKind!=='radio');")
patch('access11.js',"root.classList.toggle('s11-panel-open',!$('helm09-panel').hidden||!$('helm09-mapcard').hidden);","root.classList.toggle('s11-panel-open',!$('helm09-panel').hidden);")
patch('access11.js',"setting('autoPause','Pause while using tools','Stops the simulation while you read menus; music controls stay live.')","setting('autoPause','Pause while reading menus','Map and music stay live. Other menus can pause the trip.')")
patch('helm09.js',"function toggleMap(){const e=$('helm09-mapcard');","function toggleMap(){closePanel();const e=$('helm09-mapcard');")
patch('helm09.js',"else if(type==='throttle')S.throttle=cap(Number(value),0,1);","else if(type==='throttle'){S.throttle=cap(Number(value),0,1);S.lastThrottleAt12=S.elapsed;}")
# Make the normal captain the same person used by the optional overboard event.
p=site/'operations10.js';s=p.read_text();start=s.index(" function ensureDriver(){");end=s.index('  splashRing=',start)
s=s[:start]+''' function ensureDriver(){if(driver)return;const rig=Sea12Captain.build(T);driver=rig.group;limbs=rig.limbs;
'''+s[end:];s=s.replace("if(opts.ejection)ensureDriver();S.config.physics=", "ensureDriver();S.config.physics=");p.write_text(s)
patch('operations10.js',"if(driver)driver.visible=opts.ejection&&(ejected||A.cameraMode()!=='helm'&&A.cameraMode()!=='instruments');","if(driver)driver.visible=!S.destroyed10&&(ejected||A.cameraMode()!=='helm'&&A.cameraMode()!=='instruments');")
# More useful river view clipping distance, without changing boat scale.
patch('app.js','camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.03,1800)','camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.06,14000)')
# Accept official playlist embeds without extraction or hidden background playback.
patch('helm09.js'," if(id){if(!/^[\\w-]{11}$/.test(id))", " const list=u.searchParams.get('list');if(!id&&['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)&&list){if(!/^[\\w-]{10,150}$/.test(list))throw Error('Invalid playlist');return {type:'youtube',id:'playlist:'+list,url:'https://www.youtube.com/playlist?list='+list};}\n if(id){if(!/^[\\w-]{11}$/.test(id))")
patch('helm09.js',"fallback.href='https://www.youtube.com/watch?v='+id;", "fallback.href=id.startsWith('playlist:')?'https://www.youtube.com/playlist?list='+id.slice(9):'https://www.youtube.com/watch?v='+id;")
patch('helm09.js',"videoId:id,playerVars:{playsinline:1,controls:1,autoplay:0,origin:location.origin}","videoId:id.startsWith('playlist:')?undefined:id,playerVars:{playsinline:1,controls:1,autoplay:0,origin:location.origin,...(id.startsWith('playlist:')?{listType:'playlist',list:id.slice(9)}:{})}")
# Retain provenance; version metadata is explicit.
(site/'release12.json').write_text(json.dumps({'release':12,'base':'Sea Lab 11','eightDispersiveWaves':True,'referenceWaveDepthM':8,'captain':True,'mapPauses':False,'beaufortData':'OSM footprints / NOAA shoreline','photogrammetry':False,'physicsValidated':False,'spotify':'external only'},indent=2))
print('Prepared Sea Lab 12')
