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
