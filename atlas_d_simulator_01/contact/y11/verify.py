"""Actual browser operation. Local CI full cycle; exact public CDN smoke afterward.
No local response substitution in public mode; no extra simulation clock.
"""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import os,json,time,traceback,hashlib
Y=Path(__file__).resolve().parent;R=Y.parents[1];E=Y/'evidence';E.mkdir(exist_ok=True)
PUBLIC=os.environ.get('PUBLIC_CHECK')=='1';URL=os.environ.get('BASE_URL','http://127.0.0.1:8925/atlas_d_simulator_01/contact/y11/preview.html')
report={'passed':False,'url':URL,'public':PUBLIC,'source':os.environ.get('GITHUB_SHA'),'publishCommit':os.environ.get('PUBLIC_COMMIT'),'physicalDevice':False,'seaTrialValidated':False,'layouts':[]}
WANTED=['contact/y11/preview.html','contact/y11/host/index.html','contact/y11/physics.js','contact/y11/preview.js','contact/y11/telemetry.js','live/atlas-d.js','live/atlas-d-core.js','live/assets/ATLAS_D_Original.glb','contact/y9/pause-recovery.js','contact/y10/boarding-label.js']
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['browser']=browser.version
 try:
  layouts=[('desktop',1440,1000),('portrait',390,844),('landscape',844,390)]
  for name,w,h in layouts:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=True,is_mobile=name!='desktop')
   page=ctx.new_page();row={'name':name,'passed':False,'errors':[],'bindings':{},'screenshots':[]};report['layouts'].append(row)
   page.on('pageerror',lambda e:row['errors'].append(str(e)))
   def bind(response):
    if response.status!=200:return
    req=response.request;rel=None
    while req:
     path=urlsplit(req.url).path
     if '/atlas_d_simulator_01/' in path:
      value=path.split('/atlas_d_simulator_01/',1)[1]
      if value in WANTED:rel=value;break
     req=req.redirected_from
    if rel:
     try:
      b=response.body();expected=(R/rel).read_bytes();digest=hashlib.sha256(b).hexdigest()
      if b==expected:row['bindings'][rel]=digest
      else:row.setdefault('mismatchedResponses',[]).append({'path':rel,'sha256':digest})
     except Exception as e:row.setdefault('responseReadErrors',[]).append(str(e))
   page.on('response',bind)
   def host():return next(f for f in page.frames if '/y11/host/index.html' in f.url)
   def state():return host().evaluate('ATLAS_D_SIM.state.snapshot()')
   def tap(sel,outer=False):
    loc=page.locator(sel) if outer else page.frame_locator('#host').locator(sel)
    loc.scroll_into_view_if_needed(timeout=30000)
    b=loc.bounding_box();assert b,(sel,'no box')
    good=loc.evaluate('e=>{const r=e.getBoundingClientRect(),d=e.ownerDocument,t=d.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled&&(t===e||e.contains(t));}')
    assert good,(sel,'not hittable');page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(250)
   def shot(label):
    fn=('public-' if PUBLIC else 'local-')+name+'-'+label+'.png';page.screenshot(path=str(E/fn),timeout=60000);row['screenshots'].append(fn)
   def waitmode(mode,seconds):
    end=time.monotonic()+seconds;recoveries=0
    while state()['mode']!=mode and time.monotonic()<end:
     if state()['paused']:
      recoveries+=1;assert recoveries<=3,'Repeated render stalls';row.setdefault('stageResumeActions',[]).append({'target':mode,'reason':host().evaluate('ATLAS_D_SIM.state.message')});tap('#ad-pause')
     page.wait_for_timeout(500)
    assert state()['mode']==mode,(mode,state())
   try:
    page.goto(URL,wait_until='domcontentloaded',timeout=120000)
    if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click();row['hostNotice']=True
    page.wait_for_function('window.Y11_PUBLIC && window.Y4?.ready && window.Y9?.ready',timeout=180000)
    board=page.frame_locator('#host').locator('#ad-board');assert board.inner_text()=='Board original ATLAS D'
    row['beforeBoard']=state();tap('#ad-board')
    page.wait_for_function('Y4.latest?.physical.available',timeout=90000)
    if state()['paused']:row['startupPauseReason']=host().evaluate('ATLAS_D_SIM.state.message');tap('#ad-pause')
    assert not state()['paused'];assert state()['physicsModel']=='atlas-d-y11-3dof-1'
    shot('original-yacht')
    page.wait_for_timeout(700)
    if state()['paused']:row['capturePauseRecovered']=True;tap('#ad-pause')
    tap('#ad-engine');tap('[data-ad-gear="1"]')
    slider=page.frame_locator('#host').locator('#ad-throttle');b=slider.bounding_box();assert b
    page.touchscreen.tap(b['x']+b['width']*.73,b['y']+b['height']/2)
    tap('#station-view',outer=True)
    # Outer toolbar focus intentionally idles power; reapply native power inside the host.
    b=slider.bounding_box();page.touchscreen.tap(b['x']+b['width']*.73,b['y']+b['height']/2)
    steering=page.frame_locator('#host').locator('#ad-right').bounding_box();assert steering
    cdp=ctx.new_cdp_session(page);before=state();start=time.monotonic()
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':steering['x']+steering['width']/2,'y':steering['y']+steering['height']/2,'id':1}]})
    page.wait_for_timeout(14000 if name=='desktop' else 6000)
    after=state();wall=time.monotonic()-start
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.wait_for_timeout(500)
    assert after['elapsed']>before['elapsed']+3 and not after['paused'],after
    assert after['speedMps']>.03 and after['yawRate']>0 and after['rudderAngleRad']>0,after
    assert state()['rudder']==0
    row['normalOwnerMotion']={'wallSeconds':wall,'simulationSeconds':after['elapsed']-before['elapsed'],'before':before,'after':after,'testStepUsed':False,'frameRateClaim':False}
    x=page.evaluate('Y4.latest');assert x['sourceUnchanged'] and x['mapped']['attachment'] is None
    assert len(x['rays'])==5 and all(q['hit'] and q['errorM']<1e-5 and q['normalError']<1e-6 for q in x['rays']);row['physicalRays']=x['rays']
    tap('#ad-pause');frozen=state();page.wait_for_timeout(800);assert state()['elapsed']==frozen['elapsed']
    card=page.evaluate('Y9.inspect()');assert card['nativeNodeSame'] and card['nativeHandlerSame'];row['pauseCard']=card;shot('paused-station')
    tap('#ad-pause');page.wait_for_timeout(1000);assert state()['elapsed']>frozen['elapsed'];row['oneTapResume']=True
    if not PUBLIC and name=='desktop':
     tap('#y4-dive-tab');tap('#ad-reset');assert state()['engine'] is False and state()['depthM']==0
     tap('#ad-secure');waitmode('secured',70)
     tap('#ad-dive');waitmode('submerged',160);sub=state();assert abs(sub['depthM']-18)<.1 and sub['clearanceM']>15
     assert page.evaluate('!Y4.latest.physical.available');row['submerged']=sub
     shot('submarine');page.wait_for_timeout(700)
     if state()['paused']:tap('#ad-pause')
     tap('#ad-surface');waitmode('secured',140);tap('#ad-deploy');waitmode('surface',70)
     assert page.evaluate('Y4.latest.physical.available');row['actualDiveSurfaceCycle']=True
    tap('#ad-exit');assert not host().evaluate('ATLAS_D_SIM.active');assert page.frame_locator('#host').locator('#ad-board').is_visible();row['returnToBay']=True
    assert all(k in row['bindings'] for k in WANTED),{'missing':[k for k in WANTED if k not in row['bindings']]}
    assert not row['errors'],row['errors'];row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:row['failureState']=state();shot('FAILURE')
    except Exception:pass
    raise
   finally:
    (E/('public-browser.json' if PUBLIC else 'browser.json')).write_text(json.dumps(report,indent=2));ctx.close()
  report['passed']=all(x['passed'] for x in report['layouts'])
 finally:
  (E/('public-browser.json' if PUBLIC else 'browser.json')).write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'url':URL,'public':PUBLIC,'layouts':[x['name'] for x in report['layouts']]}))
