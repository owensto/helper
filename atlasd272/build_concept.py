import bpy, math, os, json
from mathutils import Vector

# ATLAS D 272 — visualization concept only, not engineering/construction data.
OUT=os.environ.get('ATLAS_OUT','/tmp/atlasd272')
os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# materials
def mat(name,color,metal=0.0,rough=.35,alpha=1):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha); m.metallic=metal; m.roughness=rough
 if alpha<1:
  if hasattr(m,'surface_render_method'): m.surface_render_method='DITHERED'
  elif hasattr(m,'blend_method'): m.blend_method='BLEND'
 return m
WHITE=mat('Warm yacht white',(0.78,.80,.79),.18,.24); DARK=mat('Submersible graphite',(.035,.055,.065),.7,.2); GLASS=mat('Dark glass',(.02,.08,.11),.35,.12,.72); TEAK=mat('Teak',(.36,.17,.07),0,.5); STEEL=mat('Steel',(.5,.56,.59),.85,.16); BLUE=mat('Ballast water',(.02,.25,.38),.2,.18,.55); PRESS=mat('Pressure hull',(.38,.43,.45),.75,.25); ENERGY=mat('Energy modules',(.12,.25,.16),.45,.3); LIFE=mat('Life support',(.38,.27,.08),.4,.3)

def add_uv(name,loc,scale,material,seg=64):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(16,seg//2), location=loc); o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);bpy.ops.object.shade_smooth();return o

def cube(name,loc,scale,material,bevel=.15):
 bpy.ops.mesh.primitive_cube_add(location=loc);o=bpy.context.object;o.name=name;o.scale=(scale[0]/2,scale[1]/2,scale[2]/2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel: mod=o.modifiers.new('Edge softness','BEVEL');mod.width=bevel;mod.segments=3
 return o

def cyl(name,loc,radius,depth,material,rot=(0,0,0),verts=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(material);bpy.ops.object.shade_smooth();return o

for n in ['OuterHull','PressureHull','Superstructure','FloodableZones','Ballast','ControlSurfaces','Propulsion','Energy','LifeSupport','Command','Habitation','MissionBay','RetractableSystems','Furniture','Lighting']:
 c=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(c)

def move(o,col):
 for c in list(o.users_collection): c.objects.unlink(o)
 bpy.data.collections[col].objects.link(o)

h=add_uv('OuterHull_Main',(0,2.1,0),(41.45,6.85,6.05),WHITE,96);move(h,'OuterHull')
band=cube('LowerHull_Fairing',(-1,-.4,0),(75,3.0,12.4),DARK,1.0);move(band,'OuterHull')
bow=add_uv('Bow_Fairing',(37.2,2.4,0),(6.0,5.8,5.6),WHITE,64);move(bow,'OuterHull')
stern=add_uv('Stern_Fairing',(-37,1.8,0),(6.2,5.9,5.8),WHITE,64);move(stern,'OuterHull')

for i,(x,y,l,w,hgt) in enumerate([(-3,8.1,55,11.4,3.5),(-5,11.2,42,9.6,3.0),(-6,14.0,30,7.8,2.6),(-7,16.3,18,6.0,1.9)]):
 o=cube(f'Superstructure_{i}',(x,y,0),(l,hgt,w),WHITE,.8);move(o,'Superstructure')
 for side in (-1,1):
  g=cube(f'Glass_{i}_{side}',(x+2,y,side*(w/2+.03)),(l*.78,hgt*.48,.12),GLASS,.08);move(g,'Superstructure')

for i,(x,y,l,w) in enumerate([(-31,6.3,15,11.2),(-27,9.7,13,9.8),(-22,13.0,11,8.2)]):
 d=cube(f'Terrace_{i}',(x,y,0),(l,.28,w),TEAK,.18);move(d,'Furniture')
pool=cube('InfinityPool',(-31.5,6.58,0),(8.5,.18,5.0),BLUE,.35);move(pool,'Furniture')
for side in (-1,1):
 s=cube(f'BowLounge_{side}',(25.5,6.8,side*2.2),(5,.6,1.3),TEAK,.3);move(s,'Furniture')

ph=cyl('PressureHull_Main',(0,2.0,0),4.25,58,PRESS,(0,math.pi/2,0),64);move(ph,'PressureHull')
for x in (-29,29):
 e=add_uv(f'PressureHull_End_{x}',(x,2.0,0),(4.3,4.3,4.3),PRESS,48);move(e,'PressureHull')
for z in (-4.7,4.7):
 u=cyl(f'UtilityPressure_{z}',(-3,.2,z),1.5,32,PRESS,(0,math.pi/2,0),48);move(u,'PressureHull')

for x in (-24,-14,-4,6,16,26):
 for z in (-5.0,5.0):
  b=cyl(f'Ballast_{x}_{z}',(x,0.0,z),1.0,7.0,BLUE,(0,math.pi/2,0),32);move(b,'Ballast')
for x in (-31,31):
 t=add_uv(f'TrimTank_{x}',(x,0,0),(2.6,1.5,2.2),BLUE,32);move(t,'Ballast')

for x in range(-18,19,6):
 for z in (-2.5,2.5):
  e=cube(f'Battery_{x}_{z}',(x,-1.6,z),(4.2,1.2,1.5),ENERGY,.18);move(e,'Energy')
for x in (-10,-5,0):
 l=cyl(f'LifeSupport_{x}',(x,3.6,2.5),.55,2.4,LIFE,(math.pi/2,0,0),32);move(l,'LifeSupport')

cmd=cube('CommandCenter',(10,3.2,0),(7,2.2,5.5),DARK,.35);move(cmd,'Command')
for i,x in enumerate((-16,-10,-4,3)):
 hab=cube(f'Habitation_{i}',(x,3.0,0),(5.0,2.0,5.7),TEAK,.3);move(hab,'Habitation')
obs=cube('OceanSalon',(-20,3.3,0),(7.5,2.2,6.4),GLASS,.45);move(obs,'Habitation')
mission=cube('MissionBay',(-27,.8,0),(8,3.0,7.5),DARK,.45);move(mission,'MissionBay')

for z in (-3.8,3.8):
 p=cyl(f'MainPropulsor_{z}',(-38,-1.2,z),1.15,3.0,DARK,(0,math.pi/2,0),48);move(p,'Propulsion')
for x in (-22,20):
 for z in (-5.6,5.6):
  t=cyl(f'ManeuverThruster_{x}_{z}',(x,-.4,z),.48,1.0,DARK,(math.pi/2,0,0),32);move(t,'Propulsion')

for side in (-1,1):
 fin=cube(f'BowPlane_{side}',(24,0,side*7.0),(4.8,.35,2.5),DARK,.15);move(fin,'ControlSurfaces')
 fin['surface_location']=(24,0,side*6.1);fin['dive_location']=(24,0,side*7.0)
for side in (-1,1):
 fin=cube(f'SternPlane_{side}',(-34,-.3,side*7.0),(5.5,.38,2.8),DARK,.15);move(fin,'ControlSurfaces')

mast=cyl('RetractableMast',(-4,19.3,0),.42,5.2,DARK,(0,0,0),32);move(mast,'RetractableSystems');mast['surface_y']=19.3;mast['dive_y']=16.9
rad=cube('Radar',(-4,21.8,0),(6,.25,.7),WHITE,.12);move(rad,'RetractableSystems');rad['surface_y']=21.8;rad['dive_y']=17.2
for z in (-1.5,1.5):
 dome=add_uv(f'SatDome_{z}',(-1.5,20.6,z),(.75,.75,.75),WHITE,32);move(dome,'RetractableSystems');dome['surface_y']=20.6;dome['dive_y']=17.0

scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=240
for o in bpy.data.collections['RetractableSystems'].objects:
 sy=o.get('surface_y',o.location.y);dy=o.get('dive_y',sy-3)
 o.location.y=sy;o.keyframe_insert('location',frame=1);o.keyframe_insert('location',frame=60)
 o.location.y=dy;o.keyframe_insert('location',frame=110);o.keyframe_insert('location',frame=240)
for o in bpy.data.collections['ControlSurfaces'].objects:
 o.scale=(.25,.25,.25);o.keyframe_insert('scale',frame=1);o.keyframe_insert('scale',frame=65)
 o.scale=(1,1,1);o.keyframe_insert('scale',frame=120);o.keyframe_insert('scale',frame=240)

bpy.ops.object.empty_add(type='PLAIN_AXES',location=(0,0,0));root=bpy.context.object;root.name='ATLAS_D_ROOT'
for colname in [c.name for c in bpy.data.collections if c.name!='Collection']:
 for o in bpy.data.collections[colname].objects:
  if o!=root and o.parent is None:o.parent=root
root.location.y=0;root.keyframe_insert('location',frame=1);root.keyframe_insert('location',frame=120);root.location.y=-14;root.keyframe_insert('location',frame=210);root.keyframe_insert('location',frame=240)

for name,loc in [('SurfaceHero',(105,55,100)),('Profile',(0,35,135)),('Aft',(-95,35,60)),('Bow',(100,32,48)),('Submerged',(92,10,90)),('XRay',(65,30,75))]:
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name='CAM_'+name
 target=Vector((0,5,0));direction=target-c.location;c.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.color=(.035,.07,.09)
bpy.ops.object.light_add(type='SUN',location=(0,50,50));sun=bpy.context.object;sun.data.energy=3.0;sun.rotation_euler=(math.radians(35),0,math.radians(-35))
bpy.ops.object.light_add(type='AREA',location=(0,45,30));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=45

scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=60
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=90
scene.camera=bpy.data.objects['CAM_SurfaceHero'];scene.render.filepath=os.path.join(OUT,'surface.jpg');bpy.ops.render.render(write_still=True)
scene.frame_set(220);scene.camera=bpy.data.objects['CAM_Submerged'];scene.render.filepath=os.path.join(OUT,'submerged.jpg');bpy.ops.render.render(write_still=True)
scene.frame_set(1)
blend=os.path.join(OUT,'ATLAS_D_272_Master.blend');bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ATLAS_D_272.glb'),export_format='GLB',export_animations=True,export_apply=True)
report={'name':'ATLAS D 272','loa_m':82.9,'loa_ft':272,'beam_m':14.2,'objects':len(bpy.data.objects),'scope':'dual-domain visualization concept','warning':'Not engineering or construction data'}
open(os.path.join(OUT,'model_report.json'),'w').write(json.dumps(report,indent=2))
print(json.dumps(report))