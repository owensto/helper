from pathlib import Path
import os,shutil
root=Path(os.getenv('ATLAS_REV_ROOT',str(Path(__file__).resolve().parent.parent)))
original=Path(os.getenv('ATLAS_OLD_VIEWER',str(root/'source/original_viewer.js')))
s=original.read_text();marker='var Pt=s=>document.querySelector(s)'
assert marker in s, 'Pinned runtime boundary not found; refusing to patch an unknown bundle.'
s=s[:s.index(marker)]
s+='\nwindow.ATLASRuntime={Vector3:D,Vector2:Ee,Color:be,Scene:Si,Fog:$s,PerspectiveCamera:mt,WebGLRenderer:ga,OrbitControls:ya,GLTFLoader:va,PMREMGenerator:ws,RoomEnvironment:Sa,HemisphereLight:hr,DirectionalLight:Vn,Mesh:Qe,Group:Zt,BoxGeometry:ni,PlaneGeometry:Ai,MeshStandardMaterial:sn,MeshBasicMaterial:Jt,DataTexture:bi,Box3:Kt,MathUtils:ai,RepeatWrapping:vn,DoubleSide:Ot,SRGBColorSpace:ft,ACESFilmicToneMapping:wo,PCFSoftShadowMap:xo};\n'
s+='/*! Three.js, Copyright 2010-2025 Three.js Authors; MIT. See THIRD_PARTY_LICENSE.txt. */'
(root/'site'/'runtime.js').write_text(s)
shutil.copy(original.parent/'THIRD_PARTY_LICENSE.txt',root/'site/THIRD_PARTY_LICENSE.txt')
