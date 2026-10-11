"""ATLAS Fleet 02: original styling geometry only. No physical design qualification."""
import numpy as np, math
import trimesh
from scipy.interpolate import PchipInterpolator
from meshkit import rounded,slab,boxmesh,tubes,ellipse,quat
TAU=math.pi*2

def loft(rings,n=80):
 """Closed superellipse sections: (y,cx,L,W,exponent). Smooth paint-ready normals."""
 verts=[]
 for y,cx,L,W,e in rings:
  for a in np.linspace(0,TAU,n,endpoint=False):
   x,z=np.cos(a),np.sin(a)
   verts.append([cx+L/2*np.sign(x)*abs(x)**(2/e),y,W/2*np.sign(z)*abs(z)**(2/e)])
 faces=[]
 for j in range(len(rings)-1):
  for i in range(n):
   a=j*n+i;b=j*n+(i+1)%n;faces.extend([[a,b,a+n],[b,b+n,a+n]])
 for j in [0,len(rings)-1]:
  k=len(verts);verts.append([rings[j][1],rings[j][0],0])
  for i in range(n):faces.append([k,j*n+i,j*n+(i+1)%n])
 m=trimesh.Trimesh(verts,faces,process=True);m.fix_normals(multibody=True)
 if m.volume<0:m.invert()
 return m

def roof(b,top):
 b.add('Contoured composite hardtop',loft([(2.626,-.10,2.34,1.75,5),(2.647,-.10,2.48,1.87,5),(2.698,-.10,2.52,1.90,5),(2.747,-.10,2.40,1.82,5),(2.765,-.10,2.20,1.68,5)]),'white',top,True)
 b.add('Slate underside inset',loft([(2.620,-.10,2.20,1.57,5),(2.632,-.10,2.28,1.66,5)]),'blue',top,True)
 # Broad radii, real skin thickness and a center-line crown; no slab painted as a roof.
 for side in [-1,1]:
  pts=[[x,2.657,side*.928] for x in np.linspace(-1.0,.84,24)]
  b.tube('Hardtop edge reveal',pts,.008,'piping',top,8)


def console(b,inside,seats):
 b.add('Sculpted console fairing',loft([(.38,-.25,1.13,1.00,5),(.45,-.23,1.14,1.02,5),(.85,-.25,1.10,.94,5),(1.15,-.27,.98,.90,4),(1.37,-.29,.99,.92,4),(1.42,-.29,.91,.86,4)]),'white',inside,True)
 b.box('Helm inset gasket',[-.808,1.16,0],[.045,.42,.81],'black',inside,.045)
 b.box('Glass helm fascia',[-.835,1.16,0],[.028,.385,.76],'black',inside,.035)
 for z in [-.20,.20]:
  b.box('MFD instrument bezel',[-.86,1.245,z],[.029,.235,.34],'black',inside,.026)
  b.box('MFD bonded display',[-.878,1.246,z],[.008,.19,.295],'screen',inside,.018)
  for k in range(5):b.cyl('Helm tactile switch',[-.876,.976,-.29+k*.14],.017,.012,'chrome',inside,'x',16)
 # Actual graphics are modeled lines in the selected display, no manufacturer affiliation.
 for z in [-.20,.20]:
  for k in range(4):b.tube('Display contour',[[-.884,1.18+k*.031,z-.11],[-.884,1.20+k*.031,z-.04],[-.884,1.178+k*.031,z+.11]],.0025,'silver',inside,6)
 # Bent windscreen wraps around console sides.
 for side in [-1,1]:
  ps=[[.07,1.44,side*.40],[.12,1.83,side*.37],[-.34,1.78,side*.46],[-.43,1.43,side*.47]]
  m=trimesh.Trimesh(ps,[[0,1,2],[0,2,3]],process=False);b.add('Windscreen side return',m,'glass',inside)
  b.tube('Windscreen side perimeter',[ps[0],ps[1],ps[2],ps[3]],.012,'black',inside,10)
 b.box('Forward console base',[.355,.475,0],[.63,.18,.86],'white',seats,.06)
 b.box('Forward seat cushion',[.36,.61,0],[.58,.145,.80],'fabric',seats,.067)
 b.box('Forward backrest',[.23,.965,0],[.14,.52,.79],'fabric',seats,.065)
 for z in [-.33,.33]:b.tube('Forward seat sewn edge',[[.10,.69,z],[.58,.69,z]],.006,'piping',seats,8)


def helm_seats(b,seats,inside):
 # Twin individual bolsters rather than one rectangular bench.
 for z in [-.265,.265]:
  b.box('Sculpted helm seat base',[-1.51,.94,z],[.66,.17,.47],'fabric',seats,.065)
  b.box('Helm seat inset',[-1.52,1.027,z],[.49,.019,.35],'piping',seats,.017)
  b.box('Contoured helm back',[-1.81,1.245,z],[.17,.56,.46],'fabric',seats,.072)
  b.box('Back cushion center',[-1.713,1.267,z],[.024,.37,.33],'piping',seats,.023)
  for off in [-.175,.175]:
   b.tube('Bolster contrast piping',[[-1.78,1.02,z+off],[-1.40,1.02,z+off],[-1.20,.99,z+off]],.007,'piping',seats)
  for y in np.linspace(1.08,1.42,6):b.tube('Backrest stitched panel',[[-1.697,y,z-.145],[-1.697,y,z+.145]],.0035,'piping',seats,6)
 for side in [-1,1]:
  b.box('Helm armrest',[-1.52,1.20,side*.526],[.43,.055,.095],'black',seats,.025)
 b.tube('Leaning post foot bar',[[-1.38,.59,-.44],[-1.38,.59,.44]],.035,'chrome',seats)


def cowling(b,steer):
 b.add('Sculpted outboard cowling',loft([(-.03,-.26,.53,.42,4),(.03,-.26,.62,.49,4),(.49,-.23,.60,.48,4),(.66,-.18,.49,.40,4),(.70,-.16,.29,.27,3)],64),'silver',steer,True)
 for side in [-1,1]:
  b.box('Outboard accent inlay',[-.23,.29,side*.247],[.40,.092,.017],'blue',steer,.015)
  for x in [-.37,-.31,-.25,-.19]:b.box('Cowling ventilation flute',[x,.52,side*.222],[.026,.085,.009],'black',steer,.004)
  b.text('ATLAS',[-.40 if side>0 else .015,.34,side*.258],.086,'black',steer,facing=1 if side>0 else -1)


def bay_detail(b):
 molded_liner(b)
 p=b.group('EX_PremiumDeckDetail',b.groups['EX_Deck']);h=b.groups['EX_Hardware'];top=b.groups['FIXED_TTop'];seats=b.groups['EX_Seating'];inside=b.groups['EX_Console']
 # Non-slip inserts remain contained in their existing lid reservations.
 for x,z,L,W,y in [(1.63,0,1.35,.59,.878),(1.33,-.81,1.10,.20,.878),(1.33,.81,1.10,.20,.878),(-3.05,-.71,.56,.51,.738)]:
  b.box('Two tone EVA hatch insert',[x,y,z],[L,.007,W],'fabric',p,.035)
  for dz in [-W*.40,W*.40]:b.tube('EVA perimeter border',[[x-L*.43,y+.005,z+dz],[x+L*.43,y+.005,z+dz]],.007,'piping',p,8)
 # Gunwale side pads, recessed audio, service fixtures.
 for side in [-1,1]:
  z=side*1.145
  for x,L in [(-2.02,.82),(-.78,1.30)]:
   b.box('Coaming bolster',[x,.695,z],[L,.15,.077],'fabric',p,.033)
   b.tube('Coaming sewn edge',[[x-L*.42,.738,z-side*.047],[x+L*.42,.738,z-side*.047]],.005,'piping',p,8)
  b.cyl('Marine speaker frame',[-.32,.57,side*1.143],.095,.016,'chrome',p,'z',32)
  b.cyl('Speaker grille',[-.32,.57,side*1.155],.080,.018,'white',p,'z',32)
  for x in np.linspace(-.37,-.27,7):b.tube('Speaker grille slot',[[x,.52,side*1.166],[x,.62,side*1.166]],.003,'piping',p,6)
  b.box('Toe rail LED channel',[-1.05,.42,side*1.09],[2.00,.025,.016],'black',p,.006)
  b.box('Warm recessed deck light',[-1.05,.422,side*1.078],[1.72,.009,.009],'amber',p,.002)
  for x in [-3.04,1.1]:
   b.cyl('Flush rodholder recess',[x,.74 if x<0 else .92,side*.99],.046,.017,'black',h,'y',24)
   b.ring('Rodholder stainless lip',[x,.750 if x<0 else .93,side*.99],.050,.006,'chrome',h)
  b.ring('Cup holder stainless lip',[-1.50,1.047,side*.615],.045,.006,'chrome',h)
  b.cyl('Cup holder dark well',[-1.50,1.024,side*.615],.039,.033,'black',h)
 # Console door and latches, overhead speakers, separate bow tow fitting.
 b.box('Console side service gasket',[-.28,.79,-.468],[.61,.55,.015],'black',inside,.035)
 b.box('Console side service hatch',[-.28,.79,-.479],[.574,.512,.012],'white',inside,.03)
 b.ring('Service hatch pull',[-.50,.79,-.49],.032,.006,'chrome',inside,'z')
 for side in [-1,1]:
  for x in [-.91,.58]:
   b.cyl('Hardtop down-facing speaker',[x,2.612,side*.52],.101,.013,'white',top,'y',32)
   for dz in np.linspace(-.055,.055,6):b.tube('Hardtop speaker grille',[[x-.06,2.602,side*.52+dz],[x+.06,2.602,side*.52+dz]],.0026,'piping',top,6)
 for x in [-.99,.42]:
  for side in [-1,1]:
   for dx in [-.049,.049]:b.cyl('Captive T top base bolt',[x+dx,.435,side*.56],.012,.012,'chrome',top,'y',8)
 b.tube('Bow towing eye',[[3.60,.83,-.033],[3.72,.86,0],[3.60,.83,.033]],.016,'chrome',h)
 # Trace slender hull accent below sheer, not a polygon stripe.
 sec=np.array([[-3.70,1.20,.71],[-3.1,1.26,.75],[-1.5,1.30,.79],[0,1.29,.83],[1.5,1.21,.94],[2.5,1.02,1.05],[3.1,.72,1.13],[3.65,.21,1.19]])
 for side in [-1,1]:
  xs=np.linspace(-3.66,3.60,120);w=PchipInterpolator(sec[:,0],sec[:,1])(xs);yy=PchipInterpolator(sec[:,0],sec[:,2])(xs)
  b.tube('Brushed sheer accent',np.c_[xs,yy+.012,side*(w+.015)],.009,'chrome',h,8)
 # Engine rigging is visually routed to transom, never disappears.
 b.tube('Outboard rigging sleeve',[[-3.79,.39,-.23],[-4.00,.46,-.23],[-4.13,.59,-.19]],.024,'black',h,12)
 b.text('BAY 25',[.92,1.438,-.27],.115,'silver',top,plane='deck') if False else None
 b.m.g['scenes'][0]['extras']={'revision':'Fleet 02 / Bay finish and geometry','rigid_top':True,'custom_visual_model':True,'certified_performance':False}


def naval_detail(b,kind):
 h=b.groups['EX_Hardware'] if kind=='w' else b.groups['EX_Fittings']
 if kind=='w':
  p=b.group('EX_RefinedHullFittings',h)
  for side in [-1,1]:
   # Gangway, exterior stairs and generic safety hardware. No weapon internals.
   for x in [-25,5,27]:
    z=side*6.67
    b.box('Exterior door gasket',[x,8.1,z],[.95,1.83,.04],'black',p,.085)
    b.box('Watertight door visual leaf',[x,8.1,z+side*.028],[.86,1.73,.055],'naval',p,.075)
    for y in [7.43,8.1,8.77]:b.box('Door dogging handle',[x+.36,y,z+side*.075],[.12,.07,.07],'chrome',p,.015)
    b.ring('Door wheel',[x,8.13,z+side*.098],.145,.018,'chrome',p,'z')
   # Small framed openings / scuppers along the side rather than random seams.
   for x in np.arange(-40,31,4):b.box('Hull scupper reveal',[x,5.81,side*8.85],[.48,.12,.020],'black',p,.025)
   for x in [-39,-34,-29]:
    b.box('Hangar service door',[x,8.0,side*5.998],[.94,1.68,.037],'silver',p,.08)
   for x in [-20,-12,19]:
    z=side*6.05
    b.ring('Lifebuoy',[x,10.1,z],.32,.085,'white',p,'z');b.ring('Lifebuoy contrasting band',[x,10.1,z+side*.07],.32,.015,'red',p,'z')
  # Flight deck rear safety net screens, legible fine geometry.
  for side in [-1,1]:
   for x in np.arange(-60.8,-45.5,2.5):
    z=side*7.23
    b.tube('Flight safety net outer frame',[[x,6.13,z],[x+2.20,6.13,z],[x+2.20,6.02,z+side*.62],[x,6.02,z+side*.62],[x,6.13,z]],.02,'naval',p)
    for dx in np.arange(.22,2.10,.22):b.tube('Safety net cords',[[x+dx,6.13,z],[x+dx,6.02,z+side*.62]],.005,'piping',p,6)
  for x,z in [(53,-2.1),(53,2.1)]:
   b.box('Forecastle anchor hatch',[x,8.63,z],[1.15,.07,.96],'naval',p,.08)
   b.cyl('Capstan drum',[x-3,8.45,z],.27,.61,'darkdeck',p)
 elif kind=='n':
  p=b.group('EX_RefinedServiceFittings',h)
  for x in [-20,-12,18]:
   for z in [-.31,.31]:b.box('Deck inset tread',[x,4.273,z],[.85,.015,.10],'black',p,.015)
  for side in [-1,1]:
   b.box('Sail service access surround',[-1.9,6.45,side*1.06],[.82,1.65,.035],'black',p,.14)
   b.box('Sail service access leaf',[-1.9,6.45,side*1.083],[.75,1.56,.027],'sub',p,.13)
   b.tube('Recessed sail handle',[[-2.12,6.65,side*1.111],[-2.12,6.93,side*1.111]],.018,'chrome',p)
 # Clean rooms remain schematic, but add visible human-scale lighting and service routing.
 p=b.group('INT_Additional_fittings',b.groups['INT_GenericArrangement'])
 if kind=='n':levels=[-.0,2.50];xs=[-17,-11,-5,4,10,17,23];zv=2.55
 else:levels=[2.28,4.85,8.65];xs=[-40,-30,-20,-10,0,10,20,30];zv=5.15
 for y in levels:
  for side in [-1,1]:
   b.box('Overhead service tray',[0,y-.08,side*zv],[44 if kind=='n' else 77,.12,.18],'silver',p,.02)
  for x in xs:
   b.box('Working light housing',[x,y,0],[1.12,.055,.19],'darkdeck',p,.026)
   b.box('Working light diffuser',[x,y-.033,0],[1.00,.009,.13],'white',p,.004)


def molded_liner(b):
 # Close the open visual liner around the cockpit, not an assertion of watertight construction.
 deck=b.groups['EX_Deck'];h=b.groups['EX_Hardware']
 sec=np.array([[-3.70,1.20,.71],[-3.1,1.26,.75],[-1.5,1.30,.79],[0,1.29,.83],[1.5,1.21,.94],[2.5,1.02,1.05],[3.1,.72,1.13],[3.65,.21,1.19],[3.74,.035,1.21]])
 xs=np.linspace(-3.69,3.72,150);w=PchipInterpolator(sec[:,0],sec[:,1])(xs);yy=PchipInterpolator(sec[:,0],sec[:,2])(xs)
 for side in [-1,1]:
  v=[];f=[]
  for x,ww,y in zip(xs,w,yy):
   v.extend([[x,y-.045,side*max(.004,ww-.105)],[x,.369,side*max(.004,ww-.19)]])
  for k in range(len(xs)-1):a=k*2;f.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
  m=trimesh.Trimesh(v,f,process=False)
  if np.mean(m.face_normals[:,2])*side>0:m.invert()
  b.add('Continuous molded cockpit liner',m,'white',deck,True)
  v=[];f=[]
  for x,ww,y in zip(xs,w,yy):v.extend([[x,y+.017,side*max(.004,ww-.13)],[x,y+.017,side*max(.005,ww-.012)]])
  for k in range(len(xs)-1):a=k*2;f.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
  m=trimesh.Trimesh(v,f,process=False)
  if np.mean(m.face_normals[:,1])<0:m.invert()
  b.add('Broad molded gunwale cap',m,'white',deck,True)
 v=[];f=[]
 for x in np.linspace(3.07,3.71,40):
  ww=float(PchipInterpolator(sec[:,0],sec[:,1])(x));y=.865+.28*((x-3.07)/.64)
  v.extend([[x,y,-max(.007,ww-.12)],[x,y,max(.007,ww-.12)]])
 for k in range(39):a=k*2;f.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
 m=trimesh.Trimesh(v,f,process=False)
 if m.face_normals[:,1].mean()<0:m.invert()
 b.add('Closed forepeak deck infill',m,'white',deck,True)
 for z in [-.73,-.36,0,.36,.73]:
  axis=np.array([-.13,.15,0]);axis=axis/np.linalg.norm(axis)
  m=trimesh.creation.cylinder(radius=.031,height=.006,sections=24)
  m.apply_transform(trimesh.geometry.align_vectors([0,0,1],axis));m.apply_translation(np.array([-1.42,2.85,z])+axis*.001)
  b.add('Open roof rod-holder socket',m,'black',b.groups['FIXED_TTop'],True)
