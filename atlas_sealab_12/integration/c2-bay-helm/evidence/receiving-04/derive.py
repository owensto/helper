"""Derive FROZEN receiving metadata from the already supplied Station03 ZIP.
No network, model/rig decode, topology audit, rendering, simulation or fitting.
Usage: python derive.py /path/to/ATLAS_CORE_Station03_Receiving.zip --out ./derived
The outer ZIP hash is checked before reading any member. No member is extracted.
"""
from pathlib import Path
import argparse,copy,gzip,hashlib,json,math,struct,zipfile
HERE=Path(__file__).resolve().parent
ZIP_SHA='a8d9e6f2601bae364f0848693c249eeb87aad23310c5ec8fb308581ecc5f2d11'
BASE='ba153f5d0b68391e4ac88e8a1e4a9d77fd60a069'
PINS={
 'source/design.json':'2e38a25a9cb15e3644eb6bf3295fc927340c19af139665b21f7f3df90ab89583',
 'geometry/authored-geometry.json':'f9103d812b7dcf7ac4d1f9d04b66fcaddad0e649672e5ac16cfc0555db5b7694',
 'geometry/source-ledger.json':'b7062ef558793742a30b6c8b88bd8383a54c8de1c7d598559785203009f1e09c',
 'geometry/support-regions.json':'3eca5dc2a9b66ebb2d7ea958b0c6e55983e08b3fa23b8a1a7b1d43be59fd7dd7',
 'geometry/s03-manifest.json':'56481a7c21bf13e119b2b7fb9da86a5b52eade4b5142bd3d8c2d3e63c272a16e',
 'geometry/station-build.json':'1b37ffd28b5dc612d824abb18b35a6b0cc637cb6a17c3c474544e39511506234',
}
def sha(b):return hashlib.sha256(b).hexdigest()
def canon(x):return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()+b'\n'
def M(a):
 assert len(a)==16 and all(math.isfinite(x) for x in a)
 return [[a[4*c+r] for c in range(4)] for r in range(4)]
def flat(a):return [a[r][c] for c in range(4) for r in range(4)]
I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
def mul(a,b):
 a,b=M(a),M(b);return flat([[sum(a[r][k]*b[k][c] for k in range(4)) for c in range(4)] for r in range(4)])
def inv(m):
 a=[r+[int(i==j) for j in range(4)] for i,r in enumerate(M(m))]
 for c in range(4):
  k=max(range(c,4),key=lambda k:abs(a[k][c]));assert abs(a[k][c])>1e-15
  a[c],a[k]=a[k],a[c];d=a[c][c];a[c]=[x/d for x in a[c]]
  for r in range(4):
   if r!=c:
    d=a[r][c];a[r]=[x-d*y for x,y in zip(a[r],a[c])]
 return flat([r[4:] for r in a])
def T(p):
 a=I.copy();a[12:15]=p;return a

def ranges(ids,n):
 if ids=='all':return [[0,n-1]]
 assert ids==sorted(set(ids)) and all(0<=i<n for i in ids)
 out=[]
 for i in ids:
  if out and i==out[-1][1]+1:out[-1][1]=i
  else:out.append([i,i])
 return out

def main():
 p=argparse.ArgumentParser();p.add_argument('receiving_zip',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
 assert sha(a.receiving_zip.read_bytes())==ZIP_SHA,'PINNED_RECEIVING_ZIP_REQUIRED'
 contract_bytes=(HERE/'contract.json').read_bytes();C=json.loads(contract_bytes)
 assert C['sourceSHA']==BASE and C['receivingZIP_SHA256']==ZIP_SHA
 assert C['scope']=='FROZEN_DESIGN_RECEIVING_ONLY' and not C['liveBindingAvailable']
 checks=[]
 def check(name,condition):
  assert condition,name;checks.append(name)
 z=zipfile.ZipFile(a.receiving_zip);manifest=json.loads(z.read('SHA256SUMS.json'))
 check('exact_existing_receiving_membership',set(z.namelist())==set(manifest)|{'SHA256SUMS.json'})
 for name,h in manifest.items():assert sha(z.read(name))==h,('input record hash',name)
 checks.append('54_existing_package_payload_hashes_not_baseline_audit')
 for n,h in PINS.items():assert sha(z.read(n))==h,n
 check('original_source_pin',z.read('SOURCE_SHA.txt').decode().strip()==BASE)
 read=lambda n:json.loads(z.read(n))
 design=read('source/design.json');ledger=read('geometry/source-ledger.json');geo=read('geometry/authored-geometry.json');regions=read('geometry/support-regions.json');cm=read('geometry/s03-manifest.json');build=read('geometry/station-build.json');resolved=read('geometry/design-resolved.json')
 check('resolved_design_exact_body',resolved['design']==design)
 check('manifest_geometry_ledger_design_links',cm['sourceSHA']==BASE and cm['geometryFingerprint']==PINS['geometry/authored-geometry.json'] and cm['sourceLedgerSHA256']==PINS['geometry/source-ledger.json'] and cm['designSHA256']==PINS['source/design.json'])
 check('support_compilation_linkage',regions['sourceSHA']==BASE and regions['authoredGeometrySHA256']==PINS['geometry/authored-geometry.json'] and regions['sourceLedgerSHA256']==PINS['geometry/source-ledger.json'] and regions['designSHA256']==PINS['source/design.json'])
 check('authored_code_link',geo['sourceGeometryCodeSHA256']==sha(z.read('source/geometry.js')))
 check('empty_station_original_activation',all(v is False for v in design['activation'].values()) and build['humansEnabled'] is False and build['publicActivation'] is False)
 # Byte equivalence of already supplied 25-part buffers only; no source topology audit.
 gp={p['render']['id']:p for p in geo['parts']};mp={p['id']:p for p in cm['geometryParts']}
 for name,pin in gp.items():
  for role,pk in [('render','render'),('proxy','collision')]:
   g=pin[role];ps=sha(struct.pack('<%df'%len(g['positions']),*g['positions']));ix=sha(struct.pack('<%dI'%len(g['indices']),*g['indices']))
   assert ps==g['positionSHA256']==mp[name][pk]['positionSHA256'];assert ix==g['indexU32SHA256']==mp[name][pk]['indexU32SHA256']
 check('25_unchanged_new_geometry_pin_pairs',len(gp)==len(mp)==25)
 controls={p['name']:T(p['positionM']) for p in design['controlFrames']};parents={**controls,**{h['id']:T(h['position']) for h in design['footHinges']}}
 parts=[]
 for pdef in design['parts']:
  parent=parents.get(pdef.get('parent'),I);local=T(pdef.get('position',[0,0,0]));matrix=mul(parent,local);pins=mp[pdef['id']]
  parts.append({'id':pdef['id'],'frameKind':'FROZEN_DESIGN_PART','parameters':pdef,'parentId':pdef.get('parent','CORE_STATION03_ASSEMBLY'),'localToParent':local,'parentToVessel':parent,'partToVessel':matrix,'vesselToPart':inv(matrix),'partToFrozenWorld':matrix,'renderGeometryHashes':pins['render'],'collisionGeometryHashes':pins['collision'],'analyticAuthority':('conservative closed OBB of supplied size' if pdef['shape']=='roundbox' else 'exact finite dimensions and baked geometry frame from unchanged part parameters'),'geometryFrameNote':'link/radial orientation and midpoints are baked in the supplied buffers; do not apply a second rotation/translation','collisionParticipation':True})
 byid={p['id']:p for p in parts}
 survivors=[]
 for src in ledger['retainedSources']:
  r={k:copy.deepcopy(v) for k,v in src.items() if k not in ['originalVertexBounds','sourceTriangles','restToVessel','retiredRanges','physicalMeaning','disjointWholeComponentsVerified']}
  r.update({'id':f"original:{src['originalNode']}:{src['primitive']}",'frameKind':'FROZEN_LEDGER_REST_NOT_LIVE','sourceToVessel':src['restToVessel'],'vesselToSource':inv(src['restToVessel']),'sourceToFrozenWorld':src['restToVessel'],'sourceFaceRangesInclusive':ranges(src['sourceTriangles'],src['originalTriangleCount']),'interiors':{'status':'UNKNOWN_UNCLASSIFIED','closedComponentFaceSets':None,'noPositiveVolumeClearance':True},'guardRecipe':'station03-receiving-contract/1.guard','collisionParticipation':True,'visibilityAffectsParticipation':False})
  survivors.append(r)
 check('complete_unique_130_survivor_transform_rows',len(survivors)==len({p['id'] for p in survivors})==130)
 supports=[]
 for region in regions['surfaces']:
  d=next(s for s in design['supportSurfaces'] if s['id']==region['id']);assert all(region[k]==v for k,v in d.items())
  pmat=byid[d['part']]['partToVessel'];cf=region['contactToPart'];mv=mul(pmat,cf)
  supports.append({**copy.deepcopy(region),'role':C['supportRoles'][d['id']],'mandatoryLoadSupport':d['id']!='back','partToVessel':pmat,'contactToVessel':mv,'vesselToContact':inv(mv),'contactToFrozenWorld':mv,'occupantAccepted':False,'frameKind':'FROZEN_DESIGN_CONTACT'})
 check('four_unchanged_compiled_supports',len(supports)==4 and sum(s['mandatoryLoadSupport'] for s in supports)==3)
 # Compare ONLY unchanged new-part/support matrices in historical zero-control records.
 # Original survivor state is REST BY DEFINITION; never promoted from pause to live/current.
 history=[];maxdelta=0.0
 for device in ['desktop','phone']:
  n=f'actual-host/{device}/{device}_down.json';old=read(n);snap=old['snapshot']
  check(device+'_historic_empty_down',snap['geometryIntact'] and snap['settlement']['value']==snap['settlement']['target']==0 and snap['wheelAngle']==snap['throttleAngle']==0 and not snap['humanFactoryEnabled'])
  for part in old['parts']:
   d=max(abs(x-y) for x,y in zip(part['localToVessel'],byid[part['render']['id']]['partToVessel']));maxdelta=max(maxdelta,d);assert d<=1e-10
  for s in old['surfaces']:
   d=max(abs(x-y) for x,y in zip(s['contactToVessel'],next(t['contactToVessel'] for t in supports if t['id']==s['id'])));maxdelta=max(maxdelta,d);assert d<=1e-10
  history.append({'device':device,'recordPathInPinnedZIP':n,'recordSHA256':sha(z.read(n)),'sourceSHA':snap['sourceSHA'],'historicSerial':snap['serial'],'historicHostSeconds':snap['hostSeconds'],'historicBoatUUID':snap['boatUUID'],'historicModelUUID':snap['modelUUID'],'currentFrameAuthority':False,'liveEpochProvided':False,'comparison':'Only new-part/support frozen zero-control matrices checked against previously reviewed record; no new browser/live sampling or survivor-state attestation.'})
 checks.append('historical_zero_control_parts_supports_consistent_not_live_binding')
 frozen={'value':0,'target':0,'bolsterPivotAnglesZRad':[0,0],'footHingeAnglesZRad':[0,0],'wheelAngleXRad':0,'throttleAngleZRad':0,'gear':0,'power':0,'rudder':0,'otherOriginalArticulation':'supplied ledger rest matrices; static design assignment not an observation','vesselToFrozenWorld':I,'frozenWorldToVessel':I,'frozenWorldMeaning':'synthetic vessel-metre design world; not Beaufort and not current simulation world'}
 inputs={n:sha(z.read(n)) for n in sorted(PINS)}
 inputs.update({n:sha(z.read(n)) for n in ['source/geometry.js','source/build-design.py','source/prepare.py','geometry/design-resolved.json','geometry/measurements.json','verification/compile_station_regions.py']})
 sourcepins={'reviewedSourceSHA':BASE,'reviewedRun':38887422403,'originalReceivingZIP_SHA256':ZIP_SHA,'originalPublicSHA':design['baseline']['publicSHA'],'originalModelSHA256':ledger['baselineModelSHA256'],'retainedRigSHA256':design['retainedAvatar']['rigSHA256'],'retainedAnimationSHA256':'b0f10003c14416330d30c41fe26d7ec86bc34e3b39ca9bd91ca78a54db415b94','reviewedCandidateManifestSHA256':PINS['geometry/s03-manifest.json'],'reviewedCandidateFingerprint':build['candidateFingerprint'],'inputRecordSHA256':inputs}
 tables={'survivingOriginalSources':survivors,'newParts':parts,'supportSurfaces':supports,'controlParents':[{'id':k,'parentToVessel':v,'frozenRotationRad':0} for k,v in parents.items()]}
 tablehash=sha(canon(tables));contracthash=sha(contract_bytes)
 world={'revision':'station03-frozen-world/1','source':sourcepins,'contractSHA256':contracthash,'frozenState':frozen,'tableSHA256':tablehash}
 worldhash=sha(canon(world))
 result={'revision':'station03-frozen-receiving-export/1','status':'FROZEN_UNOCCUPIED_DESIGN_NOT_LIVE','bindings':sourcepins,'receivingContractSHA256':contracthash,'derivationSHA256':sha(Path(__file__).read_bytes()),'geometryContractCodeSHA256':sha((HERE/'geometry-contract.cjs').read_bytes()),'collisionContactPolicy':C,'snapshotContext':{'mode':'FROZEN_DESIGN','frozenFrameId':C['frozen']['frameId'],'worldRevision':'s03-frozen-sha256:'+worldhash,'hostFrameId':None,'hostSeconds':None,'simulationEpoch':None,'activationEpoch':None,'runtimeScope':None,'vesselInstance':None,'stationId':design['stationId'],'consumedDtSeconds':0,'sourceStateAuthority':'Explicit frozen ledger/design assignment, NOT a live/paused host observation','liveBindingAvailable':False,'humanInstance':None},'frozenState':frozen,'worldRevisionDerivation':world,'tableSHA256':tablehash,**tables,'retirements':[{'originalNode':s['originalNode'],'primitive':s['primitive'],'retiredRanges':s['retiredRanges'],'positionSHA256':s['positionSHA256'],'originalIndexSHA256':s['indexSHA256'],'meaning':s['physicalMeaning']} for s in ledger['replacements']],'gripFrame':{'part':'wheel-rim','partToVessel':byid['wheel-rim']['partToVessel'],'vesselToPart':byid['wheel-rim']['vesselToPart'],'definition':C['grips']},'historicalEvidence':history,'acceptance':C['acceptance'],'unknowns':['130 retained-source interior component face sets unbound; full-domain volume clearance cannot pass.','No independent live survivor/new-part/support frame, simulation epoch or occupancy activation binding.','No human profile, contact solve, torso/back requirement satisfaction or full-range hand choreography.','No full-body, garment/self, coplanar/contained or swept-clearance acceptance.'],'originalGeometryArraysIncluded':False,'rigOrAnimationAssetsIncluded':False,'geometryChanged':False}
 check('all_tables_invertible',all(max(abs(x-y) for x,y in zip(mul(s['sourceToVessel'],s['vesselToSource']),I))<1e-12 for s in survivors) and all(max(abs(x-y) for x,y in zip(mul(p['partToVessel'],p['vesselToPart']),I))<1e-12 for p in parts))
 out=a.out;out.mkdir(parents=True,exist_ok=True);raw=canon(result);(out/'frozen-export.json').write_bytes(raw);(out/'frozen-export.json.gz').write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
 report={'revision':'station03-frozen-derivation-checks/1','passed':True,'checks':checks,'count':len(checks),'inputPackagePayloadsVerified':len(manifest),'frozenSources':len(survivors),'newParts':len(parts),'supports':len(supports),'sourceTriangles':sum(b-a+1 for s in survivors for a,b in s['sourceFaceRangesInclusive']),'unknownRetainedInteriors':len(survivors),'maxHistoricNewMatrixDelta':maxdelta,'frozenExportSHA256':sha(raw),'gzipSHA256':sha((out/'frozen-export.json.gz').read_bytes()),'worldRevision':result['snapshotContext']['worldRevision'],'contractSHA256':contracthash,'tableSHA256':tablehash,'newBrowserRuns':0,'newBaselineTopologyAudits':0,'humanFits':0,'fullBodyAccepted':False}
 (out/'derivation-report.json').write_bytes(canon(report));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
