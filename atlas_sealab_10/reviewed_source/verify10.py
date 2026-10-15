"""Actual browser UI plus deterministic vessel scenarios; not sea trials/FPS certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,traceback
URL=os.environ.get('BASE_URL','http://127.0.0.1:8910/index.html');ROOT=Path(__file__).parent;OUT=ROOT/'review';OUT.mkdir(exist_ok=True)
report={'version':'10','passed':True,'url':URL,'physicalDeviceTested':False,'tests':[]}
def shot(page,name):
 page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
def frame(page):page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera)')
def wait_driving(page,r):
 for attempt in range(3):
  page.wait_for_function('BAYPLAY.pauseReason==="render-stall" || (BAYPLAY.state.speedOverGround>1 && BAYPLAY.audio.metrics.rms>.0001)',timeout=60000)
  if page.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  r.setdefault('renderStallRecovery',[]).append(page.evaluate('({...SEA_TIMING})'))
  page.locator('#sea10-resume').click()
 raise AssertionError('Repeated rendering stalls prevented normal driving')
def collision(page,seconds=.65,engine=False):
 # Pose/velocity is a deterministic fixture, but contact and consequences use the
 # same production step and the actual rendered marina's obstacle bounds.
 page.evaluate('SEA10.recover();BAYPLAY.setPaused(true);SEA09.relocate("basin",0,3,-Math.PI/2);BAYPLAY.setPaused(true)')
 page.evaluate('(e)=>{const s=BAYPLAY.state;s.engine=e;s.startTimer=0;s.rpm=e?4000:0;s.gear=e?1:0;s.throttle=e?.65:0;s.vx=0;s.vz=-22;BAYPLAY.testStep('+str(seconds)+');}',engine);frame(page)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for dev,w,h in [('desktop',1440,960),('phone',430,932)]:
  if os.environ.get('TEST_DEVICE') and os.environ['TEST_DEVICE']!=dev:continue
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=c.new_page();page.set_default_timeout(45000)
  r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  page.on('response',lambda res:r['assetErrors'].append([res.status,res.url]) if res.status>=400 and URL.rsplit('/',1)[0] in res.url and 'favicon' not in res.url else None)
  try:
   page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA10?.ready && SEA09_WATER.inspect().shaderCompiled',timeout=120000)
   page.evaluate('BAYPLAY.setPaused(true)');r['defaults']=page.evaluate('SEA10.inspect()');assert not r['defaults']['options']['explosions'] and not r['defaults']['options']['ejection'];assert page.locator('#command-app').is_hidden();assert not page.evaluate('BAYPLAY.audio.enabled')
   shot(page,dev+'_helm.png')
   # High-detail graphics is independent of damage and cinematic effects.
   page.locator('#helm09-settings').click();page.locator('#sea10-graphics').select_option('realistic');frame(page);r['highGraphics']=page.evaluate('SEA10.inspect()');assert r['highGraphics']['graphics']['shadows'];assert not r['highGraphics']['options']['explosions'] and not r['highGraphics']['options']['ejection'];shot(page,dev+'_settings_high.png');page.locator('#sea10-graphics').select_option('balanced');page.locator('#helm09-close').click()
   # Physical key in desktop close-up; the same ignition action on a touch helm.
   if dev=='desktop':
    page.locator('#helm09-boat').click();page.locator('[data-detail09="instruments"]').click();page.locator('#helm09-close').click();frame(page)
    xy=page.evaluate('''()=>{const k=BAYPLAY.boat.getObjectByName('SEA09_IGNITION_KEY'),p=k.localToWorld(new ATLASRuntime.Vector3(-.055,0,0)).project(BAYPLAY.camera);return [(p.x*.5+.5)*innerWidth,(-p.y*.5+.5)*innerHeight]}''');assert 0<xy[0]<w and 0<xy[1]<h;page.mouse.click(*xy);r['physicalKey']=xy
   else:page.locator('#helm09-key').click()
   page.wait_for_function('BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3',timeout=60000)
   page.locator('[data-view09="helm"]').click();page.locator('[data-gear09="1"]').click();page.locator('#helm09-throttle').evaluate('(e)=>{e.value=60;e.dispatchEvent(new Event("input",{bubbles:true}));}');wait_driving(page,r);r['recordedEngine']=page.evaluate('BAYPLAY.audio.inspect()')
   page.locator('[data-gear09="-1"]').click();assert page.evaluate('BAYPLAY.state.gear===-1 && BAYPLAY.state.u>0');r['immediateReverseWithInertia']=True
   page.locator('#helm10-weather').click();assert page.locator('[data-weather10="rain"]').is_visible();pos=page.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,engine:BAYPLAY.state.engine})');page.locator('[data-weather10="rain"]').click();assert page.evaluate('BAYPLAY.state.engine');r['weatherWhileRunning']=True
   page.locator('#helm09-key').click();page.wait_for_function('!BAYPLAY.state.engine && BAYPLAY.audio.metrics.activeEngines===0');page.evaluate('BAYPLAY.setPaused(true);BAYPLAY.testStep(10)');frame(page);r['rain']=page.evaluate('SEA10.inspect()');assert r['rain']['rainVisible'] and r['rain']['weather']['current']['rain']>.6;shot(page,dev+'_rain.png');page.locator('#helm09-close').click();shot(page,dev+'_rain_view.png');page.locator('#helm10-weather').click()
   page.locator('[data-weather10="fog"]').click();page.evaluate('BAYPLAY.testStep(10)');frame(page);r['fogDensity']=page.evaluate('BAYPLAY.scene.fog.density');assert r['fogDensity']>.014;shot(page,dev+'_fog.png');page.locator('#helm09-close').click();shot(page,dev+'_fog_view.png');page.locator('#helm10-weather').click()
   page.locator('#sea10-light').select_option('golden');frame(page);assert page.evaluate('SEA10.inspect().options.light==="golden"');page.locator('#sea10-light').select_option('day');page.locator('[data-weather10="clear"]').click();page.evaluate('BAYPLAY.testStep(12)');page.locator('#helm09-close').click()
   page.locator('#helm09-map').click();assert page.locator('#helm09-mapcard').is_visible();page.keyboard.press('m');assert page.locator('#helm09-mapcard').is_hidden();r['mapToggle']=True
   page.locator('#helm09-boat').click();page.locator('[data-act09="fishbox"]').click();page.locator('[data-act09="drawer1"]').click();page.evaluate('BAYPLAY.setPaused(false)');page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.05 && BAYPLAY.inspect().drawers[0].value>.05');page.evaluate('BAYPLAY.setPaused(true)');r['fittings']=True;page.locator('#helm09-close').click()
   page.locator('#helm09-radio').click();page.evaluate('BAYPLAY.setPaused(false)');page.locator('#helm09-localplay').click();page.wait_for_function('!ATLAS_RADIO.audio.paused && ATLAS_RADIO.audio.currentTime>.5 && ATLAS_RADIO.peak>.0001',timeout=45000);r['localRadio']=page.evaluate('ATLAS_RADIO.inspect()');page.locator('#helm09-localplay').click()
   page.locator('#helm09-mediaurl').fill('https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6');page.locator('#helm09-addmedia').click();assert 'playlist/' in page.locator('#helm09-spotify').get_attribute('href');r['spotify']='external-link-only'
   if dev=='desktop':
    page.locator('#helm09-mediaurl').fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');page.locator('#helm09-addmedia').click();page.wait_for_timeout(17000);r['youtubeFrame']=page.locator('#helm09-youtube iframe').count()>0;r['youtubeStatus']=page.locator('#helm09-ytstatus').inner_text()
    if r['youtubeFrame']:
     q=page.locator('#helm09-youtube iframe').bounding_box();assert q['width']>=200 and q['height']>=200;r['youtubeFrameSize']=q
    shot(page,'desktop_youtube.png');page.locator('#helm09-youtubeclose').click();assert page.locator('#helm09-youtube iframe').count()==0
   page.locator('#helm09-close').click();page.evaluate('BAYPLAY.setPaused(true)')
   # Shared visible shallows and physical prop contact.
   page.evaluate('SEA09.relocate("basin",56,-40,0);BAYPLAY.setPaused(true);BAYPLAY.testStep(6,{vx:8,vz:0});SEA09.view("follow")');frame(page);r['bottom']=page.evaluate('SEA09.inspect().bottom');r['bottomHitCount']=page.evaluate('BAYPLAY.state.bottomHitCount');assert r['bottomHitCount']>0;assert r['bottom']['known'];shot(page,dev+'_shallows.png')
   # Severe contact does NOT create cinema effects by default.
   collision(page);r['crashOff']=page.evaluate('SEA10.inspect()');assert r['crashOff']['collisionCount']>0 and not r['crashOff']['destroyed'] and not r['crashOff']['ejected'];assert page.evaluate('BAYPLAY.model.visible');assert r['crashOff']['activeParticles']==0;assert r['crashOff']['engineDisabled']
   page.locator('#sea10-recover').click();assert not page.evaluate('SEA10.inspect().engineDisabled');page.evaluate('BAYPLAY.setPaused(true)')
   # Ejection alone with damage OFF verifies that the lanyard, not damage, stops the engine.
   page.locator('#helm09-settings').click();page.locator('#sea10-damage').uncheck();page.locator('.s10-extras summary').click();page.locator('#sea10-ejection').check();page.locator('#helm09-close').click();collision(page,engine=True);r['ejectionOnly']=page.evaluate('SEA10.inspect()');assert r['ejectionOnly']['ejected'] and not r['ejectionOnly']['destroyed'];assert not page.evaluate('BAYPLAY.state.engine');assert r['ejectionOnly']['hullHealth']==100;shot(page,dev+'_driver_ejection.png');page.evaluate('BAYPLAY.testStep(3)');frame(page);assert page.evaluate('SEA10.inspect().spilled');r['splash']=True
   page.locator('#sea10-recover').click();page.evaluate('BAYPLAY.setPaused(true)');page.locator('#helm09-settings').click();page.locator('.s10-extras summary').click();page.locator('#sea10-explosions').check();page.locator('#helm09-close').click();collision(page,engine=True);r['cinematicCrash']=page.evaluate('SEA10.inspect()');assert r['cinematicCrash']['destroyed'] and r['cinematicCrash']['ejected'];assert not page.evaluate('BAYPLAY.model.visible');assert r['cinematicCrash']['activeParticles']>0;assert not page.evaluate('SEA06.inspect().dryMaskEnabled');shot(page,dev+'_cinematic_crash.png')
   # Changing toggles cleans active effects and settings survive reload.
   page.evaluate('SEA10.setOption("explosions",false);SEA10.setOption("ejection",false)');frame(page);r['effectsCleaned']=page.evaluate('SEA10.inspect()');assert not r['effectsCleaned']['ejected'];assert r['effectsCleaned']['activeParticles']==0;assert page.evaluate('BAYPLAY.model.visible');assert r['effectsCleaned']['fxAllocations']<=2;assert page.evaluate('SEA06.inspect().dryMaskEnabled')
   page.evaluate('SEA10.recover();BAYPLAY.setPaused(true);SEA10.setOption("damage",true);SEA10.setOption("hints",false)');page.reload(wait_until='domcontentloaded');page.wait_for_function('window.SEA10?.ready',timeout=120000);page.evaluate('BAYPLAY.setPaused(true)');r['persisted']=page.evaluate('SEA10.inspect()');assert r['persisted']['options']['hints'] is False and r['persisted']['options']['damage'] is True;assert not r['persisted']['options']['explosions'] and not r['persisted']['options']['ejection'];page.evaluate('SEA10.setOption("hints",true)')
   r['water']=page.evaluate('SEA09_WATER.inspect()');assert r['water']['nearWaterGridMetres']==.5;assert r['water']['colorArrayBound'] and r['water']['seabedColorMean']>.1;r['scrollWidth']=page.evaluate('document.documentElement.scrollWidth');assert r['scrollWidth']<=w+2
   for selector in ['#helm09-key','#helm09-throttle','#helm09-pause','#helm10-weather']:
    q=page.locator(selector).bounding_box();assert q and q['x']>=0 and q['y']>=0 and q['x']+q['width']<=w+1 and q['y']+q['height']<=h+1,(selector,q)
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as ex:
   try:r['failureState']=page.evaluate('({boat:BAYPLAY.inspect(),timing:window.SEA_TIMING,pauseReason:BAYPLAY.pauseReason,ops:SEA10.inspect()})')
   except Exception:pass
   r['exception']=str(ex);r['traceback']=traceback.format_exc();report['passed']=False
   try:shot(page,dev+'_ERROR.png')
   except Exception as se:r['screenshotError']=str(se)
  finally:
   (OUT/'validation.json').write_text(json.dumps(report,indent=2));c.close()
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Sea Lab 10 browser checks failed'
