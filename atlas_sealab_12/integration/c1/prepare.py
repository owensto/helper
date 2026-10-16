"""Build a disposable C1 harness without modifying the pinned Sea Lab 12 host."""
from pathlib import Path
import hashlib, json, os, shutil
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = Path(os.environ.get('C1_OUT', '/tmp/core12-c1'))
BASE = ROOT / 'atlas_sealab_12/live'
MANIFEST = ROOT / 'atlas_sealab_12/publication/tested_assets.json'
D = json.loads((HERE/'descriptor.json').read_text())
assert hashlib.sha256(MANIFEST.read_bytes()).hexdigest() == D['baseline']['testedAssetsManifestSHA256']
assets = json.loads(MANIFEST.read_text())
for name, digest in assets.items():
    assert hashlib.sha256((BASE/name).read_bytes()).hexdigest() == digest, name
assert set(assets) == {str(p.relative_to(BASE)) for p in BASE.rglob('*') if p.is_file()}
site=OUT/'site'; site.mkdir(parents=True,exist_ok=True)
shutil.copytree(BASE, site, dirs_exist_ok=True)
shutil.copy2(HERE/'host-hooks.js',site/'core-host-hooks.js')
shutil.copy2(HERE/'descriptor.json',site/'core-descriptor.json')
(site/'core-bootstrap.js').write_text('''/* Readiness retry only; never advances simulation time. */
(async function boot(){if(!window.SEA12?.ready)return setTimeout(boot,50);
try{window.__C1_STEP_BEFORE=BAYPLAY.state.step;window.__C1_CAPTAIN_BEFORE=BAYPLAY.boat.getObjectByName('SEA12_CAPTAIN').uuid;
window.CORE12=await SeaLab12HostHooks.attach(await (await fetch('core-descriptor.json')).json());window.CORE12_READY=true;
}catch(e){window.CORE12_ERROR=String(e.stack||e);console.error(e);}})();
''')
p=site/'index.html';s=p.read_text();assert s.count('</head>')==1
p.write_text(s.replace('</head>','<script defer src="core-host-hooks.js"></script><script defer src="core-bootstrap.js"></script></head>'))
for name,digest in assets.items():
    if name!='index.html': assert hashlib.sha256((site/name).read_bytes()).hexdigest()==digest
r={'baselinePublicSHA':D['baseline']['publicSHA'],'reviewSourceSHA':D['baseline']['reviewSourceSHA'],
   'candidateSourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'), 'baselineFilesVerified':len(assets),
   'hostSourceFilesModified':[], 'harnessOnly':['index.html loader append','core-host-hooks.js','core-descriptor.json','core-bootstrap.js'],
   'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()},
   'hostReplacement':False,'testScope':'real pinned CORE host plus isolated handoff; no yacht/human/multiplayer implementation loaded'}
(OUT/'build.json').write_text(json.dumps(r,indent=2))
print(json.dumps(r,indent=2))
