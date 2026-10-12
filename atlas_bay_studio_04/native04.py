import bpy,os,json,math
from pathlib import Path
from mathutils import Vector
R=Path(os.environ['FLEET_ROOT']);S=R/'site';M=R/'models';M.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(R/'staging/ATLAS_Bay_25.glb'))
sc.unit_settings.system='METRIC';sc.frame_start=0;sc.frame_end=1800;sc.frame_set(0)
sc['Design_status']='Original visual design. No performance or construction qualification. Standalone Bay revision, not installed in Explorer.'
for o in list(bpy.data.objects):
 p=o
 while p.parent and p.parent.name!='Vessel':p=p.parent
 name='Hull' if 'Hull' in p.name else 'Fixed T-top' if 'TTop' in p.name else 'Animated fishing equipment' if p.name.startswith('MOV_') else 'Console and seating' if ('Console' in p.name or 'Seating' in p.name) else 'Deck and fittings'
 c=bpy.data.collections.get(name)
 if not c:c=bpy.data.collections.new(name);sc.collection.children.link(c)
 for old in list(o.users_collection):old.objects.unlink(o)
 c.objects.link(o)
# Write portable animation from the actual imported native scene, with time-base set before import.
bpy.ops.export_scene.gltf(filepath=str(S/'assets/ATLAS_Bay_25.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
# Studio exists in the .blend only; not a pretend part of the boat.
def xyz(p):return Vector((p[0],-p[2],p[1]))
world=bpy.data.worlds.new('Studio ambient');sc.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.65,.72,.77,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
for name,loc,power,size,shape in [('Key',(1,8,4),1700,7,'DISK'),('Rim',(-4,6,-5),1900,5,'DISK'),('Front',(5,3,6),700,4,'DISK')]:
 bpy.ops.object.light_add(type='AREA',location=xyz(loc));o=bpy.context.object;o.name='STUDIO_'+name;o.data.energy=power;o.data.shape=shape;o.data.size=size;o.rotation_euler=(xyz([0,.6,0])-o.location).to_track_quat('-Z','Y').to_euler()
for name,pos,tgt,lens in [('Hero',[9,5.8,12],[-.3,1.05,0],56),('Helm',[-5.2,3.2,4.1],[-.55,1.25,0],47),('Profile',[0,2.2,13.8],[-.3,1.0,0],58)]:
 bpy.ops.object.camera_add(location=xyz(pos));c=bpy.context.object;c.name='CAM_'+name;c.data.lens=lens;c.rotation_euler=(xyz(tgt)-c.location).to_track_quat('-Z','Y').to_euler()
sc.camera=bpy.data.objects['CAM_Hero'];sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=False;sc.render.resolution_x=1440;sc.render.resolution_y=900;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False
text=bpy.data.texts.new('READ_ME');text.write('ATLAS Bay 25 Studio 04. +X bow, +Y port, +Z up, metres. Eight unchanged fixed-dimension animation channels; original approved hull and T-top geometry preserved. Tailored upholstery, demonstration instruments and cosmetic hardware added. Browser export comes from the same scene. Original custom styling, not a production-boat replica. The other fleet assets remain unchanged. The candidate-bore result is a static craft-only screen, not a complete recovery-system approval.')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(M/'ATLAS_Bay_25_Studio04.blend'))
report={'native_master':'ATLAS_Bay_25_Studio04.blend','blender_version':bpy.app.version_string,'exported_from_native':True,'bytes':(M/'ATLAS_Bay_25_Studio04.blend').stat().st_size,'browser_bytes':(S/'assets/ATLAS_Bay_25.glb').stat().st_size,'engineering_validated':False}
(S/'bay04_native.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
# Stills made from real geometry, not generative concept illustrations.
if os.environ.get('ATLAS_STILLS','1')=='1':
 for view in ['Hero','Helm']:
  sc.camera=bpy.data.objects['CAM_'+view];sc.render.filepath=str(S/f'bay04_{view.lower()}_blender.png');bpy.ops.render.render(write_still=True)
