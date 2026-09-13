"""ATLAS D / 03. Pressure-boundary arrangement and rigid-motion study.
Not construction data. No rated depth, structural strength or stability is asserted.
The original Blender-derived exterior and its articulation are retained.
"""
from pathlib import Path
import os, json, struct, math, copy
import numpy as np
import trimesh
ROOT=Path(os.getenv('ATLAS_R3_ROOT',str(Path(__file__).resolve().parent.parent)))
SOURCE=Path(os.getenv('ATLAS_SOURCE',str(ROOT.parent/'atlas_d_continuous/live/ATLAS_D_Continuous_Dive.glb')))
OUT=ROOT/'site';OUT.mkdir(parents=True,exist_ok=True)
b=SOURCE.read_bytes();jl=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jl]);binary=bytearray(b[28+jl:])
base_nodes=len(g['nodes']);vessel=next(i for i,n in enumerate(g['nodes']) if n['name']=='Vessel')
g['asset']['generator']='ATLAS D / 03 systems arrangement; original exterior derived from Blender'
g['asset']['copyright']='Concept visualization only. No certified depth or operational safety claim.'
D={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def acc(a,kind,ctype=5126,target=None):
 a=np.ascontiguousarray(a,dtype={5126:'<f4',5125:'<u4'}[ctype]);a=a.reshape(-1,D[kind]);binary.extend(b'\0'*((-len(binary))%4));off=len(binary);binary.extend(a.tobytes())
 view={'buffer':0,'byteOffset':off,'byteLength':a.nbytes}
 if target:view['target']=target
 vi=len(g['bufferViews']);g['bufferViews'].append(view);out={'bufferView':vi,'componentType':ctype,'count':len(a),'type':kind}
 if kind in ('SCALAR','VEC3'):out.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 i=len(g['accessors']);g['accessors'].append(out);return i

def read(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];off=v.get('byteOffset',0)+a.get('byteOffset',0);n=D[a['type']]
 return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=off,strides=(v.get('byteStride',np.dtype(dt).itemsize*n),np.dtype(dt).itemsize)).copy()

def mat(name,c,metal=.35,rough=.4,alpha=1):
 i=len(g['materials']);m={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*c,alpha],'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}
 if alpha<1:m['alphaMode']='BLEND';m['doubleSided']=True
 g['materials'].append(m);return i
P=mat('Pressure boundary / indicative metal',[.13,.36,.43],.7,.3)
R=mat('Frame and coaming / indicative only',[.49,.66,.67],.72,.24)
W=mat('Flooded water / schematic',[.01,.47,.62],.05,.18,.36)
B=mat('Ballast tank casing / cutaway',[.05,.31,.42],.4,.25,.28)
T=mat('Trim water',[.09,.61,.7],.1,.22,.6)
E=mat('Energy module / capacity unassigned',[.12,.35,.23],.5,.3)
L=mat('Life support / capacity unassigned',[.77,.46,.13],.45,.35)
S=mat('Deck fairing pearl',[.66,.74,.73],.5,.27)
G=mat('Fairing and valve graphite',[.035,.065,.081],.62,.3)
A=mat('Pressure viewport / unqualified',[.05,.37,.49],.4,.13,.7)
RED=mat('Recovery equipment',[.76,.18,.055],.45,.37)

def mesh(name,m,material,parent=vessel,loc=None,extras=None):
 m=m.copy();m.fix_normals();i=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':acc(m.vertices,'VEC3',target=34962),'NORMAL':acc(m.vertex_normals,'VEC3',target=34962)},'indices':acc(m.faces.reshape(-1),'SCALAR',5125,34963),'material':material}]})
 node={'name':name,'mesh':i}
 if loc is not None:node['translation']=list(loc)
 if extras:node['extras']=extras
 ni=len(g['nodes']);g['nodes'].append(node);g['nodes'][parent].setdefault('children',[]).append(ni);return ni

def group(name,parent=vessel,loc=None,extras=None):
 n={'name':name,'children':[]}
 if loc:n['translation']=list(loc)
 if extras:n['extras']=extras
 i=len(g['nodes']);g['nodes'].append(n);g['nodes'][parent].setdefault('children',[]).append(i);return i

def box(name,dim,loc,ma=S,parent=vessel,extras=None):return mesh(name,trimesh.creation.box(extents=dim),ma,parent,loc,extras)
def cylmesh(r,h,axis='y',sections=32):
 m=trimesh.creation.cylinder(radius=r,height=h,sections=sections)
 if axis=='y':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]))
 if axis=='x':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
 return m

def cylinder(name,r,h,loc,ma=R,parent=vessel,axis='y'):return mesh(name,cylmesh(r,h,axis),ma,parent,loc)
def ringmesh(radius,tube,axis='x'):
 m=trimesh.creation.torus(major_radius=radius,minor_radius=tube,major_sections=48,minor_sections=8)
 if axis=='x':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
 if axis=='y':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]))
 return m

def ring(name,r,t,loc,ma=R,parent=vessel,axis='x'):return mesh(name,ringmesh(r,t,axis),ma,parent,loc)
def pipe(name,pts,r,ma=R,parent=vessel):
 parts=[]
 for a,b in zip(pts[:-1],pts[1:]):
  a=np.array(a);b=np.array(b);m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(b-a),sections=12);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],b-a));m.apply_translation((a+b)/2);parts.append(m)
 return mesh(name,trimesh.util.concatenate(parts),ma,parent)
def capmesh(rad=3.6,length=48):
 stations=[]
 for a in np.linspace(-math.pi/2,0,17):stations.append((-length/2+rad*math.sin(a),rad*math.cos(a)))
 for x in np.linspace(-length/2,length/2,25)[1:-1]:stations.append((x,rad))
 for a in np.linspace(0,math.pi/2,17):stations.append((length/2+rad*math.sin(a),rad*math.cos(a)))
 vv=[];ff=[];n=64
 for x,r in stations:
  for a in np.linspace(0,2*math.pi,n,endpoint=False):vv.append((x,r*math.sin(a),r*math.cos(a)))
 for i in range(len(stations)-1):
  for j in range(n):a=i*n+j;b=i*n+(j+1)%n;c=a+n;d=b+n;ff.extend([(a,b,d),(a,d,c)])
 m=trimesh.Trimesh(vv,ff,process=True);m.update_faces(m.nondegenerate_faces());m.update_faces(m.unique_faces());m.remove_unreferenced_vertices();m.fix_normals(multibody=True);return m

old_inside={i for i,n in enumerate(g['nodes']) if n.get('name','').startswith('I_')}
for n in g['nodes']:
 if 'children' in n:n['children']=[i for i in n['children'] if i not in old_inside]
core=group('SYS_Pressure',extras={'classification':'candidate dry pressure boundary','certified':False})
body=capmesh();body_index=mesh('Pressure_capsule_NOT_STRENGTH_VALIDATED',body,P,core,[0,.6,0],{'geometry_volume_m3':float(body.volume),'wall_thickness':'UNASSIGNED','pressure_rating':'NONE'})
for x in np.arange(-23,24,2):ring('Indicative_ring_frame',3.64,.055,[float(x),.6,0],R,core)
hab=group('SYS_Habitation')
for y in [-.95,1.42]:box('Dry_internal_deck',[43,.075,5.45],[0,y,0],S,hab)
for x in [-17,-8,1,10,19]:box('Candidate_dry_accommodation',[6.4,1.65,3.8],[x,.10,0],L,hab)
energy=group('SYS_Energy')
for x in [-15,-9,-3,3,9,15]:
 for z in [-2.25,2.25]:box('Battery_module_capacity_TBD',[4.7,.62,1.1],[x,-1.93,z],E,energy)
life=group('SYS_LifeSupport')
for x in [-20,-18.7,-17.4]:cylinder('Atmosphere_storage_indicative',.37,1.9,[x,2.32,1.50],L,life,'x')
for x in [-20,-17.6]:box('CO2_scrubber_capacity_TBD',[1.8,1.6,1.0],[x,.2,-2.2],L,life)
closures=group('SYS_Closures');newtracks=[]
an=g['animations'][0];oldtime=read(an['samplers'][0]['input']).reshape(-1);duration=42.0;timeacc=acc((oldtime/oldtime[-1]*duration),'SCALAR')
for sam in an['samplers']:sam['input']=timeacc

def smooth(a,b,p):t=np.clip((p-a)/(b-a),0,1);return t*t*(3-2*t)
def anim(ni,path,fun):
 values=np.array([fun(float(t/oldtime[-1])) for t in oldtime]);ai=acc(values,'VEC4' if path=='rotation' else 'VEC3');si=len(an['samplers']);an['samplers'].append({'input':timeacc,'output':ai,'interpolation':'LINEAR'});an['channels'].append({'sampler':si,'target':{'node':ni,'path':path}});g['nodes'][ni][path]=values[0].tolist()
# Drain surface water features before the non-pressure covers close.
for oldi,old in enumerate(g['nodes'][:base_nodes]):
 if old.get('name')=='S_Deck__water':
  primitive=g['meshes'][old['mesh']]['primitives'][0];pos=read(primitive['attributes']['POSITION']);faces=read(primitive['indices']).reshape(-1,3);is_pool=pos[faces,0].mean(axis=1)<-20
  for name,selected,drop in [('Pool_fresh_water_level',is_pool,.75),('Spa_fresh_water_level',~is_pool,.22)]:
   pp=copy.deepcopy(primitive);pp['indices']=acc(faces[selected].reshape(-1),'SCALAR',5125,34963);mi=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[pp]});ni=len(g['nodes']);g['nodes'].append({'name':name,'mesh':mi});g['nodes'][vessel]['children'].append(ni)
   anim(ni,'translation',lambda p,drop=drop:[0,-drop*smooth(.14,.31,p),0])
  for parent in g['nodes']:
   if 'children' in parent:parent['children']=[i for i in parent['children'] if i!=oldi]
# Main ballast vents OPEN; they do not seal the floodable exterior.
for ch in an['channels']:
 n=g['nodes'][ch['target']['node']];name=n['name'];sam=an['samplers'][ch['sampler']]
 if name=='Vessel':sam['output']=acc([[0,-40*smooth(.64,.95,float(t/oldtime[-1])),0] for t in oldtime],'VEC3')
 if name=='Ballast_vent_gate':
  xyz=read(sam['output'])[0];base=float(xyz[0])+.58;side=xyz[2]
  sam['output']=acc([[base-.85*smooth(.46,.59,float(t/oldtime[-1])),5.60,float(side)] for t in oldtime],'VEC3');n['name']='External_ballast_vent_slide'
 if name=='Aft_access_hatch':n['name']='Aft_weather_door_NOT_pressure_boundary'
for x in [-18,18]:
 cylinder('Candidate_access_trunk',.57,1.92,[x,4.86,0],P,core)
 ring('Hatch_coaming',.6,.09,[x,5.88,0],R,closures,'y')
 ring('Indicative_seal_seat',.51,.026,[x,5.99,0],G,closures,'y')
 hinge=group('Pressure_hatch_hinge_'+str(x),closures,[x,6.0,-.63])
 cylinder('Candidate_seated_hatch',.62,.13,[0,0,.63],S,hinge)
 anim(hinge,'rotation',lambda p:[math.sin(-math.pi/3*(1-smooth(.24,.43,p))),0,0,math.cos(-math.pi/3*(1-smooth(.24,.43,p)))])
 for a in np.linspace(0,2*math.pi,8,endpoint=False):
  rot=group('Hatch_dog_pivot',closures,[x+.67*math.cos(a),6.11,.67*math.sin(a)])
  box('Hatch_dog_not_sized',[.24,.07,.08],[.05,0,0],G,rot)
  anim(rot,'rotation',lambda p,a=float(a):[0,math.sin((a+math.pi/2*smooth(.43,.46,p))/2),0,math.cos((a+math.pi/2*smooth(.43,.46,p))/2)])
for x in [-14,0,14]:
 for side in [-1,1]:
  ring('Candidate_pressure_port_seat',.41,.09,[x,.6,side*3.62],R,core,'z')
  cylinder('Candidate_pressure_viewport',.37,.13,[x,.6,side*3.63],A,core,'z')
ballast=group('SYS_Ballast');capacity=0
for side in [-1,1]:
 for x in [-18,-6,6,18]:
  tank=group(f'MBT_{x}_{side}',ballast,[x,.30,side*5.2],{'gross_proxy_capacity_m3':51.2,'pressure_boundary':False})
  box('MBT_proxy_casing',[10,3.2,1.6],[0,0,0],B,tank)
  box('MBT_water',[9.80,3.08,1.46],[0,0,0],W,tank,{'fill_volume':'schematic, internal structures excluded'})
  capacity+=51.2
  for xx in [-3.6,3.6]:ring('Open_flood_port',.25,.045,[xx,-1.63,0],G,tank,'y')
  pipe('MBT_top_vent_riser',[[0,1.60,0],[0,4.8,0],[0,5.1,-side*.8]],.10,G,tank)
  ring('Top_vent_seat',.17,.035,[0,5.10,-side*.8],R,tank,'y')
  vent=cylinder('MBT_top_vent_lift',.20,.08,[0,5.12,-side*.8],G,tank)
  anim(vent,'translation',lambda p,side=side:[0,5.12+.21*smooth(.46,.60,p),-side*.8])
trim=group('SYS_Trim')
for x in [-25,25]:
 cylinder('Trim_tank',.82,2.7,[x,.20,0],B,trim,'x')
 box('Trim_water_forward' if x>0 else 'Trim_water_aft',[2.4,.9,.95],[x,.20,0],T,trim)
pipe('Trim_transfer_line',[[-25,-.7,0],[0,-.7,0],[25,-.7,0]],.052,R,trim)
box('Trim_pump',[.75,.48,.48],[0,-.70,0],E,trim)
for x in [-14,-10,-6,6,10,14]:cylinder('Emergency_air_bank_UNSIZED',.23,2.4,[x,-2.35,0],RED,ballast,'x')
wet=group('SYS_WetSpaces')
for i,(x,y,l,w,h) in enumerate([(-2,6.98,42,10.8,2.45),(-1,10.08,31,9.0,2.2),(-1,13.13,21,7.2,2.2)]):
 box('Wet_pavilion_'+str(i),[l,h,w],[x,y,0],W,wet,{'floodable':True,'habitable_submerged':False})
vents=group('SYS_FloodVents')
for side in [-1,1]:
 for lev,y,w,xs in [(0,7.78,5.99,[-20,-9,3,15]),(1,10.90,5.49,[-14,-3,9]),(2,13.84,4.65,[-6,4])]:
  for x in xs:
   box('Flood_aperture_reveal',[1.7,.30,.07],[x,y,side*w],G,vents)
   for k in range(7):box('Flood_grille',[.052,.30,.08],[x-.75+k*.25,y,side*(w+.04)],R,vents)
   pivot=group('Equalizer_louver',vents,[x,y+.18,side*(w+.075)])
   box('Equalizer_rigid_cover',[1.82,.36,.055],[0,-.18,0],S,pivot)
   anim(pivot,'rotation',lambda p,side=side:[math.sin(side*math.pi/3*smooth(.47,.61,p)),0,0,math.cos(side*math.pi/3*smooth(.47,.61,p))])
services=group('SYS_Isolation')
for x,z in [(6,-1.8),(9,1.8)]:
 pipe('Air_service_route',[[x,3.50,z],[x,4.35,z],[x,14.25,z]],.17,G,services)
 for y in [4.45,5.1]:
  ring('Isolation_valve_housing',.23,.055,[x,y,z],R,services,'y')
  valve=group('Double_isolation_valve',services,[x,y,z]);cylinder('Isolation_disc',.2,.05,[0,0,0],RED,valve)
  anim(valve,'rotation',lambda p:[math.sin(math.pi/4*(1-smooth(.32,.46,p))),0,0,math.cos(math.pi/4*(1-smooth(.32,.46,p)))])
 box('Airhead_grille',[.75,.25,.68],[x,14.5,z],G,services)
 lid=group('Airhead_closure',services,[x-.4,14.65,z]);box('Airhead_lid',[.8,.09,.76],[.4,0,0],S,lid)
 anim(lid,'rotation',lambda p:[0,0,math.sin(math.pi/4*(1-smooth(.3,.45,p))),math.cos(math.pi/4*(1-smooth(.3,.45,p)))])

def foilmesh(side):
 vv=[];ff=[];ns=12;nc=48
 for i,t in enumerate(np.linspace(0,1,ns)):
  chord=3.8*(1-.45*t)
  for a in np.linspace(0,2*math.pi,nc,endpoint=False):
   u=(1-math.cos(a))/2;th=.12*5*(.2969*math.sqrt(max(u,0))-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)
   vv.append([-2.1+u*chord-.55*t,math.copysign(chord*th,math.sin(a)),side*(.05+2.75*t)])
 for i in range(ns-1):
  for j in range(nc):a=i*nc+j;b=i*nc+(j+1)%nc;c=a+nc;d=b+nc;ff.extend([(a,b,d),(a,d,c)])
 return trimesh.Trimesh(vv,ff,process=True)
for ni,n in enumerate(g['nodes'][:base_nodes]):
 if n.get('name')=='Foreplane_rigid_leaf':
  parent=next(i for i,pa in enumerate(g['nodes']) if ni in pa.get('children',[]));side=1 if g['nodes'][parent]['name']=='Port_foreplane' else -1
  g['nodes'][parent]['children'].remove(ni);mesh('Hydrofoil_leaf_not_CFD_validated',foilmesh(side),G,parent)
propulsion=group('SYS_Propulsion')
for side in [-1,1]:
 for x in [-29.48,-28.52]:ring('Propulsor_duct_lip',1.16,.10,[x,-2.7,side*2.70],G,propulsion)
 vv=[];ff=[];nn=64
 for x in [-29.48,-28.52]:
  for a in np.linspace(0,2*math.pi,nn,endpoint=False):vv.append([x,-2.7+1.16*math.cos(a),side*2.7+1.16*math.sin(a)])
 for j in range(nn):k=(j+1)%nn;ff.extend([(j,k,k+nn),(j,k+nn,j+nn)])
 mesh('Duct_fairing',trimesh.Trimesh(vv,ff,process=True),G,propulsion)
 for x in [-27.0,-26.75]:ring('Shaft_seal_arrangement',.24,.055,[x,-2.45,side*2.7],R,propulsion)
recovery=group('SYS_Recovery')
for x in [-12,12]:
 for z in [-1.5,1.5]:
  box('Emergency_drop_weight',[2.40,.48,1.05],[x,-4.04,z],RED,recovery,{'mass_kg':'UNASSIGNED'})
  box('Release_bracket',[1.95,.15,.48],[x,-3.73,z],G,recovery)
sonar=trimesh.creation.icosphere(subdivisions=2,radius=1);sonar.apply_scale([1.3,.43,.50]);mesh('Forward_sonar_fairing',sonar,G,vessel,[35.1,.4,0])
cylinder('Recovery_pinger',.16,.36,[-4,14.74,2.1],RED,vessel)
RADIUS=3.6;STRAIGHT=48.;exact=math.pi*RADIUS**2*STRAIGHT+4*math.pi*RADIUS**3/3
report={'revision':3,'name':'ATLAS D / Pressure Boundary Study','length_m':82.9,'beam_m':14.2,'datum_descent_m':40,'certified_depth_m':None,'pressure_hull':{'radius_m':RADIUS,'straight_length_m':STRAIGHT,'overall_length_m':STRAIGHT+2*RADIUS,'center_y_m':.6,'ideal_gross_volume_m3':exact,'triangulated_volume_m3':float(body.volume),'closed_volume_mesh':bool(body.is_watertight),'note':'Gross geometric envelope, not usable accommodation volume; closed mesh is not pressure qualification. Ports, trunks, wall and reinforcement are arrangements only.'},'ballast_gross_proxy_capacity_m3':capacity,'mass_budget':'NOT_ESTABLISHED','reserve_buoyancy':'NOT_ESTABLISHED','CG_CB_and_stability':'NOT_ESTABLISHED','depth_rating':'NONE','simulation':'42-second kinematic illustration, not a dynamic simulator or real dive duration','hydrostatic_constants':{'seawater_density_kg_m3':1025,'g_m_s2':9.80665,'cabin_pressure_bar_abs':1.01325},'new_geometry_nodes':len(g['nodes'])-base_nodes,'animation_channels':len(an['channels']),'checks':{'exterior_unchanged':True,'no_alternate_hull':True,'no_hull_scale_tracks':True},'limitations':['No pressure shell scantlings or material grade','No pressure-boundary penetration structural analysis','Upper pavilions must be flood-compatible and unoccupied during dives','No validated buoyancy, stability, hydrodynamics, power or life support sizing','No emergency recovery capability demonstrated','Hatch interlocks are software teaching examples, not safety-rated controls']}
g['extras']=report;g['buffers']=[{'byteLength':len(binary)}];an['name']='Pressure_boundary_sequence_ILLUSTRATION'
binary.extend(b'\0'*((-len(binary))%4));g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
out=struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
(OUT/'ATLAS_D_R3.glb').write_bytes(out);report['glb_bytes']=len(out);(OUT/'model_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
