import os,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ['BASE_URL'];OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bay06/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'offline_injected':False,'physical_phone_test':False,'engineering_validated':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for asset in ['bay','n','w','d','chase']:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]});errors=[];bad=[];console=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
   page.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 and any(z in r.url for z in ['.glb','.js','.json','.hdr','.jpg','.css']) else None)
   item={'asset':asset,'device':device,'passed':False,'errors':errors,'asset_failures':bad}
   try:
    start=time.time();r=page.goto(BASE+'?v='+asset,wait_until='domcontentloaded',timeout=60000);item['http_status']=r.status
    page.wait_for_function("document.querySelector('#scene')||/open the page/i.test(document.body.innerText)",timeout=20000)
    gate=page.get_by_text('Open the page',exact=False);item['host_confirmation_required']=gate.count()>0
    if gate.count():gate.first.click()
    page.wait_for_function('window.FLEET?.ready||window.FLEET_ERROR',timeout=90000);assert page.evaluate('window.FLEET_ERROR') is None
    item['initial']=page.evaluate('FLEET.inspect()');assert item['initial']['asset']==asset
    if asset=='bay':page.wait_for_function('window.BAY_QUALITY?.ready',timeout=60000)
    page.wait_for_timeout(400);item['ready_seconds']=round(time.time()-start,2);page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
    if asset=='bay':
     assert page.evaluate("FLEET.model.getObjectByName('DT06_GPS_Vessel')!==undefined");item['GPS_housing']=True
     for view in ['Seating','Helm','Rod rack','GPS','Outboard']:
      page.locator('[data-view="'+view+'"]').click();page.wait_for_timeout(300);page.screenshot(path=str(OUT/f'{device}_bay_{view.lower().replace(" ","_")}.png'))
     page.evaluate('FLEET.setView("Hero")');before=page.evaluate('[...FLEET.camera.position.toArray(),...FLEET.controls.target.toArray()]')
     page.locator('#baycompare').click();page.wait_for_function('FLEET.ready&&FLEET.inspect().previousBay');page.wait_for_timeout(300)
     after=page.evaluate('[...FLEET.camera.position.toArray(),...FLEET.controls.target.toArray()]');assert max(abs(a-b) for a,b in zip(before,after))<1e-4
     item['comparison_camera_delta_m']=max(abs(a-b) for a,b in zip(before,after));page.screenshot(path=str(OUT/f'{device}_bay_previous_matched.png'))
     page.locator('#baycompare').click();page.wait_for_function('FLEET.ready&&!FLEET.inspect().previousBay')
     page.locator('#bayenvironment').click();page.wait_for_timeout(400);page.screenshot(path=str(OUT/f'{device}_bay_studio.png'));assert page.evaluate('BAY_QUALITY.mode')=='studio';page.locator('#bayenvironment').click()
     page.locator('#hullstudy').click();page.wait_for_function('FLEET.ready&&FLEET.inspect().shallowBay');page.locator('#hullstudy').click();page.wait_for_function('FLEET.ready&&!FLEET.inspect().shallowBay')
     page.locator('#reset').click();initial=page.evaluate('FLEET.inspect()');page.locator('#play').click();page.wait_for_timeout(700);assert page.evaluate('FLEET.progress')>0;page.locator('#play').click();page.evaluate('FLEET.pose(.25)');assert page.evaluate('FLEET.inspect().top')==initial['top']
     page.locator('#draftstudy').click();page.wait_for_function('window.ATLAS_DRAFT');assert not page.evaluate('ATLAS_DRAFT.all_up_mass_known')
    elif asset in ['n','w']:
     page.locator('#cutaway').click();page.wait_for_function('FLEET.interiorReady',timeout=60000);state=page.evaluate('FLEET.inspect()');assert state['visibleInteriorMeshes']>0 and state['clippedExteriorMeshes']>0;item['cutaway']=state;page.locator('#cutaway').click()
    elif asset=='d':
     page.evaluate('FLEET.pose(1)');state=page.evaluate('FLEET.inspect()');assert state['bay'][1]<-20 and state['chase'][1]<-20;item['final']=state
    else:assert page.locator('#play').is_disabled()
    shadererrors=[s for s in console if any(k in s for k in ['THREE.WebGL','Shader Error','VALIDATE_STATUS','GL_INVALID'])];item['shader_errors']=shadererrors
    assert not errors,errors;assert not bad,bad;assert not shadererrors,shadererrors;item['passed']=True
   except Exception as e:
    item['exception']=str(e);item['console']=console
    try:page.screenshot(path=str(OUT/f'{device}_{asset}_ERROR.png'));item['body']=page.locator('body').inner_text()[:5000]
    except:pass
   report['tests'].append(item);(OUT/'validation.json').write_text(json.dumps(report,indent=2));page.close();print(json.dumps(item),flush=True)
   if not item['passed']:browser.close();raise SystemExit('Verification failed; diagnostics saved')
 browser.close()
report['passed']=len(report['tests'])==10 and all(t['passed'] for t in report['tests']);(OUT/'validation.json').write_text(json.dumps(report,indent=2))
