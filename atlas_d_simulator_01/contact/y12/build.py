"""Read-only original inputs; publish only this isolated fleet directory."""
from pathlib import Path
import hashlib,json,os,subprocess
R=Path(__file__).resolve().parent;REPO=R.parents[2]
BASE='586a8acfa171e6ad634b562fd924544c5b1376bf'
subprocess.run(['git','fetch','--depth=1','origin',BASE],cwd=REPO,check=True)
changed=subprocess.check_output(['git','diff','--name-only',BASE,'HEAD'],cwd=REPO,text=True).splitlines()
assert all(p.startswith('atlas_d_simulator_01/contact/y12/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in changed),changed
assets={
 'atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb':'b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48',
 'atlas_fleet_atelier_02/live/assets/ATLAS_N.glb':'0887994518aee300122a298c708742f0264d6263780d3e360f17c4474f2c39c1',
 'atlas_fleet_atelier_02/live/assets/ATLAS_W.glb':'cfce666ed4c79446e7ad7c86be45385db7056618be4cdb233e4bf2b79241f27f'}
for f,sha in assets.items():assert hashlib.sha256((REPO/f).read_bytes()).hexdigest()==sha,f
for f in [REPO/'atlas_d_simulator_01/live/atlas-d-core.js',REPO/'atlas_d_simulator_01/contact/y11/physics.js']:
 assert f.read_bytes()==subprocess.check_output(['git','show',BASE+':'+str(f.relative_to(REPO))],cwd=REPO)
files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(R.iterdir()) if p.is_file() and p.name not in ['build.json','RELEASE.json']}
report={'name':'ATLAS D SUMARS Fleet / Y12','sourceCommit':os.environ.get('GITHUB_SHA'),'baselineCommit':BASE,'originalAssets':assets,'model':'atlas-sumars-y12-1','newPod':'sumars-kayley-pod-1','tests':51,'geography':'Authored offshore water, not Beaufort','seaTrialValidated':False,'sharedHostMerged':False,'multiplayer':False,'files':files}
(R/'build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
