#!/usr/bin/env python3
"""CPU, native geometry and actual vessel checks. Deliberately does not launch a browser."""
from pathlib import Path
import os,subprocess,json
HERE=Path(__file__).resolve().parent;SITE=Path(os.environ['CRUISE_OUT']).resolve();BASE=Path(os.environ['BASE14']).resolve();EASY=Path(os.environ['EASY4']).resolve();OUT=HERE/'checks';OUT.mkdir(exist_ok=True)
for p in SITE.rglob('*.js'):subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
subprocess.run(['python','-m','py_compile',str(HERE/'build.py'),str(HERE/'check.py')],check=True)
def run(name,args,env=None):
 p=subprocess.run(args,text=True,capture_output=True,env=env);(OUT/(name+'.json')).write_text(p.stdout);(OUT/(name+'.stderr')).write_text(p.stderr)
 if p.returncode:raise RuntimeError(name+' failed: '+p.stderr[-2000:])
 d=json.loads(p.stdout);assert d.get('passed') and all(t.get('passed') for t in d['tests']);return d
reports={}
reports['stream_and_assets']=run('stream-and-assets',['node',str(HERE/'test-cruise.cjs'),str(SITE)])
reports['native_scene']=run('native-scene',['node',str(HERE/'test-scene.cjs'),str(SITE)])
# Retain every inherited assertion. Add only the exact shared wake script to the fixture's load sequence.
s=(BASE/'source/test14.cjs').read_text();a="'physics.js','waves11.js','dynamics10.js'";assert s.count(a)==1;s=s.replace(a,"'physics.js','waves11.js','cruise/water-refinements.js','dynamics10.js'")
p=OUT/'test14-combined.cjs';p.write_text(s)
reports['native_physics']=run('native-physics',['node',str(p),str(SITE)])
reports['native_radio']=run('native-radio',['node',str(EASY/'test-native-radio-v4.cjs')],{**os.environ,'ATLAS13_SITE':str(SITE)})
summary={'passed':True,'checks':sum(len(d['tests']) for d in reports.values()),'suites':{name:len(d['tests']) for name,d in reports.items()},'scope':'CPU real geometry/assets, deterministic streaming IO, exact boat step and radio with media fixtures','browserVerified':False,'GPUVerified':False,'actualMusicPlaybackVerified':False,'physicalDeviceVerified':False,'realVesselValidated':False,'measurements':reports['native_physics']['measurements'],'build':json.loads((HERE/'build-report.json').read_text())}
(HERE/'verification.json').write_text(json.dumps(summary,indent=2)+'\n');(SITE/'cruise/verification.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
