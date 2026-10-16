"""Y9 real before/after pause discoverability. No state writes or auto-resume.
Screenshots occur only after startup observation; no performance claim/timing run.
"""
from pathlib import Path
import os,json,time,traceback,base64,struct,platform
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
ORIGIN=os.environ.get('ORIGIN','http://127.0.0.1:8923');LAYOUT=os.environ.get('LAYOUT','portrait')
SIZES={'portrait':(390,844),'landscape':(844,390)};W,H=SIZES[LAYOUT]
STALL='Rendering stalled. Paused instead of pretending simulated time kept up.'
report={'passed':False,'layout':LAYOUT,'runtimeBaseline':'e30edc8e33b863f3fafb303be0050cc86b7900f0','branchBaseline':'428251d63603bbe3d9915f145097889b66804e34','sourceSHA':os.environ.get('GITHUB_SHA'),'scenarios':[],'errors':[],'shaderErrors':[],'physicalDevice':False,'safari':False,'timingExperiment':False,'screenshotsDuringStartupObservation':False,'hiddenTabCoverage':'UNVERIFIED_NO_WORKAROUND','humanActivation':False}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['environment']={'browser':browser.version,'os':platform.platform(),'cpus':os.cpu_count(),'image':os.environ.get('ImageVersion'),'headless':True,'hasTouch':True,'isMobile':True,'deviceScaleFactor':1,'softwareRenderingExpected':True}
 try:
  # Baseline is exercised before the candidate; there is no baseline alteration.
  for entry,repeat in [('y4',0),('y9',0),('y9',1)]:
   candidate=entry=='y9';ctx=browser.new_context(viewport={'width':W,'height':H},has_touch=True,is_mobile=True,device_scale_factor=1)
   ctx.add_init_script(script="window.__Y7_MODE='events-only';\n"+(R.parent/'y7/startup-observer.js').read_text())
   page=ctx.new_page();cdp=ctx.new_cdp_session(page);fl=page.frame_locator('#host');f=None;startup=True
   row={'entry':entry,'repeat':repeat,'passed':False,'touchActions':[],'screenshots':[],'checks':{}};report['scenarios'].append(row)
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader error','validate_status','program info log']) else None)
   def touch(kind,x=None,y=None):
    cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y,'radiusX':3,'radiusY':3,'id':1}]})
   def drag(x,y,dy):
    touch('touchStart',x,y)
    for i in range(1,9):touch('touchMove',x,y+dy*i/8);page.wait_for_timeout(40)
    touch('touchEnd');page.wait_for_timeout(400)
   def target(sel,outer=False):
    loc=page.locator(sel) if outer else fl.locator(sel)
    for attempt in range(5):
     q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),w=e.ownerDocument.defaultView,h=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1,hit:h===e||e.contains(h),disabled:e.disabled===true};}''')
     b=loc.bounding_box()
     if q['inside'] and q['hit'] and b and not q['disabled']:
      assert q['height']>=44 and q['width']>=32,(sel,q);return b,q
     assert not outer,('Outer target unreachable',sel,q)
     dock=fl.locator('#y4-dock').bounding_box();assert dock,(sel,q)
     down=q['y']>100;y=dock['y']+dock['height']-32 if down else dock['y']+68
     end=dock['y']+68 if down else dock['y']+dock['height']-32
     drag(dock['x']+dock['width']-5,y,end-y)
    raise AssertionError(('Target unreachable after trusted scrolling',sel,q))
   def tap(sel,outer=False):
    b,q=target(sel,outer);row['touchActions'].append({'selector':sel,'outer':outer,'action':'tap','target':q});page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(500)
   def snapshot(label):
    state=f.evaluate('''()=>{const p=ATLAS_D_SIM,s=p.state;function box(id){const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:e.textContent,visible:!!e.getClientRects().length&&c.display!=='none'&&c.visibility!=='hidden',fontSize:c.fontSize,x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,centerHit:hit===e||e.contains(hit)};}return {active:p.active,paused:s.paused,message:s.message,elapsed:s.elapsed,sequence:s.sequence,throttle:s.throttle,rudder:s.rudder,engine:s.engine,gear:s.gear,mode:s.mode,viewport:[innerWidth,innerHeight],native:box('ad-pause'),notice:box('ad-notice'),card:box('y9-pause-card'),title:box('y9-pause-title'),reason:box('y9-pause-reason'),stats:box('ad-depth'),dock:document.getElementById('y4-dock').dataset.panel};}''')
    state['label']=label
    if candidate:
     state['presentation']=page.evaluate('Y9.inspect()');p=state['presentation'];assert p['nativeNodeSame'] and p['nativeHandlerSame'] and p['nativeButtonCount']==1,p
     assert p['cardHidden']==(not(state['active'] and state['paused'])),state
     if state['active'] and state['paused']:
      assert state['card']['visible'] and state['card']['inside'],state
      assert state['native']['text']=='Resume' and state['native']['centerHit'],state
      assert state['title']['visible'] and state['reason']['visible'],state
     else:assert not state['card']['visible'],state
    return state
   def physical():
    x=page.evaluate('Y4.latest');assert x['sourceUnchanged'] and x['physical']['available'] and x['mapped']['attachment'] is None and x['mapped']['valid'] is False
    assert len(x['rays'])==5
    for r in x['rays']:assert r['hit'] and r['errorM']<1e-5 and r['normalError']<1e-6,r
    assert x['physical']['articulation']['controlNormalized']==x['state']['rudder']
    scene=x['viewport']['scene'];assert scene['available']
    for p in x['screenContacts']:
     assert scene['x']<=p['x']<=scene['x']+scene['width'] and scene['y']<=p['y']<=scene['y']+scene['height']
     assert f.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.id',p)=='scene'
    return {k:x[k] for k in ['frame','state','rays','viewport','screenContacts','sourceUnchanged']}
   def shot(name):
    assert not startup,'No screenshot during startup observation'
    size=page.evaluate('[innerWidth,innerHeight]');raw=base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False,'fromSurface':True})['data']);assert list(struct.unpack('>II',raw[16:24]))==size
    assert page.evaluate('[innerWidth,innerHeight]')==size
    fn=f'{entry}-{repeat}-{name}.png';(E/fn).write_bytes(raw);row['screenshots'].append({'file':fn,'size':size});return fn
   try:
    page.goto(ORIGIN+f'/atlas_d_simulator_01/contact/{entry}/preview.html',wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function('window.Y4?.ready || window.Y4?.error',timeout=180000);assert not page.evaluate('Y4.error')
    if candidate:page.wait_for_function('window.Y9?.ready || window.Y9?.error');assert not page.evaluate('Y9.error')
    f=page.frames[1];f.evaluate('__Y7.attachTail()');page.evaluate('__Y7.attachTail()')
    tap('#ad-board');page.wait_for_function('Y4.latest?.physical.available',timeout=90000);page.wait_for_timeout(6000)
    row['startup']=snapshot('natural-startup-observation-end');startup=False
    if row['startup']['paused']:
     assert row['startup']['message']==STALL,row['startup']
     row['naturalStall']=True
     if candidate:assert row['startup']['presentation']['latest']['reason']=='stall',row['startup']
     shot('natural-stall-no-details')
     # A paused owner remains paused until this deliberate visible input.
     frozen=row['startup']['elapsed'];page.wait_for_timeout(1000);assert snapshot('still-paused')['elapsed']==frozen
     n=len(row['touchActions']);tap('#ad-pause');row['startupRecoveryActions']=len(row['touchActions'])-n
     assert not snapshot('after-stall-resume')['paused']
    else:row['naturalStall']=False;row['startupRecoveryActions']=None
    # Both baseline and candidate receive this same manual path.
    start=snapshot('running');page.wait_for_timeout(800);assert snapshot('running-next')['elapsed']>start['elapsed']
    tap('#ad-pause');row['manual']=snapshot('manual-paused');assert row['manual']['paused']
    frozen=row['manual']['elapsed'];page.wait_for_timeout(1000);assert snapshot('manual-frozen')['elapsed']==frozen
    if candidate:assert row['manual']['presentation']['latest']['reason']=='manual',row['manual']
    physical();shot('manual-paused-helm')
    for sel in ['#ad-engine','#ad-left','#ad-center','#ad-right']:target(sel)
    tap('#y4-hide');row['hidden']=snapshot('paused-hidden-controls');assert row['hidden']['paused'] and row['hidden']['elapsed']==frozen
    if candidate:assert row['hidden']['reason']['visible'] and row['hidden']['reason']['inside']
    else:assert row['hidden']['notice']['visible'] is False
    shot('paused-controls-hidden');n=len(row['touchActions']);tap('#ad-pause');row['hiddenRecoveryActions']=len(row['touchActions'])-n
    row['recovered']=snapshot('recovered-native-button');assert not row['recovered']['paused'];assert row['hiddenRecoveryActions']==1
    tap('#y4-hide');tap('#ad-pause');tap('#y4-dive-tab');row['diveDock']=snapshot('manual-paused-dive-dock');assert row['diveDock']['paused']
    target('#ad-target');shot('manual-paused-dive-dock');tap('#ad-pause');tap('#y4-helm-tab')
    if candidate and repeat==1:
     # Real controls while paused, with all existing physical evaluation retained.
     tap('#ad-pause');paused=snapshot('before-paused-steering');b,q=target('#ad-left');touch('touchStart',b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(700)
     held=snapshot('paused-held-left');assert held['rudder']==-1 and held['elapsed']==paused['elapsed'];physical();touch('touchEnd');page.wait_for_timeout(500);assert snapshot('released')['rudder']==0
     before=physical();new='landscape' if LAYOUT=='portrait' else 'portrait';rw,rh=SIZES[new]
     cdp.send('Emulation.setDeviceMetricsOverride',{'width':rw,'height':rh,'deviceScaleFactor':1,'mobile':True,'screenWidth':rw,'screenHeight':rh,'screenOrientation':{'type':new+'Primary','angle':90 if new=='landscape' else 0}})
     page.wait_for_function(f'Y4.latest?.viewport?.width==={rw} && Y4.latest?.viewport?.height==={rh-56}',timeout=45000);page.wait_for_timeout(600)
     rotated=snapshot('paused-rotation');assert rotated['paused'] and rotated['elapsed']==paused['elapsed'];target('#ad-pause');after=physical()
     for k in ['instanceId','activationEpoch','simulationEpoch','worldRevision','hostSessionId']:assert before['frame'][k]==after['frame'][k]
     row['rotation']={'before':before,'after':after,'ui':rotated};shot('paused-rotated-native-resume');tap('#ad-pause');assert not snapshot('rotation-resumed')['paused']
     # Focus-loss idle is not pause and must not show the card.
     tap('#ad-engine');tap('[data-ad-gear="1"]');b,q=target('#ad-throttle');page.touchscreen.tap(b['x']+b['width']*.4,b['y']+b['height']/2);page.wait_for_timeout(800)
     powered=snapshot('powered-before-blur');assert powered['engine'] and powered['gear']==1 and powered['throttle']>.25 and not powered['paused']
     tap('#info',True);blur=snapshot('blur-does-not-mean-paused');assert blur['throttle']==0 and blur['rudder']==0 and not blur['paused'] and blur['presentation']['cardHidden']
     tap('#close-info',True);row['blur']={'before':powered,'after':blur};physical()
     # Unrelated owner message changes while deliberately paused preserve cause.
     tap('#ad-pause');tap('#ad-engine');changed=snapshot('paused-after-owner-notice-change');assert changed['presentation']['latest']['reason']=='manual' and changed['paused']
     row['noticeChangeWhilePaused']=changed;shot('manual-reason-not-stale-notice');tap('#ad-pause')
     tap('#ad-exit');page.wait_for_function('!document.getElementById("host").contentWindow.ATLAS_D_SIM.active');row['exit']=snapshot('inactive-no-pause-card');assert not row['exit']['card']['visible']
    row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:
     startup=False;touch('touchEnd');row['failureState']=snapshot('failure');shot('FAILURE')
    except Exception:pass
    raise
   finally:
    if f:
     try:row['hostEvents']=f.evaluate('__Y7.read()');row['touchEvents']=page.evaluate('Y4.inputEvents')
     except Exception as e:row['traceError']=str(e)
    (E/'browser.json').write_text(json.dumps(report,indent=2));ctx.close()
  assert not report['errors'] and not report['shaderErrors'],report
  report['passed']=True
 finally:
  (E/'browser.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'layout':LAYOUT,'contexts':len(report['scenarios']),'naturalStalls':sum(x.get('naturalStall',False) for x in report['scenarios']),'runtimeOwnerChanged':False},indent=2))
