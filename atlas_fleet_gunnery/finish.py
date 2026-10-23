"""Close reproduced exit/reset flash cleanup defect; preserve actual model and physics."""
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parent;p=R/'gunnery.js';s=p.read_text()
if 'GUNNERY_VISUAL_CLEANUP_1' not in s:
 assert hashlib.sha256(p.read_bytes()).hexdigest()=='15e89daffa480d9aafeb49e5ff607971a3671a07d3c630240c0f1f75a85f2b81'
 a='function clearEffects(){for(const e of effects)'
 assert s.count(a)==1
 s=s.replace(a,"function clearEffects(){for(const q of guns){q.flash.visible=false;q.slide.position.x=0;q.lastShot=-Infinity;}for(const e of effects)")
 a='G.ATLAS_GUNNERY=Object.freeze({inspect:api.inspect});return api;'
 assert s.count(a)==1
 s=s.replace(a,'G.ATLAS_GUNNERY=Object.freeze({inspect:api.inspect});pose();return api;')
 p.write_text(s+'\n// GUNNERY_VISUAL_CLEANUP_1\n')
print('EXIT_RESET_FLASH_CLEANUP_APPLIED')
# Same browser assertions, sharded by layout for bounded public checks.
p=R/'verify.py';s=p.read_text()
a="  for name,w,h in [('portrait',390,844),('small-phone',375,667),('landscape',844,390),('desktop',1440,960)]:"
b="  layouts=[('portrait',390,844),('small-phone',375,667),('landscape',844,390),('desktop',1440,960)]\n  assert not os.environ.get('LAYOUT') or os.environ['LAYOUT'] in [x[0] for x in layouts]\n  for name,w,h in [x for x in layouts if not os.environ.get('LAYOUT') or x[0]==os.environ['LAYOUT']]:"
if a in s:s=s.replace(a,b)
a="tap('#g-exit');ck('return to sailing controls',not g()['mode'] and p.locator('#helm').is_visible());resume();tap('#engine');tap('[data-gear=\"1\"]')"
b="tap('#g-exit');ck('return to sailing controls',not g()['mode'] and p.locator('#helm').is_visible());ck('no stale gun flashes after exit',p.evaluate(\"()=>{let n=0;ATLAS83_APP.model.traverse(o=>{if(o.name.startsWith('ARCADE_'))o.traverse(x=>{if(x.isMesh&&x.material?.type==='MeshBasicMaterial'&&x.visible)n++;});});return n===0;}\"));resume();tap('#engine');tap('[data-gear=\"1\"]')"
if a in s:s=s.replace(a,b)
p.write_text(s)
