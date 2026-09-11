"""ATLAS D reference-led design study. Metres; X forward, Y port, Z up.
Visualization only, not naval architecture or pressure-vessel engineering.
"""
import os, math, json, random
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, box as sbox
from shapely.ops import triangulate
import bpy, bmesh
from mathutils import Vector
OUT=Path(os.environ.get('ATLAS_OUT','/tmp/atlas-d'))
OUT.mkdir(parents=True,exist_ok=True)
random.seed(27)
MATS={
 'pearl':((.70,.73,.72,1),.38,.24), 'white':((.89,.90,.86,1),.12,.24),
 'graphite':((.027,.044,.054,1),.65,.30), 'glass':((.013,.038,.046,.93),.38,.14),
 'archglass':((.025,.045,.053,.72),.35,.18), 'subpaint':((.075,.12,.15,1),.61,.27),
 'railglass':((.42,.60,.64,.16),.02,.08), 'chrome':((.55,.62,.65,1),.91,.18),
 'rubber':((.014,.020,.022,1),.08,.68),
 'teak0':((.39,.235,.118,1),0,.63), 'teak1':((.45,.283,.150,1),0,.62),
 'teak2':((.48,.309,.17,1),0,.65), 'teak3':((.42,.257,.127,1),0,.65),
 'fabric':((.84,.80,.68,1),0,.84), 'taupe':((.42,.39,.31,1),0,.88),
 'water':((.025,.39,.46,.84),.19,.12), 'tile':((.16,.40,.44,1),.1,.30),
 'bronze':((.45,.25,.086,1),.82,.26), 'warm':((1,.57,.20,1),0,.38),
 'light':((.52,.91,1,1),0,.21), 'red':((.63,.025,.01,1),.1,.20), 'green':((.04,.55,.15,1),.1,.20),
 'pressure':((.20,.34,.40,1),.69,.33), 'ballast':((.04,.44,.57,1),.3,.3),
 'energy':((.15,.38,.26,1),.25,.4), 'habitat':((.73,.48,.21,1),.2,.5)}
DATA=[];COUNTS={'teak_boards':0,'windows':0,'stanchions':0}
def add(name,verts,faces,mat='white',group='S_Architecture',smooth=False):
 v=np.asarray(verts,float);f=np.asarray(faces,int)
 if not len(v) or not len(f):return
 if not np.isfinite(v).all():raise ValueError(name)
 DATA.append(dict(name=name,verts=v,faces=f,mat=mat,group=group,smooth=smooth))
def unit(a):
 a=np.asarray(a,float);return a/max(np.linalg.norm(a),1e-10)
def rounded(poly,frac=.12,steps=5):
 p=np.asarray(poly,float);out=[]
 for i,b in enumerate(p):
  a=p[(i-1)%len(p)];c=p[(i+1)%len(p)];ab=b+(a-b)*frac;cb=b+(c-b)*frac
  for t in np.linspace(0,1,steps,endpoint=False):out.append((1-t)**2*ab+2*(1-t)*t*b+t*t*cb)
 return np.array(out)
def footprint(x0,x1,b):
 return rounded([(x0,-b*.76),(x0+.65,-b),(x1-7,-b),(x1-2.3,-b*.72),(x1,-b*.32),(x1,b*.32),(x1-2.3,b*.72),(x1-7,b),(x0+.65,b),(x0,b*.76)],.13,5)
def prism(name,poly,z0,z1,mat='white',group='S_Architecture',topscale=1.,smooth=False):
 p=np.asarray(poly,float);n=len(p);ctr=p.mean(axis=0);q=ctr+(p-ctr)*topscale
 v=np.concatenate([np.c_[p,np.full(n,z0)],np.c_[q,np.full(n,z1)]])
 v=np.vstack([v,[*ctr,z0],[*ctr,z1]]);f=[]
 for i in range(n):
  j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i),(2*n,j,i),(2*n+1,n+i,n+j)])
 add(name,v,f,mat,group,smooth)
def rect(name,loc,dims,mat='white',group='S_Architecture',r=0.,yaw=0):
 x,y,z=loc;l,w,h=dims
 if r:
  pts=[];rr=min(r,l*.48,w*.48,h*.9)
  for a,cx,cy in [(0,l/2-rr,w/2-rr),(90,-l/2+rr,w/2-rr),(180,-l/2+rr,-w/2+rr),(270,l/2-rr,-w/2+rr)]:
   for an in np.linspace(a,a+90,5,endpoint=False):
    an=math.radians(an);pts.append([cx+rr*math.cos(an),cy+rr*math.sin(an)])
 else:pts=[[-l/2,-w/2],[l/2,-w/2],[l/2,w/2],[-l/2,w/2]]
 p=np.array(pts);c,s=math.cos(yaw),math.sin(yaw);p=p@np.array([[c,s],[-s,c]])+np.array([x,y])
 prism(name,p,z-h/2,z+h/2,mat,group)
def tube(name,points,r,mat='chrome',group='S_Rails',sides=8,closed=False):
 p=np.asarray(points,float);n=len(p);v=[];f=[]
 for i,q in enumerate(p):
  t=unit(p[(i+1)%n]-p[(i-1)%n]) if closed else unit(p[min(i+1,n-1)]-p[max(0,i-1)])
  u=unit(np.cross(t,[0,0,1] if abs(t[2])<.94 else [0,1,0]));w=np.cross(t,u)
  for a in np.linspace(0,2*math.pi,sides,endpoint=False):v.append(q+r*(u*math.cos(a)+w*math.sin(a)))
 for i in range(n if closed else n-1):
  for j in range(sides):
   a=i*sides+j;b=i*sides+(j+1)%sides;c=((i+1)%n)*sides+j;d=((i+1)%n)*sides+(j+1)%sides;f.extend([(a,b,d),(a,d,c)])
 if not closed:
  v.extend([p[0],p[-1]]);a=len(v)-2;b=a+1
  for j in range(sides):f.extend([(a,(j+1)%sides,j),(b,(n-1)*sides+j,(n-1)*sides+(j+1)%sides)])
 add(name,v,f,mat,group,True)
def ellipsoid(name,loc,rad,mat='white',group='S_Mast',nu=28,nv=16):
 v=[];f=[]
 for i in range(nv+1):
  a=math.pi*i/nv
  for j in range(nu):
   b=2*math.pi*j/nu;v.append(np.array(loc)+np.array(rad)*[math.sin(a)*math.cos(b),math.sin(a)*math.sin(b),math.cos(a)])
 for i in range(nv):
  for j in range(nu):
   a=i*nu+j;b=i*nu+(j+1)%nu;c=a+nu;d=b+nu
   if i>0:f.append((a,c,b))
   if i<nv-1:f.append((b,c,d))
 add(name,v,f,mat,group,True)
def ring(name,center,R,r,axis=(0,0,1),mat='chrome',group='S_Hardware',n=36):
 axis=unit(axis);u=unit(np.cross(axis,[0,0,1] if abs(axis[2])<.9 else [0,1,0]));w=np.cross(axis,u)
 p=[np.array(center)+R*(math.cos(a)*u+math.sin(a)*w) for a in np.linspace(0,2*math.pi,n,endpoint=False)]
 tube(name,p,r,mat,group,8,True)
def panel(name,pts,mat='glass',group='S_Architecture',frame=True):
 p=np.array(pts,float);f=[(0,i,i+1) for i in range(1,len(p)-1)];add(name,p,f,mat,group)
 if frame:tube(name+'_frame',p,.027,'rubber',group,8,True)
def sideblade(name,polyxz,y,thick,mat='white',group='S_Architecture'):
 p=np.array(polyxz);n=len(p);v=[];f=[]
 for yy in [y-thick/2,y+thick/2]:v.extend([[x,yy,z] for x,z in p])
 for i in range(n):
  j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i)])
 for i in range(1,n-1):f.extend([(0,i+1,i),(n,n+i,n+i+1)])
 add(name,v,f,mat,group)
# Hermite-interpolated hull stations, not overlapping primitives.
ST=np.array([[-38.5,5.25,2.05,-1.85],[-36.5,6.08,4.05,-2.65],[-33,6.62,5.36,-3.5],[-27,6.94,5.52,-4.08],[-15,7.10,5.56,-4.42],[0,7.10,5.67,-4.50],[15,6.82,5.77,-4.3],[26,5.94,5.95,-3.45],[34,4.54,6.16,-2.1],[39,2.5,6.36,-.45],[41.45,.035,6.45,1.35]])
def interp(st,x,col):
 i=min(max(np.searchsorted(st[:,0],x)-1,0),len(st)-2);x0,x1=st[i,0],st[i+1,0];t=np.clip((x-x0)/(x1-x0),0,1);d=x1-x0;a,b=st[i,col],st[i+1,col]
 m0=(st[min(i+1,len(st)-1),col]-st[max(i-1,0),col])/(st[min(i+1,len(st)-1),0]-st[max(i-1,0),0])
 m1=(st[min(i+2,len(st)-1),col]-st[i,col])/(st[min(i+2,len(st)-1),0]-st[i,0])
 return float((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d*m1)
CROSS=np.array([[0,.015],[.04,.24],[.12,.54],[.23,.76],[.40,.885],[.58,.943],[.79,.988],[1,1]])
def hw(x,z):
 b=interp(ST,x,1);top=interp(ST,x,2);bot=interp(ST,x,3)
 return b*np.interp(np.clip((z-bot)/(top-bot),0,1),CROSS[:,0],CROSS[:,1])
v=[];fW=[];fD=[];xs=np.linspace(ST[0,0],ST[-1,0],161);nr=49
for x in xs:
 b,top,bot=[interp(ST,x,k) for k in [1,2,3]]
 for t in np.linspace(-1,1,nr):
  zz=bot+(top-bot)*abs(t);yy=math.copysign(hw(x,zz),t);v.append([x,yy,zz])
for i in range(len(xs)-1):
 for j in range(nr-1):
  a=i*nr+j;b=a+1;c=a+nr;d=c+1;fs=[(a,b,d),(a,d,c)]
  (fW if np.mean([v[k][2] for k in [a,b,c,d]])>.10 else fD).extend(fs)
for start in [0,(len(xs)-1)*nr]:
 for j in range(1,nr-1):fW.append((start,start+j,start+j+1))
add('Sculpted_topsides',v,fW,'pearl','S_Hull',True);add('Underbody',v,fD,'graphite','S_Hull',True)
for side in [-1,1]:
 for z,r,mat in [(.12,.047,'rubber'),(.28,.021,'chrome')]:
  tube('Waterline',[[x,side*(hw(x,z)+.015),z] for x in np.linspace(-37.2,39.6,145)],r,mat,'S_Hull',8)
# Curved-shell glazing, individual divisions and ports.
for side in [-1,1]:
 for k,(a,b) in enumerate([(-22,-10),(-8.8,3.8),(5.0,18.0)]):
  z0,z1=2.02,3.08;p=[]
  for x,z in [(a+.45,z0),(b-.65,z0),(b,z1),(a,z1)]:p.append([x,side*(hw(x,z)+.026),z])
  vv=[];ff=[]
  for i,t in enumerate(np.linspace(0,1,17)):
   xlo=(1-t)*(a+.45)+t*(b-.65);xhi=(1-t)*a+t*b
   vv.extend([[xlo,side*(hw(xlo,z0)+.027),z0],[xhi,side*(hw(xhi,z1)+.027),z1]])
   if i:ff.extend([(2*i-2,2*i,2*i+1),(2*i-2,2*i+1,2*i-1)])
  add('Hull_ribbon',vv,ff,'glass','S_Hull');tube('Hull_frame',p,.035,'chrome','S_Hull',8,True)
  for x in np.arange(a+1.5,b-.5,2.15):tube('Hull_mullion',[[x,side*(hw(x,z0)+.04),z0],[x,side*(hw(x,z1)+.04),z1]],.021,'rubber','S_Hull',6)
  COUNTS['windows']+=1
 for x in [-32,-29,-26,22,26,30,34]:
  z=2.24 if x<0 else 2.65;p=[]
  for xx,zz in [(x-.3,z-.17),(x+.3,z-.17),(x+.3,z+.17),(x-.3,z+.17)]:p.append([xx,side*(hw(xx,zz)+.035),zz])
  panel('Hull_port',p,'glass','S_Hull')
 for x in np.arange(31,38.2,1.4):
  z=5.44;panel('Fore_vent',[[xx,side*(hw(xx,zz)+.03),zz] for xx,zz in [(x-.42,z-.055),(x+.42,z-.055),(x+.42,z+.055),(x-.42,z+.055)]],'rubber','S_Hull',False)
mainpoly=footprint(-34.6,30.5,6.72)
DECKS=[('Pool_deck',mainpoly,5.50,(-25.3,25.5,5.96)),('Upper_terrace',footprint(-29.6,24.4,6.20),8.65,(-19.0,18.7,5.45)),('Bridge_terrace',footprint(-23.3,17.5,5.46),11.65,(-11.5,11.6,4.62)),('Sky_terrace',footprint(-15.7,9.0,4.52),14.53,None)]
POOL=Polygon([(-34.0,-2.52),(-27.0,-2.52),(-27.0,2.52),(-34.,2.52)])
def surface_polygons(shape):
 if shape.is_empty:return []
 return [shape] if shape.geom_type=='Polygon' else [q for q in shape.geoms if q.geom_type=='Polygon']
def teak(name,poly,z,subtract=None):
 shape=Polygon(poly).buffer(0)
 if subtract is not None:shape=shape.difference(subtract)
 buckets={k:([],[]) for k in range(4)};bounds=shape.bounds
 for row,y in enumerate(np.arange(bounds[1],bounds[3],.155)):
  for x in np.arange(bounds[0]-4+(row%3)*1.25,bounds[2],3.75):
   p=shape.intersection(sbox(x+.008,y+.005,x+3.742,y+.150))
   for q in surface_polygons(p):
    pts=list(q.exterior.coords)[:-1]
    if len(pts)<3 or q.area<.002:continue
    k=random.randrange(4);vv,ff=buckets[k];n=len(vv);vv.extend([[a,b,z] for a,b in pts]);ff.extend([(n,n+i,n+i+1) for i in range(1,len(pts)-1)]);COUNTS['teak_boards']+=1
 for k,(vv,ff) in buckets.items():add(name+'_boards'+str(k),vv,ff,'teak'+str(k),'S_Deck')
def railing(name,poly,z,group='S_Rails',glass=True):
 pp=np.asarray(poly);ctr=pp.mean(axis=0);pp=ctr+(pp-ctr)*.977
 tube(name+'_top',np.c_[pp,np.full(len(pp),z+.99)],.026,'chrome',group,8,True)
 tube(name+'_lower',np.c_[pp,np.full(len(pp),z+.30)],.012,'chrome',group,6,True)
 lengths=np.linalg.norm(np.roll(pp,-1,axis=0)-pp,axis=1);total=sum(lengths);cum=np.r_[0,np.cumsum(lengths)];n=max(4,int(total/1.85));samples=[]
 for dist in np.linspace(0,total,n,endpoint=False):
  i=min(np.searchsorted(cum,dist,side='right')-1,len(pp)-1);t=(dist-cum[i])/lengths[i];p=pp[i]*(1-t)+pp[(i+1)%len(pp)]*t;samples.append(p)
  tube(name+'_post',[[*p,z+.05],[*p,z+.99]],.024,'chrome',group,8);COUNTS['stanchions']+=1
  if n%2==0:rect(name+'_foot',[*p,z+.036],(.11,.095,.026),'chrome',group)
 if glass:
  for i,a in enumerate(samples):
   b=samples[(i+1)%n];a,b=a*.96+b*.04,b*.96+a*.04
   panel(name+'_glass',[[*a,z+.13],[*b,z+.13],[*b,z+.86],[*a,z+.86]],'railglass',group,False)
for name,poly,z,house in DECKS:
 if name=='Pool_deck':
  shape=Polygon(poly).difference(POOL);vv=[];ff=[]
  for t in triangulate(shape):
   if not shape.covers(t.representative_point()):continue
   coords=list(t.exterior.coords)[:3];n0=len(vv);vv.extend([[x,y,z-.025] for x,y in coords]);ff.append((n0,n0+1,n0+2));n0=len(vv);vv.extend([[x,y,z-.28] for x,y in coords]);ff.append((n0,n0+2,n0+1))
  for rr in [shape.exterior,*shape.interiors]:
   pp=list(rr.coords)
   for p0,p1 in zip(pp,pp[1:]):
    n0=len(vv);vv.extend([[*p0,z-.28],[*p1,z-.28],[*p1,z-.025],[*p0,z-.025]]);ff.extend([(n0,n0+1,n0+2),(n0,n0+2,n0+3)])
  add(name+'_edge',vv,ff,'white','S_Architecture')
 else:prism(name+'_edge',poly,z-.28,z-.025,'white','S_Architecture',.996)
 if name!='Pool_deck':prism(name+'_reveal',np.asarray(poly)*[.999,.994],z-.32,z-.285,'graphite','S_Architecture')
 subtract=Polygon(footprint(house[0],house[1],house[2])) if house else None
 if name=='Pool_deck':subtract=subtract.union(POOL) if subtract else POOL
 teak(name,poly,z,subtract);railing(name,poly,z)
 if house:
  a,b,w=house;p=footprint(a,b,w);n=len(p);height=2.59 if z<10 else 2.43;center=p.mean(axis=0);q=center+(p-center)*[.98,.958]
  prism(name+'_sill',p,z+.025,z+.29,'graphite','S_Architecture');prism(name+'_ceiling',q,z+height-.15,z+height+.04,'white','S_Architecture')
  for i in range(n):
   j=(i+1)%n;panel(name+'_glazing',[[*p[i],z+.29],[*p[j],z+.29],[*q[j],z+height-.17],[*q[i],z+height-.17]],'archglass','S_Architecture',False)
  for side in [-1,1]:
   for x in np.arange(a+2,b-6,2.5):tube(name+'_mullion',[[x,side*w,z+.3],[x,side*w*.958,z+height-.16]],.029,'rubber','S_Architecture',8);COUNTS['windows']+=1
   xa=a+.6;xb=a+7.2
   if z>8:xa=a+10.0;xb=a+4.5
   sideblade(name+'_swept_arch',[(xa,z+.22),(xa+2.0,z+.22),(xb+1.5,z+height),(xb,z+height)],side*(w+.06),.26)
   tube(name+'_warm_reveal',[[a+2,side*(w-.35),z+height-.24],[b-7,side*(w-.35),z+height-.24]],.025,'warm','S_Architecture',6)
  prism(name+'_interior_floor',p,z+.02,z+.07,'teak0','S_Architecture');rect(name+'_interior_core',((a+b)/2,0,z+1.3),((b-a)*.60,4.3,2.3),'graphite','S_Architecture',.2)
  for x in np.arange(a+6,b-6,6):
   for side in [-1,1]:rect('Interior_wood_panel',(x,side*2.4,z+1.2),(1.1,.07,2.0),'teak1','S_Architecture')
  for yy in [-w*.34,0,w*.34]:tube('Bridge_wiper',[[b-.27,yy,z+.4],[b-.60,yy+.17,z+1.65]],.018,'rubber','S_Architecture',6)
bowpoly=rounded([(23,-5.93),(32,-4.8),(38,-2.95),(41.12,0),(38,2.95),(32,4.8),(23,5.93)],.10,6)
prism('Foredeck',bowpoly,5.72,6.16,'pearl','S_Hull');teak('Foredeck',bowpoly,6.18);railing('Bow_rail',bowpoly,6.20,glass=False)
for side in [-1,1]:sideblade('Shoulder_sweep',[(13.4,5.62),(18.2,5.62),(27.2,6.12),(25.0,6.68),(23.2,6.77)],side*5.76,.38,'pearl','S_Architecture')
sp=rounded([(-41.45,-4.85),(-39.9,-5.33),(-35.6,-5.7),(-34.9,5.7),(-39.9,5.33),(-41.45,4.85)],.12,6)
prism('Swim_platform_structure',sp,.65,.93,'white','S_Hull');teak('Swim_platform',sp,.948)
for side in [-1,1]:
 for i in range(24):
  x=-40.3+i*.302;z=1.04+i*.186;rect('Stern_stair_tread',(x,side*4.88,z),(.36,1.24,.085),'teak1','S_Deck',.025);rect('Stern_stair_riser',(x+.14,side*4.88,z-.09),(.06,1.24,.18),'white','S_Architecture')
 tube('Stair_hand',[[-40.4,side*5.55,1.90],[-33.35,side*5.55,6.24]],.033,'chrome','S_Rails',10)
 for i in range(7):
  x=-40.3+i*1.15;z=1.06+(x+40.3)*.615;tube('Stair_support',[[x,side*5.55,z],[x,side*5.55,z+.9]],.028,'chrome','S_Rails')
rect('Beach_club_bulkhead',(-36.45,0,2.45),(.32,8.2,3.1),'graphite','S_Hull')
for yy in [-3,-1.5,0,1.5]:panel('Beach_club_slider',[[-36.64,yy,1.04],[-36.64,yy+1.43,1.04],[-36.64,yy+1.43,3.86],[-36.64,yy,3.86]],'glass','S_Hull')
rect('Pool_basin',(-30.5,0,4.73),(7.10,5.18,.20),'tile','S_Deck',.15)
for yy in [-2.58,2.58]:rect('Pool_side',(-30.5,yy,5.14),(7.25,.15,.92),'tile','S_Deck',.06)
for xx in [-34.08,-26.93]:rect('Pool_end',(xx,0,5.15),(.17,5.3,.93),'tile','S_Deck',.04)
for yy in [-2.72,2.72]:rect('Pool_coping',(-30.5,yy,5.57),(7.62,.22,.16),'white','S_Deck',.055)
for xx in [-34.21,-26.79]:rect('Pool_coping',(xx,0,5.57),(.24,5.61,.16),'white','S_Deck',.055)
rect('Infinity_water',(-30.5,0,5.49),(7.0,5.05,.015),'water','S_Deck',.10)
for j in range(4):rect('Pool_steps',(-27.3-j*.27,0,5.3-j*.14),(.3,1.5,.12),'tile','S_Deck',.03)
for side in [-1,1]:
 tube('Pool_grab',[[-27.0,side*.77,5.6],[-27.5,side*.77,6.04],[-28,side*.77,6.02],[-28.15,side*.77,5.35]],.035,'chrome','S_Deck',10)
 for x in np.linspace(-33.7,-27.3,11):rect('Pool_grate',(x,side*2.94,5.52),(.015,.14,.012),'chrome','S_Deck')
# Multipart exterior furniture kit.
def sofa(name,x,y,z,length=3.,yaw=0,group='S_Furniture'):
 def R(a,b,c):return(x+a*math.cos(yaw)-b*math.sin(yaw),y+a*math.sin(yaw)+b*math.cos(yaw),z+c)
 rect(name+'_base',R(0,0,.20),(length,1.02,.19),'teak0',group,.10,yaw);n=max(2,int(length/.74))
 for i in range(n):rect(name+'_cushion',R(-length/2+(i+.5)*length/n,0,.39),(length/n-.05,.86,.22),'fabric',group,.12,yaw)
 rect(name+'_back',R(0,.45,.70),(length,.20,.60),'fabric',group,.095,yaw)
 for a in [-length/2+.10,length/2-.10]:
  rect(name+'_arm',R(a,0,.56),(.19,1.03,.47),'fabric',group,.09,yaw)
  for b in [-.34,.34]:tube(name+'_leg',[R(a,b,.02),R(a,b,.17)],.045,'chrome',group,8)
def lounger(name,x,y,z,yaw=0,group='S_Furniture'):
 def R(a,b,c):return(x+a*math.cos(yaw)-b*math.sin(yaw),y+a*math.sin(yaw)+b*math.cos(yaw),z+c)
 rect(name+'_frame',R(0,0,.28),(2.12,.79,.13),'teak0',group,.06,yaw);rect(name+'_pad',R(.24,0,.39),(1.60,.70,.16),'fabric',group,.07,yaw)
 poly=[(-1.05,.42),(-1.01,.56),(-.35,.94),(-.28,.8)];vv=[]
 for yy in [-.35,.35]:vv.extend([R(xx,yy,zz) for xx,zz in poly])
 f=[(0,1,2),(0,2,3),(4,6,5),(4,7,6),(0,4,5),(0,5,1),(1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)];add(name+'_raised_back',vv,f,'fabric',group)
 for a in [-.78,.70]:
  for b in [-.29,.29]:tube(name+'_legs',[R(a,b,.04),R(a,b,.26)],.028,'chrome',group)
def table(name,x,y,z,l=1.4,w=.8,group='S_Furniture'):
 rect(name+'_top',(x,y,z+.51),(l,w,.085),'teak2',group,.10)
 for a in [-l*.35,l*.35]:
  for b in [-w*.31,w*.31]:tube(name+'_leg',[[x+a,y+b,z+.03],[x+a,y+b,z+.48]],.028,'chrome',group)
for side in [-1,1]:
 for x in [-33.1,-30.4]:lounger('Pool_lounger',x,side*3.82,5.52)
 sofa('Upper_sofa',-26.0,side*3.25,8.66,3.8,0 if side>0 else math.pi);table('Upper_coffee',-25.7,side*1.9,8.66,1.6,.78)
 sofa('Bridge_sofa',-19.5,side*2.6,11.66,3.45,0 if side>0 else math.pi);table('Bridge_table',-19.4,side*1.25,11.66)
 for x in [-13,-10.4]:lounger('Sky_lounger',x,side*2.76,14.55)
 sofa('Bow_sofa',29.4,side*3.3,6.20,4.5,0 if side>0 else math.pi);table('Bow_table',29.0,side*1.7,6.20,1.7,.75)
for y in [-1.5,0,1.5]:lounger('Bow_sunpad',25.8,y,6.20)
rect('Dining_table',(-21.3,0,9.42),(3.2,1.12,.10),'teak2','S_Furniture',.14)
for x in [-22.25,-21.3,-20.35]:
 for side in [-1,1]:sofa('Dining_armchair',x,side*1.1,8.66,.70,0 if side>0 else math.pi)
ring('Spa_coaming',(-3.3,0,14.98),1.55,.17,mat='white',group='S_Deck',n=64);ellipsoid('Spa_water',(-3.3,0,14.94),(1.40,1.40,.025),'water','S_Deck',48,8)
hp=footprint(-10.8,7.5,4.25);prism('Floating_hardtop',hp,15.76,16.02,'white','S_Mast',.99)
for side in [-1,1]:sideblade('Hardtop_arch',[(-9.0,14.56),(-7.8,14.56),(-1.5,15.78),(-2.8,15.78)],side*3.27,.25,'pearl','S_Mast')
sideblade('Sculpted_mast',[(-6.5,16.0),(-3.0,16.0),(-4.20,19.35),(-5.6,20.0),(-5.45,17.0)],0,.85,'graphite','S_Mast')
for z,x,l in [(17.5,-5.0,4.6),(18.65,-5.35,3.4)]:rect('Radar_platform',(x,0,z),(1.05,l,.12),'graphite','S_Mast',.055)
for y,z in [(-1.48,16.67),(1.48,16.67),(0,18.2)]:
 tube('Dome_mount',[[-5.8,y,z-.47],[-5.8,y,z-.20]],.36,'graphite','S_Mast',24);ellipsoid('Satellite_dome',(-5.8,y,z),(.62,.62,.62),'white','S_Mast',32,20)
rect('Radar_scanner',(-5.30,0,19.27),(.50,4.4,.18),'white','S_Mast',.06)
for y,h in [(-.6,21.0),(.5,20.4),(1.9,18.6),(-1.9,18.6)]:tube('Antenna',[[-5.55,y,16.0],[-5.55,y,h]],.019,'graphite','S_Mast',7)
for side,mat in [(-1,'green'),(1,'red')]:ellipsoid('Nav_lamp',(9.1,side*4.67,13.46),(.11,.095,.075),mat,'S_Hardware',16,10)
def bollard(name,x,y,z):
 rect(name+'_base',(x,y,z+.04),(.69,.43,.08),'chrome','S_Hardware',.08)
 for dx in [-.22,.22]:
  tube(name+'_pin',[[x+dx,y,z+.08],[x+dx,y,z+.44]],.075,'chrome','S_Hardware',14);tube(name+'_cap',[[x+dx,y-.16,z+.43],[x+dx,y+.16,z+.43]],.049,'chrome','S_Hardware',12)
for side in [-1,1]:
 for x,y,z in [(-32,5.84,5.53),(-24,6.35,5.54),(33,3.37,6.23),(37,1.64,6.22)]:bollard('Bollard',x,side*y,z)
 for x in [34.1,35.4]:
  tube('Windlass',[[x,side*2.23,6.18],[x,side*2.23,6.55]],.24,'chrome','S_Hardware',24);ring('Wildcat',(x,side*2.23,6.51),.29,.052,mat='graphite',group='S_Hardware')
 for x in np.arange(34.2,38.6,.20):ring('Anchor_chain',(x,side*2.13,6.29),.087,.022,axis=(0,0,1) if int(x*5)%2 else (0,1,0),mat='graphite',group='S_Hardware',n=12)
 x=38.1;z=2.93;yy=side*(hw(x,z)+.07)
 panel('Anchor_pocket',[[x-.73,yy,1.32],[x+.74,yy,1.32],[x+.74,yy,3.65],[x-.73,yy,3.65]],'graphite','S_Hull');tube('Anchor_shank',[[x,yy+side*.05,1.58],[x,yy+side*.05,3.24]],.085,'chrome','S_Hardware',12)
 sideblade('Anchor_flukes',[(x-.55,1.80),(x,1.44),(x+.58,1.80),(x+.23,2.18),(x,1.87),(x-.24,2.18)],yy+side*.09,.11,'chrome','S_Hardware')
tube('Deck_shower',[[-39.3,-3.7,.94],[-39.3,-3.7,3.1],[-39.3,-3.2,3.18]],.043,'chrome','S_Hardware',12)
for y in [3.1,3.72]:tube('Swim_ladder_rail',[[-41.16,y,1.44],[-41.7,y,1.2],[-41.7,y,-.8]],.04,'chrome','S_Hardware',10)
for z in [-.64,-.34,-.04,.26,.56]:tube('Swim_ladder_rung',[[-41.7,3.1,z],[-41.7,3.72,z]],.035,'chrome','S_Hardware',10)
for side in [-1,1]:
 for x in [-15,-3]:
  p=[[xx,side*(hw(xx,zz)+.013),zz] for xx,zz in [(x-4.5,.55),(x+4.5,.55),(x+4.5,4.47),(x-4.5,4.47)]];tube('Garage_door_seal',p,.027,'rubber','S_Hull',8,True)
 for x in np.arange(-28.0,-22.5,.31):panel('Engine_louvre',[[xx,side*(hw(xx,zz)+.023),zz] for xx,zz in [(x,4.23),(x+.09,4.23),(x+.09,4.79),(x,4.79)]],'graphite','S_Hull',False)
for x in np.arange(-33,24,3.8):
 for side in [-1,1]:rect('Deck_light',(x,side*6.35,5.53),(.20,.11,.035),'warm','S_Deck',.025)
# Continuous submerged envelope and shell detailing.
DS=np.array([[-41.45,.035,.07],[-39,1.8,1.6],[-34,3.9,3.1],[-25,6.05,4.3],[-12,7.1,4.75],[5,7.1,4.8],[19,6.6,4.58],[30,5.28,3.86],[36,3.59,2.83],[40,1.53,1.50],[41.45,.035,.07]])
def dwidth(x,z):
 b=interp(DS,x,1);h=interp(DS,x,2);return b*math.sqrt(max(.001,1-((z-.4)/h)**2))
v=[];f=[];nx=151;nr=72
for x in np.linspace(-41.45,41.45,nx):
 b=interp(DS,x,1);h=interp(DS,x,2)
 for a in np.linspace(0,2*math.pi,nr,endpoint=False):v.append([x,b*math.sin(a),.4+h*math.cos(a)])
for i in range(nx-1):
 for j in range(nr):
  a=i*nr+j;b=i*nr+(j+1)%nr;c=a+nr;d=b+nr;f.extend([(a,c,d),(a,d,b)])
add('Submersible_fairing',v,f,'subpaint','D_Hull',True)
for x in [-28,-18,-4,9,23,32]:
 b=interp(DS,x,1);h=interp(DS,x,2);tube('Pressure_fairing_seam',[[x,(b+.015)*math.sin(a),.4+(h+.012)*math.cos(a)] for a in np.linspace(0,2*math.pi,96,endpoint=False)],.027,'rubber','D_Hull',7,True)
for side in [-1,1]:
 for x in [-22,-12,0,13,25]:
  p=[[xx,side*(dwidth(xx,zz)+.027),zz] for xx,zz in [(x-1.8,-.7),(x+1.8,-.7),(x+1.8,1.8),(x-1.8,1.8)]];panel('Sub_shell_panel',p,'graphite','D_Hull',False);tube('Sub_panel_gasket',p,.034,'rubber','D_Hull',8,True)
  for xx in [x-1.6,x+1.6]:
   for zz in [-.45,1.54]:ellipsoid('Recess_fastener',(xx,side*(dwidth(xx,zz)+.065),zz),(.033,.018,.033),'chrome','D_Hull',8,6)
 for x in [-6,5,16,26]:
  z=1.19;yy=side*(dwidth(x,z)+.055);ring('Observation_port',(x,yy,z),.47,.067,(0,side,0),'chrome','D_Hull',48);ellipsoid('Pressure_glass',(x,yy+side*.025,z),(.42,.055,.42),'glass','D_Hull',32,16)
 for x in np.arange(-28,31,2.2):
  z=3.;yy=side*(dwidth(x,z)+.035);panel('Flood_slot',[[x-.38,yy,2.96],[x+.38,yy,2.96],[x+.38,yy,3.065],[x-.38,yy,3.065]],'rubber','D_Hull',False)
 for x in [-28,-17,-5,8,20,31]:
  z=-2.5;yy=side*(dwidth(x,z)+.025);ring('Floodlight_mount',(x,yy,z),.17,.037,(0,side,-.4),'chrome','D_Lights',24);ellipsoid('Floodlight_lens',(x,yy+side*.04,z),(.145,.060,.13),'light','D_Lights',20,12)
prism('Dorsal_fairing',footprint(-20,19,3.65),4.65,5.86,'subpaint','D_Sail',.83);prism('Dorsal_reveal',footprint(-18,15,3.10),5.85,6.07,'rubber','D_Sail',.88)
prism('Low_sail',footprint(-8,9.4,2.54),5.98,7.69,'subpaint','D_Sail',.69);prism('Sail_cap',footprint(-7.8,9.5,1.9),7.66,7.88,'subpaint','D_Sail',.97)
for side in [-1,1]:tube('Dorsal_trim',[[-17,side*3.,5.71],[4,side*2.83,5.91],[15,side*1.6,5.75]],.026,'chrome','D_Sail',8)
for x,h in [(-5.5,10.08),(-3.9,9.6),(-2.25,10.35)]:
 tube('Retracted_sensor',[[x,0,7.72],[x,0,h]],.077,'graphite','D_Sail',12);ellipsoid('Sensor_head',(x,0,h),(.14,.13,.20),'chrome','D_Sail',16,10)
def fin(name,x,y,z,span,chord,side,group='D_Controls',vertical=False):
 v=[];f=[];ns=12;nc=16
 for i,t in enumerate(np.linspace(0,1,ns)):
  cc=chord*(1-.59*t);sweep=-span*.34*t
  for a in np.linspace(0,2*math.pi,nc,endpoint=False):
   xx=x+sweep+cc*.5*math.cos(a);yy=y+side*span*t;zz=z+.12*cc*math.sin(a)*(.6+.4*math.sin(abs(a)))
   if vertical:yy,zz=y+(zz-z),z+span*t
   v.append([xx,yy,zz])
 for i in range(ns-1):
  for j in range(nc):
   a=i*nc+j;b=i*nc+(j+1)%nc;c=a+nc;d=b+nc;f.extend([(a,b,d),(a,d,c)])
 add(name,v,f,'graphite',group,True)
for side in [-1,1]:
 fin('Bow_dive_plane',25,side*4.4,-.55,4.,5.,side);fin('Stern_dive_plane',-32,side*3.3,-.4,4.1,5.4,side)
fin('Tail_fin',-36.2,0,1.45,3.5,5.5,1,vertical=True);fin('Stabilizer',-2,-6.,-1.7,1.8,3.3,-1,'S_Running');fin('Stabilizer',-2,6.,-1.7,1.8,3.3,1,'S_Running')
def prop(name,x,y,z,group,R=1.12,duct=True):
 if duct:
  for xx in [x-.48,x+.48]:ring(name+'_duct_lip',(xx,y,z),R,.105,(1,0,0),'graphite',group,64)
  v=[];f=[];n=64
  for xx in [x-.48,x+.48]:
   for a in np.linspace(0,2*math.pi,n,endpoint=False):v.append([xx,y+R*math.sin(a),z+R*math.cos(a)])
  for i in range(n):
   j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i)])
  add(name+'_duct',v,f,'graphite',group,True)
 ellipsoid(name+'_hub',(x,y,z),(.49,.21,.21),'bronze',group,24,12)
 for blade in range(7):
  v=[];f=[]
  for i,t in enumerate(np.linspace(0,1,13)):
   rr=.15+(R-.28)*t;theta=2*math.pi*blade/7+.52*t
   for j,s in enumerate(np.linspace(-1,1,5)):
    angle=theta+s*(.20+.09*math.sin(math.pi*t));v.append([x+s*.17+.10*t,y+rr*math.cos(angle),z+rr*math.sin(angle)])
    if i and j:
     a=i*5+j;f.extend([(a-6,a-1,a),(a-6,a,a-5)])
  add(name+'_swept_blade',v,f,'bronze',group,True)
for group,x,y,z in [('D_Controls',-38.6,2.25,-.7),('D_Controls',-38.6,-2.25,-.7),('S_Running',-29,2.70,-2.7),('S_Running',-29,-2.7,-2.7)]:
 prop('Propulsor',x,y,z,group,1.06,group.startswith('D'));tube('Shaft',[[x+3.2,y,z+.38],[x,y,z]],.10,'chrome',group,16)
# Schematic cutaway layers, not an engineering layout.
ellipsoid('Inner_pressure_volume',(0,0,.1),(32.5,4.2,4.2),'pressure','I_Pressure',96,40)
for x in np.arange(-27,29,4.5):ring('Pressure_frame',(x,0,.1),4.18,.065,(1,0,0),'chrome','I_Pressure',48)
for side in [-1,1]:
 for x in [-22,-12,-2,8,18]:ellipsoid('Ballast_tank',(x,side*5.3,-.7),(4.1,1.05,1.15),'ballast','I_Ballast',24,12)
 for x in [-16,-8,0,8,16]:rect('Energy_module',(x,side*2.3,-2.4),(5.7,1.3,1.),'energy','I_Energy',.15)
for x in [-21,-13,-5,3,11,19]:rect('Habitation_zone',(x,0,.45),(6.8,5.7,1.5),'habitat','I_Habitat',.16)
def tender(name,L,B,cx,cy,yaw=0,rib=False):
 start=len(DATA);g='S_Fleet';ss=np.array([[-L/2,B*.40,1.,-.4],[-L*.25,B*.50,1.1,-.75],[0,B*.49,1.15,-.83],[L*.3,B*.36,1.32,-.55],[L*.5,.025,1.63,.70]])
 v=[];f=[];nr=25
 for x in np.linspace(-L/2,L/2,51):
  b,top,bot=[interp(ss,x,k) for k in [1,2,3]]
  for t in np.linspace(-1,1,nr):v.append([x,math.copysign(b*(abs(t)**.39),t),bot+(top-bot)*abs(t)])
 for i in range(50):
  for j in range(nr-1):
   a=i*nr+j;b=a+1;c=a+nr;d=c+1;f.extend([(a,b,d),(a,d,c)])
 add(name+'_hull',v,f,'graphite' if rib else 'pearl',g,True);p=footprint(-L*.43,L*.37,B*.41);prism(name+'_deck',p,.92,1.04,'teak1',g)
 for xx in [-L*.24,L*.05]:sofa(name+'_seating',xx,0,1.04,B*.65,math.pi/2,g)
 rect(name+'_console',(L*.07,0,1.67),(L*.15,B*.38,1.1),'pearl',g,.16)
 panel(name+'_windscreen',[[L*.04,-B*.3,1.9],[L*.17,-B*.25,1.9],[L*.17,B*.25,2.40],[L*.04,B*.3,2.40]],'glass',g)
 if not rib:
  p=footprint(-L*.20,L*.24,B*.37);prism(name+'_hardtop',p,2.67,2.80,'graphite',g)
  for side in [-1,1]:tube(name+'_roof_support',[[-L*.15,side*B*.28,1.08],[-L*.10,side*B*.28,2.7]],.033,'chrome',g)
 else:
  for side in [-1,1]:tube(name+'_inflatable',[[x,side*np.interp(x,ss[:,0],ss[:,1]),1.1] for x in np.linspace(-L*.48,L*.42,35)],.23,'rubber',g,16)
 for yy in [-B*.19,B*.19]:rect(name+'_outboard',(-L*.49,yy,.46),(.60,.40,1.10),'graphite',g,.13)
 c,s=math.cos(yaw),math.sin(yaw);R=np.array([[c,-s,0],[s,c,0],[0,0,1]])
 for d in DATA[start:]:d['verts']=d['verts']@R.T+np.array([cx,cy,0])
tender('Chase_tender',11.8,3.65,-23,-17,.15,False);tender('Utility_RIB',6.9,2.65,-10,-17.2,-.06,True)
report={'name':'ATLAS D 272 | Reconstruction','design_length_m':82.9,'design_beam_m':14.2,'source_meshes':len(DATA),'triangles':sum(len(d['faces']) for d in DATA),**COUNTS,'states':['surface','submerged','cutaway'],'interpretation':'Reference-led visualization. Transition between concept envelopes is illustrative, not an engineered mechanism.'}
# Assemble real native Blender scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;mats={};groups={}
for name,(rgba,metal,rough) in MATS.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=rgba;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=rgba[3]
 if rgba[3]<1:
  if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
  elif hasattr(m,'blend_method'):m.blend_method='BLEND'
 if name in ['warm','light','red','green']:
  p.inputs['Emission Color' if 'Emission Color' in p.inputs else 'Emission'].default_value=rgba;p.inputs['Emission Strength'].default_value=2.2 if name in ['warm','light'] else .55
 mats[name]=m
for group in sorted(set(d['group'] for d in DATA)):
 col=bpy.data.collections.new(group);scene.collection.children.link(col);groups[group]=col
for n,d in enumerate(DATA):
 mesh=bpy.data.meshes.new(d['name']);mesh.from_pydata(d['verts'].tolist(),[],d['faces'].tolist());mesh.update();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new(d['name'],mesh);groups[d['group']].objects.link(o);mesh.materials.append(mats[d['mat']])
 if d['smooth']:
  for p in mesh.polygons:p.use_smooth=True
for key,col in groups.items():col.hide_render=key.startswith(('D_','I_'));col.hide_viewport=key.startswith(('D_','I_'))
for name,loc,rot,size,collection in [('ATLAS',(-36.64,0,3.97),(math.pi/2,0,-math.pi/2),.55,'S_Hardware'),('A T L A S',(2.,-7.,2.85),(math.pi/2,0,0),.60,'D_Hull')]:
 cu=bpy.data.curves.new('Branding','FONT');cu.body=name;cu.size=size;cu.align_x='CENTER';cu.extrude=.004;o=bpy.data.objects.new('ATLAS_brand',cu);groups[collection].objects.link(o);o.location=loc;o.rotation_euler=rot;cu.materials.append(mats['chrome'])
world=bpy.data.worlds.new('Marine_studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.26,.31,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8;scene.world=world
def area(name,loc,energy,size,color):
 ld=bpy.data.lights.new(name,'AREA');ld.energy=energy;ld.shape='DISK';ld.size=size;ld.color=color;o=bpy.data.objects.new(name,ld);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(0,-35,55),6500,42,(1,.88,.72));area('Fill',(10,34,32),5000,50,(.75,.86,1));area('Rim',(-40,5,30),4200,25,(1,.95,.85))
ld=bpy.data.lights.new('Sun','SUN');ld.energy=2.2;ld.angle=.12;ob=bpy.data.objects.new('Sun',ld);scene.collection.objects.link(ob);ob.rotation_euler=(.40,-.35,-.4)
cd=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',cd);scene.collection.objects.link(cam);scene.camera=cam;cd.type='ORTHO';cd.ortho_scale=109;cd.clip_end=1000
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=91
try:scene.view_settings.view_transform='AgX'
except:pass
views=[('surface',(77,-115,48),(0,-2,6)),('profile',(0,-125,17),(0,0,6)),('stern',(-86,-94,47),(-10,0,6)),('submerged',(65,-112,35),(0,0,1))]
for name,loc,target in views:
 dive=name=='submerged'
 for key,col in groups.items():col.hide_render=(key.startswith('S_') if dive else key.startswith(('D_','I_')));col.hide_viewport=False
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.jpg'));bpy.ops.render.render(write_still=True)
for key,col in groups.items():col.hide_render=key.startswith(('D_','I_'));col.hide_viewport=key.startswith(('D_','I_'))
cam.location=views[0][1];cam.rotation_euler=(Vector(views[0][2])-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ATLAS_D_Reconstruction.blend'),compress=True)
# Exact master meshes, merged only for browser draw-call efficiency.
for key,col in groups.items():col.hide_viewport=False
bpy.ops.object.select_all(action='DESELECT');exportcol=bpy.data.collections.new('WEB_EXPORT');scene.collection.children.link(exportcol);buckets={}
for key,col in groups.items():
 for o in list(col.objects):
  if o.type=='FONT':
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
  if o.type!='MESH':continue
  buckets.setdefault((key,o.data.materials[0].name),[]).append(o)
for (key,matname),obs in buckets.items():
 duplicates=[]
 for o in obs:
  c=o.copy();c.data=o.data.copy();exportcol.objects.link(c);duplicates.append(c)
 bpy.ops.object.select_all(action='DESELECT')
 for o in duplicates:o.select_set(True)
 bpy.context.view_layer.objects.active=duplicates[0];bpy.ops.object.join();duplicates[0].name=key+'__'+matname
bpy.ops.object.select_all(action='DESELECT')
for o in exportcol.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'ATLAS_D_Reconstruction.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
report['blender_version']=bpy.app.version_string;report['web_meshes']=len(exportcol.objects);report['glb_bytes']=(OUT/'ATLAS_D_Reconstruction.glb').stat().st_size
(OUT/'model_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
