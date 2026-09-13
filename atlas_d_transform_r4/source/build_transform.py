"""ATLAS D R4: articulating surface pavilions and exterior fairings.
Kinematic arrangement only. Former upper rooms are replaced at design time
by open, unoccupied-on-dive canopies; no occupied volume shrinks in animation.
"""
from pathlib import Path
import os,json,math,struct,copy
import numpy as np
import trimesh
ROOT=Path(os.getenv('ATLAS_R4_ROOT',str(Path(__file__).resolve().parent.parent)))
SRC=Path(os.getenv('ATLAS_R3_GLB',str(ROOT.parent/'atlas_d_engineering_r3/live/ATLAS_D_R3.glb')))
OUT=ROOT/'site';OUT.mkdir(parents=True,exist_ok=True)
b=SRC.read_bytes();jl=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jl]);binary=bytearray(b[28+jl:]);initial=copy.deepcopy(g)
D={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};vessel=next(i for i,n in enumerate(g['nodes']) if n.get('name')=='Vessel')
def read(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n=D[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*n),np.dtype(dt).itemsize)).copy()
def acc(a,kind,ctype=5126,target=None):
 a=np.ascontiguousarray(a,dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ctype]).reshape(-1,D[kind]);binary.extend(b'\0'*((-len(binary))%4));o=len(binary);binary.extend(a.tobytes());v={'buffer':0,'byteOffset':o,'byteLength':a.nbytes}
 if target:v['target']=target
 vi=len(g['bufferViews']);g['bufferViews'].append(v);ac={'bufferView':vi,'componentType':ctype,'count':len(a),'type':kind}
 if kind in ['SCALAR','VEC3']:ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 i=len(g['accessors']);g['accessors'].append(ac);return i
def mat(name,c,metal=.3,rough=.3):
 i=len(g['materials']);g['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*c,1],'metallicFactor':metal,'roughnessFactor':rough}});return i
pearl=mat('R4 Pearl fairings',[.77,.80,.79],.24,.25);dark=mat('R4 Graphite hinges',[.026,.045,.055],.62,.30);steel=mat('R4 Brushed support metal',[.42,.51,.54],.84,.27);wood=mat('R4 Teak',[.40,.24,.13],0,.63);fabric=mat('R4 Secured upholstery',[.71,.68,.59],0,.88)
def group(name,parent=vessel,loc=None):
 n={'name':name,'children':[]}
 if loc is not None:n['translation']=list(loc)
 i=len(g['nodes']);g['nodes'].append(n);g['nodes'][parent].setdefault('children',[]).append(i);return i
def mesh(name,m,material,parent=vessel,loc=(0,0,0)):
 m=m.copy();m.fix_normals();mi=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':acc(m.vertices,'VEC3',target=34962),'NORMAL':acc(m.vertex_normals,'VEC3',target=34962)},'indices':acc(m.faces.reshape(-1),'SCALAR',5125,34963),'material':material}]});i=group(name,parent,loc);g['nodes'][i]['mesh']=mi;return i
meshcache={}
def box(name,d,loc,ma=pearl,parent=vessel):
 key=(tuple(d),ma)
 if key not in meshcache:
  i=mesh(name,trimesh.creation.box(extents=d),ma,parent,loc);meshcache[key]=g['nodes'][i]['mesh'];return i
 i=group(name,parent,loc);g['nodes'][i]['mesh']=meshcache[key];return i
an=g['animations'][0];times=np.linspace(0,42,169);ta=acc(times,'SCALAR');records=[]
def smooth(a,b,p):t=np.clip((p-a)/(b-a),0,1);return t*t*(3-2*t)
def anim(i,path,fn):
 vals=np.array([fn(t/42) for t in times]);a=acc(vals,'VEC4' if path=='rotation' else 'VEC3');s=len(an['samplers']);an['samplers'].append({'input':ta,'output':a,'interpolation':'LINEAR'});an['channels'].append({'sampler':s,'target':{'node':i,'path':path}});g['nodes'][i][path]=vals[0].tolist();records.append((i,path))
def quat(axis,angle):return [*(np.array(axis)*math.sin(angle/2)),math.cos(angle/2)]
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
def worldpos(i):
 t=np.array(g['nodes'][i].get('translation',[0,0,0]),float);p=parents.get(i)
 while p is not None:
  n=g['nodes'][p];t+=n.get('translation',[0,0,0]);p=parents.get(p)
 return t
# Design-time replacement, never an animated deletion of rooms.
remove=set();cuts=[]
for i,n in enumerate(g['nodes']):
 name=n.get('name','')
 if name.startswith(('Mast_','S_Mast','Fixed_hardtop','Spa_','Spa_water','Spa_fresh','Sundeck_spa','Guardrail_base_2_','Guardrail_base_3_')):remove.add(i)
 if name.startswith('Wet_pavilion_') and name!='Wet_pavilion_0':remove.add(i)
 if name in ['Air_service_route','Recovery_pinger']:remove.add(i)
 if name in ['Airhead_closure','Surface_airhead'] and worldpos(i)[1]>9:remove.add(i)
 if name.startswith('Equalizer') and worldpos(i)[1]>8.75:remove.add(i)
 if 'mesh' not in n:continue
 if name.startswith(('S_Architecture','S_Deck','S_Furniture','S_Hardware')):
  mm=copy.deepcopy(g['meshes'][n['mesh']]);newp=[]
  for pr in mm['primitives']:
   ps=read(pr['attributes']['POSITION']);fs=read(pr['indices']).reshape(-1,3);keep=ps[fs,1].max(1)<=8.74
   if name.startswith('S_Furniture'):keep &= ps[fs,1].max(1)<8.5
   if keep.all():newp.append(pr);continue
   if not keep.any():continue
   used,inv=np.unique(fs[keep],return_inverse=True);pr['indices']=acc(inv,'SCALAR',5125,34963)
   for key,ai in list(pr['attributes'].items()):pr['attributes'][key]=acc(read(ai)[used],g['accessors'][ai]['type'],target=34962)
   newp.append(pr)
  if not newp:remove.add(i)
  else:mm['primitives']=newp;n['mesh']=len(g['meshes']);g['meshes'].append(mm);cuts.append(name)
for i,n in enumerate(g['nodes']):
 if 'mesh' not in n:continue
 if n.get('name','').startswith(('Air_service','Air_intake','Isolation_air','Equalizer','High_vent','Free_flood_slot','Flood_aperture_reveal','Flood_grille','Airhead_grille')):
  pr=g['meshes'][n['mesh']]['primitives'][0];ps=read(pr['attributes']['POSITION']);yy=worldpos(i)[1]+ps[:,1].min()
  if yy>8.75:remove.add(i)
def descendants(i):
 out={i}
 for c in g['nodes'][i].get('children',[]):out |= descendants(c)
 return out
for i in list(remove):remove |= descendants(i)
for n in g['nodes']:
 if 'children'in n:n['children']=[c for c in n['children'] if c not in remove]
an['channels']=[c for c in an['channels'] if c['target']['node'] not in remove]
fixed=group('R4_Fixed_Leisure_Deck')
box('Fixed_terrace_substrate',[37,.14,9.2],[-.5,8.76,0],dark,fixed)
for row,z in enumerate(np.arange(-4.51,4.55,.16)):
 for x in np.arange(-18.7+(row%3)*.32,17.8,2.4):box('Teak_plank',[2.37,.025,.146],[float(x),8.845,float(z)],wood,fixed)
def roofmesh(length,halfwidth):
 p=np.array([[-length/2,-halfwidth*.83],[-length/2+.8,-halfwidth],[length/2-4,-halfwidth],[length/2-1,-halfwidth*.62],[length/2,-halfwidth*.22],[length/2,halfwidth*.22],[length/2-1,halfwidth*.62],[length/2-4,halfwidth],[-length/2+.8,halfwidth],[-length/2,halfwidth*.83]])
 v=[];f=[]
 for y,s in [(-.12,1),(.08,1),(.22,.975)]:v.extend([[x*s,y,z*s] for x,z in p])
 n=len(p)
 for k in range(2):
  for j in range(n):a=k*n+j;b=k*n+(j+1)%n;c=a+n;d=b+n;f.extend([(a,b,d),(a,d,c)])
 for i in range(1,n-1):f.extend([(0,i+1,i),(2*n,2*n+i,2*n+i+1)])
 return trimesh.Trimesh(v,f,process=True)
rig=group('R4_Articulated_Exterior');canopies=[];link_checks=[];terraces=[]
for x,z in [(6,-1.8),(9,1.8)]:
 box('Short_surface_air_route',[.26,4.5,.26],[x,6.05,z],dark,rig);box('Airhead_protected_cap',[.72,.2,.64],[x,8.46,z],pearl,rig)
def canopy(name,cx,L,W,high,low,stages,barlength,start,end):
 basey=8.92;roof=group(name+'_roof',rig);mesh(name+'_sculpted_skin',roofmesh(L,W),pearl,roof);box(name+'_shadow_reveal',[L-4,.065,2*W-.4],[0,-.135,0],dark,roof)
 anim(roof,'translation',lambda p:[cx,basey+high+(low-high)*smooth(start,end,p),0]);canopies.append((roof,basey,high,low))
 for xoff in [-L*.28,L*.22]:
  for side in [-1,1]:
   x=cx+xoff;z=side*(W-.58);box('Scissor_base_track',[barlength+.3,.075,.32],[x,basey-.07,z],dark,rig);box('Canopy_upper_track',[barlength+.3,.065,.30],[xoff,-.19,z],dark,roof)
   def height(p):return (high+(low-high)*smooth(start,end,p))/stages
   def span(p):return math.sqrt(max(.001,barlength**2-height(p)**2))/2
   for stage in range(stages):
    for sense in [-1,1]:
     arm=group(name+'_scissor_arm',rig);box('Constant_length_scissor',[barlength,.105,.16],[0,0,0],steel,arm)
     anim(arm,'translation',lambda p,stage=stage,z=z,x=x,sense=sense:[x,basey+(stage+.5)*height(p),z+sense*.09]);anim(arm,'rotation',lambda p,sense=sense:quat([0,0,1],sense*math.asin(height(p)/barlength)))
     link_checks.append({'node':arm,'length':barlength,'stages':stages,'max_height':high/stages})
    for edge in [-1,1]:
     shoe=box('Scissor_slider_shoe',[.28,.11,.39],[0,0,0],dark,rig);anim(shoe,'translation',lambda p,edge=edge,stage=stage,x=x,z=z:[x+edge*span(p),basey+stage*height(p),z])
    pin=mesh('Scissor_centre_pivot',trimesh.creation.cylinder(radius=.115,height=.5,sections=16),dark,rig);anim(pin,'translation',lambda p,stage=stage,x=x,z=z:[x,basey+(stage+.5)*height(p),z])
 return roof
roofA=canopy('Aft_leisure_canopy',-17.3,21.0,4.85,3.45,.78,1,3.7,.27,.52)
roofF=canopy('Forward_leisure_canopy',6.1,24.0,4.8,6.25,1.09,2,3.5,.28,.54)
mast=group('R4_Radar_fold_pivot',roofF,[-3.9,.26,0]);box('Radar_foot',[1.4,.14,1.2],[0,-.05,0],dark,mast)
mesh('Radar_swept_mast',trimesh.creation.cone(radius=.46,height=4.5,sections=6,transform=trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0])),dark,mast)
box('Radar_scanner',[.5,.22,4.8],[0,4.42,0],pearl,mast)
for z in [-1.35,1.35]:
 mesh('Radar_satellite_dome',trimesh.creation.icosphere(subdivisions=2,radius=.5),pearl,mast,[0,2.9,z]);box('Radar_dome_bracket',[.45,.13,3.2],[0,2.36,0],dark,mast)
anim(mast,'rotation',lambda p:quat([0,0,1],-math.pi/2*smooth(.12,.27,p)))
box('Radar_stow_cradle',[5.6,.08,1.20],[-1.1,.30,0],dark,roofF)
for cx in [-22,-17,-11,0,6,12]:
 for side in [-1,1]:
  zz=side*2.4;box('Daybed_fixed_base',[2.15,.17,.92],[cx,9.01,zz],wood,fixed);box('Daybed_cushion',[1.43,.13,.85],[cx+.25,9.16,zz],fabric,fixed)
  back=group('Daybed_back_hinge',rig,[cx-.44,9.18,zz]);box('Folding_daybed_back',[.92,.10,.85],[-.46,0,0],fabric,back);anim(back,'rotation',lambda p:quat([0,0,1],-math.pi*.27*(1-smooth(.10,.22,p))))
for side in [-1,1]:
 hinge=group('Port_terrace_hinge' if side<0 else 'Starboard_terrace_hinge',rig,[-31.4,1.55,side*6.84]);terraces.append(hinge);box('Terrace_exterior_skin',[7.2,.19,3.24],[0,0,side*1.62],pearl,hinge)
 for x in np.arange(-3.45,3.5,.2):box('Terrace_teak_plank',[.18,.03,3.15],[float(x),.111,side*1.62],wood,hinge)
 for x in [-2.95,2.95]:box('Terrace_hinge_block',[.44,.34,.34],[x,0,0],steel,hinge)
 anim(hinge,'rotation',lambda p,side=side:quat([1,0,0],-side*math.pi/2*smooth(.24,.49,p)))
 for x in [-2.95,2.95]:
  pivot=group('Terrace_actuator_pivot',rig,[-31.4+x,1.0,side*6.77]);box('Actuator_mount',[.23,.26,.23],[0,0,0],dark,pivot)
coverL=8.1;pitch=.3;nslat=math.ceil(coverL/pitch);pitch=coverL/nslat;x0=-25.9;y0=6.90;width=10.85;r=.43;k=.018
for i in range(nslat):
 ni=box('Aft_shell_linked_panel',[pitch*.965,.075,width],[0,0,0],pearl,rig)
 def slatpose(p,i=i):
  s=coverL*smooth(.31,.55,p)-(i+.5)*pitch
  if s>=0:return [x0-s,y0,0],0.
  a=(-r+math.sqrt(r*r+2*k*(-s)))/k;rr=r+k*a;return [x0+rr*math.sin(a),y0+r-rr*math.cos(a),0],a
 anim(ni,'translation',lambda p,fn=slatpose:fn(p)[0]);anim(ni,'rotation',lambda p,fn=slatpose:quat([0,0,1],fn(p)[1]))
for side in [-1,1]:box('Aft_shell_guide',[coverL+.3,.12,.14],[x0-coverL/2,y0-.06,side*(width/2+.06)],steel,rig)
box('Aft_fairing_cassette',[1.72,1.50,11.15],[x0,y0+.45,0],pearl,rig)
# Batch static boards in their own local moving frames.
for parent in [fixed]+terraces:
 parts=[];ma=None;drop=[]
 for i in g['nodes'][parent].get('children',[]):
  n=g['nodes'][i]
  if n.get('name') not in ['Teak_plank','Terrace_teak_plank']:continue
  pr=g['meshes'][n['mesh']]['primitives'][0];ma=pr['material'];parts.append(trimesh.Trimesh(read(pr['attributes']['POSITION'])+n.get('translation',[0,0,0]),read(pr['indices']).reshape(-1,3),process=False));drop.append(i)
 if parts:
  g['nodes'][parent]['children']=[i for i in g['nodes'][parent]['children'] if i not in drop];mesh('Batched_individual_teak_boards',trimesh.util.concatenate(parts),ma,parent)
reachable=set()
def walk(i):
 if i in reachable:return
 reachable.add(i)
 for c in g['nodes'][i].get('children',[]):walk(c)
for s in g['scenes']:
 for i in s['nodes']:walk(i)
an['channels']=[c for c in an['channels'] if c['target']['node'] in reachable]
fixednames=['Pressure_capsule_NOT_STRENGTH_VALIDATED']+[n['name'] for n in initial['nodes'] if n.get('name','').startswith('S_Hull__')]
for name in fixednames:
 a=next(n for n in initial['nodes'] if n.get('name')==name);c=next(n for n in g['nodes'] if n.get('name')==name);assert a.get('mesh')==c.get('mesh'),name
for v in link_checks:assert v['max_height']<v['length']
ids=sorted(reachable);mp={o:i for i,o in enumerate(ids)};g['nodes']=[g['nodes'][i] for i in ids]
for n in g['nodes']:
 if 'children'in n:n['children']=[mp[i] for i in n['children']]
for s in g['scenes']:s['nodes']=[mp[i] for i in s['nodes']]
for c in an['channels']:c['target']['node']=mp[c['target']['node']]
mis=sorted({n['mesh'] for n in g['nodes'] if 'mesh'in n});mmap={v:i for i,v in enumerate(mis)};g['meshes']=[g['meshes'][i] for i in mis]
for n in g['nodes']:
 if 'mesh'in n:n['mesh']=mmap[n['mesh']]
usedsam=sorted({c['sampler'] for c in an['channels']});smap={v:i for i,v in enumerate(usedsam)};an['samplers']=[an['samplers'][i] for i in usedsam]
for c in an['channels']:c['sampler']=smap[c['sampler']]
acused=set()
for m in g['meshes']:
 for pr in m['primitives']:acused.update(pr['attributes'].values());acused.add(pr['indices'])
for s in an['samplers']:acused.update([s['input'],s['output']])
oldviews=g['bufferViews'];oldacc=g['accessors'];arrays={i:read(i) for i in acused};g['bufferViews']=[];g['accessors']=[];binary=bytearray();amap={}
for i in sorted(acused):
 a=oldacc[i];target=oldviews[a['bufferView']].get('target');amap[i]=acc(arrays[i],a['type'],a['componentType'],target)
for m in g['meshes']:
 for pr in m['primitives']:pr['indices']=amap[pr['indices']];pr['attributes']={k:amap[a] for k,a in pr['attributes'].items()}
for s in an['samplers']:s['input']=amap[s['input']];s['output']=amap[s['output']]
assert not any(c['target']['path']=='scale' for c in an['channels'])
g['extras']={'revision':4,'study':'Kinematic exterior conversion; not certified','dry_core_unchanged':True,'upper_rooms_replaced_at_design_time':True}
g['asset']['generator']='ATLAS D R4 articulated exterior / Blender-derived hull';g['asset']['copyright']='Visualization only. No depth rating, pressure qualification or operational claim.'
g['buffers']=[{'byteLength':len(binary)}];jb=json.dumps(g,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);binary+=b'\0'*((-len(binary))%4)
data=struct.pack('<III',0x46546c67,2,28+len(jb)+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary;(OUT/'ATLAS_D_R4.glb').write_bytes(data)
report={'revision':4,'name':'ATLAS D / Articulated exterior','hull_length_m':82.9,'hull_beam_m':14.2,'deployed_terrace_beam_m':20.16,'canopy_roof_top_surface_m':15.39,'canopy_roof_top_stowed_m':10.23,'roof_drop_m':5.16,'pressure_capsule_changed':False,'main_hull_changed':False,'upper_accommodation_redesigned_as_open_canopies':True,'no_room_shrinking':True,'structural_collision_and_load_validation':False,'certified_depth_m':None,'duration_seconds':42,'preparation_end_fraction':.62,'glb_bytes':len(data),'animation_channels':len(an['channels']),'articulated_nodes':len(records),'mechanisms':['two-stage fixed-length scissor canopy','single-stage scissor canopy','radar folding with canopy','folding daybed backs','upfolding side terraces','linked roll-top aft exterior fairing'],'limitation':'Kinematic design study only; loads, tolerances, pressure qualification, mass, buoyancy, stability and collision certification unresolved.'}
(OUT/'model_report.json').write_text(json.dumps(report,indent=2));(OUT/'r4_geometry_checks.json').write_text(json.dumps({'passed':True,'checks':['identical R3 hull mesh references','identical pressure capsule mesh reference','all scissor link lengths exceed deployed rise','zero scale animation channels','all rendered animation targets reachable'],'engineering_validated':False},indent=2));print(json.dumps(report,indent=2))