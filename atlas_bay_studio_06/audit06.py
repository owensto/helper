import os,sys,json,numpy as np
from pathlib import Path
from scipy.spatial import cKDTree
R=Path(os.environ['FLEET_ROOT']);sys.path.insert(0,str(R/'source'));from assemble import Doc
S=R/'site';base=Doc(S/'assets/ATLAS_Bay_25_Previous.glb');new=Doc(S/'assets/ATLAS_Bay_25.glb');audit={}
for name in ['EX_Hull','FIXED_TTop']:
 oldnodes=base.descendants(base.node(name));maxdist=0
 for i in oldnodes:
  n=base.g['nodes'][i]
  if 'mesh' not in n:continue
  try:j=new.node(n['name'])
  except StopIteration:raise RuntimeError('Original geometry missing: '+n['name'])
  a=base.vertices(i);b=new.vertices(j);maxdist=max(maxdist,float(cKDTree(b).query(a)[0].max()))
 assert maxdist<1e-5,(name,maxdist);audit[name]=maxdist
r=json.loads((S/'bay06_report.json').read_text());r['preserved_original_meshes_max_deviation_m']=audit
r['scale_animation_channels']=sum(c['target']['path']=='scale' for a in new.g.get('animations',[]) for c in a['channels']);assert r['scale_animation_channels']==0
r['vertex_color_primitives']=sum('COLOR_0' in p['attributes'] for m in new.g['meshes'] for p in m['primitives']);assert r['vertex_color_primitives']>0
r['browser_bytes']=(S/'assets/ATLAS_Bay_25.glb').stat().st_size
(S/'bay06_report.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
