"""Export the revised cockpit from Blender; authoring master, not engineering CAD."""
from pathlib import Path
import os,json,bpy,hashlib
from mathutils import Vector
r=Path(os.environ['BAY_ROOT']);s=r/'site';(r/'models').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30;sc.unit_settings.system='METRIC'
bpy.ops.import_scene.gltf(filepath=str(s/'assets/ATLAS_Bay_Play.glb'))
sc.frame_start=0;sc.frame_end=1800;sc.frame_set(0)
# The runtime addresses these named parts independently. Do not collapse their hierarchy.
required=['PLAY_DRAWER_1','PLAY_DRAWER_2','PLAY_DRAWER_3','PLAY_BOLSTER_1','PLAY_BOLSTER_2','PLAY_THROTTLE','PLAY_FISHBOX_STRUT_BARREL','PLAY_FISHBOX_STRUT_ROD','PLAY_LATCH_fishbox','PLAY_STEERING','MOV_Outboard_trim']
for n in required:assert bpy.data.objects.get(n),n
bpy.ops.export_scene.gltf(filepath=str(s/'assets/ATLAS_Bay_Play.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
def xyz(p):return Vector((p[0],-p[2],p[1]))
for name,p,t in [('Cockpit',[-6,4.2,6],[0,1,0]),('Tackle',[-3.5,1.7,1.75],[-1.9,.76,0]),('Helm',[-1.84,1.85,.18],[6,1.1,.18]),('Fishbox',[4,4.8,4.5],[1.5,.7,0])]:
 bpy.ops.object.camera_add(location=xyz(p));o=bpy.context.object;o.name='CAM_'+name;o.rotation_euler=(xyz(t)-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=40
sc.camera=bpy.data.objects['CAM_Cockpit'];sc['Scope']='Interactive original design study. App physics and mechanisms are uncalibrated. Hull/roof preserved; drawers and bolsters rebuilt. Runtime: app.js, physics.js, coast.js, sound.js.'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(r/'models/ATLAS_Bay_PlayLab02.blend'))
rep={'blender_version':bpy.app.version_string,'exported_from_native':True,'required_interactive_nodes':required,'browser_bytes':(s/'assets/ATLAS_Bay_Play.glb').stat().st_size,'sha256':hashlib.sha256((s/'assets/ATLAS_Bay_Play.glb').read_bytes()).hexdigest(),'engineering_validated':False}
(s/'native_report.json').write_text(json.dumps(rep,indent=2));print(json.dumps(rep))
