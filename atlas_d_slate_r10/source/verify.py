"""Public/local browser checks of the actual GLB. Not engineering qualification."""
import os,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.getenv('BASE_URL','http://127.0.0.1:8810/index.html');O=Path(os.getenv('REVIEW_DIR','/tmp/atlas10/review'));O.mkdir(parents=True,exist_ok=True)
result={'url':URL,'passed':False,'physical_phone_test':False,'engineering_validated':False,'tests':[]}
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--ignore-gpu-blocklist','--use-gl=angle','--use-angle='+os.getenv('ANGLE','swiftshader'),'--enable-unsafe-swiftshader']}
 if os.getenv('CHROMIUM_PATH'):kw['executable_path']=os.environ['CHROMIUM_PATH']
 browser=p.chromium.launch(**kw)
 for label,w,h in [('desktop',1600,1000),('phone',430,932)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=label=='phone',has_touch=label=='phone');page=ctx.new_page();errors=[];failures=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:failures.append([r.url,r.status]) if r.status>=400 and any(x in r.url for x in ['.glb','viewer.js','runtime.js','style.css','model_report.json']) else None)
  start=time.monotonic();host=False;res=None
  if os.getenv('OFFLINE_SITE'):
   import re,base64
   site=Path(os.environ['OFFLINE_SITE']);html=site.joinpath('index.html').read_text();html=re.sub(r'<script.*?</script>','',html);html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+site.joinpath('style.css').read_text()+'</style>');page.set_content(html);page.add_script_tag(content=site.joinpath('runtime.js').read_text());page.evaluate("x=>{let s=atob(x.b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);window.ATLAS_OFFLINE={buffer:a.buffer,report:x.r}}",{'b':base64.b64encode(site.joinpath('ATLAS_D_R10.glb').read_bytes()).decode(),'r':json.loads(site.joinpath('model_report.json').read_text())});page.add_script_tag(content=site.joinpath('viewer.js').read_text())
  else:res=page.goto(URL,wait_until='domcontentloaded',timeout=90000)
  if page.get_by_text('Open the page',exact=False).count():host=True;page.get_by_text('Open the page',exact=False).first.click()
  page.wait_for_function('window.ATLAS_R10?.ready || window.ATLAS_R10?.error',timeout=90000);assert page.evaluate('ATLAS_R10.ready'),[errors,failures]
  page.wait_for_function('ATLAS_R10.report?.revision===10',timeout=15000)
  record={'label':label,'viewport':[w,h],'http_status':res.status if res else None,'offline_injected':bool(os.getenv('OFFLINE_SITE')),'host_confirmation_required':host,'time_to_ready_seconds':round(time.monotonic()-start,2),'states':[]}
  def state():return page.evaluate('ATLAS_R10.inspectState()')
  def shot(name):page.wait_for_timeout(200);page.screenshot(path=str(O/(label+'_'+name+'.png')))
  shot('blue_hero');basepos=page.evaluate('ATLAS_R10.camera.position.toArray()');page.locator('[data-finish="gray"]').click();assert state()['finish']=='gray';assert basepos==page.evaluate('ATLAS_R10.camera.position.toArray()');shot('gray_hero')
  page.locator('[data-finish="blue"]').click();page.locator('[data-light="sunset"]').click();assert state()['lighting']=='sunset';shot('sunset');page.locator('[data-light="day"]').click()
  for view in ['lounge','pool','doors','tender','bow','mast','gear']:
   page.locator('[data-view="'+view+'"]').click();record['states'].append(state())
   if label=='desktop' or view=='pool':shot(view)
  page.locator('#reset').click();page.locator('[data-view="profile"]').click();shot('surface_profile');page.locator('#compare').click();assert state()['depth']==0 and abs(state()['progress']-.8)<1e-6;shot('ready_profile')
  page.evaluate('ATLAS_R10.pose(.795)');page.locator('#play').click();page.wait_for_function('!ATLAS_R10.playing',timeout=15000);assert abs(state()['progress']-.8)<1e-6
  page.evaluate('ATLAS_R10.pose(.995)');page.locator('#dive').click();page.wait_for_function('!ATLAS_R10.playing',timeout=15000)
  st=state();assert abs(st['depth']-26)<1e-4 and st['chase'][1]<-24 and st['utility'][1]<-24 and st['hullScale']==[1,1,1];record['submerged']=st;shot('submerged')
  # The chosen hull paint remains identical underwater.
  col=page.evaluate("ATLAS_R10.meshes.find(x=>x.material.name==='ATLAS | slate blue paint').material.color.getHexString()");assert col=='405a6d',col
  page.locator('#inspect').click();assert page.evaluate('ATLAS_R10.inspect');shot('garages');page.locator('#inspect').click()
  page.locator('#limits').click();assert page.locator('#notes').is_visible();page.locator('#close-notes').click();assert not page.locator('#notes').is_visible()
  page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(200);page.locator('#play').click();assert not page.evaluate('ATLAS_R10.playing');page.locator('#reset').click()
  assert not errors and not failures,[errors,failures];record.update(passed=True,errors=errors,asset_failures=failures,controls=['two hull finishes with fixed camera','daylight and golden hour','detail cameras','surface/ready','conversion stop above water','both tenders descend aboard','paint unchanged underwater','garage inspection','pause','notes dialog'])
  result['tests'].append(record);ctx.close()
 browser.close()
result['passed']=all(x['passed'] for x in result['tests']);(O/'validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
