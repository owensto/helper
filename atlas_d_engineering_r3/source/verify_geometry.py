from pathlib import Path
import os,json,struct
import numpy as np
root=Path(__file__).resolve().parent.parent
source=Path(os.environ.get('ATLAS_SOURCE',str(root.parent/'atlas_d_continuous/live/ATLAS_D_Continuous_Dive.glb')))
def load(p):
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),raw[28+n:]
def read(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];nc={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0);return np.ndarray((a['count'],nc),dtype=dt,buffer=b,offset=off,strides=(v.get('byteStride',np.dtype(dt).itemsize*nc),np.dtype(dt).itemsize))
old,ob=load(source);new,nb=load(root/'site/ATLAS_D_R3.glb');report=json.loads((root/'site/model_report.json').read_text());preserved=[]
for n in old['nodes']:
 if n.get('name','').startswith('S_Hull') and 'mesh' in n:
  nn=next(x for x in new['nodes'] if x['name']==n['name']);a=old['meshes'][n['mesh']]['primitives'][0];b=new['meshes'][nn['mesh']]['primitives'][0]
  assert np.array_equal(read(old,ob,a['attributes']['POSITION']),read(new,nb,b['attributes']['POSITION']))
  assert np.array_equal(read(old,ob,a['indices']),read(new,nb,b['indices']))
  preserved.append(n['name'])
assert len(preserved)==6
assert report['pressure_hull']['closed_volume_mesh']
assert abs(report['pressure_hull']['triangulated_volume_m3']/report['pressure_hull']['ideal_gross_volume_m3']-1)<.003
assert all(c['target']['path'] in ('translation','rotation') for c in new['animations'][0]['channels'])
assert report['certified_depth_m'] is None
result={'passed':True,'preserved_original_hull_meshes':preserved,'closed_reference_volume':True,'volume_discretization_error_fraction':abs(report['pressure_hull']['triangulated_volume_m3']/report['pressure_hull']['ideal_gross_volume_m3']-1),'pressure_at_40m_bar_gauge':1025*9.80665*40/100000,'pressure_at_100m_bar_gauge':1025*9.80665*100/100000,'rigid_animation_channels':len(new['animations'][0]['channels']),'engineering_validated':False,'note':'Reference volume topology and software checks only; no proof of sealing, structural strength or operational capability.'}
(root/'site/geometry_validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
