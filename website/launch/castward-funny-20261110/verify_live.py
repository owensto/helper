import subprocess,json,re
from pathlib import Path
from urllib.parse import urlsplit
R=Path(__file__).resolve().parent;W=Path('/Users/oven/orca/workspaces/castward/website');names=json.loads((R/'manifest.json').read_text());s=json.loads((R/(names[0]+'.json')).read_text());urls=['https://castward.app/','https://castward.app/videos/',s['page_url'].split('?')[0]];results=[]
for u in urls:
 r=subprocess.check_output(['curl','--fail','--silent','--show-error','--location',u,'--write-out','\n%{http_code}'],text=True);body,status=r.rsplit('\n',1);expected=5 if '/north-america/' in u else 13
 assert int(status)==200 and body.count('<video ')==expected and body.count('"@type": "VideoObject"')==expected
 assert all(n in body for n in names)
 results.append(dict(url=u,status=int(status),players=expected,schema=expected))
for n in names:
 for ext in ['mp4','jpg','vtt']:
  u=f'https://castward.app/media/videos/{n}.{ext}';status=subprocess.check_output(['curl','--silent','--show-error','--output','/dev/null','--write-out','%{http_code}',u],text=True);assert status=='200';results.append(dict(url=u,status=200))
(R/'live-verification.json').write_text(json.dumps(results,indent=2))
kfile=next(W.glob('public/796*.txt'));key=kfile.read_text().strip();assert subprocess.check_output(['curl','--fail','--silent','https://castward.app/'+kfile.name],text=True).strip()==key
payload=dict(host='castward.app',key=key,keyLocation='https://castward.app/'+kfile.name,urlList=urls);(R/'indexnow-request.json').write_text(json.dumps(payload))
r=subprocess.check_output(['curl','--silent','--show-error','--request','POST','https://api.indexnow.org/indexnow','--header','Content-Type: application/json','--data-binary','@'+str(R/'indexnow-request.json'),'--write-out','\n%{http_code}'],text=True);body,status=r.rsplit('\n',1);(R/'indexnow-result.json').write_text(json.dumps(dict(status=int(status),body=body,urlCount=len(urls)),indent=2));assert status in ['200','202'];print('Live checks pass. IndexNow:',status)
