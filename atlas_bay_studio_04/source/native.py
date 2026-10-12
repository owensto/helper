"""Create five native Blender masters, export the browser from those masters.
Does not fabricate engineering validation. Cameras/lights are presentation only.
"""
import bpy,os,sys,math,json
from pathlib import Path
from mathutils import Vector
R=Path(os.environ['FLEET_ROOT']);out=R/'models';out.mkdir(exist_ok=True);assets=R/'site/assets';assets.mkdir(exist_ok=True)
items=[('ATLAS_Bay_25','ATLAS_Bay_25_Master',60,[-.3,1.2,0],[10,7,15]),('ATLAS_N','ATLAS_N_Submarine_Master',60,[0,1,0],[70,32,120]),('ATLAS_W','ATLAS_W_Surface_Ship_Master',60,[0,8,0],[90,54,180]),('ATLAS_Chase_12','ATLAS_Chase_12_Master',0,[0,1.3,0],[13,8,20]),('ATLAS_D','ATLAS_D_Explorer_Master',72,[0,6,0],[65,44,150])]
reports=[]
def xyz(v):return Vector((v[0],-v[2],v[1]))
for ident,master,duration,target,loc in items:
 print('NATIVE START',ident,flush=True);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(R/'staging'/f'{ident}.glb'))
 s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1;s.render.fps=30;s.frame_start=0;s.frame_end=max(1,duration*30);s.frame_set(0)
 s['Model_status']='Original visual design and prescribed motion. No engineering or naval-performance qualification.'
 s['Axes']='Metres. Blender +X forward, +Y port, +Z up. glTF converts to Y-up.'
 s['Canonical_fishing_asset']='ATLAS_Bay_25_Master.blend; derivative integration regenerated from the same geometry staging asset, not a live external library dependency.'
 # Preserve imported hierarchy and explicit animation tracks; create readable review collections.
 for obj in list(bpy.data.objects):
  par=obj
  while par.parent and par.parent.name!='Vessel':par=par.parent
  name=par.name
  cat='Mechanisms' if name.startswith('MOV_') else 'Interiors_and_studies' if name.startswith(('INT_','ENG_','SYS_')) else 'Hull' if 'Hull' in name else 'Exterior'
  col=bpy.data.collections.get(cat)
  if col is None:col=bpy.data.collections.new(cat);s.collection.children.link(col)
  for old in list(obj.users_collection):old.objects.unlink(obj)
  col.objects.link(obj)
 # Export exact native geometry before presentation lighting is added.
 args=dict(filepath=str(assets/f'{ident}.glb'),export_format='GLB',export_animations=duration>0,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
 props={p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
 args={k:v for k,v in args.items() if k in props}
 if 'export_animation_mode' in props:args['export_animation_mode']='ACTIONS'
 bpy.ops.export_scene.gltf(**args)
 # Cameras inspect the same objects; hidden study geometry remains editable.
 for obj in bpy.data.objects:
  n=obj
  while n:
   if n.name.startswith(('INT_','ENG_','SYS_','FX_')):obj.hide_render=True;obj.hide_set(True);break
   n=n.parent
 for nm,cloc,ctarget in [('Hero',loc,target),('Profile',[target[0],target[1]+2,loc[2]*1.08],target),('Stern',[-abs(loc[2])*.65,loc[1],loc[2]*.60],target)]:
  bpy.ops.object.camera_add(location=xyz(cloc));c=bpy.context.object;c.name='CAM_'+nm;c.rotation_euler=(xyz(ctarget)-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=48
 s.camera=bpy.data.objects['CAM_Hero'];s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100
 world=bpy.data.worlds.new('Neutral sky / presentation');s.world=world;world.use_nodes=True;bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.42,.55,.68,1);bg.inputs['Strength'].default_value=.65
 bpy.ops.object.light_add(type='SUN',location=xyz([20,60,45]));sun=bpy.context.object;sun.name='PRESENTATION_Sun';sun.rotation_euler=(xyz([0,0,0])-sun.location).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.6;sun.data.angle=.07
 bpy.ops.object.light_add(type='AREA',location=xyz([0,35,35]));lamp=bpy.context.object;lamp.name='PRESENTATION_Soft_fill';lamp.data.energy=15000 if ident in ['ATLAS_D','ATLAS_N','ATLAS_W'] else 1300;lamp.data.size=25 if ident in ['ATLAS_D','ATLAS_N','ATLAS_W'] else 6;lamp.rotation_euler=(xyz(target)-lamp.location).to_track_quat('-Z','Y').to_euler()
 text=bpy.data.texts.new('README_MODEL_SCOPE.txt');text.write('ATLAS Fleet 02. The browser model is exported from this native scene before cameras and lights are added. Imported named rigid animations are retained. No safe depth, watertight construction, stability, loads or naval performance are established. Military hardware is non-operational visual scenery. Show the Interiors_and_studies collection to inspect room reservations. A clean source rebuild and exact stage geometry are archived with this release.')
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/(master+'.blend')))
 reports.append({'asset':ident,'native_master':master+'.blend','opened_in_blender':True,'exported_from_native':True,'blender_version':bpy.app.version_string,'objects':len(bpy.data.objects),'packed_images':len(bpy.data.images),'native_bytes':(out/(master+'.blend')).stat().st_size,'glb_bytes':(assets/(ident+'.glb')).stat().st_size,'animation_duration_target':duration,'engineering_validated':False});print('NATIVE DONE',ident,flush=True)
(R/'site/native_report.json').write_text(json.dumps(reports,indent=2))
