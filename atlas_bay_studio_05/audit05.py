import os,sys,json,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
R=Path(os.environ['FLEET_ROOT']);sys.path.insert(0,str(R/'source'));from assemble import Doc
S=R/'site';a=Doc(S/'assets/ATLAS_Bay_25_Previous.glb');b=Doc(S/'assets/ATLAS_Bay_25.glb');q=Doc(S/'assets/ATLAS_Bay_25_Shallow_Study.glb')
r=json.loads((S/'bay05_report.json').read_text());dev=0
for n in a.g['nodes']:
 if 'mesh' not in n:continue
 va=a.vertices(a.node(n['name']),0);vb=b.vertices(b.node(n['name']),0)
 dev=max(dev,float(cKDTree(va).query(vb)[0].max()),float(cKDTree(vb).query(va)[0].max()))
assert dev<2e-5,dev
for d in [b,q]:
 channels=[c for an in d.g.get('animations',[]) for c in an['channels']];assert len(channels)==8;assert not any(c['target']['path']=='scale' for c in channels)
 assert sum(n.get('name','').endswith(('NEW_TTOP_HOLDER_PORT','NEW_TTOP_HOLDER_STARBOARD')) for n in d.g['nodes'])==2
 assert len([n for n in d.g['nodes'] if n.get('name')=='MOV_Outboard_trim'])==1
 for n in d.g['nodes']:
  if n.get('name','').startswith('FIXED_TTop__') and 'mesh' in n:
   assert np.allclose(d.vertices(d.node(n['name']),0),d.vertices(d.node(n['name']),60),atol=1e-6)
# Shallow option has exactly the same non-hull components and no change in topsides.
for n in b.g['nodes']:
 if 'mesh' not in n or n.get('name') in ['EX_Hull__white','EX_Hull__blue']:continue
 va=b.vertices(b.node(n['name']),0);vb=q.vertices(q.node(n['name']),0)
 assert float(cKDTree(va).query(vb)[0].max())<2e-5,n['name']
r['native_preservation_max_deviation_m']=dev;r['native_roundtrip_checked']=True;r['data_files']=['draft_study.json','bay05_native.json'];r['browser_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (S/'assets').glob('*.glb')}
(S/'bay05_report.json').write_text(json.dumps(r,indent=2))
print('Audit passed; original mesh maximum deviation:',dev)
