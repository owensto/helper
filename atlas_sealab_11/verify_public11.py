"""Verify the immutable public viewer without local asset substitution."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,traceback
URL=os.environ['BASE_URL'];OUT=Path(os.environ['REVIEW_DIR']);OUT.mkdir(parents=True,exist_ok=True)
DEV=os.environ.get('TEST_DEVICE','desktop')
report={'version':11,'passed':True,'exactPublicAssets':True,'url':URL,'physicalDeviceTested':False,'tests':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
def drive_wait(p,expr,r):
 for _ in range(3):
  p.wait_for_function('BAYPLAY.pauseReason==="render-stall" || ('+expr+')',timeout=60000)
  if p.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  r.setdefault('renderStallRecovery',[]).append(p.evaluate('({...SEA_TIMING})'));p.locator('#sea10-resume').click()
 raise AssertionError('Repeated render stalls prevented driving')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 layouts=[('desktop',1440,960)] if DEV=='desktop' else [('phone',430,932),('small-phone',375,812),('landscape',844,390)]
 for dev,w,h in layouts:
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev!='desktop');p=c.new_page();p.set_default_timeout(45000);r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[]};report['tests'].append(r)
  p.on('pageerror',lambda e:r['errors'].append(str(e)))
  p.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  p.on('response',lambda e:r['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
  try:
   p.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if p.get_by_text('Open the page',exact=True).count():p.get_by_text('Open the page',exact=True).click()
   p.wait_for_function('window.SEA11?.ready && SEA11_ENV.inspect().shaderCompiled',timeout=120000);p.evaluate('BAYPLAY.setPaused(true)');shot(p,dev+'_public_helm.png')
   r['environment']=p.evaluate('SEA11_ENV.inspect()');assert r['environment']['waveComponents']==6 and r['environment']['trees']>=40
   assert not p.evaluate('SEA10.inspect().options.explosions || SEA10.inspect().options.ejection || BAYPLAY.audio.enabled')
   ids=['helm09-key','s11-less','s11-more','s11-left','s11-right','helm09-map','helm10-weather','helm09-settings','helm09-pause']
   r['hitTargets']=p.evaluate('''ids=>ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id}})''',ids)
   for q in r['hitTargets']:assert q['hit'] and q['width']>=32 and q['height']>=44 and q['x']>=0 and q['y']>=0 and q['x']+q['width']<=w+1 and q['y']+q['height']<=h+1,q
   p.locator('#s11-more').click();assert p.evaluate('BAYPLAY.state.throttle>.09');p.locator('#s11-less').click();assert p.evaluate('BAYPLAY.state.throttle<.01')
   p.locator('#helm09-settings').click();p.locator('[data-a11="feet"]').uncheck();p.locator('[data-a11="docking"]').check();p.wait_for_timeout(300);assert p.locator('#helm09-depth').inner_text().endswith('m');p.locator('#helm09-close').click();p.wait_for_timeout(200);p.locator('#s11-more').click(click_count=5);assert p.evaluate('BAYPLAY.state.throttle<=.221');r['dockingPowerCap']=True
   p.locator('#helm09-boat').click();p.wait_for_function('BAYPLAY.inspect().paused');at=p.evaluate('({t:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');p.locator('[data-act09="fishbox"]').click();p.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.5');assert at==p.evaluate('({t:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');r['pausedFittings']=True;p.locator('#helm09-close').click();p.wait_for_timeout(250)
   p.locator('#helm09-map').click();assert p.locator('#helm09-mapcard').is_visible();p.locator('#helm09-mapclose').click();p.wait_for_timeout(200);r['mapToggle']=True
   if dev=='desktop':
    p.evaluate('SEA10.recover();SEA11.setOption("docking",false);BAYPLAY.setPaused(true)');p.locator('#helm09-key').click();drive_wait(p,'BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3',r)
    p.locator('[data-gear09="1"]').click();p.locator('#s11-more').click(click_count=5);drive_wait(p,'BAYPLAY.state.speedOverGround>1 && BAYPLAY.audio.metrics.rms>.0001',r);r['recordedEngineAudio']=p.evaluate('BAYPLAY.audio.inspect()')
    p.locator('#helm09-settings').click();p.wait_for_function('BAYPLAY.inspect().paused');p.locator('#helm09-close').click();p.wait_for_function('!BAYPLAY.inspect().paused');r['autoPauseResume']=True;p.locator('#helm09-pause').click()
   assert p.evaluate('document.documentElement.scrollWidth')<=w+1
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as e:
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:shot(p,dev+'_public_ERROR.png')
   except Exception:pass
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Public Sea Lab 11 checks failed'
