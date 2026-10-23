"""Add arcade gunnery without replacing fleet, sailing dynamics or original GLB."""
from pathlib import Path
import argparse,subprocess,json,hashlib,shutil,os
R=Path(__file__).resolve().parent;BASE='8d7df3837046bdbf3b04bf4c4fca245a37aba2a5';SITE=R/'site'
p=argparse.ArgumentParser();p.add_argument('--baseline');a=p.parse_args()
def read(n):return (Path(a.baseline)/n).read_bytes() if a.baseline else subprocess.check_output(['git','show',BASE+':atlas_fleet_mobile/site/'+n])
def sha(b):return hashlib.sha256(b).hexdigest()
def once(s,a,b):
 assert s.count(a)==1,('PINNED_BOUNDARY',a[:80],s.count(a));return s.replace(a,b)
old=json.loads(read('BUILD.json'))
SITE.mkdir(exist_ok=True)
for n,h in old['files'].items():
 b=read(n);assert sha(b)==h,('BASE_HASH',n);p=SITE/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
s=(SITE/'app.js').read_text()
s=once(s,'let mobileUI=null;','let mobileUI=null,gunnery=null;')
s=once(s,'wakeUpdate();renderer.render(scene,camera);','wakeUpdate();gunnery?.frame(vessel.read());renderer.render(scene,camera);')
s=once(s,'sync();mobileFrame();clock=performance.now();requestAnimationFrame(loop);',"if(F.id==='warship')gunnery=AtlasGunnery.mount({T,scene,model:model.root,camera,controls,read:()=>vessel.read(),view:()=>view,chooseView,clearInputs,closePanels:()=>mobileUI.close(false)});sync();mobileFrame();clock=performance.now();requestAnimationFrame(loop);")
s=once(s,"version:'atlas-mobile-fleet-1'","version:'atlas-mobile-fleet-gunnery-1'")
(SITE/'app.js').write_text(s)
h=(SITE/'index.html').read_text();h=once(h,'<link rel="stylesheet" href="fleet.css">','<link rel="stylesheet" href="fleet.css"><link rel="stylesheet" href="gunnery.css">');h=once(h,'<script src="app.js"></script>','<script src="range-core.js"></script><script src="gunnery.js"></script><script src="app.js"></script>');h=h.replace('Solo sailing. No combat, submarine, crew or multiplayer integration.','Solo sailing + ATLAS-W arcade target practice. No crew, submarine or multiplayer integration.')
(SITE/'index.html').write_text(h)
f=(SITE/'fleet.js').read_text().replace('no weapons operation or submarine mode.','fictional arcade target practice is available under Guns / practice; no submarine mode.');(SITE/'fleet.js').write_text(f)
for n in ['range-core.js','gunnery.js','gunnery.css']:shutil.copyfile(R/n,SITE/n)
with (SITE/'README.md').open('a') as f:f.write('\n\n## Arcade gunnery update\nWarship-only fictional training range. Bow cannon and two side repeaters with aiming, visual recoil/flash/tracers, floating targets and hit/clear score. Tap Guns / practice, Resume when needed, Center target, then FIRE. Use drag pad or arrow keys to aim; Space fires. Hold FIRE to repeat. Helicopter/workboat/crew are not targets. No actual weapon performance, engineering or real ballistics: straight arcade traces and fixed game cooldown/damage. Original static mount is hidden in memory and replaced by a separate visual group, not edited in the GLB.\nSimulation time is supplied by the existing sailing loop. Pause/visibility/reset/release cancels held firing; there is no catch-up volley on resume. Switching vessel reloads with clean state; yacht remains unarmed. No multiplayer/human-fit permission is transferred.\n')
files={str(p.relative_to(SITE)):sha(p.read_bytes()) for p in sorted(SITE.rglob('*')) if p.is_file() and p.name!='BUILD.json'}
(SITE/'BUILD.json').write_text(json.dumps({'baseline':BASE,'sourceSHA':os.environ.get('GITHUB_SHA'),'feature':'fictional-arcade-gunnery','files':files,'publicVerified':False},indent=2)+'\n')
print(json.dumps({'files':len(files),'baseline':BASE}))
