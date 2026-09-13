"""Deterministic glTF writer. X forward, Y up, metres. Rigid mechanical tracks only."""
import json,struct,math,copy
from collections import defaultdict
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation
from shapely.geometry import Polygon,box as polygon_box
from shapely.ops import triangulate
class Model:
 def __init__(self):
  self.g={'asset':{'version':'2.0','generator':'ATLAS original-concept motion study R7'},'scene':0,'scenes':[{'name':'ATLAS D / Original concept','nodes':[0]}],'nodes':[{'name':'Vessel','children':[]}],'meshes':[],'materials':[],'buffers':[{}],'bufferViews':[],'accessors':[]};self.buf=bytearray();self.parts=defaultdict(list);self.motion=[];self.named={};self.count=0
 def mat(self,name,c,metal=0,rough=.4,alpha=1,emit=None):
  i=len(self.g['materials']);d={'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*c,alpha],'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}
  if alpha<1:d.update(alphaMode='BLEND',doubleSided=True)
  if emit:d['emissiveFactor']=emit
  self.g['materials'].append(d);self.named[name]=i;return i
 def node(self,name,parent=0,loc=(0,0,0),extras=None):
  i=len(self.g['nodes']);d={'name':name,'children':[],'translation':list(loc)}
  if extras:d['extras']=extras
  self.g['nodes'].append(d);self.g['nodes'][parent]['children'].append(i);return i
 def add(self,name,mesh,mat,parent=0,smooth=False):
  if not len(mesh.faces):return
  mesh=mesh.copy();mesh.remove_unreferenced_vertices()
  if not mesh.is_winding_consistent:mesh.fix_normals(multibody=True)
  if mesh.is_watertight and mesh.volume<0:mesh.invert()
  if smooth:v=np.array(mesh.vertices);f=np.array(mesh.faces);n=np.array(mesh.vertex_normals)
  else:v=np.array(mesh.vertices)[mesh.faces].reshape(-1,3);f=np.arange(len(v)).reshape(-1,3);n=np.repeat(mesh.face_normals,3,axis=0)
  self.raw(name,v,f,n,mat,parent)
 def raw(self,name,v,f,n,mat,parent):
  if not len(f):return
  ids,idx=np.unique(f,return_inverse=True);self.parts[(parent,mat)].append((name,np.array(v)[ids],idx.reshape(-1,3),np.array(n)[ids]));self.count+=1
 def access(self,a,kind,ct=5126,target=None):
  k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[kind];a=np.asarray(a,dtype={5126:'<f4',5125:'<u4'}[ct]).reshape(-1,k)
  assert np.isfinite(a).all();self.buf.extend(b'\0'*(-len(self.buf)%4));off=len(self.buf);self.buf.extend(a.tobytes());bv={'buffer':0,'byteOffset':off,'byteLength':a.nbytes}
  if target:bv['target']=target
  vi=len(self.g['bufferViews']);self.g['bufferViews'].append(bv);d={'bufferView':vi,'componentType':ct,'count':len(a),'type':kind}
  if kind in ['SCALAR','VEC3']:d.update(min=a.min(0).tolist(),max=a.max(0).tolist())
  i=len(self.g['accessors']);self.g['accessors'].append(d);return i
 def track(self,node,path,fn):
  assert path in ['translation','rotation'];self.motion.append((node,path,fn));self.g['nodes'][node][path]=list(fn(0))
 def export(self,path,duration=48):
  triangles=0
  for (parent,ma),arr in self.parts.items():
   vs=[];fs=[];ns=[];offset=0
   for name,v,f,n in arr:vs.append(v);fs.append(f+offset);ns.append(n);offset+=len(v)
   v=np.concatenate(vs);f=np.concatenate(fs);n=np.concatenate(ns);triangles+=len(f)
   prim={'attributes':{'POSITION':self.access(v,'VEC3',target=34962),'NORMAL':self.access(n,'VEC3',target=34962)},'indices':self.access(f,'SCALAR',5125,34963),'material':ma}
   name=self.g['nodes'][parent]['name']+'__'+self.g['materials'][ma]['name'].replace(' ','_').replace('/','_')
   mi=len(self.g['meshes']);self.g['meshes'].append({'name':name,'primitives':[prim]});ni=self.node(name,parent);self.g['nodes'][ni]['mesh']=mi
  times=np.linspace(0,duration,241);ti=self.access(times,'SCALAR');ani={'name':'Surface - recover tenders - compact outer shells - dive','channels':[],'samplers':[]}
  for node,kind,fn in self.motion:
   out=np.asarray([fn(t/duration) for t in times])
   if kind=='rotation':out/=np.linalg.norm(out,axis=1)[:,None]
   oi=self.access(out,'VEC4' if kind=='rotation' else 'VEC3');si=len(ani['samplers']);ani['samplers'].append({'input':ti,'output':oi,'interpolation':'LINEAR'});ani['channels'].append({'sampler':si,'target':{'node':node,'path':kind}})
  self.g['animations']=[ani];self.g['buffers'][0]['byteLength']=len(self.buf);js=json.dumps(self.g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);self.buf.extend(b'\0'*(-len(self.buf)%4));total=28+len(js)+len(self.buf)
  from pathlib import Path
  Path(path).write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(self.buf),0x004e4942)+self.buf)
  return {'triangles':triangles,'render_meshes':len(self.g['meshes']),'parts':self.count,'bytes':total,'animated_nodes':len(set(i for i,k,f in self.motion)),'channels':len(self.motion)}
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return float(t*t*(3-2*t))
def quat(axis,a):return Rotation.from_rotvec(np.array(axis)*a).as_quat().tolist()
def rounded(poly,f=.1,n=6):
 p=np.asarray(poly);out=[]
 for i,b in enumerate(p):
  a=b+(p[i-1]-b)*f;c=b+(p[(i+1)%len(p)]-b)*f
  for t in np.linspace(0,1,n,endpoint=False):out.append((1-t)**2*a+2*t*(1-t)*b+t*t*c)
 return np.asarray(out)
def footprint(a,b,w):
 L=b-a;rear=min(1.7,L*.1);fore=min(7,L*.22)
 return rounded([(a,-w*.82),(a+rear,-w),(b-fore,-w),(b-1.4,-w*.68),(b,-w*.33),(b,w*.33),(b-1.4,w*.68),(b-fore,w),(a+rear,w),(a,w*.82)],.14)
def rectpoly(a,b,c,d,r=.2):return rounded([(a,c),(b,c),(b,d),(a,d)],min(.23,r/min(b-a,d-c)),8)
def slab(poly,y0,y1,holes=None):
 s=Polygon(poly).buffer(0)
 for h in (holes or []):s=s.difference(Polygon(h).buffer(0))
 vs=[];fs=[];geoms=[s] if s.geom_type=='Polygon' else list(s.geoms)
 for g in geoms:
  if g.is_empty:continue
  for tri in triangulate(g):
   if not g.covers(tri.representative_point()):continue
   pts=np.array(tri.exterior.coords)[:3];base=len(vs);vs.extend([[x,y0,z] for x,z in pts]);vs.extend([[x,y1,z] for x,z in pts]);fs.extend([[base,base+2,base+1],[base+3,base+4,base+5]])
  for ring in [g.exterior,*g.interiors]:
   p=np.array(ring.coords);base=len(vs)
   for x,z in p:vs.extend([[x,y0,z],[x,y1,z]])
   for i in range(len(p)-1):a=base+2*i;fs.extend([[a,a+2,a+3],[a,a+3,a+1]])
 m=trimesh.Trimesh(vs,fs);m.fix_normals(multibody=True);return m
def wall(poly,y0,y1,shift=-.6,narrow=.94):
 p=np.array(poly);q=p.copy();q[:,0]+=shift;q[:,1]*=narrow;n=len(p);vs=np.r_[np.c_[p[:,0],np.full(n,y0),p[:,1]],np.c_[q[:,0],np.full(n,y1),q[:,1]]];fs=[]
 for i in range(n):j=(i+1)%n;fs.extend([[i,n+j,j],[i,n+i,n+j]])
 return trimesh.Trimesh(vs,fs,process=False)
def boxmesh(loc,dim,r=0):
 if r:m=slab(rectpoly(loc[0]-dim[0]/2,loc[0]+dim[0]/2,loc[2]-dim[2]/2,loc[2]+dim[2]/2,r),loc[1]-dim[1]/2,loc[1]+dim[1]/2)
 else:m=trimesh.creation.box(extents=dim);m.apply_translation(loc)
 return m
def tubes(points,r,sides=10):
 pts=np.asarray(points);vs=[];fs=[]
 for i,p in enumerate(pts):
  t=pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)];t=t/max(1e-9,np.linalg.norm(t));up=np.array([0,1,0]) if abs(t[1])<.9 else np.array([0,0,1]);u=np.cross(t,up);u/=max(1e-9,np.linalg.norm(u));w=np.cross(t,u)
  for a in np.linspace(0,2*np.pi,sides,endpoint=False):vs.append(p+r*(u*np.cos(a)+w*np.sin(a)))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;c=a+sides;d=b+sides;fs.extend([[a,b,d],[a,d,c]])
 return trimesh.Trimesh(vs,fs,process=False)
def ellipse(loc,radii):
 m=trimesh.creation.uv_sphere(count=[20,32]);m.apply_scale(radii);m.apply_translation(loc);return m
def readglb(path):
 data=open(path,'rb').read();l=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+l]);binary=data[28+l:]
 def access(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],k),dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*k),np.dtype(dt).itemsize)).copy()
 return g,access
