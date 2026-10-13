"""Derive an inspectable cockpit from the approved Play Lab GLB.
All dimensions and mechanisms are visualization proposals, not manufactured hardware.
Preserve the hull, roof and rig; introduce actual drawer interiors and explicit pivots.
"""
from pathlib import Path
import sys,os,json,copy,hashlib,math
import numpy as np
import trimesh
R=Path(os.environ.get('BAY_ROOT',Path(__file__).resolve().parents[1]));sys.path.insert(0,str(R/'helpers'));os.environ['FLEET_ROOT']=str(R)
from assemble import Doc
from build_fleet import rbox
from meshkit import slab
BASE=Path(os.environ.get('BAY_BASE_MODEL',R/'base.glb'))
d=Doc(BASE);root=d.node('Vessel');original=copy.deepcopy(d.g);w=d.world(0)
report={'revision':'ATLAS Bay Play Lab 02','base_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'engineering_validated':False,'physics_calibrated':False,'hull_changed':False,'actions':{},'scope':'Interactive cockpit, configurable water/current, uncalibrated driving, fictional coastal practice area.'}
mats={m['name']:i for i,m in enumerate(d.g['materials'])}
def mat(n,col,r=.6,metal=0):
 i=len(d.g['materials']);rgb=[int(col[k:k+2],16)/255 for k in (1,3,5)];rgb=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb]
 d.g['materials'].append({'name':n,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1],'roughnessFactor':r,'metallicFactor':metal}});return i
white=mat('P02 molded warm gelcoat','#E0E6E3',.32);dark=mat('P02 rubber and gasket','#263B44',.8);silver=mat('P02 satin stainless','#A9B8BC',.25,1);liner=mat('P02 tackle tray liner','#BACAC8',.76);foam=mat('P02 tailored ivory cushion','#DFE0D6',.8);insert=mat('P02 cushion insert','#BCC7C5',.8);blue=mat('P02 lure blue','#356E81',.28,.4);orange=mat('P02 lure copper','#BA7D4B',.35,.4)
def group(name,pivot,parent=root):
 i=len(d.g['nodes']);d.g['nodes'].append({'name':name,'translation':list(pivot),'children':[]});d.g['nodes'][parent].setdefault('children',[]).append(i);return i

def mesh(name,m,ma,parent=root):
 mi=len(d.g['meshes']);d.g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':d.acc(m.vertices),'NORMAL':d.acc(m.vertex_normals)},'indices':d.acc(m.faces.ravel(),'SCALAR',5125),'material':ma}]});i=len(d.g['nodes']);d.g['nodes'].append({'name':name,'mesh':mi});d.g['nodes'][parent].setdefault('children',[]).append(i);return i

def box(name,pos,size,ma,parent=root,rad=.006):return mesh(name,rbox(np.array(pos),size,rad),ma,parent)
def cyl(name,pos,rad,length,ma,parent=root,axis='y'):
 m=trimesh.creation.cylinder(radius=rad,height=length,sections=12)
 if axis=='y':m.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
 if axis=='x':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
 m.apply_translation(pos);return mesh(name,m,ma,parent)

def split(lo,hi,gid=None,allowed=lambda _:True,parent_world=None):
 lo=np.array(lo);hi=np.array(hi);cnt=0;pv=np.array(d.g['nodes'][gid].get('translation',[0,0,0])) if gid is not None else None
 for i,n in enumerate(original['nodes']):
  if 'mesh' not in n or not allowed(n.get('name','')):continue
  mm=d.g['meshes'][n['mesh']]
  for p in list(mm['primitives']):
   v=d.rd(p['attributes']['POSITION']);vw=(np.c_[v,np.ones(len(v))]@w[i].T)[:,:3];tri=d.rd(p['indices']).ravel().reshape(-1,3);mask=((vw>=lo)&(vw<=hi)).all(1)[tri].all(1)
   if not mask.any():continue
   sel=tri[mask];cnt+=len(sel);keep=tri[~mask]
   if len(keep):p['indices']=d.acc(keep.ravel(),'SCALAR',5125)
   else:mm['primitives'].remove(p)
   if gid is None:continue
   ids,remap=np.unique(sel,return_inverse=True);pr=copy.deepcopy(p);pr['attributes']={}
   for key,ac in p['attributes'].items():
    arr=d.rd(ac)[ids]
    if key=='POSITION':arr=(np.c_[arr,np.ones(len(arr))]@w[i].T)[:,:3]-pv
    elif key=='NORMAL':arr=arr@w[i][:3,:3].T
    pr['attributes'][key]=d.acc(arr,d.g['accessors'][ac]['type'])
   pr['indices']=d.acc(remap,'SCALAR',5125);mi=len(d.g['meshes']);d.g['meshes'].append({'name':d.g['nodes'][gid]['name']+' '+n['name'],'primitives':[pr]});ni=len(d.g['nodes']);d.g['nodes'].append({'name':d.g['nodes'][gid]['name']+' '+n['name'],'mesh':mi});d.g['nodes'][gid]['children'].append(ni)
 return cnt
# Replace the SOLID tackle pedestal with a cabinet that has usable drawer volumes.
removed=split([-1.905,.455,-.451],[-1.295,.865,.451],allowed=lambda n:n=='EX_Seating__white');assert removed>100,removed
# Remove decorative closed drawer faces, gaskets and pulls; replace as complete assemblies.
removed_faces=split([-1.96,.51,-.38],[-1.897,.823,.38],allowed=lambda n:n.startswith('EX_Seating__'))
box('P02 cabinet bottom',[-1.60,.463,0],[.6,.021,.89],white)
box('P02 cabinet crown',[-1.60,.85,0],[.6,.025,.89],white)
box('P02 cabinet back',[-1.304,.654,0],[.024,.365,.89],white)
for z in [-.433,.433]:box('P02 cabinet side',[-1.60,.654,z],[.6,.365,.024],white)
for y in [.605,.71]:box('P02 cabinet divider',[-1.60,y,0],[.60,.015,.853],white)
for num,y in enumerate([.56,.665,.77]):
 gi=group('PLAY_DRAWER_'+str(num+1),[-1.932,y,0]);d.g['nodes'][gi]['extras']={'action':'drawer'+str(num+1),'travel_m':.28,'axis':'x','qualified':False}
 box('P02 drawer face',[0,0,0],[.022,.074,.704],white,gi,.01)
 box('P02 recessed grip',[-.015,0,0],[.013,.013,.12],dark,gi,.003)
 box('P02 tray floor',[.251,-.036,0],[.47,.01,.66],liner,gi)
 for z in [-.333,.333]:box('P02 tray rim',[.251,-.004,z],[.47,.068,.012],white,gi)
 box('P02 tray back',[.491,-.004,0],[.012,.068,.68],white,gi)
 for z in [-.34,.34]:box('P02 slide inner rail',[.29,-.014,z],[.38,.022,.012],silver,gi,.002)
 for x in [.135,.28,.425]:box('P02 tackle divider',[x,-.018,0],[.007,.04,.648],liner,gi,.001)
 for z in [-.108,.108]:box('P02 tackle divider',[.254,-.018,z],[.46,.04,.007],liner,gi,.001)
 for j in range(6):
  x=.08+(j//3)*.145;z=-.217+(j%3)*.216
  m=trimesh.creation.icosphere(subdivisions=1,radius=1);m.apply_scale([.047,.012,.014]);m.apply_translation([x,-.014,z]);mesh('P02 tackle lure',m,blue if j%2 else orange,gi)
 report['actions']['drawer'+str(num+1)]={'node':d.g['nodes'][gi]['name'],'travel_m':.28,'has_tray':True,'has_contents':True}
# Split the seat bases into fixed cushion and independently pivoting front bolsters.
for idx,z in enumerate([-.265,.265]):
 cnt=split([-1.901,.875,z-.245],[-1.231,1.055,z+.245],allowed=lambda n:n.startswith('EX_Seating__') or n.startswith('DT04_Seating_Vessel__piping'));assert cnt>100,cnt
 box('P02 fixed seat pad',[-1.677,.96,z],[.431,.16,.475],foam,rad=.048)
 box('P02 rear inset',[-1.65,1.043,z],[.29,.008,.344],insert,rad=.02)
 gi=group('PLAY_BOLSTER_'+str(idx+1),[-1.455,.91,z]);d.g['nodes'][gi]['extras']={'action':'bolsters','angle_deg':85}
 box('P02 flip bolster cushion',[.109,.05,0],[.214,.156,.475],foam,gi,.036)
 box('P02 front inset',[.11,.133,0],[.15,.009,.344],insert,gi,.016)
 box('P02 bolster support',[.105,-.035,0],[.208,.022,.43],dark,gi)
 cyl('P02 bolster hinge',[0,0,0],.016,.442,silver,gi,'z')
 report['actions']['bolster'+str(idx+1)]={'node':d.g['nodes'][gi]['name'],'angle_deg':85}
# Throttle lever becomes a real pivoted part rather than a painted movement.
gi=group('PLAY_THROTTLE',[-.83,1.04,-.34]);cnt=split([-.857,1.045,-.39],[-.69,1.222,-.295],gi,allowed=lambda n:n in ['EX_Console__chrome','EX_Console__black']);assert cnt>50,cnt
report['actions']['throttle']={'node':'PLAY_THROTTLE','extracted_triangles':cnt}
# Hatch latch motion: additional compact lift handles parented to the original moving lids.
for key,pname,loc in [('fishbox','PLAY_FISHBOX',[1.19,.032,0]),('rodlocker','PLAY_RODLOCKER',[.91,.032,0])]:
 par=d.node(pname);gi=group('PLAY_LATCH_'+key,loc,par)
 box('P02 latch turning bar',[0,.012,0],[.048,.012,.011],silver,gi,.004)
 cyl('P02 latch spindle',[0,0,0],.008,.018,silver,gi)
# Gas-strut endpoints: constant-length telescoping pieces, no growing or disappearing parts.
barrel=group('PLAY_FISHBOX_STRUT_BARREL',[0,0,0]);rod=group('PLAY_FISHBOX_STRUT_ROD',[0,0,0]);cyl('P02 gas strut barrel',[0,.32,0],.014,.64,dark,barrel);cyl('P02 gas strut piston',[0,-.33,0],.007,.66,silver,rod)
box('P02 strut lower bracket',[1.,.49,.265],[.036,.036,.026],silver)
box('P02 strut lid bracket',[.89,-.002,.265],[.036,.036,.026],silver,parent=d.node('PLAY_FISHBOX'))
from scipy.spatial.transform import Rotation
start=np.array([1.,.49,.265]);end=np.array([1.86,.795,.265]);axis=(end-start)/np.linalg.norm(end-start)
q=trimesh.geometry.align_vectors([0,1,0],axis)[:3,:3]
for node,pt in [(barrel,start),(rod,end)]:d.g['nodes'][node]['translation']=pt.tolist();d.g['nodes'][node]['rotation']=Rotation.from_matrix(q).as_quat().tolist()

report['strut']={'fixed':[1.,.49,.265],'lid_local':[.89,-.002,.265],'barrel_m':.64,'piston_m':.66,'limits':'Visual telescoping assembly; mounting and loads not qualified.'}
# Bank a bounded neutral animation in each editable asset; runtime drives parts individually.
for act,dat in report['actions'].items():
 if act.startswith('drawer'):
  ni=d.node(dat['node']);pos=np.array(d.g['nodes'][ni]['translation']);end=pos+[-.28,0,0];a=d.acc([0,1],'SCALAR');b=d.acc([pos,end]);d.g.setdefault('animations',[]).append({'name':'Open '+act,'samplers':[{'input':a,'output':b,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':ni,'path':'translation'}}]})
# Batch only newly authored stationary detail within each logical parent.
# Drawer/latch/bolster pivots remain separate; original hull meshes are untouched.
parents={c:i for i,n in enumerate(d.g['nodes']) for c in n.get('children',[])}
groups={}
for i,n in enumerate(d.g['nodes']):
 if n.get('name','').startswith('P02 ') and 'mesh' in n:
  ps=d.g['meshes'][n['mesh']]['primitives']
  if len(ps)==1:groups.setdefault((parents[i],ps[0]['material']),[]).append(i)
for (par,ma),ids in groups.items():
 if len(ids)<2:continue
 parts=[];names=[]
 for i in ids:
  p=d.g['meshes'][d.g['nodes'][i]['mesh']]['primitives'][0]
  m=trimesh.Trimesh(d.rd(p['attributes']['POSITION']),d.rd(p['indices']).ravel().reshape(-1,3),process=False);parts.append(m);names.append(d.g['nodes'][i]['name'])
 ni=mesh('P02 grouped detail '+str(par)+' '+str(ma),trimesh.util.concatenate(parts),ma,par);d.g['nodes'][ni]['extras']={'source_components':names}
 d.g['nodes'][par]['children']=[c for c in d.g['nodes'][par]['children'] if c not in ids]
for n in d.g['nodes']:
 if 'mesh' in n and not d.g['meshes'][n['mesh']]['primitives']:del n['mesh']
d.g['asset'].setdefault('extras',{}).update({'review':'Cockpit interaction study; none of the mechanisms, engine installation, handling or draft are qualified.'})
d.compact();out=R/'site/assets/ATLAS_Bay_Play.glb';d.write(out)
# Preserve original base hull and roof vertex locations, not just their names.
b=Doc(BASE);nw=d.world(0);ow=b.world(0)
for name in ['EX_Hull','FIXED_TTop']:
 old=b.vertices(b.node(name),0);new=d.vertices(d.node(name),0);assert old.shape==new.shape
 err=float(np.max(np.abs(old-new)));assert err<1e-5,(name,err);report.setdefault('preservation',{})[name]=err
report['model_sha256']=hashlib.sha256(out.read_bytes()).hexdigest();report['bytes']=out.stat().st_size;report['removed_solid_station_triangles']=removed;report['original_drawer_faces_replaced']=removed_faces
(R/'site/build_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
