"""Atlas Bay Studio 06: visual material authoring. Not a qualified engine installation."""
import os,sys,json,copy,io,math,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));os.environ['FLEET_ROOT']=str(R);sys.path.insert(0,str(R/'source'))
from assemble import Doc
from build_fleet import Builder,linear
S=R/'site';O=R/'staging';O.mkdir(exist_ok=True)
base=S/'assets/ATLAS_Bay_25.glb';shutil.copy2(base,S/'assets/ATLAS_Bay_25_Previous.glb')
rng=np.random.default_rng(6025);yy,xx=np.mgrid[:512,:512]
grain=np.array(Image.fromarray((rng.random((512,512))*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0)),dtype=float)/255
height=.40*grain+.07*np.sin(xx*1.9)*np.sin(yy*1.85)
gx=(np.roll(height,-1,1)-np.roll(height,1,1))*1.3;gy=(np.roll(height,-1,0)-np.roll(height,1,0))*1.3
normal=np.dstack([-gx,-gy,np.ones_like(gx)]);normal/=np.linalg.norm(normal,axis=2)[...,None]
normal=((normal*.5+.5)*255).astype('uint8');f=io.BytesIO();Image.fromarray(normal).save(f,format='PNG');normalbytes=f.getvalue()
def attach_image(d,blob,name):
 d.b.extend(b'\0'*(-len(d.b)%4));view=len(d.g['bufferViews']);d.g['bufferViews'].append({'buffer':0,'byteOffset':len(d.b),'byteLength':len(blob)});d.b.extend(blob)
 im=len(d.g.setdefault('images',[]));d.g['images'].append({'name':name,'bufferView':view,'mimeType':'image/png'})
 sampler=len(d.g.setdefault('samplers',[]));d.g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497})
 tx=len(d.g.setdefault('textures',[]));d.g['textures'].append({'source':im,'sampler':sampler});return tx

def run(stem):
 d=Doc(S/'assets'/f'{stem}.glb');tex=attach_image(d,normalbytes,'ATLAS original fine vinyl grain')
 for m in d.g['materials']:
  n=m.get('name','');p=m.setdefault('pbrMetallicRoughness',{});e=m.setdefault('extensions',{})
  if n=='blue':
   p.update(baseColorFactor=linear('#486778')+[1],metallicFactor=.0,roughnessFactor=.25);e['KHR_materials_clearcoat']={'clearcoatFactor':1.,'clearcoatRoughnessFactor':.085}
  elif n.startswith('white'):
   p.update(baseColorFactor=linear('#E6E6DF')+[1],metallicFactor=0,roughnessFactor=.32);e['KHR_materials_clearcoat']={'clearcoatFactor':.7,'clearcoatRoughnessFactor':.12}
  elif n.startswith('chrome'):p.update(baseColorFactor=linear('#D2D5D5')+[1],metallicFactor=1,roughnessFactor=.19)
  elif n.startswith('silver'):p.update(baseColorFactor=linear('#BFC7CA')+[1],metallicFactor=1,roughnessFactor=.29)
  elif n.startswith('darkdeck'):p.update(baseColorFactor=linear('#263A45')+[1],metallicFactor=.35,roughnessFactor=.39)
  elif n=='fabric' or 'woven' in n:
   p.update(baseColorFactor=linear('#D7D3C8' if n=='fabric' else '#A5B3B3')+[1],metallicFactor=0,roughnessFactor=.58);p.pop('baseColorTexture',None);m['normalTexture']={'index':tex,'scale':.38};e['KHR_materials_sheen']={'sheenColorFactor':[.13,.13,.12],'sheenRoughnessFactor':.6}
  elif n=='soft deck insert':
   p.update(baseColorFactor=linear('#CBD2CF')+[1],metallicFactor=0,roughnessFactor=.92);p.pop('baseColorTexture',None);m['normalTexture']={'index':tex,'scale':.65}
  elif n=='glass':
   p.update(baseColorFactor=[.94,.975,.99,1],metallicFactor=0,roughnessFactor=.045);m.pop('alphaMode',None);m['doubleSided']=True;e.update(KHR_materials_transmission={'transmissionFactor':.94},KHR_materials_ior={'ior':1.45})
  elif n=='top underside':p.update(baseColorFactor=linear('#8FA4AD')+[1],metallicFactor=.04,roughnessFactor=.38)
  if not e:m.pop('extensions',None)
 for ext in ['KHR_materials_clearcoat','KHR_materials_transmission','KHR_materials_ior','KHR_materials_sheen']:
  if ext not in d.g.setdefault('extensionsUsed',[]):d.g['extensionsUsed'].append(ext)
 b=Builder('Low profile GNSS housing');b.c['white']=b.m.mat('06 pearl antenna',linear('#E5E5DF'),0,.24);b.c['dark']=b.m.mat('06 gasket',linear('#1E303A'),0,.7)
 b.ell('GNSS weatherproof housing',[.16,2.707,-.18],[.104,.042,.104],'white');b.cyl('GNSS gasket mount',[.16,2.673,-.18],.095,.013,'dark',sections=64)
 for z in [-.30,-.06]:b.cyl('Antenna mounting fastener',[.16,2.67,z],.006,.007,'chrome')
 b.save('gps.glb');a=Doc(O/'gps.glb');a.g.pop('animations',None);d.append(a,d.node('FIXED_TTop'),'DT06_GPS_')
 b=Builder('300 design option markings');b.c['badge']=b.m.mat('06 engine graphite',linear('#263945'),.12,.32)
 for side in [-1,1]:b.text('300',[-.32 if side==1 else -.05,.36,side*.254],.125,'badge',plane='side',facing=side)
 b.save('badge.glb');a=Doc(O/'badge.glb');a.g.pop('animations',None);d.append(a,d.node('MOV_Outboard_steer'),'DT06_300_OPTION_')
 d.g['scenes'][0].setdefault('extras',{}).update(revision='Studio 06',engine_selection='single 300 hp-class design preference, installation not rated',GPS='Housing and illustrative displays only',engineering_validated=False)
 d.compact();d.write(O/f'{stem}.glb');shutil.copy2(O/f'{stem}.glb',S/'assets'/f'{stem}.glb')
run('ATLAS_Bay_25');run('ATLAS_Bay_25_Shallow_Study')
report={'revision':'Bay 25 Studio 06','scope':'Standalone Bay visual-quality pass; other fleet geometry unchanged','engine_preference':'Single 300 hp-class, not a certified installation or engine replica','450_status':'Separate design tradeoff, not installed or rated','top_rod_holders':6,'GPS_antenna_housing_added':True,'reference_image_matched_exactly':False,'integrated_into_explorer':False,'engineering_validated':False,'actual_draft_known':False,'changes':['Reauthored gelcoat, vinyl, nonslip, glass and metal materials','Original embedded fine grain normal texture','Low-profile GPS/GNSS antenna housing','Original 300-class engine option lettering','Photographic sky illumination and reflective water presentation; studio inspection retained'],'remaining':['Mass, center-of-gravity and trim budget','Engine/transom/steering/rigging qualification','Tender integration and recovery clearances','Further molded-surface refinement and hatch mechanisms']}
(S/'bay06_report.json').write_text(json.dumps(report,indent=2))
