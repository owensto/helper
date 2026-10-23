from pathlib import Path
import os,hashlib,json
r=Path(__file__).resolve().parent;p=r.parent/'y12'
files={str(x.relative_to(r)):hashlib.sha256(x.read_bytes()).hexdigest() for x in sorted(r.glob('*')) if x.is_file() and x.name not in ['build.json','RELEASE.json','sources.b64','sources-index.json']}
build={'release':'Y13 isolated fleet realism','sourceCommit':os.environ.get('GITHUB_SHA'),'baselineCommit':'8fa8616b2f10dea29127b0aa971e6646411cd785','originalAssets':json.loads((p/'build.json').read_text())['originalAssets'],'originalBytesUnchanged':True,'seaTrialValidated':False,'multiplayer':False,'humanActivation':False,'horizontalY12ParametersUnchanged':True,'files':files}
(r/'build.json').write_text(json.dumps(build,indent=2))
