"""Build a continuous-geometry ATLAS D motion study from the existing GLB.
No engineering verification is asserted. All animated parts use rigid transforms.
"""
from pathlib import Path
import json, struct, copy, math, os
import numpy as np
ROOT=Path(os.getenv('ATLAS_REV_ROOT',str(Path(__file__).resolve().parent.parent)))
OUT=ROOT/'site';OUT.mkdir(exist_ok=True)
raw=Path(os.getenv('ATLAS_INPUT_GLB',str(ROOT/'source/ATLAS_D_Source.glb'))).read_bytes()
jlen=struct.unpack_from('<I',raw,12)[0]
g= json.loads(raw[20:20+jlen]); binary=bytearray(raw[28+jlen:])
old_nodes=copy.deepcopy(g['nodes']);g['nodes']=[];g['scenes']=[{'name':'ATLAS D | Continuous Vessel','nodes':[]}];g['scene']=0
# Strip all detached alternative-envelope meshes from the usable scene.
g.pop('animations',None);g['asset']['generator']='ATLAS D continuous-vessel revision; source Blender glTF'
g['asset']['copyright']='ATLAS concept study. Visualization only; not a pressure-vessel or naval architecture design.'

def append_acc(data,kind,ctype=5126,target=None):
    dtype={5126:'<f4',5125:'<u4'}[ctype];a=np.ascontiguousarray(data,dtype=dtype)
    binary.extend(b'\x00'*((-len(binary))%4));offset=len(binary);binary.extend(a.tobytes())
    view={'buffer':0,'byteOffset':offset,'byteLength':a.nbytes}
    if target:view['target']=target
    vi=len(g['bufferViews']);g['bufferViews'].append(view)
    acc={'bufferView':vi,'componentType':ctype,'count':len(a),'type':kind}
    if kind in ('SCALAR','VEC3'):
        ar=a.reshape(len(a),-1);acc.update(min=ar.min(axis=0).tolist(),max=ar.max(axis=0).tolist())
    idx=len(g['accessors']);g['accessors'].append(acc);return idx

def read_acc(idx):
    a=g['accessors'][idx];v=g['bufferViews'][a['bufferView']]
    dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    o=v.get('byteOffset',0)+a.get('byteOffset',0)
    if 'byteStride' in v:
        return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=o,strides=(v['byteStride'],np.dtype(dtype).itemsize)).copy()
    return np.frombuffer(binary,dtype=dtype,count=a['count']*n,offset=o).copy().reshape(a['count'],n)

def node(name,**kw):
    idx=len(g['nodes']);g['nodes'].append(dict(name=name,**kw));return idx

def material(name,color,metal=.3,rough=.4):
    idx=len(g['materials']);g['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*color,1],'metallicFactor':metal,'roughnessFactor':rough}});return idx
silver=material('Closure | pearl',[.57,.64,.67],.64,.34)
dark=material('Mechanism | graphite',[.025,.044,.055],.58,.34)
teak=material('Cover | teak',[.35,.22,.115],.1,.6)
blue=material('Dive planes',[.045,.085,.115],.6,.33)

def box_mesh(dims,mat):
    x,y,z=np.array(dims)/2
    faces=[([(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)],(0,0,1)), ([(x,-y,-z),(-x,-y,-z),(-x,y,-z),(x,y,-z)],(0,0,-1)),
     ([(x,-y,z),(x,-y,-z),(x,y,-z),(x,y,z)],(1,0,0)),([(-x,-y,-z),(-x,-y,z),(-x,y,z),(-x,y,-z)],(-1,0,0)),
     ([(-x,y,z),(x,y,z),(x,y,-z),(-x,y,-z)],(0,1,0)),([(-x,-y,-z),(x,-y,-z),(x,-y,z),(-x,-y,z)],(0,-1,0))]
    vs=[];ns=[];ids=[]
    for coords,n in faces:
        k=len(vs);vs.extend(coords);ns.extend([n]*4);ids.extend([k,k+1,k+2,k,k+2,k+3])
    prim={'attributes':{'POSITION':append_acc(vs,'VEC3',target=34962),'NORMAL':append_acc(ns,'VEC3',target=34962)},'indices':append_acc(np.array(ids).reshape(-1,1),'SCALAR',5125,34963),'material':mat}
    mi=len(g['meshes']);g['meshes'].append({'name':'Rigid part','primitives':[prim]});return mi

vessel=node('Vessel',children=[]);fleet=node('Surface_tenders',children=[])
g['scenes'][0]['nodes']=[vessel,fleet]
rigs={};tracks=[];duration=26.0;times=np.linspace(0,duration,261)

def smooth(a,b,p):
    t=max(0,min(1,(p-a)/(b-a)));return t*t*(3-2*t)

def anim(idx,path,fun):
    vals=np.array([fun(t/duration) for t in times],np.float32)
    tracks.append((idx,path,vals));g['nodes'][idx][path]=vals[0].tolist()

def pivot(name,where,parent=vessel):
    pi=node(name,translation=list(where),children=[]);g['nodes'][parent]['children'].append(pi)
    child=node(name+'_coordinates',translation=(-np.array(where)).tolist(),children=[])
    g['nodes'][pi]['children'].append(child);return pi,child

mast,mastlocal=pivot('Mast_hinge',[-3.0,16.035,0])
rails=node('Retractable_guardrails',children=[]);g['nodes'][vessel]['children'].append(rails)
pooll=node('Pool_ladder_retraction',children=[]);g['nodes'][vessel]['children'].append(pooll)

# Split the hardtop away from radar/antennae: the roof never folds with the mast.
for old in old_nodes:
    name=old['name']
    if name.startswith('D_') or name.startswith('S_Rails'):continue
    if name=='S_Mast__white':
        primitive=g['meshes'][old['mesh']]['primitives'][0]
        positions=read_acc(primitive['attributes']['POSITION']);faces=read_acc(primitive['indices']).reshape(-1,3)
        moving=positions[faces,1].mean(axis=1)>16.04
        for label,selection,parent in [('Fixed_hardtop',~moving,vessel),('Mast_radomes',moving,mastlocal)]:
            pp=copy.deepcopy(primitive);pp['indices']=append_acc(faces[selection].reshape(-1,1),'SCALAR',5125,34963)
            mi=len(g['meshes']);g['meshes'].append({'name':label,'primitives':[pp]})
            ni=node(label,mesh=mi);g['nodes'][parent]['children'].append(ni)
        continue
    ni=node(name,**{k:v for k,v in old.items() if k!='name'})
    parent=fleet if name.startswith('S_Fleet') else rails if name.startswith('S_Rails') else mastlocal if name=='S_Mast__graphite' else pooll if name=='S_Deck__chrome' else vessel
    g['nodes'][parent]['children'].append(ni)

# Tenders remain at sea level; only the vessel descends.
anim(vessel,'translation',lambda p:[0,-40*smooth(.70,1,p),0])
anim(fleet,'translation',lambda p:[115*smooth(0,.16,p),0,45*smooth(0,.16,p)])
# Separate guardrails fold onto the deck instead of sinking through cabin glazing.
def footprint(a,b,w):
    return np.array([(a,-w*.76),(a+.65,-w),(b-7,-w),(b-2.3,-w*.72),(b,-w*.32),(b,w*.32),(b-2.3,w*.72),(b-7,w),(a+.65,w),(a,w*.76)])
railglass=next(i for i,m in enumerate(g['materials']) if m['name']=='railglass')
for di,(poly,y) in enumerate([(footprint(-34.6,30.5,6.57),5.54),(footprint(-29.6,24.4,6.05),8.69),(footprint(-23.3,17.5,5.31),11.69),(footprint(-15.7,9,4.37),14.57),(np.array([(23,-5.80),(32,-4.67),(38,-2.82),(40.9,0),(38,2.82),(32,4.67),(23,5.80)]),6.23)]):
    center=poly.mean(axis=0)
    for ei in range(len(poly)):
        a=poly[ei];b=poly[(ei+1)%len(poly)];dist=float(np.linalg.norm(b-a));n=max(1,math.ceil(dist/3.3))
        for si in range(n):
            aa=a+(b-a)*si/n;bb=a+(b-a)*(si+1)/n;mid=(aa+bb)/2;dv=(bb-aa)/np.linalg.norm(bb-aa);length=dist/n-.075
            angle=math.atan2(-dv[1],dv[0]);inward=np.array([-dv[1],dv[0]]);sign=1 if np.dot(center-mid,inward)>0 else -1
            base=node(f'Guardrail_base_{di}_{ei}_{si}',translation=[float(mid[0]),y,float(mid[1])],rotation=[0,math.sin(angle/2),0,math.cos(angle/2)],children=[]);g['nodes'][rails]['children'].append(base)
            hinge=node(f'Guardrail_hinge_{di}_{ei}_{si}',children=[]);g['nodes'][base]['children'].append(hinge)
            bars=[]
            for dims,loc in [([length,.045,.045],[0,.99,0]),([.043,.99,.043],[-length/2,.495,0]),([.043,.99,.043],[length/2,.495,0])]:
                temp=box_mesh(dims,silver);pp=g['meshes'][temp]['primitives'][0];bars.append((read_acc(pp['attributes']['POSITION'])+loc,read_acc(pp['attributes']['NORMAL']),read_acc(pp['indices'])))
            vv=[];nn=[];ff=[]
            for vs,ns,fs in bars:
                ff.extend((fs+len(vv)).reshape(-1).tolist());vv.extend(vs.tolist());nn.extend(ns.tolist())
            prim={'attributes':{'POSITION':append_acc(vv,'VEC3',target=34962),'NORMAL':append_acc(nn,'VEC3',target=34962)},'indices':append_acc(np.array(ff).reshape(-1,1),'SCALAR',5125,34963),'material':silver}
            mi=len(g['meshes']);g['meshes'].append({'name':'Hinged chrome guardrail','primitives':[prim]})
            bar=node('Guardrail_frame',mesh=mi);g['nodes'][hinge]['children'].append(bar)
            glass=node('Guardrail_glass',mesh=box_mesh([max(.1,length-.15),.72,.016],railglass),translation=[0,.51,0]);g['nodes'][hinge]['children'].append(glass)
            anim(hinge,'rotation',lambda p,sign=sign:[math.sin(sign*math.pi/4*smooth(.12,.34,p)),0,0,math.cos(sign*math.pi/4*smooth(.12,.34,p))])

anim(pooll,'translation',lambda p:[0,-.64*smooth(.12,.29,p),0])
anim(mast,'rotation',lambda p:[0,0,math.sin(-math.pi/4*smooth(.16,.35,p)),math.cos(-math.pi/4*smooth(.16,.35,p))])
# Pivot bearings and cradle are permanently visible.
for z in [-.64,.64]:
    ni=node('Mast_hinge_bearing',mesh=box_mesh([.34,.24,.22],silver),translation=[-3,16.14,z]);g['nodes'][vessel]['children'].append(ni)
ni=node('Mast_fold_cradle',mesh=box_mesh([2.8,.09,1.05],dark),translation=[-.8,16.09,0]);g['nodes'][vessel]['children'].append(ni)

# Linked, constant-size roll-top slats follow an explicit coil -> track path.
def rolling_cover(name,x0,y0,L,W,base_radius,k,a,b,pitch):
    count=math.ceil(L/pitch);pitch=L/count;slat=box_mesh([pitch*.96,.033,W],teak)
    for i in range(count):
        ni=node(f'{name}_slat_{i:02}',mesh=slat);g['nodes'][vessel]['children'].append(ni)
        def pose(p,i=i):
            s=L*smooth(a,b,p)-(i+.5)*pitch
            if s>=0:return [x0-s,y0,0],0
            length=-s;angle=(-base_radius+math.sqrt(base_radius**2+2*k*length))/k
            r=base_radius+k*angle
            return [x0+r*math.sin(angle),y0+base_radius-r*math.cos(angle),0],angle
        anim(ni,'translation',lambda p,pose=pose:pose(p)[0])
        anim(ni,'rotation',lambda p,pose=pose:[0,0,math.sin(pose(p)[1]/2),math.cos(pose(p)[1]/2)])
    # An opaque roller cassette and actual longitudinal guide tracks.
    rmax=base_radius+k*((-base_radius+math.sqrt(base_radius**2+2*k*L))/k)
    for z in [-W/2-.04,W/2+.04]:
        ni=node(name+'_guide',mesh=box_mesh([L,.065,.095],silver),translation=[x0-L/2,y0-.018,z]);g['nodes'][vessel]['children'].append(ni)
    ni=node(name+'_cassette',mesh=box_mesh([2*rmax+.10,2*rmax+.09,W+.21],silver),translation=[x0,y0+base_radius,0]);g['nodes'][vessel]['children'].append(ni)
rolling_cover('Pool_cover',-26.99,5.71,7.06,5.13,.24,.007,.33,.52,.22)
rolling_cover('Spa_cover',-1.64,15.19,3.32,3.30,.10,.003,.37,.54,.13)

# A separate hatch with a visible hinge: it closes rather than dissolving.
# Aft access on the main saloon bulkhead, viewed in the stern preset.
hatch=node('Aft_access_hatch',translation=[-25.38,5.66,.74],children=[]);g['nodes'][vessel]['children'].append(hatch)
hatchleaf=node('Aft_access_leaf',mesh=box_mesh([.08,1.91,1.44],silver),translation=[0,.955,-.72]);g['nodes'][hatch]['children'].append(hatchleaf)
handle=node('Hatch_dog_handle',mesh=box_mesh([.10,.12,.38],dark),translation=[-.095,.95,-1.12]);g['nodes'][hatch]['children'].append(handle)
anim(hatch,'rotation',lambda p:[0,math.sin(-math.radians(82)*(1-smooth(.49,.61,p))/2),0,math.cos(-math.radians(82)*(1-smooth(.49,.61,p))/2)])
# Ballast vent gates: same plates slide along external guides, not a new skin.
for side in [-1,1]:
    for x in [-18,-4,10]:
        ni=node('Ballast_vent_gate',mesh=box_mesh([1.18,.08,.45],dark),translation=[x,5.60,side*6.30]);g['nodes'][vessel]['children'].append(ni)
        anim(ni,'translation',lambda p,x=x,side=side:[x-.58*(1-smooth(.58,.67,p)),5.60,side*6.30])
    # Foldout foreplanes articulate around a visible root below the waterline.
    plane=node('Port_foreplane' if side>0 else 'Starboard_foreplane',translation=[24,-.70,side*5.55],children=[]);g['nodes'][vessel]['children'].append(plane)
    child=node('Foreplane_rigid_leaf',mesh=box_mesh([3.8,.13,2.8],blue),translation=[-.65,0,side*1.42]);g['nodes'][plane]['children'].append(child)
    anim(plane,'rotation',lambda p,side=side:[math.sin(side*math.pi/4*(1-smooth(.61,.70,p))),0,0,math.cos(side*math.pi/4*(1-smooth(.61,.70,p)))])

# One real animation is embedded in the downloadable GLB, independent of the viewer.
timeacc=append_acc(times.reshape(-1,1),'SCALAR');animation={'name':'ATLAS_D_dive_sequence','samplers':[],'channels':[]}
for ni,path,values in tracks:
    valueacc=append_acc(values,'VEC4' if path=='rotation' else 'VEC3')
    si=len(animation['samplers']);animation['samplers'].append({'input':timeacc,'output':valueacc,'interpolation':'LINEAR'})
    animation['channels'].append({'sampler':si,'target':{'node':ni,'path':path}})
g['animations']=[animation]
g['extras']={'revision':'Continuous Vessel / 02','duration_seconds':duration,'concept_only':True,'fixed_hull':True,'stages':[{'end':.16,'title':'Clear the exterior'},{'end':.35,'title':'Stow mast and guardrails'},{'end':.54,'title':'Close pool and spa covers'},{'end':.70,'title':'Close access / deploy foreplanes'},{'end':1,'title':'Controlled submergence'}], 'limitations':['No pressure or stability validation','No whole-vessel collision certification','Original alternative submarine envelope is not instantiated','Tenders remain on the surface','Upper decks remain structurally fixed']}
# Compact dead alternative geometry and unused binary data for the export.
used_meshes=sorted({n['mesh'] for n in g['nodes'] if 'mesh' in n});mm={m:i for i,m in enumerate(used_meshes)}
g['meshes']=[g['meshes'][m] for m in used_meshes]
for n in g['nodes']:
    if 'mesh' in n:n['mesh']=mm[n['mesh']]
# Accessor compaction would not improve render cost; retain offsets for exact source geometry.
binary.extend(b'\x00'*((-len(binary))%4));g['buffers']=[{'byteLength':len(binary)}]
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
result=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
(OUT/'ATLAS_D_Continuous_Dive.glb').write_bytes(result)
report={'revision':'02','name':'ATLAS D | Continuous Vessel','bytes':len(result),'nodes':len(g['nodes']),'animation_channels':len(tracks),'duration_seconds':duration,'rigid_motion_only':True,'hull_swap':False,'engineering_validated':False}
(OUT/'model_report.json').write_text(json.dumps(report,indent=2))
(ROOT/'source'/'rig_manifest.json').write_text(json.dumps(g['extras'],indent=2))
print(json.dumps(report,indent=2))
