"""Real rendered controls and source-consistent water checks, not FPS/device certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,traceback
ROOT=Path(__file__).parent;OUT=Path(os.environ.get('REVIEW_DIR',ROOT/'review'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8911/index.html');DEVICE=os.environ.get('TEST_DEVICE','desktop')
report={'version':11,'passed':True,'url':URL,'physicalDeviceTested':False,'tests':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 layouts=[('desktop',1440,960)] if DEVICE=='desktop' else [('phone',430,932),('small-phone',375,812),('landscape',844,390)]
 for dev,w,h in layouts:
  c=b.new_context(viewport={'width':w,'height':h},has_touch=dev!='desktop');page=c.new_page();page.set_default_timeout(30000);r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  page.on('response',lambda e:r['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
  try:
   page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA11?.ready && SEA11_ENV.inspect().shaderCompiled',timeout=120000)
   page.evaluate('BAYPLAY.setPaused(true)');shot(page,dev+'_helm.png');r['initial']=page.evaluate('SEA11.inspect()')
   assert r['initial']['environment']['waveComponents']==6 and r['initial']['environment']['trees']>40
   r['initialLayout']=page.evaluate('''() => {const ids=['helm09-key','s11-less','s11-more','s11-left','s11-right','helm09-map','helm10-weather','helm09-settings','helm09-pause'];return ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id};});}''')
   for box in r['initialLayout']:
    assert box['width']>=32 and box['height']>=44,box
    assert box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1,box
    assert box['hit'],box
   assert page.evaluate('document.documentElement.scrollWidth')<=w+1
   # Large power buttons, actual gear state, hold/release steering.
   page.locator('#s11-more').click();assert page.evaluate('BAYPLAY.state.throttle>.09')
   page.locator('#s11-less').click();assert page.evaluate('BAYPLAY.state.throttle<.01')
   page.locator('[data-gear09="1"]').click();assert page.evaluate('BAYPLAY.state.gear===1')
   left=page.locator('#s11-left').bounding_box();page.mouse.move(left['x']+left['width']/2,left['y']+left['height']/2);page.mouse.down();page.wait_for_timeout(400);assert page.evaluate('BAYPLAY.state.steer<-.6 && window.ATLAS_TOUCH_STEERING');page.mouse.up();assert page.evaluate('BAYPLAY.state.steer===0')
   # Readable settings, optional docking power limiter, units and persistence.
   page.locator('#helm09-settings').click();page.locator('[data-a11="largeText"]').check();page.locator('[data-a11="feet"]').uncheck();page.locator('[data-a11="docking"]').check();page.locator('[data-a11="steadyCamera"]').check();shot(page,dev+'_accessibility.png')
   assert page.evaluate('SEA11.options.largeText && SEA11.options.docking && SEA11.options.steadyCamera');assert page.locator('#helm09-depth').inner_text().endswith('m')
   page.locator('#helm09-close').click();page.wait_for_timeout(250)
   page.locator('#s11-more').click(click_count=4);assert page.evaluate('BAYPLAY.state.throttle<=.221');r['dockLimit']=page.evaluate('BAYPLAY.state.throttle')
   page.locator('#helm09-settings').click();page.locator('[data-a11="largeText"]').uncheck();page.locator('[data-a11="docking"]').uncheck();page.locator('[data-a11="feet"]').check();page.locator('#s11-menu-places').click();page.locator('[data-place11="52,-40"]').click();assert page.evaluate('CMD_INSTRUMENTS.waypoint.x===52');page.locator('#helm09-close').click();page.wait_for_timeout(250)
   page.locator('#helm09-map').click();assert page.locator('#helm09-mapcard').is_visible();shot(page,dev+'_map.png');page.locator('#helm09-mapclose').click();page.wait_for_timeout(250)
   # Fittings are actual geometry with truthful Open/Closed state.
   page.locator('#helm09-boat').click();page.locator('[data-act09="fishbox"]').click();before_fitting=page.evaluate('({time:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.5');assert before_fitting==page.evaluate('({time:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');r['pausedFittingWithoutPhysicsAdvance']=True;page.wait_for_timeout(250);assert page.locator('[data-state11="fishbox"]').inner_text()=='Open'
   page.locator('[data-detail09="deck"]').first.click();shot(page,dev+'_interactive_bow.png');page.locator('#helm09-close').click();page.wait_for_timeout(250)
   if dev in ['desktop','phone']:
    page.locator('#helm10-weather').click();page.locator('[data-weather10="swell"]').click();page.locator('#helm09-close').click();page.evaluate('BAYPLAY.setPaused(true);SEA09.relocate("basin",30,-40,0);BAYPLAY.setPaused(true);BAYPLAY.testStep(8);SEA09.view("follow")')
    shot(page,dev+'_waves_shallows.png');r['waves']=page.evaluate('({height:BAYPLAY.state.heave,amplitude:BayMotion.PRESETS[BAYPLAY.state.environment].amp,environment:SEA11_ENV.inspect()})')
    assert r['waves']['amplitude']>.2
    page.evaluate('SEA09.relocate("basin",-155,53,0);BAYPLAY.setPaused(true);SEA09.view("follow")');shot(page,dev+'_shoreline.png')
   if dev=='desktop':
    # Physical ignition plus recorded audio path remains operational through the UI.
    page.evaluate('SEA10.recover();BAYPLAY.setPaused(true);SEA11.setOption("docking",false)');page.locator('#helm09-key').click()
    for attempt in range(3):
     page.wait_for_function('BAYPLAY.pauseReason==="render-stall" || (BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3)',timeout=60000)
     if page.evaluate('BAYPLAY.pauseReason!=="render-stall"'):break
     page.locator('#sea10-resume').click()
    assert page.evaluate('BAYPLAY.state.engine');page.locator('[data-gear09="1"]').click();page.locator('#s11-more').click(click_count=5)
    for attempt in range(3):
     page.wait_for_function('BAYPLAY.pauseReason==="render-stall" || (BAYPLAY.state.speedOverGround>1 && BAYPLAY.audio.metrics.rms>.0001)',timeout=60000)
     if page.evaluate('BAYPLAY.pauseReason!=="render-stall"'):break
     page.locator('#sea10-resume').click()
    r['drivingAudio']=page.evaluate('BAYPLAY.audio.inspect()');assert page.evaluate('BAYPLAY.state.speedOverGround>1')
    page.locator('#helm09-settings').click();page.wait_for_timeout(300);assert page.evaluate('BAYPLAY.inspect().paused');page.locator('#helm09-close').click();page.wait_for_timeout(300);assert not page.evaluate('BAYPLAY.inspect().paused');r['autoPauseResume']=True
    page.locator('#helm09-pause').click()
   if dev=='desktop':
    page.evaluate('SEA10.chooseWeather("clear");SEA09.relocate("basin",-174,28,.8);BAYPLAY.setPaused(true);BAYPLAY.testStep(9);BAYPLAY.setQuality(false);SEA09.view("follow")');page.wait_for_timeout(900);shot(page,'desktop_island_high_detail.png')
    page.evaluate('SEA09.relocate("basin",59,-44,0);BAYPLAY.setPaused(true);SEA09_WATER.setClarity(.14);SEA09.view("follow")');page.wait_for_timeout(800);shot(page,'desktop_sandbar_high_detail.png')
    page.evaluate('SEA09.view("helm");document.getElementById("s11-look").click()');page.wait_for_timeout(500);shot(page,'desktop_water_angle_high_detail.png')
    r['sceneryReview']=page.evaluate('SEA11_ENV.inspect()');assert r['sceneryReview']['overlappingBottomSuppressed'];page.evaluate('BAYPLAY.setQuality(true)')
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r
   r['passed']=True
  except Exception as e:
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:shot(page,dev+'_ERROR.png')
   except:pass
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Sea Lab 11 browser review failed'
