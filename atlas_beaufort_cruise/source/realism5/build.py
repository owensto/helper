#!/usr/bin/env python3
"""Pinned Wildlife4 -> Lightweight Realism5 build. Existing preview stays immutable."""
from pathlib import Path
import argparse,hashlib,json,shutil
HERE=Path(__file__).resolve().parent
FILES=('marine-field.js','wildlife.js','surfaces.js')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(base,out):
 base=Path(base).resolve();out=Path(out).resolve()
 if not base.is_dir() or out.exists() or out==base or out in base.parents or base in out.parents:raise ValueError('Use a new separate output directory')
 pins=json.loads((HERE/'pins.json').read_text())
 for n,h in pins.items():
  if not (base/n).is_file() or sha(base/n)!=h:raise ValueError('Wildlife4 source mismatch: '+n)
 original={str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()};shutil.copytree(base,out);(out/'realism5').mkdir()
 for n in FILES:shutil.copy2(HERE/n,out/'realism5'/n)
 edits=[]
 def patch(name,a,b,count=1):
  p=out/name;s=p.read_text();n=s.count(a)
  if n!=count:raise ValueError(f'Changed source anchor {name} {a[:70]} count={n}')
  p.write_text(s.replace(a,b));edits.append({'file':name,'anchor':a[:70],'count':n})
 # Full analytic encounter derivative, sampled once per support rather than twice.
 patch('command-motion.js',"const wx=this.x+buoyC*xx-buoyS*zz,wz=this.z+buoyS*xx+buoyC*zz,sea=CommandMotion.surface(wx,wz,this.elapsed,this.environment);\n  const seaPrev=CommandMotion.surface(frameX+c*xx-s*zz,frameZ+s*xx+c*zz,this.elapsed-dt,this.environment),vs=(sea-seaPrev)/dt;", """const ox=buoyC*xx-buoyS*zz,oz=buoyS*xx+buoyC*zz,wx=this.x+ox,wz=this.z+oz;
  const field=AtlasMarineField.sample(G.Sea11Waves,wx,wz,this.elapsed,p.amp),sea=field.height;
  const turnRate=Math.atan2(buoyS*c-buoyC*s,buoyC*c+buoyS*s)/dt;
  const vs=AtlasMarineField.encounter(field,(this.x-frameX)/dt,(this.z-frameZ)/dt,turnRate,ox,oz);""")
 patch('command-motion.js',"CommandMotion.surface=(x,z,t,p='calm')=>G.Sea11Waves.sample(x,z,t,(presets[p]||presets.calm).amp).height+(G.Sea12Waves?.wakeSample(x,z,t).height||0);", "CommandMotion.surface=(x,z,t,p='calm')=>AtlasMarineField.height(G.Sea11Waves,x,z,t,(presets[p]||presets.calm).amp);")
 # Cache only immutable candidate IDs, not tide-dependent collision participation.
 patch('physics14.js','let colliderList=[],grid=new Map();','let colliderList=[],grid=new Map(),candidateCache=new Map(),queries5=0,builds5=0;')
 patch('physics14.js','installColliders(list){colliderList=list;grid=new Map();','installColliders(list){colliderList=list;grid=new Map();candidateCache.clear();queries5=builds5=0;')
 patch('physics14.js',"const ids=new Set(),cx=Math.floor(s.x/32),cz=Math.floor(s.z/32);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const n of grid.get((cx+i)+','+(cz+j))||[])ids.add(n);", """queries5++;const cx=Math.floor(s.x/32),cz=Math.floor(s.z/32),key=cx+','+cz;let ids=candidateCache.get(key);if(!ids){const unique=new Set();for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const n of grid.get((cx+i)+','+(cz+j))||[])unique.add(n);ids=[...unique];candidateCache.set(key,ids);builds5++;if(candidateCache.size>32)candidateCache.delete(candidateCache.keys().next().value);}else{candidateCache.delete(key);candidateCache.set(key,ids);}""")
 patch('physics14.js','colliders:colliderList.length,indexCells:grid.size','colliders:colliderList.length,indexCells:grid.size,candidateQueries:queries5,candidateBuilds:builds5,cachedCells:candidateCache.size')
 # Encounter lifecycle and useful visible state, without adding another RAF/timer.
 patch('harbor4/harbor.js','pod=new C.Pod(env)','pod=new AtlasWildlife5.Pod(env)')
 patch('harbor4/harbor.js',"photo:()=>app.classList.contains('photo14'),blocked:", "photo:()=>app.classList.contains('photo14'),wildlife:()=>{const d=pod.nearest(S);return d?{...d,y:env.tide+BayMotion.surface(d.x,d.z,S.elapsed,S.environment)-d.depth}:null;},blocked:")
 patch('harbor4/harbor.js',"app.classList.toggle('h4-free',mode==='free');$('helm09-pause').disabled=mode==='free';freebar.hidden=mode!=='free';", "app.classList.toggle('h4-free',mode==='free'||mode==='wildlife');$('helm09-pause').disabled=mode==='free';freebar.hidden=mode!=='free'&&mode!=='wildlife';pod.watching=mode==='wildlife';freebar.firstChild.textContent=mode==='wildlife'?'Dolphin view · engine idling in Neutral · boat may drift. Pause freezes the trip.':'Free camera · boat paused · WASD move · E/Q up/down · drag to look';")
 patch('harbor4/harbor.js',"function customLook(){return ['orbit','free'].includes(camera.inspect().mode);}","function customLook(){return ['orbit','free','wildlife'].includes(camera.inspect().mode);}")
 patch('harbor4/harbor.js',"if(['orbit','chase'].includes(camera.inspect().mode))", "if(['orbit','chase','wildlife'].includes(camera.inspect().mode))")
 patch('harbor4/harbor.js',"function setWildlife(value){wildlife=!!value;", "function setWildlife(value){if(!value&&camera.inspect().mode==='wildlife')camera.select('chase');wildlife=!!value;")
 anchor="// Decorative fittings are anchored to mapped pier collider centres, never arbitrary shoreline."
 patch('harbor4/harbor.js',anchor,"""function watchDolphins(){setWildlife(true);addDolphins();const d=pod.nearest(S);if(!d){say('No suitable dolphin habitat here. Stay in Beaufort known deep water, then try again.');return false;}
 if(camera.isFree())camera.select('chase');SEA09.bus.dispatch('throttle',0);SEA09.bus.dispatch('gear',0);if((S.speedOverGround||0)>1.55){say('Power idle, Neutral selected. Let the boat coast below 3 knots, then choose Look at dolphins again.');return false;}$('helm09-close').click();if(!$('helm09-mapcard')?.hidden)SEA09.toggleMap?.();camera.select('wildlife');say('Dolphin view. Boat is in Neutral and may drift; use Pause to stop simulation. Back to boat restores your view.');return true;}
"""+anchor)
 patch('harbor4/harbor.js',"add(wildlife?'Dolphins: on':'Dolphins: off'", "add('Look at dolphins · idle boat / Neutral',watchDolphins);add(wildlife?'Dolphins: on':'Dolphins: off'")
 patch('harbor4/harbor.js',"if(kind==='g3-play')add(wildlife?'Dolphins enabled · watch the water':'Enable dolphins',()=>{setWildlife(true);$('helm09-close').click();say('Dolphins surface periodically in known, deeper water. They avoid shore structures and nearby boats.');});", "if(kind==='g3-play'){const q=pod.inspect(S);add('Look at dolphins · idle boat / Neutral',watchDolphins);body.append(element('p',q.nearby?q.count+' dolphins nearby · nearest '+Math.round(q.nearestMetres)+' m. The viewing camera follows a real animal.':'Dolphins need known deeper Beaufort water. None available here yet.','h4-subtitle'));}")
 patch('harbor4/harbor.js','m.group.visible=d.active&&C.wildlifeWater(d.x,d.z,env);','if(!d){m.group.visible=false;ripples[i].visible=false;continue;}m.group.visible=d.active;const viewDistance=Math.hypot(A.camera.position.x-d.x,A.camera.position.z-d.z);for(const detail of m.group.children)if(detail!==m.body)detail.visible=viewDistance<40;m.body.castShadow=SEA14.options.graphics===\'detailed\'&&viewDistance<45;')
 patch('harbor4/harbor.js',"const ring=ripples[i],phase=(pod.elapsed+d.phase)%13;ring.visible=m.group.visible&&phase<4;", "const ring=ripples[i],phase=((pod.elapsed-d.born+d.phase)%10.8+10.8)%10.8;ring.visible=m.group.visible&&d.surface&&phase<4;")
 patch('harbor4/harbor.js','camera,tick,planRecovery,setWildlife,notice:say','camera,tick,planRecovery,setWildlife,watchDolphins,notice:say')
 patch('harbor4/harbor.js','dolphins:models.length,dolphinEnabled:wildlife,','dolphins:models.length,wildlife:pod.inspect(S),dolphinEnabled:wildlife,')
 patch('harbor4/harbor.js',"document.title='ATLAS · Beaufort Wildlife & Views';", "document.title='ATLAS · Beaufort Lightweight Realism';")
 # Tight, explicit wildlife camera. Boat controls blocked, actual water time live.
 patch('harbor4/camera.js',"function isFree(){return mode==='free';}","function isFree(){return mode==='free'||mode==='wildlife';}")
 patch('harbor4/camera.js',"['first','chase','orbit','free'].includes(next)","['first','chase','orbit','free','wildlife'].includes(next)")
 patch('harbor4/camera.js','const wasFree=isFree();','const wasFree=mode===\'free\';')
 patch('harbor4/camera.js','if(isFree()){const old=savedPause;','if(mode===\'free\'){const old=savedPause;')
 patch('harbor4/camera.js','mode=next;if(next===\'chase\'','if(next===\'wildlife\'){distance=9;yaw=0;elevation=.14;}mode=next;if(next===\'chase\'')
 patch('harbor4/camera.js',"if(mode==='orbit'){yaw=", "if(mode==='orbit'||mode==='wildlife'){yaw=")
 patch('harbor4/camera.js',"if(mode==='orbit'||mode==='chase')distance", "if(mode==='orbit'||mode==='chase'||mode==='wildlife')distance")
 patch('harbor4/camera.js','if(!isFree())return false;','if(mode!==\'free\')return false;')
 patch('harbor4/camera.js',' if(isFree()){\n',""" if(mode==='wildlife'){
  const animal=H.wildlife?.();if(!animal)return false;
  const a=animal.heading+Math.PI+yaw,d=C.clamp(distance,7,42);desired.set(animal.x+Math.cos(a)*d,Math.max(H.waterHeight(animal.x,animal.z)+1.15,animal.y+1.15+Math.sin(elevation)*d),animal.z+Math.sin(a)*d);
  target.set(animal.x+.5*Math.cos(animal.heading),animal.y+.16,animal.z+.5*Math.sin(animal.heading));
  if(snap){cam.position.copy(desired);lookAt.copy(target);snap=false;}else{cam.position.lerp(desired,1-Math.exp(-dt*6));lookAt.lerp(target,1-Math.exp(-dt*8));}
  cam.up.set(0,1,0);cam.lookAt(lookAt);cam.updateMatrixWorld();return true;
 }
 if(mode==='free'){
""")
 patch('harbor4/camera.js','freeCameraPausesBoat:true,boatInputsDisabled:isFree()',"freeCameraPausesBoat:mode==='free',wildlifeView:mode==='wildlife',boatInputsDisabled:isFree()")
 patch('harbor4/camera.js','if(isFree()&&savedPause!==null)','if(mode===\'free\'&&savedPause!==null)')
 patch('harbor4/harbor.css','#helm09.harbor4.h4-free #helm09-pause{opacity:.5;cursor:default}', '#helm09.harbor4.h4-free #helm09-pause:disabled{opacity:.5;cursor:default}\n#helm09.harbor4:has(#helm09-pause:not(:disabled)) .h4-flight{display:none!important}')
 patch('harbor4/harbor.js',"camera.key(e.code,true)||['KeyF','KeyR','KeyN','KeyP','KeyZ'].includes(e.code)","camera.key(e.code,true)||['KeyF','KeyR','KeyN','KeyZ'].includes(e.code)||(e.code==='KeyP'&&camera.inspect().mode==='free')")
 patch('cruise/coast-stream.js','g.computeBoundingSphere();','g.computeBoundingSphere();if([\'marsh\',\'moss\',\'leaves\'].includes(c.kind))g.boundingSphere.radius+=.20/c.scale;')
 # Skinned animal conservative whole-animation sphere, no unconditional offscreen draw.
 patch('harbor4/dolphin.js','body.frustumCulled=false;body.castShadow=true;', 'body.boundingSphere=new T.Sphere(new T.Vector3(0,.05,0),2.2);body.frustumCulled=true;body.castShadow=false;')
 # Zero-added-draw surface detail and engine-driven foam. Shared native weather/clock.
 patch('coastal14.js','if(window.AtlasHarborFinish)AtlasHarborFinish.material(kind,sh);', 'if(window.AtlasHarborFinish)AtlasHarborFinish.material(kind,sh);AtlasSurface5.coastal(kind,sh);')
 patch('coastal14.js','coastal14-harbor4-${kind}', 'coastal14-realism5-${kind}')
 patch('water12.js','stern={value:new T.Vector4()};', 'stern={value:new T.Vector4()},propLoad5={value:0},propPose5={value:new T.Vector4()};let lastPropTime5=S.elapsed;')
 patch('water12.js','sh.uniforms.uStern12=stern;', 'sh.uniforms.uStern12=stern;sh.uniforms.propLoad5=propLoad5;sh.uniforms.propPose5=propPose5;')
 patch('water12.js','sh.fragmentShader=AtlasHarborFinish.reflection(sh.fragmentShader);', 'sh.fragmentShader=AtlasHarborFinish.reflection(sh.fragmentShader);AtlasSurface5.water(sh);')
 patch('water12.js','atlas-harbor4-soft-reflection','atlas-realism5-load-wash')
 patch('water12.js','previous();count.value=', "previous();const propDt5=Math.max(0,Math.min(.2,S.elapsed-lastPropTime5));lastPropTime5=S.elapsed;propLoad5.value+=(AtlasMarineField.propLoad(S)-propLoad5.value)*(1-Math.exp(-propDt5*8));const driveDir5=(S.clutch14||0)<0?-1:1;propPose5.value.set(S.x-3.9*Math.cos(S.heading),S.z-3.9*Math.sin(S.heading),Math.cos(S.heading)*driveDir5,Math.sin(S.heading)*driveDir5);count.value=")
 # Regular capped reflection schedule replaces every-fourth-frame + time gate.
 patch('water12.js','let frame=0,lastReflection13=-1e6,reflectionReady=false,sh12=null;', 'let frame=0,lastReflection13=-1e6,reflectionReady=false,sh12=null,lastReflectPosition5=new T.Vector3(1e9,1e9,1e9),lastReflectQuaternion5=new T.Quaternion(),lastReflectWater5=NaN,lastReflectSim5=-1;')
 old="if(!quality||++frame%4!==0||performance.now()-lastReflection13<125||A.camera.position.y<waterY+.15)return;lastReflection13=performance.now();"
 new="""const viewChanged5=A.camera.position.distanceToSquared(lastReflectPosition5)>.0025||Math.abs(A.camera.quaternion.dot(lastReflectQuaternion5))<.99995||Math.abs(waterY-lastReflectWater5)>.002;
const still5=S.elapsed===lastReflectSim5&&!viewChanged5;const interval5=viewChanged5||S.speedOverGround>.2?125:333;
if(!quality||(still5&&performance.now()-lastReflection13<1000)||performance.now()-lastReflection13<interval5||A.camera.position.y<waterY+.15)return;lastReflection13=performance.now();lastReflectPosition5.copy(A.camera.position);lastReflectQuaternion5.copy(A.camera.quaternion);lastReflectWater5=waterY;lastReflectSim5=S.elapsed;"""
 patch('water12.js',old,new)
 # Pure helpers available before command-motion/material initialization.
 patch('index.html','<script defer src="command-motion.js">','<script defer src="realism5/marine-field.js"></script><script defer src="realism5/wildlife.js"></script><script defer src="realism5/surfaces.js"></script><script defer src="command-motion.js">')
 report={'version':'Lightweight Realism 5','base':'2c2e75a441b5660d40eb5327b3a72f92acbd4ef2','changed':sorted(n for n,h in original.items() if sha(out/n)!=h),'unchanged':sum(sha(out/n)==h for n,h in original.items()),'newFiles':list(FILES),'newTextures':0,'newModels':0,'newDrawCalls':0,'nativeClockRetained':True,'forceCoefficientsChanged':False,'waveGeometryChanged':False,'geographyChanged':False,'physicsChange':'analytic current-pose encounter-wave velocity instead of backward finite difference','browserVerified':False,'GPUVerified':False,'physicalDeviceVerified':False,'FPSVerified':False,'patches':edits}
 (out/'realism5/build-report.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--out',required=True);a=p.parse_args();print(json.dumps(build(a.base,a.out),indent=2))
