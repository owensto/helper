"""Hash-attested current-host candidate. Human is default-off and restricted to ACKed C2 review."""
from pathlib import Path
import os,json,hashlib,shutil,re,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=Path(os.environ.get('C2_OUT','/tmp/atlas-c2-bay-helm'));BASE=ROOT/'atlas_sealab_12/live';C1=HERE.parent/'c1'
sha=lambda b:hashlib.sha256(b).hexdigest()
HUMAN='10ed9c2f8d0c392828f238e686bcc689517d34f9';PROFILE='2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902';ACK='pr1:6209504553'
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
    assert inputs.get('correctedHumanSHA')==HUMAN and inputs.get('rigProfile',{}).get('sha256')==PROFILE and inputs.get('receiverACK')==ACK,'CORRECTED_HUMANS_SHA_PROFILE_ACK_REQUIRED'
    assert os.environ.get('C2_HUMAN_DIR'),'IMMUTABLE_HUMANS_SOURCE_REQUIRED'
    owner=Path(os.environ['C2_HUMAN_DIR']);assert sha((owner/'profiles/bay12/profile.json').read_bytes())==PROFILE
    preflight=OUT/'review/unit.json';assert preflight.exists(),'C2_CLOSURE_PREFLIGHT_REQUIRED'
    u=json.loads(preflight.read_text());assert u['passed'] and len(u['tests'])==38 and all(t['passed'] for t in u['tests']),'C2_CLOSURE_PREFLIGHT_REQUIRED'
    assert u['sourceSHA']==os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'C2_PREFLIGHT_SOURCE_MISMATCH'
    text=(OUT/'human-unit.txt').read_text();assert '# tests 44\n' in text and '# pass 44\n' in text and '# fail 0\n' in text,'CORRECTED_HUMANS_PREFLIGHT_REQUIRED'
    shutil.copy2(preflight,OUT/'closure-preflight.json')
site=OUT/'site'
if site.exists():shutil.rmtree(site)
shutil.copytree(BASE,site)
for src,dst in [(C1/'host-hooks.js','c1-host-hooks.js'),(C1/'descriptor.json','c1-descriptor.json'),(HERE/'contacts.json','c2-contacts.json'),(HERE/'inputs.json','c2-inputs.json'),(HERE/'host-adapter.js','c2-host-adapter.js'),(HERE/'contact-geometry.js','c2-contact-geometry.js')]:shutil.copy2(src,site/dst)
if positive:
    for name in ['captain12-adapter.mjs','rig.mjs','contact.mjs','ik.mjs','pose-contract.mjs','transform-contract.mjs']:
        d=site/'human/src'/name;d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(owner/'src'/name,d)
    for name in ['RocketboxCaptain.glb','animations.json','provenance.json','SOURCE.md','ROCKETBOX-LICENSE.md']:
        d=site/'human/assets'/name;d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(owner/'assets'/name,d)
    d=site/'human/profiles/bay12/profile.json';d.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(owner/'profiles/bay12/profile.json',d)
# The native owner modules consume the same pinned Three.js instance as the host.
keys=json.loads(subprocess.check_output(['node','-e',f"global.window=global;require({json.dumps(str(BASE/'runtime.js'))});console.log(JSON.stringify(Object.keys(ATLASRuntime)))"],text=True))
assert all(re.fullmatch(r'[A-Za-z_$][\w$]*',k) for k in keys)
(site/'c2-three.mjs').write_text('/* Re-export the unchanged host runtime; no second Three instance. */\n'+''.join(f'export const {k}=globalThis.ATLASRuntime.{k};\n' for k in keys))
s=(BASE/'index.html').read_text();scripts=re.findall(r'<script\b[^>]*src=["\']([^"\']+)["\'][^>]*>\s*</script>',s);assert len(scripts)==35 and scripts[0]=='runtime.js'
# Validate the entire manifest before app startup; defer the existing ensureDriver
# call until the exact HUMANS factory has been preloaded when the feature is on.
bootstrap='''/* One startup sequencer, no new render or physics loop. */
(async()=>{try{
 const enc=new TextEncoder(),h=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
 const raw=await(await fetch('c2-candidate.json',{cache:'no-store'})).text();
 if(await h(enc.encode(raw))!==document.querySelector('meta[name="c2-manifest"]').content)throw Error('CANDIDATE_MANIFEST_MISMATCH');
 const m=JSON.parse(raw);for(const[p,d]of Object.entries(m.assets)){const r=await fetch(p,{cache:'no-store'});if(!r.ok||await h(await r.arrayBuffer())!==d)throw Error('CANDIDATE_ASSET_MISMATCH:'+p);}
 const requested=new URLSearchParams(location.search).get('bayHuman')==='1';window.C2_REVIEW_REQUESTED=requested;
 if(requested&&!m.humanActivation)throw Error('C2_LIMITED_REVIEW_BUILD_REQUIRED');
 const load=p=>new Promise((resolve,reject)=>{const e=document.createElement('script');e.src=p;e.async=false;e.onload=resolve;e.onerror=()=>reject(Error('SCRIPT_FAILED:'+p));document.head.append(e);});
 await load('runtime.js');await load('c1-host-hooks.js');await load('c2-contact-geometry.js');await load('c2-host-adapter.js');
 let handle=null;
 if(requested)handle=await CoreBayHelmC2.preloadReview({T:ATLASRuntime,candidate:m});
 for(const p of m.hostScriptOrder){if(p==='runtime.js')continue;await load(p);if(p==='captain12.js'&&handle){window.C2_FACTORY_BUILDS=0;const build=handle.build;Sea12Captain.build=()=>{window.C2_FACTORY_BUILDS++;return build();};}}
 const ready=()=>{if(!window.SEA12?.ready)return setTimeout(ready,50);finish().catch(error);};
 async function finish(){
  const c=await(await fetch('c1-descriptor.json')).json(),spec=await(await fetch('c2-contacts.json')).json(),inputs=await(await fetch('c2-inputs.json')).json();
  window.C2_ORIGINAL_CAPTAIN=BAYPLAY.boat.getObjectByName('SEA12_CAPTAIN').uuid;window.C2_ORIGINAL_STEP=BAYPLAY.state.step;
  const core=await SeaLab12HostHooks.attach(c);window.CORE12=core;
  const candidate=requested?m:{...m,humanActivation:false};
  window.C2=await CoreBayHelmC2.install({T:ATLASRuntime,A:BAYPLAY,core,spec,inputs,candidate,reviewHandle:handle});window.C2_READY=true;
  const note=document.createElement('div');note.id='c2-status';note.textContent=requested?'C2 LIMITED CONTACT REVIEW · full steering unsupported · no public acceptance':'C2 physical/clock review · original captain · human feature OFF';note.style.cssText='position:fixed;right:12px;top:118px;max-width:270px;font:12px system-ui;background:#102b35ed;color:#dcebe3;padding:9px;z-index:180;pointer-events:none';document.body.append(note);
 }
 function error(e){window.C2_ERROR=String(e.stack||e);console.error(e);}
 ready();
}catch(e){window.C2_ERROR=String(e.stack||e);console.error(e);}})();
'''
(site/'c2-bootstrap.js').write_text(bootstrap)
assets={str(p.relative_to(site)):sha(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file() and p.name!='index.html'}
candidate={'revision':'c2-bay-helm/1','task':'C2-BAY-HELM-01','sourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'c1SourceSHA':inputs['baseline']['c1SourceSHA'],'publicBaselineSHA':inputs['baseline']['publicSHA'],'physicalContactSHA256':inputs['physicalContactSHA256'],'humanActivation':positive,'productionEnabled':False,'defaultHumanEnabled':False,'featureFlag':'bayHuman=1','reviewScope':'LIMITED_CONTACT_REVIEW' if positive else 'PHYSICAL_CLOCK_ONLY','correctedHumanSHA':HUMAN if positive else None,'rigProfileSHA256':PROFILE if positive else None,'humanACK':ACK if positive else None,'hostScriptOrder':scripts,'assets':assets,'manifestExcludes':['index.html contains manifest digest; entry SHA in external build record','c2-candidate.json self-reference'],'scope':'actual unmodified Sea Lab12 source with CORE startup/clock/contact bridge; exact HUMANS factory only with explicit review feature; no yacht, multiplayer or public release'}
raw=(json.dumps(candidate,indent=2)+'\n').encode();(site/'c2-candidate.json').write_bytes(raw)
s=re.sub(r'<script\b[^>]*src=["\'][^"\']+["\'][^>]*>\s*</script>','',s)
s=s.replace('</head>',f'<meta name="c2-manifest" content="{sha(raw)}"><script type="importmap">{{"imports":{{"three":"./c2-three.mjs"}}}}</script><script defer src="c2-bootstrap.js"></script></head>');(site/'index.html').write_text(s)
actual={str(p.relative_to(site)):sha(p.read_bytes()) for p in sorted(site.rglob('*')) if p.is_file()}
changed=[n for n,h in baseline.items() if actual[n]!=h];assert set(changed)=={'index.html'}
record={'task':'C2-BAY-HELM-01','candidateSourceSHA':candidate['sourceSHA'],'c1SourceSHA':candidate['c1SourceSHA'],'publicBaselineSHA':candidate['publicBaselineSHA'],'baselineFilesVerified':104,'baselineDelta':changed,'generatedFiles':sorted(set(actual)-set(baseline)),'physicalContactSHA256':inputs['physicalContactSHA256'],'positiveFactoryAvailableForFlag':positive,'defaultHumanEnabled':False,'productionEnabled':False,'humanACK':candidate['humanACK'],'rigProfileSHA256':candidate['rigProfileSHA256'],'combinedAcceptance':False,'allCandidateFileHashes':actual,'candidateFingerprint':sha(json.dumps(actual,sort_keys=True,separators=(',',':')).encode()),'sourceHashes':{p.name:sha(p.read_bytes()) for p in HERE.iterdir() if p.is_file()},'publicUnchanged':True}
(OUT/'build.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({k:v for k,v in record.items() if k not in ['allCandidateFileHashes','sourceHashes']},indent=2))
