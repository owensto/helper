"""Y7: reproduce original Y4 startup before any runtime edit.
Only trusted visible inputs and passive event/pause observations. No performance
probe, video, screenshot, extra ray queries or pixel reads during diagnosis.
"""
from pathlib import Path
import os,json,time,traceback,platform,base64,struct
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
ORIGIN=os.environ.get('ORIGIN','http://127.0.0.1:8921')
SIZES={'portrait':(390,844),'landscape':(844,390)}
report={'passed':False,'runtimeBaseline':'e30edc8e33b863f3fafb303be0050cc86b7900f0','branchBaseline':'20a1caced055159e8c6e9b4bc21821a5d9132e4d','sourceSHA':os.environ.get('GITHUB_SHA'),'entry':'contact/y4/preview.html','runtimeCandidate':None,'runtimeChanged':False,'scenarios':[],'errors':[],'physicalDevice':False,'safari':False,'humanEnabled':False,'screenshotsDuringDiagnosis':False,'videoRecorded':False,'performanceProbe':False,'directStateWrites':False,'extraVesselClock':False}
# Both layouts share one runner/browser, fresh contexts and counterbalanced order.
ORDER=[(layout,mode,repeat) for repeat in range(3) for mode in (['events-only','loop-boundary'] if repeat%2==0 else ['loop-boundary','events-only']) for layout in (['portrait','landscape'] if repeat%2==0 else ['landscape','portrait'])]
STALL='Rendering stalled. Paused instead of pretending simulated time kept up.'
HIDDEN='Paused while this tab is hidden.'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['environment']={'browser':browser.version,'os':platform.platform(),'logicalCPUs':os.cpu_count(),'runnerImage':os.environ.get('ImageVersion'),'runnerName':os.environ.get('RUNNER_NAME'),'headless':True,'touchEmulated':True,'deviceScaleFactor':1,'softwareRenderingExpected':True,'oneRunnerBothLayouts':True}
 try:
  for layout,mode,repeat in ORDER:
   w,h=SIZES[layout];orientation=layout
   ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=True,device_scale_factor=1)
   ctx.add_init_script(script='window.__Y7_MODE='+json.dumps(mode)+';\n'+(R/'startup-observer.js').read_text())
   page=ctx.new_page();cdp=ctx.new_cdp_session(page);fl=page.frame_locator('#host')
   row={'layout':layout,'mode':mode,'repeat':repeat,'passed':False,'touchActions':[],'screenshots':[]};report['scenarios'].append(row)
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   f=None;diagnosing=True
   def mark(label):return f.evaluate('(label)=>__Y7.mark(label)',label)
   def state():return f.evaluate('(()=>{const s=ATLAS_D_SIM.state;return {active:ATLAS_D_SIM.active,paused:s.paused,message:s.message,elapsed:s.elapsed,engine:s.engine,gear:s.gear,throttle:s.throttle,rudder:s.rudder};})()')
   def target(sel,outer=False):
    loc=page.locator(sel) if outer else fl.locator(sel)
    q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),v=e.ownerDocument.defaultView,p=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=0&&r.y>=0&&r.right<=v.innerWidth+1&&r.bottom<=v.innerHeight+1,hit:p===e||e.contains(p),disabled:e.disabled===true};}''')
    box=loc.bounding_box();assert box and q['inside'] and q['hit'] and not q['disabled'],(sel,q,box)
    assert q['h']>=44,(sel,q);return box
   def tap(sel,outer=False):
    b=target(sel,outer);row['touchActions'].append({'selector':sel,'outer':outer,'at':time.monotonic()});page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(600)
   def power():
    b=target('#ad-throttle');row['touchActions'].append({'selector':'#ad-throttle','fraction':.4,'at':time.monotonic()});page.touchscreen.tap(b['x']+b['width']*.4,b['y']+b['height']/2);page.wait_for_timeout(700)
   def screenshot(name):
    assert not diagnosing,'Screenshot prohibited during startup diagnosis'
    size=page.evaluate('[innerWidth,innerHeight]');raw=base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False,'fromSurface':True})['data']);actual=list(struct.unpack('>II',raw[16:24]));assert actual==size and page.evaluate('[innerWidth,innerHeight]')==size
    filename=f'{layout}-{mode}-{repeat}-{name}.png';(E/filename).write_bytes(raw);row['screenshots'].append({'file':filename,'size':size,'outsideDiagnosis':True})
   def contacts():
    x=page.evaluate('({state:Y4.latest.state,frame:Y4.latest.frame,physical:Y4.latest.physical,mapped:Y4.latest.mapped,rays:Y4.latest.rays,sourceUnchanged:Y4.latest.sourceUnchanged,rig:Y4.rigEnabled,viewport:Y4.latest.viewport,screenContacts:Y4.latest.screenContacts})')
    assert x['sourceUnchanged'] and x['physical']['available'] and not x['rig'] and x['mapped']['attachment'] is None and not x['mapped']['valid'];assert len(x['rays'])==5
    for ray in x['rays']:assert ray['hit'] and ray['errorM']<1e-5 and ray['normalError']<1e-6
    return x
   try:
    page.goto(ORIGIN+'/atlas_d_simulator_01/contact/y4/preview.html',wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function('window.Y4?.ready || window.Y4?.error',timeout=180000);assert not page.evaluate('Y4.error')
    f=page.frames[1];page.evaluate('__Y7.attachTail()');f.evaluate('__Y7.attachTail()')
    row['beforeBoard']=mark('startup.before-board');assert row['beforeBoard']['state']['paused'] is False and row['beforeBoard']['state']['active'] is False
    tap('#ad-board');page.wait_for_function('Y4.latest?.physical.available',timeout=90000)
    row['afterBoard']=mark('startup.after-board-y6-checkpoint')
    # No auto-resume: preserve and observe the original state for six seconds.
    page.wait_for_timeout(6000);row['startupEnd']=mark('startup.observation-end');diagnosing=False
    startup=state();row['startupDisposition']='NO_PAUSE_OBSERVED'
    if startup['paused']:
     assert startup['message'] in [STALL,HIDDEN],startup
     row['startupDisposition']='INHERITED_STALL_GUARD' if startup['message']==STALL else 'INHERITED_VISIBILITY_PAUSE'
     if mode=='loop-boundary' and repeat==0:screenshot('startup-pause-before-resume')
     row['resumeBefore']=mark('startup.visible-resume.before');tap('#ad-pause');row['resumeAfter']=mark('startup.visible-resume.after');assert not state()['paused']
    else:row['resumeBefore']=None;row['resumeAfter']=None
    row['recoveredStart']=state();page.wait_for_timeout(1500);row['recoveredEnd']=state();assert not row['recoveredEnd']['paused'] and row['recoveredEnd']['elapsed']>row['recoveredStart']['elapsed']
    # Equivalent original Y6 startup controls, after the explicitly recorded recovery.
    tap('#ad-engine');tap('[data-ad-gear="1"]');power();page.wait_for_timeout(1000)
    run=state();assert run['engine'] and run['gear']==1 and run['throttle']>.25 and not run['paused'];row['running']=run;row['physicalCheck']=contacts()
    if mode=='loop-boundary' and repeat==0:
     tap('#ad-pause');screenshot('recovered-visible-controls-manually-paused');tap('#ad-pause')
    if mode=='loop-boundary' and repeat==2:
     safety={};row['safety']=safety;diagnosing=True
     safety['blurBefore']=mark('safety.outer-details.before');tap('#info',True);safety['blurAfter']=mark('safety.outer-details.after');assert state()['throttle']==0 and state()['rudder']==0 and not state()['paused']
     tap('#close-info',True);power();safety['manualPauseBefore']=mark('safety.manual-pause.before');tap('#ad-pause');safety['manualPaused']=mark('safety.manual-pause.after');paused=state();assert paused['paused'];page.wait_for_timeout(1300);assert state()['elapsed']==paused['elapsed']
     safety['rotationBefore']=contacts();new='landscape' if orientation=='portrait' else 'portrait';rw,rh=SIZES[new]
     cdp.send('Emulation.setDeviceMetricsOverride',{'width':rw,'height':rh,'deviceScaleFactor':1,'mobile':True,'screenWidth':rw,'screenHeight':rh,'screenOrientation':{'type':new+'Primary','angle':90 if new=='landscape' else 0}});orientation=new
     page.wait_for_function(f'Y4.latest?.viewport?.width==={rw} && Y4.latest?.viewport?.height==={rh-56}',timeout=45000);page.wait_for_timeout(800)
     safety['rotationAfter']=contacts();assert state()['paused'] and state()['elapsed']==paused['elapsed']
     for key in ['instanceId','activationEpoch','simulationEpoch','worldRevision','hostSessionId']:assert safety['rotationBefore']['frame'][key]==safety['rotationAfter']['frame'][key]
     for sel in ['#ad-pause','#ad-engine','#ad-left','#ad-right']:target(sel)
     safety['pausedRotation']=mark('safety.rotation-still-paused');tap('#ad-pause');s=state();page.wait_for_timeout(1200);assert not state()['paused'] and state()['elapsed']>s['elapsed'];safety['manualResume']=mark('safety.manual-resume.advancing')
     # Actual tab activation only. No visibility override or synthetic hidden event.
     power();safety['backgroundBefore']=mark('safety.background.before')
     other=ctx.new_page();other.goto('about:blank');other.bring_to_front();page.wait_for_timeout(1800)
     safety['backgroundSnapshot']=f.evaluate('__Y7.mark("safety.background.observed")')
     was_hidden=safety['backgroundSnapshot']['hidden'];safety['backgroundCoverage']='ACTUAL_HIDDEN_TRANSITION' if was_hidden else 'UNAVAILABLE_NO_HIDDEN_TRANSITION_IN_HEADLESS'
     if was_hidden:
      assert state()['paused'] and state()['throttle']==0
      stopped=state()['elapsed'];page.wait_for_timeout(1000);assert state()['elapsed']==stopped;safety['backgroundFrozen']=True
     page.bring_to_front();page.wait_for_timeout(800);safety['foreground']=mark('safety.foreground.no-auto-resume')
     if was_hidden:
      assert state()['paused'];tap('#ad-pause');start=state()['elapsed'];page.wait_for_timeout(1000);assert not state()['paused'] and state()['elapsed']>start
     other.close();safety['final']=mark('safety.end');row['physicalAfterSafety']=contacts();diagnosing=False
     if not state()['paused']:tap('#ad-pause')
     screenshot('safety-complete-manually-paused')
    row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc();raise
   finally:
    if f:
     try:row['hostTrace']=f.evaluate('__Y7.read()');row['topTrace']=page.evaluate('__Y7.read()')
     except Exception as e:row['traceReadError']=str(e)
    (E/'startup.json').write_text(json.dumps(report,indent=2));ctx.close()
  assert not report['errors'];report['passed']=True
 finally:
  (E/'startup.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'scenarios':len(report['scenarios']),'startupPauses':sum(x.get('startupDisposition')!='NO_PAUSE_OBSERVED' for x in report['scenarios'])}))
