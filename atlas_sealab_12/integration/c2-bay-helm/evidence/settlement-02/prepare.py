"""Versioned CORE-only endstop candidate, built from exact f641 + f560 observer."""
from pathlib import Path
import os,json,hashlib,shutil,re
HERE=Path(__file__).resolve().parent;OUT=Path(os.environ['C2_OUT']);BASE=OUT/'snapshot-site';SITE=OUT/'settlement-site'
sha=lambda b:hashlib.sha256(b).hexdigest()
if SITE.exists():shutil.rmtree(SITE)
shutil.copytree(BASE,SITE)
def patch(name,old,new):
 p=SITE/name;s=p.read_text();assert s.count(old)==1,(name,old[:90],s.count(old));p.write_text(s.replace(old,new))
shutil.copy2(HERE.parents[1]/'bolster-state.js',SITE/'c3-bolster-state.js')
patch('app.js','bolsterValue+=(bolsterTarget-bolsterValue)*(1-Math.exp(-4*fittingDt));','bolsterValue=window.CoreBayBolsterState.advance(bolsterValue,bolsterTarget,fittingDt);')
patch('c2-bootstrap.js',"await load('runtime.js');","await load('runtime.js');await load('c3-bolster-state.js');")
patch('c2-host-adapter.js','let invalid=op.ejected?', 'const bolsterState=G.CoreBayBolsterState.read(T,A);let invalid=op.ejected?')
patch('c2-host-adapter.js',"A.inspect().bolsters.value>.01||A.inspect().bolsters.target>.01?'BOLSTER_TRANSITION_UNAVAILABLE'", "!bolsterState.downStable?'BOLSTER_TRANSITION_UNAVAILABLE'")
patch('c2-host-adapter.js','clock:p.clock,roll:p.motion.renderEulerYXZ[0]', 'clock:p.clock,bolsterState,roll:p.motion.renderEulerYXZ[0]')
# The same immutable predicate result drives receiver and capture telemetry.
patch('c2-owner-snapshot.js','transitioning:Math.abs(A.inspect().bolsters.target-A.inspect().bolsters.value)>1e-5,','transitioning:current.bolsterState.transitioning,settlement:current.bolsterState,')
patch('c2-owner-snapshot.js','function observe(o){','function observe(o){ G.C3SettlementTrace?.observe(o);')
trace=r'''/* Test-only read-only committed trace; no RAF, clock or control writes. */
(function(G){let rows=[];G.C3SettlementTrace=Object.freeze({clear:()=>{rows=[];},read:()=>JSON.parse(JSON.stringify(rows)),observe:o=>{const q=o.current,s=q?.bolsterState;if(!s)return;const raw=o.A.inspect().bolsters;rows.push({frame:o.serial,clock:q.clock,hostSeconds:o.A.state.elapsed,activation:o.activation,receiverAccepted:o.latest?.receiverAccepted===true,reason:o.latest?.reason||null,skinValid:o.latest?.skin?.valid===true,settlement:s,raw,stepUnchanged:o.A.state.step===G.C2_ORIGINAL_STEP,captainUUID:o.captain.uuid});if(rows.length>6000)rows.shift();}});})(window);
'''
(SITE/'c3-trace.js').write_text(trace)
patch('c2-bootstrap.js',"await load('c2-owner-snapshot.js');", "await load('c3-trace.js');await load('c2-owner-snapshot.js');")
policy=json.loads((SITE/'c2-occupancy-policy.json').read_text());old=json.loads(json.dumps(policy));new=json.loads((HERE/'policy.json').read_text());policy['revision']='core-bay-body-occupancy/2';policy['settlement']=new;policy['policySourceSHA']=os.environ['GITHUB_SHA'];policy['occupiedStation']['bolsters']=new['occupancyRule']
# Physical probes, contact scope and obstacle semantics are unchanged.
for k in ['permittedContact','ordinaryContactPolicy','sources','H4Scope']:assert policy[k]==old[k]
(SITE/'c2-occupancy-policy.json').write_text(json.dumps(policy,indent=2)+'\n')
m=json.loads((SITE/'c2-candidate.json').read_text());m.update({'revision':'c2-bay-helm/settlement-02','sourceSHA':os.environ['GITHUB_SHA'],'settlementRevision':new['revision'],'scope':'Actual current host + CORE exact mechanical endstop reconciliation; H4 limited review only. No feasible gameplay station approved.','snapshotPolicySHA256':sha((SITE/'c2-occupancy-policy.json').read_bytes()),'underlyingRuntimeBeforeCorrection':'f641b5f2eaf2305e9c86b851843304260a811078'})
m['assets']={str(p.relative_to(SITE)):sha(p.read_bytes()) for p in sorted(SITE.rglob('*')) if p.is_file() and p.name not in ['index.html','c2-candidate.json']}
mr=(json.dumps(m,indent=2)+'\n').encode();(SITE/'c2-candidate.json').write_bytes(mr)
s=(SITE/'index.html').read_text();s,n=re.subn(r'(<meta name="c2-manifest" content=")[a-f0-9]{64}(">)',lambda a:a[1]+sha(mr)+a[2],s);assert n==1;(SITE/'index.html').write_text(s)
hashes=lambda r:{str(p.relative_to(r)):sha(p.read_bytes()) for p in sorted(r.rglob('*')) if p.is_file()}
before=hashes(BASE);after=hashes(SITE);delta=sorted(p for p in before if before[p]!=after[p])
assert delta==sorted(['app.js','c2-bootstrap.js','c2-host-adapter.js','c2-owner-snapshot.js','c2-occupancy-policy.json','c2-candidate.json','index.html']),delta
for p in before:
 if p.startswith('human/') or p.endswith('.glb') or p=='command-motion.js':assert before[p]==after[p],p
report={'sourceSHA':os.environ['GITHUB_SHA'],'baselineRuntime':'f641b5f2eaf2305e9c86b851843304260a811078','baselineVerification':'f560ee69dc9bd766bd024c7571f866230445a790','manifestSHA256':sha(mr),'fileHashes':after,'candidateFingerprint':sha(json.dumps(after,sort_keys=True,separators=(',',':')).encode()),'snapshotBaseFingerprint':sha(json.dumps(before,sort_keys=True,separators=(',',':')).encode()),'modifiedGeneratedFiles':delta,'newGeneratedFiles':sorted(set(after)-set(before)),'unchangedOwnerRigAndModules':True,'unchangedModelAndContactProbes':True,'publicActivation':False,'gameplayStationAvailable':False}
(OUT/'settlement-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='fileHashes'},indent=2))
# Reuse final fixed-stimulus/fresh-frame full regression verifier on this NEW
# candidate, preserving source lineage rather than claiming unchanged f641.
s=(OUT/'verify-fixed-stimulus.py').read_text();s=s.replace("'candidateSourceSHA':'f641b5f2eaf2305e9c86b851843304260a811078'", "'candidateSourceSHA':os.environ['GITHUB_SHA']")
s=s.replace("OUT=ROOT/'review';", "OUT=ROOT/'settlement-regression';")
(OUT/'verify-settlement-regression.py').write_text(s)
