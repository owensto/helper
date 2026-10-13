"""Save actual interactive geometry and independent fitting clips in Blender."""
from pathlib import Path
import os,json,bpy
from mathutils import Vector
r=Path(os.environ['BAY_ROOT']);s=r/'site';(r/'models').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(s/'assets/ATLAS_Bay_Play.glb'))
sc.frame_start=0;sc.frame_end=1800;sc.frame_set(0);sc.unit_settings.system='METRIC'
bpy.ops.export_scene.gltf(filepath=str(s/'assets/ATLAS_Bay_Play.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
def xyz(p):return Vector((p[0],-p[2],p[1]))
for name,p,t in [('Cockpit',[-6,4,6],[0,1,0]),('Fishbox',[4,4.8,4.5],[1.5,.7,0]),('Helm',[-1.35,1.98,.18],[8,1.9,.18])]:
 bpy.ops.object.camera_add(location=xyz(p));o=bpy.context.object;o.name='CAM_'+name;o.rotation_euler=(xyz(t)-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=40
sc.camera=bpy.data.objects['CAM_Cockpit'];sc['Scope']='Uncalibrated interactive game prototype. Hull and top preserved. Runtime controls are in app.js and physics.js. No draft, speed or engineering ratings.'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(r/'models/ATLAS_Bay_PlayLab01.blend'))
(s/'native_report.json').write_text(json.dumps({'blender_version':bpy.app.version_string,'exported_from_native':True,'browser_bytes':(s/'assets/ATLAS_Bay_Play.glb').stat().st_size,'engineering_validated':False},indent=2))
