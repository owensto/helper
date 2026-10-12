from pathlib import Path
import os,sys,json,hashlib,numpy as np
from scipy.spatial import cKDTree
R=Path(os.environ['FLEET_ROOT']);sys.path.insert(0,str(R/'source'));from assemble import Doc
S=R/'site';a=Doc(S/'assets/ATLAS_Bay_25_Previous.glb');b=Doc(S/'assets/ATLAS_Bay_25.glb')
report=json.loads((S/'bay04_report.json').read_text());checks={}
wa=a.world(0);wb=b.world(0)
for parent in ['EX_Hull','FIXED_TTop']:
 maximum=0
 for i in a.descendants(a.node(parent)):
  n=a.g['nodes'][i]
  if 'mesh' not in n:continue
  j=b.node(n['name']);oa=a.vertices(i,0);ob=b.vertices(j,0)
  maximum=max(maximum,float(cKDTree(oa).query(ob)[0].max()),float(cKDTree(ob).query(oa)[0].max()))
 assert maximum<2e-5,(parent,maximum)
 checks[parent]={'maximum_original_mesh_world_deviation_m':maximum}
report['native_roundtrip_preservation']=checks
channels=[c for x in b.g.get('animations',[]) for c in x['channels']]
assert len(channels)==8 and not any(c['target']['path']=='scale' for c in channels)
report['export_animation_channels']=len(channels)
report['browser_bytes']=(S/'assets/ATLAS_Bay_25.glb').stat().st_size
v=b.vertices(b.g['scenes'][0]['nodes'][0],60);report['complete_secured_model_envelope_m']=np.ptp(v,axis=0).tolist()
report['base_version']='Studio 03';report['engineering_validated']=False
(S/'bay04_report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
