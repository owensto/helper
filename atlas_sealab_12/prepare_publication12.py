"""Prepare only the exact reviewed site, with metadata outside the application."""
from pathlib import Path
import os,json,hashlib,shutil,subprocess,sys
r=Path(__file__).parent;a=Path(os.environ['DESKTOP_REVIEW']);b=Path(os.environ['PHONE_REVIEW']);reports=[]
for p,expected in [(a,{'desktop'}),(b,{'phone','small-phone','landscape'})]:
 d=json.loads((p/'review/validation.json').read_text())
 assert d['passed'] and {t['device'] for t in d['tests']}==expected and all(t['passed'] for t in d['tests']),d
 assert all(not t['errors'] and not t['shaderErrors'] and not t['assetErrors'] for t in d['tests'])
 q=json.loads((p/'review/unit12.json').read_text());assert q['passed'] and all(t['passed'] for t in q['tests'])
 reports.append(d)
def hashes(p):return {str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in p.rglob('*') if f.is_file()}
original=hashes(a/'site');assert original==hashes(b/'site'),'Reviewed desktop and phone applications differ'
shutil.copytree(a/'site',r/'live',dirs_exist_ok=True)
source=r/'reviewed_source';source.mkdir(exist_ok=True)
for name in ['waves12.js','shore12.js','captain12.js','water12.js','geo12.js','experience12.js','experience12.css','build12.py','test12.js','verify12.py','review_fixups12.py','model-contract12.json','baseline12.json']:
 shutil.copy2(a/name,source/name)
shutil.copy2(r/'validate_model12.py',source/'validate_model12.py')
evidence=r/'publication';evidence.mkdir(exist_ok=True)
subprocess.run([sys.executable,str(r/'validate_model12.py'),str(r/'live/assets/ATLAS_Bay_Play.glb'),'--contract',str(source/'model-contract12.json'),'--out',str(evidence/'model-audit.json')],check=True)
combined={'release':12,'passed':True,'review_run':int(os.environ['REVIEW_RUN']),'review_commit':os.environ['REVIEW_COMMIT'],'physicalDeviceTested':False,'tests':[t for d in reports for t in d['tests']]}
(evidence/'review_validation.json').write_text(json.dumps(combined,indent=2))
shutil.copy2(a/'review/unit12.json',evidence/'unit12.json');shutil.copy2(a/'baseline12.json',evidence/'baseline12.json')
(evidence/'tested_assets.json').write_text(json.dumps(original,indent=2))
assert hashes(r/'live')==original,'Publication preparation changed the reviewed application'
print('Exact site, both browser review groups, deterministic tests and model structure approved')
