"""Native masters and small-radius contact shading. Cosmetic, not vessel analysis."""
import bpy,os,json,math,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(os.environ['FLEET_ROOT']);S=R/'site';M=R/'models';M.mkdir(exist_ok=True);report=[]
for stem,out in [('ATLAS_Bay_25','ATLAS_Bay_25_Studio06'),('ATLAS_Bay_25_Shallow_Study','ATLAS_Bay_25_Shallow_Study06')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=30
 bpy.ops.import_scene.gltf(filepath=str(R/'staging'/f'{stem}.glb'));sc.unit_settings.system='METRIC';sc.frame_set(0);sc.frame_start=0;sc.frame_end=1800
 objects=[o for o in sc.objects if o.type=='MESH'];verts=[];faces=[];offset=0
 for o in objects:
  if any('glass' in m.name.lower() for m in o.data.materials if m):continue
  me=o.data;me.calc_loop_triangles();verts.extend(o.matrix_world@v.co for v in me.vertices);faces.extend(tuple(offset+i for i in tri.vertices) for tri in me.loop_triangles);offset+=len(me.vertices)
 tree=BVHTree.FromPolygons(verts,faces,all_triangles=True);start=time.time();samples=10;count=0;cache={};hemi=[]
 for i in range(samples):
  z=math.sqrt((i+.5)/samples);rr=math.sqrt(1-z*z);phi=i*2.39996323;hemi.append((rr*math.cos(phi),rr*math.sin(phi),z))
 for o in objects:
  if not any(any(k in m.name.lower() for k in ['white','fabric','deck','woven','upholstery']) for m in o.data.materials if m):continue
  me=o.data;normalmat=o.matrix_world.to_3x3().inverted().transposed();colors=me.color_attributes.new(name='Contact shading',type='FLOAT_COLOR',domain='POINT');me.color_attributes.active_color_index=me.color_attributes.find(colors.name);me.color_attributes.render_color_index=me.color_attributes.find(colors.name)
  for v,c in zip(me.vertices,colors.data):
   pos=o.matrix_world@v.co;n=(normalmat@v.normal).normalized();key=tuple(round(x,4) for x in (*pos,*n))
   if key in cache:val=cache[key]
   else:
    ref=Vector((0,0,1)) if abs(n.z)<.85 else Vector((1,0,0));u=n.cross(ref).normalized();vv=n.cross(u);origin=pos+n*.002;occ=0
    for a,b,z in hemi:
     hit,nn,ii,dist=tree.ray_cast(origin,u*a+vv*b+n*z,.32)
     if hit is not None:occ+=(1-dist/.32)**.6
    val=1-.32*occ/samples;cache[key]=val
   c.color=(val,val,val,1);count+=1
  for mat in me.materials:
   if not mat or not mat.use_nodes:continue
   nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=next((x for x in nodes if x.type=='BSDF_PRINCIPLED'),None)
   if not bs or any(x.name=='06 Contact tint' for x in nodes):continue
   col=nodes.new('ShaderNodeVertexColor');col.layer_name='Contact shading';mix=nodes.new('ShaderNodeMixRGB');mix.name='06 Contact tint';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
   if bs.inputs['Base Color'].is_linked:links.new(bs.inputs['Base Color'].links[0].from_socket,mix.inputs[1])
   else:mix.inputs[1].default_value=bs.inputs['Base Color'].default_value
   links.new(col.outputs['Color'],mix.inputs[2]);links.new(mix.outputs['Color'],bs.inputs['Base Color'])
 for mat in bpy.data.materials:
  if not mat.use_nodes:continue
  nodes=mat.node_tree.nodes;mix=nodes.get('06 Contact tint');bs=next((x for x in nodes if x.type=='BSDF_PRINCIPLED'),None)
  if mix and bs:
   mat.node_tree.links.remove(bs.inputs['Base Color'].links[0])
   if mix.inputs[1].is_linked:mat.node_tree.links.new(mix.inputs[1].links[0].from_socket,bs.inputs['Base Color'])
   else:bs.inputs['Base Color'].default_value=mix.inputs[1].default_value
 bpy.ops.export_scene.gltf(filepath=str(S/'assets'/f'{stem}.glb'),export_format='GLB',export_animations=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_force_sampling=False)
 for mat in bpy.data.materials:
  if mat.use_nodes and mat.node_tree.nodes.get('06 Contact tint'):
   bs=next(x for x in mat.node_tree.nodes if x.type=='BSDF_PRINCIPLED');mat.node_tree.links.new(mat.node_tree.nodes['06 Contact tint'].outputs[0],bs.inputs['Base Color'])
 world=bpy.data.worlds.new('Coastal HDRI — Poly Haven CC0');sc.world=world;world.use_nodes=True;nodes=world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(S/'assets/coastal_sky.hdr'));world.node_tree.links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=.65
 def xyz(a):return Vector((a[0],-a[2],a[1]))
 for name,loc,power,size in [('KEY',(-3.8,7.8,5.6),1100,4),('FILL',(3,5,-4),500,6)]:
  bpy.ops.object.light_add(type='AREA',location=xyz(loc));o=bpy.context.object;o.name='STUDIO06_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(xyz([0,.6,0])-o.location).to_track_quat('-Z','Y').to_euler()
 for name,pos,target in [('Hero',[-8,5.2,11],[-.4,1,0]),('Helm',[-3.2,2.2,1.8],[-.68,1.15,0]),('Seating',[-3.3,2.1,1.9],[-1.7,1.05,0])]:
  bpy.ops.object.camera_add(location=xyz(pos));o=bpy.context.object;o.name='CAM_'+name;o.data.lens=58;o.rotation_euler=(xyz(target)-o.location).to_track_quat('-Z','Y').to_euler()
 sc.camera=bpy.data.objects['CAM_Hero'];sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=False;sc.view_settings.view_transform='AgX';sc.render.resolution_x=1600;sc.render.resolution_y=1000
 sc['Status']='Visual model; 300-class engine design option not qualified. 450 not installed. Hypothetical shallow variant is not a draft rating. Six top holders; GNSS housing and display artwork only.'
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(M/f'{out}.blend'))
 report.append({'native_file':out+'.blend','blender_version':bpy.app.version_string,'contact_shaded_vertices':count,'contact_shading_seconds':round(time.time()-start,1),'browser_bytes':(S/'assets'/f'{stem}.glb').stat().st_size,'exported_from_native':True,'engineering_validated':False})
(S/'bay06_native.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
