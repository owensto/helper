"""Create editable native Blender review scene from the same animated GLB."""
import bpy,os,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(os.environ['ATLAS_ROOT']);OUT=Path('/tmp/atlas5/native');OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'site/ATLAS_D_R5.glb'))
s=bpy.context.scene;s.unit_settings.system='METRIC';s.render.fps=24;s.frame_start=1;s.frame_end=865;s.frame_set(1)
core=bpy.data.collections.new('02 / Pressure arrangement - inspection only');s.collection.children.link(core)
for o in list(bpy.data.objects):
 n=o;internal=False
 while n:
  if n.name.startswith('SYS_'):internal=True
  n=n.parent
 if internal:
  for col in list(o.users_collection):col.objects.unlink(o)
  core.objects.link(o)
core.hide_render=True;core.hide_viewport=True
world=bpy.data.worlds.new('Marine sky');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.40,.56,.66,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45;s.world=world
for name,loc,energy,size in [('Key',(-25,-45,65),2500,45),('Fill',(30,50,32),1500,40)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,5))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,50));bpy.context.object.data.energy=2.4;bpy.context.object.rotation_euler=(math.radians(28),math.radians(-25),math.radians(-35))
for name,loc,target in [('Hero',(65,-135,43),(0,0,5.7)),('Profile',(0,-155,10),(0,0,6)),('Aft',(-90,-80,46),(-18,0,6)),('Stowage',(-35,-38,30),(-8,0,10))]:
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name='CAM_'+name;c.data.lens=48;c.data.clip_end=5000;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler()
s.camera=bpy.data.objects['CAM_Hero'];s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100
try:s.render.engine='BLENDER_EEVEE_NEXT'
except:s.render.engine='BLENDER_EEVEE'
s['Design limitation']='No certified operating depth. Arrangement and motion only.'
s['Stowed_frame']=537;s['Midpoint_frame']=260
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ATLAS_D_R5_Integrated_Exterior.blend'))
assert (OUT/'ATLAS_D_R5_Integrated_Exterior.blend').stat().st_size>1000000
print('Native Blender model saved, meshes:',sum(o.type=='MESH' for o in bpy.data.objects))
