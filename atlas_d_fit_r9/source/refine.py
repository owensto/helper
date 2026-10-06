"""ATLAS D R9: selected geometric repairs, not vessel engineering qualification.
Preserves the R7 exterior art study and R8 fixed room layout. No safe depth.
"""
from pathlib import Path
import os, sys, json, struct, copy, math
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation
ROOT=Path(os.environ.get('ATLAS_R9',Path(__file__).resolve().parents[1]))
BASE=Path(os.environ.get('ATLAS_R8','/mnt/data/atlas_work/r8'))
KIT=Path(os.environ.get('ATLAS_KIT','/mnt/data/atlas_work/r7/source'))
sys.path.insert(0,str(KIT))
from meshkit import Model,readglb,boxmesh,tubes,smooth,quat
OUT=ROOT/'site';OUT.mkdir(parents=True,exist_ok=True)
source=BASE/'site/ATLAS_D_R8.glb';orig,read=readglb(source)
raw=source.read_bytes();jl=struct.unpack_from('<I',raw,12)[0]
M=Model();M.g=copy.deepcopy(orig);M.buf=bytearray(raw[28+jl:]);g=M.g
report=json.loads((BASE/'site/arrangement.json').read_text())
g['asset']['generator']='ATLAS D R9 / measured arrangement repairs; no pressure or load qualification'
g['scenes'][0]['name']='ATLAS D R9 / tender-carrier and pool clearance study'
index={n.get('name'):i for i,n in enumerate(g['nodes'])}
parentmap={c:i for i,n in enumerate(orig['nodes']) for c in n.get('children',[])}
def under(i,name):
 while True:
  if orig['nodes'][i].get('name')==name:return True
  if i not in parentmap:return False
  i=parentmap[i]
def craft_mesh(label):
 vv=[];ff=[];off=0
 for i,n in enumerate(orig['nodes']):
  if 'mesh' not in n or not under(i,'MOV_Tender_'+label):continue
  for pr in orig['meshes'][n['mesh']]['primitives']:
   v=read(pr['attributes']['POSITION']);f=read(pr['indices']).reshape(-1,3)
   vv.append(v);ff.append(f+off);off+=len(v)
 return np.concatenate(vv),np.concatenate(ff)
def underside(v,f,x,z):
 t=v[f];a=t[:,0,[0,2]];b=t[:,1,[0,2]]-a;c=t[:,2,[0,2]]-a;q=np.array([x,z])-a
 det=b[:,0]*c[:,1]-b[:,1]*c[:,0];ok=np.abs(det)>1e-8;t=t[ok];b=b[ok];c=c[ok];q=q[ok];det=det[ok]
 u=(q[:,0]*c[:,1]-q[:,1]*c[:,0])/det;w=(b[:,0]*q[:,1]-b[:,1]*q[:,0])/det
 inside=(u>=-1e-6)&(w>=-1e-6)&(u+w<=1.000001)
 y=t[:,0,1]+u*(t[:,1,1]-t[:,0,1])+w*(t[:,2,1]-t[:,0,1])
 if not inside.any():raise ValueError('Support outside craft hull')
 return float(y[inside].min())
newmat=M.mat('Redesigned narrow carrier',(.11,.39,.37),.62,.31)
padmat=M.mat('Contoured support pads',(.025,.045,.044),0,.7)
metal=M.mat('Guide rollers and fasteners',(.45,.52,.53),.83,.3)
oldmat=M.mat('Superseded carrier interference',(.77,.15,.045),.1,.65,.45)
pearl=M.mat('Raised pool access treads',(.69,.70,.65),.05,.58)
oldgroup=M.node('ENG_PreviousCradles')
GA,GB,GI,GY,GZ=-40.,-27.,2.18,2.4,2.5
newchecks=[];paths={};geometry={};oldchecks=report['recovery_hardware_checks'];support_checks=[]
for label,side,cy,oldcy,L in [('Chase',1,1.17,.17,11.8),('Utility',-1,1.544,.544,6.9)]:
 idx=index['MOV_Cradle_'+label]
 # Keep a separately selectable diagnostic of old rejected hardware; not active geometry.
 for child in orig['nodes'][idx].get('children',[]):
  n=orig['nodes'][child]
  if 'mesh' not in n:continue
  for pr in orig['meshes'][n['mesh']]['primitives']:
   v=read(pr['attributes']['POSITION'])+[-33.7,oldcy,side*GZ]
   M.raw('Previous_'+label,v,read(pr['indices']).reshape(-1,3),read(pr['attributes']['NORMAL']),oldmat,oldgroup)
 g['nodes'][idx]['children']=[]
 v,f=craft_mesh(label);aft=float(v[:,0].min())-.10;fore=float(v[:,0].max())+.14
 worldrail=.50 if label=='Chase' else .72
 localrail=worldrail-oldcy
 # Independent narrow side beams leave a continuous keel slot below the craft.
 for s in [-1,1]:
  M.add(label+'_side_beam',boxmesh(((aft+fore)/2,localrail,s*.8),(fore-aft,.06,.065),.012),newmat,idx)
 # Cross-ties are beyond the bow/transom, not through the lowest keel section.
 for x in [aft,fore]:M.add(label+'_end_cross_tie',boxmesh((x,localrail,0),(.055,.06,1.67),.01),newmat,idx)
 for x in np.linspace(aft+.7,fore-.7,6):
  for s in [-1,1]:
   wheel=trimesh.creation.cylinder(radius=.048,height=.085,sections=16)
   wheel.apply_translation([x,localrail-.062,s*.62]);M.add(label+'_guide_roller',wheel,metal,idx,True)
 # Bunk-pad top sits just below the lowest sampled hull face over its footprint.
 for x in [-L*.30,0,L*.23]:
  for s in [-1,1]:
   z=s*1.0;hits=[underside(v,f,x+dx,z+dz)+1 for dx in [-.14,0,.14] for dz in [-.065,0,.065]]
   top=min(hits)-.012;bottom=localrail+.04
   if top-bottom<.065:raise ValueError('Insufficient support height: '+str((label,x,z,top,bottom)))
   M.add(label+'_pad',boxmesh((x,top-.026,z),(.30,.052,.15),.015),padmat,idx)
   M.add(label+'_inclined_pad_support',tubes([[x,localrail+.032,s*.8],[x,top-.055,z]],.033,12),newmat,idx,True)
   support_checks.append({'craft':label,'x_m':round(x,3),'z_m':z,'sampled_pad_gap_m':.012,'contact_and_load_analysis':False})
 # Surface transfer: align and lift fully outside the candidate opening; then insert axially.
 if label=='Chase':startx,startz,t0,t1,t2,l0,l1,i0,i1=-23,17,.025,.08,.13,.135,.185,.19,.265
 else:startx,startz,t0,t1,t2,l0,l1,i0,i1=-10,17.2,.12,.18,.24,.25,.295,.30,.375
 def path(p,c=cy,s=side,sx=startx,sz=startz,a=t0,b=t1,d=t2,e=l0,h=l1,j=i0,k=i1):
  if p<b:return [sx+(-49.8-sx)*smooth(a,b,p),0,sz]
  if p<d:return [-49.8,0,sz+(s*GZ-sz)*smooth(b,d,p)]
  return [-49.8+16.1*smooth(j,k,p),c*smooth(e,h,p),s*GZ]
 def carrier(p,fn=path,cy=cy,s=side,j=i0,k=i1,e=l0,h=l1):
  if p<.065:return [-33.7-16.1*smooth(.005,.065,p),cy-1.,s*GZ]
  if p<e:return [-49.8,cy-1.-cy*smooth(.067,.10,p),s*GZ]
  q=fn(p);return [q[0],q[1]-1.,q[2]]
 paths['MOV_Tender_'+label]=path;paths['MOV_Cradle_'+label]=carrier
 carrierparts=[a for (p,ma),arr in M.parts.items() if p==idx for a in arr]
 cv=np.concatenate([a[1] for a in carrierparts]);geometry[label]=(v,cv,path,carrier)
 # Convex-cylinder screen: extrema of these triangle assemblies occur at their vertices.
 final=np.array(carrier(1));rad=np.linalg.norm((cv+final)[:,1:3]-[GY,side*GZ],axis=1)
 newchecks.append({'assembly':label+' replacement carrier','stored_position':final.tolist(),'minimum_radial_clearance_m':float(GI-rad.max()),'aft_clearance_m':float((cv+final)[:,0].min()-GA),'forward_clearance_m':float(GB-(cv+final)[:,0].max()),'fits_candidate_bore':bool(rad.max()<GI),'scope':'Carrier and rollers only; structural and load qualification excluded'})
# Remove the old guide-reservation box; replace with two matched guide rails in each bore.
gar=index['ENG_Garages']
for child in list(g['nodes'][gar]['children']):
 n=g['nodes'][child]
 if n.get('name')!='ENG_Garages__Garage_seats_and_guides':continue
 for pr in g['meshes'][n['mesh']]['primitives']:
  v=read(pr['attributes']['POSITION']);f=read(pr['indices']).reshape(-1,3)
  # Reservation box was below 0.32 m; keep the circular pressure-door seat geometry.
  ctr=v[f].mean(1);keep=~((ctr[:,0]>-39.97)&(ctr[:,0]<-27.03)&(ctr[:,1]<.33))
  pr['indices']=M.access(f[keep],'SCALAR',5125,34963)
for side,rail in [(1,.50),(-1,.72)]:
 for ss in [-1,1]:M.add('Receiving_track',boxmesh((-33.5,rail-.115,side*GZ+ss*.8),(12.85,.025,.11)),metal,gar)
# Raise the ENTIRE pool unit, keeping its water depth; do not hide or flatten its basin.
POOL_LIFT=.42
pool_names={'FIXED_Main_deck__tile','FIXED_Main_deck__white','FIXED_Main_deck__water','FIXED_Main_deck__chrome','FIXED_Main_deck__Shadow_gaps'}
actual_bottom=None
for name in pool_names:
 n=g['nodes'][index[name]]
 for pr in g['meshes'][n['mesh']]['primitives']:
  v=read(pr['attributes']['POSITION']);v[:,1]+=POOL_LIFT
  pr['attributes']['POSITION']=M.access(v,'VEC3',target=34962)
  if name.endswith('__tile'):actual_bottom=float(v[:,1].min())
for j in range(3):
 M.add('Raised_pool_step',boxmesh((-35.17+.28*j,5.70+.18*j-.04,0),(.30,.08,4.65),.025),pearl,index['FIXED_Main_deck'])
# Update existing translations in the glTF clip. Geometry does not shrink or swap.
ani=g['animations'][0]
for ch in ani['channels']:
 ni=ch['target']['node'];name=g['nodes'][ni]['name'];kind=ch['target']['path'];sa=ani['samplers'][ch['sampler']];times=read(sa['input']).ravel()/48
 if kind=='translation' and name in paths:
  vals=np.asarray([paths[name](float(t)) for t in times]);sa['output']=M.access(vals,'VEC3');g['nodes'][ni]['translation']=vals[0].tolist()
 elif kind=='translation' and name.startswith('MOV_Pool_cover_'):
  vals=read(sa['output']);vals[:,1]+=POOL_LIFT;sa['output']=M.access(vals,'VEC3');g['nodes'][ni]['translation']=vals[0].tolist()
 elif kind=='rotation' and name.startswith('MOV_Garage_door_'):
  vals=np.array([quat([0,0,1],-1.5*smooth(.005,.055,t)*(1-smooth(.39,.445,t))) for t in times]);sa['output']=M.access(vals,'VEC4')
# 241 temporal samples of axial insertion; screen only geometry inside the cylindrical barrel.
sweeps=[]
for label,(v,cv,path,car) in geometry.items():
 gaps=[];count=0;endfit=True
 for p in np.linspace(0,1,241):
  for tag,pts,fn in [('craft',v,path),('carrier',cv,car)]:
   if tag=='craft' and p<(.13 if label=='Chase' else .24):continue
   world=pts+fn(float(p));inside=(world[:,0]>=GA)&(world[:,0]<=GB)
   if inside.any():
    radial=np.linalg.norm(world[inside,1:3]-[GY,2.5 if label=='Chase' else -2.5],axis=1)
    gaps.append(float(GI-radial.max()));count+=1
 sweeps.append({'craft':label,'samples':241,'evaluated_sections':count,'minimum_in_barrel_radial_clearance_m':min(gaps),'cylindrical_barrel_screen_passed':min(gaps)>0,'scope':'Aligned craft capture through insertion, plus empty-carrier deployment; cylindrical barrel only. Free approach, outer aperture, closure sweep, waves, support deflection and full-system contact excluded.'})
# Attach new geometry without replacing original animation or fixed accommodation.
for (pa,ma),arr in M.parts.items():
 vv=[];ff=[];nn=[];off=0
 for name,v,f,n in arr:vv.append(v);ff.append(f+off);nn.append(n);off+=len(v)
 v=np.concatenate(vv);f=np.concatenate(ff);n=np.concatenate(nn)
 prim={'attributes':{'POSITION':M.access(v,'VEC3',target=34962),'NORMAL':M.access(n,'VEC3',target=34962)},'indices':M.access(f,'SCALAR',5125,34963),'material':ma}
 node=M.node(g['nodes'][pa]['name']+'__R9_'+g['materials'][ma]['name'].replace(' ','_'),pa);g['nodes'][node]['mesh']=len(g['meshes']);g['meshes'].append({'primitives':[prim]})
# Discard orphan scene nodes, meshes and unused accessors/binary data before export.
reachable=set()
def visit(i):
 if i in reachable:return
 reachable.add(i)
 for c in g['nodes'][i].get('children',[]):visit(c)
for sc in g['scenes']:
 for i in sc['nodes']:visit(i)
nodeids=sorted(reachable);nm={i:j for j,i in enumerate(nodeids)}
for a in g['animations']:
 a['channels']=[ch for ch in a['channels'] if ch['target']['node'] in reachable]
 for ch in a['channels']:ch['target']['node']=nm[ch['target']['node']]
g['nodes']=[g['nodes'][i] for i in nodeids]
for n in g['nodes']:
 if 'children' in n:n['children']=[nm[c] for c in n['children']]
for sc in g['scenes']:sc['nodes']=[nm[c] for c in sc['nodes']]
meshids=sorted({n['mesh'] for n in g['nodes'] if 'mesh'in n});mm={i:j for j,i in enumerate(meshids)}
g['meshes']=[g['meshes'][i] for i in meshids]
for n in g['nodes']:
 if 'mesh'in n:n['mesh']=mm[n['mesh']]
used=set()
for mesh in g['meshes']:
 for pr in mesh['primitives']:used.update(pr['attributes'].values());used.add(pr['indices'])
for a in g['animations']:
 for sa in a['samplers']:used.update([sa['input'],sa['output']])
ams={old:new for new,old in enumerate(sorted(used))};newacc=[];newviews=[];binary=bytearray()
for old in sorted(used):
 ac=copy.deepcopy(g['accessors'][old]);view=copy.deepcopy(g['bufferViews'][ac['bufferView']]);binary.extend(b'\0'*(-len(binary)%4));offset=len(binary);start=view.get('byteOffset',0);binary.extend(M.buf[start:start+view['byteLength']]);view['byteOffset']=offset;ac['bufferView']=len(newviews);newviews.append(view);newacc.append(ac)
for mesh in g['meshes']:
 for pr in mesh['primitives']:pr['attributes']={k:ams[v] for k,v in pr['attributes'].items()};pr['indices']=ams[pr['indices']]
for a in g['animations']:
 for sa in a['samplers']:sa['input']=ams[sa['input']];sa['output']=ams[sa['output']]
g['accessors']=newacc;g['bufferViews']=newviews;g['buffers'][0]['byteLength']=len(binary)
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);binary.extend(b'\0'*(-len(binary)%4));total=28+len(js)+len(binary)
(OUT/'ATLAS_D_R9.glb').write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
report.update(revision=9,title='ATLAS D / Measured fit revision',engineering_validated=False,certified_depth_m=None)
report['previous_recovery_hardware_checks']=oldchecks
report['recovery_hardware_checks']=newchecks;report['axial_insertion_screens']=sweeps;report['support_pad_samples']=support_checks
report['pool_revision']={'unit_lift_m':POOL_LIFT,'lowest_basin_underside_m':actual_bottom,'garage_crown_m':4.75,'vertical_envelope_clearance_m':actual_bottom-4.75,'water_depth_preserved':True,'access_steps_added':3,'structural_clearance_validated':False}
report['resolved_geometric_issues']=['Broad recovery platforms replaced by narrow carriers with keel slots and outside-hull end ties.','Pool unit raised 0.42 m; modeled water depth retained and three access steps added.','Tenders now lift and align outside the candidate bore before straight axial insertion; outer doors close afterward.']
report['open_design_issues']=[q for q in report['open_design_issues'] if q['item'] not in ['Pool / dry garage overlap','R7 recovery cradles do not fit cylindrical garage bores']]
report['open_design_issues'].insert(2,{'severity':'UNRESOLVED','item':'Carrier loads and full deployment path','detail':'Positive bore clearance is a selected geometric screen, not allowance for deflection, tolerances, waves, operating personnel or complete machinery clearance. Carrier / craft support contacts and pressure door mechanics require engineering.'})
report['changes']=report['resolved_geometric_issues'];report['assets']['glb_bytes']=total
for f in ['arrangement.json','model_report.json']:(OUT/f).write_text(json.dumps(report,indent=2))
assert all(x['fits_candidate_bore'] for x in newchecks),newchecks
assert all(x['cylindrical_barrel_screen_passed'] for x in sweeps),sweeps
assert actual_bottom>4.75
print(json.dumps({'new_carriers':newchecks,'sweeps':sweeps,'pool':report['pool_revision'],'bytes':total},indent=2))
