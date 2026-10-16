"""Y8 replay-complete original-Y4 passive records and trusted touch. Existing authorized CI only.
No screenshots/video, pixel reads, correctness raycasts or trace profiler inside
measurement. Normal original Y4 samples (including its existing checks) stay on.
"""
from pathlib import Path
import os,json,time,traceback,hashlib,platform
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
NAME=os.environ.get('LAYOUT','portrait');ENTRY=os.environ.get('ENTRY','y4');SIZE={'portrait':(390,844),'landscape':(844,390)}[NAME]
BASE=os.environ.get('ORIGIN','http://127.0.0.1:8922')
report={'passed':False,'runtimeBaseline':'e30edc8e33b863f3fafb303be0050cc86b7900f0','sourceSHA':os.environ.get('GITHUB_SHA'),'layout':NAME,'entry':ENTRY,'trials':[],'errors':[],'screenshotsDuringTiming':False,'videoDuringTiming':False,'extraRaysDuringTiming':False,'physicalDevice':False,'safari':False,'directStateWrites':False,'extraVesselClock':False,'method':'3 repeats of the same Y6 trusted-touch workload; complete values + passive original RAF boundaries; no performance comparison or runtime edit','expectedOwnerLoop':json.loads((E/'owner-loop.json').read_text())['source']}
# Three equivalent fresh contexts per layout. Different CI runners/layouts are
# not a controlled orientation-speed comparison; no optimization is under test.
ORDER=[('records',0),('records',1),('records',2)]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['environment']={'browser':browser.version,'os':platform.platform(),'machine':platform.machine(),'cpuLogical':os.cpu_count(),'softwareRenderingExpected':True,'headless':True,'runnerImage':os.environ.get('ImageVersion'),'runnerName':os.environ.get('RUNNER_NAME'),'viewport':list(SIZE),'deviceScaleFactor':1,'hasTouch':True,'isMobile':True,'cpuThrottlingApplied':False,'flags':['--use-gl=angle','--use-angle=swiftshader']}
 try:
  for mode,trial in ORDER:
   context=browser.new_context(viewport={'width':SIZE[0],'height':SIZE[1]},device_scale_factor=1,has_touch=True,is_mobile=True)
   context.add_init_script(script='window.__Y8_EXPECTED_OWNER_LOOP='+json.dumps(report['expectedOwnerLoop'])+';\n'+(R/'measure.js').read_text())
   page=context.new_page();cdp=context.new_cdp_session(page);fl=page.frame_locator('#host')
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   row={'mode':mode,'trial':trial,'passed':False};report['trials'].append(row)
   def target(sel):
    loc=fl.locator(sel);q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),w=e.ownerDocument.defaultView,t=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {inside:r.x>=0&&r.y>=0&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1,hit:t===e||e.contains(t),disabled:e.disabled===true,w:r.width,h:r.height};}''');b=loc.bounding_box();assert b and q['inside'] and q['hit'] and not q['disabled'],(sel,q,b);assert q['h']>=44,(sel,q);return b
   def tap(sel):
    b=target(sel);page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(600)
   def touch(kind,x=0,y=0):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y,'id':1,'radiusX':3,'radiusY':3}]})
   def power(fraction):
    b=target('#ad-throttle');page.touchscreen.tap(b['x']+b['width']*fraction,b['y']+b['height']/2);page.wait_for_timeout(700)
   try:
    page.goto(BASE+'/atlas_d_simulator_01/contact/'+ENTRY+'/preview.html',wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function('window.Y4?.ready || window.Y4?.error',timeout=180000);assert not page.evaluate('Y4.error')
    page.evaluate("__Y8.begin('startup',false)");tap('#ad-board');page.wait_for_function('Y4.latest?.physical.available',timeout=90000)
    if page.frames[1].evaluate('ATLAS_D_SIM.state.paused'):tap('#ad-pause');row['startupResumeViaTouch']=True
    page.evaluate('__Y8.end()');tap('#ad-engine');tap('[data-ad-gear="1"]');power(.40)
    page.wait_for_timeout(8000) # Excluded shader/JIT/resource warm-up.
    assert page.evaluate('Y4.latest.state.engine && Y4.latest.state.gear===1 && Y4.latest.state.throttle>.2 && !Y4.latest.state.paused')
    # Precompute screen coordinates: no getBoundingClientRect/layout/read probes
    # are added to the timed interval. Targets are revalidated afterward.
    coords={s:target(s) for s in ['#ad-left','#ad-right','#ad-throttle']}
    row['before']=page.evaluate('({state:Y4.latest.state,frame:Y4.latest.frame,rig:Y4.rigEnabled,rayChecks:Y4.latest.rays,view:Y4.view,viewport:Y4.viewport})')
    if trial==0:
     row['instrumentationMicrobenchmark']=page.evaluate('__Y8.calibrate()')
     row['environment']=page.frames[1].evaluate('''()=>{const r=BAYPLAY.renderer,g=r.getContext(),d=g.getExtension('WEBGL_debug_renderer_info');return {renderer:d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):null,vendor:d?g.getParameter(d.UNMASKED_VENDOR_WEBGL):null,version:g.getParameter(g.VERSION),pixelRatio:r.getPixelRatio(),drawingBuffer:[g.drawingBufferWidth,g.drawingBufferHeight],drawCalls:r.info.render.calls,triangles:r.info.render.triangles,software:!!SEA_SOFTWARE,userAgent:navigator.userAgent,deviceMemory:navigator.deviceMemory||null};}''')
    page.evaluate("__Y8.begin('measured',true)");wall=time.monotonic()
    for j in range(3):
     for sel in ['#ad-left','#ad-right']:
      b=coords[sel];touch('touchStart',b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(800);touch('touchEnd');page.wait_for_timeout(800)
     if j==1:
      b=coords['#ad-throttle'];page.touchscreen.tap(b['x']+b['width']*.55,b['y']+b['height']/2);page.wait_for_timeout(800)
    page.wait_for_timeout(900) # Let last render and Event Timing delivery settle.
    page.evaluate('__Y8.end()');row['wallSecondsDriver']=time.monotonic()-wall
    row['records']=page.evaluate('__Y8.read()');measured=next(x['id'] for x in row['records']['segments'] if x['timed']);frames=[x for x in row['records']['frames'] if x['segmentId']==measured];events=[x for x in row['records']['events'] if x['segmentId']==measured]
    # Correctness/visual verification AFTER timing, not in its cost/latency data.
    for sel in coords:target(sel)
    after=page.evaluate('({state:Y4.latest.state,frame:Y4.latest.frame,rig:Y4.rigEnabled,physical:Y4.latest.physical,mapped:Y4.latest.mapped,rays:Y4.latest.rays,view:Y4.view,screenContacts:Y4.latest.screenContacts,viewport:Y4.viewport})');row['after']=after
    assert not after['rig'] and after['mapped']['attachment'] is None and not after['mapped']['valid']
    assert after['state']['rudder']==0 and not after['state']['paused']
    assert after['frame']['activationEpoch']==row['before']['frame']['activationEpoch'] and after['frame']['simulationEpoch']==row['before']['frame']['simulationEpoch']
    assert len(frames)>=12
    assert all(x['sample']['sourceUnchanged'] and x['sample']['physical']['available'] and not x['sample']['owner']['paused'] for x in frames)
    assert len(events)==13,events
    # Missing matches are retained in raw records and explicitly fail this expected workload.
    assert all(x['matchedRenderId'] is not None for x in events),events
    for ray in after['rays']:assert ray['hit'] and ray['errorM']<1e-5 and ray['normalError']<1e-6,ray
    # Separate ordinary UI segment: paused native frames must retain observed
    # zero consumed delta. Startup Board already supplied a synchronous
    # non-owner-RAF render without manually invoking any render API.
    # No testStep/manual draw invocation and no screenshots in this segment.
    page.evaluate("__Y8.begin('ui-validation',false)")
    tap('#ad-pause');t=page.evaluate('Y4.latest.state.elapsed');page.wait_for_timeout(1000);assert page.evaluate('Y4.latest.state.elapsed')==t
    tap('#ad-pause');page.wait_for_timeout(1000);assert page.evaluate('Y4.latest.state.elapsed')>t
    page.evaluate('__Y8.end()');row['records']=page.evaluate('__Y8.read()');row['pauseResumeOutsideTiming']=True
    assert any(x['consumedSimulationDelta']['status']=='ZERO_OBSERVED' for x in row['records']['frames'])
    assert any(x['origin']['kind']=='outside_raf_manual_or_diagnostic_unattributed' for x in row['records']['frames'])
    if trial==2:
     # All capture and independent visual checks remain outside recorded segments.
     page.screenshot(path=str(E/'01-neutral-outside-measurement.png'))
     for sel,label in [('#ad-left','left'),('#ad-right','right')]:
      b=target(sel);touch('touchStart',b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(1200)
      assert page.evaluate('Y4.latest.physical.articulation.controlNormalized')==(-1 if label=='left' else 1)
      page.screenshot(path=str(E/('02-'+label+'-outside-measurement.png')));touch('touchEnd');page.wait_for_timeout(700);assert page.evaluate('Y4.latest.state.rudder')==0
    row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:
     if page.evaluate('window.__Y8?.segment'):page.evaluate('__Y8.end()')
     row['records']=page.evaluate('__Y8.read()')
     page.screenshot(path=str(E/('failure-'+str(trial)+'-'+mode+'.png')))
    except Exception:pass
    raise
   finally:
    (E/'measurements.json').write_text(json.dumps(report,indent=2));context.close()
  assert not report['errors'],report['errors'];report['passed']=True
 finally:
  (E/'measurements.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'layout':NAME,'trials':len(report['trials'])}))
