"""Build Sea Lab 08 from the retained, checked Sea Lab 07 artifact.
No geometry or approved moving assemblies are replaced by this presentation pass.
"""
from pathlib import Path
import os, shutil, json
root=Path(os.environ.get('SEA_ROOT',Path(__file__).parent));site=root/'site'
for name in ['realism08.js','realism08.css']:shutil.copy2(root/name,site/name)
p=site/'index.html';s=p.read_text()
if 'realism08.js' not in s:s=s.replace('</head>','<link rel="stylesheet" href="realism08.css"><script defer src="realism08.js"></script></head>')
s=s.replace('ATLAS Sea Lab 05 · Sound, Speed &amp; Instruments','ATLAS Sea Lab 08 · Boat, Sound &amp; Radio');p.write_text(s)
p=site/'instruments.js';s=p.read_text();needle='const range=I.depthRange||lastRange;'
if 'I._renderedDepthRange=range' not in s:
 assert needle in s;s=s.replace(needle,needle+'I._renderedDepthRange=range;')
p.write_text(s)
p=site/'manifest.webmanifest';d=json.loads(p.read_text());d['name']='ATLAS Sea Lab 08';d['short_name']='ATLAS Bay';p.write_text(json.dumps(d,indent=2))
(site/'release08.json').write_text(json.dumps({'release':'08','base_artifact':11996022685,'changes':['clearcoat gelcoat and fine deck/upholstery textures','bounded bow-foam and spray pools tied to vessel motion','bounded echo-band sounder and A-scope','always-reachable pause control','radio seek and stereo speaker positioning','preserved repaired geometry, instrument data and faster dynamics'],'simulated_not_sea_trials':True,'live_broadcast_bundled':False},indent=2))
# Reuse the complete earlier browser suite, adding new assertions. The phone
# regression is exercised via the now-visible user control, not state injection.
s=(root/'verify07.py').read_text().replace("'release':'07'","'release':'08'").replace("window.SEA07?.ready &&", "window.SEA08?.ready && window.SEA07?.ready &&").replace("#cmd-pause", "#sea08-pause").replace('Sea Lab 07 checks failed','Sea Lab 08 checks failed')
s=s.replace("   assert page.locator('#cmd-sidebar').is_hidden();", "   assert page.locator('#sea08-pause').is_visible();result['realism08']=page.evaluate('SEA08.inspect()');assert result['realism08']['physicalMaterials']>=3\n   assert page.locator('#cmd-sidebar').is_hidden();",1)
s=s.replace("   shot(page,f'{dev}_radio.png')", "   assert page.evaluate('!!ATLAS_RADIO.stereo08');page.locator('#radio-seek').evaluate('(e)=>{e.value=500;e.dispatchEvent(new Event(\"input\",{bubbles:true}));}')\n   page.wait_for_function('ATLAS_RADIO.audio.currentTime>25');result['radio_seek_and_stereo']=True\n   shot(page,f'{dev}_radio.png')",1)
s=s.replace("assert page.locator('#cmd-restore').is_visible();shot", "assert page.locator('#cmd-restore').is_visible();assert page.locator('#sea08-pause').is_visible();shot")
needle="   page.locator('#pure-cockpit').click();assert page.locator('#speed-hud').is_hidden();"
s=s.replace(needle,"   page.locator('#sea08-pause').click();driving_wait(page,'SEA08.inspect().sprayEmissions>0',result);page.locator('#sea08-pause').click()\n   result['water_effects']=page.evaluate('SEA08.inspect()');assert result['water_effects']['wakeEmissions']>0\n   page.evaluate('BAYPLAY.setCamera(\"follow\");BAYPLAY.refresh()');page.wait_for_timeout(600);shot(page,f'{dev}_underway_exterior.png');page.evaluate('BAYPLAY.setCamera(\"helm\");BAYPLAY.refresh()')\n"+needle,1)
s=s.replace("   result['retained_lid_and_drawer_motion']=True", "   result['retained_lid_and_drawer_motion']=True\n   page.evaluate('BAYPLAY.action(\"drawer1\");BAYPLAY.setCamera(\"orbit\");BAYPLAY.refresh()');page.wait_for_timeout(700);shot(page,f'{dev}_boat_finish.png')",1)
(root/'verify08.py').write_text(s)
print('Sea Lab 08 presentation and browser suite prepared')
