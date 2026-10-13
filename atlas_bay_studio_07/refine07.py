"""Bay Studio 07: original visual 300-class outboard and tailored materials.
Appearance geometry, not engine internals, installation or power qualification.
Metres, X forward, Y up, Z starboard. Preserve approved hull and T-top.
"""
from pathlib import Path
import os,sys,json,shutil,math
import numpy as np
import trimesh
from scipy.interpolate import PchipInterpolator as Pchip
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));os.environ['FLEET_ROOT']=str(R);sys.path.insert(0,str(R/'source'))
from assemble import Doc
from build_fleet import Builder,linear
from detail import loft
from meshkit import rounded,slab
S=R/'site';O=R/'staging';O.mkdir(exist_ok=True)
rings=np.array([[.018,-.16,.42,.31,3.2],[.045,-.17,.54,.41,3.8],[.105,-.175,.59,.456,4.1],[.18,-.175,.616,.478,4.0],[.32,-.168,.61,.482,4.1],[.48,-.149,.588,.458,3.9],[.61,-.129,.535,.408,3.6],[.705,-.110,.46,.346,3.4],[.764,-.09,.345,.244,3.1],[.792,-.08,.105,.080,2.6],[.797,-.08,.010,.01,2.0]])
interp=[Pchip(rings[:,0],rings[:,i]) for i in range(1,5)]
def rows(y0,y1,n):return [(float(y),*[float(f(y)) for f in interp]) for y in np.linspace(y0,y1,n)]
def ring_at(y):
 cx,L,W,e=[float(f(y)) for f in interp];a=np.linspace(0,2*np.pi,145)
 return np.c_[cx+.5*L*np.sign(np.cos(a))*np.abs(np.cos(a))**(2/e),np.full(len(a),y),.5*W*np.sign(np.sin(a))*np.abs(np.sin(a))**(2/e)]
def surface_z(x,y,side):
 cx,L,W,e=[float(f(y)) for f in interp];u=abs((x-cx)/(.5*L));return side*.5*W*max(0,1-min(.999,u)**e)**(1/e)
def build_engine():
 b=Builder('ATLAS 300 / original exterior visualization')
 for k,c,rough,metal in [('pearl','#E9E9E4',.24,0),('graphite','#263A47',.31,.1),('satin','#B2BDC3',.28,.85),('intake','#13232C',.68,0),('brand','#213F51',.26,.30)]:b.c[k]=b.m.mat('ST07 '+k,linear(c),metal,rough)
 p=b.m.g['materials'][b.c['pearl']];p['extensions']={'KHR_materials_clearcoat':{'clearcoatFactor':1,'clearcoatRoughnessFactor':.09}}
 b.m.g.setdefault('extensionsUsed',[]).append('KHR_materials_clearcoat')
 b.add('Sculpted lower cowling',loft(rows(.018,.166,22),128),'graphite',smooth=True)
 b.add('Pearl V6 cowling shell',loft(rows(.169,.797,86),128),'pearl',smooth=True)
 b.tube('Continuous cowling gasket',ring_at(.168),.0026,'intake',sides=8)
 for side in [-1,1]:
  x0,x1=-.357,-.026;y0,y1=.430,.502;v=[];faces=[]
  for j,y in enumerate(np.linspace(y0,y1,8)):
   for i,x in enumerate(np.linspace(x0,x1,40)):v.append([x,y,surface_z(x,y,side)+side*.0015])
  for j in range(7):
   for i in range(39):
    k=j*40+i;faces.extend([[k,k+1,k+40],[k+1,k+41,k+40]])
  m=trimesh.Trimesh(v,faces,process=False)
  if np.mean(m.face_normals[:,2])*side<0:m.invert()
  b.add('Recess-look intake panel',m,'intake',smooth=True)
  for x in np.linspace(-.326,-.056,8):
   pts=[[x,y,surface_z(x,y,side)+side*.0045] for y in np.linspace(.438,.494,7)];b.tube('Fine intake rib',pts,.002,'satin',sides=6)
  b.text('300',[-.357 if side>0 else -.073,.283,side*.244],.105,'brand',facing=side)
  b.text('ATLAS',[-.309 if side>0 else -.095,.237,side*.244],.039,'brand',facing=side)
  b.text('V6',[-.24 if side>0 else -.13,.528,side*.230],.026,'satin',facing=side)
  b.box('Lower cowl latch',[-.19,.108,side*.229],[.09,.038,.009],'satin',r=.008)
  b.cyl('Latch captive fastener',[-.19,.108,side*.235],.005,.004,'intake',axis='z',sections=12)
 leg=[(-.63,-.101,.257,.118,3.0),(-.48,-.097,.267,.14,3.3),(-.23,-.093,.276,.20,3.3),(-.06,-.095,.32,.246,3.5),(.015,-.106,.36,.288,3.8)]
 fi=[Pchip(np.array(leg)[:,0],np.array(leg)[:,i]) for i in range(1,5)]
 b.add('Contoured driveshaft housing',loft([(y,*[float(f(y)) for f in fi]) for y in np.linspace(-.63,.015,54)],96),'satin',smooth=True)
 plate=rounded([[-.42,-.195],[.12,-.155],[.19,-.06],[.19,.06],[.12,.155],[-.42,.195]],.16,14)
 b.add('Anti-ventilation plate',slab(plate,-.643,-.631),'graphite')
 b.ell('Hydrodynamic lower-unit fairing',[-.20,-.779,0],[.31,.103,.103],'satin')
 pts=np.array([[-.36,-.82],[-.017,-.82],[-.094,-1.087],[-.215,-1.099]])
 v=np.array([[x,y,z] for z in [-.008,.008] for x,y in pts]);f=[[0,2,1],[0,3,2],[4,5,6],[4,6,7]]
 for i in range(4):j=(i+1)%4;f.extend([[i,j,j+4],[i,j+4,i+4]])
 m=trimesh.Trimesh(v,f,process=True);m.fix_normals();b.add('Swept skeg',m,'satin',smooth=False)
 for side in [-1,1]:
  for y in np.linspace(-.715,-.665,5):b.tube('Lower-unit inlet detail',[[-.09,y,side*.074],[-.036,y,side*.070]],.0024,'intake',sides=6)
 b.save('engine07.glb');d=Doc(O/'engine07.glb');d.g.pop('animations',None);return d,len(b.inventory)
new,items=build_engine();report={'revision':'Bay 25 Studio 07','scope':'Standalone Bay appearance refinement; fleet and Explorer integration unchanged','engine':'Single 300 hp-class original exterior concept, not a manufacturer replica or rated installation','450_status':'Not installed; retain for a separate equipment/weight/transom study','top_rod_holders':6,'GPS_housing':True,'engineering_validated':False,'actual_draft_known':False,'changes':['Replaced coarse outboard cowling with continuous curved pearl shell and dark lower cowl','Surface-following intake inlays and fine ribs, smaller 300 and ATLAS identifiers','Contoured external driveshaft housing, lower-unit fairing, plate and skeg','Preserved approved hull, roof, all six holders, GPS and original fishing animation','Refined pale upholstery insert and deck-material contrast','New Showroom viewpoint and model-only presentation with corrected water reflections'],'detail_components':items,'preservation':{}}
for stem in ['ATLAS_Bay_25','ATLAS_Bay_25_Shallow_Study']:
 d=Doc(S/'assets'/f'{stem}.glb');engine=d.node('MOV_Outboard_steer');preserve={n:d.vertices(d.node(n)) for n in ['EX_Hull','FIXED_TTop']};removed=[]
 for i in d.descendants(engine):
  n=d.g['nodes'][i];name=n.get('name','')
  if 'mesh' in n and (name.startswith('MOV_Outboard_steer__') or name.startswith('DT04_Engine_') or name.startswith('DT06_300_OPTION_')):removed.append(name);del n['mesh']
 d.append(new,engine,'ST07_ENGINE_');d.compact()
 for m in d.g['materials']:
  name=m.get('name','');p=m.get('pbrMetallicRoughness',{})
  if 'woven' in name.lower():p['baseColorFactor']=linear('#B7C2C0')+[1];p['roughnessFactor']=.62
  if name=='soft deck insert':p['baseColorFactor']=linear('#CED5D1')+[1]
  if name=='upholstery seam':p['baseColorFactor']=linear('#C6CCC6')+[1]
 errors={}
 for n,before in preserve.items():
  after=d.vertices(d.node(n));assert before.shape==after.shape;errors[n]=float(np.max(np.abs(before-after)));assert errors[n]<1e-6
 assert all(ch['target']['path']!='scale' for a in d.g.get('animations',[]) for ch in a['channels'])
 d.g['scenes'][0].setdefault('extras',{}).update(revision='Studio 07',engine_status=report['engine'],engineering_validated=False)
 d.write(S/'assets'/f'{stem}.glb');shutil.copy2(S/'assets'/f'{stem}.glb',O/f'{stem}.glb');report['preservation'][stem]=errors
 report.setdefault('assets',{})[stem]={'bytes':(S/'assets'/f'{stem}.glb').stat().st_size,'animation_channels':sum(len(a['channels']) for a in d.g.get('animations',[])),'replaced_engine_meshes':len(removed)}
(S/'bay07_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
