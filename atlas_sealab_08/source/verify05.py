from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,base64
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8885/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/sea05/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'release':'05','local_assets_injected':False,'physical_device_test':False,'acoustic_fidelity_validated':False,'marine_validated':False,'long_runs':'Fixed-step runtime advancement, not wall-clock or FPS measurements','tests':[]}
def shot(page,name):
 page.evaluate('BAYPLAY.capturePaused=true');page.wait_for_timeout(250)
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROME_PATH'):opts['executable_path']=os.environ['CHROME_PATH']
 browser=p.chromium.launch(**opts)
 for dev,w,h in [('desktop',1600,1000),('phone',430,932)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=ctx.new_page();errs=[];fails=[]
  page.on('pageerror',lambda e:errs.append(str(e)));page.on('response',lambda r:fails.append([r.status,r.url]) if r.status>=400 and 'favicon' not in r.url else None)
  result={'device':dev,'passed':False,'errors':errs,'asset_failures':fails};report['tests'].append(result)
  try:
   page.goto(BASE,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA05?.ready && BayGeo.ready',timeout=120000)
   page.wait_for_timeout(1200)
   assert page.locator('#cmd-sidebar').is_hidden();assert page.locator('#mfd-panel').is_hidden();assert not page.evaluate('BAYPLAY.audio.enabled')
   assert page.evaluate('BAYPLAY.inspect().instrumentResolution[0]===1024');result['opt_in_and_resolution']=True
   shot(page,f'{dev}_helm.png')
   # Prove rendered user controls work before any accelerated run.
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   page.locator('#cmd-engine').click();page.wait_for_function('BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',timeout=60000)
   page.locator('[data-cmd-gear="1"]').click();page.locator('#quick-throttle [data-power="1"]').click()
   page.wait_for_function('BAYPLAY.state.speedOverGround>1',timeout=60000);result['rendered_forward']=True
   page.locator('#cmd-sound').click();page.wait_for_function('BAYPLAY.audio.sampleStatus==="Recorded texture ready"',timeout=30000)
   page.wait_for_function('BAYPLAY.audio.metrics.rms>0.00005',timeout=20000);result['audio']=page.evaluate('BAYPLAY.audio.inspect()')
   assert result['audio']['metrics']['activeEngines']==1;assert result['audio']['metrics']['engineLoads'][0]['recorded']
   page.locator('#cmd-neutral').click();page.wait_for_timeout(500);assert page.evaluate('BAYPLAY.state.gear===0&&BAYPLAY.state.speedOverGround>0');result['coasting']=True
   page.locator('#cmd-pause').click();page.wait_for_function('BAYPLAY.audio.held');result['pause_mutes']=True
   page.locator('#mfd-open').click();page.evaluate('BAYPLAY.refresh()');assert page.locator('#mfd-panel').is_visible()
   page.locator('#mfd-theme').click();assert page.evaluate('CMD_INSTRUMENTS.theme==="night"');page.locator('#mfd-theme').click()
   page.locator('#mfd-orient').click();assert page.evaluate('CMD_INSTRUMENTS.headingUp');page.locator('#mfd-orient').click()
   page.locator('#mfd-gain').evaluate('(e)=>{e.value=75;e.dispatchEvent(new Event("input",{bubbles:true}));}');assert page.evaluate('CMD_INSTRUMENTS.gain===.75')
   page.locator('#mfd-range').select_option('60');assert page.evaluate('CMD_INSTRUMENTS.depthRange===60')
   if dev=='phone':page.locator('#mfd-echo-only').click()
   shot(page,f'{dev}_instruments.png');result['mfd_controls']=True
   page.locator('#mfd-close').click();assert page.locator('#mfd-panel').is_hidden()
   page.locator('#mix-open').click();page.locator('#mix-master').evaluate('(e)=>{e.value=35;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   assert page.evaluate('BAYPLAY.audio.settings.master===.35');shot(page,f'{dev}_audio_mix.png');page.locator('#mix-close').click();result['mixer']=True
   # Apply rigs through actual configuration; long tests run the shipped integrator.
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="single300"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click()
   page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-kind').select_option('top');page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(70)')
   page.wait_for_function('!CMD_LAB.active&&CMD_LAB.results.length>0');r=page.evaluate('({...CMD_LAB.results.at(-1),trace:undefined})');result['single300_test']=r;assert 48<r['peakMph']<53
   # A large, persistent knot speed indicator must agree with simulated state.
   page.evaluate('CMD.setWorkspace("drive");BAYPLAY.setPaused(true)');page.wait_for_timeout(350)
   kn=page.evaluate('BAYPLAY.state.speedOverGround*3600/1852');display=float(page.locator('#speed-knots').inner_text());assert abs(kn-display)<.11;result['knots']=display
   page.locator('#cmd-panels').click();assert page.locator('#speed-hud').is_visible();assert page.locator('#cmd-restore').is_visible();shot(page,f'{dev}_cruise_clear.png');page.locator('#cmd-show').click()
   # Show actual two-engine audio and visible engine configuration.
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="twin300"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-drive').click();page.wait_for_function('CMD.motorCount===2')
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   page.locator('#cmd-engine').click();page.wait_for_function('BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',timeout=60000);page.locator('[data-cmd-gear="1"]').click();page.locator('#quick-throttle [data-power="0.55"]').click();page.wait_for_function('BAYPLAY.audio.metrics.activeEngines===2&&BAYPLAY.audio.metrics.engineLoads[1].gain>0',timeout=30000);result['twin_audio']=page.evaluate('BAYPLAY.audio.inspect()')
   # Read sensor no-data state rather than showing a false depth.
   assert page.evaluate('CMD_INSTRUMENTS.depth({depth:null,airborne:false})===null && CMD_INSTRUMENTS.depth({depth:5,airborne:true})===null')
   assert page.evaluate('CMD_INSTRUMENTS.course({speedOverGround:0})===null');result['no_false_sensors']=True
   page.locator('#cmd-neutral').click();page.locator('#cmd-pause').click();page.locator('#mfd-open').click();page.evaluate('BAYPLAY.refresh()')
   if dev=='desktop':page.locator('#mfd-both').click()
   shot(page,f'{dev}_twin_displays.png');page.locator('#mfd-close').click()
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('reference');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.performanceMode==="reference" && CMD.motorCount===1')
   page.evaluate('BAYPLAY.state.armReferenceTest(5800);BAYPLAY.testStep(69)');v=page.evaluate('BAYPLAY.state.u/.44704');assert abs(v-50.9)<.06;result['reference_mph']=v
   result['document_width']=page.evaluate('document.documentElement.scrollWidth');assert result['document_width']<=w+2
   assert not errs,errs;assert not fails,fails;result['passed']=True
  except Exception as e:
   report['passed']=False;result['exception']=str(e)
   try:result['failure_state']=page.evaluate('({s:window.SEA05?.inspect(),cmd:window.CMD?.inspect(),app:window.BAYPLAY?.inspect()})');shot(page,f'{dev}_ERROR.png')
   except Exception as s:result['screenshot_error']=str(s)
  finally:ctx.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 browser.close()
print(json.dumps({'passed':report['passed'],'tests':[{'device':r['device'],'passed':r['passed'],'exception':r.get('exception')} for r in report['tests']]},indent=2))
assert report['passed'],'Sea Lab 05 checks failed'
