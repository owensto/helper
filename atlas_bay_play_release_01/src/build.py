"""Derive small independently pivoted fittings from the actual Studio 07 GLB.
Visual/game prototype only. No hull, horsepower, draft or load qualification.
"""
from pathlib import Path
import os,sys,copy,json,hashlib
import numpy as np
import trimesh
R=Path(os.environ.get('BAY_ROOT',Path(__file__).resolve().parents[1]))
BASE=Path(os.environ.get('BAY_BASE',R/'base'))
sys.path.insert(0,str(BASE/'build/source'))
os.environ['FLEET_ROOT']=str(BASE/'build')
from assemble import Doc
from meshkit import slab,rounded
S=R/'site';(S/'assets').mkdir(parents=True,exist_ok=True)
d=Doc(BASE/'viewer/assets/ATLAS_Bay_25.glb');root=d.node('Vessel')
original=copy.deepcopy(d.g);world=d.world(0)
report={'revision':'ATLAS Bay Play Lab 01','base_sha256':hashlib.sha256((BASE/'viewer/assets/ATLAS_Bay_25.glb').read_bytes()).hexdigest(),'scope':'Independent interactive fitting and driving prototype; not replacement Studio 07','engineering_validated':False,'physics_calibrated':False,'modified_hull':False,'hardware':[]}

def group(name,pivot):
 idx=len(d.g['nodes']);d.g['nodes'].append({'name':name,'translation':pivot,'children':[]});d.g['nodes'][root].setdefault('children',[]).append(idx);return idx

def split_box(lo,hi,gid,allowed=None,remove=False):
 """Move only fully enclosed triangles, preserving their exact positions/UVs."""
 lo=np.array(lo);hi=np.array(hi);pv=np.array(d.g['nodes'][gid]['translation']);count=0
 for i,n in enumerate(d.g['nodes'][:len(original['nodes'])]):
  if 'mesh' not in n or (allowed and not allowed(n['name'])):continue
  if not np.allclose(world[i],np.eye(4)):continue
  mesh=d.g['meshes'][n['mesh']]
  for p in list(mesh['primitives']):
   v=d.rd(p['attributes']['POSITION']);tri=d.rd(p['indices']).ravel().reshape(-1,3)
   inside=((v>=lo)&(v<=hi)).all(1);mask=inside[tri].all(1)
   if not mask.any():continue
   sel=tri[mask];count+=len(sel);keep=tri[~mask]
   if len(keep):p['indices']=d.acc(keep.ravel(),'SCALAR',5125)
   else:mesh['primitives'].remove(p)
   if remove:continue
   inds,remap=np.unique(sel,return_inverse=True);pr=copy.deepcopy(p)
   pr['attributes']={key:d.acc(d.rd(ac)[inds]-(pv if key=='POSITION' else 0),d.g['accessors'][ac]['type']) for key,ac in p['attributes'].items()}
   pr['indices']=d.acc(remap,'SCALAR',5125)
   mi=len(d.g['meshes']);d.g['meshes'].append({'name':d.g['nodes'][gid]['name']+'_'+n['name'],'primitives':[pr]})
   ni=len(d.g['nodes']);d.g['nodes'].append({'name':d.g['nodes'][gid]['name']+'_'+n['name'],'mesh':mi});d.g['nodes'][gid]['children'].append(ni)
 return count

def material(name,color):
 idx=len(d.g['materials']);d.g['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':color+[1],'roughnessFactor':.64,'metallicFactor':0}});return idx
liner=material('PLAY_INSULATED_LINER',[.56,.63,.64]);gasket=material('PLAY_RECESSED_GASKET',[.025,.04,.046])

def add_mesh(name,m,mat,parent=root):
 mi=len(d.g['meshes']);d.g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':d.acc(m.vertices),'NORMAL':d.acc(m.vertex_normals)},'indices':d.acc(m.faces.ravel(),'SCALAR',5125),'material':mat}]})
 ni=len(d.g['nodes']);d.g['nodes'].append({'name':name,'mesh':mi});d.g['nodes'][parent].setdefault('children',[]).append(ni)

def rect(x,z,l,w):return np.array([[x-l/2,z-w/2],[x+l/2,z-w/2],[x+l/2,z+w/2],[x-l/2,z+w/2]])

def well(name,x,z,l,w,top,bottom):
 outer=rect(x,z,l+.052,w+.052);inner=rect(x,z,l-.04,w-.04)
 add_mesh(name+'_gutter',slab(outer,top-.025,top-.015,[inner]),gasket)
 add_mesh(name+'_liner_walls',slab(inner,bottom,top-.026,[rect(x,z,l-.08,w-.08)]),liner)
 add_mesh(name+'_liner_floor',slab(rect(x,z,l-.08,w-.08),bottom-.02,bottom),liner)

for name,x,z,l,w in [('FISHBOX',1.70,0,1.46,.66),('RODLOCKER',1.52,-.81,1.17,.27)]:
 pivot=[x-l/2,.797,z];gi=group('PLAY_'+name,pivot)
 num=split_box([x-l/2-.025,.796,z-w/2-.020],[x+l/2+.025,.85,z+w/2+.020],gi,lambda s:('Deck' in s or 'Hardware' in s))
 assert num>100,(name,num)
 # The original full dark lip is replaced by an actual open perimeter.
 removed=split_box([x-l/2-.05,.789,z-w/2-.05],[x+l/2+.05,.796,z+w/2+.05],gi,lambda s:s=='EX_Deck__darkdeck',True)
 well(name,x,z,l,w,.797,.48 if name=='FISHBOX' else .52)
 report['hardware'].append({'name':name,'pivot_m':pivot,'moved_triangles':num,'removed_solid_lip_triangles':removed,'opening_deg':78,'load_qualified':False})
 # Independent, editable baked clip; app has independent open/close control.
 time=d.acc([0,1],'SCALAR');a=np.deg2rad(78)/2
 value=d.acc([[0,0,0,1],[0,0,np.sin(a),np.cos(a)]],'VEC4')
 d.g.setdefault('animations',[]).append({'name':'Open '+name,'samplers':[{'input':time,'output':value,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':gi,'path':'rotation'}}]})
# Steering wheel split from combined console meshes into a pivoted subassembly.
wheel=group('PLAY_STEERING',[-1.065,.965,.18]);cnt=split_box([-1.082,.797,.012],[-1.04,1.133,.348],wheel,lambda s:s in ('EX_Console__black','EX_Console__chrome'))
assert cnt>500,cnt
report['steering_wheel_triangles']=cnt
# Remove empty primitive-only nodes from rendering safely.
for n in d.g['nodes']:
 if 'mesh' in n and not d.g['meshes'][n['mesh']]['primitives']:del n['mesh']
d.g['asset']['extras']={'status':'Visual app prototype. Hardware loads, actual handling, installed horsepower and draft not validated.'}
d.compact();d.write(S/'assets/ATLAS_Bay_Play.glb')
# Data report for app and checks.
report['native_input_bytes']=(S/'assets/ATLAS_Bay_Play.glb').stat().st_size
report['base_reference']='1cb2e37e78ea20a8ea1a1803cc954b9cd8ef3f35/atlas_bay_studio_07/live'
(S/'build_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
