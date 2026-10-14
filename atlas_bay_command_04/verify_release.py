"""Actual interface + numerical integration tests. No Google authorization is invented."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,time
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8874/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/command04/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'physical_device_test':False,'marine_validated':False,'google_authorized_map_tested':False,'release':'04.2','local_assets_injected':False,'long_runs':'Accelerated fixed-step simulation, not a rendering performance test','tests':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.capturePaused=true');p.wait_for_timeout(250)
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROME_PATH'):opts['executable_path']=os.environ['CHROME_PATH']
 browser=p.chromium.launch(**opts)
 for device,w,h in [('desktop',1600,1000),('phone',430,932)]:
  context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=device=='phone')
  page=context.new_page();errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append([r.status,r.url]) if r.status>=400 and 'favicon' not in r.url else None)
  r={'device':device,'passed':False,'errors':errors,'asset_failures':failed};report['tests'].append(r)
  try:
   page.goto(BASE,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click();r['host_confirmation']=True
   page.wait_for_function('window.CMD?.ready && window.ATLAS_WORKSPACE?.ready && window.ATLAS_DELIVERY?.ready && BayGeo.ready',timeout=120000)
   page.wait_for_timeout(3400);r['initial']=page.evaluate('CMD.inspect()');assert r['initial']['config']['location']=='beaufort';assert r['initial']['workspace']=='drive'
   assert page.evaluate('!BayGeo.sample(BAYPLAY.state.x,BAYPLAY.state.z).land')
   assert page.locator('#cmd-sidebar').is_hidden();shot(page,f'{device}_helm.png')
   if device=='phone':
    assert page.locator('#operator-controls').is_hidden()
    assert page.locator('#touch-engine').is_visible() and page.locator('#touch-forward').is_visible()
    r['portrait_compact_controls']=True
    page.locator('#operator-collapse').click()
   page.locator('#layout-toggle').click();assert page.locator('.layout-switch button[data-layout=helm]').is_hidden()
   page.locator('#layout-toggle').click();assert page.locator('.layout-switch button[data-layout=helm]').is_visible()
   r['view_selector_minimize_restore']=True
   # Rendered player input, not only a standalone function call.
   page.locator('#cmd-engine').click();page.wait_for_function('BAYPLAY.state.engine&&BAYPLAY.state.startTimer===0',timeout=60000)
   page.locator('[data-cmd-gear="1"]').click();page.locator('#cmd-throttle').evaluate('(e)=>{e.value=55;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   page.wait_for_function('BAYPLAY.state.speedOverGround>1',timeout=60000);r['rendered_forward']=page.evaluate('BAYPLAY.state.snapshot()')
   page.locator('#cmd-neutral').click();assert page.evaluate('BAYPLAY.state.speedOverGround>0&&BAYPLAY.state.gear===0')
   page.locator('#cmd-pause').click();assert page.evaluate('BAYPLAY.inspect().paused');r['rendered_driving']=True
   page.locator('.layout-switch button[data-layout="split"]').click();page.wait_for_timeout(200);shot(page,f'{device}_navigation.png')
   page.locator('#map-sonar').click();assert page.locator('#cmd-sonar').is_visible();shot(page,f'{device}_sonar.png');page.locator('#map-sonar').click()
   page.locator('#cmd-panels').click();assert page.locator('#cmd-restore').is_visible();shot(page,f'{device}_immersive.png')
   if device=='phone':assert page.locator('#touch-neutral').is_visible() and page.locator('#touch-throttle').is_visible()
   page.locator('#cmd-show').click();page.locator('#operator-collapse').click();assert page.locator('#operator-controls').is_hidden();shot(page,f'{device}_minimal.png');page.locator('#operator-collapse').click();r['minimize_restore']=True
   page.locator('#map-provider').click();page.locator('#maps-connect').click();assert 'Enter an authorized' in page.locator('#maps-status').inner_text();assert not page.evaluate('CMD.googleConnected');page.locator('#maps-noaa').click();r['google_no_key_fallback']=True
   page.locator('.workspace-tabs [data-workspace="configure"]').click();shot(page,f'{device}_setup.png')
   page.locator('[data-rig="twin300"]').click();page.locator('#cfg-apply').click();page.wait_for_function('CMD.motorCount===2');assert page.evaluate('BAYPLAY.state.config.count===2');page.locator('.layout-switch button[data-layout="engine"]').click()
   if device=='phone':page.locator('#cmd-collapse').click()
   shot(page,f'{device}_twin_engines.png');r['twin_rig']=page.evaluate('CMD.inspect().motors')
   if page.locator('#cmd-sidebar').is_hidden():page.locator('#cmd-expand').click()
   page.locator('[data-rig="single450"]').click();page.locator('#cfg-apply').click();assert page.evaluate('CMD.motorCount===1 && CMD.inspect().motors[0].envelope[0]>1');r['engine_size_changes']=True
   page.locator('#cfg-hp').select_option('custom');page.locator('#cfg-custom-hp').fill('350');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.hp===350')
   page.locator('#cfg-hp').select_option('custom');page.locator('#cfg-custom-hp').fill('999');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.hp===350');r['invalid_power_rejected']=True
   page.locator('[data-rig="single300"]').click();page.locator('#setup-name').fill('My test rig');page.locator('#cfg-save').click();assert page.locator('#cfg-saved option').count()==2;r['save_setup']=True
   page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click()
   page.locator('details').nth(2).locator('summary').click();page.locator('[data-detail="drawer1"]').click();page.wait_for_function('BAYPLAY.inspect().drawers[0].value>.85',timeout=60000);r['cockpit_retained']=True
   if page.locator('#cmd-sidebar').is_hidden():page.locator('#cmd-expand').click()
   page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(75)');page.wait_for_function('CMD_LAB.results.length===1&&!CMD_LAB.active');r['test300']=page.evaluate('({...CMD_LAB.results[0],trace:undefined})');assert r['test300']['zeroTo30']>0
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="single450"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(75)');page.wait_for_function('CMD_LAB.results.length===2&&!CMD_LAB.active');r['test450']=page.evaluate('({...CMD_LAB.results[1],trace:undefined})');assert r['test450']['zeroTo30']<r['test300']['zeroTo30'];shot(page,f'{device}_tests.png')
   page.locator('#test-kind').select_option('turn');page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(150)');assert page.evaluate('!CMD_LAB.active');r['turn_result']=page.evaluate('({...CMD_LAB.results.at(-1),trace:undefined})');assert r['turn_result']['turnDiameter']>0
   page.locator('#plot-path').click();shot(page,f'{device}_turn_path.png');page.locator('#plot-speed').click();page.locator('#test-kind').select_option('coast');page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(150)');assert page.evaluate('!CMD_LAB.active');r['coast_result']=page.evaluate('({...CMD_LAB.results.at(-1),trace:undefined})');assert r['coast_result']['coastSeconds']>0
   page.locator('#test-kind').select_option('top');page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(70)');assert page.evaluate('!CMD_LAB.active');r['top_result']=page.evaluate('({...CMD_LAB.results.at(-1),trace:undefined})');assert r['top_result']['duration']>=60
   with page.expect_download() as d:page.locator('#test-csv').click()
   dest=OUT/f'{device}_tests.csv';d.value.save_as(dest);assert 'hp_each' in dest.read_text() and ',450,' in dest.read_text();r['export_csv']=True
   with page.expect_download() as d:page.locator('#test-json').click()
   dest=OUT/f'{device}_tests.json';d.value.save_as(dest);assert len(json.loads(dest.read_text())['results'])==5;r['export_json']=True
   for layout in ['orbit','deck','engine','follow','helm','split']:page.locator('.layout-switch button[data-layout="'+layout+'"]').click();assert page.evaluate('CMD.layout')==layout
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('sport');page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="drive"]').click();
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   assert page.locator('#cmd-jump').is_visible();r['sport_profile']=True
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('reference');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.count===1&&BAYPLAY.state.config.hp===300&&BAYPLAY.state.performanceMode==="reference"');r['reference_guard']=True
   assert page.locator('#cfg-count').is_disabled() and page.locator('#cfg-hp').is_disabled();r['reference_fields_locked']=True
   assert page.evaluate('BayGeo.sample(999999,999999).depth===null');r['outside_chart_no_depth']=True
   assert page.evaluate('CMD_INSTRUMENTS.course({speedOverGround:0,vx:0,vz:0})===null')
   assert page.evaluate('Math.abs(CMD_INSTRUMENTS.course({speedOverGround:1,vx:0,vz:1})-180)<1e-9');r['course_not_heading']=True
   r['chart_features']=page.evaluate('({land:BayGeo.data.land.length,soundings:BayGeo.data.soundings.length})')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');assert not errors,errors;assert not failed,failed;r['passed']=True
  except Exception as e:
   r['exception']=str(e);report['passed']=False
   try:r['failure_state']=page.evaluate('({command:window.CMD?.inspect(),state:window.BAYPLAY?.inspect()})');shot(page,f'{device}_ERROR.png')
   except Exception as s:r['screenshot_exception']=str(s)
  finally:context.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 browser.close()
print(json.dumps({'passed':report['passed'],'tests':[{'device':r['device'],'passed':r['passed'],'exception':r.get('exception')} for r in report['tests']]},indent=2));assert report['passed'],'Command04 browser checks failed'
