from pathlib import Path
import os
r=Path(os.environ['SEA_ROOT'])
p=r/'site/instruments.js';s=p.read_text();old="if(last<0||s.elapsed-last>=.2/I.scrollRate){last=s.elapsed;history.push(I.depth(s));";new="if(last<0||s.elapsed-last+1e-8>=.2/I.scrollRate){last=last<0?s.elapsed:last+.2/I.scrollRate;history.push(I.depth(s));";assert old in s;s=s.replace(old,new);p.write_text(s)
p=r/'verify51.py';s=p.read_text();s=s.replace("def shot(page,name):", """def driving_wait(page,expression,result,timeout=60000):
 # A software renderer may trip the app's intentional foreground-stall pause.
 # Resume via the visible user control, never bypass the pause in runtime state.
 import time
 end=time.monotonic()+timeout/1000;resumes=0
 while time.monotonic()<end:
  if page.evaluate(expression):return
  if page.evaluate('BAYPLAY.inspect().paused && (window.SEA_TIMING?.stalls||0)>0'):
   assert resumes<3,'Repeated foreground stalls prevent usable driving in this renderer'
   page.locator('#cmd-pause').click();resumes+=1;result['foreground_stall_resumes']=result.get('foreground_stall_resumes',0)+1
  page.wait_for_timeout(250)
 raise AssertionError('Rendered control did not reach '+expression)
def shot(page,name):""")
s=s.replace("page.wait_for_function('BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',timeout=60000)","driving_wait(page,'BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',result)")
s=s.replace("page.wait_for_function('BAYPLAY.state.speedOverGround>1',timeout=60000)","driving_wait(page,'BAYPLAY.state.speedOverGround>1',result)")
s=s.replace("page.wait_for_function('BAYPLAY.audio.metrics.activeEngines===2&&BAYPLAY.audio.metrics.engineLoads[1].gain>0',timeout=30000)","driving_wait(page,'BAYPLAY.audio.metrics.activeEngines===2&&BAYPLAY.audio.metrics.engineLoads[1].gain>0',result)")
s=s.replace("({s:window.SEA05?.inspect(),cmd:","({timing:window.SEA_TIMING,s:window.SEA05?.inspect(),cmd:")
p.write_text(s)
