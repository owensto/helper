"""Resolve one proposed station against immutable original sources; no avatar solve."""
from pathlib import Path
import json,struct,hashlib,os,math
import numpy as np
HERE=Path(__file__).resolve().parent
BASE=Path(os.environ['S03_BASE']);OUT=Path(os.environ['S03_OUT']);OUT.mkdir(exist_ok=True,parents=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def compact(o):return json.dumps(o,sort_keys=True,separators=(',',':')).encode()
def write(n,o):
 b=json.dumps(o,indent=2).encode()+b'\n';(OUT/n).write_bytes(b);return sha(b)
spec=json.loads((HERE/'design.json').read_text());raw=(BASE/'settlement-site/assets/ATLAS_Bay_Play.glb').read_bytes();assert sha(raw)==spec['baseline']['modelSHA256']
n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);data=raw[n+28:]
parents={j:i for i,node in enumerate(g['nodes']) for j in node.get('children',[])}
def matrix(i):
 node=g['nodes'][i]
 if 'matrix' in node:m=np.array(node['matrix']).reshape(4,4,order='F')
 else:
  x,y,z,w=node.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]);m=np.eye(4);m[:3,:3]=r@np.diag(node.get('scale',[1,1,1]));m[:3,3]=node.get('translation',[0,0,0])
 return matrix(parents[i])@m if i in parents else m

def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];c={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4,'MAT4':16}[a['type']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',np.dtype(dt).itemsize*c)
 return np.ndarray((a['count'],c),dtype=dt,buffer=data,offset=offset,strides=(stride,np.dtype(dt).itemsize)).copy()

def normalized(name):
 import re
 return re.sub(r'[\[\]\.:/]','',name.replace(' ','_'))

removed={i:r for r in spec['replacements'] for i in r['nodes']};bindings=[];retained=[]
reachable=set()
def visit(i):
 if i in reachable:return
 reachable.add(i)
 for j in g['nodes'][i].get('children',[]):visit(j)
for i in g['scenes'][g.get('scene',0)]['nodes']:visit(i)
for i in sorted(reachable):
 node=g['nodes'][i]
 if 'mesh' not in node:continue
 primitives=g['meshes'][node['mesh']]['primitives'];assert i not in removed or len(primitives)==1
 for pi,pr in enumerate(primitives):
  pos=accessor(pr['attributes']['POSITION']);ix=accessor(pr['indices']).reshape(-1,3).astype('<u4');m=matrix(i)
  rec={'originalNode':i,'originalName':node['name'],'runtimeName':normalized(node['name']),'mesh':node['mesh'],'primitive':pi,'primitiveCount':len(primitives),'positionAccessor':pr['attributes']['POSITION'],'indexAccessor':pr['indices'],'originalTriangleCount':len(ix),'positionSHA256':sha(pos.astype('<f4').tobytes()),'indexSHA256':sha(ix.tobytes()),'restToVessel':m.flatten(order='F').tolist(),'originalParentNode':parents.get(i),'originalVertexBounds':{'min':(pos@m[:3,:3].T+m[:3,3]).min(0).tolist(),'max':(pos@m[:3,:3].T+m[:3,3]).max(0).tolist()}}
  if i in removed:
   r=removed[i];mask=np.zeros(len(ix),bool)
   if r['faces']=='all':mask[:]=True
   else:
    for a,b in r['faces']:assert 0<=a<=b<len(ix);mask[a:b+1]=True
   # Verify that no retirement cuts an indexed/welded connected component.
   rounded=np.round(pos.astype(float)/1e-6).astype('int64');_,rev=np.unique(rounded,axis=0,return_inverse=True)
   removedVerts=set(rev[ix[mask]].ravel().tolist());keptVerts=set(rev[ix[~mask]].ravel().tolist());assert not (removedVerts&keptVerts),('component cut',i)
   rec.update({'retiredRanges':r['faces'],'physicalMeaning':r['meaning'],'retiredTriangleCount':int(mask.sum()),'retainedTriangleCount':int((~mask).sum()),'retainedIndexSHA256':sha(ix[~mask].tobytes()),'disjointWholeComponentsVerified':True})
   bindings.append(rec)
   if not (~mask).any():continue
   rec={**rec,'sourceTriangles':np.where(~mask)[0].tolist()}
  else:rec={**rec,'sourceTriangles':'all'}
  retained.append(rec)
assert set(removed)==set(r['originalNode'] for r in bindings)
control=[]
for f in spec['controlFrames']:
 i=f['node'];node=g['nodes'][i];assert node['name']==f['name'];control.append({**f,'originalParentNode':parents[i],'restToVessel':matrix(i).flatten(order='F').tolist(),'originalLocalPosition':node.get('translation',[0,0,0])})
ledger={'revision':'station03-source-replacement-ledger/1','baselineModelSHA256':sha(raw),'replacements':bindings,'controlFrameChanges':control,'retainedSources':retained,'hiddenIsNotExcluded':True,'renderAndCollisionRetirementTogether':True,'originalBytesModified':False,'roundingForConnectivityOnlyM':1e-6}
write('source-ledger.json',ledger)
# Preliminary geometric layout screen only. Arm/leg lengths are raw bind data
# scaled by nominal static source height; they are not an evaluated HUMANS pose.
rig=(BASE/'owner-source/assets/RocketboxCaptain.glb').read_bytes();assert sha(rig)==spec['retainedAvatar']['rigSHA256']
saved=(g,data,parents);n=struct.unpack_from('<I',rig,12)[0];g=json.loads(rig[20:20+n]);data=rig[n+28:];parents={j:i for i,node in enumerate(g['nodes']) for j in node.get('children',[])}
points=[]
for i,node in enumerate(g['nodes']):
 if 'mesh' in node:
  for p in g['meshes'][node['mesh']]['primitives']:
   ps=accessor(p['attributes']['POSITION']);m=matrix(i);points.append(ps@m[:3,:3].T+m[:3,3])
pts=np.concatenate(points);rawHeight=float(np.ptp(pts[:,1]));scale=1.93/rawHeight;names={n.get('name',''):i for i,n in enumerate(g['nodes'])};lengths={}
for side in ['L','R']:
 for a,b in [('UpperArm','Forearm'),('Forearm','Hand'),('Thigh','Calf'),('Calf','Foot')]:lengths[side+':'+a+'-'+b]=float(np.linalg.norm(matrix(names['Bip01_'+side+'_'+a])[:3,3]-matrix(names['Bip01_'+side+'_'+b])[:3,3])*scale)
g,data,parents=saved
screen={'revision':'station03-geometric-layout-screen/1','notHumanFit':True,'sourceRigSHA256':sha(rig),'bindMeshRawHeight':rawHeight,'nominalUniformScale':scale,'bindSegmentLengthsM':lengths,'pelvisReferenceM':[-1.87,1.11,.18],'shoulderReferencesM':[[-1.77,1.665,-.043],[-1.77,1.665,.403]],'ankleReferencesM':[[-1.315,.62,.02],[-1.315,.62,.34]],'referenceStatus':'Owner design target assumptions only; not rig offsets or current fitted joints; static bind scale not claimed identical to posed H4 calibration','seatTopM':.98,'bothFootTopM':.51,'seatFootDropM':.47,'seatFootForwardM':.64,'footSeparationM':.32,'wheelCenterM':[-1.34,1.32,.18],'oldSeatFootDropM':.689440041,'reductionM':.689440041-.47}
for side,z in [('L',.015),('R',.345)]:
 shoulder=np.array(screen['shoulderReferencesM'][0 if side=='L' else 1]);grip=np.array([-1.356,1.32,z]);arm=lengths[side+':UpperArm-Forearm']+lengths[side+':Forearm-Hand'];dist=float(np.linalg.norm(grip-shoulder));screen.setdefault('reachScreen',[]).append({'side':side,'referenceShoulderToRimM':dist,'bindArmSumM':arm,'grossReserveM':arm-dist,'reachIsNotAccepted':True})
write('measurements.json',screen)
write('design-resolved.json',{'sourceDesignSHA256':sha((HERE/'design.json').read_bytes()),'design':spec,'ledgerSHA256':sha((OUT/'source-ledger.json').read_bytes()),'measurementsSHA256':sha((OUT/'measurements.json').read_bytes()),'sourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'fullBodyAccepted':False})
print(json.dumps({'retiredSources':len(bindings),'retiredFaces':sum(r['retiredTriangleCount'] for r in bindings),'retainedSources':len(retained),'newParts':len(spec['parts']),'ledger':sha((OUT/'source-ledger.json').read_bytes()),'reachScreen':screen['reachScreen'],'humanActivation':False},indent=2))
