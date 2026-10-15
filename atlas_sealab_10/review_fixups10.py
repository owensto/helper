"""Assertion-checked refinements after actual rendered Sea Lab 10 review."""
from pathlib import Path
r=Path(__file__).parent
p=r/'verify10.py';s=p.read_text()
old='BAYPLAY.testStep(3,{vx:8,vz:0});SEA09.view("follow")';assert s.count(old)==1;s=s.replace(old,'BAYPLAY.testStep(6,{vx:8,vz:0});SEA09.view("follow")')
# Same approach, enough time to actually reach the sandbar; no contact exemption.
old="shot(page,dev+'_rain.png')";assert s.count(old)==1;s=s.replace(old,old+";page.locator('#helm09-close').click();shot(page,dev+'_rain_view.png');page.locator('#helm10-weather').click()")
old="shot(page,dev+'_fog.png')";assert s.count(old)==1;s=s.replace(old,old+";page.locator('#helm09-close').click();shot(page,dev+'_fog_view.png');page.locator('#helm10-weather').click()")
p.write_text(s)
for name in ['operations10.js','site/operations10.js']:
 p=r/name;s=p.read_text();old='const w=weather.current,t=b.context.currentTime;b.param(rainGain.gain,w.rain*.075,t,.25);';assert s.count(old)==1
 s=s.replace(old,old+'if(b.water?.gain)b.param(b.water.gain,b.settings.water*(.10+Math.min(.36,Math.hypot(S.u,S.v)*.012)+w.amp*.25),t,.3);');p.write_text(s)
# Legacy global header/nav styles imposed 145px minimum buttons and wrapping.
# Scope the new helm explicitly: keep desktop one row, reserve two rows below 900px.
css="""
#helm09 .h09-top{flex-wrap:nowrap}
#helm09 .h09-top nav{background:none;border:0;padding:0;backdrop-filter:none;border-radius:0;order:initial;width:auto}
#helm09 .h09-top nav button{min-width:0;flex:0 0 auto}
@media(max-width:900px){#helm09 .h09-top .h09-tools{width:100%;grid-column:1/-1}#helm09 .h09-top .h09-tools button{flex:1}#helm09 .h09-top .h09-tools #helm09-pause{flex:0 0 38px}}
"""
for name in ['site/helm09.css','site/operations10.css','operations10.css']:
 p=r/name;s=p.read_text().replace('max-width:700px','max-width:900px').replace('min-width:701px','min-width:901px')
 if 'operations10.css' in name:s+=css
 p.write_text(s)
print('Contact retained, custom wave sound connected, legacy nav sizing isolated')
# Remove the dry-interior water cutout when the cinematic hull is hidden. Without
# this, the explosion left a boat-shaped hole in the surface.
p=r/'site/refinement06.js';s=p.read_text()
a='inv={value:new T.Matrix4()};';b='inv={value:new T.Matrix4(),active10:{value:1}};';assert s.count(a)==1;s=s.replace(a,b)
a='sh.uniforms.uDryBoatInverse=inv;';assert s.count(a)==1;s=s.replace(a,a+'sh.uniforms.uDryEnabled10=inv.active10;')
a='const mask=`uniform mat4 uDryBoatInverse;';assert s.count(a)==1;s=s.replace(a,'const mask=`uniform float uDryEnabled10;uniform mat4 uDryBoatInverse;')
a='if(dryInterior(vDryWorld)) discard;';assert s.count(a)==2;s=s.replace(a,'if(uDryEnabled10>.5&&dryInterior(vDryWorld)) discard;')
a='for(const i of matrices)i.value.copy(A.boat.matrixWorld).invert();';assert s.count(a)==1;s=s.replace(a,'for(const i of matrices){i.value.copy(A.boat.matrixWorld).invert();i.active10.value=S.destroyed10?0:1;}report.dryMaskEnabled=!S.destroyed10;');p.write_text(s)
for name in ['operations10.js','site/operations10.js']:
 p=r/name;s=p.read_text()
 a='A.scene.attach(driver);driver.position.y+=.3;';assert s.count(a)==1
 s=s.replace(a,'A.scene.attach(driver);const dc=Math.cos(S.heading),ds=Math.sin(S.heading);driver.position.set(S.x-1.65*dc+.42*ds,(S.location===\'beaufort\'?(S.config.tide||0):0)+S.heave+1.24,S.z-1.65*ds-.42*dc);')
 a='if(S.destroyed10)A.model.visible=false;weatherSound();';assert s.count(a)==1
 s=s.replace(a,"if(S.destroyed10)A.model.visible=false;const key=A.boat.getObjectByName('SEA09_IGNITION_KEY');if(key)key.visible=!S.destroyed10;weatherSound();")
 p.write_text(s)
p=r/'verify10.py';s=p.read_text()
a="assert r['cinematicCrash']['activeParticles']>0;";assert s.count(a)==1;s=s.replace(a,a+"assert not page.evaluate('SEA06.inspect().dryMaskEnabled');")
a="assert r['effectsCleaned']['fxAllocations']<=2";assert s.count(a)==1;s=s.replace(a,a+";assert page.evaluate('SEA06.inspect().dryMaskEnabled')")
p.write_text(s)
print('No ghost water cutout or key after explosion; driver starts from the actual impact pose')
