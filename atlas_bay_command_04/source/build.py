"""Adapt the retained detailed boat runtime without substituting generic geometry."""
from pathlib import Path
from bs4 import BeautifulSoup
import os,json,hashlib,shutil
r=Path(os.environ.get('COMMAND_ROOT','/mnt/data/atlas_command04'));site=r/'site'
base=r/'base_runtime'
if not base.exists():
 base.mkdir();shutil.copy2(site/'app.js',base/'app.js');shutil.copy2(site/'index.html',base/'index.html');shutil.copy2(site/'coast.js',base/'coast.js')
s=(base/'app.js').read_text()
def rep(a,b):
 global s
 if a not in s:raise RuntimeError('Required runtime patch missing: '+a[:70])
 s=s.replace(a,b)
rep("lastChart=time;const c=", "lastChart=time;if(window.CMD_INSTRUMENTS){CMD_INSTRUMENTS.draw(state,screenMap,screenEngine);screenTexture.needsUpdate=true;engineTexture.needsUpdate=true;return;}const c=")
rep('if(safe)state.step(1/60,obstacles);',"if(safe){window.CMD_LAB?.beforeStep(1/60);state.step(1/60,state.location==='beaufort'||window.CMD_LAB?.active?[]:obstacles);window.CMD_LAB?.afterStep(1/60);}")
rep('for(let i=0;i<seconds*60;i++)state.step(1/60,obstacles);',"for(let i=0;i<seconds*60;i++){window.CMD_LAB?.beforeStep(1/60);state.step(1/60,state.location==='beaufort'||window.CMD_LAB?.active?[]:obstacles);window.CMD_LAB?.afterStep(1/60);}")
rep('get model(){return model},',"get model(){return model},get root(){return root},get boat(){return boat},engineToggle,chooseGear,setQuality,refresh:()=>{syncInputs();updateBoat(0);updateChart(true);},setPaused:(v)=>{gamePaused=!!v;audio.suspend(gamePaused);},")
rep("document.activeElement!==$('#steering')&&!$('#left')", "document.activeElement!==$('#steering')&&document.activeElement!==document.getElementById('cmd-steer')&&!$('#left')")
rep('if(gate<5&&Math.hypot',"if(state.location!=='beaufort'&&!window.CMD_LAB?.active&&gate<5&&Math.hypot")
rep('updateBoat(simDt);updateCamera(dt);',"updateBoat(simDt);window.CMD?.syncMotors(simDt);updateCamera(dt);")
rep("'Shallow bottom contact in the fictional basin. Reset or back away.'", "'Simulated bottom contact. This is not a navigation depth rating.'")
# Labels in the inspection hook refer to actual data state, not the previous fictional world.
rep('geographicData:false',"geographicData:state.location==='beaufort'&&!!window.BayGeo?.ready")
(site/'app.js').write_text(s)
s=(base/'coast.js').read_text();s=s.replace('sh.uniforms.uBayAmp={value:.016};','sh.uniforms.uBayAmp={value:.016};sh.uniforms.uWorldOffset={value:new T.Vector2(0,0)};')
s=s.replace('uniform float uBayTime;uniform float uBayAmp;', 'uniform float uBayTime;uniform float uBayAmp;uniform vec2 uWorldOffset;')
s=s.replace('transformed.y+=sea(transformed.xz);vBayWorld=transformed;', 'transformed.y+=sea(transformed.xz+uWorldOffset);vBayWorld=transformed;vBayWorld.xz+=uWorldOffset;')
# Remove fictional shallow-water coloration; neither basin shading nor a satellite is bathymetry.
a="sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>'"
i=s.find(a)
if i>=0:
 j=s.index('`);',i)+3;s=s[:i]+s[j:]
(site/'coast.js').write_text(s)
s=(site/'physics.js').read_text().replace('if(Math.hypot(this.x,this.z)>', 'if(!global.CMD_LAB?.active && Math.hypot(this.x,this.z)>')
(site/'physics.js').write_text(s)
soup=BeautifulSoup((base/'index.html').read_text(),'html.parser')
body=soup.body;legacy=soup.new_tag('div',id='legacy-ui')
for node in list(body.contents):legacy.append(node.extract())
body.append(legacy)
for ident in ['scene','loader','toast']:
 node=legacy.find(id=ident)
 if node:body.append(node.extract())
ui=BeautifulSoup((r/'source/command-ui.html').read_text(),'html.parser');body.append(ui)
for node in list(soup.head.find_all('script')):node.decompose()
for node in list(soup.head.find_all('link',rel='stylesheet')):node.decompose()
for css in ['app.css','command.css']:
 node=soup.new_tag('link',rel='stylesheet',href=css);soup.head.append(node)
for js in ['runtime.js','performance_data.js','performance.js','physics.js','command-motion.js','geography.js','coast.js','beaufort-coast.js','sound.js','instruments.js','app.js','command-tests.js','command.js']:
 node=soup.new_tag('script',src=js);node['defer']='';soup.head.append(node)
soup.title.string='ATLAS Bay | Configure, Drive & Test — Beaufort'
(site/'index.html').write_text(str(soup))
model=site/'assets/ATLAS_Bay_Play.glb'
assert hashlib.sha256(model.read_bytes()).hexdigest()=='4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1'
report={'revision':'ATLAS Bay Command 04','model_sha256':hashlib.sha256(model.read_bytes()).hexdigest(),'boat_geometry_changed':False,'runtime_engine_instances':True,'layouts':['helm','follow','split','orbit','deck','engine'],'profiles':['reference','seamanship','sport'],'config_hp_range':[90,600],'engine_counts':[1,2],'custom_rig_validated':False,'beaufort_source':'NOAA ENC Direct / harbour scale','google_map_requires_authorized_key':True,'google_live_tested':False,'under_one_foot_draft_validated':False,'sonar':'Simulated visual history using limited nearby chart interpolation, not live sensing','tests_are_simulation_only':True}
(site/'command_report.json').write_text(json.dumps(report,indent=2))
print('Prepared Command 04 app and preserved boat',model.stat().st_size)
