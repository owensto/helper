#!/usr/bin/env python3
"""Reproducible, pinned Harbor Life 3 -> Harbor4 build; no browser or network."""
from pathlib import Path
import argparse,hashlib,json,shutil
HERE=Path(__file__).resolve().parent
FILES=('harbor-core.js','dolphin.js','camera.js','finish.js','harbor.js','harbor.css')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(base,out):
 base=Path(base).resolve();out=Path(out).resolve()
 if not base.is_dir() or out.exists() or out==base or out in base.parents or base in out.parents:raise ValueError('Use a new separate output directory')
 pins=json.loads((HERE/'pins.json').read_text())
 for n,h in pins.items():
  if not (base/n).is_file() or sha(base/n)!=h:raise ValueError('Harbor Life 3 source mismatch: '+n)
 original={str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()};shutil.copytree(base,out);(out/'harbor4').mkdir()
 for n in FILES:shutil.copy2(HERE/n,out/'harbor4'/n)
 edits=[]
 def patch(name,a,b,count=1):
  p=out/name;s=p.read_text();n=s.count(a)
  if n!=count:raise ValueError(f'Changed source anchor {name} {a[:60]} count={n}')
  p.write_text(s.replace(a,b));edits.append({'file':name,'anchor':a[:70],'count':n})
 # Correct the actual crash-button closure, not just a new menu shortcut.
 old="function recover(){stopEffects();SEA09.relocate('basin',-8,0,0);S.hullHealth10=100;S.destroyed10=false;S.engineDisabled10=false;S.lastHardImpact10=-99;lastEvent=null;incident.hidden=true;A.setPaused(false);SEA09.view('helm');status('Back at the marina. Settings preserved. Turn the ignition key to start.');}"
 new="""function recover(){const h=window.ATLAS_HARBOR4,p=h?.planRecovery();if(!p){status('No checked clear water nearby. Boat has not been moved; choose Return to Beaufort launch explicitly from the menu.');h?.notice('No checked recovery position nearby. Your location is unchanged.');return false;}const save=AtlasHarborCore.restoreSnapshot(S);stopEffects();SEA09.relocate(p.location,p.x,p.z,p.heading);AtlasHarborCore.restoreAfterRecovery(S,save,p,BayMotion.surface);lastEvent=null;incident.hidden=true;A.resetClock();A.setPaused(false);SEA09.view('follow');A.refresh();h.notice('Recovered '+Math.round(p.distance)+' m away in '+(p.location==='beaufort'?'Beaufort':'the practice bay')+'. Engine off; Neutral.');return true;}"""
 patch('operations10.js',old,new)
 # Advanced Recovery must use the same recovery path, not Return to launch.
 patch('experience14.js',"for(const id of ['s13-return-beaufort','sea10-resetboat'])if($(id))$(id).onclick=confirmHome;","if($('s13-return-beaufort'))$('s13-return-beaufort').onclick=confirmHome;if($('sea10-resetboat'))$('sea10-resetboat').onclick=()=>SEA10.recover();")
 patch('app.js','function setCamera(next,instant=false){if(!ready)return;cameraMode=next;', 'function setCamera(next,instant=false){if(!ready)return;window.ATLAS_HARBOR4?.camera.onNative(next);cameraMode=next;')
 patch('app.js','function updateCamera(dt){if(!ready)return;', 'function updateCamera(dt){if(!ready)return;if(window.ATLAS_HARBOR4?.camera.update(dt)){window.BAYPLAY._lastPos=V(state.x,0,state.z);return;}')
 patch('app.js','window.CMD?.syncMotors(simDt);updateCamera(dt);','window.CMD?.syncMotors(simDt);window.ATLAS_HARBOR4?.tick(simDt,dt);updateCamera(dt);')
 patch('app.js','function action(key,focus=true){if(!ready)return;', 'function action(key,focus=true){if(!ready||window.ATLAS_HARBOR4?.camera.isFree())return;')
 patch('game3/bootstrap.js',"blocked:()=>D.hidden||A.isPaused()", "blocked:()=>!!window.ATLAS_HARBOR4?.camera.isFree()||D.hidden||A.isPaused()")
 patch('helm09.js',"dispatch(type,value){const event=","dispatch(type,value){if(window.ATLAS_HARBOR4?.camera.isFree()&&['gear','throttle','steering','trim','action'].includes(type))return {blocked:true,type,value};const event=")
 patch('helm09.js','async function ignition(){if(keyBusy)return;', 'async function ignition(){if(keyBusy||window.ATLAS_HARBOR4?.camera.isFree())return;')
 # Prevent captured canvas taps from operating fittings in the non-interactive free view.
 p=out/'helm09.js';s=p.read_text();start=s.index('function target(');brace=s.index('{',start);s=s[:brace+1]+"if(window.ATLAS_HARBOR4?.camera.isFree())return null;"+s[brace+1:];p.write_text(s);edits.append({'file':'helm09.js','anchor':'target free-camera guard','count':1})
 # Add actual port/starboard chine clearance; old contact was four centreline points.
 patch('world09.js',"[-4.12,0,.82-.39*(s.trimActual||0),'PROP']];", "[-4.12,0,.82-.39*(s.trimActual||0),'PROP'],[2.35,-.90,draft*.72,'PORT BOW'],[2.35,.90,draft*.72,'STARBOARD BOW'],[-2.35,-.96,draft*.82,'PORT STERN'],[-2.35,.96,draft*.82,'STARBOARD STERN']];")
 # Optical refinements are applied before compile, with a distinct program key.
 patch('water12.js',"};mat.customProgramCacheKey=()=> 'atlas12-dispersive-wake-reflection';", "sh.fragmentShader=AtlasHarborFinish.reflection(sh.fragmentShader);};mat.roughness=.34;mat.metalness=.02;mat.envMapIntensity=.65;mat.customProgramCacheKey=()=> 'atlas-harbor4-soft-reflection';")
 patch('coastal14.js','if(window.AtlasCoastalFinish)AtlasCoastalFinish.apply(kind,sh);', 'if(window.AtlasCoastalFinish)AtlasCoastalFinish.apply(kind,sh);if(window.AtlasHarborFinish)AtlasHarborFinish.material(kind,sh);')
 patch('coastal14.js','coastal14-game3-${kind}', 'coastal14-harbor4-${kind}')
 # Load pure policies before old scripts can compile materials. Runtime installs last.
 patch('index.html','<script defer src="water12.js">','<script defer src="harbor4/harbor-core.js"></script><script defer src="harbor4/finish.js"></script><script defer src="water12.js">')
 patch('index.html','</head>','<link rel="stylesheet" href="harbor4/harbor.css"><script defer src="harbor4/dolphin.js"></script><script defer src="harbor4/camera.js"></script><script defer src="harbor4/harbor.js"></script></head>')
 report={'version':'Beaufort Wildlife & Views 4','base':'4139361fb5f407536b5bab227e44c7baf1ce387e','changed':sorted(n for n,h in original.items() if sha(out/n)!=h),'unchanged':sum(sha(out/n)==h for n,h in original.items()),'patches':edits,'browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'actualPlaybackVerified':False,'photorealismVerified':False,'newDefaultModeledRig':'single450','physicsChange':'roll-aware port/starboard chine contact samples; force model retained','geographyChanged':False}
 (out/'harbor4/build-report.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--out',required=True);a=p.parse_args();print(json.dumps(build(a.base,a.out),indent=2))
