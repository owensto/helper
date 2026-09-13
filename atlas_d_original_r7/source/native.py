import bpy,os,json
from pathlib import Path
root=Path(os.environ['ATLAS_ROOT']);out=Path('/tmp/atlas7/native');out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'site/ATLAS_D_Original.glb'))
s=bpy.context.scene;s.unit_settings.system='METRIC';s.render.fps=30;s.frame_start=1;s.frame_end=1440
for name,fr in [('SURFACE',1),('TENDER_RECOVERY',280),('CLOSE_EXTERIOR',525),('COMPACT_SHELLS',820),('DIVE_READY',1152),('SUBMERGED',1440)]:s.timeline_markers.new(name,frame=fr)
s.frame_set(1)
for o in bpy.data.objects:
 n=o
 while n:
  if n.name.startswith('SYS_'):o.hide_render=True;o.hide_set(True);break
  n=n.parent
text=bpy.data.texts.new('READ ME - Concept limitations');text.write((root/'site/model_report.json').read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ATLAS_D_Original_Concept_R7.blend'))
assert (out/'ATLAS_D_Original_Concept_R7.blend').stat().st_size>1000000
