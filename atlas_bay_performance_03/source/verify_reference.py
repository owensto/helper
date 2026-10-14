"""Published-app checks; no replacement/local model injection.
Long equilibrium runs use the app's own testStep integrator, explicitly recorded.
Normal engine controls and motion are additionally exercised in real browser frames.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,time,traceback
BASE=os.environ['BASE_URL'];OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bayperf/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'local_assets_injected':False,'physical_phone_test':False,'atlas_performance_validated':False,'long_runs':'Actual runtime testStep advances simulation time; not a real-time frame-rate test.','tests':[]}
expected=[[1000,5.3,1.4],[1500,7.3,2.3],[2000,8.5,3.9],[2500,11.1,5.5],[3000,17.5,6.6],[3500,29.6,8.5],[4000,34.8,11.8],[4500,39.7,15.3],[5000,44.2,20.2],[5500,49.2,25.9],[5800,50.9,26.4]]
def wait(p,x):p.wait_for_function(x,timeout=60000)
def shot(p,name):
 p.evaluate('BAYPLAY.capturePaused=true');p.wait_for_timeout(100)
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as pw:
 b=pw.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for device,w,h in [('desktop',1600,1000),('phone',430,932)]:
  p=b.new_page(viewport={'width':w,'height':h},is_mobile=device=='phone',has_touch=device=='phone');p.set_default_timeout(60000)
  r={'device':device,'passed':False,'errors':[],'asset_failures':[]};report['tests'].append(r)
  p.on('pageerror',lambda e,r=r:r['errors'].append(str(e)))
  p.on('response',lambda z,r=r:r['asset_failures'].append({'url':z.url,'status':z.status}) if z.status>=400 and any(x in z.url for x in ['.glb','.js','.css','.hdr','.jpg']) else None)
  try:
   t=time.monotonic();res=p.goto(BASE,wait_until='domcontentloaded',timeout=120000);r['http_status']=res.status
   c=p.get_by_text('Open the page',exact=True)
   if c.count():r['host_confirmation']=True;c.first.click()
   wait(p,'window.BAYPLAY?.ready && window.BAYPERF_UI && BAYPLAY.inspect().skyReady && BAYPLAY.inspect().waterReady');r['ready_seconds']=round(time.monotonic()-t,2)
   actual=p.evaluate('BAY_REFERENCE_DATA.rows.map(r=>[r.rpm,r.mph,r.gph])');assert actual==expected;r['all_11_source_rows']=True
   p.locator('[data-mode=drive]').click();assert p.locator('#performance-mode').input_value()=='reference';assert p.locator('#trim').is_disabled();assert p.locator('#conditions').is_disabled()
   p.locator('#performance-open').click();assert p.locator('#performancedialog').evaluate('(e)=>e.open');assert p.locator('.perf-table tbody tr').count()==11
   shot(p,f'{device}_source.png');p.locator('#performance-close').click()
   # Exercise normal player controls before the numerical reference runs.
   p.locator('#engine').click();wait(p,'BAYPLAY.state.startTimer===0 && BAYPLAY.state.rpm>650');assert p.locator('#perf-flow').inner_text()=='—'
   p.locator('[data-gear="1"]').click();p.locator('#throttle').evaluate('(e)=>{e.value=55;e.dispatchEvent(new Event("input",{bubbles:true}))}')
   wait(p,'BAYPLAY.state.distance>3 && BAYPLAY.state.u>1.5');r['real_frame_forward']=p.evaluate('BAYPLAY.state.snapshot()')
   assert p.locator('#perf-flow').inner_text()!='—'
   p.locator('#reset').click()
   for rpm,mph,gph in [(3500,29.6,8.5),(5800,50.9,26.4)]:
    p.locator('#performance-open').click();p.locator(f'[data-run-rpm="{rpm}"]').click();wait(p,'BAYPLAY.state.referenceTrial?.phase==="running"')
    p.keyboard.press('KeyE');assert p.evaluate('BAYPLAY.state.engine');p.evaluate('BAYPLAY.testStep(65)');wait(p,'BAYPLAY.inspect().paused');state=p.evaluate('BAYPLAY.state.snapshot()');ref=state['reference']
    assert ref['settled'],ref;assert abs(state['speed']/.44704-mph)<.03;assert abs(ref['lookup']['gph']-gph)<.001
    assert p.locator('#perf-range').inner_text().startswith('≤');assert ref['balanceIsUpperBound'];assert ref['unmeteredSeconds']>0;assert not state['contact'];r[str(rpm)]=state
    p.locator('[data-camera=helm]').click();shot(p,f'{device}_rpm{rpm}.png')
    p.locator('#clearview').click();shot(p,f'{device}_rpm{rpm}_helm.png');p.locator('#clearview').click()
   p.locator('#performance-open').click();p.locator('#run-acceleration').click();wait(p,'BAYPLAY.state.referenceTrial?.phase==="running"');p.evaluate('BAYPLAY.testStep(12)');wait(p,'BAYPLAY.inspect().paused');tr=p.evaluate('BAYPLAY.state.referenceTrial');assert abs(tr['zeroTo30']-7.70)<.03;r['fitted_0_to_30']=tr
   p.locator('#performance-open').click();shot(p,f'{device}_fit_result.png');p.locator('#perf-fuel-input').fill('65');p.locator('#perf-reserve-input').fill('6.5');p.locator('#apply-fuel').click();assert p.evaluate('BAYPLAY.state.fuelRemainingGal')==65
   p.locator('#perf-fuel-input').fill('66');p.locator('#apply-fuel').click();assert p.evaluate('BAYPLAY.state.fuelRemainingGal')==65;p.wait_for_timeout(400);assert 'Enter finite values' in p.locator('#perf-fuel-error').inner_text();r['rejects_invalid_fuel']=True
   p.locator('#exit-reference').click();p.locator('[data-mode=drive]').click();p.locator('#performance-mode').select_option('experimental');p.locator('[data-mode=drive]').click();assert not p.locator('#trim').is_disabled();assert not p.locator('#conditions').is_disabled();assert p.locator('#perf-flow').inner_text()=='—';r['experimental_restored']=True
   p.locator('#conditions').select_option('breeze');wait(p,'BAYPLAY.state.z>.2');r['experimental_drift']=True
   assert p.evaluate('document.documentElement.scrollWidth')<=w+2
   assert not r['errors'];assert not r['asset_failures'];r['passed']=True
  except Exception as e:
   report['passed']=False;r['error']=str(e);r['traceback']=traceback.format_exc()
   try:r['failure']=p.evaluate('window.BAYPLAY?.inspect()');shot(p,f'{device}_ERROR.png')
   except Exception:pass
  finally:
   (OUT/'reference_browser.json').write_text(json.dumps(report,indent=2));print(json.dumps(r),flush=True);p.close()
 b.close()
assert report['passed'],json.dumps(report,indent=2)
