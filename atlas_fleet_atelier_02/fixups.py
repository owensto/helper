from pathlib import Path
import os
R=Path(os.environ['FLEET_ROOT']);p=R/'site/viewer.js';s=p.read_text()
s=s.replace("function load(key){id=key;", "function load(key){delete window.FLEET_ERROR;id=key;")
s=s.replace("$('#cutaway').hidden=id==='bay'||id==='chase';", "$('#cutaway').hidden=id==='bay'||id==='chase';$('#realism').hidden=id!=='d';")
s=s.replace("const panel=$('#sectiontools');if(!panel)return;panel.hidden=!cut;", "const panel=$('#sectiontools');if(!panel)return;panel.hidden=!cut;$('#sectionrange').hidden=id==='d';$('label[for=sectionrange]').hidden=id==='d';$('.sectionbuttons').hidden=id==='d';")
p.write_text(s)
print('Scoped section controls to N/W; reset loader error on retry; D design basis shown only for D')
# Visual review corrections: avoid crop at first section view and obvious liner gaps.
s=p.read_text().replace("'Interior':[[0,-1,0],[58,11,14]", "'Interior':[[0,1,0],[87,17,14]").replace("'Interior':[[0,4,0],[91,14,17]", "'Interior':[[0,7,0],[134,31,22]")
s=s.replace("updateSectionUI();renderer.shadowMap.needsUpdate=true;", "document.body.classList.toggle('section',cut);updateSectionUI();renderer.shadowMap.needsUpdate=true;")
s=s.replace("renderer.toneMappingExposure=1.0", "renderer.toneMappingExposure=.96").replace("hemi.intensity=1.15-u*.28", "hemi.intensity=.80-u*.18").replace("gold?2.5:2.3", "gold?2.3:2.05")
s=s.replace("const fill=new T.DirectionalLight(0xc4dfed,.75)", "const fill=new T.DirectionalLight(0xc4dfed,.45)")
p.write_text(s)
p=R/'site/style.css';p.write_text(p.read_text()+'''\nbody.section .identity #caption,body.section .identity .keyline,body.section .identity .specs,body.section .identity #tags,body.section .identity #download{display:none}body.section .identity{top:104px}#sectiontools button{border:1px solid #91a6ad80;border-radius:5px;background:#e4edef;color:#284552;cursor:pointer}\n''')
p=R/'source/detail.py';s=p.read_text()
s=s.replace("def bay_detail(b):\n", "def bay_detail(b):\n molded_liner(b)\n")
s=s.replace(",(-3.05,.71,.56,.51,.738)","")
s=s.replace("b.text('ATLAS',[-.40,.34,side*.258],.086,'black',steer,facing=1 if side>0 else -1)","b.text('ATLAS',[-.40 if side>0 else .015,.34,side*.258],.086,'black',steer,facing=1 if side>0 else -1)")
s=s.replace("[.49,.019,.35],'white',seats", "[.49,.019,.35],'piping',seats").replace("[.024,.37,.33],'white',seats", "[.024,.37,.33],'piping',seats")
s+='''

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
'''
s=s.replace("[.028,.385,.76],'glass',inside","[.028,.385,.76],'black',inside")
p.write_text(s)
p=R/'source/build_fleet.py';s=p.read_text().replace(".070,'white',deck,12", ".041,'white',deck,12")
p.write_text(s)
p=R/'finish_assets.py';s=p.read_text()
s=s.replace("if n=='glass':m['doubleSided']=True;p['metallicFactor']=.12;p['roughnessFactor']=.16", "if n=='glass':m['doubleSided']=True;m['alphaMode']='BLEND';p['baseColorFactor']=[.34,.48,.52,.38];p['metallicFactor']=.02;p['roughnessFactor']=.12")
p.write_text(s)
print('Visual review: cockpit liner and forepeak, rod sockets, contrast seats, cowling lettering, whole-vessel section framing')
