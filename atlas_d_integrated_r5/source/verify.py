"""Browser checks of the shipped geometry/controls, not a safety validation."""
from pathlib import Path
import os,json,time
from playwright.sync_api import sync_playwright
URL=os.getenv('BASE_URL','http://127.0.0.1:8785/')
OUT=Path(os.getenv('REVIEW_DIR','/tmp/atlas5/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':URL,'physical_iPhone_test':False,'engineering_validation':False,'tests':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for label,w,h in [('desktop',1500,960),('phone',430,932)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
  page=ctx.new_page();errors=[];failures=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('requestfailed',lambda req:failures.append({'url':req.url,'failure':req.failure}) if any(x in req.url for x in ['ATLAS_D_R5.glb','runtime.js','viewer.js','style.css']) else None)
  start=time.monotonic();res=page.goto(URL,wait_until='domcontentloaded',timeout=90000)
  confirm=False
  if 'One more step' in page.locator('body').inner_text():
   confirm=True;page.get_by_role('button',name='Open the page',exact=True).click()
  page.wait_for_function('window.ATLAS_R5?.ready',timeout=90000)
  page.wait_for_function('window.ATLAS_R5.report?.revision===5',timeout=30000)
  states=[]
  for name,v,t in [('surface','hero',0),('halfway','hero',.3),('stowed','hero',.62),('profile','profile',0),('aft','aft',0),('canopy','canopy',.29),('mast','mast',.2),('terraces','terraces',.35),('submerged','hero',1)]:
   page.evaluate('([v,p])=>{ATLAS_R5.pose(p);ATLAS_R5.setView(v)}',[v,t]);page.wait_for_timeout(550)
   states.append(page.evaluate('ATLAS_R5.inspect()'))
   page.screenshot(path=str(OUT/f'{label}_{name}.png'),timeout=60000)
  assert abs(states[2]['canopy'][0]+5.2)<.002
  assert abs(states[2]['mast'][1]-9.74)<.002
  assert abs(states[2]['depth'])<.0001
  assert states[-1]['depth']==26
  page.locator('#reset').click();page.locator('#compare').click();assert abs(page.evaluate('ATLAS_R5.progress')-.62)<.001
  page.locator('#compare').click();assert page.evaluate('ATLAS_R5.progress')==0
  page.locator('#core').click();page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'{label}_core.png'))
  page.locator('#core').click();page.locator('#bays').click();page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'{label}_bays.png'))
  page.locator('#bays').click();page.locator('#reset').click()
  page.evaluate('ATLAS_R5.pose(.61)');page.locator('#convert').click();page.wait_for_function('!ATLAS_R5.playing',timeout=7000)
  assert abs(page.evaluate('ATLAS_R5.progress')-.62)<.001
  assert not errors,errors
  assert not failures,failures
  item={'label':label,'http_status':res.status,'host_confirmation_required':confirm,'elapsed_test_seconds':round(time.monotonic()-start,2),'poses':states,'errors':errors,'asset_failures':failures,'controls':['convert stops above water','before/stowed same camera','timeline','pressure core','stowage inspection','reset'],'passed':True}
  report['tests'].append(item);ctx.close()
 browser.close()
report['passed']=True;(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
