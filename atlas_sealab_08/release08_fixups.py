"""Final small visual corrections; keep the retained geometry unchanged."""
from pathlib import Path
import os
r=Path(os.environ.get('SEA_ROOT',Path(__file__).parent));site=r/'site'
p=site/'realism08.js';s=p.read_text()
s=s.replace('/soft_deck_insert/', '/soft[ _]deck[ _]insert/')
s=s.replace("function addEffects(dt){const speed=", "function seaY(x,z){return BayMotion.surface(x,z,S.elapsed,S.environment)+(S.location==='beaufort'?(S.config.tide||0):0);}\n function addEffects(dt){const speed=")
s=s.replace('BayMotion.surface(x,z,S.elapsed,S.environment)+.06','seaY(x,z)+.06').replace('BayMotion.surface(xx,zz,S.elapsed,S.environment)+.045','seaY(xx,zz)+.045')
# Increase shadow definition in high-detail mode without enabling expensive
# shadows on the application's software-rendering / smooth-detail path.
needle=' A.scene.environmentIntensity=.76;A.renderer.toneMappingExposure=.98;'
replacement=needle+"\n const keyLight=A.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);if(keyLight){keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-9;keyLight.shadow.camera.right=9;keyLight.shadow.camera.top=9;keyLight.shadow.camera.bottom=-9;keyLight.shadow.camera.updateProjectionMatrix();if(keyLight.shadow.map){keyLight.shadow.map.dispose();keyLight.shadow.map=null;}A.renderer.shadowMap.needsUpdate=true;}"
assert needle in s;s=s.replace(needle,replacement)
p.write_text(s)
p=site/'realism08.css';s=p.read_text();s+='\n/* Keep telemetry clear of camera controls and the radio status pill. */\n@media(min-width:901px){#command-app:not(.immersive) #sea08-compass{top:126px}}\n@media(max-width:700px){#command-app #radio-mini,#command-app.immersive #radio-mini{top:316px;max-width:195px}#command-app:has(#mfd-panel:not([hidden])) #radio-mini{display:none}}\n';p.write_text(s)
p=r/'verify08.py';s=p.read_text();needle="   result['document_width']=page.evaluate('document.documentElement.scrollWidth');"
extra="""   if dev=='desktop':
    page.evaluate('BAYPLAY.setPaused(true);BAYPLAY.setQuality(false);BAYPLAY.setCamera("orbit");BAYPLAY.refresh()');page.wait_for_timeout(1200)
    page.locator('#cmd-panels').click();shot(page,'desktop_boat_high_detail.png');page.locator('#cmd-show').click();page.evaluate('BAYPLAY.setQuality(true)')
"""
assert needle in s;s=s.replace(needle,extra+needle);p.write_text(s)
print('Applied tide-relative spray, separated telemetry, textured deck and high-detail shadow refinements')
