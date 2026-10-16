"""One asset-attested empty-station candidate; the unchanged SETTLE02 host remains separate."""
from pathlib import Path
import os,json,hashlib,shutil,re
HERE=Path(__file__).resolve().parent;BASE=Path(os.environ['S03_BASE']);OUT=Path(os.environ['S03_OUT']);SITE=OUT/'station-site'
sha=lambda b:hashlib.sha256(b).hexdigest()
sourceSHA=os.environ['GITHUB_SHA'];build=json.loads((BASE/'settlement-build.json').read_text())
assert build['sourceSHA']=='41215520997eee85eff0dafb03ac21ed6203e60c'
for p,d in build['fileHashes'].items():assert sha((BASE/'settlement-site'/p).read_bytes())==d,p
assert build['candidateFingerprint']=='29edfdac5092b6aba1b1bf82fd8c430f12ce50ffcdefe9b173b7fb8c205ab6c1'
if SITE.exists():shutil.rmtree(SITE)
shutil.copytree(BASE/'settlement-site',SITE)
# Do not ship or load a rig or a misleading old positive receiver with this station.
removed=[]
for p in sorted(SITE.rglob('*'),reverse=True):
 if p.is_file() and (p.relative_to(SITE).parts[0]=='human' or p.name.startswith(('c1-','c2-')) or p.name=='c3-trace.js'):
  removed.append(str(p.relative_to(SITE)));p.unlink()
for p in sorted(SITE.rglob('*'),reverse=True):
 if p.is_dir() and not any(p.iterdir()):p.rmdir()
for source,dest in [(HERE/'geometry.js','s03-geometry.js'),(HERE/'design.json','s03-design.json'),(OUT/'source-ledger.json','s03-sources.json')]:shutil.copy2(source,SITE/dest)
# Startup loads all baseline gameplay scripts unchanged, except human factory replaced
# by an empty lifecycle holder. No C1/H4/MP attachment, no API permission creation.
bootstrap=r'''(async()=>{'use strict';try{
 const Q=new URLSearchParams(location.search);if(Q.get('station03')!=='1'||Q.has('bayHuman'))throw Error('S03_EXPLICIT_EMPTY_GEOMETRY_REVIEW_ONLY');
 const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
 const raw=await(await fetch('s03-manifest.json',{cache:'no-store'})).arrayBuffer(),digest=await hash(raw);if(digest!==document.querySelector('meta[name="s03-manifest"]').content)throw Error('S03_MANIFEST_MISMATCH');const m=JSON.parse(new TextDecoder().decode(raw));m.sha256=digest;
 for(const [path,expected]of Object.entries(m.assets)){const r=await fetch(path,{cache:'no-store'});if(!r.ok||await hash(await r.arrayBuffer())!==expected)throw Error('S03_ASSET_MISMATCH:'+path);}
 const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(Error(src));document.head.append(s);});
 await load('runtime.js');await load('c3-bolster-state.js');await load('s03-geometry.js');
 G:for(const p of m.hostScriptOrder){if(p==='runtime.js')continue;await load(p);if(p==='captain12.js'){window.S03_EMPTY_HOLDERS=0;Sea12Captain.build=()=>{window.S03_EMPTY_HOLDERS++;const group=new ATLASRuntime.Group();group.name='SEA12_CAPTAIN';group.userData.station03='NO_AVATAR_NO_ATTACHMENT';return {group,limbs:[]};};}}
 const wait=()=>{if(!window.SEA12?.ready)return setTimeout(wait,30);start().catch(fail);};
 async function start(){BAYPLAY.setPaused(true);SEA10.setOption('ejection',false);SEA10.setOption('explosions',false);BAYPLAY.refresh();const d=await(await fetch('s03-design.json')).json(),l=await(await fetch('s03-sources.json')).json();await CoreStation03.install(ATLASRuntime,BAYPLAY,d,l,m);window.S03_READY=true;}
 function fail(e){window.S03_ERROR=String(e.stack||e);console.error(e);}wait();
}catch(e){window.S03_ERROR=String(e.stack||e);console.error(e);}})();'''
(SITE/'s03-bootstrap.js').write_text(bootstrap)
# Pin actual authored output bytes as well as primitive definitions and generator.
authored=json.loads((OUT/'authored-geometry.json').read_text());spec=json.loads((HERE/'design.json').read_text());old=json.loads((BASE/'settlement-site/c2-candidate.json').read_text())
m={'revision':'station03-candidate-manifest/1','sourceSHA':sourceSHA,'designRevision':spec['revision'],'baseline':spec['baseline'],'geometryFingerprint':sha((OUT/'authored-geometry.json').read_bytes()),'sourceLedgerSHA256':sha((OUT/'source-ledger.json').read_bytes()),'designSHA256':sha((HERE/'design.json').read_bytes()),'hostScriptOrder':old['hostScriptOrder'],'geometryParts':[{'id':r['render']['id'],'render':{k:r['render'][k] for k in ['positionSHA256','indexU32SHA256']},'collision':{k:r['proxy'][k] for k in ['positionSHA256','indexU32SHA256']}} for r in authored['parts']],'activation':spec['activation'],'protocolStatus':'New empty geometry candidate. Existing C1/H4 receiver deliberately NOT attached. No old contacts/profile authorize this station. No network.','sourceHashes':{p.name:sha(p.read_bytes()) for p in sorted(HERE.iterdir()) if p.is_file()},'removedOldReceiverAndRigFiles':removed}
m['assets']={str(p.relative_to(SITE)):sha(p.read_bytes()) for p in sorted(SITE.rglob('*')) if p.is_file() and p.name!='index.html'}
raw=(json.dumps(m,indent=2)+'\n').encode();(SITE/'s03-manifest.json').write_bytes(raw)
s=(BASE/'settlement-site/index.html').read_text();s=re.sub(r'<meta name="c2-manifest" content="[a-f0-9]{64}">','<meta name="s03-manifest" content="'+sha(raw)+'">',s);s=s.replace('<script type="importmap">{"imports":{"three":"./c2-three.mjs"}}</script>','').replace('src="c2-bootstrap.js"','src="s03-bootstrap.js"');assert 'c2-bootstrap' not in s;s=re.sub(r'<title>.*?</title>','<title>ATLAS Station 03 · Empty Geometry Proposal</title>',s);(SITE/'index.html').write_text(s)
h={str(p.relative_to(SITE)):sha(p.read_bytes()) for p in sorted(SITE.rglob('*')) if p.is_file()};before=build['fileHashes'];changed={p:{'baseline':d,'candidate':h.get(p)} for p,d in before.items() if h.get(p)!=d};assert {p for p in changed if p in h}=={'index.html'}
result={'sourceSHA':sourceSHA,'manifestSHA256':sha(raw),'candidateFingerprint':sha(json.dumps(h,sort_keys=True,separators=(',',':')).encode()),'fileHashes':h,'existingChangedFiles':changed,'newFiles':sorted(set(h)-set(before)),'unchangedSETTLE02App':h['app.js']==before['app.js'],'unchangedModel':h['assets/ATLAS_Bay_Play.glb']==before['assets/ATLAS_Bay_Play.glb'],'unchangedEndstop':h['c3-bolster-state.js']==before['c3-bolster-state.js'],'runtimeGeometryIsNew':True,'humansEnabled':False,'publicActivation':False}
(OUT/'station-build.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['fileHashes','existingChangedFiles']},indent=2))
