"""Reproducible derivative of pinned Y12. No writes to inherited owner code/assets."""
from pathlib import Path
import hashlib,json,os,subprocess
R=Path(__file__).resolve().parent; P=R.parent/'y12';ROOT=R.parents[2]
BASE='8fa8616b2f10dea29127b0aa971e6646411cd785'
def patch(s,old,new):
 assert s.count(old)==1,('Expected exactly one pinned source anchor',old[:100],s.count(old));return s.replace(old,new)
s=(P/'app.js').read_text()
s=patch(s,'F=AtlasFleet,D=AtlasFleetDynamics','F=AtlasFleet,D=AtlasRealismSea')
s=s.replace("build:'y12'","build:'y13'")
s=patch(s,"sea='calm'","sea='breeze'")
start=s.index('try{const pm=');end=s.index('const tg=',start)
s=s[:start]+"const realEnv=AtlasRealismEnvironment.create(T,renderer,scene,camera,sun,hemi,software);\nconst materialFinish=AtlasRealismMaterials.create(T,D);\nlet propellerPhase=0;\n"+s[end:]
start=s.index('function finish(');end=s.index('function prepareModel(',start)
s=s[:start]+"function finish(m,p){materialFinish.finish(m,p);}\n"+s[end:]
s=patch(s,"if(key==='pod'){m=AtlasSumarsPod.makePod(T);base=null;}","if(key==='pod'){m=AtlasSumarsPod.makePod(T);finish(m,profile);base=null;}")
s=patch(s,"state=new D.Vessel(profile);out.loads.push", "state=new D.Vessel(profile);propellerPhase=0;realEnv.reset(profile);out.loads.push")
s=patch(s,"for(const r of model.userData.rotors||[])r.rotation.x=state.elapsed*Math.abs(state.thrustN)/Math.max(profile.forwardThrust,1)*9;", "for(const r of model.userData.rotors||[])r.rotation.x=propellerPhase;for(const name of ['MOV_Propulsor','MOV_Screw_-1','MOV_Screw_1']){const shaft=model.getObjectByName(name);if(shaft){if(!shaft.userData.y13Base)shaft.userData.y13Base=shaft.quaternion.clone();shaft.quaternion.copy(shaft.userData.y13Base).multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),propellerPhase));}}model.userData.updateDisplay?.(state);")
start=s.index('function fit(){');end=s.index('function setView(',start)
s=s[:start]+'''function fit(){projection();if(!player)return;const box=new T.Box3().setFromObject(player),target=box.getCenter(V()),direction=V(.72,innerWidth>innerHeight&&innerHeight<600?.24:.38,1.3).normalize(),right=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),tan=Math.tan(camera.fov*Math.PI/360);let distance=0;
for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const q=V(x,y,z).sub(target),depth=q.dot(direction);distance=Math.max(distance,depth+Math.abs(q.dot(right))*1.12/(tan*rect.width/rect.h),depth+Math.abs(q.dot(up))*1.12/(tan*rect.height/rect.h));}
camera.position.copy(target).addScaledVector(direction,distance);orbit.target.copy(target);orbit.minDistance=Math.max(1,profile.beam*.35);orbit.maxDistance=Math.max(60,distance*3,profile.length*7);orbit.update();out.fittedDistanceM=distance;}
''' +s[end:]
start=s.index('function lighting(){');end=s.index('function input(',start)
s=s[:start]+'''function lighting(){realEnv.setMood(mood);}
function render(dt){if(state){pose();if(state.depthM>2&&!down)setView('subsea');down=state.depthM>2;cameraUpdate(dt);const scale=Math.max(20,profile.length*1.4);sun.position.set(state.x+scale,state.heaveM+scale*(mood==='golden'?.6:1.5),state.z+scale);sun.target.position.copy(player.position);materialFinish.update(player,state,sea);realEnv.update(state,profile,sea,mood);}
 document.body.classList.toggle('underwater',camera.position.y<-.4);realEnv.reflect();renderer.render(scene,camera);frames++;}
''' +s[end:]
s=patch(s,"state.step(1/60,D.bottom,(x,z,t)=>D.wave(x,z,t,sea));acc-=1/60;", "state.step(1/60,D.bottom,(x,z,t)=>D.wave(x,z,t,sea));realEnv.observe(state,profile);propellerPhase+=Math.sign(state.thrustN)*Math.sqrt(Math.abs(state.thrustN)/Math.max(profile.forwardThrust,1))*12/60;acc-=1/60;")
s=patch(s,"sourceAsset:profile?.sha256??null", "sourceAsset:profile?.sha256??null,realism:realEnv.info(),materials:materialFinish.stats(),propellerPhase,variant:'y13-realism',fittedDistanceM:out.fittedDistanceM")
s=patch(s,'sun.shadow.mapSize.set(2048,2048)','sun.shadow.mapSize.set(software?1024:2048,software?1024:2048)')
(R/'app.js').write_text(s)
html=(P/'index.html').read_text().replace('ATLAS D · SUMARS Fleet','ATLAS D · SUMARS Realism')
html=patch(html,'<script defer src="dynamics.js"></script>','<script defer src="../y12/dynamics.js"></script><script defer src="ocean-state.js"></script><script defer src="environment.js"></script><script defer src="materials.js"></script>')
html=html.replace('<option value="breeze">Sea breeze</option>','<option value="breeze" selected>Sea breeze</option>')
html=html.replace('SUMARS / FLEET EXPERIENCE','SUMARS / OPEN OCEAN')
html=html.replace('Solo fleet experience · original ATLAS-D / N / W designs','Solo fleet · detailed original designs · shared wave field')
html=html.replace('panoramic bubble canopy, twin thruster pods and warm ivory seats.','panoramic acrylic canopy, guarded thrusters and contoured ivory seats.')
(R/'index.html').write_text(html)
css=(P/'style.css').read_text()+'''\n/* Y13: make the view less laboratory-like while preserving hit areas. */
#message{background:#eff6f1bc;box-shadow:none}.panel{background:#f1f7f0e8;border-color:#ffffffcc}.vessel-title h1{font-weight:450;letter-spacing:3px}.fleet-card svg{filter:drop-shadow(0 5px 14px #70b4d73a)}
'''
(R/'style.css').write_text(css)
(R/'fleet.js').write_text((P/'fleet.js').read_text().replace("modelVersion:'atlas-sumars-y12-1'","modelVersion:'atlas-sumars-y13-wave-1'"))
(R/'dynamics.js').write_text("'use strict';module.exports=require('./ocean-state.js');\n")
# Existing 51 functional tests run against Y13 wave-response owner, not mistaken for Y12 certification.
(R/'test-fleet.cjs').write_text((P/'test-fleet.cjs').read_text())
if (ROOT/'.git').exists():
 subprocess.run(['git','fetch','--depth=1','origin',BASE],cwd=ROOT,check=True)
 changed=subprocess.check_output(['git','diff','--name-only',BASE,'HEAD'],cwd=ROOT,text=True).splitlines()
 assert all(p.startswith('atlas_d_simulator_01/contact/y13/') or p=='.github/workflows/atlas-d-simulator-01.yml' for p in changed),changed
 for f in ['atlas_d_simulator_01/contact/y12/app.js','atlas_d_simulator_01/contact/y12/dynamics.js','atlas_d_simulator_01/live/atlas-d-core.js']:
  assert (ROOT/f).read_bytes()==subprocess.check_output(['git','show',BASE+':'+f],cwd=ROOT),f
assets=json.loads((P/'build.json').read_text())['originalAssets']
for f,sha in assets.items():
 if (ROOT/f).exists():assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==sha,f
 elif os.environ.get('CI'):raise FileNotFoundError(f)
print('Y13 generated from pinned Y12 anchors; inherited files unmodified.')
