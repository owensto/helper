"""Y10 preservation gates; no generated owner runtime or asset changes."""
from pathlib import Path
import subprocess, hashlib, json, os
R=Path(__file__).resolve().parent; REPO=R.parents[2]; E=R/'evidence'; E.mkdir(exist_ok=True)
BASE='d659b10e65c83fb671244f036c3d5fbab1d8f3bc'
def git(*a): return subprocess.check_output(['git',*a],cwd=REPO)
git('fetch','--depth=1','origin',BASE)
changed=git('diff','--name-only',BASE,'HEAD').decode().splitlines()
allowed=['HANDOFF.md','boarding-label.js','preview.html','prepare.py','test-label.cjs','verify.py']
assert all(p=='.github/workflows/atlas-d-simulator-01.yml' or p in ['atlas_d_simulator_01/contact/y10/'+n for n in allowed] for p in changed),changed
for p in ['live','src','test-core.cjs',*[f'contact/y{i}' for i in range(2,10)],'contact/attachment-adapter.js','contact/anchors.json','contact/test-attachments.cjs']:
 assert not git('diff',BASE,'HEAD','--','atlas_d_simulator_01/'+p),p
asset=REPO/'atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb'
assert hashlib.sha256(asset.read_bytes()).hexdigest()=='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'
inputs=['live/atlas-d.js','contact/y4/preview.js','contact/y9/preview.css','contact/y9/pause-recovery.js']
provenance={'baseline':BASE,'result':os.environ.get('GITHUB_SHA'),'changed':changed,'ownerAndContractsUnchanged':True,'sourceSHA256':{p:hashlib.sha256((REPO/'atlas_d_simulator_01'/p).read_bytes()).hexdigest() for p in inputs}}
(E/'provenance.json').write_text(json.dumps(provenance,indent=2))
print(json.dumps(provenance,indent=2))
