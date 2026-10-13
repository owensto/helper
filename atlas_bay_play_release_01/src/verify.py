"""Exercise real controls and preserve browser evidence. No local asset injection."""
import os,json,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8851/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bayplay/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'screenshots_pause_motion':True,'url':BASE,'passed':False,'offline_injected':False,'physical_phone_test':False,'physics_calibrated':False,'engineering_validated':False,'tests':[]}
def shot(page,path):
 page.evaluate('BAYPLAY.capturePaused=true');page.wait_for_timeout(300)
 try:page.screenshot(path=str(path),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,wh in [('desktop',(1600,1000)),('phone',(430,932))]:
  page=b.new_page(viewport={'width':wh[0],'height':wh[1]},device_scale_factor=1);errs=[];bad=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 and any(z in r.url for z in ['.glb','.js','.css','.hdr','.jpg']) else None)
  result={'device':device,'passed':False,'errors':errs,'missing_assets':bad}
  try:
   start=time.time();rr=page.goto(BASE,wait_until='domcontentloaded',timeout=60000);result['http_status']=rr.status
   gate=page.get_by_text('Open the page',exact=False);result['host_confirmation_required']=gate.count()>0
   if gate.count():gate.first.click()
   page.wait_for_function('window.BAYPLAY?.ready || window.BAYPLAY?.error',timeout=90000);assert page.evaluate('BAYPLAY.error') is None
   page.wait_for_function('BAYPLAY.inspect().skyReady && BAYPLAY.inspect().waterReady',timeout=60000)
   result['ready_seconds']=round(time.time()-start,2);initial=page.evaluate('BAYPLAY.inspect()');result['initial']=initial
   assert initial['hasSteering'] and initial['hasGPS'] and initial['interactiveScreens']>0
   shot(page,OUT/f'{device}_inspect.png')
   for key in ['fishbox','rodlocker','livewell']:
    page.click('[data-action='+key+']');page.wait_for_function('(k)=>BAYPLAY.inspect().hardware[k].value>.96',arg=key,timeout=30000)
    result[key]=page.evaluate('BAYPLAY.inspect().hardware.'+key)
    if key=='fishbox':shot(page,OUT/f'{device}_fishbox_open.png')
    page.click('[data-action='+key+']');page.wait_for_function('(k)=>BAYPLAY.inspect().hardware[k].value<.025',arg=key,timeout=30000)
   page.click('[data-action=lights]');page.click('[data-action=gear]')
   page.click('[data-mode=drive]');page.click('#engine');page.click('[data-gear="1"]');page.locator('#throttle').evaluate('(e)=>{e.value=55;e.dispatchEvent(new Event("input",{bubbles:true}))}')
   page.wait_for_function('BAYPLAY.state.x>-5 && BAYPLAY.state.u>1',timeout=45000);result['forward']=page.evaluate('BAYPLAY.inspect()')
   page.keyboard.press('Tab');page.keyboard.down('KeyD');page.wait_for_function('BAYPLAY.state.heading>.025',timeout=45000);page.keyboard.up('KeyD');result['steering']=page.evaluate('BAYPLAY.state.snapshot()')
   shot(page,OUT/f'{device}_drive_follow.png')
   page.click('[data-camera=helm]');page.wait_for_timeout(800);shot(page,OUT/f'{device}_drive_helm.png');assert page.evaluate('BAYPLAY.cameraMode()')=='helm'
   page.click('#stop');assert page.evaluate('BAYPLAY.state.throttle')==0
   page.click('[data-gear="-1"]');page.locator('#throttle').evaluate('(e)=>{e.value=45;e.dispatchEvent(new Event("input",{bubbles:true}))}')
   page.wait_for_function('BAYPLAY.state.u<-.6',timeout=40000);result['reverse']=page.evaluate('BAYPLAY.state.snapshot()')
   page.evaluate('BAYPLAY.action("fishbox",false)');assert page.evaluate('BAYPLAY.inspect().hardware.fishbox.target')==0
   page.click('[data-mode=inspect]');assert page.evaluate('BAYPLAY.state.engine')==False
   page.click('#help');assert page.locator('#helpdialog').is_visible();page.click('#closehelp')
   page.click('#reset');assert page.evaluate('BAYPLAY.state.x')==-8;assert page.evaluate('BAYPLAY.mode()')=='inspect'
   assert not errs,errs;assert not bad,bad;result['passed']=True
  except Exception as e:
   result['exception']=str(e);result['traceback']=traceback.format_exc();result['body']=page.locator('body').inner_text()[:3000]
   try:shot(page,OUT/f'{device}_ERROR.png')
   except Exception:pass
  report['tests'].append(result);(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(result,indent=2),flush=True);page.close()
  if not result['passed']:break
 b.close()
report['passed']=len(report['tests'])==2 and all(t['passed'] for t in report['tests']);(OUT/'validation.json').write_text(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit('Play Lab verification failed; diagnostic evidence retained.')
