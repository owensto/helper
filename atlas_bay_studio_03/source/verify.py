"""Public/local browser acceptance. No injected assets in these tests."""
import os,time,json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent.parent));BASE=os.environ.get('BASE_URL','http://127.0.0.1:8811/index.html');OUT=Path(os.environ.get('REVIEW_DIR',R/'review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'engineering_validated':False,'physical_phone_test':False,'offline_injected':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for asset in ['d','n','w','bay','chase']:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]},device_scale_factor=1);errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 and any(x in r.url for x in ['.glb','.js','.css','.json']) else None)
   st=time.time();response=page.goto(BASE.split('?')[0]+'?v='+asset,wait_until='domcontentloaded',timeout=90000)
   confirm=False
   if page.get_by_text('Open the page',exact=False).count():page.get_by_text('Open the page',exact=False).first.click();confirm=True
   page.wait_for_function('window.FLEET?.ready || window.FLEET_ERROR',timeout=90000);assert page.evaluate('window.FLEET_ERROR') is None
   page.wait_for_timeout(450);initial=page.evaluate('FLEET.inspect()');assert initial['asset']==asset;seconds=round(time.time()-st,2)
   page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
   views={'d':['Profile','Fishing bay','Garage'],'n':['Profile','Sail','Control room'],'w':['Profile','Flight deck','Hangar','Interior'],'bay':['Profile','Helm','Casting deck','T-top'],'chase':['Seating']}[asset]
   if device=='phone':views=views[-2:]
   for v in views:
    page.locator('[data-view="'+v+'"]').click()
    if v in ['Interior','Control room']:page.wait_for_function('FLEET.interiorReady',timeout=60000)
    page.wait_for_timeout(250);page.screenshot(path=str(OUT/f'{device}_{asset}_{v.lower().replace(" ","_")}.png'))
   if asset!='chase':
    page.locator('#reset').click();page.evaluate('FLEET.pose(0.3)');mid=page.evaluate('FLEET.inspect()');page.screenshot(path=str(OUT/f'{device}_{asset}_mid.png'))
    page.evaluate('FLEET.pose(1);FLEET.setView("Hero")');page.wait_for_timeout(400);final=page.evaluate('FLEET.inspect()');page.screenshot(path=str(OUT/f'{device}_{asset}_final.png'))
    if asset=='d':assert final['bay'][1]<-20 and final['chase'][1]<-20;assert final['top'] is not None
    if asset=='w':assert abs(final['rootPosition'][1])<1e-4;assert page.locator('#full').is_hidden()
    if asset=='bay':assert final['top']==initial['top'];assert page.locator('#full').is_hidden()
    # advance a short real playback segment and exercise pause
    page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(600);assert page.evaluate('FLEET.progress')>0;page.locator('#play').click();assert not page.evaluate('FLEET.playing')
   else:mid=final=None;assert page.locator('#play').is_disabled()
   page.locator('#gray').click();page.locator('#sunset').click();page.wait_for_timeout(150);page.locator('#info').click();assert page.locator('#notes').is_visible();page.locator('#close').click();assert not page.locator('#notes').is_visible()
   assert not errors,errors;assert not failed,failed
   result={'device':device,'asset':asset,'http_status':response.status,'host_confirmation_required':confirm,'ready_seconds':seconds,'initial':initial,'mid':mid,'final':final,'errors':errors,'asset_failures':failed,'passed':True};report['tests'].append(result);print(device,asset,'PASS',seconds,flush=True);page.close()
 browser.close()
report['passed']=all(t['passed'] for t in report['tests']) and len(report['tests'])==10;(OUT/'validation.json').write_text(json.dumps(report,indent=2))
