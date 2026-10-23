"""Assemble a separate fleet site from immutable yacht and original warship inputs."""
from pathlib import Path
import hashlib,json,subprocess,shutil,struct,argparse,re
ROOT=Path(__file__).resolve().parent
YACHT='170f328708accc967f36bbb57c6f7ad02c6d38cb'
ORIGINAL='5d0e90f070643c4b3ee8b1602ec1dba88594cf15'
MODEL='atlas_bay_studio_07/live/assets/ATLAS_W.glb'
BLOB='826f70bfaae812538aca710ab9f10a09fae70a24'
def git(path,sha):return subprocess.check_output(['git','show',f'{sha}:{path}'])
def digest(b):return hashlib.sha256(b).hexdigest()
def once(s,a,b):
 if s.count(a)!=1:raise ValueError(f'Pinned patch boundary changed: {a[:80]!r} count={s.count(a)}')
 return s.replace(a,b)
a=argparse.ArgumentParser();a.add_argument('--local-baseline');a.add_argument('--source-only',action='store_true');args=a.parse_args()
def baseline(path):return (Path(args.local_baseline)/path).read_bytes() if args.local_baseline else git('atlas_yacht_rebuild/site/'+path,YACHT)
site=ROOT/'site';site.mkdir(exist_ok=True)
pins=json.loads(baseline('BUILD.json'))['files']
for name,sha in pins.items():
 b=baseline(name)
 if digest(b)!=sha:raise ValueError('BASELINE_HASH '+name)
 p=site/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
if not args.source_only:
 b=git(MODEL,ORIGINAL)
 assert len(b)==6244704 and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==BLOB
 assert struct.unpack_from('<4sII',b)==(b'glTF',2,len(b))
 j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
 assert not any(x.get('uri') for x in j.get('buffers',[]))
 assert not any(x.get('uri') for x in j.get('images',[]))
 (site/'assets').mkdir(exist_ok=True);(site/'assets/ATLAS_W.glb').write_bytes(b)
 meta={'sourceSHA':ORIGINAL,'sourcePath':MODEL,'gitBlob':BLOB,'bytes':len(b),'sha256':digest(b),'nodes':len(j['nodes']),'meshes':len(j['meshes']),'animationClips':len(j.get('animations',[])),'sourceModified':False}
 (site/'warship-asset.json').write_text(json.dumps(meta,indent=2)+'\n')
p=(site/'physics.js').read_text()
start=p.index('const P=Object.freeze(');end=p.index('\nconst clamp=',start)
wp="const P=Object.freeze({length:125,beam:18,draft:4.85,mass:6000000,surgeMass:7200000,swayMass:11000000,yawInertia:8.0e9,propSpacing:8.2,maxThrust:250000,reverseFactor:.55,thrustLag:3.5,rudderLimit:.5235987756,rudderRate:.0523598776,linearDrag:11500,quadraticDrag:4200,swayDrag:160000,yawDrag:7.0e8,bowForce:70000});"
p=p[:start]+wp+p[end:]
p=p.replace('rudderForce*29+bow*30','rudderForce*52+bow*45').replace('[-44.1,-30,-15,0,15,30,41.5]','[-63,-45,-25,0,25,45,63]').replace('[-6.82,0,6.82]','[-9.5,0,9.5]').replace('Atlas83','AtlasW')
(site/'warship-physics.js').write_text('/* ATLAS-W authored prototype handling; not calibrated or naval-engineering data. */\n'+p)
s=(site/'app.js').read_text();s=once(s,"(()=>{'use strict';","(async()=>{'use strict';")
s=once(s,"const vessel=new Atlas83.Vessel(),model=buildAtlas83(T);scene.add(model.root);","const F=AtlasFleet.config,Dynamics=AtlasFleet.dynamics(),vessel=new Dynamics.Vessel(),model=await AtlasFleet.buildModel(T);scene.add(model.root);AtlasFleet.mount();")
s=s.replace('Atlas83.wave','Dynamics.wave')
s=s.replace('s.x-41*c','s.x+F.wakeX*c').replace('s.z-41*z','s.z+F.wakeX*z').replace('s.x-42*c','s.x+(F.wakeX-1)*c').replace('s.z-42*z','s.z+(F.wakeX-1)*z')
s=once(s,'let [p,target]=poses[name];','let [p,target]=F.poses?F.poses[name]:poses[name];')
s=once(s,"if(name==='exterior'&&portrait)p=[-124.3,79.2,189.2];","if(name==='exterior'&&portrait)p=F.portraitExterior||[-124.3,79.2,189.2];")
s=once(s,"if(name==='stern'&&portrait)p=[-77,26,55];","if(name==='stern'&&portrait)p=F.id==='warship'?[-112,42,82]:[-77,26,55];")
s=once(s,"let [p,target]=poses[view];","let [p,target]=F.poses?F.poses[view]:poses[view];")
s=once(s,"if(view==='stern'&&innerWidth<innerHeight)p=[-77,26,55];","if(view==='stern'&&innerWidth<innerHeight)p=F.id==='warship'?[-112,42,82]:[-77,26,55];")
s=once(s,"'BEACH CLUB & AFT TERRACES'","(F.id==='warship'?'AFT FLIGHT DECK':'BEACH CLUB & AFT TERRACES')")
s=once(s,"'Live wheel, twin levers and forward visibility'","(F.id==='warship'?'Starboard bridge-wing view · no walkable crew':'Live wheel, twin levers and forward visibility')")
s=once(s,'controls.maxDistance=320;',"controls.maxDistance=AtlasFleet.config.id==='warship'?500:320;")
s=once(s,"version:'atlas83-rebuild-1'","version:'atlas-mobile-fleet-1'")
s=once(s,'model:model.root.userData,render:','vesselId:F.id,model:model.root.userData,modelSource:AtlasFleet.source(),parameters:Dynamics.P,render:')
(site/'app.js').write_text(s)
shutil.copy2(ROOT/'fleet.js',site/'fleet.js')
h=(site/'index.html').read_text()
h=once(h,'<script src="app.js"></script>','<script src="warship-physics.js"></script><script src="fleet.js"></script><script src="app.js"></script>')
h=once(h,'<link rel="stylesheet" href="mobile.css">','<link rel="stylesheet" href="mobile.css"><link rel="stylesheet" href="fleet.css">')
h=h.replace('<title>ATLAS 83 — Mobile Helm</title>','<title>ATLAS — Mobile Fleet</title>').replace('Preparing your yacht','Preparing your vessel').replace('Original model · no Bay scene','Yacht or ATLAS-W · one mobile helm')
h=once(h,'</body>', '''<dialog id="fleet-dialog" aria-labelledby="fleet-title"><div class="panel-top"><h2 id="fleet-title">Choose your vessel</h2><button id="fleet-close" aria-label="Close vessel selection">×</button></div><p>Changing vessel starts a fresh voyage, engines off. Opening this chooser pauses the current voyage.</p><a class="fleet-card" id="select-yacht" data-vessel="yacht" href="?vessel=yacht"><strong>ATLAS 83</strong><span>Rebuilt motor yacht · mobile helm</span></a><a class="fleet-card" id="select-warship" data-vessel="warship" href="?vessel=warship"><strong>ATLAS-W</strong><span>Original surface warship · prototype handling</span></a><small>Solo sailing. No combat, submarine, crew or multiplayer integration.</small></dialog></body>''')
(site/'index.html').write_text(h)
(site/'fleet.css').write_text('''#fleet-dialog{color:#e8f1f1;background:#132b35;border:1px solid #77938f;border-radius:18px;width:min(460px,calc(100vw - 28px));max-height:calc(100dvh - 32px);padding:22px;font:15px/1.5 system-ui}#fleet-dialog::backdrop{background:#001118cc}#fleet-dialog h2{margin:0;font-size:25px}#fleet-dialog button{min-width:48px;min-height:48px}#fleet-dialog .fleet-card{display:flex;flex-direction:column;padding:19px;margin:14px 0;border:1px solid #6a8b8b;border-radius:12px;color:#f0f4f2;text-decoration:none;min-height:82px;background:#1d3c45}#fleet-dialog .fleet-card[aria-current=page]{border-color:#e3c89c}#fleet-dialog .fleet-card strong{font-size:22px}#fleet-dialog .fleet-card span,#fleet-dialog small{font-size:13px;color:#c2d5d7}.brand{white-space:nowrap;font-size:18px!important;letter-spacing:.04em!important;min-height:44px;display:flex;align-items:center}''')
(site/'README.md').write_text('''# ATLAS Mobile Fleet 01\n\nYacht baseline: '''+YACHT+''' (unchanged yacht model, physics, mobile input module and Three runtime). Select the vessel using its name in the top left. Switching starts a new voyage, engines off.\n\nATLAS-W is your existing surface-ship exterior, not a renamed yacht. Original source '''+ORIGINAL+':'+MODEL+'''; blob '''+BLOB+'''. Full bytes are verified before GLTF parsing. No source-mesh/texture replacement, scaling or auto-playing of its original multi-mechanism clip. Propeller and rudder display updates are runtime presentation only. Bridge wing is an exterior camera. No walkable interiors, handling choreography, weapons operation, crew, submarine or multiplayer.\n\nATLAS-W handling is explicitly authored prototype tuning: 125m length, 18m beam, 4.85m draft, assumed6,000,000kg mass, independent250,000N maximum shaft thrust,3.5s thrust lag,3deg/s rudder rate. Parameters are disclosed in warship-physics.js, NOT observed real-warship data. A conservative21-point footprint spans126m x19m; sampled synthetic depth and approximate grounding are not complete hull/collision/engineering validation.\n\nMobile quality, +5/-5 power, two-finger steering, camera sheets and pause behavior are retained. Synthetic coastline and sparse slow-renderer stepping remain. No physical-phone, Safari, FPS or hydrodynamic-validation claims. The original mobile yacht link is preserved.\n''')
files={str(p.relative_to(site)):digest(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file() and p.name!='BUILD.json'}
(site/'BUILD.json').write_text(json.dumps({'sourceSHA':__import__('os').environ.get('GITHUB_SHA'),'yachtBaseline':YACHT,'warshipSource':ORIGINAL,'files':files,'publicVerified':False,'incompleteSourceOnly':args.source_only},indent=2)+'\n')
print(json.dumps({'assembled':True,'siteFiles':len(files),'sourceOnly':args.source_only}))
