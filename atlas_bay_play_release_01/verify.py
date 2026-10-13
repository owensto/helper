"""Test real browser UI, model motion and screenshots. No model injection."""
import os,json,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8851/index.html')
OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bayplay11/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'offline_injected':False,'physical_phone_test':False,'physics_calibrated':False,'engineering_validated':False,'tests':[]}
def shot(page,path):
 page.evaluate('BAYPLAY.capturePaused=true')
 try:
  page.wait_for_timeout(150);page.screenshot(path=str(path),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
def wait(page,expr,arg=None):page.wait_for_function(expr,arg=arg,timeout=60000,polling=150)
def slide(page,id,val):page.locator(id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',val)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,wh in [('desktop',(1600,1000)),('phone',(430,932))]:
  page=browser.new_page(viewport={'width':wh[0],'height':wh[1]},device_scale_factor=1)
  errors=[];missing=[];r={'device':device,'passed':False,'errors':errors,'missing_assets':missing}
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda q:missing.append({'url':q.url,'status':q.status}) if q.status>=400 and any(z in q.url for z in ['.glb','.js','.css','.hdr','.jpg']) else None)
  try:
   started=time.time();res=page.goto(BASE,wait_until='domcontentloaded',timeout=60000);r['http_status']=res.status
   gate=page.get_by_text('Open the page',exact=False);r['host_confirmation_required']=gate.count()>0
   if gate.count():gate.first.click()
   wait(page,'window.BAYPLAY?.ready || window.BAYPLAY?.error');assert page.evaluate('BAYPLAY.error') is None
   wait(page,'BAYPLAY.inspect().skyReady&&BAYPLAY.inspect().waterReady')
   r['initial']=page.evaluate('BAYPLAY.inspect()');r['ready_seconds']=round(time.time()-started,2)
   assert r['initial']['hasSteering'] and r['initial']['hasGPS'] and r['initial']['interactiveScreens']==2
   shot(page,OUT/f'{device}_explore.png')
   for key in ['fishbox','rodlocker','livewell']:
    page.click('[data-action='+key+']')
    wait(page,'k=>BAYPLAY.inspect().hardware[k].value>.96',key)
    r[key]=page.evaluate('k=>BAYPLAY.inspect().hardware[k]',key)
    if key=='fishbox':shot(page,OUT/f'{device}_fishbox.png')
    page.click('[data-action='+key+']')
    assert page.evaluate('k=>BAYPLAY.inspect().hardware[k].target',key)==0
    wait(page,'k=>BAYPLAY.inspect().hardware[k].value<.025',key)
   page.click('[data-action=lights]');assert page.evaluate('BAYPLAY.inspect().lamps')
   page.click('[data-action=gear]');assert page.evaluate('BAYPLAY.inspect().gearStowed')
   page.click('[data-mode=drive]')
   wait(page,'Object.values(BAYPLAY.inspect().hardware).every(h=>h.value<.03)')
   page.click('#engine');assert page.evaluate('BAYPLAY.state.engine')
   oldprop=page.evaluate('BAYPLAY.inspect().propellerAngle')
   page.wait_for_timeout(500)
   assert page.evaluate('BAYPLAY.inspect().propellerAngle')==oldprop,'Propeller rotates in neutral'
   page.click('[data-gear="1"]');slide(page,'#throttle',55)
   wait(page,'BAYPLAY.state.x>-5&&BAYPLAY.state.u>1')
   r['forward']=page.evaluate('BAYPLAY.inspect()')
   assert r['forward']['propellerAngle']!=oldprop
   if device=='desktop':
    page.locator('#scene').focus();page.keyboard.down('KeyD')
    try:wait(page,'BAYPLAY.state.heading>.04')
    finally:page.keyboard.up('KeyD')
    r['keyboard_steering']=True
   else:
    button=page.locator('#right').bounding_box();page.mouse.move(button['x']+button['width']/2,button['y']+button['height']/2);page.mouse.down()
    try:wait(page,'BAYPLAY.state.heading>.04')
    finally:page.mouse.up()
    r['pointer_steering']=True
   r['steered']=page.evaluate('BAYPLAY.state.snapshot()')
   page.click('[data-gear="0"]');page.click('[data-gear="-1"]')
   assert page.evaluate('BAYPLAY.state.gear')==0
   page.click('[data-gear="1"]');slide(page,'#throttle',30)
   shot(page,OUT/f'{device}_drive_follow.png')
   page.click('[data-camera=helm]');assert page.evaluate('BAYPLAY.cameraMode()')=='helm'
   page.wait_for_timeout(250);shot(page,OUT/f'{device}_drive_helm.png')
   page.click('#stop');assert page.evaluate('BAYPLAY.state.throttle')==0 and page.evaluate('BAYPLAY.state.u')==0
   page.click('[data-gear="-1"]');slide(page,'#throttle',45)
   wait(page,'BAYPLAY.state.u<-.6')
   r['reverse']=page.evaluate('BAYPLAY.state.snapshot()')
   page.evaluate('BAYPLAY.action("fishbox",false)');assert page.evaluate('BAYPLAY.inspect().hardware.fishbox.target')==0
   page.click('[data-mode=inspect]');assert page.evaluate('BAYPLAY.state.engine')==False
   page.click('#help');assert page.locator('#helpdialog').is_visible();page.click('#closehelp')
   page.click('#reset');assert page.evaluate('BAYPLAY.state.x')==-8 and page.evaluate('BAYPLAY.mode()')=='inspect'
   assert page.evaluate('BAYPLAY.inspect().lamps')==False
   r['body_scroll_width']=page.evaluate('document.documentElement.scrollWidth')
   assert r['body_scroll_width']<=wh[0]
   assert not errors,errors;assert not missing,missing;r['passed']=True
  except Exception as ex:
   r['exception']=str(ex);r['traceback']=traceback.format_exc()
   try:r['failure_state']=page.evaluate('window.BAYPLAY?.inspect()');shot(page,OUT/f'{device}_ERROR.png')
   except Exception:pass
  report['tests'].append(r);(OUT/'validation.json').write_text(json.dumps(report,indent=2))
  print(json.dumps(r,indent=2),flush=True);page.close()
  if not r['passed']:break
 browser.close()
report['passed']=len(report['tests'])==2 and all(t['passed'] for t in report['tests'])
(OUT/'validation.json').write_text(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit('Play prototype verification failed')
