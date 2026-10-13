"""Exercise UI controls and real model nodes. Public tests never inject assets."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,traceback,time
BASE=os.environ['BASE_URL'];OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bayplay02/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'offline_injected':False,'physical_phone_test':False,'physics_calibrated':False,'engineering_validated':False,'tests':[]}
def slider(p,sel,v):p.locator(sel).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(v))
def wait(p,js):p.wait_for_function(js,timeout=75000)
def shot(p,name):
 p.evaluate('BAYPLAY.capturePaused=true');p.wait_for_timeout(150)
 try:p.screenshot(path=str(OUT/name),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for device,w,h in [('desktop',1600,1000),('phone',430,932)]:
  p=browser.new_page(viewport={'width':w,'height':h},is_mobile=device=='phone',has_touch=device=='phone');p.set_default_timeout(60000);r={'device':device,'passed':False,'errors':[],'asset_failures':[]};report['tests'].append(r)
  p.on('pageerror',lambda e,r=r:r['errors'].append(str(e)))
  p.on('console',lambda m,r=r:r['errors'].append(m.text) if m.type=='error' and ('THREE.' in m.text or 'Shader Error' in m.text) else None)
  p.on('response',lambda res,r=r:r['asset_failures'].append({'url':res.url,'status':res.status}) if res.status>=400 and any(x in res.url for x in ['ATLAS_Bay_Play.glb','coastal_sky.hdr','waternormals','app.js','coast.js','sound.js','physics.js','app.css']) else None)
  try:
   start=time.monotonic();res=p.goto(BASE,wait_until='domcontentloaded',timeout=120000);r['http_status']=res.status
   c=p.get_by_text('Open the page',exact=True)
   if c.count():r['host_confirmation_required']=True;c.first.click()
   wait(p,'window.BAYPLAY?.ready && BAYPLAY.inspect().skyReady && BAYPLAY.inspect().waterReady');r['ready_seconds']=round(time.monotonic()-start,2);r['initial']=p.evaluate('BAYPLAY.inspect()')
   shot(p,f'{device}_explore.png')
   p.locator('[data-action=fishbox]').click();wait(p,'BAYPLAY.inspect().hardware.fishbox.value>.98');assert p.evaluate('BAYPLAY.model.getObjectByName("PLAY_LATCH_fishbox").rotation.y')>1.5;shot(p,f'{device}_fishbox.png');p.locator('[data-action=fishbox]').click();wait(p,'BAYPLAY.inspect().hardware.fishbox.value<.02')
   for key in ['rodlocker','livewell']:
    p.locator('[data-action='+key+']').click();wait(p,f'BAYPLAY.inspect().hardware.{key}.value>.98');p.locator('[data-action='+key+']').click();wait(p,f'BAYPLAY.inspect().hardware.{key}.value<.02')
   for i in [1,2,3]:p.locator(f'[data-action=drawer{i}]').click();wait(p,f'BAYPLAY.inspect().drawers[{i-1}].value>.98')
   r['open_drawers']=p.evaluate('BAYPLAY.inspect().drawers');assert all(d['position'][0]<-2.20 for d in r['open_drawers']);shot(p,f'{device}_tackle.png')
   p.locator('[data-action=bolsters]').click();wait(p,'BAYPLAY.inspect().bolsters.value>.98');shot(p,f'{device}_bolsters.png')
   p.locator('[data-action=lights]').click();p.locator('[data-action=nav]').click();p.locator('#sound').click();wait(p,'BAYPLAY.inspect().soundEnabled');p.locator('#sound').click();wait(p,'!BAYPLAY.inspect().soundEnabled');r['opt_in_audio_toggled']=True
   p.locator('[data-mode=drive]').click();wait(p,'BAYPLAY.inspect().drawers.every(d=>d.value<.025) && Object.values(BAYPLAY.inspect().hardware).every(h=>h.value<.025)');r['drive_closes_storage']=True
   p.locator('[data-gear="1"]').click();p.locator('#engine').click();assert not p.evaluate('BAYPLAY.state.engine');p.locator('[data-gear="0"]').click();p.locator('#engine').click();wait(p,'BAYPLAY.state.startTimer===0 && BAYPLAY.state.rpm>500');r['engine_start_interlock']=True
   p.locator('[data-gear="1"]').click();slider(p,'#throttle',55);wait(p,'BAYPLAY.state.distance>4 && BAYPLAY.state.u>2');r['forward']=p.evaluate('BAYPLAY.inspect().snapshot')
   if device=='desktop':
    p.locator('#scene').click(position={'x':750,'y':410},force=True);p.keyboard.down('KeyD');wait(p,'BAYPLAY.state.heading>.035');p.keyboard.up('KeyD');r['keyboard_steer']=True
   else:
    bb=p.locator('#right').bounding_box();p.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);p.mouse.down();wait(p,'BAYPLAY.state.heading>.035');p.mouse.up();r['pointer_steer']=True
   slider(p,'#trim',75);wait(p,'BAYPLAY.state.trimActual>.72');assert p.evaluate('BAYPLAY.inspect().trimAngle')<-.13;r['trim']=p.evaluate('BAYPLAY.inspect().snapshot')
   p.locator('[data-camera=follow]').click();shot(p,f'{device}_drive_follow.png');p.locator('[data-camera=helm]').click();wait(p,'BAYPLAY.camera.position.distanceTo(BAYPLAY.scene.getObjectByName("PLAYER_BOAT").localToWorld(new ATLASRuntime.Vector3(-1.84,1.85,.18)))<.08');r['helm_position_verified']=True;shot(p,f'{device}_drive_helm.png');p.locator('#clearview').click();shot(p,f'{device}_helm_clear.png');p.keyboard.press('Escape')
   v=p.evaluate('BAYPLAY.state.speedOverGround');x=p.evaluate('BAYPLAY.state.distance');p.locator('#stop').click();wait(p,'BAYPLAY.state.gear===0');v1=p.evaluate('BAYPLAY.state.speedOverGround');assert v1>v*.65,(v,v1);wait(p,f'BAYPLAY.state.distance>{x+.3}');r['neutral_coasts']=True
   p.locator('#pause').click();wait(p,'BAYPLAY.inspect().paused');a=p.evaluate('BAYPLAY.inspect().snapshot');p.wait_for_timeout(700);b=p.evaluate('BAYPLAY.inspect().snapshot');assert a==b;r['pause_freezes_simulation']=True;p.locator('#pause').click()
   p.locator('[data-camera=engine]').click();shot(p,f'{device}_trim.png');p.locator('#reset').click();p.locator('[data-mode=drive]').click();p.locator('#engine').click();wait(p,'BAYPLAY.state.startTimer===0');p.locator('[data-gear="-1"]').click();slider(p,'#throttle',45);wait(p,'BAYPLAY.state.u<-.6');r['reverse']=p.evaluate('BAYPLAY.inspect().snapshot')
   p.locator('#reset').click();p.locator('#conditions').select_option('breeze');p.locator('[data-mode=drive]').click();wait(p,'BAYPLAY.state.z>.35 && BAYPLAY.state.speedOverGround>.1');r['neutral_drift']=p.evaluate('BAYPLAY.inspect().snapshot');p.locator('#conditions').select_option('chop');wait(p,'BAYPLAY.state.environment==="chop"');p.locator('[data-camera=follow]').click();shot(p,f'{device}_coast.png')
   p.locator('#help').click();assert p.locator('#helpdialog').evaluate('(e)=>e.open');p.locator('#closehelp').click();p.locator('#reset').click();assert not p.evaluate('BAYPLAY.state.engine');assert p.evaluate('document.documentElement.scrollWidth')<=w+2
   r['final']=p.evaluate('BAYPLAY.inspect()');assert not r['errors'],r['errors'];assert not r['asset_failures'],r['asset_failures'];r['passed']=True
  except Exception as e:
   r['exception']=str(e);r['traceback']=traceback.format_exc();report['passed']=False
   try:r['failure_state']=p.evaluate('window.BAYPLAY?.inspect()');shot(p,f'{device}_ERROR.png')
   except Exception as inner:r['screenshot_error']=str(inner)
  finally:p.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(r),flush=True)
 browser.close()
assert report['passed'],json.dumps(report,indent=2)
