"""R5 geometry review corrections: separated surface normals and real stowage apertures.
Run instead of build.py. This keeps the original parametric source reproducible.
"""
from pathlib import Path
import os
root=Path(os.getenv('ATLAS_ROOT',str(Path(__file__).resolve().parent.parent)))
s=(root/'source/build.py').read_text()
def replace(old,new):
 global s
 if old not in s:raise ValueError('Source boundary not found: '+old[:90])
 s=s.replace(old,new,1)
a=s.index('def solid(');b=s.index('\ndef track(',a)
s=s[:a]+'''def cap(name,p,y,ma,parent,up=True,hole=False,rise=0):
 p=np.asarray(p,float);n=len(p)
 if hole:
  center=np.array([2.55,0.]);vec=p-center;inner=center+vec/np.linalg.norm(vec,axis=1)[:,None]*.61
  v=np.r_[np.c_[p[:,0],np.full(n,y),p[:,1]],np.c_[inner[:,0],np.full(n,y),inner[:,1]]];f=[]
  for i in range(n):
   j=(i+1)%n;f.extend([[i,n+j,j],[i,n+i,n+j]])
 else:
  center=p.mean(0);v=np.r_[np.c_[p[:,0],np.full(n,y),p[:,1]],[[center[0],y+rise,center[1]]]]
  f=[[n,(i+1)%n,i] for i in range(n)]
 m=trimesh.Trimesh(v,f,process=False)
 if (m.face_normals[:,1].mean()>0)!=up:m.invert()
 raw(name,m.vertices,m.faces,m.vertex_normals,ma,parent)
def solid(name,p,y0,y1,ma=paint,parent=architecture,shift=0,shrink=1.,curved=False):
 p=np.array(p);n=len(p);q=p.copy();q[:,0]+=shift;q[:,1]*=shrink
 v=np.r_[np.c_[p[:,0],np.full(n,y0),p[:,1]],np.c_[q[:,0],np.full(n,y1),q[:,1]]];f=[]
 for i in range(n):
  j=(i+1)%n;f.extend([[i,j+n,j],[i,i+n,j+n]])
 m=trimesh.Trimesh(v,f,process=False)
 if curved:raw(name+'_sides',m.vertices,m.faces,m.vertex_normals,ma,parent)
 else:
  vv=m.vertices[m.faces].reshape(-1,3);raw(name+'_sides',vv,np.arange(len(vv)).reshape(-1,3),np.repeat(m.face_normals,3,axis=0),ma,parent)
 holed=name in ['Bridge_wrap_glazing','Crown_soffit','Swept_crown_soffit','Mast_fairing']
 cap(name+'_base',p,y0,ma,parent,False,holed and name!='Bridge_wrap_glazing')
 cap(name+'_top',q,y1,ma,parent,True,holed)
def roof(name,p,y,thickness=.28,parent=architecture):
 solid(name+'_soffit',p,y-.035,y+.035,black,parent)
 n=len(p);center=p.mean(0);rings=[]
 for offset,scale in [(0,1),(.065,1.002),(thickness-.045,.995),(thickness,.973)]:
  q=center+(p-center)*scale;rings.append(np.c_[q[:,0],np.full(n,y+offset),q[:,1]])
 v=np.concatenate(rings);f=[]
 for k in range(3):
  for i in range(n):
   j=(i+1)%n;a=k*n+i;b=k*n+j;c=a+n;d=b+n;f.extend([[a,d,b],[a,c,d]])
 m=trimesh.Trimesh(v,f,process=False);raw(name+'_fascia',m.vertices,m.faces,m.vertex_normals,paint,parent)
 cap(name+'_top',rings[-1][:,[0,2]],y+thickness,paint,parent,True,name=='Swept_crown',.025)
 cap(name+'_bottom',p,y,paint,parent,False,name=='Swept_crown')
''' + s[b:]
replace("box('Aft_pocket_dark_throat',[-9.39,11.065,0],[.12,.20,7.15],black,baygroup)","""for yy in [10.978,11.154]:
 box('Canopy_slot_lip',[-9.39,yy,0],[.10,.024,7.30],black,baygroup)
for zz in [-3.66,3.66]:
 box('Canopy_slot_jamb',[-9.39,11.065,zz],[.10,.20,.045],black,baygroup)""")
replace("box('Mast_well_reveal',[2.55,12.015,0],[1.38,.055,1.18],black,well,.18)","""ring('Mast_well_coaming',[2.55,12.005,0],.615,.035,black,well)
vv=[];ff=[]
for yy in [9.05,12.0]:
 for a in np.linspace(0,2*math.pi,64,endpoint=False):vv.append([2.55+.61*math.cos(a),yy,.61*math.sin(a)])
for i in range(64):
 j=(i+1)%64;ff.extend([[i,j,j+64],[i,j+64,i+64]])
mm=trimesh.Trimesh(vv,ff,process=False);raw('Mast_service_well_walls',mm.vertices,mm.faces,mm.vertex_normals,accent,well)""")
replace("[[0,-2.65,0],[0,.35,0]]","[[0,-.65,0],[0,.35,0]]")
replace("[[0,-1.25,0],[0,1.7,0]]","[[0,-.3,0],[0,1.7,0]]")
viewer=root/'site/viewer.js';v=viewer.read_text()
v=v.replace("const dt=Math.min((now-last)/1000,.05);last=now;", "const elapsed=(now-last)/1000,dt=Math.min(elapsed,.05);last=now;")
v=v.replace("p+dt/36", "p+elapsed/36")
viewer.write_text(v)
(root/'site'/'build_refined.py').write_text(s)
exec(compile(s,str(root/'source/build.py'),'exec'),{'__file__':str(root/'source/build.py'),'__name__':'__main__'})
