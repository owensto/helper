"""ATLAS D R10: slate/titanium material and exterior detailing study.
Preserves R9 base dimensions and kinematic tracks. Added fittings are illustrative,
not pressure, load, collision, navigation-light or aviation qualification.
"""
from pathlib import Path
import json,struct,os,copy,math,io,hashlib
from collections import defaultdict
import numpy as np
import trimesh
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(os.environ.get('ATLAS_ROOT',Path(__file__).resolve().parent.parent))
SRC=Path(os.environ.get('ATLAS_SOURCE',ROOT/'base/viewer/ATLAS_D_R9.glb'))
OUT=ROOT/'site';OUT.mkdir(parents=True,exist_ok=True)
b=SRC.read_bytes();ln=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+ln]);buf=bytearray(b[28+ln:]);original=copy.deepcopy(g)
K={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def rd(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k=K[a['type']]
 return np.ndarray((a['count'],k),dtype=dt,buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*k),np.dtype(dt).itemsize)).copy()
def bv(data,target=None):
 buf.extend(b'\0'*(-len(buf)%4));i=len(g['bufferViews']);d={'buffer':0,'byteOffset':len(buf),'byteLength':len(data)}
 if target:d['target']=target
 g['bufferViews'].append(d);buf.extend(data);return i

def acc(data,kind='VEC3',ct=5126,target=34962):
 a=np.asarray(data,dtype={5126:'<f4',5125:'<u4'}[ct]).reshape(-1,K[kind]);assert np.isfinite(a).all();vi=bv(a.tobytes(),target);i=len(g['accessors']);d={'bufferView':vi,'componentType':ct,'count':len(a),'type':kind}
 if kind in ['VEC3','SCALAR']:d.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 g['accessors'].append(d);return i

def linear(h):
 c=np.array([int(h[i:i+2],16)/255 for i in (1,3,5)]);return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4).tolist()
def mat(name,color,metal=0,rough=.5,coat=0,emit=None,alpha=1):
 i=len(g['materials']);d={'name':name,'pbrMetallicRoughness':{'baseColorFactor':linear(color)+[alpha],'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}
 if coat:d['extensions']={'KHR_materials_clearcoat':{'clearcoatFactor':coat,'clearcoatRoughnessFactor':.22}}
 if alpha<1:d.update(alphaMode='BLEND',doubleSided=True)
 if emit:d['emissiveFactor']=linear(emit)
 g['materials'].append(d);return i
blue=mat('ATLAS | slate blue paint','#405A6D',.24,.27,.5)
titanium=mat('ATLAS | titanium silver paint','#A8AEB1',.32,.32,.38)
edge=mat('ATLAS | brushed titanium trim','#727E84',.86,.3)
chrome=mat('ATLAS | satin stainless','#AFB8BE',.92,.24)
black=mat('ATLAS | graphite elastomer','#19252E',.02,.69)
liner=mat('ATLAS | garage liner','#263946',.15,.48)
piping=mat('ATLAS | upholstery piping','#879297',0,.82)
stone=mat('ATLAS | pale stone cushions','#C8C9C5',0,.87)
lamps=mat('ATLAS | warm-white LED lenses','#FFE0B1',0,.27,emit='#FFC486')
gasket=mat('ATLAS | dark panel reveals','#1B252C',0,.7)
screen=mat('ATLAS | marine display glass','#143443',.10,.2,emit='#274756')
glass=mat('ATLAS | smoky blue-black glass','#192E3B',.06,.13,.38)
lightglass=mat('ATLAS | clear windbreak glass','#657F8C',0,.11,alpha=.18)

# Reassign individual assemblies so the painted hull and pale deck edges are distinct.
for ni,n in enumerate(g['nodes']):
 if 'mesh' not in n:continue
 name=n['name']
 for pr in g['meshes'][n['mesh']]['primitives']:
  mi=pr.get('material',0);mn=g['materials'][mi]['name']
  if mi in [11,16,25,37]:
   pr['material']=blue if (name.startswith(('FIXED_Hull','MOV_Tender','MOV_Garage_door','FIXED_Tender_bays','MOV_Terrace')) or mi==37) else titanium
  elif mi in [2,33,55]:pr['material']=chrome
  elif mi==26:pr['material']=edge
  elif mi in [5,12,27]:pr['material']=glass
  elif mi in [21,32,45]:pr['material']=stone
  elif mi==24:pr['material']=lightglass
  elif mi in [0,3]:
   g['materials'][mi]['pbrMetallicRoughness'].update(baseColorFactor=linear('#283139')+[1],metallicFactor=.2,roughnessFactor=.43)
  elif mi in [13,35]:pr['material']=lamps
  elif mi==53:pr['material']=edge
# Dark bedding under actual teak joints, without recoloring the painted vertical roof lips.
caulking=mat('ATLAS | teak caulking bedding','#393A35',0,.83)
for node in g['nodes']:
 if 'mesh' not in node:continue
 name=node['name']; top=None
 for pref,value in [('FIXED_Main_deckhouse',8.39),('MOV_Shell_Upper',11.14),('MOV_Shell_Bridge',13.86),('MOV_Shell_Sky',15.92)]:
  if name.startswith(pref) and 'Ceramic_pearl' in name:top=value
 if top is None:continue
 mesh=g['meshes'][node['mesh']];extra=[]
 for pr in mesh['primitives']:
  v=rd(pr['attributes']['POSITION']);f=rd(pr['indices']).reshape(-1,3);cent=v[f].mean(1);delta=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
  mask=(np.abs(cent[:,1]-top)<.018)&(delta[:,1]>1e-8)
  if mask.any():
   ep=copy.deepcopy(pr);ep['material']=caulking;ep['indices']=acc(f[mask],'SCALAR',5125,34963);extra.append(ep);pr['indices']=acc(f[~mask],'SCALAR',5125,34963)
 mesh['primitives'].extend(extra)

# Procedural PBR maps are embedded. No texture-CDN dependency.
rng=np.random.default_rng(2566)
def texture(arr,name):
 im=Image.fromarray(np.uint8(np.clip(arr,0,255)));f=io.BytesIO();im.save(f,format='PNG',optimize=True);vi=bv(f.getvalue());ii=len(g.setdefault('images',[]));g['images'].append({'name':name,'bufferView':vi,'mimeType':'image/png'});ti=len(g.setdefault('textures',[]));g['textures'].append({'sampler':0,'source':ii});return ti

g['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
x,y=np.meshgrid(np.arange(1024)/1024,np.arange(256)/256)
grain=3*np.sin(y*420+2*np.sin(x*13))+1.5*np.sin(y*1900+x*12)+rng.normal(0,1.0,x.shape)
wood=np.stack([129+grain,122+grain,108+grain],-1)
woodtex=texture(wood,'Weathered teak | fine longitudinal grain')
woodnormal=texture(np.stack([128+np.gradient(grain,axis=1)*.9,128+np.gradient(grain,axis=0)*1.6,np.full_like(grain,254)],-1),'Teak subtle normal')
weave_x,weave_y=np.meshgrid(np.arange(256),np.arange(256));weave=(np.sin(weave_x*np.pi/3)*np.cos(weave_y*np.pi/3))
weave_tex=texture(np.stack([128+weave*13,128-weave*13,np.full_like(weave,253)],-1),'Fabric woven micro-normal')
g['materials'][stone]['normalTexture']={'index':weave_tex,'scale':.24}
wood_ids={14,15,17,18,29}
for mi in wood_ids:
 m=g['materials'][mi];m['name']='Weathered teak '+str(mi);m['pbrMetallicRoughness'].update(baseColorFactor=[.96,.96,.96,1],metallicFactor=0,roughnessFactor=.67,baseColorTexture={'index':woodtex});m['normalTexture']={'index':woodnormal,'scale':.21}
# Pool porcelain grid uses world-scale UV, not large checkerboard tiles.
Y,X=np.mgrid[0:512,0:512];tileval=np.full((512,512),1.);tileval[(X%64<3)|(Y%64<3)]=.6;tileval+=rng.normal(0,.011,tileval.shape)
tiletex=texture(np.stack([66*tileval,99*tileval,113*tileval],-1),'Pool small porcelain mosaic')
g['materials'][19]['pbrMetallicRoughness'].update(baseColorFactor=[1,1,1,1],baseColorTexture={'index':tiletex},metallicFactor=0,roughnessFactor=.26)
g['materials'][20]['pbrMetallicRoughness'].update(baseColorFactor=linear('#327487')+[.73],metallicFactor=.10,roughnessFactor=.12);g['materials'][20]['alphaMode']='BLEND'

def auto_uv(v,n,scale=1):
 out=np.zeros((len(v),2));axis=np.argmax(np.abs(n),axis=1)
 for a,cols in [(0,(2,1)),(1,(0,2)),(2,(0,1))]:
  mask=axis==a;out[mask]=v[mask][:,cols]*scale
 return out
for mesh in g['meshes']:
 for pr in mesh['primitives']:
  mi=pr.get('material',0)
  if mi in wood_ids or mi in [stone,19]:
   v=rd(pr['attributes']['POSITION']);n=rd(pr['attributes']['NORMAL']);uv=auto_uv(v,n,1.25 if mi==19 else 5.0 if mi==stone else 1)
   if mi in wood_ids:uv[:,0]/=3;uv[:,1]/=.76
   pr['attributes']['TEXCOORD_0']=acc(uv,'VEC2')
# Helpers for real rounded geometry, metal mounts and fasteners.
parts=defaultdict(list);inventory=[]
parents={n['name']:i for i,n in enumerate(g['nodes'])}
def group(name,parent):
 i=len(g['nodes']);g['nodes'].append({'name':name,'children':[]});g['nodes'][parent].setdefault('children',[]).append(i);return i

def add(name,m,ma,parent,smooth=True):
 if not len(m.faces):return
 m=m.copy();m.remove_unreferenced_vertices()
 if m.is_watertight and m.volume<0:m.invert()
 if smooth:v=np.asarray(m.vertices);f=np.asarray(m.faces);n=np.asarray(m.vertex_normals)
 else:v=np.asarray(m.vertices)[m.faces].reshape(-1,3);f=np.arange(len(v)).reshape(-1,3);n=np.repeat(m.face_normals,3,axis=0)
 parts[(parent,ma)].append((v,f,n));inventory.append({'name':name,'parent':g['nodes'][parent]['name'],'material':g['materials'][ma]['name']})
def rounded_box(loc,dim,r=.06):
 half=np.array(dim)/2;rad=min(r,min(half)*.95);core=half-rad;vs=[];fs=[]
 for axis in range(3):
  axes=[k for k in range(3) if k!=axis]
  for sign in [-1,1]:
   steps=[]
   for a in axes:steps.append(np.r_[np.linspace(-half[a],-core[a],4),np.linspace(core[a],half[a],4)])
   st=len(vs)
   for u in steps[0]:
    for v in steps[1]:
     p=np.zeros(3);p[axis]=half[axis]*sign;p[axes[0]]=u;p[axes[1]]=v;c=np.clip(p,-core,core);d=p-c;p=c+rad*d/np.linalg.norm(d);vs.append(p+loc)
   for u in range(7):
    for v in range(7):
     a=st+u*8+v;faces=[[a,a+8,a+9],[a,a+9,a+1]]
     for f in faces:
      if np.cross(np.array(vs[f[1]])-vs[f[0]],np.array(vs[f[2]])-vs[f[0]])[axis]*sign<0:f.reverse()
      fs.append(f)
 return trimesh.Trimesh(vs,fs,process=True)
def box(name,loc,dim,ma,parent,r=.025):add(name,rounded_box(np.array(loc),dim,r),ma,parent)
def tube(name,pts,r,ma,parent,segments=10):
 pts=np.asarray(pts);verts=[];faces=[]
 for j,p in enumerate(pts):
  d=pts[min(j+1,len(pts)-1)]-pts[max(j-1,0)];d/=max(np.linalg.norm(d),1e-8);u=np.cross(d,[0,1,0] if abs(d[1])<.85 else [0,0,1]);u/=max(np.linalg.norm(u),1e-8);v=np.cross(d,u)
  for t in np.linspace(0,2*np.pi,segments,endpoint=False):verts.append(p+r*(np.cos(t)*u+np.sin(t)*v))
 for j in range(len(pts)-1):
  for k in range(segments):a=j*segments+k;b=j*segments+(k+1)%segments;faces.extend([[a,b,b+segments],[a,b+segments,a+segments]])
 add(name,trimesh.Trimesh(verts,faces,process=False),ma,parent)
def cyl(name,p,r,h,ma,parent,axis='y',sections=12):
 m=trimesh.creation.cylinder(radius=r,height=h,sections=sections);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],{'x':[1,0,0],'y':[0,1,0],'z':[0,0,1]}[axis]));m.apply_translation(p);add(name,m,ma,parent)
def ring(name,p,r,t,ma,parent,plane='xz',segments=48):
 pts=[]
 for a in np.linspace(0,2*np.pi,segments+1):
  d=[r*np.cos(a),0,r*np.sin(a)] if plane=='xz' else [0,r*np.cos(a),r*np.sin(a)] if plane=='yz' else [r*np.cos(a),r*np.sin(a),0]
  pts.append(np.array(p)+d)
 tube(name,pts,t,ma,parent,8)
def loop_rect(center,size,r=.08):
 x,y,z=center;L,W=size;pts=[]
 for cx,cz,a in [(x+L/2-r,z+W/2-r,0),(x-L/2+r,z+W/2-r,90),(x-L/2+r,z-W/2+r,180),(x+L/2-r,z-W/2+r,270)]:
  for t in np.linspace(a,a+90,8,endpoint=False):t=math.radians(t);pts.append([cx+r*math.cos(t),y,cz+r*math.sin(t)])
 return pts+[pts[0]]
# Upholstery rebuilt with soft three-dimensional corner radii; keep every original bounding box.
soft_count=0
for ni,n in list(enumerate(g['nodes'])):
 if 'mesh' not in n or not (n['name'].startswith('MOV_') and ('fabric' in n['name'] or 'linen' in n['name'])):continue
 oldmesh=g['meshes'][n['mesh']];newp=[]
 for pr in oldmesh['primitives']:
  if pr.get('material')!=stone:continue
  m=trimesh.Trimesh(rd(pr['attributes']['POSITION']),rd(pr['indices']).reshape(-1,3),process=True)
  try:comps=m.split(only_watertight=False)
  except Exception:comps=[m]
  allm=[]
  for c in comps:
   dim=c.extents;center=c.bounds.mean(0)
   if min(dim)<.045:allm.append(c);continue
   allm.append(rounded_box(center,dim,min(.09,min(dim)*.29)));soft_count+=1
   if dim[1]<.4 and dim[0]>.4 and dim[2]>.4:
    tube('Cushion stitched piping',loop_rect(center+[0,dim[1]*.27,0],(dim[0]-.018,dim[2]-.018),.08),.008,piping,ni)
  mesh=trimesh.util.concatenate(allm);v=np.array(mesh.vertices);norm=np.array(mesh.vertex_normals)
  pr['attributes']={'POSITION':acc(v),'NORMAL':acc(norm),'TEXCOORD_0':acc(auto_uv(v,norm,5),'VEC2')};pr['indices']=acc(mesh.faces,'SCALAR',5125,34963)
# True external mullions, window seal bands, small soffit fixtures and railing mounts.
levels=[('Main',5.52,8.13,-26.4,25.,5.9,-32.,6.55,'FIXED_Main_deckhouse'),('Upper',8.54,10.88,-18.8,18.3,5.2,-26.1,5.79,'MOV_Shell_Upper'),('Bridge',11.28,13.60,-10.5,11.2,4.08,-19.25,4.69,'MOV_Shell_Bridge'),('Sky',14.,15.66,-4.9,5.,2.8,-11.8,3.53,'MOV_Shell_Sky')]
for name,base,top,a,b,w,ra,rw,pn in levels:
 p=group('DETAIL_'+name,parents[pn]);railp=parents['MOV_Rails_'+name]
 for side in [-1,1]:
  for x in np.arange(a+2,b-7,2.25):
   tube('Segmented glazing vertical frame',[[x,base+.16,side*(w+.016)],[x-.60,top-.07,side*(w*.94+.016)]],.026,edge,p)
   cyl('Soffit downlight bezel',[x,top-.055,side*(w+.25)],.075,.018,chrome,p)
   cyl('Soffit warm LED diffuser',[x,top-.067,side*(w+.25)],.054,.021,lamps,p)
  for x in np.arange(ra+2,b-8,2.0):
   box('Stanchion mounting shoe',[x,top+.31,side*(rw*.985)],(.14,.038,.095),chrome,railp,.015)
   for xx in [-.043,.043]:cyl('Railing countersunk screw',[x+xx,top+.333,side*(rw*.985)],.012,.008,black,railp,sections=8)
 # Aft small display, speaker and service panel stay with each moving shell.
 for side in [-1,1]:
  x=a+.6;z=side*w*.8
  box('Exterior speaker enclosure',[x,base+1.1,z],(.28,.42,.07),black,p,.04)
  for j in range(6):box('Speaker grille slat',[x,base+.95+j*.052,z+side*.04],(.20,.012,.014),edge,p,.005)
# Compact side-shell details: window surrounds derived from the original window surface boundary.
n=next(n for n in g['nodes'] if n['name']=='FIXED_Hull__glass');pr=g['meshes'][n['mesh']]['primitives'][0]
m=trimesh.Trimesh(rd(pr['attributes']['POSITION']),rd(pr['indices']).reshape(-1,3),process=True)
p=group('DETAIL_Hull',parents['FIXED_Hull'])
for comp in m.split(only_watertight=False):
 boundary=comp.edges[trimesh.grouping.group_rows(np.sort(comp.edges,axis=1),require_count=1)]
 # Boundary edges may be tessellated; make thin continuous gaskets along exposed contour.
 if len(boundary):
  for aa,bb in boundary:
   pts=comp.vertices[[aa,bb]].copy();pts[:,2]+=np.sign(pts[:,2])*.012;tube('Hull glazing gasket',pts,.012,gasket,p,6)
# Sculpted service hatches in the foredeck; flush handles, hinges and fasteners.
p=group('DETAIL_Foredeck',parents['FIXED_Main_deck'])
for x,z in [(23,-3.7),(23,3.7),(34,-1.8),(34,1.8)]:
 y=6.245;box('Flush service hatch gasket',[x,y,z],(1.02,.045,.72),gasket,p,.075);box('Flush service hatch lid',[x,y+.027,z],(.98,.035,.68),titanium,p,.066)
 box('Recessed lifting handle surround',[x,y+.048,z+.16],(.21,.018,.095),black,p,.02);tube('Recessed lifting handle',[[x-.07,y+.063,z+.16],[x+.07,y+.063,z+.16]],.018,chrome,p)
 for xx in [-.37,.37]:
  for zz in [-.23,.23]:cyl('Captive deck fastener',[x+xx,y+.051,z+zz],.017,.007,chrome,p,sections=6)
# Pool overflow grate, ladder and coaming edge. Kept outside the existing cover envelope.
p=group('DETAIL_Pool',parents['FIXED_Main_deck'])
for side in [-1,1]:
 z=side*2.76;box('Pool perimeter drainage',[ -30.50,6.03,z],(7.35,.046,.115),black,p,.03)
 for x in np.arange(-34,-26.95,.14):box('Drain grate slot',[x,6.058,z],(.018,.012,.106),edge,p,.004)
 tube('Pool stainless coaming cap',[[-34.10,6.035,side*2.66],[-26.91,6.035,side*2.66]],.02,chrome,p)
for z in [-.56,.56]:tube('Pool access handhold',[[-26.68,6.05,z],[-26.70,6.53,z],[-27.10,6.64,z],[-27.26,6.26,z]],.031,chrome,p)
for x in [-32.7,-30.5,-28.3]:
 for side in [-1,1]:
  cyl('Pool wall lamp bezel',[x,5.63,side*2.485],.105,.025,chrome,p,axis='z',sections=24);cyl('Pool wall lamp lens',[x,5.63,side*2.466],.076,.018,lamps,p,axis='z',sections=24)
# Stern stair stringers, risers, nosings and handrails follow the inherited 186 mm tread rises.
p=group('DETAIL_Stern_stairs',parents['FIXED_Main_deck'])
for side in [-1,1]:
 for z in [side*4.35,side*5.41]:
  tube('Inclined stair support stringer',[[-40.42,.88,z],[-32.98,5.47,z]],.075,edge,p,10)
  tube('Stair handrail',[[-40.42,2.02,z],[-32.98,6.60,z]],.028,chrome,p,10)
  for k in [0,6,12,18,24]:
   x=-40.3+k*.302;y=1.04+k*.186;tube('Stair rail stanchion',[[x,y+.04,z],[x,y+1.10,z]],.022,chrome,p,8)
 for k in range(24):
  x=-40.3+k*.302;y=1.04+k*.186
  box('Closed stair riser',[x+.135,y+.091,side*4.88],(.038,.17,1.19),titanium,p,.01)
  tube('Metal step nosing',[[x-.17,y+.045,side*4.88-.58],[x-.17,y+.045,side*4.88+.58]],.012,edge,p,8)

# Aft shell doors: edge seals, hinge knuckles, latch recesses, visible panel stiffeners.
for side in [-1,1]:
 p=group('DETAIL_GarageDoor_'+str(side),parents['MOV_Garage_door_'+str(side)])
 for z in [-1.98,1.98]:tube('Outer-door vertical perimeter seal',[[-.112,-3.70,z],[-.112,-.10,z]],.019,gasket,p)
 for y in [-3.70,-.1]:tube('Outer-door horizontal perimeter seal',[[-.112,y,-1.98],[-.112,y,1.98]],.019,gasket,p)
 for z in [-1.55,-.8,0,.8,1.55]:
  cyl('Outer styling-door hinge knuckle',[0,.015,z],.105,.27,chrome,p,axis='z',sections=20)
  cyl('Hinge pin end cap',[0,.015,z+.139],.067,.016,edge,p,axis='z',sections=16)
 for y in [-.55,-1.85,-3.15]:
  for z in [-1.80,1.80]:
   box('Closure handle recess',[-.115,y,z],(.027,.25,.12),black,p,.013)
   tube('Flush latch handle',[[-.14,y-.065,z],[-.14,y+.065,z]],.020,chrome,p)
 for z in [-1.4,-.45,.45,1.4]:box('Inner door reinforcement rib',[.168,-1.9,z],(.07,3.2,.075),edge,p,.014)
 for z in [-1.65,1.65]:
  for y in np.arange(-3.45,-.18,.4):cyl('Perimeter captive fastener',[-.136,y,z],.021,.011,chrome,p,axis='x',sections=6)
# Guide hardware and individually modeled end stops on R9 carrier (no load-rating claim).
for label in ['Chase','Utility']:
 p=group('DETAIL_Carrier_'+label,parents['MOV_Cradle_'+label]);L=11.6 if label=='Chase' else 6.8
 for x in [-L*.4,0,L*.37]:
  for z in [-.97,.97]:
   box('Carrier support clamp',[x,.115,z],(.22,.07,.16),edge,p,.022)
   for xx in [-.06,.06]:cyl('Carrier clamp bolt',[x+xx,.157,z],.022,.024,chrome,p,sections=6)
# Textured builder plaques and yacht name, printed detail rather than bogus equipment ratings.
def decal(text,name,size=(1024,256)):
 im=Image.new('RGBA',size,(0,0,0,0));d=ImageDraw.Draw(im)
 paths=['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'];font=next((v for v in paths if Path(v).exists()),None)
 f=ImageFont.truetype(font,int(size[1]*.55)) if font else ImageFont.load_default();bb=d.textbbox((0,0),text,font=f);d.text(((size[0]-bb[2])/2,(size[1]-bb[3])/2-bb[1]),text,font=f,fill=(219,226,229,255))
 ti=texture(np.array(im),name);ma=mat(name,'#FFFFFF',.0,.55);g['materials'][ma]['pbrMetallicRoughness']['baseColorTexture']={'index':ti};g['materials'][ma].update(alphaMode='MASK',alphaCutoff=.3,doubleSided=True);return ma
name_mat=decal('A T L A S  D','Hull wordmark')
def quad(name,v,ma,parent):
 nn=np.cross(np.array(v[1])-v[0],np.array(v[2])-v[0]);nn/=np.linalg.norm(nn);mi=len(g['meshes']);g['meshes'].append({'name':name,'primitives':[{'attributes':{'POSITION':acc(v),'NORMAL':acc([nn]*4),'TEXCOORD_0':acc([[0,1],[1,1],[1,0],[0,0]],'VEC2')},'indices':acc([[0,1,2],[0,2,3]],'SCALAR',5125,34963),'material':ma}]});ni=group(name,parent);g['nodes'][ni]['mesh']=mi
for side in [-1,1]:
 # Sign sits just off the bowed side in the forward-quarter area.
 quad('ATLAS D side designation',[[18.7,3.74,side*6.81],[23.7,3.74,side*6.28],[23.7,4.25,side*6.28],[18.7,4.25,side*6.81]],name_mat,parents['FIXED_Hull'])
# Append batches while retaining an inspectable component inventory.
for (parent,ma),items in parts.items():
 vs=[];ns=[];fs=[];offset=0
 for v,f,n in items:vs.append(v);ns.append(n);fs.append(f+offset);offset+=len(v)
 v=np.concatenate(vs);n=np.concatenate(ns);f=np.concatenate(fs);attrs={'POSITION':acc(v),'NORMAL':acc(n)}
 if ma==stone:attrs['TEXCOORD_0']=acc(auto_uv(v,n,5),'VEC2')
 idx=len(g['meshes']);name=g['nodes'][parent]['name']+'__'+g['materials'][ma]['name'].replace(' ','_').replace('|','_');g['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':acc(f,'SCALAR',5125,34963),'material':ma}]});ni=group(name,parent);g['nodes'][ni]['mesh']=idx
# Indexed, byte-for-byte copies of all previous motion channels, no scaling or hull substitution.
assert g['animations']==original['animations']
g['asset']['generator']='ATLAS D R10 | Slate & Titanium detail edition';g['asset']['copyright']='Visualization study; no safe-depth or engineering qualification.'
g['extensionsUsed']=sorted(set(g.get('extensionsUsed',[])+['KHR_materials_clearcoat']))
g['buffers'][0]['byteLength']=len(buf);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);buf.extend(b'\0'*(-len(buf)%4));total=28+len(js)+len(buf)
(OUT/'ATLAS_D_R10.glb').write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(buf),0x004e4942)+buf)
report={'revision':10,'name':'ATLAS D | Slate & Titanium','length_m':82.9,'beam_m':14.2,'palette':{'hull':'#405A6D','superstructure':'#A8AEB1','alternative_hull':'#747F88','glazing':'#192E3B','upholstery':'#C8C9C5'},'model_bytes':total,'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'rounded_upholstery_components':soft_count,'added_detail_components':len(inventory),'render_meshes':len(g['meshes']),'embedded_texture_count':len(g['textures']),'animation_channels':len(g['animations'][0]['channels']),'animation_tracks_unchanged':True,'hull_geometry_unchanged':True,'helipad_retained':True,'recovered_tenders':2,'engineering_validated':False,'certified_depth_m':None,'new_clearance_checks':False,'limitations':['Original R9 geometric findings remain, not new engineering validation.','Added fittings and door details are illustrative, not load-rated, pressure-rated, or fully collision-checked.','Existing upper-shell nesting remains speculative and is not occupied accommodation.','No mass, stability, powered recovery or safe diving capability established.'],'detail_inventory':inventory}
(OUT/'model_report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='detail_inventory'},indent=2))
