"""Actual visible Y14 controls and assets. Executed only by the existing authorized CI.
No direct owner writes, simulation acceleration, fake input dispatch or local-policy workaround.
"""
from pathlib import Path
from urllib.parse import urlsplit
import os,json,hashlib,time,math,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;ROOT=R.parents[2];OUT=R/'evidence';OUT.mkdir(exist_ok=True)
PUBLIC=bool(os.environ.get('PUBLIC_URL'));URL=os.environ.get('PUBLIC_URL','http://127.0.0.1:8926/atlas_d_simulator_01/contact/y14/index.html');label='public' if PUBLIC else 'local'
required=['atlas_d_simulator_01/contact/y14/'+n for n in ['index.html','navigation.css','app.js','simulation.js','navigation.js','navigation-ui.js','ocean.js','environment.js','materials.js','pod-detail.js']]+['atlas_d_simulator_01/contact/y12/'+n for n in ['fleet.js','dynamics.js','pod.js','style.css']]+['atlas_d_simulator_01/live/runtime.js','atlas_d_simulator_01/live/assets/ATLAS_D_Original.glb','atlas_fleet_atelier_02/live/assets/ATLAS_N.glb','atlas_fleet_atelier_02/live/assets/ATLAS_W.glb']
expected={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in required}
report={'passed':False,'sourceCommit':os.environ.get('GITHUB_SHA'),'publishedCommit':os.environ.get('PUBLIC_COMMIT'),'url':URL,'public':PUBLIC,'contexts':[],'physicalPhone':False,'Safari':False,'FPSMeasured':False,'noSimulationStepping':True}
def dump(): (OUT/(label+'-browser.json')).write_text(json.dumps(report,indent=2))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,w,h in [('desktop',1440,1000),('portrait',390,844),('landscape',844,390)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=name!='desktop',has_touch=True)
   page=ctx.new_page();cdp=ctx.new_cdp_session(page);row={'layout':name,'viewport':[w,h],'passed':False,'assets':{},'pageErrors':[],'shaderErrors':[],'vessels':[]};report['contexts'].append(row)
   page.on('pageerror',lambda e:row['pageErrors'].append(str(e)))
   page.on('console',lambda m:row['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader error','validate_status','program info log']) else None)
   def receive(r):
    req=r.request;key=None
    while req:
     path=urlsplit(req.url).path
     key=next((k for k in expected if path.endswith('/'+k)),None)
     if key:break
     req=req.redirected_from
    if key and r.status==200:
     try:
      digest=hashlib.sha256(r.body()).hexdigest()
      if digest==expected[key]:row['assets'][key]={'sha256':digest,'url':r.url,'exact':True}
     except Exception:pass
   page.on('response',receive)
   def inspect():return page.evaluate('FLEET_APP.inspect()')
   def wait(expr,timeout=90000):page.wait_for_function(expr,timeout=timeout)
   def target(sel):
    el=page.locator(sel);el.wait_for(state='visible',timeout=20000);el.scroll_into_view_if_needed();b=el.bounding_box();assert b,sel
    x=b['x']+b['width']/2;y=b['y']+b['height']/2
    assert 0<=x<w and 0<=y<h,(sel,b)
    assert page.evaluate('([s,x,y])=>{let e=document.querySelector(s),p=document.elementFromPoint(x,y);return e===p||e.contains(p)}',[sel,x,y]),('occluded',sel,b)
    return x,y,b
   def tap(sel):
    x,y,b=target(sel);page.touchscreen.tap(x,y);return b
   def power(f):
    x,y,b=target('#power');a=b['x']+10;z=a+(b['width']-20)*f;cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':a,'y':y,'id':1}]})
    for j in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':a+(z-a)*j/6,'y':y,'id':1}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   def resume():
    for attempt in range(3):
     state=inspect()['state']
     if not state['paused']:return
     row.setdefault('startupRecovery',[]).append({'reason':state['pauseReason'],'elapsed':state['elapsed']});tap('#resume');page.wait_for_timeout(1000)
    assert not inspect()['state']['paused'],inspect()
   def choose(key):
    if page.locator('#fleet-menu').is_hidden():tap('#fleet-open')
    tap('#select-'+key);wait("FLEET_APP.phase==='ready' && FLEET_APP.selected==='"+key+"'",120000);page.wait_for_timeout(1800);resume()
    s=inspect();assert s['liveVesselRoots']==1;assert s['state']['engine'] is False;assert s['navigation']['routePoints']==[];return s
   def select_native(sel,steps):
    tap(sel);page.keyboard.press('Home')
    for _ in range(steps):page.keyboard.press('ArrowDown')
    page.keyboard.press('Enter')
   def pause_capture(filename):
    if not inspect()['state']['paused']:tap('#pause')
    wait('FLEET_APP.inspect().state.paused');s=inspect()['state'];page.wait_for_timeout(800);assert inspect()['state']['elapsed']==s['elapsed']
    page.screenshot(path=str(OUT/filename));tap('#resume');wait('!FLEET_APP.inspect().state.paused && FLEET_APP.inspect().state.elapsed>'+repr(s['elapsed']),12000)
   try:
    page.goto(URL,wait_until='domcontentloaded',timeout=120000)
    if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click();row['hostNotice']=True
    wait('window.FLEET_APP?.booted',120000);assert page.locator('.fleet-card').count()==4
    page.screenshot(path=str(OUT/f'{label}-{name}-fleet.png'))
    for key in ['d','n','pod','w']:
     entry=choose(key)
     # Warnings/chart are observational and must leave paused state untouched.
     tap('#chart-open');x,y,b=target('#chart');page.touchscreen.tap(b['x']+b['width']*.36,b['y']+b['height']*.40)
     wait('FLEET_APP.inspect().navigation.routePoints.length===1');nav=inspect()['navigation'];assert nav['navigation']['waypoint']['distanceM']>100;assert nav['navigation']['waypoint']['etaSeconds'] is None
     assert page.locator('#nav-range').inner_text()!='Tap chart';tap('#chart-close')
     tap('#engine');tap('[data-gear="1"]');power(.65);wait('FLEET_APP.inspect().state.throttle>.45')
     before=inspect();start=time.monotonic();x,y,_=target('#starboard');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});page.wait_for_timeout(2600);held=inspect();cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert held['state']['rudder']==1 and held['state']['rudderAngleRad']>0,held
     page.wait_for_timeout(2500);after=inspect();wall=time.monotonic()-start;assert not after['state']['paused'],after
     assert after['state']['elapsed']-before['state']['elapsed']>2;assert math.hypot(after['state']['x']-before['state']['x'],after['state']['z']-before['state']['z'])>.1
     wait('FLEET_APP.inspect().state.rudder===0 && FLEET_APP.inspect().activePointers===0');assert after['realism']['softwareAutoReflectionDisabled'];assert after['realism']['reflectionEnabled'] is False
     pause_capture(f'{label}-{name}-{key}.png')
     vr={'key':key,'entry':entry,'waypoint':nav,'held':held,'afterMotion':after,'simulationSeconds':after['state']['elapsed']-before['state']['elapsed'],'wallSeconds':wall,'notFPS':True,'pauseResume':True};row['vessels'].append(vr)
     if key=='w':assert page.locator('#dive-toggle').is_hidden()
    # A fresh pod demonstrates real current/wind instruments and the added route UI.
    choose('pod');tap('#instruments-open');select_native('#conditions',2);wait("FLEET_APP.inspect().state.environment==='crosswind'")
    page.wait_for_timeout(4500);env=inspect();assert env['state']['currentZ']==.75;assert env['state']['windZ']==9;assert env['state']['speedThroughWaterMps']>0
    assert 'kn' in page.locator('#instrument-current').inner_text();assert page.locator('#instrument-stw').inner_text()!='—';row['environmentCase']=env
    tap('#instruments-close');tap('#chart-open');x,y,b=target('#chart');page.touchscreen.tap(b['x']+b['width']*.35,b['y']+b['height']*.4);wait('FLEET_APP.inspect().navigation.routePoints.length===1')
    tap('#chart-close');pause_capture(f'{label}-{name}-pod-navigation.png')
    if not PUBLIC and name=='desktop':
     cycles=[]
     # Three complete ordinary-time cycles, no testStep or state writes.
     for key in ['d','n','pod']:
      choose(key);tap('#instruments-open');select_native('#conditions',0);tap('#instruments-close')
      tap('#dive-toggle');select_native('#target-depth',0);wait('FLEET_APP.inspect().state.targetDepthM===6')
      if key=='d':tap('#secure');wait("FLEET_APP.inspect().state.mode==='secured'",75000)
      tap('#dive');wait("FLEET_APP.inspect().state.mode==='submerged'",100000);sub=inspect();assert abs(sub['state']['depthM']-6)<.10
      page.screenshot(path=str(OUT/f'{label}-desktop-{key}-underwater.png'));tap('#surface');wait("FLEET_APP.inspect().state.mode==='secured' && FLEET_APP.inspect().state.depthM===0",100000)
      if key=='d':tap('#deploy');wait("FLEET_APP.inspect().state.mode==='surface'",75000)
      cycles.append({'key':key,'submerged':sub,'recovered':inspect(),'ordinaryOwnerTime':True})
     row['depthCycles']=cycles
    events=page.evaluate('FLEET_APP.nativeEvents');assert all(e['trusted'] for e in events);row['events']=events
    assert set(row['assets'])==set(expected),sorted(set(expected)-set(row['assets']))
    assert not row['pageErrors'] and not row['shaderErrors'],row
    row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:row['last']=inspect();page.screenshot(path=str(OUT/f'{label}-{name}-FAIL.png'))
    except Exception:pass
    dump();raise
   finally:ctx.close();dump()
  report['passed']=all(r['passed'] for r in report['contexts']);dump()
 finally:browser.close()
print(json.dumps({'passed':report['passed'],'public':PUBLIC,'contexts':len(report['contexts'])},indent=2))
