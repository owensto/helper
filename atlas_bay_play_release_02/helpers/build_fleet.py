"""ATLAS Fleet 02. Original visual models, never fabrication/operating specifications.
Staging axes: +X bow, +Y up, +Z starboard. Blender import converts to +Z up.
Military equipment is static exterior scenery; no weapons internals or operation.
"""
from pathlib import Path
import os,json,math,struct,copy,hashlib
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation
from scipy.interpolate import PchipInterpolator
from meshkit import Model, smooth, quat, rounded, footprint, slab, wall, boxmesh, tubes, ellipse, readglb
ROOT=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'staging';OUT.mkdir(parents=True,exist_ok=True)
SITE=ROOT/'site';SITE.mkdir(parents=True,exist_ok=True)
TAU=2*math.pi
from detail import roof, console, helm_seats, cowling, bay_detail, naval_detail, loft

def linear(h):
 v=np.array([int(h[i:i+2],16)/255 for i in (1,3,5)]);return np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4).tolist()
def palette(m):
 d={}
 for n,c,me,ro in [('blue','#405A6D',.03,.25),('silver','#A8AEB1',.13,.34),('white','#E6E7E1',.0,.32),('deck','#AAB6B5',.0,.75),('darkdeck','#465359',.05,.87),('naval','#78858D',.035,.47),('sub','#34434A',.10,.53),('black','#182229',.02,.62),('glass','#18323F',.1,.15),('chrome','#B1BDC1',.9,.25),('wood','#877C69',.0,.69),('fabric','#C9CEC9',0,.83),('piping','#858F91',0,.8),('screen','#123C49',.04,.21),('amber','#FFC683',.02,.32),('red','#A4503E',0,.55),('sea','#547C84',.08,.23),('interior','#CBD0C9',0,.6),('floor','#6D7C80',0,.73)]:
  d[n]=m.mat(n,linear(c),me,ro,emit=linear('#345E69') if n=='screen' else linear('#C09760') if n=='amber' else None)
 return d

def rbox(loc,dim,r=.035):
 # Rounded rectangular 3D edges, not scaled spheres.
 size=np.array(dim);r=min(r,min(size)*.43);core=np.maximum(size/2-r,.001)
 seg=5;verts=[];faces=[]
 # 6 gridded faces of inflated cube; overlap vertices are merged.
 for ax in range(3):
  u=(ax+1)%3;v=(ax+2)%3
  for side in [-1,1]:
   start=len(verts)
   aa=np.unique(np.r_[-size[u]/2,np.linspace(-size[u]/2,-core[u],seg),-core[u],core[u],np.linspace(core[u],size[u]/2,seg),size[u]/2]);bb=np.unique(np.r_[-size[v]/2,np.linspace(-size[v]/2,-core[v],seg),-core[v],core[v],np.linspace(core[v],size[v]/2,seg),size[v]/2])
   for a in aa:
    for b in bb:
     q=np.zeros(3);q[ax]=side*size[ax]/2;q[u]=a;q[v]=b;p=np.clip(q,-core,core);dv=q-p;p+=r*dv/max(np.linalg.norm(dv),1e-9);verts.append(p+loc)
   for i in range(len(aa)-1):
    for j in range(len(bb)-1):
     a=start+i*len(bb)+j;b=a+1;c=a+len(bb);d=c+1;faces.extend([[a,c,b],[b,c,d]])
 mesh=trimesh.Trimesh(verts,faces,process=True);mesh.fix_normals(multibody=True);return mesh

class Builder:
 def __init__(self,name):
  self.m=Model();self.m.g['asset'].update(generator='ATLAS Fleet 02 / editable geometry staging',copyright='Original visual design study. Not engineering, safety or combat qualification.');self.m.g['scenes'][0]['name']=name;self.name=name;self.c=palette(self.m);self.groups={};self.inventory=[]
 def group(self,n,parent=0,loc=(0,0,0)):
  i=self.m.node(n,parent,loc);self.groups[n]=i;return i
 def add(self,n,mesh,ma='white',parent=0,smooth=False):
  self.m.add(n,mesh,self.c[ma] if isinstance(ma,str) else ma,parent,smooth);self.inventory.append(n)
 def box(self,n,loc,dim,ma='white',parent=0,r=.03):self.add(n,rbox(np.array(loc),dim,r) if r else boxmesh(loc,dim),ma,parent,True if r else False)
 def tube(self,n,pts,r=.02,ma='chrome',parent=0,sides=10):self.add(n,tubes(pts,r,sides),ma,parent,True)
 def cyl(self,n,p,r,h,ma='chrome',parent=0,axis='y',sections=24):
  q=trimesh.creation.cylinder(radius=r,height=h,sections=sections);q.apply_transform(trimesh.geometry.align_vectors([0,0,1],{'x':[1,0,0],'y':[0,1,0],'z':[0,0,1]}[axis]));q.apply_translation(p);self.add(n,q,ma,parent,True)
 def ell(self,n,p,r,ma='white',parent=0):self.add(n,ellipse(p,r),ma,parent,True)
 def ring(self,n,p,r,t=.018,ma='chrome',parent=0,axis='y'):
  pts=[]
  for a in np.linspace(0,TAU,65):pts.append(np.array(p)+({'y':[r*math.cos(a),0,r*math.sin(a)],'x':[0,r*math.cos(a),r*math.sin(a)],'z':[r*math.cos(a),r*math.sin(a),0]}[axis]))
  self.tube(n,pts,t,ma,parent)
 def slab(self,n,poly,y0,y1,ma='white',parent=0):self.add(n,slab(poly,y0,y1),ma,parent,False)
 def text(self,text,pos,height,ma='white',parent=0,plane='side',facing=1):
  # Letter outlines are meshes; no font file is shipped.
  from matplotlib.textpath import TextPath
  from matplotlib.font_manager import FontProperties
  from shapely.geometry import Polygon
  from shapely.ops import unary_union
  tp=TextPath((0,0),text,size=height,prop=FontProperties(family='DejaVu Sans',weight='normal'))
  shapes=[]
  for p in tp.to_polygons():
   s=Polygon(p)
   if s.is_valid and s.area>1e-7:shapes.append(s)
  if not shapes:return
  # XOR rings preserves counters in lettering.
  geo=shapes[0]
  for s in shapes[1:]:geo=geo.symmetric_difference(s)
  for s in ([geo] if geo.geom_type=='Polygon' else geo.geoms):
   mesh=slab(np.array(s.exterior.coords)[:-1],0,.006,[np.array(a.coords)[:-1] for a in s.interiors]);v=mesh.vertices.copy()
   if plane=='side':mesh.vertices=np.c_[v[:,0]*facing+pos[0],v[:,2]+pos[1],v[:,1]*facing+pos[2]]
   elif plane=='deck':mesh.vertices=v+pos
   elif plane=='transom':mesh.vertices=np.c_[v[:,1]+pos[0],v[:,2]+pos[1],v[:,0]+pos[2]]
   self.add('Marking '+text,mesh,ma,parent)
 def save(self,file,dur=60):
  stats=self.m.export(OUT/file,dur);stats.update(name=self.name,components=len(self.inventory),engineering_validated=False);(OUT/(file+'.inventory.json')).write_text(json.dumps(self.inventory,indent=2));return stats

def foil_mesh(length,span,thickness,rootx=0,dihedral=0):
 v=[];f=[]
 for j in range(9):
  z=span*j/8;chord=length*(1-.42*j/8);shift=-.24*length*j/8
  for i in range(32):
   a=TAU*i/32;t=(1-math.cos(a))/2;x=chord*(.5-t)+shift+rootx;y=thickness*math.sin(a)*(.65+.35*(1-t))+dihedral*z;v.append([x,y,z])
 for j in range(8):
  for i in range(32):a=j*32+i;b=j*32+(i+1)%32;f.extend([[a,a+32,b],[b,a+32,b+32]])
 m=trimesh.Trimesh(v,f,process=False);m.fix_normals();return m

def hull_surface(sections,nx=100,half=1,nr=32):
 # Station data: X, halfbeam, sheer height, chine y, keel y. Semi-V marine hull.
 a=np.array(sections);xs=np.linspace(a[0,0],a[-1,0],nx);s=[PchipInterpolator(a[:,0],a[:,i])(xs) for i in range(1,5)];v=[];f=[]
 for ix,x in enumerate(xs):
  beam,deck,chine,keel=(q[ix] for q in s)
  # ring from sheer to keel, matched to opposite half at centerline.
  for j in range(nr+1):
   t=j/nr
   if t<.57:
    u=t/.57;z=beam*(1-.075*u-.02*math.sin(u*math.pi));y=deck+(chine-deck)*u
   else:
    u=(t-.57)/.43;z=beam*.925*(1-u);y=chine+(keel-chine)*(u**.66)
   v.append([x,y,half*z])
 for i in range(nx-1):
  for j in range(nr):a=i*(nr+1)+j;b=a+1;c=a+nr+1;d=c+1;f.extend([[a,b,c],[b,d,c]])
 m=trimesh.Trimesh(v,f,process=False);m.fix_normals();# manually orient hull exterior toward side
 cent=m.triangles_center;norm=m.face_normals
 if np.mean(norm[:,2]*half)<0:m.invert()
 return m

def fair_shape(b,n,poly,y0,y1,parent,ma='naval',narrow=.9,shift=-.8):
 b.add(n+' tapered sides',wall(poly,y0,y1,shift,narrow),ma,parent,False)
 p=np.array(poly);p[:,0]+=shift;p[:,1]*=narrow;b.slab(n+' roof',p,y1,y1+.13,'darkdeck',parent)
 b.slab(n+' footing',poly,y0,y0+.12,ma,parent)

def rail_run(b,pts,parent,ma='chrome',height=1.0,spacing=2.2,r=.027):
 a=np.array(pts)
 b.tube('Continuous handrail',a+[0,height,0],r,ma,parent)
 b.tube('Mid rail',a+[0,height*.50,0],r*.6,ma,parent)
 for p,q in zip(a[:-1],a[1:]):
  for t in np.linspace(0,1,max(2,int(np.linalg.norm(q-p)/spacing)+1)):
   loc=p*(1-t)+q*t;b.tube('Rail stanchion',[loc,loc+[0,height,0]],r*.8,ma,parent);b.box('Rail mounting shoe',loc+[0,.02,0],[.12,.05,.12],ma,parent,.02)

def chair(b,p,parent,angle=0):
 x,y,z=p;b.box('Chair seat',(x,y+.45,z),(.54,.10,.51),'fabric',parent,.06);b.box('Chair back',(x-.22,y+.80,z),(.09,.64,.52),'fabric',parent,.07)
 for dx in [-.19,.19]:
  for dz in [-.18,.18]:b.tube('Chair leg',[(x+dx,y,z+dz),(x+dx,y+.42,z+dz)],.027,'chrome',parent)
def room(b,name,x0,x1,z0,z1,y,parent,kind='cabin'):
 b.box(name+' deck',((x0+x1)/2,y-.05,(z0+z1)/2),(x1-x0,.10,z1-z0),'floor',parent,0)
 for x in [x0,x1]:
  # keep central circulation gap rather than solid transverse partitions
  for a,c in [(z0,min(-.65,z1)),(max(.65,z0),z1)]:
   if c>a:b.box(name+' partition',(x,y+1.1,(a+c)/2),(.065,2.2,c-a),'interior',parent,0)
 if kind=='cabin':
  for z in [z0+.56,z1-.56]:
   for level in [0,1]:
    b.box('Bunk frame',(x0+1.4,y+.42+level*.84,z),(2.02,.10,.86),'darkdeck',parent,.04);b.box('Mattress',(x0+1.4,y+.54+level*.84,z),(1.92,.15,.78),'fabric',parent,.07);b.box('Pillow',(x0+.75,y+.65+level*.84,z),(.45,.13,.67),'white',parent,.08)
   b.box('Personal locker',(x1-.40,y+.88,z),(.6,1.76,.72),'interior',parent,.045)
 elif kind=='ops':
  for x in np.arange(x0+1.3,x1-.6,1.5):
   for side in [-1,1]:
    z=(z1-.65) if side>0 else (z0+.65);b.box('Console pedestal',(x,y+.47,z),(.98,.92,.53),'darkdeck',parent,.055);b.box('Navigation display',(x,y+1.22,z+side*.10),(.94,.57,.055),'screen',parent,.025);chair(b,(x,y,z-side*.83),parent)
  b.box('Chart table',((x0+x1)/2,y+.90,0),(2.3,.12,1.1),'interior',parent,.08)
 elif kind=='mess':
  for x in np.arange(x0+1.3,x1-.6,2):
   b.box('Mess table',(x,y+.78,0),(1.6,.09,1.35),'white',parent,.07)
   for z in [-1.15,1.15]:chair(b,(x-.4,y,z),parent);chair(b,(x+.35,y,z),parent)
  b.box('Galley counter',(x0+.4,y+.47,z1-.55),(.66,.94,1.3),'chrome',parent,.04)
 elif kind=='equipment':
  for x in np.arange(x0+1,x1-1,2.2):
   for z in [z0+.8,z1-.8]:
    b.box('Generic equipment enclosure',(x,y+.86,z),(1.35,1.72,1.14),'darkdeck',parent,.09)
    for h in range(8):b.box('Ventilation grille',(x+.69,y+.35+h*.16,z),(.022,.055,.82),'black',parent,0)
    b.box('Local service display',(x+.72,y+1.33,z),(.025,.21,.36),'screen',parent,.01)

def bay_boat():
 b=Builder('ATLAS Bay 25 | rigid T-top fishing tender');hull=b.group('EX_Hull');deck=b.group('EX_Deck');top=b.group('FIXED_TTop');hw=b.group('EX_Hardware');inside=b.group('EX_Console');seats=b.group('EX_Seating')
 sec=[(-3.75,1.20,.71,-.18,-.49),(-3.1,1.26,.75,-.2,-.5),(-1.5,1.30,.79,-.15,-.47),(0,1.29,.83,-.1,-.43),(1.5,1.21,.94,.01,-.32),(2.5,1.02,1.05,.22,-.05),(3.1,.72,1.13,.42,.22),(3.65,.21,1.19,.81,.72),(3.75,.025,1.21,1.05,1.04)]
 for side in [-1,1]:b.add('Flared bay hull',hull_surface(sec,108,side,30),'blue',hull,True)
 b.box('Transom',(-3.72,.1,0),(.06,1.15,2.36),'blue',hull,.025)
 p=rounded([[-3.71,-1.19],[-2.7,-1.24],[.7,-1.23],[2.2,-1.04],[3.3,-.54],[3.72,0],[3.3,.54],[2.2,1.04],[.7,1.23],[-2.7,1.24],[-3.71,1.19]],.08)
 from shapely.geometry import Polygon,box as clipbox
 sole=np.array(Polygon(p).intersection(clipbox(-10,-4,2.73,4)).exterior.coords)[:-1]
 b.slab('Cockpit sole',sole,.30,.38,'deck',deck)
 # gunwale top follows sheer, with inner continuous coaming
 a=np.array(sec)
 for side in [-1,1]:
  xs=np.linspace(-3.7,3.73,110);ww=PchipInterpolator(a[:,0],a[:,1])(xs);yy=PchipInterpolator(a[:,0],a[:,2])(xs)
  b.tube('Soft rub rail',np.c_[xs,yy,side*ww],.052,'black',hull,12)
  b.tube('Rounded gunwale rim',np.c_[xs,yy+.016,side*(ww-.052)],.041,'white',deck,12)
  b.tube('Inner coaming return',np.c_[xs,yy-.11,side*(ww-.11)],.062,'white',deck)
 bow=rounded([[.7,-1.11],[2.1,-.94],[2.95,-.40],[3.34,0],[2.95,.40],[2.1,.94],[.7,1.11]],.07)
 b.slab('Raised forward casting deck',bow,.4,.83,'white',deck);b.slab('Casting nonslip insert',bow*.98,.835,.841,'deck',deck)
 stern=rounded([[-3.65,-1.10],[-2.52,-1.10],[-2.52,1.10],[-3.65,1.10]],.08);b.add('Aft casting deck with actual livewell opening',slab(stern,.37,.69,[[[-3.38,.41],[-2.73,.41],[-2.73,1.00],[-3.38,1.00]]]),'white',deck);b.box('Livewell bowl floor',[-3.055,.45,.705],[.59,.04,.52],'sea',deck,.02)
 for x,z,L,W,y in [(1.63,0,1.45,.68,.85),(1.33,-.81,1.20,.27,.85),(1.33,.81,1.20,.27,.85),(2.73,0,.65,.51,.86),(-3.05,-.71,.66,.61,.71),(-2.12,0,.42,.60,.40)]:
  b.box('Hatch drainage gutter',(x,y-.006,z),(L+.045,.021,W+.045),'black',deck,.035);b.box('Flush storage lid',(x,y+.01,z),(L,.024,W),'deck',deck,.027);b.ring('Flush pull latch',(x+L*.31,y+.026,z),.035,.007,'chrome',hw)
  for dz in [-W*.30,W*.30]:b.box('Hatch hinge',(x-L*.47,y+.026,z+dz),(.074,.017,.055),'chrome',hw,.008)
 hatch=b.group('MOV_Livewell',deck,[-2.72,.708,.70]);b.box('Livewell lid',[-.34,0,0],[.63,.037,.59],'white',hatch,.04);b.box('Livewell clear window',[-.34,.023,0],[.46,.011,.40],'glass',hatch,.04)
 b.m.track(hatch,'rotation',lambda t:quat([0,0,1],-1.23*(1-smooth(.08,.18,t))))
 # Curved console and separate display fascia, rebuilt rather than recolored.
 console(b,inside,seats)
 b.ring('Helm wheel',(-1.05,1.13,.18),.165,.019,'chrome',inside,'x');b.cyl('Wheel hub',(-1.05,1.13,.18),.035,.08,'chrome',inside,'x')
 for a in np.linspace(0,TAU,4,endpoint=False):b.tube('Wheel spoke',[[-1.05,1.13,.18],[-1.05,1.13+.14*math.cos(a),.18+.14*math.sin(a)]],.011,'chrome',inside)
 b.box('Throttle base',(-.85,1.10,-.37),(.17,.075,.12),'black',inside,.02);b.tube('Throttle handle',[[-.82,1.15,-.37],[-.75,1.29,-.37]],.028,'chrome',inside)
 b.box('Windscreen',(.16,1.63,0),(.035,.47,.76),'glass',inside,.05)
 b.tube('Console grabrail',[[.10,1.40,-.47],[.14,1.91,-.44],[.14,1.96,.44],[.10,1.40,.47]],.023,'chrome',inside)
 # T top rigid fixed four legs including visible curved roof profile
 for x in [-.99,.42]:
  for side in [-1,1]:
   z=side*.56;b.tube('Fixed T top support',[[x,.40,z],[x,1.62,z],[x+.12,2.35,z*.96],[x+.25,2.66,z*.98]],.039,'darkdeck',top,14)
   b.box('Top mounting plate',(x,.41,z),(.16,.036,.12),'chrome',top,.017)
   b.tube('Top grab loop',[[x,.98,z],[x-.13,1.08,z],[x-.13,1.59,z],[x,1.67,z]],.022,'chrome',top)
 roof(b,top)
 b.box('Overhead electronics box',(-.36,2.45,0),(.66,.29,.56),'white',top,.05);b.box('Overhead door',(-.7,2.45,0),(.023,.20,.45),'glass',top,.025)
 for x in [-.99,.65]:
  for z in [-.55,.55]:b.cyl('Roof downlight',(x,2.621,z),.044,.019,'amber',top)
 for z in [-.73,-.36,0,.36,.73]:b.tube('Roof rod holder',[[-1.29,2.70,z],[-1.42,2.85,z]],.042,'chrome',top)
 # short antenna folds into roof, never vanishes
 an=b.group('MOV_Bay_antenna',top,[.35,2.82,.5]);b.tube('VHF antenna',[[0,0,0],[0,.46,0]],.012,'white',an);b.m.track(an,'rotation',lambda t:quat([0,0,1],-math.pi/2*smooth(.04,.18,t)))
 for z in [-.40,.4]:b.tube('Leaning post frame',[[-1.76,.37,z],[-1.76,.92,z],[-1.28,.92,z],[-1.28,.37,z]],.030,'chrome',seats)
 helm_seats(b,seats,inside)
 b.box('Tackle console',(-1.52,.64,0),(.54,.38,.76),'white',inside,.04)
 for k in range(3):b.box('Tackle drawer front',(-1.805,.55+.105*k,0),(.022,.082,.64),'deck',inside,.01);b.box('Tackle drawer pull',(-1.83,.55+.105*k,0),(.028,.016,.12),'chrome',inside,.004)
 b.box('Cooler box',(-2.32,.52,0),(.46,.30,.76),'white',seats,.045)
 # single outboard / real pivot and prop silhouette
 b.box('Outboard jackplate',(-3.88,.33,0),(.27,.62,.40),'chrome',hw,.035)
 eng=b.group('MOV_Outboard_trim',0,[-3.95,.47,0]);steer=b.group('MOV_Outboard_steer',eng)
 cowling(b,steer)
 b.box('Outboard mid leg',(-.22,-.41,0),(.25,.65,.22),'silver',steer,.06);b.ell('Gearcase',(-.26,-.78,0),(.28,.11,.115),'silver',steer)
 b.slab('Anti ventilation plate',[[-.59,-.22],[.07,-.22],[.13,.22],[-.59,.22]],-.57,-.54,'silver',steer)
 b.box('Skeg',(-.30,-.97,0),(.19,.31,.06),'silver',steer,.025)
 prop=b.group('MOV_Bay_prop',steer,[-.48,-.78,0]);b.cyl('Prop hub',(0,0,0),.065,.15,'chrome',prop,'x')
 for a in np.linspace(0,TAU,3,endpoint=False):q=ellipse([0,.12,0],[.025,.16,.055]);q.apply_transform(trimesh.transformations.rotation_matrix(a,[1,0,0]));b.add('Propeller blade',q,'chrome',prop,True)
 b.m.track(eng,'rotation',lambda t:quat([0,0,1],-.42*smooth(.06,.20,t)))
 b.m.track(steer,'rotation',lambda t:quat([0,1,0],.25*math.sin(t*TAU)*(1-smooth(.08,.18,t))))
 # trolling motor pivots from vertical outboard of bow to lengthwise deck stow
 tr=b.group('MOV_Trolling_motor',deck,[2.47,.98,-.88]);b.box('Trolling mount',[0,0,0],[.71,.075,.14],'black',tr,.035)
 stick=b.group('MOV_Trolling_shaft',tr);b.tube('Trolling shaft',[[0,-1.19,0],[0,.34,0]],.025,'chrome',stick);b.ell('Trolling motor foot',[-.13,-1.14,0],[.24,.095,.105],'black',stick);b.box('Trolling control head',[0,.35,0],[.23,.095,.14],'black',stick,.035);b.m.track(stick,'rotation',lambda t:quat([0,0,1],-math.pi/2*smooth(.04,.16,t)))
 a=np.array(sec)
 for side in [-1,1]:
  for x in [-3.14,-.4,2.62]:
   y=float(PchipInterpolator(a[:,0],a[:,2])(x));z=side*float(PchipInterpolator(a[:,0],a[:,1])(x))*.94
   b.tube('Folding cleat',[[x-.09,y+.02,z],[x+.09,y+.02,z]],.021,'chrome',hw);b.cyl('Flush rod socket',(x-.2,y,z),.047,.045,'chrome',hw)
  b.box('Transom trim tab',(-3.87,-.16,side*.84),(.32,.025,.45),'chrome',hw,.012)
 # rods rotate rigidly into horizontal side racks
 for j in range(4):
  side=1 if j<2 else -1;rr=b.group('MOV_Rod_'+str(j),hw,[-1.78+j%2*.32,.76,side*1.05]);b.tube('Rod blank',[[0,0,0],[0,1.79,.02],[0,2.06,.06]],.008,'black',rr,8);b.tube('Rod grip',[[0,0,0],[0,.30,0]],.025,'darkdeck',rr);b.ell('Spinning reel',[.04,.22,.04],[.055,.069,.05],'chrome',rr)
  for yy in [.7,1.0,1.3,1.6,1.86]:b.ring('Rod line guide',[.015,yy,.03],.018,.004,'chrome',rr,'z')
  b.m.track(rr,'rotation',lambda t:quat([0,0,1],-math.pi/2*smooth(.015,.12,t)))
 # boarding ladder permanently arranged outside the engine sweep
 for z in [.97,1.21]:b.tube('Transom ladder rail',[[-3.83,.39,z],[-3.99,.18,z],[-3.99,-.47,z]],.022,'chrome',hw)
 for y in [.11,-.12,-.35]:b.tube('Ladder tread',[[-3.99,y,.97],[-3.99,y,1.21]],.030,'black',hw)
 b.text('ATLAS BAY 25',[-2.8,.17,1.28],.19,'white',hull)

 bay_detail(b)
 b.save('ATLAS_Bay_25.glb',60);return b


def submarine():
 b=Builder('ATLAS-N | independent submarine visual study');hull=b.group('EX_Hull');port=b.group('EX_Hull_port',hull);star=b.group('EX_Hull_starboard',hull);deck=b.group('EX_WorkingDeck');sail=b.group('EX_Sail');hw=b.group('EX_Fittings');run=b.group('EX_RunningGear');ints=b.group('INT_GenericArrangement')
 xs=np.array([-39,-37,-34,-29,-24,-17,0,17,25,31,36,39,40]);rs=np.array([.16,.63,1.47,2.89,4.05,4.47,4.5,4.5,4.24,3.70,2.63,1.18,.02]);xx=np.linspace(-39,40,192);rr=PchipInterpolator(xs,rs)(xx)
 for side,g in [(1,star),(-1,port)]:
  vs=[];fs=[];n=48
  for x,r in zip(xx,rr):
   for a in np.linspace(0,math.pi,n+1):vs.append([x,-.25+r*math.cos(a),side*r*math.sin(a)])
  for j in range(len(xx)-1):
   for i in range(n):a=j*(n+1)+i;c=a+n+1;fs.extend([[a,c,a+1],[a+1,c,c+1]])
  m=trimesh.Trimesh(vs,fs,process=False);m.fix_normals();
  if np.mean(m.face_normals[:,2])*side<0:m.invert()
  b.add('Continuous submarine shell',m,'sub',g,True)
 # seam rings and access hatches restrained in scale
 for x in [-28,-18,-7,6,18,27]:
  rad=float(PchipInterpolator(xs,rs)(x))+.012;b.ring('Circumferential panel joint',(x,-.25,0),rad,.013,'black',hw,'x')
 p=footprint(-25,27,1.0);b.slab('Nonslip casing walkway',p,4.06,4.16,'darkdeck',deck)
 for x in [-22,-14,17,23]:
  b.box('Deck access surround',(x,4.20,0),(1.20,.06,.92),'black',deck,.14);b.box('Deck access cover',(x,4.24,0),(1.13,.045,.86),'sub',deck,.13);b.ring('Hatch access handwheel',(x,4.277,.10),.19,.022,'chrome',deck)
 # sail streamlined closed loft elliptic footprint sweeps aft, no cylinder roof
 plan=rounded([[-3.5,-.88],[-2.3,-1.26],[7,-1.04],[9.1,-.5],[9.4,0],[9.1,.5],[7,1.04],[-2.3,1.26],[-3.5,.88]],.11)
 b.add('Continuous faired sail',loft([(3.84,2.45,13.0,2.48,4),(4.05,2.4,12.8,2.45,4),(4.6,2.28,12.2,2.25,4),(8.9,1.90,11.45,1.82,4),(9.52,1.84,11.0,1.65,4),(9.66,1.80,10.6,1.50,4)]),'sub',sail,True)
 # sail access ladder, bridge recess, masts
 for x in [0.3,1.9,3.1,4.8]:
  mast=b.group('MOV_Mast_'+str(x),sail,[x,8.83,0]);b.cyl('Retracting sensor mast',(0,1.35,0),.085,2.65,'black',mast);b.box('Sensor housing',(0,2.65,0),(.27,.36,.29),'sub',mast,.07);b.m.track(mast,'translation',lambda t,x=x:[x,8.83-2.68*smooth(.12,.38,t),0])
 b.box('Surface bridge recess',(5.9,9.69,0),(1.6,.04,.96),'black',sail,.22)
 for yy in np.arange(4.5,9.1,.33):b.tube('Sail access rung',[[-2.63,yy,-.20],[-2.63,yy,.20]],.028,'chrome',hw)
 for x in [-24,-23,-22,-21,19,20,21,22]:
  for side in [-1,1]:b.box('Casing drainage detail',(x,3.95,side*1.59),(.41,.055,.035),'black',hw,0)
 # visible bow planes and fixed tail cruciform as generic prop geometry
 for side in [-1,1]:
  g=b.group('MOV_BowPlane_'+str(side),run,[21,.1,side*3.8]);m=foil_mesh(4.3,2.6,.16);m.vertices[:,2]*=side;b.add('Bow hydroplane',m,'sub',g,True);b.m.track(g,'rotation',lambda t,side=side:quat([1,0,0],side*(math.pi/2)*(1-smooth(.22,.42,t))))
  q=foil_mesh(4.3,2.8,.22);q.vertices[:,2]*=side;q.apply_translation([-33,-.25,side*1.2]);b.add('Fixed stern stabilizer',q,'sub',run,True)
 for side in [-1,1]:
  q=foil_mesh(4.3,3.1,.19);q.apply_transform(trimesh.transformations.rotation_matrix(side*math.pi/2,[1,0,0]));q.apply_translation([-33,-.25,0]);b.add('Vertical stern control surface',q,'sub',run,True)
 prop=b.group('MOV_Propulsor',run,[-38.95,-.25,0]);b.cyl('Propulsor hub',(0,0,0),.26,.70,'black',prop,'x')
 for a in np.linspace(0,TAU,7,endpoint=False):
  v=[[0,.22,0],[.07,.70,-.31],[.21,1.67,-.33],[.27,1.94,-.07],[.09,1.56,.26],[-.02,.60,.21]];p=trimesh.Trimesh(v,[[0,1,5],[1,4,5],[1,2,4],[2,3,4]],process=False);p.apply_transform(trimesh.transformations.rotation_matrix(a,[1,0,0]));b.add('Generic swept propulsor blade',p,'chrome',prop,False)
 b.m.track(prop,'rotation',lambda t:quat([1,0,0],t*TAU*2))
 b.m.track(0,'translation',lambda t:[0,-2.0-18*smooth(.43,.84,t),0])
 # interior generic two decks, no weapon innards
 for y in [-1.95,.40]:
  b.box('Interior fixed floor',(0,y-.07,0),(49,.14,5.6),'floor',ints,0)
 room(b,'Navigation and operations',12,25,-2.7,2.7,.40,ints,'ops');room(b,'Mess and rest',3,12,-2.7,2.7,.40,ints,'mess')
 for x in [-19,-13,-7]:room(b,'Crew cabin',x,x+5.6,-2.7,2.7,.40,ints,'cabin')
 room(b,'Generic machinery reservations',-20,-4,-2.7,2.7,-1.95,ints,'equipment');room(b,'Stores and services',-3,11,-2.7,2.7,-1.95,ints,'equipment');room(b,'Medical and crew rest',12,24,-2.7,2.7,-1.95,ints,'cabin')
 b.text('ATLAS-N',[27,1.34,3.93],.59,'silver',hw);b.text('N01',[-2.4,6.9,1.11],.67,'silver',sail)
 naval_detail(b,'n')
 b.save('ATLAS_N.glb',60);return b


def helicopter(b,parent,loc=(0,0,0),scale=1):
 g=b.group('MOV_Helicopter',parent,loc)
 # Original unarmed helicopter representation; no branded replica
 b.ell('Helicopter fuselage',(0,1.53,0),(2.85,1.04,1.05),'darkdeck',g);b.ell('Cockpit windshield',(1.82,1.72,0),(1.15,.76,1.06),'glass',g)
 for side in [-1,1]:
  b.box('Cabin sliding door',(-.53,1.56,side*1.025),(1.65,1.45,.045),'naval',g,.18);b.box('Cabin side window',(-.51,1.93,side*1.056),(1.18,.54,.025),'glass',g,.09);b.tube('Landing skid',[[2.1,.14,side*1.14],[1.7,.0,side*1.25],[-2.1,.0,side*1.25]],.061,'chrome',g)
  for x in [-1.1,1.1]:b.tube('Skid strut',[[x,.48,side*.77],[x,.12,side*1.23]],.055,'chrome',g)
 b.tube('Tail boom',[[-1.75,1.9,0],[-5.8,2.12,0],[-7.0,2.46,0]],.32,'naval',g,16)
 b.box('Tail vertical fin',(-6.53,3.12,0),(1.35,1.53,.12),'naval',g,.16);b.box('Tail stabilizer',(-5.74,2.13,0),(.7,.10,2.36),'naval',g,.13)
 b.cyl('Rotor mast',(0,2.93,0),.10,.9,'chrome',g);rot=b.group('MOV_Rotor',g,[0,3.40,0])
 for k in range(4):
  q=boxmesh((2.6,0,0),(4.90,.06,.24),.02);q.apply_transform(trimesh.transformations.rotation_matrix(k*math.pi/2,[0,1,0]));b.add('Main rotor blade',q,'black',rot)
 b.cyl('Rotor hub',(0,0,0),.22,.16,'chrome',rot)
 return g

def warship():
 b=Builder('ATLAS-W | surface ship visual study');h=b.group('EX_Hull');port=b.group('EX_Hull_port',h);star=b.group('EX_Hull_starboard',h);main=b.group('EX_Deck');superg=b.group('EX_Superstructure');hw=b.group('EX_Hardware');flight=b.group('EX_Aviation');run=b.group('EX_RunningGear');inter=b.group('INT_GenericArrangement')
 sec=[(-62.5,7.05,6.0,-1.8,-4.10),(-55,8.45,6,-2.1,-4.45),(-40,8.92,6.1,-2.4,-4.80),(-15,9,6.26,-2.5,-4.85),(12,8.95,6.5,-2.1,-4.70),(32,8.1,7.05,-1.3,-4.15),(47,5.55,8.0,.3,-2.7),(57,2.47,8.85,2.0,-.8),(62.5,.07,9.35,6.0,3.0)]
 for side,g in [(-1,port),(1,star)]:b.add('Continuous surface ship hull',hull_surface(sec,160,side,38),'naval',g,True)
 a=np.array(sec);xs=np.linspace(-62.5,62.5,150);w=PchipInterpolator(a[:,0],a[:,1])(xs);ys=PchipInterpolator(a[:,0],a[:,2])(xs);v=[];f=[]
 for x,ww,yy in zip(xs,w,ys):v.extend([[x,yy,-ww],[x,yy+.06,0],[x,yy,ww]])
 for j in range(len(xs)-1):
  for k in [0,1]:q=j*3+k;r=q+3;f.extend([[q,r,q+1],[q+1,r,r+1]])
 mesh=trimesh.Trimesh(v,f,process=False);mesh.fix_normals();
 if mesh.face_normals[:,1].mean()<0:mesh.invert()
 b.add('Cambered weather deck',mesh,'darkdeck',main,True);b.box('Transom face',(-62.47,.95,0),(.09,10.1,14.08),'naval',h,.10)
 # fixed tower uses raked side profiles and roof decks
 fair_shape(b,'Main operations house',footprint(-29,32,6.6),6.3,11.3,superg,'naval',.91,-1.0)
 fair_shape(b,'Forward bridge',footprint(7,29,6.0),11.31,15.3,superg,'naval',.9,-1.2)
 # genuinely located segmented bridge windows on swept upper face
 for side in [-1,1]:
  for x in np.arange(10,24.0,1.85):
   b.box('Bridge window frame',(x,14.13,side*5.63),(1.52,1.05,.10),'black',hw,.08);b.box('Bridge glass',(x,14.13,side*5.69),(1.34,.88,.035),'glass',hw,.055);b.tube('Window wiper',[[x-.42,13.77,side*5.72],[x+.32,14.39,side*5.72]],.016,'chrome',hw)
  b.box('Bridge wing',(17.7,11.30,side*6.8),(9.4,.22,2.25),'naval',superg,.16)
  rail_run(b,[[13,11.47,side*7.86],[22.3,11.47,side*7.86]],hw,height=1.03)
 # aft hangar is hollow under its own box shell rather than solid through helicopter
 hang=b.group('EX_Hangar');b.box('Hangar port wall',(-35.7,9.10,-5.88),(17.8,5.8,.22),'naval',hang,.08);b.box('Hangar stbd wall',(-35.7,9.10,5.88),(17.8,5.8,.22),'naval',hang,.08);b.box('Hangar forward bulkhead',(-26.7,9.1,0),(.25,5.8,11.65),'naval',hang,.06);b.box('Hangar roof',(-35.7,12.09,0),(18.1,.24,11.9),'darkdeck',hang,.12)
 # door slats go up then forward under roof with rigid 90-degree path
 for k in range(10):
  gy=6.31+k*.55+.26;dr=b.group('MOV_HangarSlat_'+str(k),hang,[-44.79,gy,0]);b.box('Hangar rolling leaf',[0,0,0],[.15,.53,11.4],'naval',dr,.03)
  def path(t,k=k,gy=gy):
   dist=8*smooth(.02,.42,t);y=gy+dist;top=11.94
   return [-44.79+max(0,y-top),min(y,top),0]
  b.m.track(dr,'translation',path);b.m.track(dr,'rotation',lambda t,gy=gy:quat([0,0,1],-math.pi/2*smooth(11.6,12.3,gy+8*smooth(.02,.42,t))))
 for side in [-1,1]:b.tube('Hangar guide rail',[[-44.8,6.3,side*5.79],[-44.8,11.9,side*5.79],[-37,11.9,side*5.79]],.05,'chrome',hw)
 # aft flight deck geometry markings consistent no bow aircraft
 b.box('Flight deck nonslip zone',(-53.55,6.115,0),(16.9,.024,13.95),'darkdeck',flight,.14)
 b.ring('Aft helicopter landing circle',[-53.45,6.15,0],5.08,.055,'white',flight)
 for z in [-1.05,1.05]:b.box('H marking stem',[-53.45,6.17,z],[2.65,.013,.13],'white',flight,0)
 b.box('H marking cross',[-53.45,6.17,0],[.14,.013,2.2],'white',flight,0)
 for x in np.arange(-60,-44.8,2.5):
  for z in [-6,-3,0,3,6]:b.ring('Recessed flight deck tie down',(x,6.153,z),.075,.012,'chrome',flight)
 for z in [-6.9,6.9]:b.tube('Flight deck edge stripe',[[-61,6.15,z],[-45.5,6.15,z]],.045,'white',flight)
 heli=helicopter(b,flight,[-53.2,6.21,0]);b.m.track(heli,'translation',lambda t:[-53.2+17*smooth(.46,.86,t),6.21,0])
 # mast and aft funnel, exterior sensor props no internal functions
 mastpoly=rounded([[-.9,-2.6],[4.3,-2.6],[5.5,-1.6],[5.5,1.6],[4.3,2.6],[-.9,2.6]],.08)
 fair_shape(b,'Integrated mast plinth',mastpoly,11.5,22.5,superg,'naval',.55,-.4)
 for side in [-1,1]:
  b.box('Fixed generic sensor face',(1.6,20.0,side*1.58),(2.8,2.55,.07),'darkdeck',hw,.04)
 b.cyl('Communications spar',(1.2,25.1,0),.11,5.2,'darkdeck',hw)
 for y,L in [(23.2,5.8),(25.3,3.8)]:b.box('Mast crossarm',(1.2,y,0),(.24,.22,L),'naval',hw,.035)
 for x,z in [(1.2,-2.5),(1.2,2.5),(2.1,0)]:b.cyl('Antenna whip',(x,25.1,z),.024,3.7,'black',hw,sections=10)
 for x,z in [(-15,-3.3),(-15,3.3),(23.4,-3.8),(23.4,3.8)]:b.ell('Communications dome',(x,13.0 if x<0 else 16.2,z),(.87,.98,.87),'white',hw)
 fair_shape(b,'Exhaust housing',footprint(-17,-7,3.6),11.3,16.2,superg,'naval',.88,-.8)
 for z in [-1.9,1.9]:b.box('Exhaust recess',(-12.6,16.28,z),(4.5,.12,1.42),'black',hw,.22)
 # forward static non-operational deck mount, exterior only
 turret=b.group('EX_StaticDeckMount');b.cyl('Fixed mount plinth',(39.3,7.55,0),2.15,.55,'naval',turret)
 fair_shape(b,'Inert mount cover',footprint(36.6,42.5,1.85),7.75,10.40,turret,'naval',.68,-.5)
 b.tube('Inert barrel exterior',[[41.2,9.4,0],[47.4,9.9,0]],.14,'naval',turret,20);b.cyl('Blanked muzzle',(47.4,9.9,0),.142,.06,'black',turret,'x')
 # mooring and rails detailed
 for side in [-1,1]:
  rr=[]
  for x in np.linspace(-44,60.5,90):rr.append([x,float(PchipInterpolator(a[:,0],a[:,2])(x))+.10,side*(float(PchipInterpolator(a[:,0],a[:,1])(x))-.16)])
  b.tube('Deck edge handrail',np.array(rr)+[0,.99,0],.027,'naval',hw);b.tube('Deck edge middle rail',np.array(rr)+[0,.50,0],.018,'naval',hw)
  # independently spaced posts rather than one at each interpolation sample
  for x in np.arange(-43,60,2.8):
   yy=float(PchipInterpolator(a[:,0],a[:,2])(x));zz=side*(float(PchipInterpolator(a[:,0],a[:,1])(x))-.17);b.tube('Deck edge post',[[x,yy,zz],[x,yy+1.08,zz]],.026,'naval',hw)
  for x in [-58,-48,31,51,56]:
   yy=float(PchipInterpolator(a[:,0],a[:,2])(x));zz=side*(float(PchipInterpolator(a[:,0],a[:,1])(x))-1.0)
   for dx in [-.24,.24]:b.cyl('Mooring bollard',(x+dx,yy+.30,zz),.14,.60,'naval',hw)
   b.box('Bollard foundation',(x,yy+.06,zz),(1.05,.12,.68),'darkdeck',hw,.08)
  for x in [-22,-17,-3,3,28]:
   for y in [8.1,9.3]:b.box('Weather service cabinet',(x,y,side*6.36),(.9,.70,.18),'silver',hw,.025)
 for x in [-20,-14]:
  for side in [-1,1]:
   for k in range(12):b.box('Vent louvre',(x,13.0+k*.12,side*3.22),(3.2,.045,.05),'black',hw,0)
 # lifesaving rafts, RHIB dedicated side rig
 for x in [-22,-17,-11]:
  for side in [-1,1]:b.cyl('Liferaft canister',(x,11.75,side*6.08),.36,1.30,'white',hw,'x')
 rh=b.group('MOV_Workboat',0,[-7.2,7.0,7.1])
 ph=footprint(-3.8,3.8,1.2);b.slab('RHIB sole',ph,.05,.19,'darkdeck',rh)
 for side in [-1,1]:b.tube('RHIB collar',[[-3.5,.35,side*1.03],[-1,.43,side*1.13],[1.8,.5,side*.95],[3.2,.6,side*.4],[3.65,.65,0]],.26,'black',rh,14)
 b.box('RHIB console',(.5,.66,0),(.96,.99,.76),'naval',rh,.15);b.box('RHIB helm seat',(-.65,.61,0),(.68,.76,.70),'fabric',rh,.1)
 b.m.track(rh,'translation',lambda t:[-7.2,7.0-6.8*smooth(.53,.86,t),7.1+7*smooth(.36,.56,t)])
 # handling davit arms, non-load-rated visuals
 for x in [-9.6,-4.8]:
  b.cyl('Davit pedestal',(x,7.65,6.34),.28,2.4,'naval',hw)
  boom=b.group('MOV_Davit_'+str(x),hw,[x,8.9,6.34]);b.tube('Davit boom',[[0,0,0],[0,1.1,1.3],[0,.9,3.5]],.16,'naval',boom);b.m.track(boom,'rotation',lambda t:quat([1,0,0],-.35*smooth(.36,.56,t)))
 # rudders and props beneath stern
 for side in [-1,1]:
  b.tube('Shaft line',[[-41,-2.8,side*4.1],[-57,-3.0,side*4.1]],.19,'chrome',run)
  pr=b.group('MOV_Screw_'+str(side),run,[-57,-3,side*4.1]);b.cyl('Screw hub',(0,0,0),.40,.85,'chrome',pr,'x')
  for ang in np.linspace(0,TAU,5,endpoint=False):
   q=ellipse([0,.99,0],[.15,1.08,.36]);q.apply_transform(trimesh.transformations.rotation_matrix(ang,[1,0,0]));b.add('Screw blade',q,'chrome',pr,True)
  b.box('Rudder',(-60,-2.9,side*4.1),(1.92,3.10,.24),'naval',run,.14);b.m.track(pr,'rotation',lambda t:quat([1,0,0],TAU*2*t))
 # actual surface-ship internal floor levels, not submarine capsule
 for floor in [0.1,2.65]:
  for x0,x1,kind in [(-43,-26,'equipment'),(-24,-7,'cabin'),(-5,10,'mess'),(12,26,'ops'),(28,39,'cabin')]:room(b,'Ship compartment',x0,x1,-5.6,5.6,floor,inter,kind)
 for x0,x1,kind in [(-24,-7,'cabin'),(-5,10,'mess'),(12,26,'ops')]:room(b,'Deckhouse compartment',x0,x1,-5.3,5.3,6.5,inter,kind)
 b.text('W01',[46,4.45,5.74],1.35,'white',hw);b.text('ATLAS-W',[-54.5,2.95,8.7],.55,'white',hw)
 naval_detail(b,'w')
 b.save('ATLAS_W.glb',60);return b

if __name__=='__main__':
 report={}
 for ident,fn in [('bay',bay_boat),('n',submarine),('w',warship)]:
  print('BUILD',ident,flush=True);obj=fn();report[ident]={'component_count':len(obj.inventory),'groups':list(obj.groups)};print('DONE',ident,len(obj.inventory),flush=True)
 (OUT/'new_assets.json').write_text(json.dumps(report,indent=2))
