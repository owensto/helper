from pathlib import Path
import os,sys,json,io,copy
import numpy as np
from PIL import Image
R=Path(os.environ.get('FLEET_ROOT','/mnt/data/fleet_upgrade/work'));sys.path.insert(0,str(R/'source'))
from assemble import Doc

def apply(path):
 d=Doc(path);g=d.g
 # Embedded textures; no external fonts or runtime texture servers.
 def tex(kind):
  n=256;y,x=np.mgrid[:n,:n];rng=np.random.default_rng(915)
  if kind=='fabric':
   a=np.clip(235+5*np.sin(x*np.pi/2)+5*np.sin(y*np.pi/2)+rng.normal(0,1.4,(n,n)),0,255)
  else:a=np.clip(241+rng.normal(0,3,(n,n)),0,255)
  rgb=np.repeat(a[:,:,None],3,2).astype('uint8');f=io.BytesIO();Image.fromarray(rgb).save(f,format='PNG');data=f.getvalue();d.b.extend(b'\0'*(-len(d.b)%4));bv=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(d.b),'byteLength':len(data)});d.b.extend(data)
  im=len(g.setdefault('images',[]));g['images'].append({'name':'ATLAS '+kind,'bufferView':bv,'mimeType':'image/png'});sa=len(g.setdefault('samplers',[]));g['samplers'].append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497});ti=len(g.setdefault('textures',[]));g['textures'].append({'sampler':sa,'source':im});return ti
 ids={'fabric':tex('fabric'),'deck':tex('deck')}
 for i,m in enumerate(g['materials']):
  n=m.get('name','');p=m['pbrMetallicRoughness']
  if n in ['blue','silver','white','naval']:
   m.setdefault('extensions',{})['KHR_materials_clearcoat']={'clearcoatFactor':.5 if n=='blue' else .15,'clearcoatRoughnessFactor':.23}
   if 'KHR_materials_clearcoat' not in g.setdefault('extensionsUsed',[]):g['extensionsUsed'].append('KHR_materials_clearcoat')
  if n in ids:p['baseColorTexture']={'index':ids[n]}
  if n=='glass':m['doubleSided']=True;m['alphaMode']='BLEND';p['baseColorFactor']=[.34,.48,.52,.38];p['metallicFactor']=.02;p['roughnessFactor']=.12
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   ma=g['materials'][p.get('material',0)];kind=ma.get('name')
   if kind not in ids:continue
   v=d.rd(p['attributes']['POSITION']);norm=d.rd(p['attributes']['NORMAL']);axis=np.abs(norm).argmax(1);uv=np.empty((len(v),2));scale=10 if kind=='fabric' else 3
   for a,cols in [(0,[2,1]),(1,[0,2]),(2,[0,1])]:mask=axis==a;uv[mask]=v[mask][:,cols]*scale
   p['attributes']['TEXCOORD_0']=d.acc(uv,'VEC2')
 d.write(path)
for ident in ['ATLAS_Bay_25','ATLAS_N','ATLAS_W']:
 apply(R/'staging'/f'{ident}.glb')
print('Embedded fabrics, nonslip textures, paint clearcoat')
