"""Presentation corrections after inspection of actual R9 browser captures."""
from pathlib import Path
import os
root=Path(os.environ['ATLAS_R9']);p=root/'site/lab.js';s=p.read_text()
old='Math.abs(q.dot(right))/(tan*camera.aspect)'
new="Math.abs(q.dot(right))/(tan*(!mobile&&['exterior','upper','lower','buoyancy'].includes(mode)?(innerWidth-350)/innerHeight:camera.aspect))"
assert old in s;s=s.replace(old,new)
old="text='Suite '+r.name.slice(-1)+' · '+r.gross_reserved_area_m2.toFixed(1)+' m²'"
new="text='Suite '+r.name.slice(-1)+(mobile?' · '+r.gross_reserved_area_m2.toFixed(1)+' m²':'')"
assert old in s;s=s.replace(old,new)
old=" label('41.0 m fixed deck · 6.1 m planning width'"
assert old in s;s=s.replace(old," if(!mobile)label('41.0 m fixed deck · 6.1 m planning width'")
p.write_text(s)
# In the native inspection scene, retain the old diagnostic but hide it initially.
p=root/'source/native.py';s=p.read_text();marker="for o in bpy.data.objects:o.select_set(False)"
assert marker in s
s=s.replace(marker,"""for o in bpy.data.objects:
 o.select_set(False)
 n=o
 while n:
  if n.name.startswith('ENG_PreviousCradles'):
   o.hide_set(True);o.hide_render=True;break
  n=n.parent""")
p.write_text(s)
print('Applied reviewed camera and label corrections; old native diagnostic initially hidden.')
