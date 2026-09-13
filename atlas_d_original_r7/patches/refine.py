"""Small visual corrections after inspecting actual R7 browser frames."""
from pathlib import Path
import os
root=Path(os.getenv('ATLAS_ROOT',str(Path(__file__).resolve().parents[1])))
def edit(file,old,new):
 p=root/file;s=p.read_text()
 if new in s:return
 assert old in s, f'Missing exact patch target in {file}: {old[:90]}'
 p.write_text(s.replace(old,new))
edit('source/build.py','fs.append([i,i+1,i+2])','fs.append([i,i+2,i+1])')
edit('source/build.py','[-3.4*(1-smooth(.40,.45,p)),0,0]','[3.25*(1-smooth(.40,.45,p)),0,0]')
edit('source/build.py','baseColorFactor=[.78,.79,.765,1],metallicFactor=.10,roughnessFactor=.28','baseColorFactor=[.66,.69,.695,1],metallicFactor=.22,roughnessFactor=.29')
edit('source/build.py',"M.mat('Ceramic pearl',(.82,.825,.795),.12,.27)","M.mat('Ceramic pearl',(.70,.72,.72),.22,.27)")
edit('source/build.py',"('Utility',-10,17.2,-.06,-2.37,6.9,.195,.29)","('Utility',-10,17.2,-.06,-2.37,6.9,.26,.34)")
edit('source/build.py','(1-smooth(.29,.35,p))','(1-smooth(.345,.39,p))')
edit('source/build.py','t0=.025+k*.025;t1=a-.045;t2=a','t0=.025+k*.105;t1=a-.045;t2=a')
edit('source/build.py',"box('Aft garage crown',(-38.6,4.72,0),(5.7,.36,10.25),paint,bay,.3)","slabadd('Rounded aft garage crown',footprint(-41.25,-35.75,5.12),4.40,4.77,paint,bay)")
edit('source/build.py',"tube('Deck edge reveal',pts,.028,edge,root,8);teak_ring", "tube('Deck edge reveal',pts,.038,edge,root,8);tube('Rounded painted roof lip',[[x,lv['top']+.13,z] for x,z in rp]+[[rp[0][0],lv['top']+.13,rp[0][1]]],.075,paint,root,10);tube('Warm soffit line',[[x,lv['top']-.025,z*.985] for x,z in rp]+[[rp[0][0],lv['top']-.025,rp[0][1]*.985]],.016,light,root,6);teak_ring")
p=root/'source/build.py';s=p.read_text();marker="M.track(0,'translation',lambda p:[0,-26*smooth(.845,1,p),0])"
insert="""
fx=M.node('FX_Subsea_light_beams')
beam=M.mat('Subsea light haze',(.28,.66,.81),0,.9,.026,emit=[.16,.37,.48])
for side in [-1,1]:
 for xx in [-27,-13,2,17,29]:
  zz=side*np.interp(xx,[-27,-13,17,29],[6.25,6.50,6.05,4.65]);origin=np.array([xx,-1.2,zz]);axis=np.array([0.,-.94,side*.34]);axis/=np.linalg.norm(axis);u=np.array([1.,0.,0.]);w=np.cross(axis,u);vv=[origin]
  for a in np.linspace(0,2*np.pi,25,endpoint=False):vv.append(origin+axis*8+2.1*(u*np.cos(a)+w*np.sin(a)))
  ff=[[0,i+1,(i+1)%25+1] for i in range(25)]
  M.add('Soft dive-light cone',trimesh.Trimesh(vv,ff,process=False),beam,fx,True)
"""
if "fx=M.node('FX_Subsea_light_beams')" not in s:
 assert marker in s;s=s.replace(marker,insert+'\n'+marker);p.write_text(s)
edit('site/viewer.js','sky.mapping=303;sky.colorSpace','sky.mapping=303;sky.magFilter=1006;sky.minFilter=1006;sky.colorSpace')
edit('site/viewer.js',"s.add(new T.HemisphereLight(0xe4edf0,0x294954,1.5));", "const hemi=new T.HemisphereLight(0xe4edf0,0x294954,1.25);s.add(hemi);")
edit('site/viewer.js',"const sun=new T.DirectionalLight(0xffdeb4,3.0)","const sun=new T.DirectionalLight(0xffdeb4,2.65)")
edit('site/viewer.js','water.receiveShadow=true;s.add(water)','water.receiveShadow=false;s.add(water)')
edit('site/viewer.js','for(let layer=0;layer<3;layer++)','for(let layer=0;layer<0;layer++)')
edit('site/viewer.js',"s.environmentIntensity=depth>5?.92:.88;sun.color.set(depth>5?0xa3d3e7:0xffdeb4);", "s.environmentIntensity=depth>5?.36:.88;sun.color.set(depth>5?0x72afcf:0xffdeb4);sun.intensity=depth>5?1.08:2.65;hemi.intensity=depth>5?.48:1.25;fill.intensity=depth>5?.68:1.0;water.material.color.set(depth>5?0x103746:0x264f5e);for(const m of meshes)if(m.userData.group==='FX_Subsea_light_beams')m.visible=depth>5&&!core;")
edit('site/viewer.js',"m.visible=visible;m.material.opacity=a;", "if(m.userData.group==='FX_Subsea_light_beams')visible=depth>5&&!core;m.visible=visible;m.material.opacity=a;")
p=root/'site/style.css';s=p.read_text();extra='\ndialog{max-height:calc(100dvh - 40px);overflow:auto}#close-notes{z-index:3;width:36px;height:36px;top:7px;right:7px;border-radius:50%;background:#132d3a}dialog>.eyebrow{padding-right:24px;pointer-events:none}\n'
if 'max-height:calc(100dvh - 40px)' not in s:p.write_text(s+extra)
edit('source/native.py',"bpy.ops.import_scene.gltf(filepath=str(root/'site/ATLAS_D_Original.glb'))", "bpy.context.scene.render.fps=30\nbpy.ops.import_scene.gltf(filepath=str(root/'site/ATLAS_D_Original.glb'))")
print('Applied R7 reviewed visual and interaction refinements.')
