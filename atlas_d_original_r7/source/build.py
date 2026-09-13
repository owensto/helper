"""ATLAS D / Reference-led articulated concept R7. Not pressure-qualified.
Matches the visual board, NOT its unverified depth/endurance specifications.
Nested outer shells and tender bays are speculative packing arrangements.
"""
from pathlib import Path
import os,json,math,copy
import numpy as np
import trimesh
from shapely.geometry import Polygon,box as pbox
from shapely.ops import triangulate
from meshkit import *
ROOT=Path(os.getenv('ATLAS_ROOT',str(Path(__file__).resolve().parent.parent)));SRC=Path(os.environ['ATLAS_SOURCE']);OUT=ROOT/'site';OUT.mkdir(exist_ok=True,parents=True)
M=Model();G=M.g;old,read=readglb(SRC);G['materials']=copy.deepcopy(old['materials'])
for ma in G['materials']:
 p=ma['pbrMetallicRoughness'];name=ma['name']
 if name in ('white','pearl'):p.update(baseColorFactor=[.78,.79,.765,1],metallicFactor=.10,roughnessFactor=.28)
 if name in ('glass','archglass'):p.update(baseColorFactor=[.009,.022,.031,1],metallicFactor=.30,roughnessFactor=.18);ma.pop('alphaMode',None)
 if name=='chrome':p.update(metallicFactor=.88,roughnessFactor=.26)
 if name.startswith('teak'):p['roughnessFactor']=.7
 if name=='railglass':p['baseColorFactor']=[.4,.58,.62,.14]
paint=M.mat('Ceramic pearl',(.82,.825,.795),.12,.27);edge=M.mat('Titanium edge',(.36,.395,.41),.8,.25);glass=M.mat('Smoked architectural glass',(.014,.026,.032),.35,.15);black=M.mat('Shadow gaps',(.012,.021,.026),.05,.5);teak=M.mat('Teak honey',(.40,.25,.13),0,.74);white=M.mat('Landing markings',(.84,.85,.78),0,.72);tarmac=M.mat('Foredeck landing surface',(.075,.098,.105),.05,.77);fabric=M.mat('Warm linen',(.83,.78,.66),0,.88);chrome=M.mat('Stainless steel',(.52,.56,.57),.87,.22);bronze=M.mat('Propeller bronze',(.44,.24,.07),.8,.28);G['materials'][bronze]['doubleSided']=True
light=M.mat('Deck illumination',(.92,.60,.26),0,.4,emit=[.9,.43,.11]);lamp=M.mat('Subsea lamps',(.25,.67,.83),0,.2,emit=[.4,.84,1]);shuttermat=M.mat('Retracting shell panels',(.39,.46,.49),.38,.29);coremat=M.mat('Pressure core - unqualified',(.23,.48,.54),.5,.35,.32);voidmat=M.mat('Reserved stowage volume',(.13,.65,.65),0,.5,.12)
hull=M.node('FIXED_Hull');main=M.node('FIXED_Main_deckhouse');deck=M.node('FIXED_Main_deck');hardware=M.node('FIXED_Hardware');pool=M.node('FIXED_Pool');sys=M.node('SYS_Pressure');bay=M.node('FIXED_Tender_bays');wet=M.node('SYS_Stowage_envelopes')
def box(name,loc,dim,ma=paint,parent=main,r=0):M.add(name,boxmesh(loc,dim,r),ma,parent)
def tube(name,pts,r=.025,ma=chrome,parent=hardware,sides=10):M.add(name,tubes(pts,r,sides),ma,parent,True)
def ell(name,loc,size,ma=paint,parent=hardware):M.add(name,ellipse(loc,size),ma,parent,True)
def ring(name,loc,r,t=.027,ma=chrome,parent=hardware,plane='xz'):
 pts=[]
 for a in np.linspace(0,2*np.pi,65):
  d=[r*np.cos(a),0,r*np.sin(a)] if plane=='xz' else ([0,r*np.cos(a),r*np.sin(a)] if plane=='yz' else [r*np.cos(a),r*np.sin(a),0]);pts.append(np.array(loc)+d)
 tube(name,pts,t,ma,parent,8)
def slabadd(name,p,y0,y1,ma=paint,parent=main,holes=None):M.add(name,slab(p,y0,y1,holes),ma,parent)
# Preserve the fixed source hull. Cut the actual aft garage entrance.
for node in old['nodes']:
 name=node.get('name','');parent=None
 if name.startswith('S_Hull__'):parent=hull
 elif name.startswith('S_Hardware__'):parent=hardware
 elif name.startswith('S_Deck__'):parent=deck
 if parent is None or 'mesh' not in node:continue
 for pr in old['meshes'][node['mesh']]['primitives']:
  v=read(pr['attributes']['POSITION']);f=read(pr['indices']).reshape(-1,3);n=read(pr['attributes']['NORMAL']);c=v[f].mean(1);mask=np.ones(len(f),bool)
  if name.startswith('S_Deck__'):mask&=(c[:,1]<6.5)&~((c[:,0]>26)&(np.abs(c[:,2])<4.6))
  if name.startswith('S_Hardware__'):mask&=(c[:,1]<7.2)&~((c[:,0]<-38)&(np.abs(c[:,2])<4.5))
  if name.startswith('S_Hull__'):mask&=~((c[:,0]<-35.9)&(np.abs(c[:,2])<4.65)&(c[:,1]>.3)&(c[:,1]<4.5))
  M.raw(name,v,f[mask],n,pr.get('material',0),parent)
box('Aft garage crown',(-38.6,4.72,0),(5.7,.36,10.25),paint,bay,.3)
for side in [-1,1]:
 box('Aft garage cheek',(-39.0,2.57,side*4.87),(4.9,3.93,.60),paint,bay,.15);box('Garage side liner',(-34.6,2.30,side*4.37),(12.7,3.90,.14),black,bay)
box('Center garage pier',(-38.5,2.34,0),(5.3,4.0,.43),paint,bay);box('Bay ceiling',(-34.85,4.40,0),(12.8,.15,8.65),black,bay);box('Forward bay bulkhead',(-28.30,2.5,0),(.18,3.95,8.65),black,bay)
for side in [-1,1]:
 box('Garage lamp',(-35,4.29,side*2.35),(8.3,.035,.06),light,bay)
 for z in [side*2.35-.93,side*2.35+.93]:tube('Receiving slide rail',[[-41,.1,z],[-28.35,.1,z]],.09,chrome,bay,12)
 hinge=M.node('MOV_Garage_door_'+str(side),loc=(-41.20,4.40,side*2.37));box('Outer garage shell',(0,-1.92,0),(.20,3.84,4.26),paint,hinge,.12);box('Inner garage liner',(.115,-1.92,0),(.035,3.54,3.94),black,hinge);tube('Garage hinge',[[0,0,-2.0],[0,0,2.0]],.10,chrome,hinge,14)
 M.track(hinge,'rotation',lambda p:quat([0,0,1],-1.5*smooth(.005,.055,p)*(1-smooth(.29,.35,p))))
# Complete tenders remain children of Vessel, including during the underwater phase.
for k,(label,cx,cz,oldyaw,zbay,L,enter,finish) in enumerate([('Chase',-23,17,.15,2.37,11.8,.14,.255),('Utility',-10,17.2,-.06,-2.37,6.9,.195,.29)]):
 gn=M.node('MOV_Tender_'+label,loc=(cx,0,cz));finalx=-34.82 if k==0 else -36.1;R=Rotation.from_euler('y',-oldyaw).as_matrix()
 for node in old['nodes']:
  if not node.get('name','').startswith('S_Fleet__'):continue
  for pr in old['meshes'][node['mesh']]['primitives']:
   v=read(pr['attributes']['POSITION']);f=read(pr['indices']).reshape(-1,3);n=read(pr['attributes']['NORMAL']);c=v[f].mean(1);mask=c[:,0]<-16 if k==0 else c[:,0]>-16;vv=(v-np.array([cx,0,cz]))@R.T;nn=n@R.T;M.raw(label,vv,f[mask],nn,pr.get('material',0),gn)
 def path(p,k=k,cx=cx,cz=cz,zbay=zbay,fx=finalx,a=enter,b=finish):
  t0=.025+k*.025;t1=a-.045;t2=a
  if p<t1:q=smooth(t0,t1,p);return [cx+(-49.4-cx)*q,0,cz]
  if p<t2:q=smooth(t1,t2,p);return [-49.4,0,cz+(zbay-cz)*q]
  q=smooth(a,b,p);return [-49.4+(fx+49.4)*q,1.30*smooth(a,a+.045,p),zbay]
 M.track(gn,'translation',path);M.track(gn,'rotation',lambda p:quat([0,1,0],0));cradle=M.node('MOV_Cradle_'+label)
 box('Recovery carriage',(0,0,0),(L+.42,.16,3.84 if k==0 else 3.05),black,cradle,.1)
 for z in [-1.25,1.25]:tube('Cradle runners',[[-L*.48,-.08,z],[L*.48,-.08,z]],.09,chrome,cradle,12)
 for x in [-L*.38,0,L*.38]:
  box('Cradle crossmember',(x,-.10,0),(.17,.17,3.48),chrome,cradle)
  for z in [-.8,.8]:ell('Support pad',(x,.12,z),(.37,.13,.24),black,cradle)
 M.track(cradle,'translation',lambda p,a=enter,b=finish,fx=finalx,z=zbay:[fx+(-49.4-fx)*smooth(.015,a-.03,p)*(1-smooth(a,b,p)),-1.00+1.3*smooth(a,a+.045,p),z])
 for side in [-1,1]:box('Bay side rubstrip',(-35,1.2,zbay+side*1.95),(10.7,.16,.12),black,bay)
# Annular terraces reserve the next exterior sleeve's travel. They are not shrinking rooms.
levels=[{'name':'Main','base':5.52,'top':8.13,'a':-26.4,'b':25.0,'w':5.90,'ra':-32.0,'rb':26.0,'rw':6.55,'drop':0},{'name':'Upper','base':8.54,'top':10.88,'a':-18.8,'b':18.3,'w':5.20,'ra':-26.1,'rb':19.4,'rw':5.79,'drop':2.35},{'name':'Bridge','base':11.28,'top':13.60,'a':-10.5,'b':11.2,'w':4.08,'ra':-19.25,'rb':12.1,'rw':4.69,'drop':4.67},{'name':'Sky','base':14.00,'top':15.66,'a':-4.9,'b':5.0,'w':2.80,'ra':-11.8,'rb':6.0,'rw':3.53,'drop':6.33}];roots=[]
def teak_ring(poly,y,holes,parent,name):
 shape=Polygon(poly)
 for h in holes:shape=shape.difference(Polygon(h))
 vs=[];fs=[];a,c,b,d=shape.bounds
 for j,z in enumerate(np.arange(c,d,.19)):
  for x in np.arange(a-(j%4)*.56,b,2.4):
   tile=shape.intersection(pbox(x+.012,z+.010,x+2.385,z+.178))
   if tile.is_empty:continue
   for tri in triangulate(tile):
    if not tile.covers(tri.representative_point()):continue
    p=np.array(tri.exterior.coords)[:3];i=len(vs);vs.extend([[xx,y,zz] for xx,zz in p]);fs.append([i,i+1,i+2])
 if fs:M.add(name,trimesh.Trimesh(vs,fs,process=False),teak,parent)
def sofa(name,x,y,z,L,parent):
 box(name+'_base',(x,y+.24,z),(L,.32,.90),teak,parent,.16)
 for j in range(max(2,int(L/.7))):
  n=max(2,int(L/.7));box(name+'_cushion',(x-L/2+(j+.5)*L/n,y+.48,z),(L/n-.04,.24,.84),fabric,parent,.12)
 box(name+'_back',(x,y+.77,z+.39),(L,.60,.17),fabric,parent,.09)
 for xx in [x-L/2+.07,x+L/2-.07]:box(name+'_arm',(xx,y+.56,z),(.16,.54,.92),fabric,parent,.07)
 for xx in [x-L/2+.23,x+L/2-.23]:
  for zz in [z-.30,z+.30]:tube(name+'_leg',[[xx,y+.03,zz],[xx,y+.2,zz]],.035,chrome,parent)
def rail_loop(poly,y,parent,label):
 n=M.node('MOV_Rails_'+label,parent);pts=[[x,y+.96,z] for x,z in poly];pts.append(pts[0]);tube('Rounded top rail',pts,.028,chrome,n,8);lower=[[x,y+.40,z] for x,z in poly];lower.append(lower[0]);tube('Lower safety rail',lower,.018,chrome,n,7)
 for i in range(len(poly)):
  a=poly[i];b=poly[(i+1)%len(poly)];dist=np.linalg.norm(b-a)
  for t in np.linspace(0,1,max(1,math.ceil(dist/1.7)),endpoint=False):
   x,z=a+(b-a)*t;tube('Stanchion',[[x,y,z],[x,y+.96,z]],.024,chrome,n,8)
 M.track(n,'translation',lambda p:[0,-1.05*smooth(.31,.41,p),0]);return n
for i,lv in enumerate(levels):
 name=lv['name'];root=main if i==0 else M.node('MOV_Shell_'+name);roots.append(root);foot=footprint(lv['a'],lv['b'],lv['w']);topfoot=foot.copy();topfoot[:,0]-=.70;topfoot[:,1]*=.94
 M.add(name+'_glazing',wall(foot,lv['base']+.12,lv['top']-.05),glass,root,True);M.add(name+'_sill',wall(foot,lv['base'],lv['base']+.14,shift=-.02,narrow=.997),paint,root,True)
 for yy,poly,rr in [(lv['base']+.13,foot,.034),(lv['top']-.035,topfoot,.041)]:
  pts=[[x,yy,z] for x,z in poly];pts.append(pts[0]);tube('Window belt trim',pts,rr,edge,root,8)
 for side in [-1,1]:
  for xx in np.arange(lv['a']+2.0,lv['b']-6,2.1):tube('Window mullion',[[xx,lv['base']+.15,side*lv['w']],[xx-.65,lv['top']-.03,side*lv['w']*.94]],.039,black,root,8)
  xx=lv['a']+3.6;poly=np.array([[xx-4,lv['base']+.06],[xx-2.2,lv['base']+.06],[xx+4.4,lv['top']-.04],[xx+2.4,lv['top']-.04]]);verts=[[x,y,side*(lv['w']+.017)] for x,y in poly];M.add('Swept structural cheek',trimesh.Trimesh(verts,[[0,1,2],[0,2,3]],process=False),paint,root)
 shutter=M.node('MOV_Shutters_'+name,root);sf=foot.copy();sf[:,1]*=1.008;M.add('Contoured sliding exterior fairing',wall(sf,lv['base']+.12,lv['top']-.075),shuttermat,shutter,True);M.track(shutter,'translation',lambda p,h=lv['top']-lv['base']:[0,-(h+.22)*(1-smooth(.34,.44,p)),0])
 rp=footprint(lv['ra'],lv['rb'],lv['rw']);holes=[]
 if i<3:
  nex=levels[i+1];holes.append(footprint(nex['a']-.14,nex['b']+.14,nex['w']+.12))
 else:holes.append(rectpoly(-4.3,-.7,-1.58,1.58,.18))
 slabadd(name+'_roof_annulus',rp,lv['top'],lv['top']+.26,paint,root,holes);pts=[[x,lv['top']+.10,z] for x,z in rp];pts.append(pts[0]);tube('Deck edge reveal',pts,.028,edge,root,8);teak_ring(rp,lv['top']+.268,holes,root,name+'_teak');rail_loop(rp*.985,lv['top']+.28,root,name)
 fy=lv['top']+.28;fx=lv['ra']+2.0
 if i<3:
  for side in [-1,1]:
   stow=M.node('MOV_Furniture_'+name+str(side),root);sofa('Aft lounge',fx,fy,side*(lv['rw']-.95),2.8,stow);box('Furniture pocket coaming',(fx,fy-.015,side*(lv['rw']-.95)),(3.15,.06,1.18),black,root,.13);M.track(stow,'translation',lambda p:[0,-1.04*smooth(.30,.40,p),0]);hatch=M.node('MOV_Locker_cover_'+name+str(side),root);box('Teak locker lid',(fx,fy+.035,side*(lv['rw']-.95)),(3.10,.075,1.14),teak,hatch,.08);M.track(hatch,'translation',lambda p:[-3.4*(1-smooth(.40,.45,p)),0,0])
 if i>0:
  start=.44+(3-i)*.055;finish=.57+(3-i)*.055;M.track(root,'translation',lambda p,d=lv['drop'],a=start,b=finish:[0,-d*smooth(a,b,p),0])
  for side in [-1,1]:
   for xx in [lv['a']+2,lv['b']-6]:tube('Outer guide sleeve',[[xx,lv['base']+.13,side*(lv['w']-.12)],[xx,lv['top']-.11,side*(lv['w']-.12)]],.13,edge,root,12)
mainoutline=np.array([[-39,-4.8],[-34,-6.25],[-23,-6.72],[17,-6.65],[27,-5.60],[35,-3.70],[40.8,0],[35,3.70],[27,5.60],[17,6.65],[-23,6.72],[-34,6.25],[-39,4.8]]);rail_loop(rounded(mainoutline,.12),5.58,deck,'MainDeck')
# Flush bow helipad, visual only: no aircraft load or rotor-clearance qualification.
M.add('Foredeck helipad surface',ellipse((30.0,6.225,0),(4.6,.055,4.5)),tarmac,deck,True);ring('Helipad outer ring',(30,6.292,0),3.76,.058,white,deck)
for x in [29.18,30.82]:box('Helipad H',(x,6.295,0),(.23,.014,2.65),white,deck)
box('Helipad H crossbar',(30,6.296,0),(1.7,.015,.24),white,deck)
for a in np.linspace(0,2*np.pi,12,endpoint=False):
 x=30+4.22*np.cos(a);z=4.22*np.sin(a);ell('Perimeter landing light',(x,6.285,z),(.060,.028,.060),light,deck)
aftf=M.node('MOV_Aft_sunpads')
for side in [-1,1]:
 for xx in [-32.8,-29.8]:box('Sunpad timber base',(xx,5.77,side*4.25),(2.1,.22,.8),teak,aftf,.12);box('Sunpad cushion',(xx,5.98,side*4.25),(2.03,.20,.73),fabric,aftf,.11)
M.track(aftf,'translation',lambda p:[0,-.8*smooth(.31,.4,p),0])
for k in range(4):
 cover=M.node('MOV_Pool_cover_'+str(k));box('Pool cover leaf',(0,0,0),(1.94,.15,5.38),shuttermat,cover,.08)
 for z in [-2.57,2.57]:tube('Cover edge',[[-.93,.09,z],[.93,.09,z]],.025,edge,cover,8)
 M.track(cover,'translation',lambda p,k=k:[-25.7-(1.90+1.75*k)*smooth(.355+.018*k,.49+.018*k,p),5.80+.038*k,0])
box('Pool cover cassette',(-25.55,5.88,0),(2.24,.52,5.68),black,deck,.10)
# Rigid compact mast withdraws into a reserved non-pressure well.
mast=M.node('MOV_Sensor_mast',loc=(-2.50,15.98,0));verts=[[-1.0,0,-.40],[.8,0,-.40],[-.4,4.2,-.20],[-1.05,4.1,-.20],[-1,0,.40],[.8,0,.40],[-.4,4.2,.20],[-1.05,4.1,.20]];faces=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[3,2,6],[3,6,7],[0,3,7],[0,7,4]];M.add('Swept radar mast',trimesh.Trimesh(verts,faces),black,mast)
for y,w in [(1.25,2.75),(2.55,2.1),(3.7,2.55)]:box('Radar array',(-.40,y,0),(.43,.13,w),paint,mast,.05)
for side in [-1,1]:ell('Satcom dome',(.1,.7,side*.96),(.52,.62,.52),paint,mast);tube('Antenna',[[-.2,.1,side*.85],[-.2,3.72,side*.85]],.022,black,mast,8)
M.track(mast,'translation',lambda p:[-2.5,15.98-11.12*smooth(.305,.42,p),0]);box('Mast trunk liner',(-2.5,5.4,0),(3.44,.22,3.20),black,hardware,.18)
for k in [-1,1]:
 lid=M.node('MOV_Mast_lid_'+str(k),loc=(-2.5,9.42,0));box('Mast pocket cover',(0,0,k*.78),(3.55,.12,1.55),paint,lid,.08);M.track(lid,'translation',lambda p,k=k:[-2.5,9.42,k*1.66*(1-smooth(.69,.745,p))])
for side in [-1,1]:
 root=M.node('MOV_Terrace_'+str(side),loc=(-33,1.04,side*5.45));box('Beach terrace',(0,0,side*1.25),(8,.22,2.48),paint,root,.22);box('Beach terrace teak',(0,.123,side*1.25),(7.8,.025,2.32),teak,root,.15)
 for x in [-3.4,3.4]:tube('Terrace hinge',[[x,0,-.08],[x+.45,0,-.08]],.095,chrome,root,12)
 M.track(root,'rotation',lambda p,side=side:quat([1,0,0],-side*np.pi/2*smooth(.345,.485,p)))
# Separate fixed reference capsule. No shell strength is claimed.
xs=np.r_[np.linspace(-27.6,-24,25),np.linspace(-24,24,90)[1:],np.linspace(24,27.6,25)[1:]];vs=[];fs=[];nr=64
for x in xs:
 radius=math.sqrt(max(1e-6,3.6**2-max(abs(x)-24,0)**2))
 for a in np.linspace(0,2*np.pi,nr,endpoint=False):vs.append([x,.6+radius*np.cos(a),radius*np.sin(a)])
for i in range(len(xs)-1):
 for j in range(nr):a=i*nr+j;b=i*nr+(j+1)%nr;c=a+nr;d=b+nr;fs.extend([[a,c,d],[a,d,b]])
M.add('Fixed cylindrical pressure capsule',trimesh.Trimesh(vs,fs,process=False),coremat,sys,True)
for x in np.arange(-23.5,24,3):ring('Indicative pressure frame',(x,.6,0),3.58,.075,edge,sys,'yz')
for x in [-17,-7,3,13]:box('Dry accommodation volume',(x,.5,0),(7,1.85,5.2),teak,sys,.2)
for side in [-1,1]:
 for x in [-21,-11,-1,9,19]:ell('Ballast arrangement',(x,-.25,side*5.15),(4.1,1.05,1.15),voidmat,wet)
for lv in levels[1:]:box('Reserved shell packing volume '+lv['name'],((lv['a']+lv['b'])/2,6.35,0),(lv['b']-lv['a'],2.8,lv['w']*2),voidmat,wet)
for x in [-16,12]:
 ring('Pressure hatch coaming',(x,5.62,0),.61,.12,edge,hardware);root=M.node('MOV_Pressure_hatch_'+str(x),loc=(x,5.72,-.61));ell('Pressure hatch cover',(0,.04,.61),(.64,.12,.64),paint,root);M.track(root,'rotation',lambda p:quat([1,0,0],-1.10*(1-smooth(.27,.34,p))))
for side in [-1,1]:
 root=M.node('MOV_Dive_plane_'+str(side),loc=(23,-1.05,side*5.72));v=[];f=[]
 for t in np.linspace(0,1,14):
  chord=3.75*(1-.50*t)
  for a in np.linspace(0,2*np.pi,24,endpoint=False):v.append([-.50*t+chord*.5*np.cos(a),.11*chord*np.sin(a),side*3.1*t])
 for i in range(13):
  for j in range(24):a=i*24+j;b=i*24+(j+1)%24;c=a+24;d=b+24;f.extend([[a,b,d],[a,d,c]])
 M.add('Deploying hydroplane',trimesh.Trimesh(v,np.array(f)[:,::-1] if side<0 else f,process=False),black,root,True);M.track(root,'rotation',lambda p,side=side:quat([0,1,0],side*np.pi/2*(1-smooth(.74,.8,p))))
for side in [-1,1]:
 x=-38.0;y=-2.1;z=side*3.25
 for xx in [x-.40,x+.4]:ring('Duct lip',(xx,y,z),1.03,.09,black,hardware,'yz')
 ell('Propulsor hub',(x,y,z),(.52,.20,.20),bronze,hardware)
 for k in range(7):
  a=2*np.pi*k/7;v=[];f=[]
  for j,r in enumerate(np.linspace(.15,.92,12)):
   aa=a+.55*r
   for w in [-1,1]:v.append([x+w*.14,y+r*np.cos(aa+w*.15),z+r*np.sin(aa+w*.15)])
   if j:b=2*j;f.extend([[b-2,b,b+1],[b-2,b+1,b-1]])
  M.add('Swept propeller blade',trimesh.Trimesh(v,f,process=False),bronze,hardware,True)
for side in [-1,1]:
 for x in [-29,-18,-5,8,21,32]:
  z=side*np.interp(x,[-29,-18,8,21,32],[6.2,6.4,6.4,5.8,4.2]);ell('Subsea lamp',(x,-1.15,z),(.16,.12,.09),lamp,hardware)
M.track(0,'translation',lambda p:[0,-26*smooth(.845,1,p),0]);metrics=M.export(OUT/'ATLAS_D_Original.glb',48)
report={'revision':7,'name':'ATLAS D / Original concept motion study','length_m':82.9,'beam_m':14.2,'visual_target':'atlas_d_beyond_the_surface.png','helipad_restored':True,'tenders_recovered':2,'floating_tenders_after_dive':0,'main_hull_swap':False,'scale_animation_channels':0,'pressure_core_fixed':True,'shell_roof_surface_m':15.92,'shell_roof_stowed_m':9.59,'outer_shell_vertical_reduction_m':6.33,'maximum_mast_surface_m':20.18,'maximum_mast_stowed_m':9.06,'duration_seconds':48,'conversion_stop':.80,'descent_start':.845,'animation_descent_m':26,'certified_depth_m':None,'engineering_validated':False,'packing_model':'Nested, non-pressure exterior sleeves through annular terrace openings. Upper deck accommodation is not preserved as occupied dry rooms.','important_limitations':['No human-occupied diving capability established.','Nested shell load paths, complete collision/clearance analysis and accommodation remain unresolved.','Tender bays demonstrate geometric recovery, not pressure-qualified storage of ordinary tenders.','Helipad markings are visual; aviation clearances and load ratings are not established.','Reference-board speed, depth, endurance and displacement claims are not adopted.'],**metrics};(OUT/'model_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
