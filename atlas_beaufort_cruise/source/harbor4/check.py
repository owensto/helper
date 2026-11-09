#!/usr/bin/env python3
"""Run actual CPU and receiving tests only; never launch or substitute a browser."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess
HERE=Path(__file__).resolve().parent

def run(site,base,base_source,easy,out):
 out.mkdir(parents=True,exist_ok=True)
 commands={
  'harbor':(['node',str(HERE/'test.cjs'),str(site),str(base)],25),
  'integration':(['node',str(HERE/'test-runtime.cjs'),str(site),str(easy)],9),
  'beaufort-region':(['node',str(HERE/'test-region.cjs'),str(site)],4),
  'native-physics':(['node',str(base_source/'checks/test14-combined.cjs'),str(site)],15),
  'stream':(['node',str(base_source/'test-cruise.cjs'),str(site)],19),
  'scene':(['node',str(base_source/'test-scene.cjs'),str(site)],5),
  'native-radio':(['node',str(easy/'test-native-radio-v4.cjs')],7),
  'modeled-power':(['node',str(base_source/'device/test-power.cjs'),str(site)],None)
 }
 reports={};env={**os.environ,'ATLAS13_SITE':str(site)}
 for name,(cmd,count) in commands.items():
  r=subprocess.run(cmd,text=True,capture_output=True,env=env,timeout=90)
  (out/(name+'.stdout')).write_text(r.stdout);(out/(name+'.stderr')).write_text(r.stderr)
  if r.returncode:raise RuntimeError(name+' failed; full output saved')
  d=json.loads(r.stdout)
  if not d.get('passed'):raise RuntimeError(name+' reported failure')
  if count is not None and (len(d['tests'])!=count or not all(t['passed'] for t in d['tests'])):raise RuntimeError(name+' assertion count mismatch')
  if count is None and len(d['rows'])!=4:raise RuntimeError('Power-trial count mismatch')
  reports[name]=d
 for p in [*HERE.glob('*.js'),*HERE.glob('*.cjs'),*(site/n for n in ['app.js','operations10.js','experience14.js','helm09.js','game3/bootstrap.js','world09.js','water12.js','coastal14.js'])]:subprocess.run(['node','--check',str(p)],check=True,timeout=10)
 build=json.loads((site/'harbor4/build-report.json').read_text())
 expected={'app.js','operations10.js','experience14.js','helm09.js','game3/bootstrap.js','world09.js','water12.js','coastal14.js','index.html'}
 if set(build['changed'])!=expected:raise RuntimeError('Unexpected modified host files')
 for n in ['assets/ATLAS_Bay_Play.glb.gz','command-motion.js','physics14.js','geography.js','cruise/world/manifest.json','cruise/motor-music.js']:
  if (base/n).is_file() and (site/n).read_bytes()!=(base/n).read_bytes():raise RuntimeError('Protected retained asset differs: '+n)
 report={'version':'Beaufort Wildlife & Views 4','passed':True,'cpuChecks':sum(c for _,c in commands.values() if c),'suites':{n:c for n,(_,c) in commands.items() if c},'modeledPowerTrials':reports['modeled-power']['rows'],'scope':'CPU policy/synthetic host; actual native recovery closure, Three skinned geometry, production vessel/depth/geography/collision assets and radio media fixtures','browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'CDNVerified':False,'actualMusicPlaybackVerified':False,'frameRateVerified':False,'photorealismVerified':False,'realVesselValidated':False,'build':build,'regionChecks':reports['beaufort-region']['tests'],'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()}}
 (out/'verification.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for n in ['site','base','base-source','easy','out']:p.add_argument('--'+n,required=True,type=Path)
 a=p.parse_args();d=run(*(getattr(a,n).resolve() for n in ['site','base','base_source','easy','out']));print(json.dumps(d,indent=2))
