"""Bay 25 Studio 04: preserve approved forms; add restrained close-up detail.
All geometry is an appearance study, not equipment or vessel qualification.
Inputs are pinned Studio 03 assets. Coordinates: X forward, Y up, Z starboard.
"""
from pathlib import Path
import os,sys,copy,json,math,hashlib,io,shutil
import numpy as np
import trimesh
from PIL import Image,ImageDraw,ImageFont
from scipy.interpolate import PchipInterpolator
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));S=R/'site';O=R/'staging'
sys.path.insert(0,str(R/'source'));os.environ['FLEET_ROOT']=str(R)
from build_fleet import Builder,linear,rbox
from assemble import Doc
from meshkit import rounded
O.mkdir(parents=True,exist_ok=True)
BASE=S/'assets/ATLAS_Bay_25.glb'
shutil.copy2(BASE,S/'assets/ATLAS_Bay_25_Previous.glb')
d=Doc(BASE);original_node_count=len(d.g['nodes']);inventory=[]

def new(name):
 b=Builder(name)
 for key,c,r,m in [('white','#E4E6E2',.28,0),('darkdeck','#405360',.48,0),('fabric','#A8B4B4',.86,0),('piping','#CAD0CD',.81,0),('chrome','#B9C4C9',.24,1),('black','#162329',.55,0),('silver','#A9B8BE',.36,.75),('blue','#35556D',.26,0)]:
  p=b.m.g['materials'][b.c[key]]['pbrMetallicRoughness'];p.update(baseColorFactor=linear(c)+[1],roughnessFactor=r,metallicFactor=m)
 return b

def add_builder(b,parent,name):
 p=O/(name+'.glb');b.save(p.name,60);x=Doc(p);x.g.pop('animations',None);roots,_=d.append(x,d.node(parent),name+'_');inventory.extend(b.inventory)

def rb(b,n,loc,size,mat='chrome',axis=(0,0,1),a=0,r=.012):
 m=rbox(np.zeros(3),size,r);m.apply_transform(trimesh.transformations.rotation_matrix(a,axis));m.apply_translation(loc);b.add(n,m,mat,0,True)

def curve(b,n,pts,r=.004,ma='chrome'):
 pts=np.array(pts);t=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];vs=np.c_[*[PchipInterpolator(t,pts[:,i])(np.linspace(0,t[-1],40)) for i in range(3)]];b.tube(n,vs,r,ma,0,10)

def screw(b,p,axis='y',r=.009):
 b.cyl('Flush fastener head',p,r,.004,'chrome',0,axis,12)
 pp=np.array(p,float);j={'x':0,'y':1,'z':2}[axis];pp[j]+=.003 if j!=0 else -.003
 u=(j+1)%3;v=(j+2)%3
 for k in [u,v]:
  a=pp.copy();q=pp.copy();a[k]-=r*.45;q[k]+=r*.45;b.tube('Fastener drive slot',[a,q],r*.09,'black',0,6)

def closed_loop_xy(x,y,z,L,W,r):
 p=rounded([[-L/2,-W/2],[L/2,-W/2],[L/2,W/2],[-L/2,W/2]],r/min(L,W),12)
 return np.c_[x+p[:,0],np.full(len(p),y),z+p[:,1]]

# Seating: tailored rear panels and very fine seam paths, preserving cushion bodies.
b=new('Studio 04 / tailored upholstery')
for z in [-.265,.265]:
 rb(b,'Rear tailored bolster insert',[-1.918,1.273,z],[.014,.416,.351],'fabric',a=-.12,r=.030)
 # Rounded perimeter follows the tilted rear surface, not a flat decal in space.
 path=rounded([[-.166,-.197],[.166,-.197],[.166,.197],[-.166,.197]],.1,16)
 pts=[]
 for zz,yy in path:pts.append([-1.928+.12*yy,1.273+yy,z+zz])
 b.tube('Double stitched rear-panel welt',pts+[pts[0]],.0028,'piping',0,8)
 # Stitched diamonds clipped within inset; not a change to cushion outer geometry.
 for direction in [-1,1]:
  for offset in np.arange(-.44,.45,.105):
   line=[]
   for yy in np.linspace(-.17,.17,90):
    zz=direction*.72*yy+offset
    if abs(zz)<.142:line.append([-1.930+.12*yy,1.273+yy,z+zz])
   if len(line)>1:b.tube('Tailored diamond stitch',line,.0015,'piping',0,6)
 # Existing cushion top becomes visibly tailored with stitched edges.
 loop=closed_loop_xy(-1.57,1.047,z,.57,.402,.04);b.tube('Seat cushion perimeter seam',list(loop)+[loop[0]],.0025,'piping',0,8)
 # Seat-back hard shell below upholstery, compact rear grab handle.
 curve(b,'Integrated seat-back grab',[[-1.97,1.04,z-.14],[-2.005,1.055,z-.14],[-2.005,1.055,z+.14],[-1.97,1.04,z+.14]],.011,'darkdeck')
# Forward console cushion channels and seams: actual geometry on existing surface.
for z in [-.25,-.125,0,.125,.25]:
 b.tube('Forward cushion seam',[[.21,.767,z],[.70,.767,z]],.0020,'piping',0,6)
for y in [.89,.98,1.07,1.16]:
 b.tube('Forward backrest tailoring',[[.444+.08*(y-1.02),y,-.31],[.444+.08*(y-1.02),y,.31]],.0018,'piping',0,6)
# Cooler latches and low-profile under-seat hatch catches.
for z in [-.255,.255]:
 b.box('Cooler latch mounting',[-2.722,.58,z],[.010,.066,.031],'silver',0,.004)
 b.box('Cooler latch clasp',[-2.731,.585,z],[.014,.038,.017],'black',0,.003)
add_builder(b,'EX_Seating','DT04_Seating')

# Helm: bezel knobs, row of switches, glovebox rim, cup holders, access fittings.
b=new('Studio 04 / helm instruments')
for z in [-.185,.185]:
 # Knob and six face keys on the aft-facing bezel.
 b.cyl('Instrument control knob',[-.837,1.174,z+.115],.010,.008,'black',0,'x',20)
 b.ring('Knob metal rim',[-.842,1.174,z+.115],.010,.0015,'silver',0,'x')
 for zz in np.linspace(z-.10,z+.06,5):b.box('Instrument face key',[-.835,1.153,zz],[.007,.006,.016],'silver',0,.001)
# Engine stop lanyard reservation, not an operating electrical system.
b.cyl('Helm safety-switch bezel',[-.849,1.003,-.29],.020,.012,'black',0,'x',20)
curve(b,'Tether clip loop',[[-.86,1.003,-.29],[-.891,.966,-.29],[-.865,.940,-.29],[-.85,.965,-.29]],.003,'darkdeck')
# Flush side service hatch hinges and screw seats.
for y in [.60,.95]:
 b.box('Service hatch hinge leaf',[.085,y,-.536],[.037,.072,.008],'silver',0,.004)
 b.cyl('Service hinge knuckle',[.09,y,-.543],.008,.075,'chrome',0,'y',16)
 for yy in [y-.021,y+.021]:screw(b,[.078,yy,-.541],'z',.004)
# Console storage pocket edge on opposite side; existing body stays untouched.
b.box('Side glove-pocket reveal',[-.18,.83,.518],[.48,.27,.008],'darkdeck',0,.024)
b.box('Glove-pocket lid',[-.18,.83,.525],[.462,.252,.012],'white',0,.025)
b.ring('Glove-pocket latch',[-.36,.83,.534],.017,.003,'chrome',0,'z')
# Cup holder rings just outside helm fascia, on horizontal shelf.
for z in [-.34,.34]:
 b.cyl('Recessed cupholder well',[-.15,1.377,z],.042,.008,'black',0,'y',28)
 b.ring('Cupholder polished flange',[-.15,1.385,z],.044,.004,'chrome',0,'y')
add_builder(b,'EX_Console','DT04_Helm')

# Open-top electronics compartment gets a separate inner VHF visual head.
b=new('Studio 04 / hardtop fittings')
b.box('Overhead radio housing',[-.674,2.391,0],[.017,.112,.281],'darkdeck',0,.009)
b.box('Overhead radio display',[-.686,2.40,-.033],[.009,.040,.111],'screen',0,.004)
for z in [-.117,.115]:b.cyl('Radio rotary encoder',[-.691,2.393,z],.012,.011,'black',0,'x',20)
curve(b,'Handset cradle lead',[[-.63,2.335,.17],[-.58,2.30,.185],[-.53,2.255,.18]],.0035,'black')
b.box('Radio handset in cradle',[-.53,2.26,.18],[.057,.12,.043],'black',0,.013)
for side in [-1,1]:
 for x in [-1.04,.37]:
  b.ring('Speaker trim bezel',[x,2.503,side*.55],.065,.003,'silver')
  for zz in np.arange(-.045,.05,.015):
   leng=math.sqrt(max(.052**2-zz**2,0))
   b.tube('Speaker grille wire',[[x-leng,2.498,side*.55+zz],[x+leng,2.498,side*.55+zz]],.0015,'white',0,6)
  b.ring('Downlight recessed trim',[x+.17,2.505,side*.55],.028,.003,'silver')
 # mounting weld rings; leave approved main frame and hardtop unmodified.
 for x in [-1.19,.22]:
  b.ring('Frame base weld',[x,.424,side*.54],.035,.0027,'silver')
add_builder(b,'FIXED_TTop','DT04_Top')

# Gunwale + deck hardware: finer latch stems, drain grilles, fuel/water socket.
b=new('Studio 04 / deck fixtures')
# Hatch hinge pins, fine double border. Existing lids remain fixed and unscaled.
for x,z,L,W,y in [(1.70,0,1.46,.66,.81),(1.52,-.81,1.17,.27,.81),(1.52,.81,1.17,.27,.81),(2.75,0,.56,.44,.83),(-2.30,0,.56,.74,.36),(-3.22,-.72,.61,.53,.72)]:
 loop=closed_loop_xy(x,y+.017,z,L-.022,W-.022,.035);b.tube('Inset hatch perimeter stitch',list(loop)+[loop[0]],.0017,'silver',0,6)
 for dz in [-W*.29,W*.29]:
  b.cyl('Hatch hinge pin',[x-L*.43,y+.026,z+dz],.008,.046,'silver',0,'z',16)
  for dx in [-.023,.023]:screw(b,[x-L*.43+dx,y+.025,z+dz],'y',.004)
for side in [-1,1]:
 for x,y,z in [(-3.15,.82,1.17),(.15,.89,1.20)]:
  # Existing gunwale cleats have rounded shoes, add recessed end fixing only.
  for dx in [-.074,.074]:screw(b,[x+dx,y,side*z],'y',.006)
 # Stainless grate at cockpit drains.
 for z in [side*.89]:
  for q in [-.012,0,.012]:b.tube('Cockpit drain grille',[[-2.756,.367,z+q],[-2.724,.367,z+q]],.0018,'silver',0,6)
 # Fuel cap stays out of the casting path, surface-only illustrative fitting.
 b.cyl('Deck service-fill cap',[-3.34,.807,side*1.07],.036,.006,'chrome',0,'y',32)
 b.tube('Service-fill key slot',[[-3.356,.812,side*1.07],[-3.324,.812,side*1.07]],.002,'black',0,6)
 # Clear cockpit rub-edge identification, not bright decorative LEDs.
for z in [-.79,.79]:
 for yy in [.24,.38]:screw(b,[-3.897,yy,z],'x',.012)
# Small boarding tread bands within the existing ladder footprint.
for y in [.27,.02,-.23]:
 for z in np.linspace(.88,1.06,8):b.tube('Boarding tread traction',[[-4.022,y-.012,z],[-4.022,y+.012,z]],.0028,'black',0,6)
add_builder(b,'EX_Hardware','DT04_Hardware')

# Engine casing split line follows cowling cross-section; details inherit steer+tilt.
b=new('Studio 04 / outboard finish')
y=.19;L=.598;W=.486;xc=-.16;pts=[]
for a in np.linspace(0,2*math.pi,100):
 c=math.cos(a);s=math.sin(a);pts.append([xc+L*.5*math.copysign(abs(c)**.5,c),y,W*.5*math.copysign(abs(s)**.5,s)])
b.tube('Cowling lower reveal',pts,.0021,'black',0,8)
for side in [-1,1]:
 b.box('Cowling trim badge',[-.19,.311,side*.259],[.17,.024,.005],'silver',0,.002)
 # lower service fasteners, matching two-piece visual cowling rather than random rivets.
 for x in [-.31,-.10]:screw(b,[x,.078,side*.22],'z',.005)
b.cyl('Steering pivot collar',[.024,-.26,0],.073,.035,'black',0,'y',32)
add_builder(b,'MOV_Outboard_steer','DT04_Engine')

# Original, deliberately non-navigational instrument textures.
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):
 try:return ImageFont.truetype(fontpath,n)
 except OSError:return ImageFont.load_default()
def instrument(kind):
 im=Image.new('RGB',(1024,640),'#071820');dr=ImageDraw.Draw(im)
 dr.rounded_rectangle((4,4,1019,635),18,fill='#10252E',outline='#6B919F',width=3)
 dr.rectangle((18,18,1006,83),fill='#0B1D25');dr.text((40,34),'ATLAS  /  '+kind.upper(),font=font(28),fill='#EBF3F2')
 dr.text((865,40),'DEMO',font=font(21),fill='#CAD89B')
 if kind=='chart':
  for x in range(35,1010,100):dr.line((x,98,x,565),fill='#254650',width=1)
  for y in range(110,570,80):dr.line((26,y,996,y),fill='#254650',width=1)
  land=[(60,95),(280,95),(305,157),(260,214),(339,293),(265,377),(188,430),(115,549),(31,563),(31,95)]
  dr.polygon(land,fill='#798D85');dr.line(land,fill='#BDCDC5',width=3)
  for k in range(5):
   pts=[(365+k*80,99),(415+k*76,165),(351+k*79,240),(427+k*80,341),(352+k*77,425),(305+k*79,558)]
   dr.line(pts,fill=['#426A76','#426A76','#355865','#355865','#2A4955'][k],width=3)
  dr.line([(545,538),(615,430),(590,303),(697,179)],fill='#C7D5A6',width=5)
  dr.polygon([(603,334),(621,374),(602,365),(584,374)],fill='#F5F4E5')
  dr.text((880,113),'N ↑',font=font(31),fill='#ECF5F4')
 else:
  dr.rectangle((36,111,988,556),fill='#0F3244')
  rng=np.random.default_rng(24)
  for x in range(36,989,3):
   y=int(415+33*math.sin(x/120)+15*math.sin(x/47))
   dr.line((x,y,x,554),fill='#C19457',width=3);dr.line((x,y-7,x,y+11),fill='#E6D89E',width=3)
  for x,y in [(255,260),(515,318),(744,236),(677,290)]:dr.arc((x-22,y-10,x+22,y+11),195,345,fill='#E3D5B0',width=5)
  for y in range(160,550,85):dr.line((37,y,989,y),fill='#3B5964',width=1)
  dr.text((57,125),'ILLUSTRATIVE DISPLAY',font=font(19),fill='#91B8C2')
 dr.rectangle((18,576,1006,624),fill='#0B1D25');dr.text((37,588),'MODEL STUDY  ·  NOT FOR NAVIGATION',font=font(21),fill='#87A8B2')
 return im

def embed(im,name):
 stream=io.BytesIO();im.save(stream,format='PNG');blob=stream.getvalue();d.b.extend(b'\0'*(-len(d.b)%4));bv=len(d.g['bufferViews']);d.g['bufferViews'].append({'buffer':0,'byteOffset':len(d.b),'byteLength':len(blob)});d.b.extend(blob)
 ii=len(d.g.setdefault('images',[]));d.g['images'].append({'name':name,'mimeType':'image/png','bufferView':bv});si=len(d.g.setdefault('samplers',[]));d.g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071});tx=len(d.g.setdefault('textures',[]));d.g['textures'].append({'source':ii,'sampler':si});return tx
chart=embed(instrument('chart'),'ATLAS illustrative chart');sonar=embed(instrument('sounder'),'ATLAS illustrative sounder')
# Split the old paired screen primitive by location to map each actual glass face.
mi=d.g['nodes'][d.node('EX_Console__chart_display')]['mesh'];old=d.g['meshes'][mi]['primitives'];replacement=[]
for pr in old:
 v=d.rd(pr['attributes']['POSITION']);n=d.rd(pr['attributes']['NORMAL']);faces=d.rd(pr['indices']).reshape(-1,3)
 for side,tx in [(-1,chart),(1,sonar)]:
  selected=faces[np.mean(v[faces,2],axis=1)*side>0];ids,inv=np.unique(selected,return_inverse=True);vv=v[ids];nn=n[ids]
  z0,z1=vv[:,2].min(),vv[:,2].max();y0,y1=vv[:,1].min(),vv[:,1].max();uv=np.c_[(vv[:,2]-z0)/(z1-z0),(vv[:,1]-y0)/(y1-y0)]
  # Left-to-right when viewed from aft is +Z; UV v inversion handled by renderer convention.
  uv[:,1]=1-uv[:,1]
  ma=copy.deepcopy(d.g['materials'][pr['material']]);ma['name']='DT04 '+('chart' if side<0 else 'sounder')+' glass';ma['pbrMetallicRoughness'].update(baseColorFactor=[1,1,1,1],baseColorTexture={'index':tx},roughnessFactor=.25,metallicFactor=0);ma['emissiveFactor']=[.18,.18,.18];ma['emissiveTexture']={'index':tx}
  mat=len(d.g['materials']);d.g['materials'].append(ma)
  replacement.append({'attributes':{'POSITION':d.acc(vv),'NORMAL':d.acc(nn),'TEXCOORD_0':d.acc(uv,'VEC2')},'indices':d.acc(inv.reshape(-1,3),'SCALAR',5125),'material':mat})
d.g['meshes'][mi]['primitives']=replacement
# Remove Studio 03's generic contour-line overlays now that the actual screens are textured.
cn=d.node('EX_Console');overlay=d.node('EX_Console__top_underside');d.g['nodes'][cn]['children']=[i for i in d.g['nodes'][cn]['children'] if i!=overlay]
# Upholstery normal texture on NEW tailored fabric only, preserves existing palette.
rng=np.random.default_rng(4);n=256;yy,xx=np.mgrid[:n,:n];arr=np.stack([128+3*np.sin(xx*.9),128+3*np.cos(yy*.9),np.full((n,n),255)],axis=-1).astype('uint8');nt=embed(Image.fromarray(arr),'Micro woven upholstery normal')
for m in d.g['materials'][14:]:
 if m.get('name')=='fabric':m['name']='DT04 woven inset';m['normalTexture']={'index':nt,'scale':.35}
for mesh in d.g['meshes']:
 for pr in mesh['primitives']:
  if d.g['materials'][pr['material']]['name']!='DT04 woven inset':continue
  v=d.rd(pr['attributes']['POSITION']);pr['attributes']['TEXCOORD_0']=d.acc(v[:,[2,1]]*12,'VEC2')
# No root transforms or shape swaps. Original base-body accessors and transforms remain unchanged.
d.g['scenes'][0].setdefault('extras',{}).update(revision='Bay 25 Studio 04',scope='Close-up finish pass; approved Studio 03 hull and fixed top unchanged.',integrated_into_explorer=False)
d.write(O/'ATLAS_Bay_25.glb');shutil.copy2(O/'ATLAS_Bay_25.glb',BASE)
# Evidence uses the source data arrays, not object names or triangle counts as quality claims.
base=Doc(S/'assets/ATLAS_Bay_25_Previous.glb')
preserved={}
for name in ['EX_Hull','FIXED_TTop']:
 original_meshes=[i for i in base.descendants(base.node(name)) if 'mesh' in base.g['nodes'][i]]
 maxdelta=0.0
 for i in original_meshes:
  oldnode=base.g['nodes'][i];newnode=d.g['nodes'][d.node(oldnode['name'])]
  for p,q in zip(base.g['meshes'][oldnode['mesh']]['primitives'],d.g['meshes'][newnode['mesh']]['primitives']):
   a=base.rd(p['attributes']['POSITION']);b2=d.rd(q['attributes']['POSITION']);assert a.shape==b2.shape;maxdelta=max(maxdelta,float(np.abs(a-b2).max()))
 preserved[name]={'original_meshes':len(original_meshes),'max_original_local_vertex_change_m':maxdelta}
assert all(v['max_original_local_vertex_change_m']==0 for v in preserved.values())
channels=[c for an in d.g.get('animations',[]) for c in an['channels']]
report={'revision':'Bay 25 / Studio 04','scope':'Standalone Bay close-up refinement. All other fleet models unchanged.','approved_base_preservation':preserved,'animation_channels':len(channels),'scale_animation_channels':sum(c['target']['path']=='scale' for c in channels),'added_detail_items':len(inventory),'integrated_into_explorer':False,'engineering_validated':False,'changes':['Tailored bolster back panels with stitched diamond seams and compact grab handles','Original illustrative chart and sounder textures on actual instrument faces; tactile switches and knobs','Console storage and service-hatch hardware','Hardtop speaker bezels, grille wires, radio/handset and mounting details','Refined hatch hinges, drain grilles, fill caps and boarding-tread traction','Engine cowling split line, badges and service fasteners; follows existing engine animation'],'limits':['Cosmetic geometry; no hardware load qualification','Full recovery and clearance checks not performed','Studio 03 fishing equipment choreography retained','Explorer still carries its older Fleet 02 Bay','Chase 12 and the other vessels not modified in this pass']}
(S/'bay04_report.json').write_text(json.dumps(report,indent=2));(R/'detail_inventory.json').write_text(json.dumps(inventory,indent=2));print(json.dumps(report,indent=2))
