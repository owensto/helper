"""Check an ATLAS GLB's structure and required working pivots before browser review.
Usage: python validate_model12.py boat.glb --contract model-contract12.json --out model-audit.json
Standard library only. This is NOT a geometry watertightness or physics validator.
"""
from pathlib import Path
import argparse,hashlib,json,math,struct,sys

def audit(path:Path,contract:Path)->dict:
 raw=path.read_bytes();issues=[];warnings=[]
 def check(ok,message):
  if not ok:issues.append(message)
 check(len(raw)>=20,'Truncated GLB')
 if issues:raise ValueError(issues[0])
 magic,version,size=struct.unpack_from('<4sII',raw)
 check(magic==b'glTF' and version==2,'Expected GLB 2.0');check(size==len(raw),'GLB header byte length mismatch')
 chunks=[];at=12
 while at+8<=len(raw):
  n,kind=struct.unpack_from('<II',raw,at);at+=8
  if at+n>len(raw):raise ValueError('Chunk exceeds file length')
  chunks.append((kind,raw[at:at+n]));at+=n
 check(at==len(raw),'Trailing or partial chunk');check(bool(chunks) and chunks[0][0]==0x4e4f534a,'First chunk must be JSON')
 d=json.loads(chunks[0][1].rstrip(b'\x00 \r\n'));binary=next((b for k,b in chunks if k==0x004e4942),b'');nodes=d.get('nodes',[]);meshes=d.get('meshes',[]);accessors=d.get('accessors',[]);views=d.get('bufferViews',[])
 required=json.loads(contract.read_text())['requiredWorkingNodes'];names={}
 for i,n in enumerate(nodes):names.setdefault(n.get('name',''),[]).append(i)
 for n in required:check(len(names.get(n,[]))==1,'Required working node missing or duplicated: '+n)
 parents={};seen=set();stack=set()
 def visit(i):
  check(isinstance(i,int) and 0<=i<len(nodes),'Invalid child node reference')
  if not isinstance(i,int) or not 0<=i<len(nodes):return
  if i in stack:issues.append('Cycle in node hierarchy');return
  if i in seen:return
  stack.add(i)
  for child in nodes[i].get('children',[]):
   check(child not in parents or parents[child]==i,'Node has multiple parents');parents[child]=i;visit(child)
  stack.remove(i);seen.add(i)
 for i in range(len(nodes)):visit(i)
 for n in nodes:
  if 'mesh' in n:check(isinstance(n['mesh'],int) and 0<=n['mesh']<len(meshes),'Invalid mesh reference')
  for key in ['matrix','translation','rotation','scale']:
   if key in n:check(all(isinstance(x,(int,float)) and math.isfinite(x) for x in n[key]),'Non-finite node transform')
 for i,b in enumerate(d.get('buffers',[])):
  if b.get('uri'):warnings.append('External/data buffer requires loader verification: '+str(i))
  elif i==0:check(b.get('byteLength',0)<=len(binary),'Embedded buffer exceeds BIN chunk')
 for v in views:
  if v.get('buffer',0)==0:check(v.get('byteOffset',0)+v.get('byteLength',0)<=len(binary),'Buffer view exceeds BIN chunk')
 vertices=triangles=checked=0
 for mesh in meshes:
  for p in mesh.get('primitives',[]):
   pos=p.get('attributes',{}).get('POSITION');check(isinstance(pos,int) and 0<=pos<len(accessors),'Primitive missing valid positions')
   if not isinstance(pos,int) or not 0<=pos<len(accessors):continue
   a=accessors[pos];vertices+=a.get('count',0)
   if p.get('mode',4)==4:
    ix=p.get('indices');count=accessors[ix]['count'] if isinstance(ix,int) and 0<=ix<len(accessors) else a.get('count',0);triangles+=count//3
   if 'material' in p:check(0<=p['material']<len(d.get('materials',[])),'Invalid primitive material')
   if a.get('sparse') or a.get('componentType')!=5126 or a.get('type')!='VEC3' or 'bufferView' not in a:
    warnings.append('Positions require sparse/compressed/non-float loader verification');continue
   view=views[a['bufferView']]
   if view.get('buffer',0)!=0:continue
   offset=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',12)
   check(offset+max(0,a['count']-1)*stride+12<=len(binary),'Position accessor exceeds BIN chunk')
   if offset+max(0,a['count']-1)*stride+12>len(binary):continue
   check(all(math.isfinite(x) for i in range(a['count']) for x in struct.unpack_from('<3f',binary,offset+i*stride)),'Non-finite vertex positions');checked+=a['count']
 for image in d.get('images',[]):
  if image.get('uri') and not image['uri'].startswith('data:'):warnings.append('External image must be packaged: '+image['uri'])
 return {'file':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'structure_passed':not issues,'issues':issues,'warnings':sorted(set(warnings)),'nodeCount':len(nodes),'meshCount':len(meshes),'verticesReferenced':vertices,'triangleEstimate':triangles,'finitePositionValuesChecked':checked,'requiredPivots':required,'requiresRenderedReview':True,'watertightnessValidated':False,'physicsValidated':False,'arbitraryImporterImplemented':False}

def main()->int:
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('model',type=Path);parser.add_argument('--contract',type=Path,default=Path(__file__).with_name('model-contract12.json'));parser.add_argument('--out',type=Path);a=parser.parse_args()
 try:r=audit(a.model,a.contract)
 except (OSError,ValueError,KeyError,IndexError,struct.error) as e:r={'structure_passed':False,'issues':[str(e)],'requiresRenderedReview':True,'physicsValidated':False}
 text=json.dumps(r,indent=2)
 if a.out:a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(text+'\n')
 print(text);return 0 if r['structure_passed'] else 1
if __name__=='__main__':sys.exit(main())
