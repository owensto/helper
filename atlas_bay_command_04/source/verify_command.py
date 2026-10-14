"""Browser acceptance tests use the real exported boat and real app controls."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,time
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8874/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/command04/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'physical_device_test':False,'marine_validated':False,'google_authorized_map_tested':False,'local_assets_injected':False,'tests':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.capturePaused=true');p.wait_for_timeout(200)
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,w,h in [('desktop',1600,1000),('phone',430,932)]:
  context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
  page=context.new_page();errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append([r.status,r.url]) if r.status>=400 and not 'favicon' in r.url else None)
  r={'device':device,'passed':False,'errors':errors,'asset_failures':failed};report['tests'].append(r)
  try:
   page.goto(BASE,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click();r['host_confirmation']=True
   page.wait_for_function('window.CMD?.ready && BAYPLAY.ready && BayGeo.ready',timeout=120000)
   page.wait_for_timeout(800);r['initial']=page.evaluate('CMD.inspect()');assert r['initial']['config']['location']=='beaufort'
   assert page.evaluate('!BayGeo.sample(BAYPLAY.state.x,BAYPLAY.state.z).land')
   shot(page,f'{device}_configure.png')
   page.locator('[data-rig="twin300"]').click();page.locator('#cfg-apply').click();page.wait_for_function('CMD.motorCount===2');assert page.evaluate('BAYPLAY.state.config.count===2 && BAYPLAY.state.config.hp===300')
   page.locator('[data-layout="engine"]').click();shot(page,f'{device}_twin_engines.png')
   page.locator('#cfg-hp').select_option('custom');page.locator('#cfg-custom-hp').fill('350');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.hp===350');r['custom_power']=True
   page.locator('#cfg-custom-hp').fill('999');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.hp===350');r['invalid_power_rejected']=True
   page.locator('[data-rig="single300"]').click();page.locator('#cfg-drive').click();page.wait_for_function('BAYPLAY.mode()==="drive" && CMD.layout==="helm"');page.wait_for_timeout(700)
   assert page.locator('#cmd-sidebar').is_hidden();shot(page,f'{device}_helm.png')
   page.locator('#cmd-engine').click();page.wait_for_function('BAYPLAY.state.engine && BAYPLAY.state.startTimer===0',timeout=60000);page.locator('[data-cmd-gear="1"]').click();page.locator('#cmd-throttle').evaluate('(e)=>{e.value=60;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   page.wait_for_function('BAYPLAY.state.speedOverGround>1',timeout=60000);r['rendered_forward']=page.evaluate('BAYPLAY.state.snapshot()')
   page.locator('#cmd-neutral').click();page.wait_for_timeout(100);assert page.evaluate('BAYPLAY.state.speedOverGround>0 && BAYPLAY.state.gear===0');r['coasting']=True
   page.locator('[data-layout="split"]').click();shot(page,f'{device}_chart_helm.png')
   page.locator('#cmd-panels').click();assert page.locator('#cmd-restore').is_visible();shot(page,f'{device}_immersive.png');page.locator('#cmd-show').click();assert page.locator('#cmd-panels').is_visible();r['full_hide_restore']=True
   page.locator('#operator-collapse').click();assert page.locator('#operator-controls').is_hidden();page.locator('#operator-collapse').click();r['controls_minimize']=True
   # Google path makes no request without credentials; no success claim.
   page.locator('#map-provider').click();page.locator('#maps-connect').click();assert 'Enter an authorized' in page.locator('#maps-status').inner_text();assert not page.evaluate('CMD.googleConnected');page.locator('#maps-noaa').click();r['google_no_key_fallback']=True
   page.locator('.workspace-tabs [data-workspace="configure"]').click();
   page.locator('details').nth(2).locator('summary').click();page.locator('[data-detail="drawer1"]').click();page.wait_for_function('BAYPLAY.inspect().drawers[0].value>.85',timeout=60000);r['retained_cockpit']=True
   if page.locator('#cmd-sidebar').is_hidden():page.locator('#cmd-expand').click()
   page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-kind').select_option('accel');page.locator('#test-run').click()
   page.evaluate('BAYPLAY.testStep(75)');page.wait_for_function('CMD_LAB.results.length===1 && !CMD_LAB.active');r['test300']=page.evaluate('({...CMD_LAB.results[0],trace:undefined})');assert r['test300']['zeroTo30']>0
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="single450"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(75)');page.wait_for_function('CMD_LAB.results.length===2 && !CMD_LAB.active');r['test450']=page.evaluate('({...CMD_LAB.results[1],trace:undefined})');assert r['test450']['zeroTo30']<r['test300']['zeroTo30'];shot(page,f'{device}_comparison.png')
   with page.expect_download() as d:page.locator('#test-csv').click()
   dest=OUT/f'{device}_tests.csv';d.value.save_as(dest);assert 'hp_each' in dest.read_text() and ',450,' in dest.read_text();r['export_csv']=True
   # All layout selections remain operable and don't replace geometry.
   for layout in ['orbit','deck','engine','follow','helm','split']:page.locator('[data-layout="'+layout+'"]').click();assert page.evaluate('CMD.layout')==layout
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('sport');page.locator('#cfg-apply').click();page.locator('.workspace-tabs [data-workspace="drive"]').click();assert page.locator('#cmd-jump').is_visible();r['sport_profile']=True
   # Source-profile config visibly rejects twins rather than pretending measured curves exist.
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('reference');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.config.count===1 && BAYPLAY.state.config.hp===300 && BAYPLAY.state.performanceMode==="reference"');r['reference_guard']=True
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');assert not errors,errors;assert not failed,failed;r['passed']=True
  except Exception as e:
   r['exception']=str(e);report['passed']=False
   try:r['failure_state']=page.evaluate('window.CMD?.inspect()');shot(page,f'{device}_ERROR.png')
   except:pass
  finally:context.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 browser.close()
print(json.dumps(report,indent=2));assert report['passed'],'Command04 browser checks failed'
