#!/usr/bin/env python3
"""Run new mobile checks plus all inherited Realism5 expected assertions. CPU only."""
from pathlib import Path
import argparse,subprocess,json,hashlib
HERE=Path(__file__).resolve().parent

def check(site,base,prior,easy,out):
 out.mkdir(parents=True,exist_ok=True)
 p=subprocess.run(['node',str(HERE/'test.cjs'),str(site),str(base/'site'),str(easy)],text=True,capture_output=True,timeout=90)
 (out/'mobile.stdout').write_text(p.stdout);(out/'mobile.stderr').write_text(p.stderr)
 if p.returncode:raise RuntimeError('Mobile tests failed; output retained')
 new=json.loads(p.stdout);assert new['passed'] and len(new['tests'])==29 and all(t['passed'] for t in new['tests'])
 subprocess.run(['python3',str(base/'source/realism5/check.py'),'--site',str(site),'--base',str(prior/'site'),'--base-source',str(prior/'source'),'--easy',str(easy),'--out',str(out/'retained')],check=True,timeout=180)
 old=json.loads((out/'retained/verification.json').read_text());assert old['passed'] and old['cpuChecks']==107 and len(old['powerTrials'])==4
 for p in [*HERE.glob('*.js'),*HERE.glob('*.cjs'),*(site/n for n in json.loads((site/'mobile6/build-report.json').read_text())['changed'] if n.endswith('.js'))]:subprocess.run(['node','--check',str(p)],check=True,timeout=15)
 build=json.loads((site/'mobile6/build-report.json').read_text())
 size=lambda root:sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
 d={'version':'Mobile Driving 6','passed':True,'cpuChecks':136,'newChecks':29,'retainedChecks':107,'powerTrials':old['powerTrials'],'scope':'Executed native loop/camera/UI handlers with synthetic DOM/render boundaries, retained math/scene/radio checks; not phone/render/playback/FPS evidence','browserVerified':False,'physicalDeviceVerified':False,'GPUVerified':False,'FPSVerified':False,'CDNVerified':False,'actualMusicPlaybackVerified':False,'addedSiteBytes':size(site)-size(base/'site'),'newModels':0,'newTextures':0,'newLibraries':0,'build':build,'mobileTests':new['tests'],'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.iterdir() if p.is_file()}}
 (out/'verification.json').write_text(json.dumps(d,indent=2)+'\n');return d
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for name in ['site','base','prior','easy','out']:p.add_argument('--'+name,type=Path,required=True)
 a=p.parse_args();r=check(*(getattr(a,n).resolve() for n in ['site','base','prior','easy','out']));print('Mobile6 PASS',r['cpuChecks'],'CPU checks; real-device gates remain open.')
