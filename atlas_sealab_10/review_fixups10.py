"""Assertion-checked refinements after first actual rendered Sea Lab 10 review."""
from pathlib import Path
r=Path(__file__).parent
p=r/'verify10.py';s=p.read_text()
old='BAYPLAY.testStep(3,{vx:8,vz:0});SEA09.view("follow")';assert s.count(old)==1;s=s.replace(old,'BAYPLAY.testStep(6,{vx:8,vz:0});SEA09.view("follow")')
# The three-second fixture stopped before the bow reached the sandbar; retain
# the physical contact gate and give the same coasting approach six seconds.
old="shot(page,dev+'_rain.png')";assert s.count(old)==1;s=s.replace(old,old+";page.locator('#helm09-close').click();shot(page,dev+'_rain_view.png');page.locator('#helm10-weather').click()")
old="shot(page,dev+'_fog.png')";assert s.count(old)==1;s=s.replace(old,old+";page.locator('#helm09-close').click();shot(page,dev+'_fog_view.png');page.locator('#helm10-weather').click()")
p.write_text(s)
# Weather now has a custom key; use its actual wave amplitude, not the previous
# named-preset fallback, when setting the recorded water layer's loudness.
for name in ['operations10.js','site/operations10.js']:
 p=r/name;s=p.read_text();old='const w=weather.current,t=b.context.currentTime;b.param(rainGain.gain,w.rain*.075,t,.25);';assert s.count(old)==1
 s=s.replace(old,old+'if(b.water?.gain)b.param(b.water.gain,b.settings.water*(.10+Math.min(.36,Math.hypot(S.u,S.v)*.012)+w.amp*.25),t,.3);');p.write_text(s)
print('Kept contact gate; extended same actual approach and connected custom wave sound')
