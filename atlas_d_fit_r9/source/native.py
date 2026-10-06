"""Save the actual animated glTF as an editable Blender inspection scene."""
import os,bpy,json
from pathlib import Path
site=Path(os.environ['ATLAS_OUT']);dest=Path(os.environ.get('ATLAS_NATIVE','/tmp/atlas9/native'));dest.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(site/'ATLAS_D_R9.glb'))
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.frame_set(1)
scene['Design status']='Selected geometric fit study ONLY. No pressure, load, stability, recovery or safe-depth qualification.'
text=bpy.data.texts.new('ARRANGEMENT_AND_LIMITATIONS.json');text.write((site/'arrangement.json').read_text())
for o in bpy.data.objects:
 o.select_set(False)
 n=o
 while n:
  if n.name.startswith('ENG_PreviousCradles'):
   o.hide_set(True);o.hide_render=True;break
  n=n.parent
path=dest/'ATLAS_D_R9_Fit_Study.blend';bpy.ops.wm.save_as_mainfile(filepath=str(path));assert path.stat().st_size>1000000
print('Saved native inspection scene',len(bpy.data.objects))
