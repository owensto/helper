#!/usr/bin/env python3
"""CPU evidence only. Never equates native math/scene tests with browser/GPU tests."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess
HERE=Path(__file__).resolve().parent

def run(site,base,base_source,easy,out):
 out.mkdir(parents=True,exist_ok=True);fixtures=out/'fixtures';shutil.copytree(base_source,fixtures,dirs_exist_ok=True)
 # Retain inherited assertion bodies; only load the new dependency and candidate
 # camera/skin modules in their explicit receiving fixtures.
 for p in fixtures.rglob('*.cjs'):
  s=p.read_text()
  s=s.replace("'command-motion.js'","'realism5/marine-field.js','command-motion.js'")
  p.write_text(s)
 for name in ['camera.js','dolphin.js','harbor-core.js','finish.js']:
  shutil.copy2(site/'harbor4'/name,fixtures/'harbor4'/name)
 p=fixtures/'harbor4/test-runtime.cjs';s=p.read_text()
 s=s.replace("W.SEA09={bus:{mode:'local'},", "W.SEA09={bus:{mode:'local',dispatch(type,value){if(type==='throttle')S.throttle=value;if(type==='gear')S.gear=value;}},")
 s=s.replace("vm.runInContext(fs.readFileSync(site+'/harbor4/harbor.js'", "vm.runInContext(fs.readFileSync(site+'/realism5/wildlife.js','utf8'),ctx);\n vm.runInContext(fs.readFileSync(site+'/harbor4/harbor.js'")
 new='''test('Actual watch-dolphin action exposes the live animals and selects idle/Neutral without starting engine',()=>{const f=setup(),h=f.W.ATLAS_HARBOR4;f.S.throttle=.6;f.S.gear=1;f.S.speedOverGround=.3;assert(h.watchDolphins());assert.equal(f.S.throttle,0);assert.equal(f.S.gear,0);assert.equal(f.S.engine,false);assert.equal(h.camera.inspect().mode,'wildlife');assert(h.camera.isFree());assert(!f.A.isPaused());assert(!f.D.getElementById('helm09-pause').disabled);const before=h.inspect().dolphinPositions;f.S.elapsed+=1;h.tick(1,1);h.camera.update(.1);assert.notEqual(JSON.stringify(before),JSON.stringify(h.inspect().dolphinPositions));assert(f.D.getElementById('h4-freebar').textContent.includes('Dolphin view'));h.dispose();});
test('Fast boat remains visible while watch action asks it to coast below three knots',()=>{const f=setup(),h=f.W.ATLAS_HARBOR4;f.S.speedOverGround=12;f.S.throttle=1;f.S.gear=1;assert.equal(h.watchDolphins(),false);assert.equal(h.camera.inspect().mode,'chase');assert.equal(f.S.throttle,0);assert.equal(f.S.gear,0);assert.equal(f.S.speedOverGround,12);h.dispose();});
test('Find-dolphin action re-enables disabled wildlife and navigation panels expose the same action',()=>{const f=setup(),h=f.W.ATLAS_HARBOR4;h.setWildlife(false);assert(!h.inspect().dolphinEnabled);f.W.SEA09.openPanel('g3-play');const b=f.D.getElementById('helm09-panelbody').querySelectorAll('button').find(n=>n.textContent.startsWith('Look at dolphins'));assert(b);b.click();assert(h.inspect().dolphinEnabled);assert.equal(h.camera.inspect().mode,'wildlife');h.setWildlife(false);assert.equal(h.camera.inspect().mode,'chase');h.dispose();});
test('Loss of habitat and reset hides pooled models safely rather than leaving visible phantom animals',()=>{const f=setup(),h=f.W.ATLAS_HARBOR4;f.W.Sea09World.sample=()=>({known:false});f.S.elapsed=0;assert.doesNotThrow(()=>h.tick(.016,.016));assert.equal(h.inspect().wildlife.count,0);assert.equal(h.watchDolphins(),false);assert.equal(h.camera.inspect().mode,'chase');h.dispose();});
'''
 assert 'const out={passed:' in s;s=s.replace('const out={passed:',new+'const out={passed:');p.write_text(s)
 # Original tests that directly require Pod now exercise the replacement class,
 # without changing the assertions or substituting a second implementation.
 p=fixtures/'harbor4/test.cjs';s=p.read_text().replace("C=require('./harbor-core.js')","C={...require('./harbor-core.js'),Pod:require(path.join(site,'realism5/wildlife.js')).Pod}");# The old baseline has no helper; optional dependency list only for its baseline run.
 start=s.index('function result(root)');end=s.index('const a=result(base)',start)
 part=s[start:end].replace("'realism5/marine-field.js'","...(fs.existsSync(root+'/realism5/marine-field.js')?['realism5/marine-field.js']:[])")
 s=s[:start]+part+s[end:];p.write_text(s)
 cmds={
  'realism5':(['node',str(HERE/'test.cjs'),str(site),str(base)],23),
  'runtime':(['node',str(fixtures/'harbor4/test-runtime.cjs'),str(site),str(easy)],13),
  'retained-harbor':(['node',str(fixtures/'harbor4/test.cjs'),str(site),str(base)],25),
  'physics':(['node',str(fixtures/'checks/test14-combined.cjs'),str(site)],15),
  'stream':(['node',str(fixtures/'test-cruise.cjs'),str(site)],19),
  'scene':(['node',str(fixtures/'test-scene.cjs'),str(site)],5),
  'radio':(['node',str(easy/'test-native-radio-v4.cjs')],7),
  'power':(['node',str(fixtures/'device/test-power.cjs'),str(site)],None)
 }
 reports={};env={**os.environ,'ATLAS13_SITE':str(site)}
 for name,(cmd,count) in cmds.items():
  r=subprocess.run(cmd,text=True,capture_output=True,timeout=90,env=env);(out/(name+'.stdout')).write_text(r.stdout);(out/(name+'.stderr')).write_text(r.stderr)
  if r.returncode:raise RuntimeError(name+' failed; output retained')
  d=json.loads(r.stdout)
  if not d['passed']:raise RuntimeError(name+' reported failure')
  if count is not None and (len(d['tests'])!=count or not all(t['passed'] for t in d['tests'])):raise RuntimeError(name+' assertion mismatch')
  if count is None and len(d['rows'])!=4:raise RuntimeError('Power trial count mismatch')
  reports[name]=d;print(name,'PASS',count,flush=True)
 for p in [*HERE.glob('*.js'),*HERE.glob('*.cjs'),*(site/n for n in json.loads((site/'realism5/build-report.json').read_text())['changed'] if n.endswith('.js'))]:subprocess.run(['node','--check',str(p)],check=True,timeout=10)
 build=json.loads((site/'realism5/build-report.json').read_text())
 for n in ['assets/ATLAS_Bay_Play.glb.gz','geography.js','world09.js','cruise/world/manifest.json','cruise/motor-music.js']:
  assert (base/n).read_bytes()==(site/n).read_bytes(),n
 new_bytes=sum(p.stat().st_size for p in site.rglob('*') if p.is_file())-sum(p.stat().st_size for p in base.rglob('*') if p.is_file())
 result={'version':'Beaufort Lightweight Realism 5','passed':True,'cpuChecks':sum(c for _,c in cmds.values() if c),'suites':{n:c for n,(_,c) in cmds.items() if c},'powerTrials':reports['power']['rows'],'addedSiteBytes':new_bytes,'scope':'CPU actual vessel math, chart/collider IO, Three scene/projection and synthetic DOM/media; shader-source only','browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'actualMusicPlaybackVerified':False,'FPSVerified':False,'photorealismVerified':False,'build':build,'keyResults':reports['realism5']['tests'],'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()}}
 (out/'verification.json').write_text(json.dumps(result,indent=2)+'\n');return result
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for n in ['site','base','base-source','easy','out']:p.add_argument('--'+n,required=True,type=Path)
 a=p.parse_args();run(*(getattr(a,n).resolve() for n in ['site','base','base_source','easy','out']))
