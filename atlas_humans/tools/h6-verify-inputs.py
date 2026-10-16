import json,hashlib,struct,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
p=read('profiles/bay12/profile.json');candidate=read('profiles/bay12-h6/candidate.json');sources=read('profiles/bay12-h6/source-set.json')
assert sha('profiles/bay12/profile.json')==candidate['profileSHA256']=='2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902'
assert sha('profiles/bay12-h6/source-set.json')==candidate['sourceSetSHA256']
assert sha('profiles/bay12-h5/rim-region.json')=='a3f1242461f85897e4c3e729fd190ba714a0382d6246a01c8bc7693cae6b8f68'
for path,key in [('assets/BayCalibration.glb','modelSHA256'),('assets/RocketboxCaptain.glb','rigSHA256'),('assets/animations.json','animationSHA256')]:assert sha(path)==p[key],path
b=(root/'assets/BayCalibration.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);raw={s['name']:s for s in json.loads(pathlib.Path('/tmp/atlas-h6-source-geometry.json').read_text())}
for s in sources['sources']:
 node=g['nodes'][s['originalNodeIndex']];assert node['name']==s['originalNodeName'];assert node['mesh']==s['meshIndex'];primitive=g['meshes'][node['mesh']]['primitives'][s['primitiveIndex']];assert primitive['attributes']['POSITION']==s['positionAccessor'];assert primitive['indices']==s['indexAccessor'];assert g['accessors'][primitive['indices']]['count']/3==s['triangleCount']
 actual=raw[s['id']];checksum=hashlib.sha256(json.dumps({'positions':actual['positions'],'indices':actual['indices']},separators=(',',':')).encode()).hexdigest();assert checksum==s['positionIndexJSONSHA256'],s['id']
result={'status':'pass','modelSHA256':p['modelSHA256'],'rigSHA256':p['rigSHA256'],'animationSHA256':p['animationSHA256'],'sourceSetSHA256':candidate['sourceSetSHA256'],'exactSourceNodesPrimitivesAccessorsAndGeometryVerified':len(sources['sources']),'productionEnabled':False}
(root/'evidence/h6/input-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
