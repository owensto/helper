"""Assemble the linked fishing tender into a preserved R10-derived yacht.
All measurements are geometric screening of indicated meshes, not safe clearances.
"""
from pathlib import Path
import json,struct,copy,os,math
import numpy as np
from scipy.spatial.transform import Rotation,Slerp
from build_fleet import Builder,ROOT,OUT,SITE,smooth

class Doc:
 def __init__(self,path=None):
  if path:
   b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];self.g=json.loads(b[20:20+n]);self.b=bytearray(b[28+n:])
  else:self.g={};self.b=bytearray()
 def rd(self,i):
  a=self.g['accessors'][i];v=self.g['bufferViews'][a['bufferView']];d={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],k),d,buffer=self.b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(d).itemsize*k),np.dtype(d).itemsize)).copy()
 def acc(self,arr,kind='VEC3',ct=5126):
  k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[kind];a=np.array(arr,dtype={5126:'<f4',5125:'<u4'}[ct]).reshape(-1,k);self.b.extend(b'\0'*(-len(self.b)%4));bv=len(self.g['bufferViews']);self.g['bufferViews'].append({'buffer':0,'byteOffset':len(self.b),'byteLength':a.nbytes});self.b.extend(a.tobytes());ac={'bufferView':bv,'componentType':ct,'count':len(a),'type':kind}
  if kind in ['SCALAR','VEC3']:ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
  i=len(self.g['accessors']);self.g['accessors'].append(ac);return i
 def write(self,path):
  self.g['buffers']=[{'byteLength':len(self.b)}];js=json.dumps(self.g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);bi=bytes(self.b)+b'\0'*(-len(self.b)%4);Path(path).write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(bi))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(bi),0x004e4942)+bi)
 def node(self,name):return next(i for i,n in enumerate(self.g['nodes']) if n.get('name')==name)
 def descendants(self,root):
  out=[root]
  for i in out:out.extend(self.g['nodes'][i].get('children',[]))
  return out
 def world(self,t=0):
  ns=copy.deepcopy(self.g['nodes'])
  for an in self.g.get('animations',[]):
   for ch in an['channels']:
    s=an['samplers'][ch['sampler']];tt=self.rd(s['input']).ravel();vv=self.rd(s['output']);path=ch['target']['path'];i=ch['target']['node'];time=np.clip(t,tt[0],tt[-1])
    if path=='rotation':val=Slerp(tt,Rotation.from_quat(vv))([time]).as_quat()[0]
    else:val=np.array([np.interp(time,tt,vv[:,k]) for k in range(vv.shape[1])])
    ns[i][path]=val
  parents={c:i for i,n in enumerate(ns) for c in n.get('children',[])};cache={}
  def w(i):
   if i in cache:return cache[i]
   n=ns[i];T=np.eye(4)
   if 'matrix' in n:T=np.array(n['matrix']).reshape(4,4).T
   else:T[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));T[:3,3]=n.get('translation',[0,0,0])
   if i in parents:T=w(parents[i])@T
   cache[i]=T;return T
  for i in range(len(ns)):w(i)
  return cache
 def vertices(self,root=0,t=0):
  wt=self.world(t);vs=[]
  for i in self.descendants(root):
   n=self.g['nodes'][i]
   if 'mesh' not in n:continue
   for p in self.g['meshes'][n['mesh']]['primitives']:
    v=self.rd(p['attributes']['POSITION']);vs.append((np.c_[v,np.ones(len(v))]@wt[i].T)[:,:3])
  return np.concatenate(vs) if vs else np.empty((0,3))
 def append(self,other,parent,prefix=''):
  g=self.g;o=copy.deepcopy(other.g);offs={k:len(g.setdefault(k,[])) for k in ['nodes','meshes','materials','accessors','bufferViews','images','textures','samplers']}
  self.b.extend(b'\0'*(-len(self.b)%4));offset=len(self.b);self.b.extend(other.b)
  for v in o.get('bufferViews',[]):v['byteOffset']=v.get('byteOffset',0)+offset;v['buffer']=0
  for a in o.get('accessors',[]):a['bufferView']+=offs['bufferViews']
  for im in o.get('images',[]):
   if 'bufferView' in im:im['bufferView']+=offs['bufferViews']
  for tx in o.get('textures',[]):
   if 'source' in tx:tx['source']+=offs['images']
   if 'sampler' in tx:tx['sampler']+=offs['samplers']
  def texrefs(x):
   if isinstance(x,dict):
    for k,v in x.items():
     if 'texture' in k.lower() and isinstance(v,dict) and 'index' in v:v['index']+=offs['textures']
     else:texrefs(v)
   elif isinstance(x,list):
    for v in x:texrefs(v)
  for m in o.get('materials',[]):texrefs(m)
  for m in o.get('meshes',[]):
   m['name']=prefix+m.get('name','')
   for p in m['primitives']:
    p['attributes']={k:v+offs['accessors'] for k,v in p['attributes'].items()}
    if 'indices' in p:p['indices']+=offs['accessors']
    if 'material' in p:p['material']+=offs['materials']
  for n in o['nodes']:
   n['name']=prefix+n.get('name','Node');n['children']=[i+offs['nodes'] for i in n.get('children',[])]
   if 'mesh' in n:n['mesh']+=offs['meshes']
  roots=[i+offs['nodes'] for i in o['scenes'][o.get('scene',0)]['nodes']];g['nodes'][parent].setdefault('children',[]).extend(roots)
  for k in offs:g[k].extend(o.get(k,[]))
  tracks=[]
  for an in o.get('animations',[]):
   for ch in an['channels']:
    sa=copy.deepcopy(an['samplers'][ch['sampler']]);sa['input']+=offs['accessors'];sa['output']+=offs['accessors'];tar=copy.deepcopy(ch['target']);tar['node']+=offs['nodes'];tracks.append((sa,tar))
  for e in o.get('extensionsUsed',[]):
   if e not in g.setdefault('extensionsUsed',[]):g['extensionsUsed'].append(e)
  return roots,tracks
 def compact(self):
  # Trim orphaned old tender meshes, animation channels, and unused byte ranges.
  g=self.g;roots=g['scenes'][g.get('scene',0)]['nodes'];nodes=sorted(set(x for i in roots for x in self.descendants(i)));nr={i:j for j,i in enumerate(nodes)}
  meshes=sorted(set(g['nodes'][i]['mesh'] for i in nodes if 'mesh' in g['nodes'][i]));mr={i:j for j,i in enumerate(meshes)}
  mats=sorted(set(p.get('material',0) for i in meshes for p in g['meshes'][i]['primitives']));mm={i:j for j,i in enumerate(mats)}
  ac=set()
  for i in meshes:
   for p in g['meshes'][i]['primitives']:ac.update(p['attributes'].values());ac.add(p['indices'])
  anis=[]
  for a in g.get('animations',[]):
   an={'name':a.get('name','Motion'),'channels':[],'samplers':[]}
   for c in a['channels']:
    if c['target']['node'] not in nr:continue
    s=copy.deepcopy(a['samplers'][c['sampler']]);ac.update([s['input'],s['output']]);ch=copy.deepcopy(c);ch['sampler']=len(an['samplers']);ch['target']['node']=nr[ch['target']['node']];an['samplers'].append(s);an['channels'].append(ch)
   if an['channels']:anis.append(an)
  ac=sorted(ac);ar={i:j for j,i in enumerate(ac)};tex=set()
  def refs(x,fn):
   if isinstance(x,dict):
    for k,v in x.items():
     if 'texture' in k.lower() and isinstance(v,dict) and 'index' in v:fn(v)
     else:refs(v,fn)
   elif isinstance(x,list):
    for v in x:refs(v,fn)
  for i in mats:refs(g['materials'][i],lambda v:tex.add(v['index']))
  tx=sorted(tex);tr={i:j for j,i in enumerate(tx)};ims=sorted(set(g['textures'][i]['source'] for i in tx));ir={i:j for j,i in enumerate(ims)}
  ss=sorted(set(g['textures'][i]['sampler'] for i in tx if 'sampler' in g['textures'][i]));sr={i:j for j,i in enumerate(ss)}
  bs=sorted(set(g['accessors'][i]['bufferView'] for i in ac)|set(g['images'][i]['bufferView'] for i in ims if 'bufferView' in g['images'][i]));br={i:j for j,i in enumerate(bs)}
  ng={k:copy.deepcopy(v) for k,v in g.items() if k not in ['nodes','meshes','materials','accessors','bufferViews','buffers','animations','images','textures','samplers','scenes','scene']}
  ng.update(scene=0,scenes=[{'name':g['scenes'][0].get('name','ATLAS'),'nodes':[nr[i] for i in roots]}])
  ng['nodes']=[copy.deepcopy(g['nodes'][i]) for i in nodes]
  for n in ng['nodes']:
   n['children']=[nr[i] for i in n.get('children',[]) if i in nr]
   if 'mesh' in n:n['mesh']=mr[n['mesh']]
  ng['meshes']=[copy.deepcopy(g['meshes'][i]) for i in meshes]
  for m in ng['meshes']:
   for p in m['primitives']:p['attributes']={k:ar[v] for k,v in p['attributes'].items()};p['indices']=ar[p['indices']];p['material']=mm[p.get('material',0)]
  ng['materials']=[copy.deepcopy(g['materials'][i]) for i in mats]
  for m in ng['materials']:refs(m,lambda v:v.update(index=tr[v['index']]))
  ng['accessors']=[copy.deepcopy(g['accessors'][i]) for i in ac]
  for a in ng['accessors']:a['bufferView']=br[a['bufferView']]
  ng['bufferViews']=[];nb=bytearray()
  for i in bs:
   v=copy.deepcopy(g['bufferViews'][i]);start=v.get('byteOffset',0);blob=self.b[start:start+v['byteLength']];nb.extend(b'\0'*(-len(nb)%4));v['byteOffset']=len(nb);v['buffer']=0;nb.extend(blob);ng['bufferViews'].append(v)
  ng['images']=[copy.deepcopy(g['images'][i]) for i in ims]
  for im in ng['images']:
   if 'bufferView' in im:im['bufferView']=br[im['bufferView']]
  ng['textures']=[copy.deepcopy(g['textures'][i]) for i in tx]
  for t in ng['textures']:
   t['source']=ir[t['source']]
   if 'sampler' in t:t['sampler']=sr[t['sampler']]
  ng['samplers']=[copy.deepcopy(g['samplers'][i]) for i in ss]
  for an in anis:
   for s in an['samplers']:s['input']=ar[s['input']];s['output']=ar[s['output']]
  if anis:ng['animations']=anis
  self.g=ng;self.b=nb


def assemble():
 basepath=Path(os.getenv('ATLAS_D_BASE',ROOT/'base/r10/viewer/ATLAS_D_R10.glb'));d=Doc(basepath)
 # Export an independent exact chase geometry asset.
 chase=Doc(basepath);ci=chase.node('MOV_Tender_Chase');chase.g['scenes']=[{'name':'ATLAS Chase 12','nodes':[ci]}];chase.g['scene']=0;chase.g['nodes'][ci]['translation']=[0,0,0];chase.g['nodes'][ci]['rotation']=[0,0,0,1];chase.g.pop('animations',None);chase.compact();chase.write(OUT/'ATLAS_Chase_12.glb')
 bay=Doc(OUT/'ATLAS_Bay_25.glb');util=d.node('MOV_Tender_Utility');d.g['nodes'][util]['children']=[];d.g['nodes'][util]['extras']={'new_craft':'ATLAS Bay 25','replaces':'former utility tender','fixed_t_top':True}
 roots,tracks=d.append(bay,util,'Bay25_');d.g['nodes'][roots[0]]['name']='Bay25_Master'
 animation=d.g['animations'][0];animation['name']='Explorer - secure fishing equipment - recover tenders - transform - dive'
 # Stretch inherited 48 s animation to 72 s without changing its geometric paths.
 changed=set()
 for s in animation['samplers']:
  if s['input'] not in changed:
   old=s['input'];val=d.rd(old)*1.5;new=d.acc(val,'SCALAR');
   for sm in animation['samplers']:
    if sm['input']==old:sm['input']=new
   changed.add(new)
 for sa,tar in tracks:
  sa['input']=d.acc(d.rd(sa['input'])*.78,'SCALAR');idx=len(animation['samplers']);animation['samplers'].append(sa);animation['channels'].append({'sampler':idx,'target':tar})
 # Resolve a height for the COMPLETE fishing craft in the existing candidate bore.
 vb=bay.vertices(0,60);center_y=2.4;radius=2.18
 candidates=np.linspace(.9,1.45,221);clear=np.array([radius-np.linalg.norm(vb[:,1:3]+[lift-center_y,0],axis=1).max() for lift in candidates]);best=float(candidates[np.argmax(clear)])
 # Bias height to a rounded reproducible setting, checked below.
 lift=round(best,3)
 for ch in animation['channels']:
  if ch['target']['node']==util and ch['target']['path']=='translation':
   sa=animation['samplers'][ch['sampler']];v=d.rd(sa['output']);v[:,1]*=lift/1.544;sa['output']=d.acc(v)
 # Replace carrier with a new original narrow assembly, keeping the existing axial transfer animation.
 cb=Builder('Bay 25 carrier / geometric reservation');frame=cb.group('Carrier_Frame')
 for z in [-.73,.73]:
  cb.box('Longitudinal rail',[-.48,.05,z],[8.26,.13,.16],'chrome',frame,.02)
  for x in [-3.2,-1.7,-.2,1.3,2.8]:
   cb.cyl('Carrier roller',[x,.12,z],.075,.13,'black',frame,'z',20)
   cb.box('Support bracket',[x,.36,z],[.11,.43,.11],'silver',frame,.017)
   cb.box('Hull support pad',[x,.61,z],[.36,.10,.20],'black',frame,.022)
 for x in [-4.58,3.63]:cb.box('End tie outside hull',[x,.065,0],[.13,.13,1.65],'silver',frame,.025)
 cb.save('Bay_Carrier.glb',60);car=d.node('MOV_Cradle_Utility');d.g['nodes'][car]['children']=[];d.append(Doc(OUT/'Bay_Carrier.glb'),car,'BayCarrier_')
 for ch in animation['channels']:
  if ch['target']['node']==car and ch['target']['path']=='translation':
   sa=animation['samplers'][ch['sampler']];v=d.rd(sa['output']);v[:,1]+=(.50-.544);sa['output']=d.acc(v)
 # Add readable furnished lounge details to the fixed dry interior, not moving skins.
 interior=Builder('Explorer permanent accommodation furnishing');grp=interior.group('INT_Explorer_furnishing')
 for x,z in [(-16.2,-1.75),(-16.2,1.75)]:
  interior.box('Observation sofa',[x,1.43,z],[3.9,.68,1.0],'fabric',grp,.15);interior.box('Sofa back',[x,1.94,z+.38*np.sign(z)],[3.9,.82,.20],'fabric',grp,.1)
 interior.box('Observation coffee table',[-15.4,1.55,0],[2.4,.12,.85],'wood',grp,.11)
 for x in [-17.5,-14.6]:interior.cyl('Table base',[x,1.23,0],.18,.48,'chrome',grp)
 interior.box('Owner king mattress',[20.4,1.62,-.66],[2.1,.30,1.94],'fabric',grp,.12);interior.box('Owner bed platform',[20.4,1.34,-.66],[2.2,.30,2.04],'wood',grp,.1)
 for z in [-1.2,-.2]:interior.box('Owner pillows',[19.8,1.86,z],[.58,.17,.81],'white',grp,.10)
 interior.box('Owner desk',[21.9,1.80,2.35],[1.40,.12,.60],'wood',grp,.05)
 interior.save('Interior_D.glb',60);d.append(Doc(OUT/'Interior_D.glb'),d.node('ENG_Upper'),'Explorer_')
 d.g['scenes'][0]['name']='ATLAS-D Explorer / Fleet 01 with Bay 25';d.g['asset']['generator']='ATLAS Fleet 01 / R10 preserved derivative with linked Bay 25';d.compact();d.write(OUT/'ATLAS_D.glb')
 # Updated selected screening. Every vertex in actual boat and carrier, at the recovered pose.
 util=d.node('MOV_Tender_Utility');car=d.node('MOV_Cradle_Utility');ttop=d.node('Bay25_FIXED_TTop')
 vcraft=d.vertices(util,72*.8);vcarrier=d.vertices(car,72*.8);radcraft=np.linalg.norm(vcraft[:,1:3]-[2.4,-2.5],axis=1);radcar=np.linalg.norm(vcarrier[:,1:3]-[2.4,-2.5],axis=1)
 valls=np.concatenate([vcraft,vcarrier]);aft=-40.2;fore=-27.2;rad=np.linalg.norm(valls[:,1:3]-[2.4,-2.5],axis=1)
 # Sample aligned insertion portion only, not full recovery or pressure-door sweep.
 gaps=[]
 for t in np.linspace(.295,.39,81)*72:
  vv=np.concatenate([d.vertices(util,t),d.vertices(car,t)]);vv=vv[(vv[:,0]>=aft)&(vv[:,0]<=fore)]
  if len(vv):gaps.append(float(radius-np.linalg.norm(vv[:,1:3]-[2.4,-2.5],axis=1).max()))
 report={'release':'ATLAS Fleet 01','date':'2026-10-07','source_r10_unchanged':True,'assets':['ATLAS_D','ATLAS_N','ATLAS_W','ATLAS_Bay_25','ATLAS_Chase_12'],'nominal_dimensions_m':{'D':[82.9,14.2],'N':[80,9],'W':[125,18],'Bay_hull':[7.5,2.6]},'fishing_tender':{'fixed_t_top':True,'t_top_not_scaled_or_removed':True,'outboard_included':True,'rods_stow_by_rigid_rotation':True,'secured_full_mesh_bounds_m':[vb.min(0).tolist(),vb.max(0).tolist()],'secured_full_mesh_dimensions_m':np.ptp(vb,axis=0).tolist(),'chosen_lift_m':lift,'stored_craft_radial_gap_m':float(radius-radcraft.max()),'stored_carrier_radial_gap_m':float(radius-radcar.max()),'combined_aft_gap_m':float(valls[:,0].min()-aft),'combined_forward_gap_m':float(fore-valls[:,0].max()),'sampled_aligned_insertion_minimum_gap_m':min(gaps),'samples':81,'geometric_barrel_containment_passed':bool(radius-rad.max()>0 and valls[:,0].min()>aft and valls[:,0].max()<fore)},'not_validated':['whole recovery path including outer styling apertures and closure sweeps','carrier contacts, structural loads, tolerances and wave motion','dry garage pressure resistance and surface opening freeboard','upper shell nesting against all installed services','whole vessel mass, stability, pressure rating, safe diving','naval combat, sensor or stealth performance'],'engineering_validated':False,'scope':'Visual models, selected geometric fit screen, original non-operational naval exterior representations'}
 (SITE/'release_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report['fishing_tender'],indent=2));return report
if __name__=='__main__':assemble()
