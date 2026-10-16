"""Y3 branch-only verification input assembly. No shared writes or publication."""
from pathlib import Path
import hashlib, json, subprocess
R=Path(__file__).resolve().parent;REPO=R.parents[2];E=R/'evidence';E.mkdir(exist_ok=True)
Y2='ce92886ac58f431e4e67d6fe71f269ad399a5c66';BASE='48b9bef038ab2e422b6677d7ca9db4879419a3f9';H2='347e52ebc4cdb38b7647bb54b37405fbe59b57cf';C1='36903985f2182c902427fed77d4e28c61a7639ca'
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)
for rev in (Y2,BASE,H2,C1):git('fetch','--depth=1','origin',rev)
changed=git('diff','--name-only',Y2,'HEAD').decode().splitlines()
assert all(p.startswith('atlas_d_simulator_01/contact/y3/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in changed),changed
for p in ['atlas_d_simulator_01/live','atlas_d_simulator_01/src','atlas_d_simulator_01/test-core.cjs','atlas_d_simulator_01/contact/y2','atlas_d_simulator_01/contact/attachment-adapter.js','atlas_d_simulator_01/contact/anchors.json','atlas_d_simulator_01/contact/test-attachments.cjs']:
 assert not git('diff',Y2,'HEAD','--',p),p
raw=(R.parents[1]/'live/assets/ATLAS_D_Original.glb').read_bytes();assert hashlib.sha256(raw).hexdigest()=='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'
# Unchanged Y2 receiving regressions use their original pinned dependency bytes.
D=R.parent/'y2/dependencies';D.mkdir(exist_ok=True);provenance={}
for name in ['package.json','package-lock.json','src/contact.mjs','src/owner-contracts.mjs','src/transform-contract.mjs','src/captain12-adapter.mjs']:
 source='atlas_humans/'+name;data=git('show',H2+':'+source);p=D/'humans'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);provenance[source]={'commit':H2,'sha256':hashlib.sha256(data).hexdigest()}
for name in ['descriptor.json','host-hooks.js']:
 source='atlas_sealab_12/integration/c1/'+name;data=git('show',C1+':'+source);(D/('core-'+name)).write_bytes(data);provenance[source]={'commit':C1,'sha256':hashlib.sha256(data).hexdigest()}
(E/'receiver-provenance.json').write_text(json.dumps(provenance,indent=2));(E/'changed-files.txt').write_text('\n'.join(changed)+'\n');(E/'result-source-sha.txt').write_bytes(git('rev-parse','HEAD'))
print(json.dumps({'passed':True,'originalBytes':len(raw),'originalAndY2Preserved':True,'changed':changed}))
