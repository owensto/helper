"""Assertion-checked standalone Beaufort product release, preserving the public12 base."""
from pathlib import Path
import json,hashlib,shutil,subprocess,os,sys,gzip
ROOT=Path(__file__).resolve().parent;BASE=Path(os.environ.get('BASE_SITE',ROOT.parent/'atlas_sealab_12/live'));SITE=Path(os.environ.get('SEA_SITE',ROOT/'site'))
if SITE.exists():shutil.rmtree(SITE)
shutil.copytree(BASE,SITE)
for name in ['raster13.js','depth-worker13.js','stream13.js','scenery13.js','experience13.js','experience13.css','compressed13.js']:shutil.copy2(ROOT/name,SITE/name)
def patch(name,old,new,count=1):
 p=SITE/name;s=p.read_text();assert s.count(old)==count,(name,s.count(old),old[:90]);p.write_text(s.replace(old,new))
# Index ray-crossing edges in horizontal bands; exact original crossing arithmetic/order.
p=SITE/'geography.js';s=p.read_text();start=s.index('function inside(');end=s.index('const Geo=',start)
s=s[:start]+"""const edgeBands13=new WeakMap();
function inside(x,z,ring){let bands=edgeBands13.get(ring);if(!bands){bands=new Map();for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],c=ring[j];if(a[1]===c[1])continue;for(let k=Math.floor(Math.min(a[1],c[1])/64);k<=Math.floor(Math.max(a[1],c[1])/64);k++){if(!bands.has(k))bands.set(k,[]);bands.get(k).push([a,c]);}}edgeBands13.set(ring,bands);}let b=false;for(const[a,c]of bands.get(Math.floor(z/64))||[]){if((a[1]>z)!==(c[1]>z)&&x<(c[0]-a[0])*(z-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;}
"""+s[end:];p.write_text(s)
# Same nearest-six -> crossing exclusion -> nearest-four weighted source lookup.
patch('geography.js',"const Geo={ready:false", "const spatial13=new Map(),stats13={lookups:0,hits:0,evictions:0};function nearest13(x,z,data){const out=[];for(let ix=Math.floor((x-350)/128);ix<=Math.floor((x+350)/128);ix++)for(let iz=Math.floor((z-350)/128);iz<=Math.floor((z+350)/128);iz++)for(const index of spatial13.get(ix+','+iz)||[]){const p=data.soundings[index],d=(x-p[0])**2+(z-p[1])**2;if(d<350**2)out.push({p,d,index});}out.sort((a,b)=>a.d-b.d||a.index-b.index);return out.slice(0,6);}\nconst Geo={stats13,ready:false")
patch('geography.js',"if(this.cache.has(key))return this.cache.get(key);", "stats13.lookups++;if(this.cache.has(key)){stats13.hits++;const cached=this.cache.get(key);this.cache.delete(key);this.cache.set(key,cached);return cached;}")
patch('geography.js',"this.data.soundings.map(p=>({p,d:(x-p[0])**2+(z-p[1])**2})).filter(v=>v.d<350**2).sort((a,b)=>a.d-b.d).slice(0,6)", "nearest13(x,z,this.data)")
patch('geography.js',"if(this.cache.size>8000)this.cache.clear();", "if(this.cache.size>=49152){this.cache.delete(this.cache.keys().next().value);stats13.evictions++;}")
patch('geography.js',"Geo.data=d;", "Geo.data=d;d.soundings.forEach((p,i)=>{const k=Math.floor(p[0]/128)+','+Math.floor(p[1]/128);if(!spatial13.has(k))spatial13.set(k,[]);spatial13.get(k).push(i);});")
patch('geography.js','})(window);',"})(typeof window!=='undefined'?window:globalThis);")
# Only visual sampling moves out of the main thread. The bed object/material hooks stay stable.
p=SITE/'water09.js';s=p.read_text();a=s.index(' function rebuild(){');b=s.index(' // Retain the proven',a);s=s[:a]+" origin.value.set(1e8,1e8);const rebuild=SEA13_STREAM.bindTerrain({A,T,g,pos,bed,ctx,img,tex,origin,report});\n"+s[b:];p.write_text(s)
# Correct excessive hull-water exclusion: use the actual outer hull width at the water's local HEIGHT.
p=SITE/'refinement06.js';s=p.read_text();s=s.replace('maskSections,matrices=[]','maskSections,hull13=null,matrices=[]');a=s.index(" let interpolate='';");b=s.index(" sh.fragmentShader=mask+",a)
s=s[:a]+''' sh.uniforms.uHullSections13={value:hull13};sh.uniforms.uHullSpeed13={value:0};sh.uniforms.uHullTime13={value:0};inv.shader13=sh;
 const mask=`uniform sampler2D uHullSections13;uniform float uHullSpeed13;uniform float uHullTime13;uniform float uDryEnabled10;uniform mat4 uDryBoatInverse;varying vec3 vDryWorld;
 vec2 wetWidth13(vec3 p){if(p.x< -3.75||p.x>3.75||p.y< -.52||p.y>1.18)return vec2(0.);vec2 uv=vec2(((p.x+3.75)/7.5*150.+.5)/151.,((p.y+.52)/1.70*85.+.5)/86.);vec4 t=texture2D(uHullSections13,uv);return vec2(t.r*65280.+t.g*255.,t.b*65280.+t.a*255.)/65535.*1.4;}
 bool dryInterior(vec3 q){vec3 p=(uDryBoatInverse*vec4(q,1.)).xyz;vec2 w=wetWidth13(p);return w.x>.005&&w.y>.005&&p.z<w.x&&p.z> -w.y;}
 float hullWaterline13(vec3 q){if(uDryEnabled10<.5)return 0.;vec3 p=(uDryBoatInverse*vec4(q,1.)).xyz;vec2 w=wetWidth13(p);float side=p.z>0.?w.x:w.y;if(side<.03)return 0.;float d=abs(p.z)-side;return smoothstep(0.,.015,d)*(1.-smoothstep(.02,.13,d))*(.15+.55*clamp(uHullSpeed13/12.,0.,1.))*(.6+.4*sin(p.x*17.-uHullTime13*7.));}`;
''' +s[b:]
s=s.replace("fetch('repair06_sections.json').then(r=>r.json()).then(v=>{maskSections=v;", "fetch('assets/hull_water13.json').then(r=>{if(!r.ok)throw Error('Hull water profile unavailable');return r.json();}).then(v=>{hull13=new T.DataTexture(Uint8Array.from(atob(v.dataBase64),c=>c.charCodeAt(0)),v.width,v.height,T.RGBAFormat,T.UnsignedByteType);hull13.minFilter=hull13.magFilter=T.LinearFilter;hull13.generateMipmaps=false;hull13.needsUpdate=true;report.hullWaterline13={source:v.modelSHA256,sourceNodes:v.sourceNodes,insetM:v.insetM,heightAware:true};")
s=s.replace("i.active10.value=S.destroyed10?0:1;", "i.active10.value=S.destroyed10?0:1;if(i.shader13){i.shader13.uniforms.uHullSpeed13.value=Math.hypot(S.u||0,S.v||0);i.shader13.uniforms.uHullTime13.value=S.elapsed;}")
p.write_text(s)
patch('water12.js',"float foam11=clamp((shore11*.70+crest11*.30+whitecap12*.28)*grain11+wakeFoam12*(.63+.37*grain11),0.,.84);", "float foam11=clamp((shore11*.70+crest11*.30+whitecap12*.28)*grain11+wakeFoam12*(.63+.37*grain11),0.,.84);foam11=max(foam11,hullWaterline13(vDryWorld));")
# Retain reflection visuals but avoid render-count cadence and suppress them in balanced as before.
patch('water12.js','let frame=0,reflectionReady=false','let frame=0,lastReflection13=-1e6,reflectionReady=false')
patch('water12.js',"if(!quality||++frame%4!==0||A.camera.position.y<waterY+.15)return;", "if(!quality||performance.now()-lastReflection13<125||A.camera.position.y<waterY+.15)return;lastReflection13=performance.now();")
# All referenced source features remain available to Geo Map; only rendering uses baked buffers.
p=SITE/'geo12.js';s=p.read_text();a=s.index('const mats=');b=s.index('const tabs=',a)
s=s[:a]+'''Promise.all([fetch('assets/beaufort_features12.json').then(r=>{if(!r.ok)throw Error('Beaufort map data unavailable');return r.json();}),Sea13Scenery.load(A,root)]).then(([data,mesh])=>{features=data.features;colliders.push(...mesh.colliders);Object.assign(report,mesh.counts,{ready:true,source:data.source,retrieved:data.retrieved_utc,baked:true});}).catch(e=>{report.error=e.message;console.error(e.message);});
''' +s[b:];s=s.replace("root.visible=S.location==='beaufort';", "root.visible=S.location==='beaufort';if(root.visible)Sea13Scenery.update(A,root);")
p.write_text(s)
p=SITE/'beaufort-coast.js';s=p.read_text();a=s.index(' buildRegion(g){');b=s.index(' update(dt,mode)',a);s=s[:a]+" buildRegion(g){this.regionReady=true;}\n"+s[b:];p.write_text(s)
# Raster chart only when actually visible; old tile is not mislabeled as the new origin.
p=SITE/'helm09.js';s=p.read_text();a=s.index('  if(key!==mapTile){');b=s.index('c.strokeStyle=',a)
s=s[:a]+'''  const tile13=SEA13_STREAM.mapImage(S,mapRange);c.fillStyle='#132e3b';c.fillRect(0,0,w,h);if(tile13){const dx13=(tile13.x-S.x)*scale,dz13=(tile13.z-S.z)*scale;c.drawImage(tile13.canvas,dx13,dz13,w,h);}else{c.fillStyle='#c0d6cf';c.font='18px system-ui';c.fillText('Preparing depth chart…',24,58);}
  '''+s[b:];s=s.replace("if(!$('helm09-mapcard').hidden&&performance.now()-lastMap>250)","if(!$('helm09-mapcard').hidden&&!$('helm09-mapcanvas').hidden&&performance.now()-lastMap>250)")
p.write_text(s)
p=SITE/'index.html';s=p.read_text().replace('<script defer src="water09.js">','<script defer src="raster13.js"></script><script defer src="stream13.js"></script><script defer src="water09.js">').replace('<script defer src="geo12.js">','<script defer src="scenery13.js"></script><script defer src="geo12.js">').replace('</head>','<script defer src="experience13.js"></script><link rel="stylesheet" href="experience13.css"></head>').replace('<body>','<body><div id="sea13-loading" role="status"><strong>ATLAS</strong><p>Preparing Beaufort waterfront…</p><small>Engine off · controls ready in a moment</small></div>');s=s.replace('ATLAS Sea Lab 11 · Coastal Drive','ATLAS Sea Lab 13 · Beaufort River').replace('Drive and explore the actual ATLAS Bay 25 model in a fictional practice basin.','Drive the ATLAS Bay 25 on the mapped Beaufort River, with optional practice water.');p.write_text(s)
patch('index.html','<script defer="" src="app.js">','<script defer src="compressed13.js"></script><script defer="" src="app.js">')
patch('app.js',"new T.GLTFLoader().load('assets/ATLAS_Bay_Play.glb',","Sea13Model.load(")
(SITE/'assets/ATLAS_Bay_Play.glb.gz').write_bytes(gzip.compress((SITE/'assets/ATLAS_Bay_Play.glb').read_bytes(),compresslevel=9,mtime=0))
# Required shared mesh sample, independent of other owner branches.
subprocess.run([sys.executable,str(ROOT/'build_hull13.py'),str(SITE)],check=True)
subprocess.run(['node',str(ROOT/'bake-coast13.cjs'),str(SITE)],check=True)
for f in ['command-motion.js','world09.js','captain12.js','shore12.js','waves11.js','physics.js','operations10.js','assets/ATLAS_Bay_Play.glb']:
 assert (SITE/f).read_bytes()==(BASE/f).read_bytes(),f
(SITE/'release13.json').write_text(json.dumps({'release':13,'basePublic':'a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff','default':'beaufort','asynchronousVisualRasters':True,'prebuiltCoast':True,'heightAwareHullWaterMask':True,'unchangedPhysicsCoefficientsAndCaptain':True,'experimentalHuman':False,'multiplayer':False},indent=2))
print('Prepared Sea13. Actual browser appearance/performance not established by this build step.')
