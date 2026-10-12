"""Atlas Bay 25 Studio 05. Visual fishing refinement + UNVALIDATED hull study.
SI coordinates X bow, Y up, Z starboard. No depth/operating/rated payload claim.
"""
import os,sys,json,copy,math,shutil,hashlib
from pathlib import Path
import numpy as np
import trimesh
from scipy.interpolate import PchipInterpolator
from scipy.integrate import simpson
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));sys.path.insert(0,str(R/'source'));os.environ['FLEET_ROOT']=str(R)
from assemble import Doc
from build_fleet import Builder,linear
S=R/'site';O=R/'staging';O.mkdir(exist_ok=True)
base=S/'assets/ATLAS_Bay_25.glb';shutil.copy2(base,S/'assets/ATLAS_Bay_25_Previous.glb')
d=Doc(base);inventory=[]
def new(name):
 b=Builder(name)
 for key,c,rough,metal in [('white','#E4E6E2',.28,0),('darkdeck','#405360',.48,0),('black','#162329',.65,0),('chrome','#B9C4C9',.24,1),('blue','#35556D',.26,0)]:
  b.m.g['materials'][b.c[key]]['pbrMetallicRoughness'].update(baseColorFactor=linear(c)+[1],roughnessFactor=rough,metallicFactor=metal)
 return b
def append(b,parent,prefix):
 b.save(prefix+'.glb',60);q=Doc(O/(prefix+'.glb'));q.g.pop('animations',None);d.append(q,d.node(parent),prefix+'_');inventory.extend(b.inventory)
def along(mesh,a,z):
 a=np.asarray(a,float);z=np.asarray(z,float);mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],(z-a)/np.linalg.norm(z-a)));mesh.apply_translation((a+z)/2);return mesh
# Four inherited rear tubes remain. Two additional supported, outward-splayed holders.
b=new('Two additional T-top rod holders')
for side,label in [(-1,'PORT'),(1,'STARBOARD')]:
 p=b.group('NEW_TTOP_HOLDER_'+label)
 a=np.array([-1.46,2.532,side*.80]);z=a+[-.135,.186,side*.145]
 tube=trimesh.creation.annulus(r_min=.026,r_max=.033,height=np.linalg.norm(z-a),sections=36)
 b.add('Open rod-holder stainless barrel',along(tube,a,z),'chrome',p,True)
 axis=(z-a)/np.linalg.norm(z-a)
 rim=trimesh.creation.annulus(r_min=.024,r_max=.037,height=.017,sections=40)
 b.add('Protective polymer rod lip',along(rim,z-axis*.0085,z+axis*.0085),'black',p,True)
 sleeve=trimesh.creation.annulus(r_min=.0237,r_max=.026,height=.18,sections=32)
 b.add('Rod-holder inner liner',along(sleeve,z-axis*.186,z-axis*.006),'black',p,True)
 b.box('Rod rack backing plate',[-1.433,2.529,side*.79],[.17,.022,.15],'darkdeck',p,.018)
 for dz in [-.054,.054]:b.cyl('Rack countersunk fastener',[-1.41,2.544,side*.79+dz],.007,.006,'chrome',p)
 b.tube('Rod-holder welded support',[a+[.04,-.004,-side*.04],a+[-.012,.061,0]],.016,'chrome',p)
append(b,'FIXED_TTop','F05_Rack')
# Soft rod-rest inserts follow the existing secured rod line, not the walking surface.
b=new('Fishing workspace refinements')
for side in [-1,1]:
 for x in [-1.02,-.50]:
  c=np.array([x,.661,side*1.045]);pts=[c+[0,.031*math.cos(a),.031*math.sin(a)] for a in np.linspace(.60,2*math.pi-.60,32)]
  b.tube('Open-top soft horizontal rod clip',pts,.005,'black')
  b.box('Recessed rod clip standoff',[x,.632,side*1.095],[.052,.05,.09],'white',r=.012)
# Discreet 50 cm scale on the aft port cap, within existing gunwale bounds.
x0=-2.7;y=.827;z=-1.20
b.box('Flush fifty-centimetre fish scale',[x0+.25,y,z],[.515,.004,.052],'darkdeck',r=.009)
for cm in range(51):
 length=.019 if cm%10==0 else .011 if cm%5==0 else .006
 b.tube('Centimetre mark',[[x0+cm*.01,y+.003,z-.023],[x0+cm*.01,y+.003,z-.023+length]],.0008,'white',sides=6)
for cm in range(0,51,10):b.text(str(cm),[x0+cm*.01-.005,y+.004,z+.002],.011,'white',plane='deck')
# Tool pocket is on the tackle-station side, below the seats and away from casting decks.
b.box('Recessed tackle-tool pocket',[-1.59,.745,.464],[.29,.11,.015],'darkdeck',r=.015)
for x in [-1.67,-1.53]:b.box('Soft tool retention slot',[x,.79,.476],[.07,.015,.012],'black',r=.005)
append(b,'EX_Hardware','F05_Workspace')
# Previously missing electric motor propeller: rigidly attached to existing stowage group.
b=new('Trolling motor propeller')
b.cyl('Trolling motor propeller hub',[-.348,-1.09,0],.022,.055,'black',axis='x')
for a in [0,math.pi]:
 v=np.array([[-.377,-1.09,0],[-.370,-1.065,.036],[-.359,-1.071,.102],[-.340,-1.104,.088],[-.357,-1.111,.022]])
 v[:,1:]-=[-1.09,0];rot=trimesh.transformations.rotation_matrix(a,[1,0,0]);v=trimesh.transform_points(v,rot);v[:,1:]+=[-1.09,0]
 m=trimesh.Trimesh(v,[[0,1,4],[1,2,3],[1,3,4]],process=False);b.add('Trolling motor blade',m,'black',smooth=False)
append(b,'MOV_Trolling_shaft','F05_Troll')
d.g['scenes'][0].setdefault('extras',{}).update(revision='Bay 25 Studio 05',engine_count=1,top_rod_holders=6,shallow_hull_study=False,engineering_validated=False)
d.compact();d.write(O/'ATLAS_Bay_25.glb');shutil.copy2(O/'ATLAS_Bay_25.glb',base)
# Parametric station baseline used by approved Studio 03/04. Hull study changes only
# the part below the chine; neither hull is scaled and all upper furniture stays fixed.
sec=np.array([[-3.75,1.175,.76,-.13,-.49],[-3.25,1.245,.79,-.13,-.50],[-2.,1.294,.805,-.12,-.49],[-.6,1.30,.835,-.085,-.46],[.7,1.269,.895,-.01,-.395],[1.65,1.162,.985,.09,-.245],[2.40,.965,1.068,.26,.025],[2.96,.704,1.13,.48,.345],[3.4,.38,1.16,.74,.65],[3.67,.12,1.172,.97,.92],[3.75,.004,1.174,1.12,1.118]])
sp=[PchipInterpolator(sec[:,0],sec[:,i]) for i in range(1,5)]
def blend(x):
 t=np.clip((np.asarray(x)+.5)/3.4,0,1);return .58+.42*t*t*(3-2*t)
q=Doc(base);changed=[]
for idx in q.descendants(q.node('EX_Hull')):
 n=q.g['nodes'][idx]
 if 'mesh' not in n:continue
 for p in q.g['meshes'][n['mesh']]['primitives']:
  v=q.rd(p['attributes']['POSITION']);x=np.clip(v[:,0],-3.75,3.75);c=sp[2](x);mask=v[:,1]<c-1e-7
  if not np.any(mask):continue
  old=v.copy();v[mask,1]=c[mask]-(c[mask]-v[mask,1])*blend(x[mask]);m=trimesh.Trimesh(v,q.rd(p['indices']).reshape(-1,3),process=False)
  p['attributes']['POSITION']=q.acc(v);p['attributes']['NORMAL']=q.acc(np.asarray(m.vertex_normals));changed.append({'mesh':n['name'],'vertices':int(mask.sum()),'maximum_change_m':float(abs(v-old).max())})
q.g['scenes'][0].setdefault('extras',{}).update(shallow_hull_study=True,design_status='Unvalidated underbody option. Trim, all-up mass, propulsion clearance, strength and handling unsolved.')
q.compact();q.g['scenes'][0]['extras']={'variant':'UNVALIDATED shallow underbody','actual_draft_established':False};q.write(O/'ATLAS_Bay_25_Shallow_Study.glb');shutil.copy2(O/'ATLAS_Bay_25_Shallow_Study.glb',S/'assets/ATLAS_Bay_25_Shallow_Study.glb')
# Even-keel sectional-area integration, using the actual station surface formula.
# This computes gross buoyancy for a test waterline, NOT measured boat mass/draft.
xx=np.linspace(-3.75,3.75,1601);w,s,c,k=np.array([f(xx) for f in sp]);table={}
for name,kk in [('approved',k),('shallow_study',c-(c-k)*blend(xx))]:
 keel=float(kk.min());H=s-c;D=c-kk
 def area(h):
  u=np.clip(h-kk,0,D);a=.89*w*u*u/np.maximum(D,1e-9)
  t=np.clip(h-c,0,H)
  return a+2*w*(.89*t+.055*t*t/np.maximum(H,1e-9)+.018*H/math.pi*(np.cos(math.pi*t/np.maximum(H,1e-9))-1))
 rows=[]
 for inch in sorted(set([round(x,1) for x in np.arange(6,24.01,.1)]+[11.9,12.0])):
  ar=area(keel+inch*.0254);vol=float(simpson(ar,x=xx));rows.append({'draft_in':inch,'volume_m3':round(vol,6),'seawater_equivalent_total_mass_kg':round(vol*1025,1),'freshwater_equivalent_total_mass_kg':round(vol*1000,1),'longitudinal_buoyancy_centroid_x_m':round(float(simpson(ar*xx,x=xx))/max(vol,1e-9),4)})
 table[name]={'keel_y_m':keel,'aft_geometric_deadrise_deg':float(np.rad2deg(np.arctan((c[0]-kk[0])/(.89*w[0])))),'rows':rows,'sections':[{'x_m':float(x),'halfbeam':float(ww),'sheer':float(ss),'chine':float(cc),'keel':float(k0)} for x,ww,ss,cc,k0 in zip(xx[::80],w[::80],s[::80],c[::80],kk[::80])]}
refs=[{'name':'Pathfinder 2500 Hybrid: 13 in published draft','url':'https://www.pathfinderboats.com/build/2026-hybrid--2500'},{'name':'Sportsman Masters 247: 14 in published draft','url':'https://sportsmanboatsmfg.com/masters/247-bay-boat'},{'name':'Shallow Sport 24 Mod V: 10.5 in at rest, different tunnel hull','url':'https://www.shallowsportboats.com/models/modv/'}]
hydro={'method':'Numerical integration of model station cross-sections at EVEN KEEL; all exterior hull surfaces assumed to exclude water. Mass equivalent includes the entire craft and load, NOT payload.','water_density_kg_m3':{'sea':1025,'fresh':1000},'all_up_mass_known':False,'trim_solved':False,'stability_solved':False,'propulsion_clearance_solved':False,'all_up_weight_inputs':'Hull structure, T-top, glass, motor, rigging, fuel, batteries, people, tackle, ice and livewell water must all be included.','target_definition':'Less than 12 inches STATIC HULL draft at an agreed load; engine raised. Does not establish the lowest appendage or safe running/idle/acceleration depth.','variants':table,'references':refs,'limits':['No actual structure/equipment mass budget exists.','Even-keel section areas do not solve trim; the waterline and CG must be assessed together.','Motor, propeller, trim tabs, strakes, transducers and trolling motor clearance assessed separately.','Changing deadrise has NOT been tested for ride, stability, handling or strength.','No displacement result here is a load rating or engineering qualification.']}
(S/'draft_study.json').write_text(json.dumps(hydro,indent=2))
basecheck=Doc(S/'assets/ATLAS_Bay_25_Previous.glb');newcheck=Doc(base);preserved=True
for n in basecheck.g['nodes']:
 if 'mesh' not in n:continue
 match=newcheck.g['nodes'][newcheck.node(n['name'])]
 for a,bp in zip(basecheck.g['meshes'][n['mesh']]['primitives'],newcheck.g['meshes'][match['mesh']]['primitives']):
  assert np.array_equal(basecheck.rd(a['attributes']['POSITION']),newcheck.rd(bp['attributes']['POSITION'])),n['name']
report={'revision':'Bay 25 Studio 05','scope':'Standalone Bay only. Fishing additions plus separately selectable unvalidated shallow underbody study.','approved_original_meshes_preserved':preserved,'single_outboard_retained':True,'top_rod_holders_before':4,'top_rod_holders_after':6,'additional_holders':2,'rigid_top':True,'scale_animation_channels':sum(c['target']['path']=='scale' for a in d.g.get('animations',[]) for c in a['channels']),'animation_channels':sum(len(a['channels']) for a in d.g.get('animations',[])),'new_parts':inventory,'underbody_option_changed_meshes':changed,'shallow_option_has_same_topside_and_furniture':True,'actual_draft_established':False,'engineering_validated':False,'integrated_into_explorer':False,'changes':['Two open, lined and supported T-top rod holders: six in total','Soft horizontal rod-rest inserts, flush 50 cm fish scale and tackle-tool retention pocket','Actual small propeller added to existing trolling motor','Separate shallow aft-V underbody option; original approved hull is the default','Interactive draft/load study separating geometric buoyancy, actual draft and engine clearance'],'limits':hydro['limits']}
(S/'bay05_report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'parts_added':len(inventory),'holders':6,'underbody':changed,'11.9in':{name:next(z for z in v['rows'] if z['draft_in']==11.9) for name,v in table.items()}},indent=2))
