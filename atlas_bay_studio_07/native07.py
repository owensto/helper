"""Save real Studio 07 geometry as Blender scenes and browser GLBs."""
import bpy,os,json
from pathlib import Path
from mathutils import Vector
r=Path(os.environ['FLEET_ROOT']);s=r/'site';reports=[]
for stem,out in [('ATLAS_Bay_25','ATLAS_Bay_25_Studio07'),('ATLAS_Bay_25_Shallow_Study','ATLAS_Bay_25_Shallow_Study07')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
 bpy.ops.import_scene.gltf(filepath=str(r/'staging'/f'{stem}.glb'))
 sc.frame_start=0;sc.frame_end=1800;sc.frame_set(0);sc.unit_settings.system='METRIC'
 bpy.ops.export_scene.gltf(filepath=str(s/'assets'/f'{stem}.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
 world=bpy.data.worlds.new('Coastal studio - CC0 sky');sc.world=world;world.use_nodes=True;n=world.node_tree.nodes
 env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(s/'assets/coastal_sky.hdr'));world.node_tree.links.new(env.outputs['Color'],n['Background'].inputs['Color']);n['Background'].inputs['Strength'].default_value=.65
 def xyz(v):return Vector((v[0],-v[2],v[1]))
 for name,pos,target,lens in [('Showroom',[-8.5,5.4,11],[-.35,1.2,0],58),('Outboard',[-6.0,1.9,2.2],[-4.18,.5,0],62),('Helm',[-3.2,2.2,1.8],[-.68,1.15,0],58)]:
  bpy.ops.object.camera_add(location=xyz(pos));o=bpy.context.object;o.name='CAM_'+name;o.data.lens=lens;o.rotation_euler=(xyz(target)-o.location).to_track_quat('-Z','Y').to_euler()
 sc.camera=bpy.data.objects['CAM_Showroom'];sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=False;sc.view_settings.view_transform='AgX';sc.render.resolution_x=1600;sc.render.resolution_y=1000
 sc['Status']='Original visual model. 300 hp-class preference not an installed/rated engine. 450 not fitted. Draft and recovery unqualified.'
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(r/'models'/f'{out}.blend'))
 reports.append({'file':out+'.blend','blender_version':bpy.app.version_string,'exported_from_native':True,'browser_bytes':(s/'assets'/f'{stem}.glb').stat().st_size,'engineering_validated':False})
(s/'native07.json').write_text(json.dumps(reports,indent=2))
