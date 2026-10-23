"""Actual visible solo-fleet controls, one active vessel, public delivered bytes.
No time stepping or direct controller mutation. Screenshots are outside motion windows.
"""
from pathlib import Path
from urllib.parse import urlsplit
import os,json,hashlib,time,traceback,math
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;ROOT=R.parents[2];OUT=R/'evidence';OUT.mkdir(exist_ok=True)
PUBLIC=bool(os.environ.get('PUBLIC_URL'));URL=os.environ.get('PUBLIC_URL','http://127.0.0.1:8926/atlas_d_simulator_01/contact/y12/index.html');label='public' if PUBLIC else 'local'
report={'passed':False,'url':URL,'public':PUBLIC,'sourceCommit':os.environ.get('SOURCE_COMMIT',os.environ.get('GITHUB_SHA')),'publishedCommit':os.environ.get('PUBLIC_COMMIT'),'contexts':[],'physicalPhone':False,'Safari':False,'fpsMeasured':False,'seaTrialValidated':False,'directStateWrites':False,'extraSimulationClock':False}
required=['atlas_d_simulator_01/contact/y12/'+n for n in ['index.html','style.css','app.js','fleet.js','dynamics.js','pod.js']]+['atlas_d_simulator_01/live/runtime.js','atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb','atlas_fleet_atelier_02/live/assets/ATLAS_N.glb','atlas_fleet_atelier_02/live/assets/ATLAS_W.glb']
expected={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in required}
layouts=[('desktop',1440,1000),('portrait',390,844),('landscape',844,390)]
def dump(): (OUT/(label+'-browser.json')).write_text(json.dumps(report,indent=2))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,w,h in layouts:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=name!='desktop',has_touch=True)
   page=ctx.new_page();cdp=ctx.new_cdp_session(page);row={'layout':name,'viewport':[w,h],'passed':False,'assets':{},'errors':[],'shaderErrors':[],'vessels':[]};report['contexts'].append(row)
   page.on('pageerror',lambda e:row['errors'].append(str(e)))
   page.on('console',lambda m:row['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader error','validate_status','program info log']) else None)
   def on_response(r):
    req=r.request;key=None
    while req:
     p=urlsplit(req.url).path
     for candidate in expected:
      if p.endswith('/'+candidate):key=candidate;break
     if key:break
     req=req.redirected_from
    if key and r.status==200:
     try:
      sha=hashlib.sha256(r.body()).hexdigest()
      if sha==expected[key]:row['assets'][key]={'sha256':sha,'exact':True,'url':r.url}
     except Exception:pass
   page.on('response',on_response)
   def inspect():return page.evaluate('FLEET_APP.inspect()')
   def wait(expr,timeout=90000):page.wait_for_function(expr,timeout=timeout)
   def target(sel):
    el=page.locator(sel);el.wait_for(state='visible',timeout=30000);box=el.bounding_box();assert box,sel
    x=box['x']+box['width']/2;y=box['y']+box['height']/2
    assert 0<=x<w and 0<=y<h,(sel,box,w,h)
    assert page.evaluate('([sel,x,y])=>{const e=document.querySelector(sel),p=document.elementFromPoint(x,y);return e===p||e.contains(p)}',[sel,x,y]),('OCCLUDED',sel,box)
    return x,y,box
   def tap(sel):
    x,y,b=target(sel);page.touchscreen.tap(x,y);return b
   def hold(sel,seconds):
    x,y,b=target(sel);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});page.wait_for_timeout(seconds*1000);held=inspect();cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});return held
   def power(f):
    x,y,b=target('#power');start=b['x']+10;end=b['x']+10+(b['width']-20)*f
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':y,'id':1}]})
    for j in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start+(end-start)*j/6,'y':y,'id':1}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   def resume():
    for _ in range(3):
     if not inspect()['state']['paused']:return
     row.setdefault('deliberateResumes',[]).append({'reason':inspect()['state']['pauseReason'],'seconds':inspect()['state']['elapsed']});tap('#resume');page.wait_for_timeout(750)
    assert not inspect()['state']['paused'],inspect()
   def choose(key):
    if page.locator('#fleet-menu').is_hidden():tap('#fleet-open')
    tap('#select-'+key);wait("FLEET_APP.phase==='ready' && FLEET_APP.selected==='"+key+"'",120000);page.wait_for_timeout(1200);resume()
    i=inspect();assert i['liveVesselRoots']==1 and i['selected']==key,i
    assert i['geometry']['sourceScale']==[1,1,1],i
    assert i['state']['engine'] is False and i['state']['throttle']==0,i
    return i
   try:
    page.goto(URL,wait_until='domcontentloaded',timeout=120000)
    if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click();row['hostNotice']=True
    wait('window.FLEET_APP?.booted === true',120000);assert page.locator('.fleet-card').count()==4
    page.screenshot(path=str(OUT/f'{label}-{name}-fleet.png'))
    for key in ['d','n','pod','w']:
     entry=choose(key);tap('#engine');tap('[data-gear="1"]');power(.70);wait('FLEET_APP.inspect().state.throttle>.5')
     before=inspect();start=time.monotonic();held=hold('#starboard',3);assert held['state']['rudder']==1 and held['state']['rudderAngleRad']>0,held;page.wait_for_timeout(3000);after=inspect();wall=time.monotonic()-start
     assert not after['state']['paused'],after
     assert after['state']['elapsed']-before['state']['elapsed']>=3,(before,after)
     distance=math.hypot(after['state']['x']-before['state']['x'],after['state']['z']-before['state']['z']);assert distance>.1,(key,distance)
     wait('FLEET_APP.inspect().state.rudder===0 && FLEET_APP.inspect().activePointers===0')
     tap('#pause');wait('FLEET_APP.inspect().state.paused');paused=inspect()['state'];page.wait_for_timeout(800);assert inspect()['state']['elapsed']==paused['elapsed']
     assert page.locator('#pause-card').is_visible();b=target('#resume')[2];assert b['height']>=40
     page.screenshot(path=str(OUT/f'{label}-{name}-{key}.png'))
     tap('#resume');wait('!FLEET_APP.inspect().state.paused');page.wait_for_timeout(500);assert inspect()['state']['elapsed']>paused['elapsed']
     vr={'key':key,'entry':entry,'heldSteering':held,'afterMotion':after,'motion':{'wallSeconds':wall,'simulationSeconds':after['state']['elapsed']-before['state']['elapsed'],'distanceM':distance,'notAnFPSMeasure':True},'pauseFreeze':True,'deliberateResume':True,'oneActiveVessel':True}
     if key=='w':assert page.locator('#dive-toggle').is_hidden() and page.locator('#subsea-view').is_hidden();vr['surfaceOnly']=True
     row['vessels'].append(vr)
    if not PUBLIC and name=='desktop':
     cycles=[]
     for key in ['d','n','pod']:
      choose(key);tap('#dive-toggle');tap('#target-depth');page.keyboard.press('Home');page.keyboard.press('Enter');wait('FLEET_APP.inspect().state.targetDepthM===6')
      if key=='d':
       assert page.locator('#dive').is_disabled();tap('#secure');wait("FLEET_APP.inspect().state.mode==='secured'",65000)
      tap('#dive');wait("FLEET_APP.inspect().state.mode==='submerged'",65000);under=inspect();assert 5.9<under['state']['depthM']<6.1
      page.screenshot(path=str(OUT/f'{label}-{name}-{key}-submerged.png'))
      tap('#surface');wait("FLEET_APP.inspect().state.mode==='secured' && FLEET_APP.inspect().state.depthM===0",65000)
      if key=='d':tap('#deploy');wait("FLEET_APP.inspect().state.mode==='surface'",65000)
      cycles.append({'key':key,'ordinaryOwnerTime':True,'submerged':under,'recovered':inspect()})
     row['diveCycles']=cycles
    events=page.evaluate('FLEET_APP.nativeEvents');assert all(e['trusted'] for e in events),events
    row['inputEvents']=events;assert set(row['assets'])==set(expected),{'missing':sorted(set(expected)-set(row['assets']))}
    assert not row['errors'] and not row['shaderErrors'],row
    row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:row['last']=inspect();page.screenshot(path=str(OUT/f'{label}-{name}-FAIL.png'))
    except Exception:pass
    dump();raise
   finally:ctx.close();dump()
  report['passed']=all(x['passed'] for x in report['contexts']);dump()
 finally:browser.close()
print(json.dumps({'passed':report['passed'],'public':PUBLIC,'contexts':len(report['contexts'])},indent=2))
