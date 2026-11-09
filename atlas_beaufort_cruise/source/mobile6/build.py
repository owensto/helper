#!/usr/bin/env python3
"""Assertion-checked Mobile Driving6 copy. Never edits the input or changes force coefficients."""
from pathlib import Path
import argparse, hashlib, json, shutil
HERE=Path(__file__).resolve().parent

def build(base,out):
 base=base.resolve();out=out.resolve()
 if out.exists() or base==out or base in out.parents or out in base.parents:raise ValueError('A new non-overlapping output is required')
 pins=json.loads((HERE/'pins.json').read_text())
 for n,h in pins.items():
  if hashlib.sha256((base/n).read_bytes()).hexdigest()!=h:raise ValueError('Base mismatch: '+n)
 shutil.copytree(base,out);(out/'mobile6').mkdir()
 for n in ['mobile-core.js','mobile-ui.js','mobile.css']:shutil.copy2(HERE/n,out/'mobile6'/n)
 patches=[]
 def patch(n,old,new,count=1):
  p=out/n;s=p.read_text();assert s.count(old)==count,(n,old[:60],s.count(old));p.write_text(s.replace(old,new));patches.append({'file':n,'anchor':old[:60],'count':count})
 patch('device/device-bootstrap.js','paused:()=>A.isPaused(),','paused:()=>A.isPaused(),blocked:()=>document.hidden||!$(\'helm09-panel\').hidden||!$(\'helm09-mapcard\').hidden||root.classList.contains(\'photo14\')||!!window.ATLAS_HARBOR4?.camera.isFree(),')
 patch('device/device-ui.js','const steering=new C.Steering(H);','const mobile=G.AtlasMobile6?.create(H,C),steering=mobile?.steering||new C.Steering(H);')
 patch('device/device-ui.js','steering.start(e.pointerId,e.clientX,pad.getBoundingClientRect())','steering.start(e.pointerId,e.clientX,pad.getBoundingClientRect(),e.pointerType)')
 patch('device/device-ui.js',"on(pad,'blur',()=>{steering.reset();paintSteer();});", "on(pad,'blur',()=>{if(steering.pointer===null)steering.reset();paintSteer();});")
 patch('device/device-ui.js',"on(W,'blur',()=>{steering.reset();paintSteer();});on(D,'visibilitychange',()=>{if(D.hidden)steering.reset();});", "on(W,'blur',()=>{mobile?.cancel();steering.reset();paintSteer();});on(D,'visibilitychange',()=>{if(D.hidden){mobile?.cancel();steering.reset();}});")
 patch('device/device-ui.js',"C.changePower(H,0);sync();", "mobile?mobile.power.idle():C.changePower(H,0);sync();")
 patch('device/device-ui.js',"C.fullPower(H);say('Full power selected; docking limit off. Gear and engine remain under your control.');", "if(mobile&&G.AtlasMobile6.coarse(W)){mobile.power.full();say('Full power requested gradually; docking limit off.');}else{C.fullPower(H);say('Full power selected; docking limit off.');}")
 patch('device/device-ui.js',"on(power,'input',()=>{C.changePower(H,Number(power.value)/100);sync();});", """on(power,'input',()=>{if(mobile?.power.pointer!=null){power.value=String(Math.round(H.read().throttle*100));return;}mobile?.power.cancel();C.changePower(H,Number(power.value)/100);sync();});
 if(mobile){
  on(power,'pointerdown',e=>{if(!G.AtlasMobile6.isTouch(e))return;e.preventDefault();e.stopPropagation();if(mobile.power.start(e,power.getBoundingClientRect())){try{power.setPointerCapture(e.pointerId);}catch(_){mobile.power.cancel();}}});
  on(power,'pointermove',e=>{if(mobile.power.move(e)){e.preventDefault();e.stopPropagation();}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(power,type,e=>{if(mobile.power.end(e,type!=='pointerup')){e.preventDefault();e.stopPropagation();}});
 }
""")
 patch('device/device-ui.js','function open(kind){steering.reset();','function open(kind){mobile?.cancel();steering.reset();')
 patch('device/device-ui.js',"on($('helm09-pause'),'click',()=>{steering.reset();", "on($('helm09-pause'),'click',()=>{mobile?.cancel();steering.reset();")
 patch('device/device-ui.js',"powerValue.textContent=Math.round(s.throttle*100)+'%'+(H.docking()?' · docking':'');", "powerValue.textContent=Math.round(s.throttle*100)+'%'+(mobile?.power.target!=null?' → '+Math.round(mobile.power.target*100)+'%':'')+(H.docking()?' · docking':'');")
 patch('device/device-ui.js','s.trimActual,paused,panelOpen]', 's.trimActual,paused,panelOpen,mobile?.power.target]')
 patch('device/device-ui.js',"if(D.activeElement!==power)power.value=", "if(mobile?.power.target!=null||D.activeElement!==power)power.value=")
 patch('device/device-ui.js','const api={ready:true,inspect:', 'const api={ready:true,tick:dt=>mobile?.tick(dt),cancelInput:()=>mobile?.cancel(),mobileInspect:()=>mobile?.inspect(),inspect:')
 patch('device/device-ui.js','if(disposed)return;steering.dispose();disposed=true;', 'if(disposed)return;mobile?.dispose();steering.dispose();disposed=true;')
 # Keep native 60Hz integration. Explicit pause before catch-up >12 steps, not slow motion or dropped time.
 patch('app.js','let dt=Math.min(4,wallDt);if(wallDt>4&&ready', "const m6Hold=window.AtlasMobile6?.shouldHold(wallDt,acc,AtlasMobile6.coarse(window),ready&&!document.hidden&&!gamePaused&&!modalOpen()&&mode==='drive'&&(state.engine||state.speedOverGround>.5));let dt=Math.min(4,wallDt);if((wallDt>4||m6Hold)&&ready")
 patch('app.js',"&&mode==='drive'&&state.engine){gamePaused=true;acc=0;timing.stalls++;", "&&mode==='drive'&&(state.engine||m6Hold)){gamePaused=true;dt=0;acc=0;window.ATLAS_DEVICE_HELM?.cancelInput();timing.stalls++;")
 patch('app.js',"message('Rendering stalled. Paused instead of silently slowing time; resume or choose Smooth detail.');", "message('Long frame: boat paused before moving ahead. Choose Performance graphics if this repeats, then Resume.');")
 patch('app.js',"window.ATLAS_HELM_KEYS.tick(dt);", "window.ATLAS_HELM_KEYS.tick(dt);window.ATLAS_DEVICE_HELM?.tick(dt);")
 # Global hidden-map keyboard/gesture state must not keep consuming navigation keys.
 patch('game3/bootstrap.js',"||!$('helm09-panel').hidden||root.classList.contains('photo14')", "||!$('helm09-panel').hidden||!$('helm09-mapcard').hidden||root.classList.contains('photo14')")
 # Keep chase/orbit camera translation aligned at speed; retain angular/vertical damping.
 patch('harbor4/camera.js',"const keys=new Set(),", "let lastX=S.x,lastZ=S.z,lastLocation=S.location;const keys=new Set(),")
 patch('harbor4/camera.js',"function update(dt){if(H.photo())return false;", """function update(dt){const dx=S.x-lastX,dz=S.z-lastZ,same=lastLocation===S.location;lastX=S.x;lastZ=S.z;lastLocation=S.location;
 if(!snap&&same&&Math.hypot(dx,dz)<80&&(mode==='chase'||mode==='orbit')){cam.position.x+=dx;cam.position.z+=dz;lookAt.x+=dx;lookAt.z+=dz;}
 if(H.photo())return false;""")
 # On touch devices keep Auto below its old 1.0 budget; explicit Detailed still available.
 patch('experience14.js',"if(window.SEA_SOFTWARE)effectiveScale=.5;", "if(value==='auto'&&window.AtlasMobile6?.coarse(window))effectiveScale=Math.min(.8,effectiveScale);if(window.SEA_SOFTWARE)effectiveScale=.5;")
 patch('experience14.js',"next=Math.min(1,next+.05)", "next=Math.min(window.AtlasMobile6?.coarse(window)?.8:1,next+.05)")
 # Make first-party pause message actionable without silently altering graphics preferences.
 patch('operations10.js',"Graphics stalled — simulation paused. Resume, or choose Balanced graphics in Settings.", "Long frame — boat paused before jumping ahead. Try Performance graphics, then Resume.")
 patch('operations10.js',"<button id=\"sea10-resume\">Resume</button>", "<button id=\"m6-performance\">Performance</button><button id=\"sea10-resume\">Resume</button>")
 patch('operations10.js',"$('sea10-resume').onclick=()=>A.setPaused(false);", "$('sea10-resume').onclick=()=>A.setPaused(false);$('m6-performance').onclick=()=>window.SEA14?.graphics('smooth');")
 # Clear touches on map open, even when it was opened through a non-device menu path.
 patch('helm09.js',"function toggleMap(){", "function toggleMap(){window.ATLAS_DEVICE_HELM?.cancelInput();")
 patch('index.html','<script defer="" src="app.js">','<script defer src="mobile6/mobile-core.js"></script>\n<script defer="" src="app.js">')
 patch('index.html','</head>','<link rel="stylesheet" href="mobile6/mobile.css"><script defer src="mobile6/mobile-ui.js"></script>\n</head>')
 original={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in base.rglob('*') if p.is_file()}
 changed=[n for n,h in original.items() if hashlib.sha256((out/n).read_bytes()).hexdigest()!=h]
 for n in ['command-motion.js','physics14.js','world09.js','waves11.js','realism5/marine-field.js','cruise/world/manifest.json','cruise/motor-music.js','harbor4/dolphin.js']:
  assert n not in changed,n
 report={'version':'Mobile Driving 6','base':'6339a15b22232e2c830203c25a547c7a168c8e24','changed':sorted(changed),'unchanged':len(original)-len(changed),'newPhysicsCoefficients':False,'fixedPhysicsStep':1/60,'mobileMaxCatchupSteps':12,'browserVerified':False,'physicalDeviceVerified':False,'FPSVerified':False,'patches':patches}
 (out/'mobile6/build-report.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();print(json.dumps(build(a.base,a.out),indent=2))
