"""Small assertion-checked review corrections; never weaken physics/contact gates."""
from pathlib import Path
r=Path(__file__).parent/'source'
p=r/'verify14.py';s=p.read_text()
a="p.locator('#s11-left').dispatch_event('pointerdown',{'pointerId':21,'pointerType':'touch','clientX':10,'clientY':10,'buttons':1});assert p.evaluate('BAYPLAY.state.steer<0');p.locator('#s11-left').dispatch_event('pointercancel',{'pointerId':21,'pointerType':'touch'});assert p.evaluate('BAYPLAY.state.steer===0')"
b="p.locator('#s11-left').hover();p.mouse.down();p.wait_for_timeout(150);assert p.evaluate('BAYPLAY.state.steer<0');p.mouse.up();p.wait_for_timeout(150);assert p.evaluate('BAYPLAY.state.steer===0')"
assert s.count(a)==1;s=s.replace(a,b).replace('steering cancel does not leave a stuck turn','real pointer release does not leave a stuck turn');p.write_text(s)
