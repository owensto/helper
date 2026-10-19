#!/usr/bin/env python3
"""CPU regression suite only. No browser, navigation, network or media playback."""
from pathlib import Path
import argparse,json,os,subprocess
HERE=Path(__file__).resolve().parent
def check(site,base,base_source,easy,out):
 out.mkdir(parents=True,exist_ok=True)
 suites={
  'input-menu-music-land':(['node',str(HERE/'test.cjs'),str(site),str(base),str(easy)],20),
  'physics':(['node',str(base_source/'checks/test14-combined.cjs'),str(site)],15),
  'stream':(['node',str(base_source/'test-cruise.cjs'),str(site)],19),
  'scene':(['node',str(base_source/'test-scene.cjs'),str(site)],5),
  'radio':(['node',str(easy/'test-native-radio-v4.cjs')],7),
  'power':(['node',str(base_source/'device/test-power.cjs'),str(site)],None)
 }
 reports={};env={**os.environ,'ATLAS13_SITE':str(site)}
 for name,(cmd,n) in suites.items():
  r=subprocess.run(cmd,text=True,capture_output=True,env=env,timeout=90)
  (out/(name+'.stdout')).write_text(r.stdout);(out/(name+'.stderr')).write_text(r.stderr)
  if r.returncode:raise RuntimeError(name+' failed; raw evidence retained')
  d=json.loads(r.stdout)
  if not d.get('passed'):raise RuntimeError(name+' report not passed')
  if n is not None and (len(d['tests'])!=n or not all(t['passed'] for t in d['tests'])):raise RuntimeError(name+' gate mismatch')
  if n is None and len(d['rows'])!=4:raise RuntimeError('Missing original power trials')
  reports[name]=d
 for p in [*HERE.glob('*.js'),HERE/'test.cjs',*(site/n for n in ['app.js','helm09.js','command-motion.js','coastal14.js','cruise/cruise-ui.js','device/device-ui.js'])]:subprocess.run(['node','--check',str(p)],check=True,timeout=10)
 build=json.loads((site/'game3/build-report.json').read_text())
 if set(build['changed'])!={'app.js','helm09.js','command-motion.js','coastal14.js','cruise/cruise-ui.js','device/device-ui.js','index.html'}:raise RuntimeError('Unexpected candidate changes')
 report={'version':'Beaufort Harbor Life 3','passed':True,'cpuChecks':66,'powerTrials':reports['power']['rows'],'suites':{n:c for n,(_,c) in suites.items() if c},'scope':'CPU inputs, synthetic DOM and native panel order; exact vessel step and scene files; shader-source assembly; media fixtures','browserVerified':False,'CDNVerified':False,'GPUVerified':False,'actualMusicPlaybackVerified':False,'physicalDeviceVerified':False,'frameRateVerified':False,'newCareerGameplayImplemented':False,'build':build,'regressions':reports['input-menu-music-land']['tests']}
 (out/'verification.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for n in ['site','base','base-source','easy','out']:a.add_argument('--'+n,required=True,type=Path)
 x=a.parse_args();r=check(*(getattr(x,n).resolve() for n in ['site','base','base_source','easy','out']));print(json.dumps(r,indent=2))
