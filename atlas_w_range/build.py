"""Add an isolated fictional target range to the exact released mobile fleet."""
from pathlib import Path
import hashlib, json, os, shutil, subprocess, argparse
R=Path(__file__).resolve().parent
BASE='8d7df3837046bdbf3b04bf4c4fca245a37aba2a5'
a=argparse.ArgumentParser();a.add_argument('--baseline');args=a.parse_args()
def raw(name):
 return (Path(args.baseline)/name).read_bytes() if args.baseline else subprocess.check_output(['git','show',f'{BASE}:atlas_fleet_mobile/site/{name}'])
def sha(b):return hashlib.sha256(b).hexdigest()
def once(s,old,new):
 assert s.count(old)==1,(old[:70],s.count(old))
 return s.replace(old,new)
S=R/'site';S.mkdir(exist_ok=True)
pins=json.loads(raw('BUILD.json'))['files']
for name,h in pins.items():
 b=raw(name);assert sha(b)==h,name
 p=S/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
for name in ['logic.js','gunnery.js','gunnery.css']:shutil.copyfile(R/name,S/name)
s=(S/'app.js').read_text()
s=once(s,'scene.add(model.root);AtlasFleet.mount();','scene.add(model.root);AtlasFleet.mount();let gunnery=null;')
s=once(s,'wakeUpdate();renderer.render(scene,camera);','wakeUpdate();gunnery?.update(vessel.read());renderer.render(scene,camera);')
s=once(s,"model.root.updateMatrixWorld(true);chooseView('exterior');draw(0);sync();", "gunnery=F.id==='warship'?AtlasGunnery.install(T,{root:model.root,scene,camera,controls,read:()=>vessel.read(),clearInputs,restoreView:()=>chooseView('exterior')}):null;\nmodel.root.updateMatrixWorld(true);chooseView('exterior');draw(0);sync();")
(S/'app.js').write_text(s)
h=(S/'index.html').read_text();h=once(h,'<script src="app.js"></script>','<script src="logic.js"></script><script src="gunnery.js"></script><script src="app.js"></script>')
h=once(h,'<link rel="stylesheet" href="fleet.css">','<link rel="stylesheet" href="fleet.css"><link rel="stylesheet" href="gunnery.css">')
h=h.replace('No combat, submarine, crew or multiplayer integration.','Fictional target practice on ATLAS-W. No submarine, crew or multiplayer integration.')
(S/'index.html').write_text(h)
# Correct old capability copy only in this versioned derivative.
f=(S/'fleet.js').read_text().replace('no combat, crew, or shared-physics capability.','arcade target practice added separately; no crew or shared physics.')
f=f.replace('Artwork is unchanged; no weapons operation or submarine mode.','Original artwork is preserved; the old inert bow mount is hidden and replaced at runtime by a larger fictional twin turret for arcade target practice. No submarine mode.')
(S/'fleet.js').write_text(f)
(S/'README.md').write_text('# ATLAS-W Heavy Twin — Arcade Practice\n\nA larger twin-barrel deck turret with mobile aim, shot reach, Next target, Fire salvo, recoil, flash, projectile arcs, splash and three floating game targets. Hits score on impact; cooldowns, projectiles and effects consume only existing vessel simulation time. Nothing advances the vessel itself. Pause, background pause, reset and vessel selection retain the existing host rules. The original inert mount is hidden in this derivative; original GLB bytes, yacht model, both vessel dynamics and mobile input module remain unchanged.\n\nFictional toy mechanics: fixed-duration animated arcs and simple circular scoring, not real weapon data, real ballistics, military training or a real-world targeting system. No multiplayer, crew damage or persistent combat state. Separate original URLs stay untouched.\n\nUse ?vessel=warship, tap Heavy guns, Resume if paused, Next target and Fire salvo. Adjust Aim or Shot reach to miss intentionally; New targets clears score. Close returns to sailing controls.\n')
files={str(p.relative_to(S)):sha(p.read_bytes()) for p in sorted(S.rglob('*')) if p.is_file() and p.name!='BUILD.json'}
(S/'BUILD.json').write_text(json.dumps({'baseline':BASE,'sourceSHA':os.environ.get('GITHUB_SHA'),'mode':'fictional arcade target practice','files':files,'publicVerified':False},indent=2)+'\n')
print(json.dumps({'copiedBaseline':len(pins),'files':len(files),'originalAssetUnchanged':sha((S/'assets/ATLAS_W.glb').read_bytes())==pins['assets/ATLAS_W.glb']}))
