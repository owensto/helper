"""Derivative browser layers from the GLBs exported from native Blender masters."""
from assemble import Doc
from pathlib import Path
import os,json,shutil
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent.parent));A=R/'site/assets';M=R/'models';reports=[]
for id in ['ATLAS_N','ATLAS_W']:
 p=A/(id+'.glb');src=Doc(p);shutil.copy2(p,M/(id+'_Complete.glb'))
 interior=Doc(p);idx=interior.node('INT_GenericArrangement');interior.g['scenes']=[{'name':id+' interior inspection','nodes':[idx]}];interior.g['scene']=0;interior.g.pop('animations',None);interior.compact();interior.write(A/(id+'_Interior.glb'))
 ext=Doc(p);idx=ext.node('INT_GenericArrangement')
 for n in ext.g['nodes']:
  if idx in n.get('children',[]):n['children'].remove(idx)
 ext.compact();ext.write(p);reports.append({'asset':id,'exterior_bytes':p.stat().st_size,'interior_bytes':(A/(id+'_Interior.glb')).stat().st_size,'method':'split native-exported graph without remodeling or geometry simplification'})
for id in ['ATLAS_D','ATLAS_Bay_25','ATLAS_Chase_12']:shutil.copy2(A/(id+'.glb'),M/(id+'_Complete.glb'))
(R/'site/layer_report.json').write_text(json.dumps(reports,indent=2));print(reports)
