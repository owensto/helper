"""Publication-only corrections to the visually reviewed app; model bytes stay fixed."""
from pathlib import Path
import os,json,hashlib
r=Path(os.environ['BAY_ROOT']);p=r/'site/app.js';s=p.read_text()
a="else updateCamera(1);orbit.update();document.querySelectorAll('[data-camera]')"
b="else updateCamera(1);if(orbit.enabled)orbit.update();else updateCamera(0);document.querySelectorAll('[data-camera]')"
assert a in s;s=s.replace(a,b)
# Render a camera selection immediately, including before a screenshot pauses motion.
a="b.dataset.camera===next));renderer.shadowMap.needsUpdate=true;}"
b="b.dataset.camera===next));renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}"
assert a in s;s=s.replace(a,b);p.write_text(s)
p=r/'site/app.css';s=p.read_text();s+='\n/* Keep introductory text legible against the dock and canopy. */\n@media(min-width:901px){.intro{background:linear-gradient(110deg,#f1f7f1d9,#f1f7f173);padding:15px;border:1px solid #ffffff66;border-radius:14px;backdrop-filter:blur(8px);top:112px}.intro h1{font-size:31px;margin:12px 0}.intro p:not(.eyebrow){font-size:12px}}\n';p.write_text(s)
p=r/'source/verify02.py';s=p.read_text()
a="p.locator('[data-camera=helm]').click();shot(p,f'{device}_drive_helm.png')"
b="p.locator('[data-camera=follow]').click();shot(p,f'{device}_drive_follow.png');p.locator('[data-camera=helm]').click();wait(p,'BAYPLAY.camera.position.distanceTo(BAYPLAY.scene.getObjectByName(\"PLAYER_BOAT\").localToWorld(new ATLASRuntime.Vector3(-1.84,1.85,.18)))<.08');r['helm_position_verified']=True;shot(p,f'{device}_drive_helm.png')"
assert a in s;s=s.replace(a,b);p.write_text(s)
rep=json.loads((r/'site/build_report.json').read_text());rep['visual_review']=['Independent tackle drawers and trays','Fixed-length hatch strut and staged latch motion','Flip-up bolster pads','Correct immediate first-person camera without stale orbit update'];rep['review_run']=38469301604;rep['review_artifact']=11850804160;rep['model_sha256']=hashlib.sha256((r/'site/assets/ATLAS_Bay_Play.glb').read_bytes()).hexdigest();assert rep['model_sha256']=='4456a7e157a19e550be0b270cf9649035ec6c17c77badfcad44789fb64ca26e1';(r/'site/build_report.json').write_text(json.dumps(rep,indent=2))
