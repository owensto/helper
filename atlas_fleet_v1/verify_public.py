"""Verify real public fleet delivery; save diagnostics even on startup failure."""
import os,json,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','https://rawcdn.githack.com/owensto/helper/414020893caab650676425147dd345ce92a923cf/atlas_fleet_v1/live/index.html')
OUT=Path(os.environ.get('REVIEW_DIR','/tmp/fleet-public'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'engineering_validated':False,'physical_phone_test':False,'offline_injected':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for asset in ['bay','d','n','w','chase']:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]},device_scale_factor=1)
   errors=[];failed=[];responses=[];console=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
   page.on('response',lambda r:responses.append({'url':r.url,'status':r.status,'type':r.headers.get('content-type','')}))
   page.on('console',lambda m:console.append({'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
   result={'device':device,'asset':asset,'passed':False,'errors':errors,'request_failures':failed}
   try:
    start=time.time();r=page.goto(BASE+'?v='+asset,wait_until='domcontentloaded',timeout=60000)
    result['http_status']=r.status
    page.wait_for_function("document.querySelector('#scene') || /open the page/i.test(document.body.innerText)",timeout=20000)
    gate=page.get_by_text('Open the page',exact=False);result['host_confirmation_required']=gate.count()>0
    if gate.count():gate.first.click()
    page.wait_for_function('window.FLEET?.ready || window.FLEET_ERROR',timeout=60000)
    assert page.evaluate('window.FLEET_ERROR') is None
    initial=page.evaluate('FLEET.inspect()');assert initial['asset']==asset
    result.update(initial=initial,ready_seconds=round(time.time()-start,2))
    page.wait_for_timeout(350);page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
    views={'d':['Fishing bay','Garage'],'n':['Sail','Control room'],'w':['Hangar','Interior'],'bay':['Helm','T-top'],'chase':['Seating']}[asset]
    for name in views:
     page.locator('[data-view="'+name+'"]').click()
     if name in ['Interior','Control room']:page.wait_for_function('FLEET.interiorReady',timeout=60000)
     page.wait_for_timeout(250);page.screenshot(path=str(OUT/f'{device}_{asset}_{name.lower().replace(" ","_")}.png'))
    if asset!='chase':
     page.locator('#reset').click();page.evaluate('FLEET.pose(.3)');result['mid']=page.evaluate('FLEET.inspect()')
     page.evaluate('FLEET.pose(1);FLEET.setView("Hero")');page.wait_for_timeout(250)
     final=page.evaluate('FLEET.inspect()');result['final']=final;page.screenshot(path=str(OUT/f'{device}_{asset}_final.png'))
     if asset=='d':assert final['bay'][1]<-20 and final['chase'][1]<-20 and final['top'] is not None
     if asset=='w':assert abs(final['rootPosition'][1])<.0001 and page.locator('#full').is_hidden()
     if asset=='bay':assert final['top']==initial['top'] and page.locator('#full').is_hidden()
     page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(800);assert page.evaluate('FLEET.progress')>0;page.locator('#play').click();assert not page.evaluate('FLEET.playing')
    else:assert page.locator('#play').is_disabled()
    page.locator('#gray').click();page.locator('#sunset').click();page.locator('#info').click();assert page.locator('#notes').is_visible();page.locator('#close').click();assert not page.locator('#notes').is_visible()
    bad=[r for r in responses if r['status']>=400 and any(ext in r['url'] for ext in ['.glb','.js','.css','.json'])]
    assert not errors,errors;assert not bad,bad
    result['asset_failures']=bad;result['passed']=True
   except Exception as exc:
    result['exception']=str(exc)
    result['final_url']=page.url
    result['body']=page.locator('body').inner_text()[:7000]
    result['responses']=responses;result['console']=console
    try:page.screenshot(path=str(OUT/f'{device}_{asset}_ERROR.png'));(OUT/f'{device}_{asset}_ERROR.html').write_text(page.content())
    except Exception:pass
   report['tests'].append(result)
   (OUT/'validation.json').write_text(json.dumps(report,indent=2))
   print(json.dumps(result,indent=2),flush=True);page.close()
   if not result['passed']:
    browser.close();raise SystemExit('Public verification failed; diagnostics saved.')
 browser.close()
report['passed']=len(report['tests'])==10 and all(t['passed'] for t in report['tests'])
(OUT/'validation.json').write_text(json.dumps(report,indent=2))
