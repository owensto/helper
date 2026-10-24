"""Pin original inputs and manifest this explicitly versioned, isolated candidate."""
from pathlib import Path
import hashlib,json,os,subprocess
R=Path(__file__).resolve().parent;ROOT=R.parents[2]
BASE='8fa8616b2f10dea29127b0aa971e6646411cd785'
ASSETS={'atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb':'b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48','atlas_fleet_atelier_02/live/assets/ATLAS_N.glb':'0887994518aee300122a298c708742f0264d6263780d3e360f17c4474f2c39c1','atlas_fleet_atelier_02/live/assets/ATLAS_W.glb':'cfce666ed4c79446e7ad7c86be45385db7056618be4cdb233e4bf2b79241f27f'}
for p,h in ASSETS.items():assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h,p
if (ROOT/'.git').exists():
 subprocess.run(['git','fetch','--depth=1','origin',BASE],cwd=ROOT,check=True)
 paths=subprocess.check_output(['git','diff','--name-only',BASE,'HEAD'],cwd=ROOT,text=True).splitlines()
 assert all(p.startswith('atlas_d_simulator_01/contact/y14/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in paths),paths
 for p in ['atlas_d_simulator_01/contact/y12/app.js','atlas_d_simulator_01/contact/y12/dynamics.js','atlas_d_simulator_01/contact/y12/fleet.js','atlas_d_simulator_01/live/atlas-d-core.js']:
  assert (ROOT/p).read_bytes()==subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT),p
files={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(R.iterdir()) if p.is_file() and p.name not in ['build.json','RELEASE.json']}
report={'name':'ATLAS D / SUMARS Y14 Navigation & Realism','sourceCommit':os.environ.get('GITHUB_SHA'),'baselineCommit':BASE,'originalAssetSHA256':ASSETS,'sourceFiles':files,'seaTrialValidated':False,'surveyedChart':False,'multiplayer':False,'sharedHostMerged':False,'candidateBrowserAcceptance':'See actual browser reports; this manifest alone is not acceptance.'}
(R/'build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
