"""Fetch pinned MIT Rocketbox inputs; never fetch at runtime."""
from pathlib import Path
import urllib.request, hashlib, json
ROOT=Path(__file__).resolve().parents[1]
REV='0943055db6ec570bcef9f2c8b41c9e5467c808f9'
paths=['LICENSE.md','Assets/Avatars/Adults/Male_Adult_01/Export/Male_Adult_01.fbx']
paths += ['Assets/Avatars/Adults/Male_Adult_01/Textures/m002_'+part+'_color.tga' for part in ['body','head','opacity']]
paths += ['Assets/Animations/all_animations_max_motextr_static/'+name for name in ['m_idle_breathe_01.max.fbx','m_sit_chair_breathe_01.max.fbx']]
paths += ['Assets/Animations/all_animations_max_motextr_xy/m_walk_neutral_01.max.fbx']
folder=ROOT/'assets/rocketbox-source';folder.mkdir(exist_ok=True)
manifest={'repository':'https://github.com/microsoft/Microsoft-Rocketbox','revision':REV,'license':'MIT','inputs':[]}
for path in paths:
 url=f'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/{REV}/{path}'
 target=folder/Path(path).name
 urllib.request.urlretrieve(url,target)
 manifest['inputs'].append({'path':path,'url':url,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(ROOT/'assets/provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'assets/ROCKETBOX-LICENSE.md').write_bytes((folder/'LICENSE.md').read_bytes())
