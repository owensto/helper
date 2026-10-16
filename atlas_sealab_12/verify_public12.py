"""Public smoke test: published assets only, no local substitutions."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,traceback
URL=os.environ['BASE_URL'];OUT=Path(os.environ['REVIEW_DIR']);OUT.mkdir(parents=True,exist_ok=True)
DEV=os.environ.get('TEST_DEVICE','desktop');report={'release':12,'passed':True,'exactPublicAssets':True,'url':URL,'physicalDeviceTested':False,'tests':[]}
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
   p.wait_for_function('window.SEA12?.ready && SEA12_WATER.inspect().shaderCompiled && SEA12_GEO.inspect().ready',timeout=120000)
   p.evaluate('BAYPLAY.setPaused(true)');r['initial']=p.evaluate('SEA12.inspect()');assert not p.evaluate('BAYPLAY.audio.enabled || SEA10.inspect().options.explosions || SEA10.inspect().options.ejection')
   shot(p,dev+'_public_helm.png')
   ids=['helm09-key','s11-less','s11-more','s11-left','s11-right','helm09-map','helm10-weather','helm09-settings','helm09-pause']
   r['targets']=p.evaluate('''ids=>ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id}})''',ids)
   for q in r['targets']:assert q['hit'] and q['w']>=32 and q['h']>=44 and q['x']>=0 and q['y']>=0 and q['x']+q['w']<=w+1 and q['y']+q['h']<=h+1,q
   p.locator('#s11-more').click();assert p.evaluate('BAYPLAY.state.throttle>.09');p.locator('#s11-less').click();assert p.evaluate('BAYPLAY.state.throttle<.01')
   p.locator('#helm09-settings').click();p.locator('#s12-captainview').click();p.wait_for_timeout(250);shot(p,dev+'_public_captain.png');assert p.evaluate('BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").visible')
   p.locator('[data-view09="helm"]').click();p.evaluate('BAYPLAY.setPaused(false)');p.locator('#helm09-map').click();p.wait_for_timeout(400);assert not p.evaluate('BAYPLAY.inspect().paused'),'Opening map paused trip'
   r['mapTargets']=p.evaluate('''() => ['helm09-key','s11-more'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id}})''');assert all(q['hit'] for q in r['mapTargets'])
   t=p.evaluate('BAYPLAY.state.elapsed');p.wait_for_timeout(900);assert p.evaluate('BAYPLAY.state.elapsed')>t;r['liveMapNoPause']=True;shot(p,dev+'_public_live_map.png');p.locator('#helm09-mapclose').click();p.evaluate('BAYPLAY.setPaused(true)')
   if dev=='desktop':
    p.locator('#helm09-key').click();drive_wait(p,'BAYPLAY.state.engine && BAYPLAY.state.startTimer===0 && BAYPLAY.audio.quality09.layers===3',r);p.locator('[data-gear09="1"]').click();p.locator('#s12-wot').click();assert p.evaluate('BAYPLAY.state.throttle===1 && !SEA11.options.docking')
    drive_wait(p,'BAYPLAY.state.speedOverGround>3 && BAYPLAY.audio.metrics.rms>.0001',r);r['drivingAudio']=p.evaluate('BAYPLAY.audio.inspect()');p.locator('#helm09-map').click();drive_wait(p,'!BAYPLAY.inspect().paused && SEA12_WATER.inspect().wakePackets>1',r);r['water']=p.evaluate('SEA12_WATER.inspect()');p.locator('#helm09-mapclose').click();p.locator('#helm09-pause').click()
    p.locator('#helm09-settings').click();p.locator('#s12-woods').click();p.wait_for_timeout(450);r['beaufort']=p.evaluate('SEA12_GEO.inspect()');assert r['beaufort']['visible'] and r['beaufort']['buildings']>=100 and r['beaufort']['bridges']>=3;shot(p,'desktop_public_beaufort.png')
    p.locator('#helm09-map').click();p.locator('#s12-geomap').click();p.wait_for_timeout(400);assert p.evaluate('SEA12_GEO.inspect().mapInitialized');shot(p,'desktop_public_geo_map.png');p.locator('#helm09-mapclose').click()
    assert p.evaluate('Sea09ParseMedia("https://www.youtube.com/playlist?list=PL1234567890ABCDE").id.startsWith("playlist:")');r['youtubePlaylistParsing']=True;r['externalMusicPlaybackVerified']=False
   assert p.evaluate('document.documentElement.scrollWidth')<=w+1
   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r;r['passed']=True
  except Exception as e:
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:r['state']=p.evaluate('({revision:window.SEA12?.inspect(),app:window.BAYPLAY?.inspect()})');shot(p,dev+'_public_ERROR.png')
   except Exception:pass
  finally:c.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print(json.dumps(report,indent=2));assert report['passed'],'Public Sea Lab 12 checks failed'
