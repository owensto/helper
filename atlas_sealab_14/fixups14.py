"""Small assertion-checked review corrections; never weaken physics/contact gates."""
from pathlib import Path
r=Path(__file__).parent/'source'
p=r/'verify14.py';s=p.read_text()
a="p.locator('#s11-left').dispatch_event('pointerdown',{'pointerId':21,'pointerType':'touch','clientX':10,'clientY':10,'buttons':1});assert p.evaluate('BAYPLAY.state.steer<0');p.locator('#s11-left').dispatch_event('pointercancel',{'pointerId':21,'pointerType':'touch'});assert p.evaluate('BAYPLAY.state.steer===0')"
b="p.locator('#s11-left').hover();p.mouse.down();p.wait_for_timeout(150);assert p.evaluate('BAYPLAY.state.steer<0');p.mouse.up();p.wait_for_timeout(150);assert p.evaluate('BAYPLAY.state.steer===0')"
assert s.count(a)==1;s=s.replace(a,b).replace('steering cancel does not leave a stuck turn','real pointer release does not leave a stuck turn');p.write_text(s)
# R1 exposed the retained environment11 shader's strict input anchor. It replaces
# water09's colour block, so edit the effective scattering layer rather than
# altering its input and silently bypassing the shader contract.
p=r/'patch14.py';s=p.read_text()
a="patch('water09.js','vec3(.13,.47,.43),vec3(.018,.18,.23)','vec3(.24,.32,.24),vec3(.035,.14,.165)')\npatch('water09.js','1.-exp(-depth09*.19)','1.-exp(-depth09*.28)')"
b="patch('environment11.js','vec3(.10,.36,.29),vec3(.014,.095,.125),1.-exp(-depth09*.24)','vec3(.22,.30,.22),vec3(.025,.115,.135),1.-exp(-depth09*.28)')"
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
polish=Path(__file__).with_name('polish14.py')
exec(compile(polish.read_text(),str(polish),'exec'))
