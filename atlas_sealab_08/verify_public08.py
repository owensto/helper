"""Verify the exact published viewer, not an injected local substitute."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,time
URL=os.environ['BASE_URL'];OUT=Path(os.environ['REVIEW_DIR']);OUT.mkdir(parents=True,exist_ok=True)
report={'url':URL,'passed':True,'release':'08','live_site':True,'local_asset_injection':False,'physical_device_test':False,'live_radio_station_tested':False,'tests':[]}
def shot(page,name):
 page.evaluate('BAYPLAY.capturePaused=true');page.wait_for_timeout(250)
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
def waitdrive(page,expr):
 end=time.monotonic()+75;resumes=0
 while time.monotonic()<end:
  if page.evaluate(expr):return
  if page.evaluate('BAYPLAY.inspect().paused && (window.SEA_TIMING?.stalls||0)>0'):
   assert resumes<3,'Repeated rendering stalls';page.locator('#sea08-pause').click();resumes+=1
  page.wait_for_timeout(250)
 raise AssertionError('Published control did not reach '+expr)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for dev,w,h in [('desktop',1600,1000),('phone',430,932)]:
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=c.new_page();r={'device':dev,'passed':False,'errors':[],'failed_assets':[],'shader_errors':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('response',lambda e:r['failed_assets'].append([e.status,e.url]) if e.status>=400 and 'favicon' not in e.url else None)
  page.on('console',lambda m:r['shader_errors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log','webgl']) else None)
  try:
   page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA08?.ready && window.SEA06?.inspect().waterMask && BayGeo.ready',timeout=120000)
   assert page.locator('#sea08-pause').is_visible();assert not page.evaluate('BAYPLAY.audio.enabled||ATLAS_RADIO.wanted')
   r['initial']=page.evaluate('SEA08.inspect()');assert r['initial']['physicalMaterials']>=3
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   page.locator('#sea08-start').click();waitdrive(page,'BAYPLAY.state.engine&&BAYPLAY.state.startTimer===0&&BAYPLAY.audio.enabled')
   page.locator('[data-cmd-gear="1"]').click();page.locator('#quick-throttle [data-power="0.55"]').click()
   waitdrive(page,'BAYPLAY.state.speedOverGround>1&&BAYPLAY.audio.metrics.rms>.00005')
   page.wait_for_function('BAYPLAY.audio.sampleStatus==="Recorded texture ready"',timeout=45000)
   r['combined_start_and_recorded_sound']=page.evaluate('BAYPLAY.audio.inspect()');shot(page,dev+'_public_helm.png')
   page.locator('#radio-open').click();page.locator('#radio-play').click()
   waitdrive(page,'ATLAS_RADIO.inspect().playing&&ATLAS_RADIO.audio.currentTime>.5&&ATLAS_RADIO.peak>.0001')
   r['radio']=page.evaluate('ATLAS_RADIO.inspect()');shot(page,dev+'_public_radio.png')
   page.locator('#radio-screen').click();assert page.locator('#radio-panel').is_hidden()
   page.locator('#sea08-pause').click();page.wait_for_function('BAYPLAY.inspect().paused&&BAYPLAY.audio.held&&ATLAS_RADIO.held&&ATLAS_RADIO.audio.paused')
   page.evaluate('CMD_INSTRUMENTS.screenPage="sonar";BAYPLAY.setCamera("instruments");BAYPLAY.refresh()');shot(page,dev+'_public_console.png')
   page.wait_for_timeout(250);kn=page.evaluate('BAYPLAY.state.speedOverGround*3600/1852');assert abs(float(page.locator('#speed-knots').inner_text())-kn)<.11
   r['knots']=kn;page.locator('#cmd-panels').click();assert page.locator('#sea08-pause').is_visible();assert page.locator('#speed-hud').is_visible();shot(page,dev+'_public_clear.png')
   r['scroll_width']=page.evaluate('document.documentElement.scrollWidth');assert r['scroll_width']<=w+2
   r['timing']=page.evaluate('JSON.parse(JSON.stringify(SEA_TIMING))')
   assert not r['errors'] and not r['failed_assets'] and not r['shader_errors'],r
   r['passed']=True
  except Exception as e:
   r['exception']=str(e);report['passed']=False
   try:shot(page,dev+'_public_ERROR.png')
   except Exception as ex:r['screenshot_error']=str(ex)
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Published viewer verification failed'
