"""ATLAS D R5 - integrated exterior. Metres, X forward, Y up.
Uses the prior Blender hull/pressure arrangement; replaces the R4 pavilions.
Visualization only. No depth rating, loads, hydrostatics or safe diving claim.
"""
from pathlib import Path
import os, struct, json, math, copy
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation
ROOT=Path(os.getenv('ATLAS_ROOT',str(Path(__file__).resolve().parent.parent)))
SRC=Path(os.getenv('ATLAS_SOURCE',str(ROOT/'base/r3/viewer/ATLAS_D_R3.glb')))
OUT=ROOT/'site';OUT.mkdir(parents=True,exist_ok=True)
b=SRC.read_bytes();jl=struct.unpack_from('<I',b,12)[0];old=json.loads(b[20:20+jl]);ob=b[28+jl:]
D={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def read(i):
 a=old['accessors'][i];v=old['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k=D[a['type']]
 return np.ndarray((a['count'],k),dtype=dt,buffer=ob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*k),np.dtype(dt).itemsize)).copy()
g={'asset':{'version':'2.0','generator':'ATLAS D R5 / parametric exterior over Blender-derived source','copyright':'Concept motion study; not an engineered or certified submersible'},'scene':0,'scenes':[{'name':'ATLAS D R5 Integrated exterior','nodes':[0,1]}],'nodes':[{'name':'Vessel','children':[]},{'name':'Tenders','children':[]}],'meshes':[],'materials':copy.deepcopy(old['materials']),'buffers':[{}],'bufferViews':[],'accessors':[]}
buf=bytearray();parts={};motion=[];mechanisms=[]
def access(a,kind,ct=5126,target=None):
 a=np.array(a,dtype={5126:'<f4',5125:'<u4'}[ct]).reshape(-1,D[kind]);buf.extend(b'\0'*((-len(buf))%4));off=len(buf);buf.extend(a.tobytes());bv={'buffer':0,'byteOffset':off,'byteLength':a.nbytes}
 if target:bv['target']=target
 vi=len(g['bufferViews']);g['bufferViews'].append(bv);ac={'bufferView':vi,'componentType':ct,'count':len(a),'type':kind}
 if kind in ('SCALAR','VEC3'):ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 idx=len(g['accessors']);g['accessors'].append(ac);return idx

def material(name,c,metal=0.,rough=.4,alpha=1.):
 i=len(g['materials']);m={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*c,alpha],'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}
 if alpha<1:m.update(alphaMode='BLEND',doubleSided=True)
 g['materials'].append(m);return i
paint=material('Satin pearl / exterior',(.82,.835,.82),.18,.3)
accent=material('Warm titanium / trim',(.20,.245,.255),.55,.32)
black=material('Deep graphite / reveals',(.012,.020,.025),.12,.49)
glass=material('Solar glazing / non-pressure',(.016,.042,.056),.25,.23)
steel=material('Brushed stainless',(.47,.53,.55),.83,.29)
teak=material('Weathered teak',(.38,.245,.134),.0,.68)
caulk=material('Teak caulk',(.048,.042,.033),0,.8)
cushion=material('Marine upholstery / conceptual',(.74,.72,.64),0,.86)
wet=material('Floodable volume / diagram',(.03,.43,.50),0,.5,.16)
light=material('Warm deck light',(1,.61,.28),0,.5)
g['materials'][light]['emissiveFactor']=[.5,.24,.08]
for m in g['materials']:
 name=m['name'];p=m.setdefault('pbrMetallicRoughness',{})
 if name in ['glass','archglass']:p.update(baseColorFactor=[.016,.043,.052,1],metallicFactor=.24,roughnessFactor=.25);m.pop('alphaMode',None)
 if name=='pearl':p.update(baseColorFactor=[.80,.82,.80,1],metallicFactor=.20,roughnessFactor=.31)
 if name=='white':p.update(baseColorFactor=[.84,.85,.82,1],metallicFactor=.1,roughnessFactor=.33)
 if name=='chrome':p.update(roughnessFactor=.3)
 if name.startswith('teak'):p['roughnessFactor']=.75
 if name=='railglass':p['baseColorFactor']=[.35,.49,.54,.18];m['doubleSided']=True

def group(name,parent=0,loc=(0,0,0),extras=None):
 i=len(g['nodes']);n={'name':name,'translation':list(loc),'children':[]}
 if extras:n['extras']=extras
 g['nodes'].append(n);g['nodes'][parent]['children'].append(i);return i
architecture=group('EX_Integrated_architecture');deckgroup=group('EX_Decks');hardware=group('EX_Hardware');furniture=group('EX_Furniture')
hullgrp=group('EX_Main_hull');running=group('EX_Running_gear');systems=group('SYS_Internal_arrangement');baygroup=group('EX_Stowage_bays')

def add(name,m,ma,parent=architecture,smooth=False):
 if not len(m.faces):return
 m=m.copy();m.remove_unreferenced_vertices();m.fix_normals(multibody=True)
 if smooth:
  v=np.array(m.vertices);f=np.array(m.faces);n=np.array(m.vertex_normals)
 else:
  v=np.array(m.vertices)[m.faces].reshape(-1,3);f=np.arange(len(v)).reshape(-1,3);n=np.repeat(m.face_normals,3,axis=0)
 parts.setdefault((parent,ma),[]).append((name,v,f,n))

def raw(name,v,f,n,ma,parent):
 if len(f)==0:return
 ids,ff=np.unique(np.asarray(f),return_inverse=True)
 parts.setdefault((parent,ma),[]).append((name,np.asarray(v)[ids],ff.reshape(-1,3),np.asarray(n)[ids]))
def box(name,loc,dim,ma=paint,parent=architecture,r=0):
 if r:
  x,y,z=loc;l,h,w=dim;p=rounded_rect(x-l/2,x+l/2,z-w/2,z+w/2,r)
  solid(name,p,y-h/2,y+h/2,ma,parent)
 else:
  m=trimesh.creation.box(extents=dim);m.apply_translation(loc);add(name,m,ma,parent)
def tube(name,pts,r,ma=steel,parent=hardware,sides=10):
 out=[]
 for a,b in zip(pts[:-1],pts[1:]):
  a=np.array(a);b=np.array(b);d=b-a
  if np.linalg.norm(d)<1e-6:continue
  m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(d),sections=sides);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],d));m.apply_translation((a+b)/2);out.append(m)
 if out:add(name,trimesh.util.concatenate(out),ma,parent,True)
def ellipsoid(name,loc,size,ma,parent=hardware):
 m=trimesh.creation.uv_sphere(count=[16,24]);m.apply_scale(size);m.apply_translation(loc);add(name,m,ma,parent,True)
def ring(name,loc,r,t,ma=steel,parent=hardware,axis='y'):
 m=trimesh.creation.torus(major_radius=r,minor_radius=t,major_sections=48,minor_sections=8)
 ax={'y':[1,0,0],'x':[0,1,0]}
 if axis in ax:m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,ax[axis]))
 m.apply_translation(loc);add(name,m,ma,parent,True)
def rounded_rect(x0,x1,z0,z1,r=.3):
 pts=[]
 for cx,cz,a in [(x1-r,z1-r,0),(x0+r,z1-r,90),(x0+r,z0+r,180),(x1-r,z0+r,270)]:
  for d in np.linspace(a,a+90,7,endpoint=False):t=math.radians(d);pts.append([cx+r*math.cos(t),cz+r*math.sin(t)])
 return np.array(pts)
def rounded(poly,f=.16):
 p=np.array(poly);out=[]
 for i,b in enumerate(p):
  a=b+(p[i-1]-b)*f;c=b+(p[(i+1)%len(p)]-b)*f
  for t in np.linspace(0,1,7,endpoint=False):out.append((1-t)**2*a+2*t*(1-t)*b+t*t*c)
 return np.array(out)
def plan(a,b,w):
 L=b-a;k=min(3.5,L*.13);f=min(10,L*.30);tip=min(.4,w*.10)
 return rounded([(a,0),(a+k*.25,-w*.78),(a+k,-w),(b-f,-w),(b-f*.36,-w*.65),(b,-tip),(b,tip),(b-f*.36,w*.65),(b-f,w),(a+k,w),(a+k*.25,w*.78)],.18)
def solid(name,p,y0,y1,ma=paint,parent=architecture,shift=0,shrink=1.,curved=False):
 p=np.array(p);n=len(p);q=p.copy();q[:,0]+=shift;q[:,1]*=shrink;v=np.r_[np.c_[p[:,0],np.full(n,y0),p[:,1]],np.c_[q[:,0],np.full(n,y1),q[:,1]]];f=[]
 for i in range(n):j=(i+1)%n;f.extend([[i,j,j+n],[i,j+n,i+n]])
 ctr=p.mean(0);ctq=q.mean(0);v=np.r_[v,[[ctr[0],y0,ctr[1]],[ctq[0],y1,ctq[1]]]]
 for i in range(n):j=(i+1)%n;f.extend([[2*n,j,i],[2*n+1,n+i,n+j]])
 add(name,trimesh.Trimesh(v,f,process=False),ma,parent,curved)
def roof(name,p,y,thickness=.28,parent=architecture):
 solid(name+'_soffit',p,y-.035,y+.035,black,parent)
 n=len(p);center=p.mean(0);rings=[]
 for offset,scale in [(0,1),(.08,1.002),(thickness-.05,.995),(thickness,.972)]:
  q=center+(p-center)*scale;rings.append(np.c_[q[:,0],np.full(n,y+offset),q[:,1]])
 v=np.concatenate(rings);f=[]
 for k in range(3):
  for i in range(n):j=(i+1)%n;a=k*n+i;b=k*n+j;c=a+n;d=b+n;f.extend([[a,b,d],[a,d,c]])
 v=np.r_[v,[[center[0],y+thickness+.09,center[1]]]]
 for i in range(n):f.append([len(v)-1,3*n+i,3*n+(i+1)%n])
 add(name,trimesh.Trimesh(v,f,process=False),paint,parent,True)

def track(idx,kind,fn):motion.append((idx,kind,fn))
def smooth(a,b,p):t=np.clip((p-a)/(b-a),0,1);return t*t*(3-2*t)
def quat(axis,a):return Rotation.from_rotvec(np.array(axis)*a).as_quat().tolist()
for n in old['nodes']:
 name=n.get('name','');parent=None;pred=None
 if name.startswith('S_Hull__'):parent=hullgrp
 elif name.startswith('S_Running__'):parent=running
 elif name.startswith('S_Deck__'):parent=deckgroup;pred=lambda c:c[:,1]<6.65
 elif name.startswith('S_Furniture__'):parent=furniture;pred=lambda c:(c[:,1]<7.1)&((c[:,0]<-26)|(c[:,0]>24.5))
 elif name.startswith('S_Hardware__'):parent=hardware;pred=lambda c:c[:,1]<7.2
 elif name.startswith('S_Fleet__'):parent=1
 if parent is None or 'mesh' not in n:continue
 for pr in old['meshes'][n['mesh']]['primitives']:
  v=read(pr['attributes']['POSITION']);f=read(pr['indices']).reshape(-1,3);normal=read(pr['attributes']['NORMAL']);c=v[f].mean(1);mask=np.ones(len(f),bool)
  if pred is not None:mask&=pred(c)
  if name.startswith('S_Hull__'):mask&=~((c[:,0]>-25.05)&(c[:,0]<-16.95)&(c[:,1]>1.96)&(c[:,1]<4.38)&(np.abs(c[:,2])>5.9))
  raw(name,v,f[mask],normal,pr.get('material',0),parent)
parentmap={c:i for i,n in enumerate(old['nodes']) for c in n.get('children',[])}
def matworld(i):
 n=old['nodes'][i];T=np.eye(4)
 if 'matrix' in n:T=np.array(n['matrix']).reshape(4,4).T
 else:
  T[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));T[:3,3]=n.get('translation',[0,0,0])
 return matworld(parentmap[i])@T if i in parentmap else T
coregroups=['SYS_Pressure','SYS_Habitation','SYS_Energy','SYS_LifeSupport','SYS_Ballast','SYS_Trim']
for i,n in enumerate(old['nodes']):
 if 'mesh' not in n:continue
 j=i;ancestor=''
 while j in parentmap:
  j=parentmap[j]
  if old['nodes'][j].get('name') in coregroups:ancestor=old['nodes'][j]['name'];break
 if not ancestor:continue
 if not any(x.get('name')==ancestor for x in g['nodes']):group(ancestor,systems)
 parent=next(k for k,x in enumerate(g['nodes']) if x.get('name')==ancestor);tf=matworld(i)
 for pr in old['meshes'][n['mesh']]['primitives']:
  v=read(pr['attributes']['POSITION']);v=(np.c_[v,np.ones(len(v))]@tf.T)[:,:3];normal=read(pr['attributes']['NORMAL'])@tf[:3,:3].T;normal/=np.linalg.norm(normal,axis=1)[:,None]
  raw(n['name'],v,read(pr['indices']).reshape(-1,3),normal,pr.get('material',0),parent)
p0=plan(-25.0,25.1,5.90)
solid('Lower_sill',p0,5.59,5.99,paint,shift=-.2,shrink=.998,curved=True)
solid('Continuous_main_glazing',p0,5.99,8.04,glass,shift=-1.1,shrink=.93,curved=True)
roof('Main_continuous_roof',plan(-27.5,24.6,6.32),8.06,.36)
for side in [-1,1]:
 for x in [-21,-16,-11,-6,-1,4,9,14]:
  w0=np.interp(x,[-25,-21.5,15.1,21.5,25.1],[0,5.9,5.9,3.84,.4]);w1=w0*.93
  tube('Recessed_main_mullion',[[x,6.0,side*(w0+.014)],[x-1.05,8.07,side*(w1+.018)]],.037,black,architecture,8)
 p=[(-26.0,5.58),(-23.1,5.58),(-10.5,8.17),(-13.2,8.20),(-23.7,6.13)]
 v=[]
 for zz in [side*5.85,side*6.18]:v.extend([[x,y,zz] for x,y in p])
 f=[[0,1,2],[0,2,3],[0,3,4],[5,7,6],[5,8,7],[5,9,8]]
 for k in range(5):j=(k+1)%5;f.extend([[k,j,5+j],[k,5+j,5+k]])
 add('Swept_aft_shoulder',trimesh.Trimesh(v,f),paint,architecture)
p1=plan(-9.15,18.5,4.30)
solid('Upper_reveal',p1,8.44,8.65,black,curved=True)
solid('Upper_sill',p1,8.64,8.91,paint,curved=True)
solid('Bridge_wrap_glazing',p1,8.91,10.88,glass,shift=-1.25,shrink=.85,curved=True)
roof('Swept_crown',plan(-9.5,18.7,4.50),11.18,.25)
solid('Crown_soffit',plan(-9.3,18.4,4.26),10.91,10.965,black)
for side in [-1,1]:
 for x in [-5,-.5,4,8.5,12.5]:
  w=np.interp(x,[-9.15,-5.65,8.5,14.9,18.5],[0,4.3,4.3,2.8,.4])
  tube('Bridge_mullion',[[x,8.95,side*(w+.025)],[x-1.22,10.9,side*(w*.85+.025)]],.039,black,architecture)
 p=[(-13.1,8.44),(-10.6,8.44),(-.8,10.95),(-3.5,11.0)]
 v=[]
 for zz in [side*4.12,side*4.52]:v.extend([[x,y,zz] for x,y in p])
 f=[[0,1,2],[0,2,3],[4,6,5],[4,7,6]]
 for k in range(4):j=(k+1)%4;f.extend([[k,j,j+4],[k,j+4,k+4]])
 add('Crown_swept_cheek',trimesh.Trimesh(v,f),paint,architecture)
terracepoly=plan(-24.8,-7.8,5.6)
solid('Upper_aft_terrace',terracepoly,8.405,8.475,teak,deckgroup)
for z in np.arange(-4.6,4.61,.19):
 x0=-23.6+.4*abs(z);x1=-8.3
 tube('Fine_teak_seam',[[x0,8.482,z],[x1,8.482,z]],.006,caulk,deckgroup,4)
for side in [-1,1]:
 box('Built_in_bench',[-17.8,8.75,side*3.95],[5.0,.5,1.13],teak,furniture,.23)
 box('Bench_cushions',[-17.8,9.055,side*3.95],[4.9,.17,1.02],cushion,furniture,.18)
 box('Bench_back',[-17.8,9.2,side*4.39],[5.0,.54,.15],cushion,furniture,.06)
 box('Outdoor_table',[-17.8,8.95,side*2.3],[2.55,.14,.85],teak,furniture,.2)
 tube('Table_pedestal',[[-17.8,8.5,side*2.3],[-17.8,8.9,side*2.3]],.12,steel,furniture)
for side in [-1,1]:
 tube('Upper_stainless_handrail',[[-23,9.48,side*4.8],[-19,9.48,side*5.23],[-11,9.48,side*5.30]],.025,steel,hardware)
 for x in np.arange(-22,-10,1.7):
  z=side*(5.25 if x>-20 else 4.95)
  tube('Upper_rail_stanchion',[[x,8.49,z],[x,9.47,z]],.023,steel,hardware)
 tube('Main_bulwark',[[-33,5.87,side*6.06],[-26,5.89,side*6.49],[-11,5.99,side*6.73],[15,6.0,side*6.24],[26,6.37,side*5.3]],.105,paint,hardware,12)
 for x in [-32,-29,-26]:tube('Aft_pool_guard',[[x,5.64,side*6.06],[x,6.51,side*6.06]],.024,steel,hardware)
 tube('Aft_pool_handrail',[[-34,6.51,side*6.06],[-26,6.51,side*6.06]],.029,steel,hardware)
canopy=group('MOV_Aft_canopy',loc=(-12.0,11.065,0),extras={'role':'non-pressure sunshade','stowed_destination':'aft crown pocket'})
solid('Retractable_canopy',plan(-2.7,2.7,3.56),-.050,.050,paint,canopy,curved=True)
for side in [-1,1]:
 tube('Canopy_running_rail',[[-9.5,11.06,side*3.68],[-2.0,11.06,side*3.68]],.04,steel,baygroup)
 tube('Canopy_moving_runner',[[-2.65,-.07,side*3.24],[2.5,-.07,side*3.24]],.055,accent,canopy)
box('Aft_pocket_dark_throat',[-9.39,11.065,0],[.12,.20,7.15],black,baygroup)
track(canopy,'translation',lambda p:[-12+6.8*smooth(.13,.47,p),11.065,0])
mechanisms.append({'name':'Sliding aft canopy','travel_m':6.8,'storage':'between crown top and soffit, x -9.4 to -2.0','nominal_vertical_clearance_m':.05})
well=group('EX_Sensor_well')
solid('Mast_fairing',plan(.1,7.2,1.12),11.45,12.0,paint,well,shift=-.2,shrink=.72,curved=True)
box('Mast_well_reveal',[2.55,12.015,0],[1.38,.055,1.18],black,well,.18)
mast=group('MOV_Sensor_mast',loc=(2.55,12.04,0))
tube('Mast_lower_stage',[[0,-2.65,0],[0,.35,0]],.26,accent,mast,32)
tube('Mast_upper_stage',[[0,-1.25,0],[0,1.7,0]],.19,black,mast,32)
ellipsoid('Sensor_top',[0,1.74,0],[.39,.25,.39],paint,mast)
ring('Compact_radar_ring',[0,1.5,0],.4,.06,black,mast)
box('Camera_array',[.18,1.18,0],[.47,.25,.47],black,mast,.08)
track(mast,'translation',lambda p:[2.55,12.04-2.3*smooth(.08,.30,p),0])
for side in [-1,1]:
 leaf=group('MOV_Mast_well_lid_'+str(side),loc=(2.55,12.11,side*.97))
 box('Well_cover',[0,0,0],[1.40,.065,.60],paint,leaf,.09)
 track(leaf,'translation',lambda p,s=side:[2.55,12.11,s*(.97-.66*smooth(.31,.43,p))])
mechanisms.append({'name':'Sensor mast','vertical_travel_m':2.3,'storage':'dedicated non-pressure trunk outside pressure capsule'})
for side in [-1,1]:
 hinge=group('MOV_Terrace_'+str(side),loc=(-21,2.0,side*6.85))
 box('Terrace_outer_shell',[0,-.06,side*1.15],[8.0,.12,2.30],paint,hinge,.09)
 box('Terrace_teak',[0,.015,side*1.15],[7.84,.030,2.15],teak,hinge,.06)
 for x in np.arange(-3.8,3.9,.19):tube('Terrace_caulk',[[x,.034,side*.1],[x,.034,side*2.18]],.0055,caulk,hinge,4)
 track(hinge,'rotation',lambda p,s=side:quat([1,0,0],-s*math.pi/2*smooth(.20,.50,p)))
 box('Terrace_inner_reveal',[-21,3.16,side*6.69],[8.18,2.42,.11],black,baygroup,.07)
 for y in [1.93,4.38]:box('Terrace_recess_horizontal',[-21,y,side*6.84],[8.23,.07,.18],paint,baygroup)
 for x in [-25.09,-16.91]:box('Terrace_recess_vertical',[x,3.15,side*6.84],[.07,2.5,.18],paint,baygroup)
 for x in [-23.8,-18.2]:ring('Terrace_hinge_barrel',[x,2,side*6.86],.095,.033,steel,hardware,'x')
mechanisms.append({'name':'Port and starboard terraces','hinge_angle_deg':90,'panel_m':[8,2.3],'storage':'matching side-fairing recess; not a dry pressure closure'})
for side in [-1,1]:
 tube('Pool_cover_track',[[-34.36,5.72,side*2.82],[-24.75,5.72,side*2.82]],.04,steel,baygroup)
for k in range(4):
 y=5.80+(3-k)*.085;idx=group('MOV_Pool_cover_'+str(k),loc=(-25.8,y,0))
 box('Pool_fairing_segment',[0,0,0],[2.45,.065,5.5],paint,idx,.12)
 for s in [-1,1]:tube('Cover_runner',[[-1.1,-.05,s*2.68],[1.1,-.05,s*2.68]],.035,accent,idx)
 travel=[7.30,5.0,2.70,.40][k]
 track(idx,'translation',lambda p,k=k,yy=y,dd=travel:[-25.8-dd*smooth(.14+k*.065,.31+k*.065,p),yy,0])
box('Pool_cover_cassette_cap',[-25.63,6.20,0],[2.90,.13,5.82],paint,baygroup,.13)
for side in [-1,1]:box('Pool_cassette_side',[-25.6,5.9,side*2.86],[2.9,.53,.095],paint,baygroup)
mechanisms.append({'name':'Segmented pool fairing','segments':4,'storage':'nested cassette at forward edge of pool','pressure_door':False})
for side in [-1,1]:
 for x in [-18,-4,9]:
  box('Flood_grille_reveal',[x,7.65,side*5.53],[1.45,.23,.055],black,hardware)
  for d in np.linspace(-.64,.64,9):box('Flood_grille_bar',[x+d,7.65,side*5.58],[.032,.23,.04],accent,hardware)
for side in [-1,1]:
 idx=group('MOV_Forward_plane_'+str(side),loc=(26,.1,side*5.45))
 vv=[];ff=[];ns=12;nc=36
 for i,t in enumerate(np.linspace(0,1,ns)):
  chord=3.5*(1-.53*t)
  for a in np.linspace(0,2*math.pi,nc,endpoint=False):vv.append([-.30*t+.5*chord*math.cos(a),.055*chord*math.sin(a),side*2.85*t])
 for i in range(ns-1):
  for j in range(nc):a=i*nc+j;b=i*nc+(j+1)%nc;c=a+nc;d=b+nc;ff.extend([[a,b,d],[a,d,c]])
 add('Foreplane',trimesh.Trimesh(vv,ff),accent,idx,True)
 track(idx,'rotation',lambda p,s=side:quat([0,1,0],s*math.pi/2*(1-smooth(.46,.60,p))))
for side in [-1,1]:
 for x in [-31,-26,-19,-12,-5,2,9,16,24]:
  box('Walkway_drain',[x,5.61,side*6.14],[.85,.025,.055],black,hardware)
 for x in [-27,-21,-15]:box('Under_eave_light',[x,8.08,side*5.81],[.12,.018,.36],light,hardware)
 for x in [-5,5,12]:box('Under_crown_light',[x,10.92,side*3.60],[.1,.018,.24],light,hardware)
box('Foredeck_service_hatch',[33,6.19,0],[2.3,.055,2.35],accent,hardware,.14)
box('Foredeck_hatch_inset',[33,6.224,0],[2.17,.035,2.22],paint,hardware,.12)
for s in [-1,1]:box('Hatch_lift_handle',[33,6.25,s*.91],[.32,.03,.06],steel,hardware)
track(0,'translation',lambda p:[0,-26*smooth(.74,1,p),0])
track(1,'translation',lambda p:[-10*smooth(0,.24,p),0,-17*smooth(0,.24,p)])
count=0
for (parent,ma),rows in parts.items():
 vertices=[];faces=[];normals=[];off=0
 for _,v,f,n in rows:vertices.append(v);faces.append(f+off);normals.append(n);off+=len(v);count+=1
 v=np.concatenate(vertices);f=np.concatenate(faces);n=np.concatenate(normals)
 name=g['nodes'][parent]['name']+'__'+g['materials'][ma]['name'].replace(' / ','_')
 mi=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':access(v,'VEC3',target=34962),'NORMAL':access(n,'VEC3',target=34962)},'indices':access(f.reshape(-1),'SCALAR',5125,34963),'material':ma}]})
 ni=len(g['nodes']);g['nodes'].append({'name':name,'mesh':mi});g['nodes'][parent]['children'].append(ni)
an={'name':'Prepare_and_descend_CONCEPT_ONLY','samplers':[],'channels':[]};times=np.linspace(0,36,181);ti=access(times,'SCALAR')
for node,kind,fn in motion:
 values=[fn(t/36) for t in times];si=len(an['samplers']);an['samplers'].append({'input':ti,'output':access(values,'VEC4' if kind=='rotation' else 'VEC3'),'interpolation':'LINEAR'});an['channels'].append({'sampler':si,'target':{'node':node,'path':kind}});g['nodes'][node][kind]=values[0]
g['animations']=[an];g['buffers'][0]['byteLength']=len(buf)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);buf+=b'\0'*((-len(buf))%4)
content=struct.pack('<4sII',b'glTF',2,28+len(js)+len(buf))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(buf),b'BIN\0')+buf
(OUT/'ATLAS_D_R5.glb').write_bytes(content)
report={'revision':5,'name':'ATLAS D / Integrated exterior','loa_m':82.9,'beam_m':14.2,'fixed_pressure_core':True,'certified_depth_m':None,'new_upper_design':'fixed swept deckhouses, no folding glass pavilions','mechanisms':mechanisms,'structural_clearance_validation':False,'physics_solved':False,'duration_s':36,'prepare_end':.62,'dive_start':.74,'display_descent_m':26,'source_parts':count,'render_batches':len(g['meshes']),'glb_bytes':len(content),'note':'Only geometric and playback checks. No watertightness, collapse strength, stability or recovery qualification.'}
(OUT/'model_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
