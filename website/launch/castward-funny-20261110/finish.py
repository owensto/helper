import sys,json,subprocess,hashlib,shutil
from pathlib import Path
import numpy as np
R=Path(__file__).resolve().parent;sys.path.insert(0,str(R.parents[1]))
from uniqueness.audio_fingerprint import attach,similarity
from uniqueness.check import check,record,read
P=Path('/private/tmp/claude-501/-Users-oven-orca-workspaces-insiderhealth-frigatebird/0cbbc4a1-c70e-4510-8d64-b74035bb0769/scratchpad/castward/funny');P.mkdir(parents=True,exist_ok=True)
WEB=Path('/Users/oven/orca/workspaces/castward/website');M=WEB/'public/media/videos'
def ff(*a):subprocess.run(['ffmpeg','-y','-v','error',*map(str,a)],check=True)
slugs=json.loads((R/'manifest.json').read_text());rows=read();baseline=[]
for folder in ['castward-v2','castward-v3']:
 for p in (R.parent/folder).glob('*.json'):
  try:s=json.loads(p.read_text())
  except:continue
  if isinstance(s,dict) and s.get('uniqueness') and s.get('slug'):
   rows.append(record(s,'2026-11-10','test_review'));baseline.append(s['slug'])
for n in slugs:
 s=json.loads((R/(n+'.json')).read_text());out=R/(n+'.mp4')
 ff('-i',R/(n+'-silent.mp4'),'-i',R/'audio'/(n+'-mix.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-2:LRA=11,afade=t=out:st=15.8:d=0.2','-c:a','aac','-b:a','192k','-t','16','-movflags','+faststart',out)
 attach(s,out);(R/(n+'.json')).write_text(json.dumps(s,indent=2));rows.append(record(s,'2026-11-10','test_review'))
(R/'review-ledger.json').write_text(json.dumps({'videos':rows}));qa={};catalog=json.loads((WEB/'src/videos.json').read_text())
for n in slugs:
 s=json.loads((R/(n+'.json')).read_text());out=R/(n+'.mp4');result=check(s,rows,'2026-11-10');(R/(n+'-uniqueness.json')).write_text(json.dumps(result,indent=2));print(n,result,flush=True)
 ff('-i',out,'-vf',"select='eq(n,0)+eq(n,150)+eq(n,270)+eq(n,400)+eq(n,450)',scale=216:384,tile=5x1",'-frames:v','1','-q:v','2',R/(n+'-strip.jpg'))
 for width,dest in [(540,P/(n+'.mp4')),(720,M/(n+'.mp4'))]:ff('-i',out,'-vf',f'scale={width}:{width*16//9}','-c:v','libx264','-preset','fast','-crf','21','-c:a','copy','-movflags','+faststart',dest)
 for width,dest in [(540,P/(n+'-poster.jpg')),(720,M/(n+'.jpg'))]:ff('-ss','13.5','-i',out,'-vf',f'scale={width}:{width*16//9}','-frames:v','1','-q:v','2',dest)
 shutil.copy(P/(n+'-poster.jpg'),R/(n+'-poster.jpg'));shutil.copy(R/(n+'-strip.jpg'),P/(n+'-strip.jpg'))
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(out),'-vf','scale=54:96,format=gray','-an','-f','rawvideo','-']);f=np.frombuffer(raw,np.uint8).reshape(-1,96,54).astype(float);motion=np.abs(np.diff(f,axis=0)).mean(axis=(1,2));assert len(f)==480 and motion.min()>0
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(out)]));v=next(v for v in meta['streams'] if v['codec_type']=='video');assert (v['width'],v['height'])==(1080,1920)
 qa[n]=dict(uniqueness=result,baseline_count=len(baseline),frames=480,width=1080,height=1920,duration=16,min_frame_change=float(motion.min()),sha256=hashlib.sha256(out.read_bytes()).hexdigest())
 catalog=[v for v in catalog if v['slug']!=n];catalog.append(dict(slug=n,title=s['title'],caption=s['caption'],page_url=s['page_url'],upload_date='2026-11-10T18:00:00-06:00'))
 (M/(n+'.vtt')).write_text('WEBVTT\n\n'+'\n\n'.join(f"00:00:{a['start']:02}.000 --> 00:00:{a['end']:02}.000\n{a['text']}" for a in s['text_timeline'])+'\n')
(R/'qa-results.json').write_text(json.dumps(qa,indent=2));(WEB/'src/videos.json').write_text(json.dumps(catalog,indent=2)+'\n')
assert all(x['uniqueness']['result']=='PASS' for x in qa.values())
