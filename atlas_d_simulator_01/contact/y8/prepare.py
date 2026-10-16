"""Y8 exact immutable input preservation and original-loop identity."""
from pathlib import Path
import subprocess,hashlib,json,os
R=Path(__file__).resolve().parent;REPO=R.parents[2];E=R/'evidence';E.mkdir(exist_ok=True)
BASE='5daea16829bfaac4a96d560efb2d4954ccfd48e3';H2='347e52ebc4cdb38b7647bb54b37405fbe59b57cf';C1='36903985f2182c902427fed77d4e28c61a7639ca'
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)
for rev in [BASE,H2,C1]:git('fetch','--depth=1','origin',rev)
changed=git('diff','--name-only',BASE,'HEAD').decode().splitlines()
allowed=['HANDOFF.md','prepare.py','measure.js','verify.py','replay.py','test-replay.py']
assert all(p=='.github/workflows/atlas-d-simulator-01.yml' or p in ['atlas_d_simulator_01/contact/y8/'+x for x in allowed] for p in changed),changed
for p in ['live','src','test-core.cjs','contact/y2','contact/y3','contact/y4','contact/y5','contact/y6','contact/y7','contact/attachment-adapter.js','contact/anchors.json','contact/test-attachments.cjs']:
 assert not git('diff',BASE,'HEAD','--','atlas_d_simulator_01/'+p),p
assert hashlib.sha256((R.parents[1]/'live/assets/ATLAS_D_Original.glb').read_bytes()).hexdigest()=='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'
D=R.parent/'y2/dependencies';D.mkdir(exist_ok=True);inputs={}
for name in ['package.json','package-lock.json','src/contact.mjs','src/owner-contracts.mjs','src/transform-contract.mjs','src/captain12-adapter.mjs']:
 source='atlas_humans/'+name;data=git('show',H2+':'+source);p=D/'humans'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);inputs[source]={'commit':H2,'sha256':hashlib.sha256(data).hexdigest()}
for name in ['descriptor.json','host-hooks.js']:
 source='atlas_sealab_12/integration/c1/'+name;data=git('show',C1+':'+source);(D/('core-'+name)).write_bytes(data);inputs[source]={'commit':C1,'sha256':hashlib.sha256(data).hexdigest()}
(E/'provenance.json').write_text(json.dumps({'baseline':BASE,'runtimeBaseline':'e30edc8e33b863f3fafb303be0050cc86b7900f0','result':os.environ.get('GITHUB_SHA'),'changed':changed,'originalAndContractsUnchanged':True,'regressionInputs':inputs},indent=2))
print(json.dumps({'passed':True,'changed':changed}))

# Exact callback text used only for passive origin recognition, never replacement.
source=R.parents[1]/'live/atlas-d.js';text=source.read_text();a=text.index('function loop(now){');b=text.index('\nfunction sync()',a)
loop=text[a:b].strip()
(E/'owner-loop.json').write_text(json.dumps({'path':'atlas_d_simulator_01/live/atlas-d.js','assetSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'source':loop,'sourceSHA256':hashlib.sha256(loop.encode()).hexdigest()},indent=2))
