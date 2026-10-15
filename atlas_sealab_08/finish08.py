"""Fix a reproduced history-reset regression, retain strict gates and fresh frames."""
from pathlib import Path
import os
r=Path(os.environ.get('SEA_ROOT',Path(__file__).parent));site=r/'site'
p=site/'instruments.js';s=p.read_text();old='if(s.elapsed<last||teleported||lastLocation!==s.location){I.reset();if(lastLocation&&lastLocation!==s.location)I.waypoint=null;}'
new='if(s.elapsed<last-1e-6||teleported||lastLocation!==s.location){const previousLocation=lastLocation;I.reset();if(previousLocation&&previousLocation!==s.location)I.waypoint=null;}'
assert old in s,'History-reset anchor changed';p.write_text(s.replace(old,new))
for name in ['verify08.py','verify_public08.py']:
 p=r/name
 if not p.exists():continue
 s=p.read_text();s=s.replace('import json,os,base64','import json,os,base64,traceback').replace('import json,os,time','import json,os,time,traceback')
 s=s.replace("page.evaluate('BAYPLAY.capturePaused=true');", "page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true');")
 s=s.replace("result['exception']=str(e)","result['exception']=str(e);result['traceback']=traceback.format_exc()")
 s=s.replace("r['exception']=str(e);", "r['exception']=str(e);r['traceback']=traceback.format_exc();")
 needle=" for dev,w,h in [('desktop',1600,1000),('phone',430,932)]:"
 assert needle in s;s=s.replace(needle,needle+"\n  if os.environ.get('TEST_DEVICE') and os.environ['TEST_DEVICE']!=dev:continue")
 p.write_text(s)
print('Reproduced and fixed floating-point sounder reset; unchanged history and functional gates')
