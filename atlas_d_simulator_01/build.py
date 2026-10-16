"""Reproducible ATLAS D integration assembly; writes only this workstream.
Original sources and the shared simulator are immutable inputs.
"""
from pathlib import Path
import hashlib, io, json, shutil, subprocess, tarfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
BASE = 'ddcbf408df153cfdeb55e30ba4a04ced30feb9e8'
SITE = ROOT / 'site'

# Focused initial integration corrections. Idempotent; corrected sources are
# included in the reviewed publication commit so downstream imports are valid.
core = ROOT / 'src/atlas-d-core.js'
text = core.read_text()
text = text.replace('Math.exp(-((x-310)/90)**2-((z-20)/150)**2)',
                    'Math.exp(-(((x-310)/90)**2)-(((z-20)/150)**2))')
core.write_text(text)
js = ROOT / 'src/atlas-d.js'
text = js.read_text()
text = text.replace("'location','u','environment','engine'];", "'location','u','environment','engine','throttle','steer','gear'];")
text = text.replace("let lastPosition=null;", "let lastPosition=null,lastBelowSurface=false;")
text = text.replace('<button data-ad-view="bridge">Bridge view</button>', '<button data-ad-view="bridge">Bridge view</button><button data-ad-view="subsea">Underwater view</button>') if 'data-ad-view="subsea"' not in text else text
text = text.replace("view==='helipad'?[30,8.8,0]:[-93,34,48]", "view==='helipad'?[30,8.8,0]:view==='subsea'?[-85,6,48]:[-93,34,48]")
text = text.replace('  updateCamera(dt);\n', "  if(state.depthM>10&&!lastBelowSurface)setView('subsea');\n  lastBelowSurface=state.depthM>10;\n  updateCamera(dt);\n") if '!lastBelowSurface' not in text else text
text = text.replace("if(!active){last=now;return;}const dt=", "if(!active||status.holdFrameLoop){last=now;return;}const dt=")
js.write_text(text)

subprocess.run(['git','fetch','--depth=1','origin',BASE],cwd=REPO,check=True)
archive = subprocess.check_output(['git','archive',BASE,'atlas_sealab_11/live','atlas_d_original_r7/live'],cwd=REPO)
if SITE.exists(): shutil.rmtree(SITE)
SITE.mkdir(parents=True)
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
    for member in tar.getmembers():
        if not member.isfile(): continue
        path = Path(member.name)
        if '..' in path.parts: raise ValueError('Unexpected archive path')
        if member.name.startswith('atlas_sealab_11/live/'):
            destination = SITE / Path(*path.parts[2:])
        elif member.name == 'atlas_d_original_r7/live/ATLAS_D_Original.glb':
            destination = SITE / 'assets/ATLAS_D_Original.glb'
        elif member.name == 'atlas_d_original_r7/live/model_report.json':
            destination = SITE / 'assets/atlas-d-source-report.json'
        else: continue
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(tar.extractfile(member).read())

for source in (ROOT/'src').iterdir():
    if source.suffix in {'.js','.css'}: shutil.copy2(source,SITE/source.name)
index = (SITE/'index.html').read_text()
assert index.count('</head>')==1
index = index.replace('</head>','<link rel="stylesheet" href="atlas-d.css"><script defer src="atlas-d-core.js"></script><script defer src="atlas-d.js"></script></head>')
index = index.replace('ATLAS Sea Lab 11 · Coastal Drive','ATLAS D · Original superyacht / submarine simulator')
(SITE/'index.html').write_text(index)
asset = SITE/'assets/ATLAS_D_Original.glb'
assert asset.stat().st_size==9043328, 'Wrong original asset'
report=json.loads((SITE/'assets/atlas-d-source-report.json').read_text())
assert report['length_m']==82.9 and report['beam_m']==14.2
assert report['main_hull_swap'] is False and report['scale_animation_channels']==0
manifest={
 'release':'ATLAS D simulator integration 01','vesselId':'atlas-d-original-r7',
 'hostBaselineCommit':BASE,'sourceAssetCommit':BASE,
 'originalAssetSHA256':hashlib.sha256(asset.read_bytes()).hexdigest(),
 'originalAssetBytes':asset.stat().st_size,
 'scope':'Selectable original yacht in an isolated Sea Lab integration preview',
 'world':'Authored deep-water proving ground; not Beaufort and not a navigation chart',
 'sharedSimulatorFilesModified':False,'multiplayer':False,'engineeringValidated':False,
 'publicationStatus':'Candidate; see verification reports before publication',
 'files':{str(p.relative_to(SITE)):hashlib.sha256(p.read_bytes()).hexdigest()
          for p in sorted(SITE.rglob('*')) if p.is_file()}
}
(SITE/'atlas-d-build.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({k:v for k,v in manifest.items() if k!='files'},indent=2))
