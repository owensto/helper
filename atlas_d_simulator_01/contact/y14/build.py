from pathlib import Path
import json,hashlib,os,subprocess
R=Path(__file__).resolve().parent;ROOT=R.parents[2];BASE='8fa8616b2f10dea29127b0aa971e6646411cd785'
assets={'atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb':'b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48','atlas_fleet_atelier_02/live/assets/ATLAS_N.glb':'0887994518aee300122a298c708742f0264d6263780d3e360f17c4474f2c39c1','atlas_fleet_atelier_02/live/assets/ATLAS_W.glb':'cfce666ed4c79446e7ad7c86be45385db7056618be4cdb233e4bf2b79241f27f'}
for p,h in assets.items():assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h,p
if os.environ.get('GITHUB_ACTIONS'):
 subprocess.run(['git','fetch','--depth=1','origin',BASE],cwd=ROOT,check=True)
 changed=subprocess.check_output(['git','diff','--name-only',BASE,'HEAD'],cwd=ROOT,text=True).splitlines()
 assert all(p.startswith('atlas_d_simulator_01/contact/y14/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in changed),changed
for name in ['app.js','dynamics.js','navigation.js','materials.js','environment.js','ocean.js','pod-detail.js']:
 subprocess.run(['node','--check',str(R/name)],check=True)
report={'name':'ATLAS D SUMARS Y14 navigation and environment','baselineCommit':BASE,'sourceCommit':os.environ.get('GITHUB_SHA'),'originalAssets':assets,'y13SourceArchiveSHA256':'e8f62b488550efd3873579585f6eccd1a796c08bb66ed31e690cae67fc182c2c','physicalDeviceTested':False,'seaTrialValidated':False,'sharedHostMerged':False,'multiplayer':False,'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in R.iterdir() if p.is_file() and p.name not in ['build.json','RELEASE.json']}}
(R/'build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
