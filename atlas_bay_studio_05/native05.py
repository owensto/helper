"""Native Blender round trips of the approved and optional study models."""
import bpy,os,json
from pathlib import Path
from mathutils import Vector
R=Path(os.environ['FLEET_ROOT']);S=R/'site';M=R/'models';M.mkdir(exist_ok=True);reports=[]
for stem,out in [('ATLAS_Bay_25','ATLAS_Bay_25_Studio05'),('ATLAS_Bay_25_Shallow_Study','ATLAS_Bay_25_Shallow_Study05')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
 bpy.ops.import_scene.gltf(filepath=str(R/'staging'/f'{stem}.glb'))
 sc.unit_settings.system='METRIC';sc.frame_start=0;sc.frame_end=1800;sc.frame_set(0)
 sc['Status']='Visual model. Six T-top holders; single outboard. Optional shallow hull is UNVALIDATED. No draft rating, seaworthiness or approved garage integration.'
 bpy.ops.export_scene.gltf(filepath=str(S/'assets'/f'{stem}.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
 def xyz(p):return Vector((p[0],-p[2],p[1]))
 w=bpy.data.worlds.new('Studio');sc.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs['Color'].default_value=(.65,.72,.77,1);w.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
 for name,loc,energy,size in [('Key',(1,8,4),1700,7),('Rim',(-4,6,-5),1900,5)]:
  bpy.ops.object.light_add(type='AREA',location=xyz(loc));o=bpy.context.object;o.name='STUDIO_'+name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(xyz([0,.6,0])-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=xyz([9,5.8,12]));cam=bpy.context.object;cam.name='CAM_Hero';cam.data.lens=56;cam.rotation_euler=(xyz([-.3,1.05,0])-cam.location).to_track_quat('-Z','Y').to_euler();sc.camera=cam
 sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=False;sc.view_settings.view_transform='AgX';sc.render.resolution_x=1440;sc.render.resolution_y=900;sc.render.resolution_percentage=100
 text=bpy.data.texts.new('DESIGN_NOTES');text.write((R/'DESIGN_NOTES.md').read_text())
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(M/f'{out}.blend'))
 reports.append({'asset':stem,'native_file':out+'.blend','blender_version':bpy.app.version_string,'exported_from_native':True,'native_bytes':(M/f'{out}.blend').stat().st_size,'browser_bytes':(S/'assets'/f'{stem}.glb').stat().st_size,'engineering_validated':False})
(S/'bay05_native.json').write_text(json.dumps(reports,indent=2))
