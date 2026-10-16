"""Build isolated C2 surface/clock candidate. Positive builds fail without matching owner inputs."""
from pathlib import Path
import os,json,hashlib,shutil
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=Path(os.environ.get('C2_OUT','/tmp/atlas-c2-bay-helm'));BASE=ROOT/'atlas_sealab_12/live';C1=HERE.parent/'c1'
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=json.loads((HERE/'inputs.json').read_text());spec=json.loads((HERE/'contacts.json').read_text())
assert sha((HERE/'contacts.json').read_bytes())==inputs['physicalContactSHA256'],'CONTACT_DIGEST_MISMATCH'
assert sha((C1/'host-hooks.js').read_bytes())=='ad928f37dbfde0de2455a52744377a417a117c71c1a04f483283482d5728d9a1'
assert sha((C1/'descriptor.json').read_bytes())=='851b0932720fcfbec786778cc71a9c76fecd4b1a96e322872b3574c6c7f41db3'
manifestPath=ROOT/'atlas_sealab_12/publication/tested_assets.json';assert sha(manifestPath.read_bytes())=='019d8d9efa042cdc35832215a31f39702863639c1d1b812353de37a787a5e9c3'
baseline=json.loads(manifestPath.read_text());assert len(baseline)==104
for name,h in baseline.items():assert sha((BASE/name).read_bytes())==h,name
assert sha((BASE/'assets/ATLAS_Bay_Play.glb').read_bytes())==spec['modelSHA256']
positive=os.environ.get('C2_REQUIRE_HUMAN')=='1'
if positive:
    assert inputs.get('correctedHumanSHA') and inputs.get('rigProfile') and inputs.get('receiverACK'),'CORRECTED_HUMANS_SHA_PROFILE_ACK_REQUIRED'
    raise RuntimeError('POSITIVE_FACTORY_NOT_YET_ACCEPTED: physical/clock build does not infer a HUMANS interface')
site=OUT/'site'
if site.exists():shutil.rmtree(site)
shutil.copytree(BASE,site)
for src,dst in [(C1/'host-hooks.js','c1-host-hooks.js'),(C1/'descriptor.json','c1-descriptor.json'),(HERE/'contacts.json','c2-contacts.json'),(HERE/'inputs.json','c2-inputs.json'),(HERE/'host-adapter.js','c2-host-adapter.js'),(HERE/'contact-geometry.js','c2-contact-geometry.js')]:shutil.copy2(src,site/dst)
bootstrap='''/* Readiness wait only. No autonomous simulation/animation clock. */
(async function boot(){if(!window.SEA12?.ready)return setTimeout(boot,50);
try{
 const enc=new TextEncoder(),h=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
 const text=await(await fetch('c2-candidate.json',{cache:'no-store'})).text();
 if(await h(enc.encode(text))!==document.querySelector('meta[name="c2-manifest"]').content)throw Error('CANDIDATE_MANIFEST_MISMATCH');
 const m=JSON.parse(text);for(const [p,d] of Object.entries(m.assets)){const r=await fetch(p,{cache:'no-store'});if(!r.ok||await h(await r.arrayBuffer())!==d)throw Error('CANDIDATE_ASSET_MISMATCH:'+p);}
 const c=await(await fetch('c1-descriptor.json')).json(),spec=await(await fetch('c2-contacts.json')).json(),inputs=await(await fetch('c2-inputs.json')).json();
 window.C2_ORIGINAL_CAPTAIN=BAYPLAY.boat.getObjectByName('SEA12_CAPTAIN').uuid;window.C2_ORIGINAL_STEP=BAYPLAY.state.step;
 const core=await SeaLab12HostHooks.attach(c);window.CORE12=core;
 window.C2=await CoreBayHelmC2.install({T:ATLASRuntime,A:BAYPLAY,core,spec,inputs,candidate:m});window.C2_READY=true;
 const note=document.createElement('div');note.id='c2-status';note.textContent='C2 contact/clock boundary · HUMAN OFF · owner profile pending';note.style.cssText='position:fixed;right:12px;top:118px;max-width:270px;font:12px system-ui;background:#102b35ed;color:#dcebe3;padding:9px;z-index:180;pointer-events:none';document.body.append(note);
 if(new URLSearchParams(location.search).get('bayHuman')==='1')window.C2_ACTIVATION_REJECTED='CORRECTED_HUMANS_SHA_PROFILE_ACK_REQUIRED';
}catch(e){window.C2_ERROR=String(e.stack||e);console.error(e);}})();
'''
(site/'c2-bootstrap.js').write_text(bootstrap)
assets={str(p.relative_to(site)):sha(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file() and p.name!='index.html'}
candidate={'revision':'c2-bay-helm/1','task':'C2-BAY-HELM-01','sourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'c1SourceSHA':inputs['baseline']['c1SourceSHA'],'publicBaselineSHA':inputs['baseline']['publicSHA'],'physicalContactSHA256':inputs['physicalContactSHA256'],'humanActivation':False,'correctedHumanSHA':None,'rigProfileSHA256':None,'humanACK':None,'assets':assets,'manifestExcludes':['index.html includes manifest digest; entry SHA in external build record','c2-candidate.json self-reference'],'scope':'real unmodified Sea Lab 12 executable host plus independent C2 contact/clock overlay; no new human implementation or positive rig'}
raw=(json.dumps(candidate,indent=2)+'\n').encode();(site/'c2-candidate.json').write_bytes(raw)
s=(BASE/'index.html').read_text();s=s.replace('</head>',f'<meta name="c2-manifest" content="{sha(raw)}"><script defer src="c1-host-hooks.js"></script><script defer src="c2-contact-geometry.js"></script><script defer src="c2-host-adapter.js"></script><script defer src="c2-bootstrap.js"></script></head>');(site/'index.html').write_text(s)
actual={str(p.relative_to(site)):sha(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file()}
changed=[n for n,h in baseline.items() if actual[n]!=h];assert changed==['index.html'] or set(changed)=={'index.html'}
record={'task':'C2-BAY-HELM-01','candidateSourceSHA':candidate['sourceSHA'],'c1SourceSHA':candidate['c1SourceSHA'],'publicBaselineSHA':candidate['publicBaselineSHA'],'baselineFilesVerified':104,'baselineDelta':changed,'generatedFiles':sorted(set(actual)-set(baseline)),'physicalContactSHA256':inputs['physicalContactSHA256'],'positiveFactoryEnabled':False,'humanIntegrationGate':'CORRECTED_HUMANS_SHA_PROFILE_ACK_REQUIRED','combinedAcceptance':False,'allCandidateFileHashes':actual,'candidateFingerprint':sha(json.dumps(actual,sort_keys=True,separators=(',',':')).encode()),'sourceHashes':{p.name:sha(p.read_bytes()) for p in HERE.iterdir() if p.is_file()},'publicUnchanged':True}
(OUT/'build.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({k:v for k,v in record.items() if k not in ['allCandidateFileHashes','sourceHashes']},indent=2))
