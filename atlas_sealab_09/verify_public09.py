"""Exact-public-URL smoke test. No locally substituted site assets."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,time,traceback
URL=os.environ['BASE_URL'];OUT=Path(os.environ['REVIEW_DIR']);OUT.mkdir(parents=True,exist_ok=True)
report={'url':URL,'passed':True,'release':'09','exactPublicAssets':True,'physicalDeviceTested':False,'tests':[]}
def shot(page,name):
 page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for dev,w,h in [('desktop',1440,960),('phone',430,932)]:
  if os.environ.get('TEST_DEVICE') and os.environ['TEST_DEVICE']!=dev:continue
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=c.new_page();page.set_default_timeout(45000);r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('response',lambda e:r['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
  page.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  try:
   page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA09?.ready && SEA09_WATER.inspect().shaderCompiled',timeout=120000)
   assert not page.evaluate('BAYPLAY.audio.enabled');assert page.locator('#command-app').is_hidden();assert page.locator('#helm09-key').is_visible()
   page.evaluate('BAYPLAY.setPaused(true)');shot(page,dev+'_public_helm.png')
   if dev=='desktop':
    page.locator('#helm09-boat').click();page.locator('[data-detail09="instruments"]').click();page.locator('#helm09-close').click();page.evaluate('BAYPLAY.refresh()')
    xy=page.evaluate('''()=>{const k=BAYPLAY.boat.getObjectByName('SEA09_IGNITION_KEY');const p=k.localToWorld(new ATLASRuntime.Vector3(-.055,0,0)).project(BAYPLAY.camera);return [(p.x*.5+.5)*innerWidth,(-p.y*.5+.5)*innerHeight]}''');assert 0<xy[0]<w and 0<xy[1]<h;page.mouse.click(*xy);r['physicalKeyPixel']=xy
   else:page.locator('#helm09-key').click()
   page.wait_for_function('BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3',timeout=60000)
   page.locator('[data-view09="helm"]').click();page.locator('[data-gear09="1"]').click();page.locator('#helm09-throttle').evaluate('(e)=>{e.value=65;e.dispatchEvent(new Event("input",{bubbles:true}))}')
   page.wait_for_function('BAYPLAY.state.speedOverGround>2 && BAYPLAY.audio.metrics.rms>.0001',timeout=60000)
   r['engineAudio']=page.evaluate('BAYPLAY.audio.inspect()');page.locator('[data-gear09="-1"]').click();assert page.evaluate('BAYPLAY.state.gear===-1 && BAYPLAY.state.u>0');r['immediateReverseSelected']=True
   page.locator('#helm09-map').click();assert page.locator('#helm09-mapcard').is_visible();page.keyboard.press('m');assert page.locator('#helm09-mapcard').is_hidden()
   page.locator('#helm09-boat').click();page.locator('[data-act09="fishbox"]').click();page.locator('[data-act09="drawer1"]').click();page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.05 && BAYPLAY.inspect().drawers[0].value>.05');r['fittingsActuallyMoving']=True;page.locator('#helm09-close').click()
   r['waterBefore']=page.evaluate('({time:BAYPLAY.coast.waterShader.uniforms.uBayTime.value,heave:BAYPLAY.state.heave,water:SEA09_WATER.inspect()})');page.wait_for_timeout(1500);r['waterAfter']=page.evaluate('({time:BAYPLAY.coast.waterShader.uniforms.uBayTime.value,heave:BAYPLAY.state.heave})');assert r['waterAfter']['time']>r['waterBefore']['time'];assert r['waterBefore']['water']['nearWaterGridMetres']==.5;assert r['waterBefore']['water']['seabedColorMean']>.1
   page.locator('#helm09-radio').click();page.locator('#helm09-localplay').click();page.wait_for_function('!ATLAS_RADIO.audio.paused && ATLAS_RADIO.audio.currentTime>.5 && ATLAS_RADIO.peak>.0001',timeout=45000);r['localRadio']=page.evaluate('ATLAS_RADIO.inspect()');shot(page,dev+'_public_radio.png')
   page.locator('#helm09-mediaurl').fill('https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6');page.locator('#helm09-addmedia').click();r['spotifyExternalLink']=page.locator('#helm09-spotify').get_attribute('href');assert 'playlist/' in r['spotifyExternalLink']
   if dev=='desktop':
    page.locator('#helm09-mediaurl').fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');page.locator('#helm09-addmedia').click();page.wait_for_timeout(17000);r['youtubeFrame']=page.locator('#helm09-youtube iframe').count()>0;r['youtubeStatus']=page.locator('#helm09-ytstatus').inner_text()
    if r['youtubeFrame']:
     q=page.locator('#helm09-youtube iframe').bounding_box();assert q['width']>=200 and q['height']>=200;r['youtubeSize']=q
     try:page.frame_locator('#helm09-youtube iframe').locator('.ytp-large-play-button').click(timeout=6000);page.wait_for_timeout(3000)
     except Exception as e:r['youtubePlayAttempt']=str(e)[:250]
     r['youtubePlaybackStatus']=page.locator('#helm09-ytstatus').inner_text()
    shot(page,'desktop_public_youtube.png');page.locator('#helm09-youtubeclose').click();assert page.locator('#helm09-youtube iframe').count()==0
   page.locator('#helm09-close').click();page.locator('#helm09-pause').click();page.wait_for_function('BAYPLAY.inspect().paused && BAYPLAY.audio.held && ATLAS_RADIO.audio.paused')
   r['scrollWidth']=page.evaluate('document.documentElement.scrollWidth');assert r['scrollWidth']<=w+2
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as e:
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:shot(page,dev+'_public_ERROR.png')
   except Exception as e:r['screenshotError']=str(e)
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Public Sea Lab 09 smoke test failed'
