#!/usr/bin/env python3
"""Exact-source Clean Helm build. No browser or network. Never changes the input site."""
from pathlib import Path
import argparse, hashlib, json, shutil
HERE=Path(__file__).resolve().parent
PIN='cdc915afef276e192786e5bb389c5b4fb4c3262e'
FILES=['device-core.js','device-ui.js','device-bootstrap.js','device.css']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(base,out):
 base=base.resolve();out=out.resolve()
 if not base.is_dir() or out.exists() or out in base.parents or base in out.parents:raise ValueError('Use an existing base and a new separate output directory.')
 pins=json.loads((HERE/'device-base-pins.json').read_text())
 for name,h in pins.items():
  if sha(base/name)!=h:raise ValueError('Wrong base: '+name)
 hashes={str(p.relative_to(base)):sha(p) for p in sorted(base.rglob('*')) if p.is_file()}
 shutil.copytree(base,out);(out/'device').mkdir()
 for name in FILES:shutil.copy2(HERE/name,out/'device'/name)
 edits=[]
 def patch(name,a,b,n=1):
  p=out/name;s=p.read_text()
  if s.count(a)!=n:raise ValueError('Changed patch anchor '+name+': '+a[:90])
  p.write_text(s.replace(a,b));edits.append({'file':name,'matches':n,'anchor':a[:90]})
 patch('app.js','setPaused:(v)=>{','isPaused:()=>gamePaused,setPaused:(v)=>{')
 # No graph redraw or full boat traversal is needed for continuous input targets.
 patch('helm09.js','A.refresh();return event;','if(!["steering","throttle","trim"].includes(type))A.refresh();return event;')
 patch('helm09.js','ready:true,bus:Bus,ignition','ready:true,bus:Bus,panelKind:()=>panel,providerVisible:()=>externalVisible,ignition')
 for name in ['helm09.js','access11.js','experience14.js','experience12.js','operations10.js']:
  p=out/name;s=p.read_text();n=s.count('A.inspect().paused')
  if n:patch(name,'A.inspect().paused','A.isPaused()',n)
 patch('access11.js','SEA09.inspect().panel','SEA09.panelKind()')
 # The unused safety read ran at physics frequency despite having no effect.
 patch('app.js','const safe=Object.values(hatches).every(h=>h.value<.03)&&drawers.every(d=>d.value<.03);','')
 # Cache only stable, successfully found nodes; all existing pivots remain live.
 patch('app.js','function updateBoat(dt,fittingDt=dt){',"let d2NodeOwner=null,d2Nodes=new Map();function modelNode(name){if(d2NodeOwner!==model){d2NodeOwner=model;d2Nodes.clear();}if(d2Nodes.has(name))return d2Nodes.get(name);const n=model.getObjectByName(name);if(n)d2Nodes.set(name,n);return n;}\nfunction updateBoat(dt,fittingDt=dt){")
 p=out/'app.js';s=p.read_text();i=s.index('function updateBoat(');j=s.index('function syncLabels',i);part=s[i:j];n=part.count('model.getObjectByName(');assert n>=4
 s=s[:i]+part.replace('model.getObjectByName(','modelNode(')+s[j:];p.write_text(s);edits.append({'file':'app.js','nodeLookupSitesCached':n})
 # Performance really is lower resolution, without changing simulation dt.
 patch('experience14.js',"effectiveScale=value==='detailed'?Math.min(devicePixelRatio||1,1.5):1;", "effectiveScale=AtlasDeviceCore.renderScale(value,devicePixelRatio||1,!!window.SEA_SOFTWARE);")
 patch('experience14.js',"if(ema>42)next=Math.max(window.SEA_SOFTWARE?.4:.65,next-.10);else if(ema<22)","if(ema>33.5)next=Math.max(window.SEA_SOFTWARE?.4:.55,next-.10);else if(ema<19.5)")
 # Keep absent/slow frames from contaminating the EMA after menu or tab transitions.
 patch('experience14.js',"if(dt>0&&dt<300)ema=ema*.96+dt*.04;","if(dt>0&&dt<300&&!document.hidden)ema=ema*.96+dt*.04;")
 # Native instrument textures remain current, at reduced rate when not close up.
 patch('app.js',"(!force&&time-lastChart<.18)","(!force&&time-lastChart<(cameraMode==='instruments'||cameraMode==='helm'?.18:.5))")
 # Shared ready/ownership contract; no autoplay or horsepower change on startup.
 p=out/'index.html';s=p.read_text();assert s.count('</head>')==1
 s=s.replace('<script defer="" src="app.js"></script>', '<script defer="" src="device/device-core.js"></script><script defer="" src="app.js"></script>') if '<script defer="" src="app.js"></script>' in s else s
 if 'src="device/device-core.js"' not in s:
  # Script formatting varies, use the exact app opening tag as an insertion point.
  import re
  m=re.search(r'<script\b[^>]*src=[\"\']app.js[\"\'][^>]*></script>',s);assert m
  s=s[:m.start()]+'<script defer src="device/device-core.js"></script>\n'+s[m.start():]
 s=s.replace('</head>','<link rel="stylesheet" href="device/device.css">\n<script defer src="device/device-ui.js"></script>\n<script defer src="device/device-bootstrap.js"></script>\n</head>');p.write_text(s)
 changed=[name for name,h in hashes.items() if sha(out/name)!=h]
 report={'version':'Beaufort Clean Helm 2','base':PIN,'scope':'device presentation, proportional input, reduced redundant render work, reachable existing engine configurations','changedFiles':changed,'patches':edits,'unchangedFiles':len(hashes)-len(changed),'boatAndWorldPhysicsCoefficientsChanged':False,'defaultHorsepowerChanged':False,'simulationClockChanged':False,'browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'actualFrameRateMeasured':False}
 (out/'device/build-report.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--base',type=Path,required=True);a.add_argument('--out',type=Path,required=True);args=a.parse_args();print(json.dumps(build(args.base,args.out),indent=2))
