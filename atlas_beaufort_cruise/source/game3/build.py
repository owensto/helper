#!/usr/bin/env python3
"""Assertion-checked build from Clean Helm2. No network, browser or dependency install."""
from pathlib import Path
import argparse, hashlib, json, shutil
HERE=Path(__file__).resolve().parent
FILES=('helm-input.js','menu.js','menu.css','coastal-finish.js','bootstrap.js')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(base,out):
 base=Path(base).resolve();out=Path(out).resolve()
 if not base.is_dir() or out.exists() or base==out or base in out.parents or out in base.parents:raise ValueError('Use a new separate output directory.')
 pins=json.loads((HERE/'pins.json').read_text())
 for n,h in pins.items():
  if not (base/n).is_file() or sha(base/n)!=h:raise ValueError('Wrong Clean Helm2 base: '+n)
 original={str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()}
 shutil.copytree(base,out);(out/'game3').mkdir()
 for n in FILES:shutil.copy2(HERE/n,out/'game3'/n)
 patches=[]
 def patch(name,old,new,count=1):
  p=out/name;s=p.read_text();actual=s.count(old)
  if actual!=count:raise ValueError(f'Changed anchor in {name}: {old[:60]} ({actual})')
  p.write_text(s.replace(old,new));patches.append({'file':name,'anchor':old[:65],'count':count})
 # Keyboard state is evaluated by the existing frame loop, never an interval.
 patch('app.js',"addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;", "addEventListener('keydown',e=>{if(window.ATLAS_HELM_KEYS?.active&&window.AtlasHelmInput.owns(e))return;if(window.AtlasHelmInput?.editing(e.target)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;")
 patch('app.js',"if(document.hidden)return;time+=dt;frame++;", "window.ATLAS_HELM_KEYS?.guard();if(document.hidden)return;time+=dt;frame++;")
 p=out/'app.js';s=p.read_text();a=s.index("if(state.performanceMode==='experimental'&&keys.has('KeyQ'))");b=s.index('\n  acc+=dt;',a);old=s[a:b]
 s=s[:a]+"if(window.ATLAS_HELM_KEYS?.active){window.ATLAS_HELM_KEYS.tick(dt);}else{"+old+"}"+s[b:];p.write_text(s)
 patch('app.js','setPaused:(v)=>{gamePaused=!!v;',"setPaused:(v)=>{window.ATLAS_HELM_KEYS?.clear();keys.clear();gamePaused=!!v;")
 patch('helm09.js','function openPanel(kind){',"function openPanel(kind){window.ATLAS_HELM_KEYS?.clear();")
 patch('helm09.js',"addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)","addEventListener('keydown',e=>{if(window.AtlasHelmInput?.editing(e.target)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)")
 # Country decorator must run AFTER the native body.innerHTML assignment.
 patch('cruise/cruise-ui.js','const prior=SEA10.renderPanel;', 'const prior=SEA10.renderPanel;let countryRevision=0;')
 patch('cruise/cruise-ui.js','function panel(kind,body){', 'function panel(kind,body){const revision=++countryRevision;')
 patch('cruise/cruise-ui.js',"if(kind==='radio'){\n   const box", "if(kind==='radio')queueMicrotask(()=>{\n   if(disposed||stopped||revision!==countryRevision||!body.isConnected||$('helm09-panel').hidden||SEA09.panelKind()!=='radio'||!$('helm09-mediaurl')||!local())return;\n   const box")
 patch('cruise/cruise-ui.js','   body.prepend(box);\n  }', '   body.prepend(box);\n  });')
 patch('cruise/cruise-ui.js',"n.onclick=()=>{if(local())fn();}","n.onclick=()=>{if(n.isConnected&&local())fn();}")
 # Display the current keyboard target on the same steering indicator.
 patch('device/device-ui.js','function paintSteer(){const v=steering.value;', 'function paintSteer(){const v=window.ATLAS_HELM_KEYS?.steering&&steering.pointer===null?H.read().steer:steering.value;')
 patch('device/device-ui.js',"const r=H.radio();music.hidden=", "paintSteer();const r=H.radio();music.hidden=")
 # Buoyancy uses current hull sample positions AND actual prior sample positions,
 # including rotation. No changed engine, buoyancy coefficient or speed multiplier.
 patch('command-motion.js','const c=Math.cos(this.heading),s=Math.sin(this.heading);', 'const frameX=this.x,frameZ=this.z;const c=Math.cos(this.heading),s=Math.sin(this.heading);')
 patch('command-motion.js','// Four unilateral buoyancy/support samples.', '// Six unilateral buoyancy/support samples. Current/prior poses include yaw.')
 patch('command-motion.js',' for(const [xx,zz] of [[2.6,-.75]', ' const buoyC=Math.cos(this.heading),buoyS=Math.sin(this.heading);\n for(const [xx,zz] of [[2.6,-.75]')
 patch('command-motion.js','const wx=this.x+c*xx-s*zz,wz=this.z+s*xx+c*zz,sea=', 'const wx=this.x+buoyC*xx-buoyS*zz,wz=this.z+buoyS*xx+buoyC*zz,sea=')
 patch('command-motion.js','CommandMotion.surface(wx-this.vx*dt,wz-this.vz*dt,this.elapsed-dt,this.environment)', 'CommandMotion.surface(frameX+c*xx-s*zz,frameZ+s*xx+c*zz,this.elapsed-dt,this.environment)')
 # Detail is optically small and tapers at distance/pixel footprint; no meshes added.
 patch('coastal14.js'," };m.customProgramCacheKey=()=>`coastal14-${kind}`;", " if(window.AtlasCoastalFinish)AtlasCoastalFinish.apply(kind,sh);\n };m.customProgramCacheKey=()=>`coastal14-game3-${kind}`;")
 patch('index.html','<script defer src="coastal14.js">','<script defer src="game3/coastal-finish.js"></script><script defer src="coastal14.js">')
 patch('index.html','</head>','<link rel="stylesheet" href="game3/menu.css"><script defer src="game3/helm-input.js"></script><script defer src="game3/menu.js"></script><script defer src="game3/bootstrap.js"></script></head>')
 patch('index.html','<title>ATLAS Sea Lab 13 · Beaufort River</title>','<title>ATLAS · Beaufort Harbor Life Preview</title>')
 changed=[n for n,h in original.items() if sha(out/n)!=h]
 report={'version':'Beaufort Harbor Life 3','base':'c0593c5d43f634394407a8758abd6908640c75d1','changed':changed,'unchangedFiles':len(original)-len(changed),'patches':patches,'newPhysicsCoefficients':False,'yawSamplingCorrected':True,'landMaterialChanged':True,'newSceneryMeshes':False,'browserVerified':False,'GPUVerified':False}
 (out/'game3/build-report.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--out',required=True);a=p.parse_args();print(json.dumps(build(a.base,a.out),indent=2))
