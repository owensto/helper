"""Generate a visual water-exclusion volume from the unchanged original hull triangles.
It is not a collision model. External water is never cut by a deck-level bounding rectangle.
"""
from pathlib import Path
import json,struct,hashlib,base64,math,sys
import numpy as np
root=Path(sys.argv[1]);b=(root/'assets/ATLAS_Bay_Play.glb').read_bytes();sha=hashlib.sha256(b).hexdigest();assert sha=='b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82'
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);blob=b[28+n:]
types={5126:'<f4',5125:'<u4',5123:'<u2'};sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def array(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(types[a['componentType']]);sz=sizes[a['type']];return np.ndarray((a['count'],sz),dtype=dt,buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',sz*dt.itemsize),dt.itemsize)).copy()
def local(n):
 if 'matrix'in n:return np.array(n['matrix']).reshape((4,4),order='F')
 x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
matrices={}
def walk(i,m):
 m=m@local(g['nodes'][i]);matrices[i]=m
 for j in g['nodes'][i].get('children',[]):walk(j,m)
for i in g['scenes'][g.get('scene',0)]['nodes']:walk(i,np.eye(4))
W,H=151,86;xs=np.linspace(-3.75,3.75,W);ys=np.linspace(-.52,1.18,H);X,Y=np.meshgrid(xs,ys);pos=np.zeros((H,W));neg=np.zeros((H,W));triangles=0
for i in[66,69]:
 node=g['nodes'][i];assert node['name'] in['EX_Hull__blue','EX_Hull__white']
 for p in g['meshes'][node['mesh']]['primitives']:
  v=array(p['attributes']['POSITION']);m=matrices[i];v=v@m[:3,:3].T+m[:3,3];inds=array(p['indices']).reshape(-1,3);triangles+=len(inds)
  for t in v[inds]:
   a,bb,c=t;den=(bb[1]-c[1])*(a[0]-c[0])+(c[0]-bb[0])*(a[1]-c[1]);
   if abs(den)<1e-10:continue
   ix=np.where((xs>=min(t[:,0])-1e-8)&(xs<=max(t[:,0])+1e-8))[0];iy=np.where((ys>=min(t[:,1])-1e-8)&(ys<=max(t[:,1])+1e-8))[0]
   if not len(ix) or not len(iy):continue
   xx,yy=np.meshgrid(xs[ix],ys[iy]);u=((bb[1]-c[1])*(xx-c[0])+(c[0]-bb[0])*(yy-c[1]))/den;vv=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;zz=u*a[2]+vv*bb[2]+(1-u-vv)*c[2];valid=(u>=-1e-7)&(vv>=-1e-7)&(u+vv<=1+1e-7)
   rows,cols=np.ix_(iy,ix);pos[rows,cols]=np.maximum(pos[rows,cols],np.where(valid,zz,0));neg[rows,cols]=np.maximum(neg[rows,cols],np.where(valid,-zz,0))
# Inset inside fiberglass, so an excluded pixel is covered by hull rather than open water.
pos=np.maximum(0,pos-.010);neg=np.maximum(0,neg-.010);rgba=np.zeros((H,W,4),dtype=np.uint8)
for t,channels in[(pos,(0,1)),(neg,(2,3))]:
 q=np.round(np.clip(t/1.4,0,1)*65535).astype(np.uint16);rgba[:,:,channels[0]]=q>>8;rgba[:,:,channels[1]]=q&255
out={'version':13,'modelSHA256':sha,'sourceNodes':[66,69],'width':W,'height':H,'xRange':[-3.75,3.75],'yRange':[-.52,1.18],'insetM':.010,'widthRangeM':1.4,'dataBase64':base64.b64encode(rgba.tobytes()).decode()};(root/'assets/hull_water13.json').write_text(json.dumps(out,separators=(',',':')))
yidx=int(np.argmin(abs(ys)));mid=int(W/2);report={'sourceTriangles':triangles,'sourceSHA256':sha,'grid':[W,H],'insetM':.01,'sampleWaterlineY':float(ys[yidx]),'waterlineHalfWidthsM':[[round(float(xs[j]),3),round(float(pos[yidx,j]),5)] for j in range(0,W,15)],'oldMidshipMaskHalfWidthM':1.27553,'newMidshipMaskHalfWidthM':float(pos[yidx,mid]),'maskBoundary':'Sampled unchanged hull XY projection, per-side half-width, linear interpolation; visual-only approximation.'};(root/'hull_mask13_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
