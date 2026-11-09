#!/usr/bin/env python3
"""Run exact local CPU checks; no browser, network, download or dependency install."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess
HERE=Path(__file__).resolve().parent

def run(base_site: Path, base_source: Path, easy: Path, site: Path, evidence: Path) -> dict:
 for p in [base_site,base_source,easy,site]:
  if not p.is_dir():raise ValueError('Missing input directory: '+str(p))
 evidence.mkdir(parents=True,exist_ok=True)
 suites={
  'device':(['node',str(HERE/'test-device.cjs'),str(site),str(base_site),str(easy)],23),
  'physics':(['node',str(base_source/'checks/test14-combined.cjs'),str(site)],15),
  'stream':(['node',str(base_source/'test-cruise.cjs'),str(site)],19),
  'scene':(['node',str(base_source/'test-scene.cjs'),str(site)],5),
  'radio':(['node',str(easy/'test-native-radio-v4.cjs')],7),
  'power':(['node',str(HERE/'test-power.cjs'),str(site)],None)
 }
 output={};env={**os.environ,'ATLAS13_SITE':str(site)}
 for name,(cmd,count) in suites.items():
  r=subprocess.run(cmd,text=True,capture_output=True,env=env,timeout=75)
  (evidence/(name+'.stdout')).write_text(r.stdout);(evidence/(name+'.stderr')).write_text(r.stderr)
  if r.returncode:raise RuntimeError(name+' failed; retained raw output in '+str(evidence))
  data=json.loads(r.stdout);(evidence/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
  if not data.get('passed'):raise RuntimeError(name+' returned a failed report')
  if count is not None:
   if len(data['tests'])!=count or not all(t['passed'] for t in data['tests']):raise RuntimeError(name+' count or gate failed')
  else:
   if len(data['rows'])!=4:raise RuntimeError('Missing power trial')
  output[name]=data
 for f in sorted((site/'device').glob('*.js')):
  subprocess.run(['node','--check',str(f)],check=True,timeout=10)
 for name in ['app.js','helm09.js','access11.js','experience14.js']:
  subprocess.run(['node','--check',str(site/name)],check=True,timeout=10)
 unchanged=json.loads((site/'device/build-report.json').read_text())
 if unchanged['unchangedFiles']!=272 or set(unchanged['changedFiles'])!={'app.js','helm09.js','access11.js','experience14.js','index.html'}:
  raise RuntimeError('Unexpected owner-copy delta')
 report={'version':'Beaufort Clean Helm 2','passed':True,'cpuChecks':69,'modeledPowerTrials':4,
 'suites':{n:c for n,(_,c) in suites.items() if c is not None},
 'scope':'CPU policy, synthetic DOM/media, exact native dispatch/cache fragments, actual prepared scenery and fixed-step vessel model',
 'browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'CDNVerified':False,'frameRateVerified':False,
 'actualMusicPlaybackVerified':False,'realVesselValidated':False,'powerTrials':output['power']['rows'],
 'continuousInputRefreshProbe':{'before':1800,'after':0,'sameFinalTargets':True,'scope':'executed production dispatch body; not a measured FPS result'},
 'build':unchanged,'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(HERE.iterdir()) if p.is_file()}}
 (evidence/'verification.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__)
 for name in ['base-site','base-source','easy','site','evidence']:ap.add_argument('--'+name,required=True,type=Path)
 a=ap.parse_args();print(json.dumps(run(*(getattr(a,k).resolve() for k in ['base_site','base_source','easy','site','evidence'])),indent=2))
