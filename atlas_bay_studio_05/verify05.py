"""Actual browser tests. Never inject local models into a public verification."""
import os,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ['BASE_URL'];OUT=Path(os.environ.get('REVIEW_DIR','/tmp/bay05/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'offline_injected':False,'physical_phone_test':False,'engineering_validated':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  for asset in ['bay','n','w','d','chase']:
   page=browser.new_page(viewport={'width':size[0],'height':size[1]});errs=[];bad=[]
   page.on('pageerror',lambda e:errs.append(str(e)))
   page.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 and any(z in r.url for z in ['.glb','.js','.json','.css']) else None)
   item={'device':device,'asset':asset,'passed':False,'errors':errs,'asset_failures':bad}
   try:
    start=time.time();r=page.goto(BASE+'?v='+asset,wait_until='domcontentloaded',timeout=60000);item['http_status']=r.status
    page.wait_for_function("document.querySelector('#scene')||/open the page/i.test(document.body.innerText)",timeout=20000)
    gate=page.get_by_text('Open the page',exact=False);item['host_confirmation_required']=gate.count()>0
    if gate.count():gate.first.click()
    page.wait_for_function('window.FLEET?.ready||window.FLEET_ERROR',timeout=90000);assert page.evaluate('window.FLEET_ERROR') is None
    item['initial']=page.evaluate('FLEET.inspect()');assert item['initial']['asset']==asset;item['ready_seconds']=round(time.time()-start,2)
    page.wait_for_timeout(250);page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
    if asset=='bay':
     assert item['initial']['topRodHolders']==6
     assert page.evaluate("(()=>{let n=0;FLEET.model.traverse(x=>{if((x.name.endsWith('NEW_TTOP_HOLDER_PORT')||x.name.endsWith('NEW_TTOP_HOLDER_STARBOARD')))n++});return n})()") == 2
     for name in ['Rod rack','Deck hardware','Seating']:
      page.locator('[data-view="'+name+'"]').click();page.wait_for_timeout(180);page.screenshot(path=str(OUT/f'{device}_bay_{name.lower().replace(" ","_")}.png'))
     before=page.evaluate('[...FLEET.camera.position.toArray(),...FLEET.controls.target.toArray()]');page.locator('#baycompare').click();page.wait_for_function('FLEET.ready&&FLEET.inspect().previousBay');assert page.evaluate('FLEET.inspect().topRodHolders')==4
     after=page.evaluate('[...FLEET.camera.position.toArray(),...FLEET.controls.target.toArray()]');assert max(abs(a-b) for a,b in zip(before,after))<.0001
     page.locator('#baycompare').click();page.wait_for_function('FLEET.ready&&!FLEET.inspect().previousBay');page.locator('#draftstudy').click();page.wait_for_function('window.ATLAS_DRAFT')
     assert page.evaluate('ATLAS_DRAFT.all_up_mass_known')==False;assert page.locator('#massinput').input_value()==''
     page.locator('#massinput').fill('1800');assert '14.' in page.locator('#draftresults').inner_text();assert '11.' in page.locator('#draftresults').inner_text()
     item['draft_example_1800kg']=page.locator('#draftresults').inner_text();page.screenshot(path=str(OUT/f'{device}_bay_draft_study.png'))
     page.locator('#inspectshallow').click();page.wait_for_function('FLEET.ready&&FLEET.inspect().shallowBay');page.wait_for_timeout(400)
     item['study']=page.evaluate('FLEET.inspect()');page.screenshot(path=str(OUT/f'{device}_bay_shallow_underbody.png'));assert 'UNVALIDATED' in page.locator('#subtitle').inner_text()
     page.locator('#hullstudy').click();page.wait_for_function('FLEET.ready&&!FLEET.inspect().shallowBay');page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(500);assert page.evaluate('FLEET.progress')>0;page.locator('#play').click();assert not page.evaluate('FLEET.playing')
     page.evaluate('FLEET.pose(.25)');assert page.evaluate('FLEET.inspect().topRodHolders')==6
    elif asset in ['n','w']:
     page.locator('#cutaway').click();page.wait_for_function('FLEET.interiorReady',timeout=60000);x=page.evaluate('FLEET.inspect()');assert x['visibleInteriorMeshes']>0 and x['clippedExteriorMeshes']>0
     item['cutaway']=x;page.locator('#cutaway').click();assert not page.evaluate('FLEET.inspect().cutaway')
    elif asset=='d':
     page.evaluate('FLEET.pose(1)');x=page.evaluate('FLEET.inspect()');assert x['bay'][1]<-20 and x['chase'][1]<-20;item['final']=x
    else:assert page.locator('#play').is_disabled()
    assert not errs,errs;assert not bad,bad;item['passed']=True
   except Exception as e:
    item['exception']=str(e)
    try:page.screenshot(path=str(OUT/f'{device}_{asset}_ERROR.png'));item['body']=page.locator('body').inner_text()[:3000]
    except Exception:pass
   report['tests'].append(item);(OUT/'validation.json').write_text(json.dumps(report,indent=2));page.close()
   print(json.dumps(item),flush=True)
   if not item['passed']:browser.close();raise SystemExit('Verification failed. Diagnostics saved.')
 browser.close()
report['passed']=len(report['tests'])==10 and all(t['passed'] for t in report['tests']);(OUT/'validation.json').write_text(json.dumps(report,indent=2))
