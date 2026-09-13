"""Final depth precision and presentation fixes after the second browser review."""
from pathlib import Path
import os
r=Path(os.getenv('ATLAS_ROOT',str(Path(__file__).resolve().parents[1])))
def edit(file,a,b):
 p=r/file;s=p.read_text()
 if b in s:return
 assert a in s,(file,a[:70]);p.write_text(s.replace(a,b))
edit('site/viewer.js','new T.PerspectiveCamera(30,1,.1,3500)','new T.PerspectiveCamera(30,1,.5,2200)')
edit('site/viewer.js','norm.repeat.set(140,140);norm.needsUpdate=true','norm.repeat.set(140,140);norm.magFilter=1006;norm.minFilter=1008;norm.generateMipmaps=true;norm.anisotropy=4;norm.needsUpdate=true')
edit('site/viewer.js','o.material=o.material.clone();o.castShadow=',"o.material=o.material.clone();if(o.material.name.toLowerCase().includes('teak')){o.material.polygonOffset=true;o.material.polygonOffsetFactor=-2;o.material.polygonOffsetUnits=-2;}o.castShadow=")
edit('site/viewer.js','mobile?[1.35,.43,1.4]','mobile?[1.8,1.0,1.25]')
edit('source/build.py','for xx in [-27,-13,2,17,29]:','for xx in [-29,-18,-5,8,21,32]:')
edit('source/build.py','np.interp(xx,[-27,-13,17,29],[6.25,6.50,6.05,4.65])','np.interp(xx,[-29,-18,8,21,32],[6.2,6.4,6.4,5.8,4.2])')
edit('source/build.py',"M.mat('Subsea light haze',(.28,.66,.81),0,.9,.026", "M.mat('Subsea light haze',(.28,.66,.81),0,.9,.012")
print('Applied reviewed presentation fixes.')
