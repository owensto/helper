"""Actual retained host: source-backed Beaufort, optical repair, async rasters and controls.
No screenshot pass is used as an FPS/physical-device or hydrodynamics certification.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,time,traceback
OUT=Path(os.environ.get('REVIEW_DIR','review'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8914/index.html');DEVICE=os.environ.get('TEST_DEVICE','desktop')
report={'version':13,'url':URL,'passed':True,'actualBrowser':True,'physicalDeviceTested':False,'tests':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
def camera_shot(p,name,cam,target):
 p.evaluate('BAYPLAY.capturePaused=true')
 p.evaluate('''({cam,target})=>{const A=BAYPLAY,T=ATLASRuntime;A.camera.position.copy(A.boat.localToWorld(new T.Vector3(...cam)));A.camera.lookAt(A.boat.localToWorld(new T.Vector3(...target)));A.camera.updateMatrixWorld(true);SEA06.beforeRender();A.renderer.render(A.scene,A.camera)}''',{'cam':cam,'target':target})
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
def await_drive(p,r,condition):
 for _ in range(4):
  p.wait_for_function('BAYPLAY.pauseReason==="render-stall" || ('+condition+')',timeout=60000)
  if p.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  r['visibleResumeRecoveries']=r.get('visibleResumeRecoveries',0)+1;p.locator('#sea10-resume').click()
 raise AssertionError('Repeated render stalls')
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
 b=p.chromium.launch(**opts)
 layouts=[('desktop',1440,960)] if DEVICE=='desktop' else [('phone',430,932),('small-phone',375,812)]
 for dev,w,h in layouts:
  ctx=b.new_context(viewport={'width':w,'height':h},has_touch=dev!='desktop',record_video_dir=str(OUT/'videos'),record_video_size={'width':w,'height':h});page=ctx.new_page();page.set_default_timeout(45000);r={'device':dev,'passed':False,'errors':[],'shaderErrors':[],'assetErrors':[],'checks':[]};report['tests'].append(r)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log']) else None)
  page.on('response',lambda e:r['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
  try:
   start=time.monotonic();page.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA13?.ready && SEA13.inspect().water.terrainRebuilds>0 && !SEA13.inspect().water.visualTilePending',timeout=120000)
   page.wait_for_function('document.getElementById("sea13-loading").hidden',timeout=30000)
   r['timeToReadySeconds']=time.monotonic()-start;r['initial']=page.evaluate('SEA13.inspect()');assert r['initial']['location']=='beaufort';assert not page.evaluate('BAYPLAY.state.engine||BAYPLAY.audio.enabled');assert r['initial']['scenery']['counts']['bridges']==23 and r['initial']['scenery']['counts']['buildings']==514;assert r['initial']['stream']['worker'];assert r['initial']['hullMask']['heightAware'];assert page.evaluate('Sea13Model.compressed');r['modelTransport']=page.evaluate('({...Sea13Model})');r['checks'].append('source-known Beaufort default; engine/audio opt-in; baked coast and worker active')
   page.evaluate('BAYPLAY.setPaused(true)');shot(page,dev+'_default_beaufort.png')
   depth=page.evaluate('Sea09World.inspect(BAYPLAY.state)');assert depth['known'] and depth['waterDepth']>1.2 and depth['contact']['clearance']>0;r['defaultDepth']=depth
   r['controls']=page.evaluate('''()=>['helm09-key','s11-less','s11-more','s11-left','s11-right','helm09-map','helm09-pause'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id}})''')
   assert page.evaluate('document.documentElement.scrollWidth')<=w+1
   for q in r['controls']:assert q['w']>=32 and q['h']>=44 and q['hit'],q
   r['checks'].append('large reachable controls; no horizontal overflow')
   r['renderBoundary']=page.evaluate('''()=>{const A=BAYPLAY,W=Sea09World,old=W.sample;let calls=0;W.sample=function(...a){calls++;return old.apply(this,a)};A.state.x+=33;A.refresh();calls=0;const t=performance.now();SEA06.beforeRender();const elapsed=performance.now()-t;W.sample=old;return{calls,elapsedMs:elapsed,desired:[Math.round(A.state.x/32)*32,Math.round(A.state.z/32)*32]}}''')
   assert r['renderBoundary']['calls']<40,r['renderBoundary'];page.wait_for_function('SEA09_WATER.inspect().origin[0]===Math.round(BAYPLAY.state.x/32)*32 && !SEA09_WATER.inspect().visualTilePending',timeout=45000)
   assert page.evaluate('SEA13_STREAM.inspect().terrainTiles<=6 && SEA13_STREAM.inspect().pending<=4');r['streamAfterTile']=page.evaluate('SEA13_STREAM.inspect()');r['checks'].append('tile crossing schedules visual worker; bounded main-thread commit/cache')
   page.evaluate('BAYPLAY.setPaused(false)');page.locator('#helm09-map').click();assert not page.evaluate('BAYPLAY.inspect().paused');t=page.evaluate('BAYPLAY.state.elapsed');page.wait_for_timeout(1100);assert page.evaluate('BAYPLAY.state.elapsed')>t
   page.wait_for_function('SEA13_STREAM.inspect().mapTiles>0',timeout=45000);shot(page,dev+'_live_chart.png');page.evaluate('BAYPLAY.setPaused(true)');page.locator('#s12-geomap').click();page.wait_for_timeout(300);before=page.evaluate('SEA13_STREAM.inspect().mapRequests');page.wait_for_timeout(700);assert page.evaluate('SEA13_STREAM.inspect().mapRequests')==before;r['checks'].append('live map, asynchronous depth raster, hidden chart stops requesting work');shot(page,dev+'_geo_map.png');page.locator('#helm09-mapclose').click()
   page.evaluate('SEA09.view("captain")');assert page.evaluate('BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").visible');shot(page,dev+'_captain.png');page.locator('#helm09-boat').click();page.locator('[data-act09="fishbox"]').click();t=page.evaluate('BAYPLAY.state.elapsed');page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.5');assert page.evaluate('BAYPLAY.state.elapsed')==t;page.locator('[data-act09="fishbox"]').click();page.locator('#helm09-close').click();r['checks'].append('same captain and working source fittings retained')
   if dev in ['desktop','phone']:
    page.evaluate('SEA10.chooseWeather("clear");BAYPLAY.testStep(9);BAYPLAY.setPaused(true);SEA09.view("follow")')
    camera_shot(page,dev+'_waterline_side.png',[-1,1.2,8],[0,0,0]);camera_shot(page,dev+'_waterline_high.png',[-6,5,6],[0,.1,0]);camera_shot(page,dev+'_shore_view.png',[-7,5,-8],[4,1,-15]);page.evaluate('SEA09.view("follow")')
    page.locator('#helm09-key').click();await_drive(page,r,'BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3');page.locator('[data-gear09="1"]').click();page.locator('#s11-more').click(click_count=5);await_drive(page,r,'BAYPLAY.state.speedOverGround>2 && BAYPLAY.audio.metrics.rms>.0001');r['poweredAudio']=page.evaluate('BAYPLAY.audio.inspect()');page.locator('[data-gear09="-1"]').click();assert page.evaluate('BAYPLAY.state.gear===-1 && BAYPLAY.state.u>0');page.locator('#helm09-pause').click();r['checks'].append('actual ignition/audio/acceleration, immediate reversal keeps inertia');shot(page,dev+'_underway.png')
    page.locator('#helm10-weather').click();page.locator('[data-weather10="swell"]').click();page.locator('#helm09-close').click();page.evaluate('BAYPLAY.setPaused(true);BAYPLAY.testStep(8);SEA09.view("follow")');shot(page,dev+'_swell.png')
    page.evaluate('SEA10.chooseWeather("clear");BAYPLAY.testStep(10);BAYPLAY.setPaused(true);SEA09.view("helm")');shot(page,dev+'_dry_cockpit.png')
    page.evaluate('''()=>{const A=BAYPLAY;A.capturePaused=true;A.camera.position.set(-180,24,-50);A.camera.lookAt(-50,5,-310);A.camera.updateMatrixWorld(true);SEA06.beforeRender();A.renderer.render(A.scene,A.camera)}''')
    try:page.screenshot(path=str(OUT/(dev+'_waterfront_detail.png')),timeout=60000)
    finally:page.evaluate('BAYPLAY.capturePaused=false;SEA09.view("follow")')
    page.evaluate('BAYPLAY.setQuality(false)');page.wait_for_function('SEA12_WATER.inspect().reflectionFrames>0',timeout=30000);shot(page,dev+'_detailed.png');page.evaluate('BAYPLAY.setQuality(true)');r['checks'].append('wave animation and both graphic modes compile')
   r['final']=page.evaluate('SEA13.inspect()');assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as e:
   r['error']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:r['failureState']=page.evaluate('({boat:window.BAYPLAY?.inspect(),new:window.SEA13?.inspect(),geo:window.SEA12_GEO?.inspect(),stream:window.SEA13_STREAM?.inspect()})');shot(page,dev+'_ERROR.png')
   except Exception as ex:r['captureError']=str(ex)
  finally:ctx.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(dev,r['passed'],r.get('error',''),flush=True)
 b.close()
assert report['passed'],'Beaufort13 actual browser review failed'
