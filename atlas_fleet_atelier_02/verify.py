"""Real-browser acceptance for the same exported models, no asset injection."""
import os,time,json,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8812/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/atelier/review'));OUT.mkdir(parents=True,exist_ok=True)
r={'url':BASE,'passed':False,'engineering_validated':False,'physical_phone_test':False,'offline_injected':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for asset in ['bay','n','w','d','chase']:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]});errors=[];fails=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('response',lambda x:fails.append({'url':x.url,'status':x.status}) if x.status>=400 and any(y in x.url for y in ['.glb','.js','.css','.json']) else None)
   result={'device':device,'asset':asset,'passed':False}
   try:
    st=time.time();resp=page.goto(BASE.split('?')[0]+'?v='+asset,wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function("document.querySelector('#scene') || /open the page/i.test(document.body.innerText)",timeout=30000)
    gate=page.get_by_text('Open the page',exact=False);result['host_confirmation_required']=gate.count()>0
    if gate.count():gate.first.click()
    page.wait_for_function('window.FLEET?.ready || window.FLEET_ERROR',timeout=90000);assert not page.evaluate('window.FLEET_ERROR')
    result.update(http_status=resp.status,ready_seconds=round(time.time()-st,2),initial=page.evaluate('FLEET.inspect()'))
    assert result['initial']['asset']==asset
    page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
    if asset in ['n','w']:
     # Exercise the actual previously reported broken button BEFORE the interior camera presets.
     page.locator('#cutaway').click();page.wait_for_function('FLEET.interiorReady || FLEET.interiorError',timeout=60000)
     state=page.evaluate('FLEET.inspect()');assert state['cutaway'] and state['interiorLoadState']=='loaded',state
     assert state['visibleInteriorMeshes']>5 and state['clippedExteriorMeshes']>5,state
     result['cutaway']=state;page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'{device}_{asset}_cutaway.png'))
     page.locator('#sectionrange').fill('45');page.locator('#sectionrange').dispatch_event('input');assert abs(page.evaluate('FLEET.inspect().sectionOffset')-.45)<.001
     page.locator('#sectionflip').click();page.wait_for_timeout(200)
     page.locator('#sectiondeck').click();assert page.evaluate('FLEET.inspect().sectionMode')=='deck'
     page.screenshot(path=str(OUT/f'{device}_{asset}_decks.png'))
     page.locator('#cutaway').click();state=page.evaluate('FLEET.inspect()');assert not state['cutaway'] and state['visibleInteriorMeshes']==0 and state['clippedExteriorMeshes']==0,state
     result['cutaway_restores_exterior']=True
    views={'bay':['Helm','T-top','Casting deck'],'d':['Fishing bay','Garage','Dry core','Stowage'],'n':['Sail','Control room'],'w':['Flight deck','Hangar','Interior'],'chase':['Seating']}[asset]
    for view in (views if device=='desktop' else views[:1]):
     page.locator('[data-view="'+view+'"]').click()
     if view in ['Interior','Control room']:page.wait_for_function('FLEET.interiorReady',timeout=60000)
     page.wait_for_timeout(250);page.screenshot(path=str(OUT/f'{device}_{asset}_{view.lower().replace(" ","_")}.png'))
    if asset!='chase':
     page.locator('#reset').click();page.evaluate('FLEET.pose(.8)');result['ready_pose']=page.evaluate('FLEET.inspect()')
     page.screenshot(path=str(OUT/f'{device}_{asset}_ready.png'))
     page.evaluate('FLEET.pose(1)');final=page.evaluate('FLEET.inspect()');result['final']=final
     if asset=='d':assert final['bay'][1]<-20 and final['chase'][1]<-20 and final['top'] is not None
     if asset=='bay':assert final['top']==result['initial']['top']
     if asset=='w':assert abs(final['rootPosition'][1])<1e-5
     page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(650);assert page.evaluate('FLEET.progress')>0;page.locator('#play').click();assert not page.evaluate('FLEET.playing')
    if asset in ['w','bay']:assert page.locator('#full').is_hidden()
    page.locator('#gray').click();page.locator('#sunset').click();page.wait_for_timeout(200)
    page.locator('#info').click();assert page.locator('#notes').is_visible();page.locator('#close').click()
    assert not errors,errors;assert not fails,fails
    result.update(passed=True,errors=errors,asset_failures=fails)
   except Exception as e:
    result.update(exception=str(e),traceback=traceback.format_exc(),errors=errors,asset_failures=fails)
    try:page.screenshot(path=str(OUT/f'{device}_{asset}_ERROR.png'))
    except Exception:pass
   r['tests'].append(result);(OUT/'validation.json').write_text(json.dumps(r,indent=2));print(device,asset,result['passed'],result.get('exception',''),flush=True);page.close()
   if not result['passed']:browser.close();raise SystemExit(1)
 browser.close()
r['passed']=len(r['tests'])==10 and all(t['passed'] for t in r['tests']);(OUT/'validation.json').write_text(json.dumps(r,indent=2))
