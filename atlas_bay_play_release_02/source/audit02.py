from pathlib import Path
import os,sys,json,hashlib
import numpy as np
r=Path(os.environ['BAY_ROOT']);sys.path.insert(0,str(r/'helpers'));os.environ['FLEET_ROOT']=str(r)
from assemble import Doc
b=Doc(r/'base.glb');d=Doc(r/'site/assets/ATLAS_Bay_Play.glb')
rep=json.loads((r/'site/build_report.json').read_text());rep['native_export_preservation']={}
for name in ['EX_Hull','FIXED_TTop']:
 va=b.vertices(b.node(name),0);vb=d.vertices(d.node(name),0);assert va.shape==vb.shape,(name,va.shape,vb.shape)
 err=float(np.max(np.abs(va-vb)));assert err<1e-5,(name,err);rep['native_export_preservation'][name]=err
required=['PLAY_DRAWER_1','PLAY_DRAWER_2','PLAY_DRAWER_3','PLAY_BOLSTER_1','PLAY_BOLSTER_2','PLAY_THROTTLE','PLAY_FISHBOX_STRUT_BARREL','PLAY_FISHBOX_STRUT_ROD']
for n in required:assert len(d.vertices(d.node(n)))>0,n
rep['model_sha256']=hashlib.sha256((r/'site/assets/ATLAS_Bay_Play.glb').read_bytes()).hexdigest();rep['scale_animation_channels']=sum(c['target']['path']=='scale' for a in d.g.get('animations',[]) for c in a['channels']);assert rep['scale_animation_channels']==0
rep['complete_recovery_check']=False;rep['physically_tested']=False
(r/'site/build_report.json').write_text(json.dumps(rep,indent=2));print(json.dumps(rep,indent=2))
