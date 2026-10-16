"""Restore immutable original host and receiving contracts. No shared writes."""
from pathlib import Path
import hashlib,io,json,shutil,subprocess,tarfile
R=Path(__file__).resolve().parent
REPO=R.parents[2]
BASE='48b9bef038ab2e422b6677d7ca9db4879419a3f9'
Y1='09aeb97168c4cd627cb54766d8f9ef2e55b83183'
H2='347e52ebc4cdb38b7647bb54b37405fbe59b57cf'
C1='36903985f2182c902427fed77d4e28c61a7639ca'
def git(*a):return subprocess.check_output(['git',*a],cwd=REPO)
for rev in (BASE,Y1,H2,C1):git('fetch','--depth=1','origin',rev)
changed=git('diff','--name-only',Y1,'HEAD').decode().splitlines()
assert all(p.startswith('atlas_d_simulator_01/contact/y2/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in changed),changed
for path in ['atlas_d_simulator_01/live','atlas_d_simulator_01/src','atlas_d_simulator_01/test-core.cjs','atlas_d_simulator_01/contact/attachment-adapter.js','atlas_d_simulator_01/contact/anchors.json']:
 assert not git('diff',Y1,'HEAD','--',path),path
# Restore ignored inputs under only this branch's working copy.
with tarfile.open(fileobj=io.BytesIO(git('archive',BASE,'atlas_d_simulator_01/live','atlas_d_simulator_01/src','atlas_d_simulator_01/test-core.cjs'))) as tf:
 tf.extractall(REPO,filter='data')
D=R/'dependencies';D.mkdir(exist_ok=True)
inputs={}
def source(sha,path,dest):
 raw=git('show',f'{sha}:{path}');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 inputs[path]={'commit':sha,'sha256':hashlib.sha256(raw).hexdigest()}
for name in ['package.json','package-lock.json','src/contact.mjs','src/owner-contracts.mjs','src/transform-contract.mjs','src/captain12-adapter.mjs']:
 source(H2,'atlas_humans/'+name,D/'humans'/name)
source(C1,'atlas_sealab_12/integration/c1/descriptor.json',D/'core-c1.json')
source(C1,'atlas_sealab_12/integration/c1/host-hooks.js',D/'core-host-hooks.js')
E=R/'evidence';E.mkdir(exist_ok=True)
(E/'receiver-provenance.json').write_text(json.dumps(inputs,indent=2));(E/'changed-files.txt').write_text('\n'.join(changed)+'\n')
(E/'result-source-sha.txt').write_bytes(git('rev-parse','HEAD'))
original=R.parents[1]/'live/assets/ATLAS_D_Original.glb'
assert hashlib.sha256(original.read_bytes()).hexdigest()=='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'
print(json.dumps({'sourcePreserved':True,'originalBytes':original.stat().st_size,'changed':changed,'inputs':inputs},indent=2))
