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
p=r/'site/app.js';s=p.read_text()
s=s.replace("low?.8:1", "low?(window.SEA_SOFTWARE?.5:.75):1")
s=s.replace("if(innerWidth<700||(debug&&/SwiftShader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))))setQuality(true);", "window.SEA_SOFTWARE=!!(debug&&/SwiftShader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));if(innerWidth<700||window.SEA_SOFTWARE)setQuality(true);")
s=s.replace("timing.emaFrameMs+=(wallDt*1000-timing.emaFrameMs)*.06;", "timing.emaFrameMs+=(wallDt*1000-timing.emaFrameMs)*.06;if(reduced&&wallDt>.12&&renderer.getPixelRatio()>.5){timing.slowFrames=(timing.slowFrames||0)+1;if(timing.slowFrames>=8){renderer.setPixelRatio(Math.max(.5,renderer.getPixelRatio()*.8));timing.slowFrames=0;timing.adaptations=(timing.adaptations||0)+1;}}else timing.slowFrames=0;timing.renderScale=renderer.getPixelRatio();")
p.write_text(s)
p=r/'verify51.py';s=p.read_text();s=s.replace("page.wait_for_function('BAYPLAY.audio.metrics.rms>0.00005',timeout=20000)","driving_wait(page,'BAYPLAY.audio.metrics.rms>0.00005&&!BAYPLAY.audio.held',result)");p.write_text(s)
p=r/'site/polish51.css';p.write_text(p.read_text()+'''\n#sound-quick{background:#173e4c;color:#f2fbf7;border:1px solid #326171;}\n#sound-quick.active{background:#b2e6d5;color:#153b45;}\n''')
p=r/'verify51.py';s=p.read_text();s=s.replace('CMD.setWorkspace("drive");BAYPLAY.setPaused(true)','CMD.setWorkspace("drive");CMD.setLayout("helm");BAYPLAY.setPaused(true)')
s=s.replace("page.locator('#console-focus').click();shot(page,'desktop_console.png');page.locator('#return-helm').click()", "page.locator('#console-focus').click();shot(page,'desktop_console.png');page.locator('#cmd-panels').click();shot(page,'desktop_console_clean.png');page.locator('#cmd-show').click();page.locator('#return-helm').click()")
p.write_text(s)
