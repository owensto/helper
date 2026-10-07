"""Open the exact published animated GLB in Blender and save the editable scene."""
import bpy,os,math,json
from pathlib import Path
from mathutils import Vector
R=Path(os.environ['ATLAS_ROOT']);O=Path('/tmp/atlas10/native');O.mkdir(exist_ok=True,parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(R/'site/ATLAS_D_R10.glb'))
s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1;s.frame_set(1);s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100
s['Status']='Slate & titanium appearance study. No human-occupied diving or engineering qualification.'
for o in list(bpy.data.objects):
 n=o
 while n:
  if n.name.startswith(('ENG_','SYS_','FX_Subsea_light')):
   o.hide_render=True;o.hide_set(True);break
  n=n.parent
# GLTF is Y-up; imported Blender coordinates are (x,-z,y).
def xyz(a):return Vector((a[0],-a[2],a[1]))
for name,loc,target,lens in [('Yacht',(52,46,145),(0,6,0),55),('Aft lounge',(-40,17,19),(-29.5,8.9,4.5),48),('Stern doors',(-56,10,16),(-40.6,2.8,0),50),('Tender',(-11,9,33),(-23,1.3,17),55),('Pool',(-41,17,14),(-30.5,5.8,0),52)]:
 bpy.ops.object.camera_add(location=xyz(loc));c=bpy.context.object;c.name='CAM_'+name;c.rotation_euler=(xyz(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=lens
s.camera=bpy.data.objects['CAM_Yacht']
world=bpy.data.worlds.new('Broad daylight environment');s.world=world;world.use_nodes=True;nodes=world.node_tree.nodes;bg=nodes.get('Background');bg.inputs['Color'].default_value=(.42,.55,.68,1);bg.inputs['Strength'].default_value=.65
bpy.ops.object.light_add(type='SUN',location=xyz((18,48,35)));sun=bpy.context.object;sun.name='Daylight sun';sun.rotation_euler=(xyz((0,0,0))-sun.location).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.6;sun.data.angle=math.radians(3)
for name,loc,energy,size,color in [('Broad reflection',(-15,40,5),35000,45,(.78,.87,1)),('Stern fill',(-48,15,30),9000,18,(1,.88,.74))]:
 bpy.ops.object.light_add(type='AREA',location=xyz(loc));a=bpy.context.object;a.name=name;a.data.energy=energy;a.data.shape='DISK';a.data.size=size;a.data.color=color;a.rotation_euler=(xyz((0,5,0))-a.location).to_track_quat('-Z','Y').to_euler()
# Water is a presentation object, not part of the GLB vessel or its displacement.
bpy.ops.mesh.primitive_plane_add(size=2400,location=(0,0,.012));water=bpy.context.object;water.name='PRESENTATION_Ocean';m=bpy.data.materials.new('Ocean / presentation only');m.use_nodes=True;nd=m.node_tree.nodes;bs=nd.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.025,.085,.13,1);bs.inputs['Roughness'].default_value=.26
noise=nd.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.7;noise.inputs['Detail'].default_value=3;bump=nd.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.045;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal']);water.data.materials.append(m)
text=bpy.data.texts.new('R10_DETAIL_INVENTORY_AND_LIMITS.json');text.write((R/'site/model_report.json').read_text());bpy.ops.file.pack_all()
path=O/'ATLAS_D_R10_Slate_Titanium.blend';bpy.ops.wm.save_as_mainfile(filepath=str(path));assert path.stat().st_size>1000000
(O/'native_report.json').write_text(json.dumps({'opened_in_blender':True,'blender_version':bpy.app.version_string,'objects':len(bpy.data.objects),'packed_textures':len(bpy.data.images),'file_bytes':path.stat().st_size,'source_glb':'ATLAS_D_R10.glb','engineering_validated':False},indent=2))
