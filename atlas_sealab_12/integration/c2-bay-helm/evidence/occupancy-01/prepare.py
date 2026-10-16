"""Test-only continuation of exact f641 runtime; separately fingerprinted owner snapshot variant."""
from pathlib import Path
import os, json, hashlib, shutil, subprocess, struct, re, math, sys
HERE=Path(__file__).resolve().parent
OUT=Path(os.environ.get('C2_OUT','/tmp/atlas-c2-bay-helm'))
PIN='f641b5f2eaf2305e9c86b851843304260a811078'
H6='417a3f86656c3e4094453a5dae9476a4e9cdc983'
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda p:subprocess.check_output(['git','show',p])
if sys.argv[1]=='test':
    source=git(PIN+':atlas_sealab_12/integration/c2-bay-helm/verify.py').decode()
    old="meshes[0].geometry.attributes.position.setX(166,c2ProbeOriginal+.5);"
    new="""const m=meshes[0],T=ATLASRuntime,point=()=>{const v=new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,166);m.applyBoneTransform(166,v);return m.localToWorld(v);};m.updateMatrixWorld(true);m.skeleton.update();const a=point();m.geometry.attributes.position.setX(166,c2ProbeOriginal+.5);const oldDisplacement=point().distanceTo(a);if(!(oldDisplacement>0))throw Error('CORRUPTION_STIMULUS_DEGENERATE');m.geometry.attributes.position.setX(166,c2ProbeOriginal+(.5*.5/oldDisplacement));const displacement=point().distanceTo(a);window.C2_CORRUPTION_METRES={oldAssetOffset:.5,oldDisplacementM:oldDisplacement,correctedDisplacementM:displacement,index:166,meshUUID:m.uuid};if(Math.abs(displacement-.5)>.0001)throw Error('CORRUPTION_METRE_ASSERTION');"""
    assert source.count(old)==1
    source=source.replace(old,new)
    needle="p.wait_for_function('C2.inspect().reason===\"HUMAN_PHYSICAL_CONTACT_REJECTED\"');"
    assert source.count(needle)==1
    source=source.replace(needle,"r['corruptionStimulus']=p.evaluate('C2_CORRUPTION_METRES');"+needle)
    source=source.replace("'candidateSourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED')", "'candidateSourceSHA':"+repr(PIN)+",'verifierSourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED')")
    # Positive readiness must be a newer committed owner frame, not a cached
    # pre-weather success. No time/physics mutation or tolerance change here.
    helper="""def fresh_receiver(p):
 before=p.evaluate('C2.inspect().frameId')
 p.wait_for_function('(f)=>{const q=C2.read();return q?.receiverAccepted===true && q.context.frameId>f && Math.abs(q.frame.time-BAYPLAY.state.elapsed)<1e-9;}',arg=before,timeout=45000)
 r.setdefault('freshReceiverBoundaries',[]).append(p.evaluate('(f)=>({before:f,after:C2.read().context.frameId,time:C2.read().frame.time,hostSeconds:BAYPLAY.state.elapsed,worldRevision:C2.read().context.worldRevision})',before))
"""
    anchor='def physical_ready(p):'
    assert source.count(anchor)==1
    source=source.replace(anchor,helper+anchor)
    source,replacements=re.subn(r"p\.wait_for_function\('C2\.read\(\)\?\.receiverAccepted===true'(?:,timeout=45000)?\)", 'fresh_receiver(p)',source)
    assert replacements>=10,replacements
    (OUT/'verify-fixed-stimulus.py').write_text(source)
    (OUT/'verification-delta.json').write_text(json.dumps({'runtimeSHA':PIN,'sourceVerifierSHA256':sha(git(PIN+':atlas_sealab_12/integration/c2-bay-helm/verify.py')),'currentVerifierSHA256':sha(source.encode()),'allowedDelta':'measure and apply 0.5m actual skinned displacement rather than 0.5 asset-coordinate units; require positive readiness from a newer committed frame with matching actual host seconds; record two source revisions','unchangedProbeTolerances':True,'runtimeDelta':[]},indent=2))
    print('Corrected stimulus only; exact f641 runtime retained')
    sys.exit()
assert sys.argv[1]=='snapshot'
BASE=OUT/'site';site=OUT/'snapshot-site';shutil.copytree(BASE,site,dirs_exist_ok=True)
raw=git(H6+':atlas_humans/profiles/bay12-h6/source-set.json')
assert sha(raw)=='2b5f5d7f2758afce4f6953090c63dd7c35903c93be4fdd0b7422b14e79f70a3a'
sources=json.loads(raw);assert len(sources['sources'])==61
(site/'c2-h6-source-set.json').write_bytes(raw)
b=(BASE/'assets/ATLAS_Bay_Play.glb').read_bytes();assert sha(b)==sources['modelSHA256'];n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);binary=b[28+n:]
def values(i):
    a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];width={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];size=struct.calcsize('<'+fmt);stride=v.get('byteStride',width*size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt,binary,off+j*stride+k*size)[0] for j in range(a['count']) for k in range(width)]
def packed_hash(v,fmt):return sha(struct.pack('<'+fmt*len(v),*v).hex().encode())
metadata=[]
for s in sources['sources']:
    node=doc['nodes'][s['originalNodeIndex']];p=doc['meshes'][node['mesh']]['primitives'][s['primitiveIndex']]
    assert node['name']==s['originalNodeName'] and node['mesh']==s['meshIndex'] and p['attributes']['POSITION']==s['positionAccessor'] and p['indices']==s['indexAccessor']
    pos=values(s['positionAccessor']);ix=values(s['indexAccessor']);jspos=[int(v) if float(v).is_integer() else v for v in pos]
    jsonhash=sha(json.dumps({'positions':jspos,'indices':ix},separators=(',',':')).encode())
    assert jsonhash==s['positionIndexJSONSHA256'],(s['id'],jsonhash,s['positionIndexJSONSHA256'])
    metadata.append({'id':s['id'],'originalNodeIndex':s['originalNodeIndex'],'positionHexSHA256':packed_hash(pos,'f'),'indexU32HexSHA256':packed_hash(ix,'I')})
meta={'sourceSetSHA256':sha(raw),'modelSHA256':sha(b),'hashEncoding':'SHA256 of lowercase ASCII hex of packed little-endian Float32 positions / Uint32 indices; H6 JSON hash independently checked against actual original accessors','sources':metadata,'originalNodes':doc['nodes']}
(site/'c2-source-metadata.json').write_text(json.dumps(meta,separators=(',',':'))+'\n')
# Policy is an independent CORE decision. No visibility/name-based exclusions.
policy=json.loads((HERE/'policy.json').read_text());assert policy['decision']['gameplayOccupancyAvailable'] is False
rows=[]
for s in sources['sources']:
    complete=s['topology']['solidComplete']
    rows.append({'id':s['id'],'originalNodeIndex':s['originalNodeIndex'],'primitiveIndex':s['primitiveIndex'],'geometryDigest':s['positionIndexJSONSHA256'],'collisionParticipation':True,'policy':'solid' if complete else 'sheet','policyReason':'CORE conservatively designates the complete original source volume as nonpenetrable diagnostic occupancy geometry' if complete else 'CORE designates the original open triangle set as a two-sided zero-thickness crossing barrier; physical thickness and closed volume remain unavailable','components':s['topology']['components'],'sidedness':'both','thicknessM':None if complete else 0,'physicalThicknessKnown':False,'signedInteriorAvailable':bool(complete),'visibilityAffectsParticipation':False,'excludeFromBodyTests':False,'allowedOrdinaryPenetrationM':0,'numericToleranceM':1e-7,'requiredSampledClearanceM':0.002,'permittedContactException':'node139 seat finite patch/selected H4 probe only' if s['originalNodeIndex']==139 else None})
policy['sources']=rows;policy['sourceSetSHA256']=sha(raw);policy['policySourceSHA']=os.environ['GITHUB_SHA']
(site/'c2-occupancy-policy.json').write_text(json.dumps(policy,indent=2)+'\n');shutil.copy2(HERE/'capture.js',site/'c2-owner-snapshot.js')
s=(site/'c2-host-adapter.js').read_text();needle="}catch(e){invalidate(e.message||'C2_INVALID_SAMPLE');if(/WORLD/.test(e.message))reDescribe();}}"
assert s.count(needle)==1
s=s.replace(needle,"}catch(e){invalidate(e.message||'C2_INVALID_SAMPLE');if(/WORLD/.test(e.message))reDescribe();}finally{try{G.C2Occupancy?.observe({T,A,spec,inputs,candidate,current,latest,captain,serial,activation,grant});}catch(e){G.C2Occupancy?.failure(String(e.stack||e));}}}")
(site/'c2-host-adapter.js').write_text(s)
s=(site/'c2-bootstrap.js').read_text();needle="await load('c2-host-adapter.js');";assert s.count(needle)==1;s=s.replace(needle,"await load('c2-owner-snapshot.js');await C2Occupancy.ready;"+needle);(site/'c2-bootstrap.js').write_text(s)
m=json.loads((site/'c2-candidate.json').read_text());m.update({'sourceSHA':os.environ['GITHUB_SHA'],'diagnosticRuntimeBaseSHA':PIN,'snapshotSourceSetSHA':H6,'snapshotPolicySHA256':sha((site/'c2-occupancy-policy.json').read_bytes()),'snapshotDelta':['c2-host-adapter.js: finally-only read-only diagnostic sink','c2-bootstrap.js: preload capture sink','additional metadata/policy/source-set/capture files'],'scope':'C2 owner-state capture variant of f641; H4 limited diagnostic only; station remains unavailable for full-body/gameplay'})
m['assets']={str(p.relative_to(site)):sha(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file() and p.name not in ['index.html','c2-candidate.json']}
mr=(json.dumps(m,indent=2)+'\n').encode();(site/'c2-candidate.json').write_bytes(mr);s=(site/'index.html').read_text();s,nsub=re.subn(r'(<meta name="c2-manifest" content=")[a-f0-9]{64}(">)',lambda a:a[1]+sha(mr)+a[2],s);assert nsub==1;(site/'index.html').write_text(s)
hashes=lambda root:{str(p.relative_to(root)):sha(p.read_bytes()) for p in sorted(root.rglob('*')) if p.is_file()}
old=hashes(BASE);new=hashes(site);delta=[p for p,h in old.items() if new[p]!=h];assert set(delta)=={'index.html','c2-candidate.json','c2-host-adapter.js','c2-bootstrap.js'},delta
record={'sourceSHA':os.environ['GITHUB_SHA'],'runtimeBaseSHA':PIN,'originalRuntimeBuild':json.loads((OUT/'build.json').read_text()),'fileHashes':new,'candidateFingerprint':sha(json.dumps(new,sort_keys=True,separators=(',',':')).encode()),'allowedDelta':delta,'addedFiles':sorted(set(new)-set(old)),'H6SourceSetSHA256':sha(raw),'sourceGeometryVerified':len(metadata),'publicUnchanged':True,'humanSourceUnchanged':True,'H7Adopted':False,'H5Adopted':False}
(OUT/'snapshot-build.json').write_text(json.dumps(record,indent=2)+'\n');shutil.copy2(site/'c2-occupancy-policy.json',OUT/'occupancy-policy.json');print(json.dumps({k:v for k,v in record.items() if k not in ['fileHashes','originalRuntimeBuild']},indent=2))
