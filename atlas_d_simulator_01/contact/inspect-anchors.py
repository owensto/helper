"""Audit the exact original R7 GLB. No geometry modifications or inferred human anchors.
Usage: python inspect-anchors.py path/to/ATLAS_D_Original.glb evidence/anchor-audit.json
"""
from pathlib import Path
import hashlib, json, math, struct, sys
import numpy as np

EXPECTED='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'

def audit(path):
    raw=Path(path).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==EXPECTED, 'Refuse asset identity mismatch'
    magic,version,length=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and version==2 and length==len(raw)
    chunks={};offset=12
    while offset<len(raw):
        size,kind=struct.unpack_from('<II',raw,offset);offset+=8
        chunks[kind]=raw[offset:offset+size];offset+=size
    doc=json.loads(chunks[0x4e4f534a]);binary=chunks[0x004e4942]
    def accessor(index):
        a=doc['accessors'][index];b=doc['bufferViews'][a['bufferView']]
        dtype={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
        width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        start=b.get('byteOffset',0)+a.get('byteOffset',0)
        stride=b.get('byteStride',np.dtype(dtype).itemsize*width)
        return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=start,strides=(stride,np.dtype(dtype).itemsize)).copy()
    parents={child:i for i,n in enumerate(doc['nodes']) for child in n.get('children',[])}
    def local(n):
        if 'matrix' in n:return np.array(n['matrix']).reshape((4,4),order='F')
        x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4)
        m[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
        m[:3,:3]*=np.array(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
    matrices={}
    def world(i):
        if i not in matrices:matrices[i]=(world(parents[i]) if i in parents else np.eye(4))@local(doc['nodes'][i])
        return matrices[i]
    rows=[];meshes=doc.get('meshes',[]);materials=doc.get('materials',[])
    for i,n in enumerate(doc['nodes']):
        chain=[];j=i
        while j in parents:j=parents[j];chain.append(doc['nodes'][j].get('name',str(j)))
        row={'index':i,'name':n.get('name',''),'parent':parents.get(i),'ancestors':chain,'matrixWorld':world(i).reshape(-1,order='F').tolist(),'extras':n.get('extras')}
        if 'mesh' in n:
            row['primitives']=[]
            for k,p in enumerate(meshes[n['mesh']]['primitives']):
                xyz=accessor(p['attributes']['POSITION']);transformed=np.c_[xyz,np.ones(len(xyz))]@world(i).T
                idx=accessor(p['indices']).reshape(-1) if 'indices' in p else np.arange(len(xyz))
                tri=transformed[idx.reshape((-1,3)),:3]
                cross=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);lens=np.linalg.norm(cross,axis=1)
                normals=cross/np.maximum(lens[:,None],1e-15)
                planes={}
                # Candidate horizontal faces only; contact regions require a later explicit review.
                horizontal=np.where((np.abs(normals[:,1])>.999)&(lens>1e-8))[0]
                for ti in horizontal:
                    y=round(float(tri[ti,:,1].mean()),4);planes.setdefault(y,[]).append(int(ti))
                pr={'primitive':k,'material':materials[p.get('material',0)].get('name',''),'vertices':len(xyz),'triangles':len(tri),
                    'bounds':{'min':transformed[:,:3].min(axis=0).tolist(),'max':transformed[:,:3].max(axis=0).tolist()},
                    'horizontalPlanes':[{'y':y,'triangleCount':len(indices),'boundsXZ':[tri[indices][:,:,[0,2]].min(axis=(0,1)).tolist(),tri[indices][:,:,[0,2]].max(axis=(0,1)).tolist()]} for y,indices in sorted(planes.items())]}
                row['primitives'].append(pr)
        rows.append(row)
    terms=('anchor','helm','seat','chair','steer','wheel','pedal','hand','foot','deck','teak','helipad')
    matches=[r for r in rows if any(t in r['name'].lower() for t in terms)]
    return {'sourceCommit':'48b9bef038ab2e422b6677d7ca9db4879419a3f9','assetSHA256':EXPECTED,'bytes':len(raw),'nodeCount':len(rows),
            'meshCount':len(meshes),'animationChannels':sum(len(a['channels']) for a in doc.get('animations',[])),
            'matchTerms':terms,'semanticMatches':matches,'nodes':rows,'gltfExtras':doc.get('extras'),
            'conclusion':'Candidate names/planes are evidence only, not walkable-region or human-anchor certification.'}

if __name__=='__main__':
    result=audit(sys.argv[1]);out=Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,indent=2))
    print(json.dumps({'sha256':result['assetSHA256'],'nodeCount':result['nodeCount'],'matches':[r['name'] for r in result['semanticMatches']]},indent=2))
