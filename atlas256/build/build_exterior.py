"""ATLAS 256 exterior, revision 02. Blender 3.6+ / 4.x.
Run: blender -b -t 4 --python build_exterior.py -- --out /path/to/output
Real editable geometry; visualization only, not naval architecture.
Axes: X forward, Y port, Z up; metres. Aft platform=-39.1, bow=39.1.
"""
import bpy, bmesh, math, os, sys, json, argparse, random, time
import numpy as np
from mathutils import Vector, Matrix
from collections import defaultdict
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('--out',default='atlas-output')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
random.seed(256);START=time.time()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
ROOT=bpy.data.collections.new('ATLAS_256_EXTERIOR');scene.collection.children.link(ROOT)
NAMES=['Hull','Superstructure','Glazing','Decks','Stern','BeachClub','Foredeck','Railings','MooringHardware','Furniture','RunningGear','MastElectronics','ExteriorFixtures','ScaleFigures']
C={}
for n in NAMES:
 c=bpy.data.collections.new(n);ROOT.children.link(c);C[n]=c
STAGE=bpy.data.collections.new('Presentation_Stage');scene.collection.children.link(STAGE)

# Materials: one coherent PBR library, with packed original deck texture.
def material(name,color,rough=.4,metal=0,alpha=1,transmission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,alpha)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,alpha);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if 'Transmission Weight' in bs.inputs:bs.inputs['Transmission Weight'].default_value=transmission
 elif 'Transmission' in bs.inputs:bs.inputs['Transmission'].default_value=transmission
 if alpha<1:
  bs.inputs['Alpha'].default_value=alpha
  if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
  elif hasattr(m,'blend_method'):m.blend_method='HASHED'
 return m
PAINT=material('Warm ceramic white paint',(.80,.83,.81),.23,.06)
PEARL=material('Pearl accent',(.51,.56,.57),.29,.14)
GLASS=material('Blue black architectural glazing',(.008,.022,.031),.11,.26,1,.06)
GUARD=material('Clear blue balustrade glass',(.31,.50,.56),.12,.08,.27,.12)
DARK=material('Satin graphite',(.014,.020,.024),.32,.35)
RUBBER=material('Rubber and caulking',(.009,.012,.013),.77)
STEEL=material('Brushed stainless steel',(.52,.59,.63),.21,1)
BRONZE=material('Propeller bronze',(.37,.21,.08),.25,.85)
CUSH=material('Oatmeal woven upholstery',(.65,.61,.51),.84)
WHITEFAB=material('Ivory piping and towels',(.86,.82,.70),.9)
NAVY=material('Navy cushions',(.018,.047,.073),.88)
WATER=material('Pool turquoise water',(.019,.29,.37),.13,.13,.88,.13)
TILE=material('Pool pale mosaic',(.23,.56,.59),.3)
LIGHT=material('Warm fixture lenses',(.91,.71,.39),.3)
RED=material('Port red lens',(.55,.006,.004),.2)
GREEN=material('Starboard green lens',(.006,.38,.05),.2)
SKIN=material('Scale figure skin',(.46,.29,.17),.85)
CLOTH=material('Crew navy clothing',(.025,.061,.079),.85)
# Actual packed image, no external textures required at view time.
rng=np.random.default_rng(256);w,h=1024,256
xx,yy=np.meshgrid(np.arange(w)/w,np.arange(h)/h)
grain=.025*np.sin(yy*950+3*np.sin(xx*13))+.014*np.sin(yy*2200+np.sin(xx*31))+.012*rng.normal(size=(h,w))
base=np.stack([.55+grain,.36+grain*.8,.18+grain*.5,np.ones((h,w))],axis=-1).astype(np.float32)
img=bpy.data.images.new('ATLAS original teak grain',width=w,height=h,alpha=True);img.pixels.foreach_set(np.clip(base,0,1).reshape(-1));img.filepath_raw=str(OUT/'teak_grain.png');img.file_format='PNG';img.save();img.pack()
TEAK=[]
for i in range(5):
 m=material('Teak tone %02d'%i,(.32,.17,.075),.65)
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;tex.extension='REPEAT'
 m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 TEAK.append(m)

# Data-oriented helpers avoid operator overhead for thousands of actual fittings.
def objmesh(name,verts,faces,mat=PAINT,col='Hull',smooth=False):
 me=bpy.data.meshes.new(name+'_mesh');me.from_pydata(verts,[],faces);me.update()
 if len(faces):
  bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 ob=bpy.data.objects.new(name,me);(C[col] if isinstance(col,str) else col).objects.link(ob)
 if mat:me.materials.append(mat)
 for p in me.polygons:p.use_smooth=smooth
 return ob

def bevel(ob,width=.04,segments=3):
 mod=ob.modifiers.new('Machined edge radii','BEVEL');mod.width=width;mod.segments=segments
 mod.limit_method='ANGLE'
 if hasattr(mod,'harden_normals'):mod.harden_normals=True
 return ob

def box(name,loc,size,mat=PAINT,col='ExteriorFixtures',r=.035,rot=None):
 x,y,z=[v/2 for v in size]
 vs=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
 fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 ob=objmesh(name,vs,fs,mat,col);ob.location=loc
 if rot:ob.rotation_euler=rot
 if r:bevel(ob,min(r,min(size)*.42),4)
 return ob

def cylinder(name,a,b,r,mat=STEEL,col='ExteriorFixtures',n=20,r2=None):
 a,b=Vector(a),Vector(b);length=(b-a).length;r2=r if r2 is None else r2
 v=[]
 for z,rr in [(-length/2,r),(length/2,r2)]:
  v.extend([(rr*math.cos(i*2*math.pi/n),rr*math.sin(i*2*math.pi/n),z) for i in range(n)])
 f=[tuple(reversed(range(n))),tuple(range(n,2*n))]
 f.extend([(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
 ob=objmesh(name,v,f,mat,col,True);ob.location=(a+b)/2;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob

def tube(name,pts,r=.03,mat=STEEL,col='Railings',cyclic=False):
 cu=bpy.data.curves.new(name+'_curve','CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=r;cu.bevel_resolution=3;cu.use_fill_caps=True
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 sp.use_cyclic_u=cyclic
 ob=bpy.data.objects.new(name,cu);C[col].objects.link(ob);cu.materials.append(mat);return ob

def torus(name,loc,major,minor,mat=STEEL,col='ExteriorFixtures',axis=(0,0,1),seg=40):
 v=[];f=[];n=12
 for i in range(seg):
  a=i*2*math.pi/seg
  for j in range(n):
   b=j*2*math.pi/n;v.append(((major+minor*math.cos(b))*math.cos(a),(major+minor*math.cos(b))*math.sin(a),minor*math.sin(b)))
 for i in range(seg):
  for j in range(n):f.append((i*n+j,((i+1)%seg)*n+j,((i+1)%seg)*n+(j+1)%n,i*n+(j+1)%n))
 ob=objmesh(name,v,f,mat,col,True);ob.location=loc;ob.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();return ob

def ellipsoid(name,loc,scale,mat=PAINT,col='ExteriorFixtures',n=28):
 bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=n,v_segments=n//2,radius=1)
 me=bpy.data.meshes.new(name+'_mesh');bm.to_mesh(me);bm.free();ob=bpy.data.objects.new(name,me);C[col].objects.link(ob);ob.location=loc;ob.scale=scale;me.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 return ob

def chaikin(poly,steps=2):
 for _ in range(steps):
  q=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):q.extend([(.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]),(.25*a[0]+.75*b[0],.25*a[1]+.75*b[1])])
  poly=q
 return poly

def footprint(a,b,w,fw=None):
 fw=fw or w*.5
 return chaikin([(a,-w*.72),(a+.8,-w),(b-6,-w*.96),(b-2.0,-fw),(b,-fw*.32),(b+.15,0),(b,fw*.32),(b-2,fw),(b-6,w*.96),(a+.8,w),(a,w*.72)],2)

def slab(name,poly,z0,z1,mat=PAINT,col='Decks',r=.04):
 n=len(poly);v=[(x,y,z) for z in (z0,z1) for x,y in poly]
 fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 ob=objmesh(name,v,fs,mat,col)
 if r:bevel(ob,r,3)
 return ob

def ringwall(name,p0,p1,z0,z1,mat,col='Superstructure'):
 n=len(p0);vs=[(x,y,z0) for x,y in p0]+[(x,y,z1) for x,y in p1]
 return objmesh(name,vs,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,col,True)

def scaled(poly,f,dx=0):
 cx=sum(p[0] for p in poly)/len(poly);cy=sum(p[1] for p in poly)/len(poly)
 return [(cx+(x-cx)*f+dx,cy+(y-cy)*f) for x,y in poly]

def boolean_cut(ob,name,loc,size=None,radius=None,axis='Y'):
 if radius is None:cut=box(name,loc,size,mat=None,col='Hull',r=0)
 else:
  d=Vector((0,10,0)) if axis=='Y' else Vector((10,0,0));cut=cylinder(name,Vector(loc)-d,Vector(loc)+d,radius,None,'Hull',48)
 mod=ob.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
 if hasattr(mod,'solver'):mod.solver='EXACT'
 cut.hide_render=True;cut.hide_set(True);cut.display_type='WIRE';cut['construction_cutter']=True
 return cut

# Hull: smooth stations, a real flat deck edge, flared topsides and rounded bilge.
S=[(-35.35,5.03,5.55,-2.65),(-34.8,5.62,5.56,-3.0),(-32,6.1,5.58,-3.45),(-27,6.35,5.61,-3.65),(-20,6.45,5.64,-3.72),(-10,6.45,5.67,-3.75),(0,6.38,5.71,-3.75),(10,6.14,5.77,-3.66),(20,5.65,5.91,-3.4),(28,4.85,6.14,-2.94),(34,3.58,6.40,-2.05),(37,2.1,6.61,-.65),(38.5,.84,6.76,1.32),(39.1,.025,6.85,4.6)]
# Cross section runs from port deck edge around keel to starboard deck edge.
def section(w,deck,keel):
 star=[(0,deck),(.55*w,deck),(.96*w,deck),(w,deck-.15),(w*.998,deck-.65),(.992*w,2.6),(.965*w,1.0),(.88*w,-.35),(.66*w,keel+.58),(.32*w,keel+.10),(0,keel)]
 # At the fine bow, preserve a monotonic vertical envelope.
 star=[(y,max(keel,min(deck,z))) for y,z in star]
 return star+ [(-y,z) for y,z in star[-2:0:-1]]
verts=[];rows=[]
for i in range(len(S)-1):
 for j in range(5):
  t=j/5;u=t*t*(3-2*t);a,b=S[i],S[i+1];x=a[0]+t*(b[0]-a[0]);w=a[1]+u*(b[1]-a[1]);deck=a[2]+u*(b[2]-a[2]);keel=a[3]+u*(b[3]-a[3]);row=[]
  for y,z in section(w,deck,keel):row.append(len(verts));verts.append((x,y,z))
  rows.append(row)
x,w,d,k=S[-1];row=[]
for y,z in section(w,d,k):row.append(len(verts));verts.append((x,y,z))
rows.append(row);n=len(row);faces=[]
for a,b in zip(rows,rows[1:]):
 for j in range(n):faces.append((a[j],a[(j+1)%n],b[(j+1)%n],b[j]))
faces += [tuple(reversed(rows[0])),tuple(rows[-1])]
hull=objmesh('Hull_Main_Closed_Displacement',verts,faces,PAINT,'Hull',True)
sub=hull.modifiers.new('Controlled hull fairing','SUBSURF');sub.levels=2;sub.render_levels=2
boolean_cut(hull,'Beach club architectural recess',(-35.1,0,2.7),(6.1,8.5,3.3))
boolean_cut(hull,'Pool cavity',(-29.4,0,5.8),(8.4,4.45,2.65))
boolean_cut(hull,'Bow thruster tunnel',(29.4,0,-.62),radius=.57)
# Explicit bow stem retains the 78.2 metre extremity after hull fairing.
stem=objmesh('Stem_End',[(39.1,0,4.55),(39.1,-.018,6.83),(39.1,.018,6.83),(39.07,0,5.7)],[(0,1,3),(1,2,3),(2,0,3),(0,2,1)],PAINT,'Hull',True)
# Flush waterline and upper hull lines, not a block passing through the hull.
for side in [-1,1]:
 tube('Waterline_bootstripe_'+str(side),[(x,side*w*.933,.12) for x,w,d,k in S if x<37],.045,DARK,'Hull')
 tube('Sheer_highlight_'+str(side),[(x,side*w*.996,d-.12) for x,w,d,k in S[:-1]],.035,PEARL,'Hull')

def width_at(x,z):
 idx=min(len(S)-2,max(0,next((i for i in range(len(S)-1) if S[i][0]<=x<=S[i+1][0]),len(S)-2)))
 a,b=S[idx],S[idx+1];t=max(0,min(1,(x-a[0])/(b[0]-a[0])));w=a[1]*(1-t)+b[1]*t
 return w*(.992 if z>2.6 else .965 if z>1 else .92)

# Teak deck surfaces: clipped physical boards and real 4 mm caulking gaps.
def inside(p,poly):
 x,y=p;flag=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:flag=not flag
 return flag

def clip(subject,clipper):
 area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(clipper,clipper[1:]+clipper[:1]));sgn=1 if area>0 else -1
 out=subject
 for a,b in zip(clipper,clipper[1:]+clipper[:1]):
  inp=out;out=[]
  if not inp:break
  def side(p):return sgn*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))
  prev=inp[-1];sp=side(prev)
  for cur in inp:
   sc=side(cur)
   if (sc>=0)!=(sp>=0):
    t=sp/(sp-sc);out.append((prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])))
   if sc>=0:out.append(cur)
   prev=cur;sp=sc
 return out

def deck(name,poly,z,exclude=None):
 base=slab(name+'_Structural_edge',poly,z-.23,z,PAINT,'Decks',.07)
 caulk=slab(name+'_Caulking_bed',scaled(poly,.994),z+.009,z+.024,RUBBER,'Decks',0)
 vs=[];fs=[];mi=[];count=0
 xmin,xmax=min(p[0] for p in poly),max(p[0] for p in poly);ymin,ymax=min(p[1] for p in poly),max(p[1] for p in poly)
 for row,y in enumerate(np.arange(ymin,ymax,.135)):
  offset=(row%4)*.79
  for x in np.arange(xmin-3.2+offset,xmax,3.2):
   center=(x+1.6,y+.065)
   if exclude and any(inside(center,e) for e in exclude):continue
   p=clip([(x+.004,y+.004),(x+3.195,y+.004),(x+3.195,y+.13),(x+.004,y+.13)],poly)
   if len(p)<3:continue
   start=len(vs);nn=len(p);vs += [(xx,yy,z+.03) for xx,yy in p]+[(xx,yy,z+.046) for xx,yy in p]
   fs += [tuple(start+nn+i for i in range(nn))];mi.append(row%5)
   for j in range(nn):fs.append((start+j,start+(j+1)%nn,start+nn+(j+1)%nn,start+nn+j));mi.append(row%5)
   count+=1
 ob=objmesh(name+'_Individual_teak_planks',vs,fs,None,'Decks')
 for m in TEAK:ob.data.materials.append(m)
 for p,idx in zip(ob.data.polygons,mi):p.material_index=idx
 uv=ob.data.uv_layers.new(name='Teak_grain_world_UV')
 for p in ob.data.polygons:
  for li in p.loop_indices:
   v=ob.data.vertices[ob.data.loops[li].vertex_index].co;uv.data[li].uv=(v.x/3.2,v.y/.135)
 ob['individual_plank_count']=count
 tube(name+'_Margin_board',[(x,y,z+.048) for x,y in scaled(poly,.989)],.042,TEAK[0],'Decks',True)
 return base,caulk

mainfoot=footprint(-23.3,26,5.24,2.5)
upperfoot=footprint(-15.3,19.1,4.48,2.35)
bridgefoot=footprint(-7.7,12.4,3.66,2.15)
skyfoot=footprint(-3.3,6.4,2.75,1.7)
mainpoly=chaikin([(-35,-4.75),(-33,-6.04),(-20,-6.24),(8,-5.96),(23,-5.05),(29,-3.9),(29,3.9),(23,5.05),(8,5.96),(-20,6.24),(-33,6.04),(-35,4.75)],1)
poolhole=[(-33.7,-2.3),(-25.1,-2.3),(-25.1,2.3),(-33.7,2.3)]
base,caulk=deck('Main_deck',mainpoly,5.73,[mainfoot,poolhole]);boolean_cut(base,'Deck pool opening',(-29.4,0,5.7),(8.5,4.5,2));boolean_cut(caulk,'Teak pool opening',(-29.4,0,5.7),(8.5,4.5,2))
upperpoly=footprint(-28.0,26.2,5.01,2.6);deck('Upper_deck',upperpoly,9.48,[upperfoot])
bridgepoly=footprint(-20.4,19.3,4.26,2.6);deck('Bridge_deck',bridgepoly,13.08,[bridgefoot])
sunpoly=footprint(-12.9,12.2,3.65,2.3);deck('Sun_deck',sunpoly,16.31,[skyfoot])
forepoly=chaikin([(27,-3.55),(31.7,-3.1),(35.8,-1.9),(37.1,-.78),(37.1,.78),(35.8,1.9),(31.7,3.1),(27,3.55)],1);deck('Foredeck',forepoly,6.40)
# Aft extremity is exactly -39.1; platforms are included in LOA.
beachpoly=[(-39.1,-3.55),(-38.75,-4.45),(-36.6,-4.82),(-32.3,-4.50),(-32.3,4.50),(-36.6,4.82),(-38.75,4.45),(-39.1,3.55)]
deck('Beach_club_platform',beachpoly,1.20)

# Real deckhouses: lower panels, recessed glass band, swept top framing and roof edges.
def house(name,poly,z0,zroof):
 pbase=scaled(poly,1);pglass=scaled(poly,.986);ptop=scaled(poly,.966,-.26)
 slab(name+'_Lower_solid_wall',pbase,z0,z0+.48,PAINT,'Superstructure',.07)
 ringwall(name+'_Recessed_glazing',pglass,ptop,z0+.49,zroof-.38,GLASS,'Glazing')
 slab(name+'_Upper_solid_band',ptop,zroof-.37,zroof-.08,PAINT,'Superstructure',.075)
 slab(name+'_Roof_shadow_gap',scaled(poly,1.07,-.1),zroof-.11,zroof-.035,DARK,'Superstructure',.05)
 slab(name+'_Sculpted_roof',scaled(poly,1.075,-.1),zroof-.03,zroof+.18,PAINT,'Superstructure',.085)
 # Frames trace the actual glass surface and include individual mullions.
 tube(name+'_Lower_glass_rebate',[(x,y,z0+.5) for x,y in pglass],.033,DARK,'Glazing',True)
 tube(name+'_Upper_glass_rebate',[(x,y,zroof-.39) for x,y in ptop],.032,DARK,'Glazing',True)
 for i in range(0,len(poly),3):
  a=pglass[i];b=ptop[i];tube(name+'_Mullion_%02d'%i,[(a[0],a[1],z0+.49),(b[0],b[1],zroof-.38)],.045,DARK,'Glazing')
 # Aft sliding-door thresholds and hardware.
 aft=min(x for x,y in pbase)
 for side in [-1,1]:
  box(name+'_Aft_slider_handle_'+str(side),(aft-.018,side*.55,z0+1.35),(.06,.04,.48),STEEL,'Glazing',.019)
  box(name+'_Aft_slider_track_'+str(side),(aft-.05,side*1.2,z0+.06),(.11,2.25,.035),STEEL,'Glazing',.01)
 # Visible aft salon furnishings through the same architectural envelope.
 box(name+'_Inner_warm_floor',(aft+2,0,z0+.07),(3.3,4,.09),TEAK[1],'Superstructure',.04)
 for yy in [-1.2,1.2]:box(name+'_Inner_seating',(aft+1.35,yy,z0+.58),(1.55,.75,.62),CUSH,'Furniture',.17)
 return aft
house('Main_salon',mainfoot,5.80,9.23)
house('Upper_owner_lounge',upperfoot,9.55,12.83)
house('Bridge_wheelhouse',bridgefoot,13.15,16.07)
house('Sundeck_pavilion',skyfoot,16.38,18.83)
# Bridge windshield wipers and an interior helm visible at close range.
for side in [-1,1]:
 tube('Bridge_wiper_'+str(side),[(11.17,side*.75,14.0),(11.15,side*.85,15.28)],.023,DARK,'Glazing')
 box('Bridge_helm_console_'+str(side),(9,side*1.05,14.10),(1.0,1.35,.7),DARK,'Superstructure',.12)
 box('Bridge_chart_screen_'+str(side),(9.22,side*1.05,14.52),(.48,.60,.04),GLASS,'Superstructure',.03,rot=(0,.25,0))

# Pool: actual cavity, mosaic floor, coping, glass infinity end, drains, lights and access steps.
poolpoly=chaikin([(-33.5,-2.1),(-25.4,-2.1),(-25.25,-1.9),(-25.25,1.9),(-25.4,2.1),(-33.5,2.1)],2)
slab('Infinity_pool_basin_floor',poolpoly,4.53,4.68,TILE,'Stern',.06)
for y in [-2.14,2.14]:box('Pool_side_wall_'+str(y),(-29.35,y,5.19),(8.25,.20,1.24),TILE,'Stern',.06)
box('Pool_forward_wall',(-25.23,0,5.17),(.22,4.35,1.30),TILE,'Stern',.05)
box('Infinity_glass_end',(-33.53,0,5.13),(.06,4.22,1.16),GUARD,'Stern',.02)
slab('Infinity_pool_water',scaled(poolpoly,.985),5.64,5.68,WATER,'Stern',.018)
for y in [-2.30,2.30]:box('Pool_coping_'+str(y),(-29.36,y,5.81),(8.42,.26,.19),PAINT,'Stern',.07)
box('Infinity_overflow_channel',(-33.70,0,5.49),(.25,4.50,.10),DARK,'Stern',.04)
for i in range(3):box('Pool_entry_step_%d'%i,(-25.55-i*.31,0,5.35-i*.23),(.35,1.75,.16),TILE,'Stern',.04)
for x in [-31.7,-28.7,-26.3]:
 for side in [-1,1]:cylinder('Pool_underwater_lamp',(x,side*2.026,5.1),(x,side*2.05,5.1),.075,LIGHT,'Stern',20)
# Mosaic grid is genuine geometry grouped into a single mesh.
vs=[];fs=[]
for x in np.arange(-33.2,-25.55,.20):
 for y in np.arange(-1.94,1.94,.20):
  st=len(vs);vs.extend([(x,y,4.689),(x+.187,y,4.689),(x+.187,y+.187,4.689),(x,y+.187,4.689)]);fs.append((st,st+1,st+2,st+3))
objmesh('Pool_individual_mosaic_tiles',vs,fs,PAINT,'Stern')
# Spa includes shell, rim, water, seating and jets.
cylinder('Spa_shell',(-7,0,16.35),(-7,0,16.98),1.92,PAINT,'Stern',64)
torus('Spa_polished_rim',(-7,0,16.98),1.78,.10,STEEL,'Stern')
cylinder('Spa_water',(-7,0,16.96),(-7,0,16.985),1.69,WATER,'Stern',64)
for i in range(10):
 a=i*math.tau/10;ellipsoid('Spa_jet_%02d'%i,(-7+1.67*math.cos(a),1.67*math.sin(a),16.88),(.047,.047,.047),STEEL,'Stern',16)

# Cascading circulation with individually modeled risers, teak treads and handrails.
def stairs(name,a,b,width,col='Stern'):
 a,b=Vector(a),Vector(b);rise=b.z-a.z;steps=max(2,round(abs(rise)/.185));run=(Vector((b.x,b.y,0))-Vector((a.x,a.y,0)));length=run.length;direction=run.normalized();across=Vector((-direction.y,direction.x,0));yaw=math.atan2(direction.y,direction.x)
 for i in range(steps):
  t=(i+.5)/steps;p=a.lerp(b,t)
  box(name+'_Riser_%02d'%i,p,(length/steps+.04,width,.18),PAINT,col,.025,rot=(0,0,yaw))
  box(name+'_Teak_tread_%02d'%i,p+Vector((0,0,.102)),(length/steps+.04,width-.06,.032),TEAK[0],col,.009,rot=(0,0,yaw))
  box(name+'_Nosing_%02d'%i,p+direction*length/steps*.42+Vector((0,0,.124)),(.025,width-.05,.026),STEEL,col,.006,rot=(0,0,yaw))
 for side in [-1,1]:
  p=a+across*width*.49*side;q=b+across*width*.49*side;tube(name+'_Handrail_'+str(side),[tuple(p+Vector((0,0,1.08))),tuple(q+Vector((0,0,1.08)))],.035,STEEL,'Railings')
  for t in np.linspace(0,1,4):
   pt=p.lerp(q,float(t));cylinder(name+'_Stanchion',pt,pt+Vector((0,0,1.08)),.028,STEEL,'Railings',12)
for side in [-1,1]:
 stairs('Beach_to_pool_'+str(side),(-38.1,side*3.73,1.20),(-33.55,side*4.65,5.76),1.20)
 stairs('Main_to_upper_'+str(side),(-30.4,side*4.97,5.77),(-25.1,side*4.68,9.5),.96)
 stairs('Upper_to_bridge_'+str(side),(-22,side*3.75,9.5),(-17.1,side*3.87,13.10),.91)
# Beach club architecture visible through the true hull recess.
box('Beach_club_rear_glazing',(-32.10,0,2.91),(.06,7.80,2.95),GLASS,'BeachClub',.04)
box('Beach_club_ceiling',(-33.7,0,4.40),(3.3,8.1,.14),PAINT,'BeachClub',.055)
for y in np.linspace(-3.5,3.5,6):box('Beach_club_vertical_frame',(-32.14,y,2.9),(.09,.065,2.88),DARK,'BeachClub',.02)
for side in [-1,1]:box('Beach_club_side_seat_'+str(side),(-34.3,side*3.2,1.75),(2.3,.78,.70),CUSH,'BeachClub',.15)
box('Beach_club_low_table',(-34.5,0,1.63),(1.4,.9,.11),TEAK[0],'BeachClub',.05)

# Rails are clear glass, clamps and proper handrails at human height.
def railing(name,path,z,glass=True):
 pts=[Vector((x,y,z)) for x,y in path];top=[tuple(p+Vector((0,0,1.05))) for p in pts];tube(name+'_Continuous_top',top,.033,STEEL,'Railings')
 for k,(a,b) in enumerate(zip(pts,pts[1:])):
  n=max(1,math.ceil((b-a).length/1.5))
  for j in range(n):
   p=a.lerp(b,j/n);q=a.lerp(b,(j+1)/n);d=(q-p).normalized();p2=p+d*.06;q2=q-d*.06
   cylinder(name+'_Post_%d_%d'%(k,j),p,p+Vector((0,0,1.04)),.026,STEEL,'Railings',14)
   cylinder(name+'_Post_foot',p-Vector((0,0,.008)),p+Vector((0,0,.035)),.065,STEEL,'Railings',16)
   if glass:
    v=[tuple(p2+Vector((0,0,.16))),tuple(q2+Vector((0,0,.16))),tuple(q2+Vector((0,0,.95))),tuple(p2+Vector((0,0,.95)))];ob=objmesh(name+'_Glass_%d_%d'%(k,j),v,[(0,1,2,3)],GUARD,'Railings');sol=ob.modifiers.new('Tempered glass thickness','SOLIDIFY');sol.thickness=.012
   for dz in [.25,.83]:ellipsoid(name+'_Glass_clamp',tuple(p+Vector((0,0,dz))),(.044,.025,.033),STEEL,'Railings',12)
for name,z,a,b,w in [('Main',5.78,-33.5,-24,5.8),('Upper',9.53,-27,-16,4.62),('Bridge',13.13,-19.4,-8.2,3.88),('Sun',16.36,-12,-3.6,3.25)]:
 for side in [-1,1]:railing(name+'_'+str(side),[(a+.7,side*w),(a,side*w*.76),(a,0),(a,-side*w*.76),(a+.7,-side*w),(b,-side*w)],z)
# Clean working bow rails, without a helipad symbol.
for side in [-1,1]:railing('Foredeck_'+str(side),[(28,side*4.35),(31.5,side*3.75),(34.5,side*2.8),(36.8,side*1.65),(38.25,side*.53)],6.46,False)

# Furniture is reusable, multi-part geometry rather than one box per item.
def chaise(name,loc,yaw=0):
 x,y,z=loc;objects=[]
 objects.append(box(name+'_Frame',(0,0,.29),(2.03,.78,.085),DARK,'Furniture',.025))
 objects.append(box(name+'_Seat_pad',(.36,0,.42),(1.25,.72,.19),CUSH,'Furniture',.085))
 objects.append(box(name+'_Raised_back',(-.60,0,.69),(.90,.72,.17),CUSH,'Furniture',.075,rot=(0,.49,0)))
 objects.append(box(name+'_Folded_towel',(.67,0,.55),(.40,.58,.035),WHITEFAB,'Furniture',.014))
 for xx in [-.72,.74]:
  for yy in [-.29,.29]:objects.append(cylinder(name+'_Leg',(xx,yy,.04),(xx,yy,.31),.028,STEEL,'Furniture',16))
 R=Matrix.Rotation(yaw,4,'Z');T=Matrix.Translation(Vector(loc))
 for ob in objects:ob.matrix_world=T@R@ob.matrix_world

def sofa(name,loc,length=2.7,yaw=0):
 parts=[];parts.append(box(name+'_Timber_base',(0,0,.24),(length,.89,.13),TEAK[0],'Furniture',.07))
 for i in range(3):
  xx=-length/2+(i+.5)*length/3
  parts.append(box(name+'_Seat_%d'%i,(xx,-.06,.47),(length/3-.045,.74,.28),CUSH,'Furniture',.11))
  parts.append(box(name+'_Back_%d'%i,(xx,.32,.83),(length/3-.025,.24,.65),CUSH,'Furniture',.105,rot=(-.12,0,0)))
 for xx in [-length/2+.04,length/2-.04]:parts.append(box(name+'_Arm',(xx,0,.65),(.20,.9,.53),CUSH,'Furniture',.095))
 for xx in [-length/2+.3,length/2-.3]:
  for yy in [-.3,.3]:parts.append(cylinder(name+'_Foot',(xx,yy,.025),(xx,yy,.24),.038,DARK,'Furniture',16))
 parts.append(box(name+'_Navy_pillow',(-length*.30,.13,.98),(.39,.17,.37),NAVY,'Furniture',.077,rot=(-.1,.05,.12)))
 R=Matrix.Rotation(yaw,4,'Z');T=Matrix.Translation(Vector(loc))
 for ob in parts:ob.matrix_world=T@R@ob.matrix_world

def chair(name,loc,yaw=0):
 parts=[box(name+'_Seat',(0,0,.48),(.55,.53,.13),CUSH,'Furniture',.075),box(name+'_Back',(0,.22,.84),(.55,.11,.57),CUSH,'Furniture',.055,rot=(-.13,0,0))]
 for xx in [-.23,.23]:
  for yy in [-.22,.20]:parts.append(cylinder(name+'_Leg',(xx,yy,.025),(xx*.84,yy,.46),.025,STEEL,'Furniture',16))
 for xx in [-.28,.28]:parts.append(tube(name+'_Arm',[(xx,-.20,.66),(xx,.20,.66),(xx,.23,.80)],.026,STEEL,'Furniture'))
 R=Matrix.Rotation(yaw,4,'Z');T=Matrix.Translation(Vector(loc))
 for ob in parts:ob.matrix_world=T@R@ob.matrix_world

def table(name,loc,length=1.2,width=.75,height=.56):
 x,y,z=loc;box(name+'_Top',(x,y,z+height),(length,width,.09),TEAK[0],'Furniture',.07)
 for xx in [-length*.3,length*.3]:
  for yy in [-width*.3,width*.3]:cylinder(name+'_Leg',(x+xx,y+yy,z+.035),(x+xx,y+yy,z+height-.05),.029,STEEL,'Furniture',16)
for side in [-1,1]:
 chaise('Pool_lounger_'+str(side),(-27.15,side*3.28,5.80),math.pi/2)
 chaise('Upper_lounger_'+str(side),(-25.9,side*1.42,9.55),0)
 chaise('Bridge_lounger_'+str(side),(-18.1,side*1.5,13.15),0)
 sofa('Foredeck_sofa_'+str(side),(29.1,side*2.04,6.47),2.9,0 if side<0 else math.pi)
 sofa('Owner_terrace_sofa_'+str(side),(21.8,side*2.6,9.55),2.5,0 if side<0 else math.pi)
for y in [-1.0,1.0]:chaise('Foredeck_sunbed_'+str(y),(31.1,y,6.47),0)
table('Foredeck_coffee_table',(28.8,0,6.46),1.45,1.1,.48)
sofa('Upper_aft_conversation',(-22,0,9.55),3.1,math.pi/2);table('Upper_coffee_table',(-23.2,0,9.55),1.2,.8,.48)
# A proper dining setting on the bridge terrace.
table('Bridge_dining',(-12.2,0,13.15),2.9,1.15,.76)
for side in [-1,1]:
 for i in range(3):chair('Dining_chair_%d_%d'%(side,i),(-13.2+i*.98,side*1.03,13.15),0 if side>0 else math.pi)
chair('Dining_head_a',(-14.10,0,13.15),math.pi/2);chair('Dining_head_b',(-10.3,0,13.15),-math.pi/2)
# Cups, plates and tableware visible in a close-up.
for i in range(3):
 for side in [-1,1]:
  x=-13.2+i*.98;y=side*.34;cylinder('Dining_plate',(x,y,13.952),(x,y,13.974),.145,WHITEFAB,'Furniture',32);cylinder('Dining_cup',(x+.28,y,13.95),(x+.28,y,14.06),.04,WHITEFAB,'Furniture',20)
# Sundeck bar with cabinetry, top, stools and hardware.
box('Sun_bar_cabinet',(1.2,-2.35,16.88),(3.1,.67,1.08),PAINT,'Furniture',.12)
box('Sun_bar_counter',(1.2,-2.35,17.48),(3.40,.91,.12),DARK,'Furniture',.07)
for i in range(4):
 x=.1+i*.72;box('Bar_cabinet_door',(x,-2.706,16.91),(.63,.024,.82),TEAK[0],'Furniture',.015);cylinder('Bar_stool_pedestal',(x,-1.41,16.35),(x,-1.41,17.06),.056,STEEL,'Furniture',20);cylinder('Bar_stool_base',(x,-1.41,16.35),(x,-1.41,16.40),.24,STEEL,'Furniture',28);cylinder('Bar_stool_seat',(x,-1.41,17.05),(x,-1.41,17.20),.25,CUSH,'Furniture',32);torus('Bar_stool_footrest',(x,-1.41,16.67),.17,.017,STEEL,'Furniture',seg=28)

# Anchoring and mooring: actual chain, flukes, fairleads, windlasses and cleats.
for side in [-1,1]:
 y=side*1.56
 cylinder('Windlass_drum_'+str(side),(34.05,y,6.5),(34.05,y,7.03),.34,STEEL,'MooringHardware',40)
 cylinder('Windlass_motor_'+str(side),(33.61,y,6.68),(34.38,y,6.68),.22,DARK,'MooringHardware',32)
 cylinder('Windlass_chainwheel_'+str(side),(34.55,y-.11,6.73),(34.55,y+.11,6.73),.28,STEEL,'MooringHardware',40)
 for j in range(22):torus('Anchor_chain_%d_%02d'%(side,j),(34.59+j*.077,y,6.64),.066,.018,STEEL,'MooringHardware',(0,1,0) if j%2 else (0,0,1),20)
 # Anchor pocket follows the hull side; flukes are real geometry.
 x=33.0;hy=side*width_at(x,3.3)
 ellipsoid('Anchor_recess_'+str(side),(x,hy,3.50),(.76,.075,.48),DARK,'MooringHardware',40)
 cylinder('Anchor_shank_'+str(side),(x-.55,hy+side*.07,3.33),(x+.32,hy+side*.07,3.75),.068,STEEL,'MooringHardware',20)
 for off in [-.29,.29]:
  box('Anchor_fluke',(x-.48,hy+side*.13,3.34+off),(.45,.10,.31),STEEL,'MooringHardware',.025,rot=(0,side*.45,0))
 cylinder('Anchor_stock',(x-.41,hy+side*.09,2.95),(x-.41,hy+side*.09,3.84),.043,STEEL,'MooringHardware',20)
for x in [-32,-28,25,32]:
 for side in [-1,1]:
  yy=side*(5.34 if x<0 else 3.3 if x<30 else 2.42);zz=5.81 if x<0 else 6.5
  box('Bollard_base',(x,yy,zz),(.85,.40,.08),STEEL,'MooringHardware',.05)
  for off in [-.24,.24]:cylinder('Bollard_post',(x+off,yy,zz),(x+off,yy,zz+.36),.10,STEEL,'MooringHardware',28);cylinder('Bollard_cap',(x+off,yy,zz+.32),(x+off,yy,zz+.4),.14,STEEL,'MooringHardware',28)
  box('Fairlead_recess',(x+.8,yy,zz+.08),(.59,.30,.13),DARK,'MooringHardware',.07)
  cylinder('Fairlead_roller',(x+.8,yy-.17,zz+.17),(x+.8,yy+.17,zz+.17),.085,STEEL,'MooringHardware',24)
# Recessed service hatches, drain gratings and fixture bolts.
for x,z,y in [(-26,9.55,3.3),(-17,13.16,2.8),(33,6.47,0),(-34.5,1.27,0)]:
 box('Flush_deck_hatch',(x,y,z),(.81,.63,.02),PEARL,'ExteriorFixtures',.04)
 for xx in [-.30,.30]:cylinder('Hatch_latch',(x+xx,y,z+.011),(x+xx,y,z+.023),.038,STEEL,'ExteriorFixtures',20)
for x0,x1,y,z in [(-33,-24,5.6,5.80),(-27,-16,4.45,9.55),(-19,-9,3.68,13.15)]:
 for side in [-1,1]:
  box('Deck_drain_channel',((x0+x1)/2,side*y,z),((x1-x0),.085,.035),DARK,'ExteriorFixtures',.012)
  for x in np.arange(x0,x1,.12):box('Drain_grating',(float(x),side*y,z+.025),(.028,.09,.02),STEEL,'ExteriorFixtures',.003)

# Flush shell-door seams, exterior ventilation, guest ports and working lights.
for side in [-1,1]:
 outline=[]
 for x,z in [(-12,1.52),(-.7,1.52),(-.7,4.41),(-12,4.41)]:outline.append((x,side*(width_at(x,z)+.018),z))
 panel=objmesh('Tender_garage_shell_door_'+str(side),outline,[(0,1,2,3)],PAINT,'ExteriorFixtures')
 tube('Tender_garage_perimeter_'+str(side),outline,.017,DARK,'ExteriorFixtures',True)
 for x in [-11,-8,-5,-1.7]:cylinder('Shell_door_hinge',(x,side*(width_at(x,4.41)+.026),4.31),(x,side*(width_at(x,4.41)+.026),4.49),.036,STEEL,'ExteriorFixtures',16)
 for x in [-21,-18.8,-16.6]:
  yy=side*(width_at(x,3.75)+.035);box('Engine_vent_recess',(x,yy,3.75),(1.62,.07,.57),DARK,'ExteriorFixtures',.03)
  for dz in np.linspace(-.23,.23,9):box('Vent_louvre',(x,yy+side*.04,3.75+dz),(1.49,.03,.027),PEARL,'ExteriorFixtures',.007)
 for x in [3,6.2,9.4,12.6,15.8,19]:
  yy=side*(width_at(x,2.65)+.025);box('Hull_guest_window_frame',(x,yy,2.65),(1.00,.08,.43),STEEL,'Glazing',.09);box('Hull_guest_port',(x,yy+side*.045,2.65),(.87,.05,.31),GLASS,'Glazing',.075)
 for x in [-24,-18,-12,-6,0,6,12]:
  yy=side*4.82;cylinder('Recessed_soffit_light',(x,yy,9.28),(x,yy,9.30),.065,LIGHT,'ExteriorFixtures',20)
 for x in [-32,-29,-26]:box('Step_marker_light',(x,side*5.55,5.64),(.18,.035,.07),LIGHT,'ExteriorFixtures',.018)

# Swim ladders, showers, rescue equipment, camera pods and flagstaff.
for side in [-1,1]:
 x=-36.55;y=side*3.68
 tube('Beach_shower_'+str(side),[(x,y,1.26),(x,y,3.3),(x+.2,y,3.5),(x+.46,y,3.5)],.033,STEEL,'BeachClub')
 cylinder('Shower_rose',(x+.46,y,3.47),(x+.46,y,3.53),.13,STEEL,'BeachClub',32)
 torus('Shower_mixer',(x,y-side*.035,2.4),.059,.018,STEEL,'BeachClub',(0,1,0),24)
 box('Life_equipment_cabinet',(-32.15,side*3.61,2.42),(.08,.72,1.06),PAINT,'BeachClub',.075)
 torus('Lifering_'+str(side),(-32.27,side*3.61,2.70),.27,.075,RED,'BeachClub',(1,0,0),48)
 for yy in [-.26,.26]:tube('Swim_ladder_rail', [(-38.80,side*2.88+yy,-.8),(-38.8,side*2.88+yy,1.6),(-38.54,side*2.88+yy,1.86),(-38.15,side*2.88+yy,1.65),(-38.15,side*2.88+yy,1.25)],.036,STEEL,'BeachClub')
 for zz in np.arange(-.6,1.3,.29):cylinder('Ladder_rung',(-38.80,side*2.88-.26,zz),(-38.80,side*2.88+.26,zz),.027,STEEL,'BeachClub',16)
 cylinder('Stern_capstan',(-36.05,side*3.05,1.28),(-36.05,side*3.05,1.67),.17,STEEL,'MooringHardware',32)
# Integrated radar arch and real equipment, replacing the old lone pole.
slab('Sundeck_hardtop',footprint(-4.3,8.5,3.04,1.8),19.30,19.53,PAINT,'MastElectronics',.12)
for side in [-1,1]:
 cylinder('Hardtop_aft_support',(-3,side*2.58,16.45),(-2.5,side*2.70,19.35),.075,STEEL,'MastElectronics',24)
 arch=objmesh('Swept_mast_cheek_'+str(side),[(-1.6,side*.62,19.5),(1.4,side*.62,19.5),(.10,side*.36,23.2),(-.72,side*.36,23.2)],[(0,1,2,3)],PAINT,'MastElectronics');so=arch.modifiers.new('Mast plate thickness','SOLIDIFY');so.thickness=.16;bevel(arch,.08,4)
 cylinder('Satcom_plinth_'+str(side),(2.7,side*1.35,19.5),(2.7,side*1.35,20.08),.46,PAINT,'MastElectronics',40)
 ellipsoid('Satcom_radome_'+str(side),(2.7,side*1.35,20.64),(.73,.73,.81),PAINT,'MastElectronics',48)
 torus('Radome_service_joint_'+str(side),(2.7,side*1.35,20.39),.692,.012,PEARL,'MastElectronics')
 cylinder('Whip_antenna_'+str(side),(-2.15,side*1.8,19.5),(-2.28,side*1.8,22.9),.019,STEEL,'MastElectronics',12,r2=.008)
 cylinder('Navigation_wing',(1.0,0,21.20),(1.0,side*2.1,21.20),.042,STEEL,'MastElectronics',20)
 ellipsoid('Port_light' if side>0 else 'Starboard_light',(1,side*2.1,21.2),(.15,.10,.12),RED if side>0 else GREEN,'MastElectronics',24)
 box('Navigation_light_shield',(1,side*2.12,21.30),(.40,.28,.03),DARK,'MastElectronics',.025)
box('Radar_primary_rotor',(-.2,0,23.24),(.52,5.22,.22),PAINT,'MastElectronics',.10)
box('Radar_secondary_rotor',(-1.55,0,21.96),(.42,3.68,.17),PAINT,'MastElectronics',.065)
cylinder('Radar_primary_pedestal',(-.2,0,22.68),(-.2,0,23.22),.18,DARK,'MastElectronics',32)
cylinder('Masthead_antenna',(-.32,0,23.4),(-.46,0,24.52),.018,STEEL,'MastElectronics',12)
ellipsoid('Masthead_allround_light',(-.36,0,23.95),(.085,.085,.13),LIGHT,'MastElectronics',24)
for side in [-1,1]:
 cylinder('Air_horn',(-2.35,side*.34,21.3),(-3.06,side*.34,21.3),.06,STEEL,'MastElectronics',24,r2=.15)
 ellipsoid('Dome_camera',(-3.28,side*2.5,19.26),(.095,.095,.13),DARK,'MastElectronics',24)

# Underwater gear: twisted five-blade propellers, shaft brackets, rudders and stabilizer foils.
for side in [-1,1]:
 yy=side*2.52
 cylinder('Propeller_shaft_'+str(side),(-27.6,yy,-2.47),(-34.10,yy,-2.44),.10,STEEL,'RunningGear',32)
 cylinder('Propeller_hub_'+str(side),(-34.4,yy,-2.44),(-33.88,yy,-2.44),.29,BRONZE,'RunningGear',40,r2=.20)
 for k in range(5):
  vs=[];fs=[];ang=k*math.tau/5
  for i in range(13):
   t=i/12;rad=.25+1.00*t;chord=(.26+.32*math.sin(math.pi*t))*(1-.55*t)
   for j in range(7):
    u=j/6-.5;a=ang+.43*t+u*chord/max(rad,.25);ax=-34.10+.21*t+u*.36
    vs.append((ax,yy+rad*math.cos(a),-2.44+rad*math.sin(a)))
  for i in range(12):
   for j in range(6):n=i*7+j;fs.append((n,n+1,n+8,n+7))
  ob=objmesh('Propeller_%d_blade_%d'%(side,k),vs,fs,BRONZE,'RunningGear',True);s=ob.modifiers.new('Hydrofoil thickness','SOLIDIFY');s.thickness=.035;bevel(ob,.022,3)
 for x in [-30.1,-32.0]:
  cylinder('Shaft_P_bracket',(x,yy,-2.45),(x+.1,yy*.90,-1.42),.085,BRONZE,'RunningGear',24)
  cylinder('Shaft_bearing',(x-.19,yy,-2.45),(x+.19,yy,-2.45),.17,BRONZE,'RunningGear',32)
 rud=box('Rudder_'+str(side),(-35.08,yy,-2.13),(.79,.17,2.30),PEARL,'RunningGear',.08,rot=(0,-.07,0))
 cylinder('Rudder_stock',(-34.98,yy,-2.9),(-34.98,yy,-.62),.11,STEEL,'RunningGear',24)
 # Foils include actual closed cross sections.
 poly=[(-6.2,side*5.5),(-3.6,side*5.5),(-2.8,side*8.04),(-4.4,side*8.35)]
 fin=slab('Stabilizer_fin_'+str(side),poly,-1.93,-1.75,PEARL,'RunningGear',.07)
 cylinder('Stabilizer_shaft',(-4.8,side*4.9,-1.83),(-4.8,side*6.05,-1.83),.17,STEEL,'RunningGear',28)
# Tunnel lining/guards are recessed in the actual bow-thruster opening.
for side in [-1,1]:
 yy=side*width_at(29.4,-.62)*.90
 torus('Thruster_tunnel_lip_'+str(side),(29.4,yy,-.62),.555,.055,DARK,'RunningGear',(0,1,0),48)
 for off in [-.26,0,.26]:cylinder('Thruster_guard',(29.4+off,yy-side*.025,-1.08),(29.4+off,yy-side*.025,-.16),.017,STEEL,'RunningGear',12)

# Small clothed figures are removable scale aids, not claims of photoreal people.
def person(name,x,y,z):
 ellipsoid(name+'_torso',(x,y,z+1.09),(.20,.13,.33),CLOTH,'ScaleFigures',24)
 ellipsoid(name+'_head',(x,y,z+1.62),(.12,.11,.15),SKIN,'ScaleFigures',24)
 cylinder(name+'_neck',(x,y,z+1.32),(x,y,z+1.48),.055,SKIN,'ScaleFigures',16)
 for side in [-1,1]:
  cylinder(name+'_leg',(x+side*.105,y,z+.16),(x+side*.09,y,z+.89),.071,CLOTH,'ScaleFigures',20)
  ellipsoid(name+'_shoe',(x+side*.11,y-.06,z+.065),(.087,.15,.064),DARK,'ScaleFigures',20)
  cylinder(name+'_upper_arm',(x+side*.19,y,z+1.3),(x+side*.28,y,z+1.02),.052,CLOTH,'ScaleFigures',18)
  cylinder(name+'_forearm',(x+side*.28,y,z+1.02),(x+side*.29,y-.08,z+.82),.041,SKIN,'ScaleFigures',18)
  ellipsoid(name+'_hand',(x+side*.29,y-.08,z+.79),(.043,.037,.065),SKIN,'ScaleFigures',18)
for i,p in enumerate([(-24,2.4,9.56),(-16,-2.65,13.17),(29.6,0,6.49),(-35.5,1.5,1.26)]):person('Scale_person_%d'%i,*p)

# Names are true text geometry on the finished model.
def label(name,text,loc,size,rot,mat=STEEL):
 cu=bpy.data.curves.new(name,'FONT');cu.body=text;cu.align_x='CENTER';cu.size=size;cu.extrude=.008;cu.bevel_depth=.002;cu.space_character=1.2;ob=bpy.data.objects.new(name,cu);C['ExteriorFixtures'].objects.link(ob);ob.location=loc;ob.rotation_euler=rot;cu.materials.append(mat)
label('Transom_name','A T L A S',(-35.38,0,4.76),.43,(math.pi/2,0,-math.pi/2))
for side in [-1,1]:label('Side_name_'+str(side),'ATLAS 256',(-22,side*6.39,4.73),.30,(math.pi/2 if side<0 else math.pi/2,0,math.pi if side>0 else 0),DARK)

# Dimension and topology reporting; no renderer or stage counted as yacht length.
bpy.context.view_layer.update()
boat=[o for o in ROOT.all_objects if not o.get('construction_cutter')]
count=len(boat);mesh_count=sum(o.type=='MESH' for o in boat)
minx=min((o.matrix_world@Vector(c)).x for o in boat if o.type in {'MESH','CURVE','FONT'} for c in o.bound_box)
maxx=max((o.matrix_world@Vector(c)).x for o in boat if o.type in {'MESH','CURVE','FONT'} for c in o.bound_box)
# All appendages remain inside end planes; extended stabilizers are excluded from hull beam.
assert abs((maxx-minx)-78.2)<.065,(minx,maxx,maxx-minx)
report={'model':'ATLAS 256 Detailed Exterior R02','blender_version':bpy.app.version_string,'length_m':round(maxx-minx,4),'nominal_length_m':78.2,'length_ft':round(78.2/.3048,2),'hull_beam_m':12.9,'objects_master':count,'mesh_objects_master':mesh_count,'physical_teak_planks':sum(int(o.get('individual_plank_count',0)) for o in boat),'scope':'Entire yacht exterior and running gear; tender fleet and full interiors not part of this release','construction_status':'Visualization only. No stability, structure, machinery or safety certification implied.'}
for key,val in report.items():
 if isinstance(val,(str,int,float)):scene[key]=val

# Scene, native Blender cameras and physically lit ocean for honest preview renders.
world=bpy.data.worlds.new('Offshore daylight');scene.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;bg=nodes.get('Background');bg.inputs['Color'].default_value=(.51,.67,.77,1);bg.inputs['Strength'].default_value=.45
sun_data=bpy.data.lights.new('Sun','SUN');sun_data.energy=2.4;sun_data.angle=.08;sun=bpy.data.objects.new('Sun',sun_data);STAGE.objects.link(sun);sun.rotation_euler=(.55,-.35,-.6)
def area(name,loc,power,size,target):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);STAGE.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large cool fill',(15,-30,36),4500,35,(0,0,8));area('Aft softbox',(-50,10,30),4000,24,(-18,0,7))
SEA_MAT=material('Offshore blue water',(.03,.20,.25),.23,.27)
water=box('Ocean',(0,0,-.075),(1700,1700,.10),SEA_MAT,STAGE,0)
nt=SEA_MAT.node_tree;noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.8;noise.inputs['Detail'].default_value=3;tex=nt.nodes.new('ShaderNodeTexCoord');nt.links.new(tex.outputs['Object'],noise.inputs['Vector']);bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.11;nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],nt.nodes.get('Principled BSDF').inputs['Normal'])
views={'hero':((92,-118,64),(0,0,7),53),'profile':((1,-145,25),(0,0,10),55),'aft':((-82,-59,37),(-24,0,7),58),'bow':((78,-44,32),(27,0,6),59),'pool':((-48,-27,29),(-29,0,5.7),55),'runninggear':((-57,-25,-1),(-30,0,-1.5),58)}
cameras={}
for name,(loc,target,lens) in views.items():
 d=bpy.data.cameras.new(name);d.lens=lens;d.clip_end=3000;o=bpy.data.objects.new('Camera_'+name,d);STAGE.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();cameras[name]=o
scene.camera=cameras['hero'];scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.cycles.max_bounces=5;scene.cycles.transmission_bounces=3
try:scene.view_settings.view_transform='AgX'
except:scene.view_settings.view_transform='Filmic'
scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=94
# Choose a useful viewport on opening the editable master.
for scr in bpy.data.screens:
 for ar in scr.areas:
  if ar.type=='VIEW_3D':ar.spaces.active.clip_end=2500
bpy.ops.object.select_all(action='DESELECT')
# Save the actual native master before making any export-only batching changes.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ATLAS_256_Exterior_Master.blend'))
print('MASTER_SAVED',len(boat),flush=True)

# Web export comes from evaluated Blender objects, never rebuilt browser primitives.
DG=bpy.context.evaluated_depsgraph_get();EXPORT=bpy.data.collections.new('WEB_EXPORT');scene.collection.children.link(EXPORT)
export_groups=defaultdict(list);triangles=0
for o in boat:
 if o.type not in {'MESH','CURVE','FONT'}:continue
 eo=o.evaluated_get(DG);me=bpy.data.meshes.new_from_object(eo,preserve_all_data_layers=True,depsgraph=DG)
 if me is None or not me.polygons:continue
 me.calc_loop_triangles();triangles+=len(me.loop_triangles)
 ob=bpy.data.objects.new(o.name+'_web',me);EXPORT.objects.link(ob);ob.matrix_world=o.matrix_world.copy()
 group=next((c.name for c in o.users_collection if c.name in C),'ExteriorFixtures');export_groups[group].append(ob)
for name,obs in export_groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name=name+'_Web_Mesh'
bpy.ops.object.select_all(action='DESELECT')
for o in EXPORT.objects:o.select_set(True)
props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
opts={'filepath':str(OUT/'ATLAS_256_Exterior_Web.glb'),'export_format':'GLB','use_selection':True,'export_yup':True,'export_apply':False}
if 'export_cameras' in props:opts['export_cameras']=False
if 'export_lights' in props:opts['export_lights']=False
if 'export_extras' in props:opts['export_extras']=True
bpy.ops.export_scene.gltf(**opts)
report['evaluated_triangles']=triangles;report['web_geometry_source']='Evaluated geometry of the saved native Blender master; same detail, batched by collection';report['export_groups']=len(EXPORT.objects)
# Remove duplicates before native renders (the saved master never contains these).
for o in list(EXPORT.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.collections.remove(EXPORT)
(OUT/'model_report.json').write_text(json.dumps(report,indent=2))
print('EXPORT_READY',json.dumps(report),flush=True)
for name in ['hero','profile','aft','pool','bow','runninggear']:
 scene.camera=cameras[name];water.hide_render=(name=='runninggear')
 scene.render.resolution_x=1440 if name=='hero' else 1200;scene.render.resolution_y=960 if name=='hero' else 800
 scene.cycles.samples=20 if name=='hero' else 14
 scene.render.filepath=str(OUT/(name+'.jpg'));bpy.ops.render.render(write_still=True)
 print('RENDERED',name,flush=True)
water.hide_render=False
(OUT/'README.md').write_text('# ATLAS 256 — detailed exterior R02\n\nNative Blender master plus web GLB exported from the same evaluated geometry.\n\nOpen ATLAS_256_Exterior_Master.blend to edit. The collection tree separates hull, superstructure, glazing, decks, stern, beach club, foredeck, railings, mooring equipment, furniture, running gear, electronics, fixtures and removable scale figures.\n\nAll textures are packed. Hull boolean cutter objects are deliberately hidden and retained for editing. Camera and ocean objects are presentation only.\n\nThe complete boat, including swim platform, measures 78.2 m overall (256.56 ft, rounded to 256.6 ft). Hull beam is 12.9 m; deployed stabilizer appendages extend beyond the hull.\n\nThis release covers the entire yacht exterior. It is not a complete interior, tender fleet, engineering model, certified design or print-validated model.\n\nSee model_report.json and browser_validation.json for measured geometry and actual test results. Browser mobile checks are viewport simulation, not a physical iPhone benchmark.\n')
print('COMPLETE_SECONDS',round(time.time()-START,1),flush=True)
