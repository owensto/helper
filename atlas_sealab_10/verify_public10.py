"""Public URL smoke test, using only the published application assets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,traceback
URL=os.environ['BASE_URL'];OUT=Path(os.environ.get('REVIEW_DIR','/tmp/public10'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':URL,'version':'10','passed':True,'exactPublicAssets':True,'physicalDeviceTested':False,'tests':[]}
def shot(page,name):
 page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
def wait_driving(page,r):
 for attempt in range(3):
  page.wait_for_function('BAYPLAY.pauseReason==="render-stall" || (BAYPLAY.state.speedOverGround>1 && BAYPLAY.audio.metrics.rms>.0001)',timeout=60000)
  if page.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  r.setdefault('renderStallRecovery',[]).append(page.evaluate('({...SEA_TIMING})'))
  page.locator('#sea10-resume').click()
 raise AssertionError('Repeated rendering stalls prevented normal driving')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for dev,w,h in [('desktop',1440,960),('phone',430,932)]:
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=c.new_page();page.set_default_timeout(45000);r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('response',lambda e:r['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
  page.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  try:
   page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA10?.ready && SEA09_WATER.inspect().shaderCompiled',timeout=120000)
   r['default']=page.evaluate('SEA10.inspect()');assert not r['default']['options']['ejection'] and not r['default']['options']['explosions'];assert page.locator('#command-app').is_hidden()
   page.evaluate('BAYPLAY.setPaused(true)');shot(page,dev+'_public_helm.png');page.locator('#helm09-key').click();page.wait_for_function('BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3',timeout=60000)
   page.locator('[data-gear09="1"]').click();page.locator('#helm09-throttle').evaluate('(e)=>{e.value=60;e.dispatchEvent(new Event("input",{bubbles:true}));}');wait_driving(page,r)
   r['audio']=page.evaluate('BAYPLAY.audio.inspect()');page.locator('[data-gear09="-1"]').click();assert page.evaluate('BAYPLAY.state.gear===-1 && BAYPLAY.state.u>0');r['reverseWithInertia']=True
   page.locator('#helm10-weather').click();page.locator('[data-weather10="rain"]').click();assert page.evaluate('BAYPLAY.state.engine');page.evaluate('BAYPLAY.setPaused(true);BAYPLAY.testStep(10)');shot(page,dev+'_public_rain.png');r['weather']=page.evaluate('SEA10.inspect()');assert r['weather']['rainVisible'] and r['weather']['weather']['current']['rain']>.6;page.locator('#helm09-close').click()
   page.locator('#helm09-settings').click();page.locator('#sea10-graphics').select_option('realistic');assert page.evaluate('BAYPLAY.renderer.shadowMap.enabled && !SEA10.inspect().options.explosions');shot(page,dev+'_public_settings.png');page.locator('#sea10-graphics').select_option('balanced');page.locator('.s10-extras summary').click();page.locator('#sea10-ejection').check();assert page.evaluate('SEA10.inspect().options.ejection && !SEA10.inspect().options.explosions');page.locator('#sea10-ejection').uncheck();page.locator('#helm09-close').click()
   page.locator('#helm09-map').click();assert page.locator('#helm09-mapcard').is_visible();page.keyboard.press('m');assert page.locator('#helm09-mapcard').is_hidden();r['mapToggle']=True
   r['water']=page.evaluate('SEA09_WATER.inspect()');assert r['water']['colorArrayBound'] and r['water']['nearWaterGridMetres']==.5;assert page.evaluate('document.documentElement.scrollWidth')<=w+2
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as e:
   try:r['failureState']=page.evaluate('({boat:BAYPLAY.inspect(),timing:window.SEA_TIMING,pauseReason:BAYPLAY.pauseReason,ops:SEA10.inspect()})')
   except Exception:pass
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:shot(page,dev+'_public_ERROR.png')
   except Exception:pass
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Public Sea Lab 10 smoke test failed'
