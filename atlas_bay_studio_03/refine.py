"""ATLAS Bay 25 / Studio 03. Original appearance and rigid motion study.
Rebuild the tender; retain Fleet 02 unchanged. Metres, X bow, Y up, Z starboard.
No performance, load, pressure, or safe-recovery claims.
"""
from pathlib import Path
import os,sys,json,math,copy,io
import numpy as np
import trimesh
from scipy.interpolate import PchipInterpolator as Pchip
from scipy.spatial.transform import Rotation
from PIL import Image
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));sys.path.insert(0,str(R/'source'))
os.environ['FLEET_ROOT']=str(R)
from build_fleet import Builder,rbox,linear
from meshkit import slab,rounded,tubes,quat,smooth,ellipse
from detail import loft
from assemble import Doc
TAU=math.pi*2
sec=np.array([[-3.75,1.175,.76,-.13,-.49],[-3.25,1.245,.79,-.13,-.50],[-2.0,1.294,.805,-.12,-.49],[-.6,1.30,.835,-.085,-.46],[.7,1.269,.895,-.01,-.395],[1.65,1.162,.985,.09,-.245],[2.40,.965,1.068,.26,.025],[2.96,.704,1.13,.48,.345],[3.4,.38,1.16,.74,.65],[3.67,.12,1.172,.97,.92],[3.75,.004,1.174,1.12,1.118]])
sp=[Pchip(sec[:,0],sec[:,i]) for i in range(1,5)]
def station(x):return [float(f(x)) for f in sp]
def surf(v,f,orientation=None):
 m=trimesh.Trimesh(v,f,process=False)
 if orientation and np.mean(m.face_normals@np.array(orientation))<0:m.invert()
 return m

def rounded_loop(x,y,z,L,W,r=.07):
 p=rounded([[x-L/2,z-W/2],[x+L/2,z-W/2],[x+L/2,z+W/2],[x-L/2,z+W/2]],min(.28,r/min(L,W)),12)
 return np.c_[p[:,0],np.full(len(p),y),p[:,1]]

def box_rotate(b,name,loc,dim,mat,parent,axis,angle,r=.03):
 m=rbox(np.zeros(3),dim,r);m.apply_transform(trimesh.transformations.rotation_matrix(angle,axis));m.apply_translation(loc);b.add(name,m,mat,parent,True)

def curved_tube(b,name,pts,r,ma,p):
 pts=np.array(pts);tt=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];ss=np.linspace(0,tt[-1],60);vs=np.c_[*[Pchip(tt,pts[:,i])(ss) for i in range(3)]];b.tube(name,vs,r,ma,p,14)

def build():
 b=Builder('ATLAS Bay 25 / Studio 03');ma=b.m.g['materials']
 for k,c,rough,metal in [('blue','#35556D',.24,0),('white','#E4E6E2',.27,0),('deck','#BFC8C7',.80,0),('darkdeck','#3E4E56',.5,.10),('silver','#B7C2C6',.27,.40),('chrome','#CCD3D5',.18,1),('fabric','#D2D3CB',.86,0),('piping','#829499',.78,0),('glass','#718C96',.12,0),('black','#172329',.48,0)]:
  p=ma[b.c[k]]['pbrMetallicRoughness'];p.update(baseColorFactor=linear(c)+[1],roughnessFactor=rough,metallicFactor=metal)
 b.c['insert']=b.m.mat('soft deck insert',linear('#AFBAB9'),0,.9);b.c['lighttrim']=b.m.mat('upholstery seam',linear('#E4E4DC'),0,.8)
 b.c['screen']=b.m.mat('chart display',linear('#14414F'),0,.2,emit=linear('#123746'));b.c['lightblue']=b.m.mat('top underside',linear('#547589'),0,.43)
 hull=b.group('EX_Hull');deck=b.group('EX_Deck');top=b.group('FIXED_TTop');hw=b.group('EX_Hardware');console=b.group('EX_Console');seats=b.group('EX_Seating')
 xs=np.linspace(-3.75,3.75,224)
 # Topsides and V-bottom are separately shaded at the chine, not a soft balloon.
 for side in [-1,1]:
  for part in ['topsides','bottom']:
   v=[];f=[];n=24 if part=='topsides' else 15
   for x in xs:
    w,s,c,k=station(x)
    for j in range(n+1):
     u=j/n
     if part=='topsides':z=w*(1-.11*u-.018*math.sin(math.pi*u));y=s+(c-s)*u
     else:z=w*.89*(1-u);y=c+(k-c)*u
     v.append([x,y,side*z])
   for i in range(len(xs)-1):
    for j in range(n):a=i*(n+1)+j;f.extend([[a,a+1,a+n+1],[a+1,a+n+2,a+n+1]])
   b.add('Fair continuous '+part,surf(v,f,[0,-.2,side]),'blue' if part=='topsides' else 'white',hull,True)
  # Four small lifting strake segments follow the forward hull instead of decorative stripe wedges.
  for fraction in [.36,.67]:
   pts=[]
   for x in np.linspace(-3.68,2.25,96):
    w,s,c,k=station(x);pts.append([x,k+(c-k)*fraction-.006,side*w*.89*fraction])
   b.tube('Bottom strake',pts,.014,'white',hull,8)
 # Transom fits the V-section; no oversize cube protruding under the bow.
 w,s,c,k=station(-3.75);v=[[-3.75,s,-w],[-3.75,s,w],[-3.75,c,w*.89],[-3.75,k,0],[-3.75,c,-w*.89]]
 b.add('Shaped transom',surf(v,[[0,1,2],[0,2,3],[0,3,4]],[-1,0,0]),'blue',hull,False)
 outline=np.array([[x,station(x)[0]-.08] for x in xs]+[[x,-station(x)[0]+.08] for x in xs[::-1]])
 # Cockpit floor and liner; foredeck closes toward stem without a protruding vertical plane.
 from shapely.geometry import Polygon,box as clipbox
 floor=Polygon(outline*np.array([1,.91])).intersection(clipbox(-3.69,-5,.76,5));p=np.array(floor.exterior.coords)[:-1]
 b.add('Cockpit sole',slab(p,.31,.35),'white',deck)
 cockpit=rounded([[-2.72,-1.025],[.57,-1.03],[.74,-.91],[.74,.91],[.57,1.03],[-2.72,1.025]],.08)
 b.add('Cockpit nonslip field',slab(cockpit,.352,.358),'insert',deck)
 # Raised casting platforms with genuine holes beneath storage lids.
 bow=Polygon(outline).intersection(clipbox(.73,-5,3.10,5));bp=np.array(bow.exterior.coords)[:-1]
 lids=[('Fishbox',1.70,0,1.46,.66,.81),('Port rod locker',1.52,-.81,1.17,.27,.81),('Starboard rod locker',1.52,.81,1.17,.27,.81),('Anchor',2.75,0,.56,.44,.83),('Battery access',-2.30,0,.56,.74,.36),('Port aft locker',-3.22,-.72,.61,.53,.72)]
 holes=[]
 for name,x,z,L,W,y in lids[:3]:holes.append(rounded_loop(x,0,z,L+.022,W+.022,.045)[:,[0,2]])
 b.add('Forward casting platform',slab(bp,.761,.786,holes),'white',deck)
 aft=rounded([[-3.66,-1.035],[-2.81,-1.04],[-2.76,-.92],[-2.76,.92],[-2.81,1.04],[-3.66,1.035]],.07)
 opening=rounded_loop(-3.20,0,.67,.66,.54,.085)[:,[0,2]]
 b.box('Bow platform riser',[.733,.555,0],[.035,.41,2.085],'white',deck,.016)
 b.add('Aft casting platform',slab(aft,.35,.698,[opening]),'white',deck)
 for name,x,z,L,W,y in lids:
  poly=rounded_loop(x,0,z,L+.036,W+.036,.045)[:,[0,2]]
  b.add('Recessed hatch lip',slab(poly,y-.019,y-.011),'darkdeck',deck)
  b.box(name+' lid',[x,y,z],[L,.025,W],'white',deck,.036)
  b.box(name+' nonslip',[x,y+.014,z],[L-.044,.003,W-.044],'insert',deck,.035)
  b.ring('Recessed lift latch',[x+L*.31,y+.018,z],.024,.004,'chrome',hw)
  b.cyl('Latch recess',[x+L*.31,y+.015,z],.019,.005,'black',hw)
  for dz in [-W*.29,W*.29]:b.box('Flush hinge leaf',[x-L*.43,y+.018,z+dz],[.07,.009,.038],'chrome',hw,.006)
 # Continuous side molding, cap and thinner rub rail follow the exact hull stations.
 for side in [-1,1]:
  v=[];f=[];cap=[];cf=[]
  for x in xs:
   w,s,c,k=station(x);inner=max(.002,w-.15);outer=max(.003,w-.018)
   ly=.352 if x<=.73 else .785 if x<3.0 else max(.785,s-.085)
   # Upper surfaces must not protrude through the narrow lower forebody.
   if ly>=c:
    u=np.clip((s-ly)/(s-c),0,1);lw=w*(1-.11*u-.018*math.sin(math.pi*u))
   else:lw=w*.89*max(0,(ly-k)/max(c-k,.0001))
   v.extend([[x,s-.05,side*inner],[x,ly,side*max(.001,min(inner,lw-.05))]])
   cap.extend([[x,s+.01,side*outer],[x,s+.022,side*(outer-.035 if outer>.04 else .001)],[x,s+.013,side*inner]])
  for i in range(len(xs)-1):
   a=i*2;f.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
   a=i*3
   for j in range(2):cf.extend([[a+j,a+j+1,a+j+3],[a+j+1,a+j+4,a+j+3]])
  b.add('Molded internal coaming',surf(v,f,[0,0,-side]),'white',deck,True)
  b.add('Sculpted broad gunwale',surf(cap,cf,[0,1,0]),'white',deck,True)
  rub=[[x,station(x)[1]-.019,side*(station(x)[0]+.003)] for x in xs]
  b.tube('Slim rub-rail extrusion',rub,.026,'black',hull,12)
  rub2=np.array(rub);rub2[:,2]+=side*.018;b.tube('Stainless rub-rail insert',rub2,.009,'chrome',hull,10)
  # Deliberate narrow boot stripe, conformal to body; no broad floating polygons.
  pts=[]
  for x in np.linspace(-3.68,3.02,130):
   w,s,c,k=station(x);u=.70;pts.append([x,s+(c-s)*u,side*(w*(1-.11*u-.018*math.sin(math.pi*u))+.003)])
  b.tube('Fine hull accent',pts,.008,'silver',hull,8)
 # Close remaining forepeak with sloped skin following the sheer.
 vs=[];fs=[]
 for x in np.linspace(2.99,3.748,45):
  w,s,_,_=station(x);y=.82+(s-.86)*smooth(3.0,3.7,x)
  vs.extend([[x,y,-max(.001,w-.12)],[x,y,max(.001,w-.12)]])
 for i in range(44):a=2*i;fs.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
 b.add('Closed rising forepeak',surf(vs,fs,[0,1,0]),'white',deck,True)
 # Livewell is a modeled opening and bowl. Closed during recovery; service lid independently inspectable.
 b.box('Livewell floor',[-3.2,.43,.67],[.58,.035,.46],'lightblue',deck,.06)
 for z in [.415,.925]:b.box('Livewell side',[-3.2,.555,z],[.60,.245,.025],'lightblue',deck,.015)
 for x in [-3.5,-2.9]:b.box('Livewell end',[x,.555,.67],[.025,.245,.49],'lightblue',deck,.015)
 hatch=b.group('MOV_Livewell',deck,[-2.87,.723,.67]);poly=rounded_loop(-.33,0,0,.65,.54,.08)[:,[0,2]]
 hole=rounded_loop(-.33,0,0,.46,.36,.08)[:,[0,2]]
 b.add('Livewell lid surround',slab(poly,-.014,.014,[hole]),'white',hatch)
 b.add('Tinted livewell inspection panel',slab(hole,-.003,.004),'glass',hatch)
 b.ring('Livewell latch',[-.55,.016,0],.024,.005,'chrome',hatch)
 # Console designed as a single tapered body, with a sloped helm and wraparound windshield.
 b.add('Sculpted center console',loft([(.35,-.17,1.32,1.03,6),(.40,-.17,1.33,1.04,6),(.80,-.20,1.22,1.00,5),(1.12,-.24,1.08,.92,5),(1.32,-.22,1.04,.88,5),(1.38,-.20,.97,.84,5)],96),'white',console,True)
 # Rear fascia in an inclined plane; nothing floats behind the wheel.
 angle=-.20
 box_rotate(b,'Helm graphite fascia',[-.764,1.175,0],[.041,.39,.78],'black',console,[0,0,1],angle,.028)
 for z in [-.185,.185]:
  box_rotate(b,'Instrument bezel',[-.795,1.235,z],[.032,.221,.319],'darkdeck',console,[0,0,1],angle,.017)
  box_rotate(b,'Glass chart display',[-.814,1.237,z],[.011,.186,.279],'screen',console,[0,0,1],angle,.012)
  for k in range(4):b.tube('Chart contour',[[-.823,1.18+k*.032,z-.114],[-.823,1.187+k*.032,z-.046],[-.823,1.173+k*.032,z+.112]],.0018,'lightblue',console,6)
 for z in np.linspace(-.27,.27,6):b.cyl('Helm illuminated switch',[-.837,1.003,z],.012,.010,'chrome',console,'x',16)
 b.cyl('Steering column',[-.92,.965,.18],.043,.25,'black',console,'x')
 b.ring('Soft steering rim',[-1.06,.965,.18],.146,.015,'black',console,'x');b.cyl('Steering boss',[-1.065,.965,.18],.035,.02,'chrome',console,'x')
 for a in np.linspace(0,TAU,3,endpoint=False):b.tube('Steering spoke',[[-1.065,.965,.18],[-1.065,.965+.132*math.cos(a),.18+.132*math.sin(a)]],.009,'chrome',console)
 b.box('Throttle saddle',[-.84,1.021,-.34],[.15,.07,.10],'darkdeck',console,.022)
 curved_tube(b,'Throttle control',[[-.83,1.04,-.34],[-.80,1.13,-.34],[-.74,1.20,-.34]],.019,'chrome',console)
 b.box('Throttle grip',[-.74,1.20,-.34],[.076,.032,.069],'black',console,.014)
 # Three-sided glazing has deliberate curvature, thickness, and edge surrounds.
 poly=rounded([[.24,-.45],[.40,-.31],[.42,.31],[.24,.45],[-.31,.45]],.16,12)
 # A U, not a closed polyline across the helm opening.
 path=[]
 for z in np.linspace(-.41,.41,33):path.append([.34+.05*(1-(z/.42)**2),z])
 path=np.r_[np.array([[-.39,-.43],[-.12,-.45],[.22,-.43]]),np.array(path),np.array([[.22,.43],[-.12,.45],[-.39,.43]])]
 v=[];f=[];lower=[];upper=[]
 for x,z in path:
  v.extend([[x,1.36,z],[x-.15,1.97,z*.985]]);lower.append([x,1.36,z]);upper.append([x-.15,1.97,z*.985])
 for i in range(len(path)-1):a=i*2;f.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
 b.add('Bent wraparound windscreen',trimesh.Trimesh(v,f,process=False),'glass',console,True)
 b.tube('Windshield base gasket',lower,.010,'black',console,8);b.tube('Windshield top edge',upper,.008,'darkdeck',console,8)
 for i in [0,-1]:b.tube('Windshield trailing edge',[lower[i],upper[i]],.012,'darkdeck',console,10)
 # Forward console seat compact; does not obstruct side walkways.
 b.box('Forward seat plinth',[.45,.52,0],[.62,.32,.85],'white',seats,.07)
 b.box('Forward console cushion',[.46,.709,0],[.64,.11,.79],'fabric',seats,.055)
 box_rotate(b,'Forward back cushion',[.375,1.02,0],[.12,.44,.79],'fabric',seats,[0,0,1],-.08,.055)
 # Console maintenance door fitted to side with matching narrow reveals.
 b.box('Service hatch recess',[-.18,.77,-.503],[.66,.61,.014],'black',console,.04)
 b.box('Service hatch panel',[-.18,.77,-.517],[.629,.578,.019],'white',console,.038)
 b.ring('Service latch',[-.415,.77,-.531],.024,.005,'chrome',console,'z')
 # Rigid integrated top supports; swept tubes return to the console rather than random forest of poles.
 for side in [-1,1]:
  z=side*.54
  curved_tube(b,'Forward swept top support',[[.22,.44,z],[.23,1.30,z],[.06,2.1,z*.98],[-.05,2.54,z*.98]],.032,'darkdeck',top)
  curved_tube(b,'Aft swept top support',[[-1.19,.39,z],[-1.19,1.27,z],[-1.23,2.1,z],[-1.35,2.54,z*.98]],.033,'darkdeck',top)
  curved_tube(b,'Top cross brace',[[-1.32,2.37,z],[-.64,2.49,z],[.04,2.40,z]],.022,'darkdeck',top)
  for x in [-1.19,.22]:
   b.box('Top base shoe',[x,.40,z],[.12,.037,.098],'chrome',top,.018)
   for dx in [-.04,.04]:b.cyl('Base fastener',[x+dx,.422,z],.008,.007,'chrome',top,'y',8)
 # Long shallow crowned roof, not an extruded rectangular plate.
 b.add('Crowned composite hardtop',loft([(2.529,-.30,2.56,1.78,5),(2.55,-.30,2.71,1.90,5),(2.586,-.30,2.74,1.92,5),(2.625,-.30,2.63,1.87,5),(2.655,-.30,2.30,1.61,4)],112),'white',top,True)
 b.add('Molded underside inset',loft([(2.519,-.30,2.42,1.62,5),(2.54,-.30,2.49,1.70,5)],96),'lightblue',top,True)
 b.box('Overhead electronics compartment',[-.33,2.39,0],[.62,.25,.50],'white',top,.045)
 b.box('Overhead compartment door',[-.657,2.389,0],[.018,.16,.395],'black',top,.018)
 for side in [-1,1]:
  for x in [-1.04,.37]:
   b.cyl('Hardtop recessed speaker',[x,2.516,side*.55],.075,.012,'white',top)
   b.cyl('Speaker perforation bed',[x,2.509,side*.55],.060,.010,'darkdeck',top)
   for zoff in [-.035,0,.035]:b.tube('Speaker cross grille',[[x-.045,2.50,side*.55+zoff],[x+.045,2.50,side*.55+zoff]],.0035,'white',top,6)
   b.cyl('Recessed downlight',[x+.17,2.513,side*.55],.026,.012,'amber',top)
 # Hollow rocket launchers (fishing rod holders), not solid stainless poles.
 for z in [-.61,-.205,.205,.61]:
  a=np.array([-1.54,2.54,z]);end=a+[-.115,.18,0];axis=(end-a)/np.linalg.norm(end-a)
  # Open metal tube with dark interior only at the far base.
  m=tubes([a,end],.032,20);b.add('Hollow fishing-rod tube',m,'chrome',top,True)
  mt=trimesh.creation.annulus(r_min=.024,r_max=.033,height=.008,sections=28);mt.apply_transform(trimesh.geometry.align_vectors([0,0,1],axis));mt.apply_translation(end);b.add('Rod-holder rolled lip',mt,'chrome',top,True)
  b.tube('Rod-holder backing strap',[a+[.025,0,-.04],a+[.025,0,.04]],.013,'darkdeck',top)
 ant=b.group('MOV_Bay_antenna',top,[.16,2.657,.39]);b.tube('Short VHF antenna',[[0,0,0],[0,.39,0]],.009,'white',ant);b.cyl('Antenna hinge',[0,.007,0],.025,.04,'chrome',ant,'z');b.m.track(ant,'rotation',lambda t:quat([0,0,1],math.pi/2*smooth(.025,.18,t)))
 # Helm pedestal with two wraparound seats, stitched bolsters and readable leg clearance.
 for z in [-.45,.45]:
  curved_tube(b,'Leaning-post tubular frame',[[-1.90,.37,z],[-1.88,.78,z],[-1.30,.78,z],[-1.28,.37,z]],.027,'darkdeck',seats)
 b.box('Leaning-post tackle station',[-1.60,.66,0],[.60,.40,.89],'white',seats,.055)
 for y in [.56,.665,.77]:
  b.box('Tackle drawer gasket',[-1.912,y,0],[.018,.086,.72],'darkdeck',seats,.014)
  b.box('Tackle drawer face',[-1.925,y,0],[.016,.069,.70],'white',seats,.012)
  b.box('Tackle drawer recessed pull',[-1.938,y,0],[.018,.012,.12],'black',seats,.004)
 for z in [-.265,.265]:
  b.box('Individual helm cushion',[-1.57,.96,z],[.65,.16,.475],'fabric',seats,.061)
  box_rotate(b,'Canted bolster back',[-1.825,1.26,z],[.165,.57,.475],'fabric',seats,[0,0,1],-.12,.068)
  box_rotate(b,'Contrast backrest inset',[-1.736,1.274,z],[.014,.40,.34],'piping',seats,[0,0,1],-.12,.006)
  b.box('Seat inset',[-1.56,1.044,z],[.46,.008,.34],'piping',seats,.026)
  for off in [-.201,.201]:
   curved_tube(b,'Sewn bolster edge',[[-1.85,1.07,z+off],[-1.79,1.52,z+off],[-1.75,1.54,z+off]],.004,'lighttrim',seats)
  for y in np.linspace(1.13,1.40,5):b.tube('Seat stitch detail',[[-1.72+(y-1.27)*.1,y,z-.139],[-1.72+(y-1.27)*.1,y,z+.139]],.0018,'lighttrim',seats,6)
 for z in [-.54,.54]:
  b.box('Slim padded armrest',[-1.57,1.185,z],[.41,.055,.065],'darkdeck',seats,.025)
 b.tube('Helm footrest',[[-1.20,.61,-.47],[-1.20,.61,.47]],.031,'chrome',seats)
 b.box('Compact cockpit cooler',[-2.49,.53,0],[.45,.34,.72],'white',seats,.055)
 b.box('Cooler cushion lid',[-2.49,.731,0],[.47,.076,.74],'fabric',seats,.035)
 # Side bolsters and recessed hardware are intentionally sparse to leave casting space.
 for side in [-1,1]:
  for x,L in [(-2.06,.74),(-.61,1.4)]:
   z=side*(station(x)[0]-.17);b.box('Cockpit coaming pad',[x,.70,z],[L,.16,.07],'fabric',deck,.031)
   b.tube('Coaming pad seam',[[x-L*.43,.753,z-side*.039],[x+L*.43,.753,z-side*.039]],.0035,'lighttrim',deck,6)
  for x in [-3.15,.15,2.47]:
   w,s,_,_=station(x);z=side*(w-.068)
   b.box('Pop-up cleat socket',[x,s+.03,z],[.185,.018,.085],'chrome',hw,.024)
   b.tube('Cleat crossbar',[[x-.061,s+.046,z],[x+.061,s+.046,z]],.012,'chrome',hw)
   b.cyl('Rod-socket recess',[x-.18,s+.026,z],.027,.008,'black',hw)
   b.ring('Rod-socket polished flange',[x-.18,s+.034,z],.032,.005,'chrome',hw)
  z=side*1.107;b.cyl('Cockpit speaker',[-.65,.535,z],.066,.014,'white',hw,'z',28)
  b.cyl('Cockpit speaker inset',[-.65,.535,z-side*.01],.053,.018,'darkdeck',hw,'z',28)
  b.box('Recessed courtesy light',[-1.35,.44,side*1.077],[.27,.017,.011],'amber',hw,.004)
  b.cyl('Drain socket',[-2.74,.36,side*.89],.026,.007,'chrome',hw)
  for x in [-.88,-.54,-.20]:b.box('Horizontal rod rack',[x,.51,side*1.03],[.045,.09,.09],'darkdeck',hw,.02)
 # Single outboard: shaped cowling, lower unit, real steering and tilt pivots.
 b.box('Transom mounting pad',[-3.80,.29,0],[.16,.49,.40],'black',hw,.028)
 b.box('Outboard jackplate',[-3.93,.34,0],[.25,.55,.34],'chrome',hw,.025)
 eng=b.group('MOV_Outboard_trim',0,[-4.05,.49,0]);steer=b.group('MOV_Outboard_steer',eng)
 b.add('Flowing outboard cowling',loft([(-.02,-.16,.50,.43,4),(.04,-.16,.58,.49,4),(.36,-.16,.61,.50,4),(.63,-.13,.49,.44,4),(.77,-.09,.31,.34,3),(.79,-.085,.18,.25,3)],88),'white',steer,True)
 for side in [-1,1]:
  b.box('Cowling blue inlay',[-.17,.32,side*.251],[.40,.103,.012],'blue',steer,.005)
  for x in [-.30,-.235,-.17,-.105]:b.box('Engine intake flute',[x,.53,side*.232],[.018,.078,.008],'black',steer,.003)
 b.add('Outboard midsection',loft([(-.73,-.12,.21,.17,4),(-.24,-.14,.27,.22,4),(-.02,-.16,.39,.28,4)],64),'silver',steer,True)
 b.ell('Hydrodynamic lower unit',[-.16,-.80,0],[.26,.10,.105],'silver',steer)
 b.box('Ventilation plate',[-.17,-.64,0],[.55,.025,.35],'silver',steer,.012)
 b.box('Skeg',[-.14,-.974,0],[.18,.26,.041],'silver',steer,.017)
 prop=b.group('MOV_Bay_prop',steer,[-.39,-.80,0]);b.cyl('Propeller hub',[0,0,0],.057,.14,'chrome',prop,'x')
 for a in np.linspace(0,TAU,3,endpoint=False):
  v=[[0,.05,-.012],[.01,.13,-.048],[.041,.207,-.011],[.064,.181,.059],[.02,.081,.044]];m=trimesh.Trimesh(v,[[0,1,4],[1,2,3],[1,3,4]],process=False);m.apply_transform(trimesh.transformations.rotation_matrix(a,[1,0,0]));b.add('Swept propeller blade',m,'chrome',prop)
 b.m.track(eng,'rotation',lambda t:quat([0,0,1],-.36*smooth(.04,.18,t)));b.m.track(steer,'rotation',lambda t:quat([0,1,0],.16*math.sin(t*TAU)*(1-smooth(.04,.18,t))))
 for side in [-1,1]:
  b.box('Trim tab',[-3.87,-.10,side*.79],[.27,.022,.33],'chrome',hw,.009)
  b.tube('Trim-tab ram',[[-3.76,.15,side*.79],[-3.92,-.08,side*.79]],.024,'black',hw)
 curved_tube(b,'Engine flexible rigging',[[-3.79,.43,-.22],[-3.97,.50,-.24],[-4.16,.44,-.15]],.025,'black',hw)
 # Boarding step starboard keeps clear of engine (appearance reservation only).
 for z in [.86,1.08]:curved_tube(b,'Boarding ladder rail',[[-3.75,.46,z],[-3.94,.43,z],[-4.01,-.34,z]],.020,'chrome',hw)
 for y in [.27,.02,-.23]:b.tube('Boarding ladder tread',[[-4.0,y,.86],[-4.0,y,1.08]],.025,'darkdeck',hw)
 # Trolling motor and rods move rigidly, never scaled/hidden. Full paths remain provisional.
 tr=b.group('MOV_Trolling_motor',deck,[2.49,.94,-.73]);b.box('Bow motor quick-release base',[0,0,0],[.49,.06,.12],'darkdeck',tr,.022)
 shaft=b.group('MOV_Trolling_shaft',tr);b.tube('Trolling motor shaft',[[0,-1.13,0],[0,.27,0]],.018,'darkdeck',shaft)
 b.ell('Trolling lower unit',[-.12,-1.09,0],[.22,.072,.071],'black',shaft);b.box('Trolling motor head',[0,.29,0],[.22,.077,.10],'darkdeck',shaft,.029)
 b.m.track(shaft,'rotation',lambda t:quat([0,0,1],-math.pi/2*smooth(.025,.16,t)))
 for j in range(4):
  side=1 if j<2 else -1;x=-2.15+(j%2)*.30;rod=b.group('MOV_Rod_'+str(j),hw,[x,.66,side*1.045]);b.tube('Carbon fishing blank',[[0,0,0],[0,1.67,.01],[0,1.99,.04]],.005,'black',rod,8)
  b.tube('Rod handle',[[0,0,0],[0,.30,0]],.019,'darkdeck',rod)
  b.ell('Reel body',[.035,.22,.036],[.041,.052,.035],'chrome',rod)
  for yy in [.65,.98,1.28,1.55,1.78,1.95]:b.ring('Rod line eye',[.013,yy,.024],.011,.0023,'chrome',rod,'z')
  b.m.track(rod,'rotation',lambda t:quat([0,0,1],-math.pi/2*smooth(.005,.14,t)))
 # Subtle, surface-conforming graphics with no giant floating nameplate.
 for side in [-1,1]:
  p=b.group('EX_Brand_'+str(side),hull)
  b.text('ATLAS',[-2.92 if side>0 else -2.10,.42,side*1.22],.11,'silver',p,facing=side)
  b.text('BAY 25',[-2.91 if side>0 else -2.42,.285,side*1.22],.058,'silver',p,facing=side)
  for (par,ma),items in b.m.parts.items():
   if par!=p:continue
   for name,v,f,n in items:
    for pt in v:
     w,s,c,k=station(float(pt[0]));u=(s-pt[1])/(s-c);pt[2]=side*(w*(1-.11*u-.018*math.sin(math.pi*u))+.004)
 b.m.g['scenes'][0]['extras']={'revision':'Bay 25 / Studio 03','rigid_t_top':True,'design_study_only':True,'previous_fleet_unchanged':True,'change':'Rebuilt hull, coaming, cockpit, console, seating, top and outboard as one original design.'}
 stats=b.save('ATLAS_Bay_25.glb',60)
 print(json.dumps({'stage':'built','parts':len(b.inventory),'stats':stats},indent=2),flush=True)
 return b,stats

def materials():
 d=Doc(R/'staging/ATLAS_Bay_25.glb');g=d.g
 def tex(kind):
  n=256;yy,xx=np.mgrid[:n,:n];rng=np.random.default_rng(503)
  if kind=='fabric':a=239+3*np.sin(xx*math.pi)+3*np.sin(yy*math.pi)+rng.normal(0,1,(n,n))
  else:a=243+rng.normal(0,2,(n,n))
  arr=np.clip(a,0,255).astype('uint8');rgb=np.repeat(arr[:,:,None],3,2);stream=io.BytesIO();Image.fromarray(rgb).save(stream,format='PNG');data=stream.getvalue()
  d.b.extend(b'\0'*(-len(d.b)%4));vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(d.b),'byteLength':len(data)});d.b.extend(data)
  ii=len(g.setdefault('images',[]));g['images'].append({'name':'ATLAS '+kind,'mimeType':'image/png','bufferView':vi});si=len(g.setdefault('samplers',[]));g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497});ti=len(g.setdefault('textures',[]));g['textures'].append({'source':ii,'sampler':si});return ti
 texs={'fabric':tex('fabric'),'soft deck insert':tex('nonslip')}
 for ma in g['materials']:
  name=ma['name'];p=ma['pbrMetallicRoughness']
  if name in ['blue','white']:
   ma.setdefault('extensions',{})['KHR_materials_clearcoat']={'clearcoatFactor':.8 if name=='blue' else .35,'clearcoatRoughnessFactor':.16}
   if 'KHR_materials_clearcoat' not in g.setdefault('extensionsUsed',[]):g['extensionsUsed'].append('KHR_materials_clearcoat')
  if name in texs:p['baseColorTexture']={'index':texs[name]}
  if name=='glass':ma.update(doubleSided=True,alphaMode='BLEND');p['baseColorFactor']=[.20,.35,.40,.25];p['roughnessFactor']=.10
 for m in g['meshes']:
  for p in m['primitives']:
   name=g['materials'][p['material']]['name']
   if name not in texs:continue
   v=d.rd(p['attributes']['POSITION']);norm=d.rd(p['attributes']['NORMAL']);ax=np.argmax(abs(norm),axis=1);uv=np.zeros((len(v),2))
   for a,indices in [(0,[2,1]),(1,[0,2]),(2,[0,1])]:uv[ax==a]=v[ax==a][:,indices]*8
   p['attributes']['TEXCOORD_0']=d.acc(uv,'VEC2')
 d.write(R/'staging/ATLAS_Bay_25.glb')
if __name__=='__main__':
 b,stats=build();materials();(R/'staging/refine_stats.json').write_text(json.dumps(stats,indent=2))
