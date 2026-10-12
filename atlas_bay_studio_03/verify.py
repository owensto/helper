"""Exercise real public/local pages. No injection, no forged model data."""
import os,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8825/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bay03/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'tests':[],'offline_injected':False,'physical_phone_test':False,'engineering_validated':False}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for dev,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for key in ['bay','n','w','d','chase']:
   p=browser.new_page(viewport={'width':size[0],'height':size[1]});errors=[];bad=[]
   p.on('pageerror',lambda e:errors.append(str(e)))
   p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 and any(x in r.url for x in ['.glb','.js','.css','.json']) else None)
   t={'device':dev,'asset':key,'passed':False}
   try:
    start=time.monotonic();r=p.goto(BASE+'?v='+key,wait_until='domcontentloaded',timeout=60000);t['http_status']=r.status
    p.wait_for_function("document.querySelector('#scene') || /open the page/i.test(document.body.innerText)",timeout=25000)
    gate=p.get_by_text('Open the page',exact=False);t['host_confirmation_required']=gate.count()>0
    if gate.count():gate.first.click()
    p.wait_for_function('window.FLEET?.ready || window.FLEET_ERROR',timeout=60000);assert p.evaluate('window.FLEET_ERROR') is None
    assert p.evaluate('FLEET.id')==key;t['ready_seconds']=round(time.monotonic()-start,2)
    p.wait_for_timeout(500);p.screenshot(path=str(OUT/f'{dev}_{key}_hero.png'));t['initial']=p.evaluate('FLEET.inspect()')
    if key=='bay':
     for view in ['Profile','Bow','Stern','Helm','Casting deck','T-top']:
      p.locator('[data-view="'+view+'"]').click();p.wait_for_timeout(350);p.screenshot(path=str(OUT/f'{dev}_bay_{view.lower().replace(" ","_")}.png'))
     p.locator('[data-view="Hero"]').click();p.wait_for_timeout(500)
     before=p.evaluate('({c:FLEET.camera.position.toArray(),t:FLEET.controls.target.toArray()})')
     p.locator('#baycompare').click();p.wait_for_function('FLEET.ready && FLEET.inspect().previousBay');p.wait_for_timeout(400);p.screenshot(path=str(OUT/f'{dev}_bay_previous.png'))
     after=p.evaluate('({c:FLEET.camera.position.toArray(),t:FLEET.controls.target.toArray()})')
     delta=max(abs(a-b) for k in ['c','t'] for a,b in zip(before[k],after[k]));assert delta<1e-4,delta;t['comparison_camera_delta_m']=delta
     p.locator('#baycompare').click();p.wait_for_function('FLEET.ready && !FLEET.inspect().previousBay');p.wait_for_timeout(500);p.screenshot(path=str(OUT/f'{dev}_bay_refined.png'))
     p.evaluate('FLEET.pose(.25)');mid=p.evaluate('FLEET.inspect()');assert mid['top']==t['initial']['top'];t['secured']=mid
     p.evaluate('FLEET.pose(1)');assert p.evaluate('FLEET.inspect().top')==t['initial']['top']
     p.locator('#reset').click();p.locator('#play').click();p.wait_for_timeout(600);assert p.evaluate('FLEET.progress')>0;p.locator('#play').click();assert not p.evaluate('FLEET.playing')
    if key in ['n','w']:
     p.locator('#cutaway').click();p.wait_for_function('FLEET.interiorReady',timeout=60000);t['cutaway']=p.evaluate('FLEET.inspect()');assert t['cutaway']['visibleInteriorMeshes']>0 and t['cutaway']['clippedExteriorMeshes']>0
     p.wait_for_timeout(350);p.screenshot(path=str(OUT/f'{dev}_{key}_cutaway.png'));p.locator('#cutaway').click()
    if key=='d':
     p.evaluate('FLEET.pose(1)');final=p.evaluate('FLEET.inspect()');assert final['bay'][1]<-20 and final['chase'][1]<-20;t['final']=final
    if key=='w':assert p.locator('#full').is_hidden()
    p.locator('#gray').click();p.locator('#sunset').click();p.locator('#info').click();assert p.locator('#notes').is_visible();p.locator('#close').click()
    assert not errors,errors;assert not bad,bad;t.update(passed=True,errors=errors,asset_failures=bad)
   except Exception as e:
    t.update(error=str(e),errors=errors,asset_failures=bad)
    p.screenshot(path=str(OUT/f'{dev}_{key}_ERROR.png'))
   report['tests'].append(t);(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(t),flush=True);p.close()
   if not t['passed']:raise SystemExit('Verification failed; exact diagnostics retained')
 browser.close()
report['passed']=len(report['tests'])==10 and all(t['passed'] for t in report['tests']);(OUT/'validation.json').write_text(json.dumps(report,indent=2))
