"""Browser and selected-geometry tests. Not a diving-system safety test."""
import os,json,time,math
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('BASE_URL','http://127.0.0.1:8799/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/mnt/data/atlas_work/r9/review'));OUT.mkdir(parents=True,exist_ok=True)
result={'url':URL,'passed':False,'engineering_validated':False,'physical_phone_test':False,'tests':[]}
with sync_playwright() as p:
 kw={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROMIUM_PATH'):kw['executable_path']=os.environ['CHROMIUM_PATH']
 browser=p.chromium.launch(**kw)
 for label,w,h in [('desktop',1440,1000),('phone',430,932)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=label=='phone',has_touch=label=='phone');page=ctx.new_page();errors=[];failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:failed.append([r.url,r.status]) if r.status>=400 and any(x in r.url for x in ['.glb','lab.js','runtime.js','arrangement.json','style.css']) else None)
  confirmation=False;res=None
  if os.environ.get('OFFLINE_SITE'):
   import re,base64
   root=Path(os.environ['OFFLINE_SITE'])
   html=(root/'index.html').read_text();html=re.sub(r'<script[^>]*src=[^>]*></script>','',html)
   html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
   page.set_content(html)
   page.add_script_tag(content=(root/'runtime.js').read_text())
   page.evaluate('(x)=>{window.ATLAS_OFFLINE=x}',{'report':json.loads((root/'arrangement.json').read_text()),'glb':base64.b64encode((root/'ATLAS_D_R9.glb').read_bytes()).decode()})
   page.add_script_tag(content="window.fetch=async()=>({ok:true,json:async()=>ATLAS_OFFLINE.report}); ATLASRuntime.GLTFLoader.prototype.load=function(url,done,progress,error){const s=atob(ATLAS_OFFLINE.glb),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);this.parse(b.buffer,'',done,error)};")
   page.add_script_tag(content=(root/'lab.js').read_text())
  else:res=page.goto(URL,wait_until='domcontentloaded',timeout=90000)
  if page.get_by_text('Open the page',exact=False).count():confirmation=True;page.get_by_text('Open the page',exact=False).first.click(timeout=15000)
  page.wait_for_function('window.ATLAS_R9?.ready || window.ATLAS_R9?.error',timeout=90000)
  start=page.evaluate('({ready:ATLAS_R9.ready,error:ATLAS_R9.error})');assert start['ready'],[start,errors,failed]
  rep=page.evaluate('ATLAS_R9.report');assert rep['revision']==9 and not rep['engineering_validated'];assert all(x['fits_candidate_bore'] for x in rep['recovery_hardware_checks'])
  assert all(x['cylindrical_barrel_screen_passed'] for x in rep['axial_insertion_screens']);assert abs(rep['pool_revision']['vertical_envelope_clearance_m']-.3)<1e-4
  record={'label':label,'viewport':[w,h],'http_status':res.status if res else None,'offline_injected':bool(os.environ.get('OFFLINE_SITE')),'host_confirmation_required':confirmation,'modes':[]}
  for mode in ['exterior','upper','lower','garages','pool','recovery','buoyancy']:
   page.locator('[data-mode="'+mode+'"]').click();page.wait_for_timeout(250)
   if mode=='recovery':page.evaluate('ATLAS_R9.pose(.225)');page.wait_for_timeout(150)
   state=page.evaluate('ATLAS_R9.inspect()');assert state['roomFit'] and state['carrierFit'] and state['tenderFit'];assert state['mainScale']==[1,1,1];record['modes'].append(state)
   if label=='desktop' or mode in ['exterior','upper','garages']:page.screenshot(path=str(OUT/f'{label}_{mode}.png'))
  if label=='phone':page.locator('#details').click()
  page.locator('#example').click();assert page.locator('#net').inner_text()=='+83.8 t'
  page.locator('#loss').select_option('1');assert abs(page.evaluate('ATLAS_R9.calc(3300,1)')+187.0482976102042)<.02
  if label=='phone':page.locator('#details').click()
  page.locator('[data-mode="garages"]').click();page.locator('#legacy').click();assert page.evaluate('ATLAS_R9.legacy')
  page.wait_for_timeout(150)
  if label=='desktop':page.screenshot(path=str(OUT/'desktop_previous_carriers.png'))
  page.locator('#legacy').click();assert not page.evaluate('ATLAS_R9.legacy')
  page.locator('[data-mode="exterior"]').click();page.evaluate('ATLAS_R9.pose(.799)');page.locator('#play').click();page.wait_for_function('!ATLAS_R9.playing',timeout=15000);assert abs(page.evaluate('ATLAS_R9.progress')-.8)<1e-6
  page.screenshot(path=str(OUT/f'{label}_stowed.png'))
  page.evaluate('ATLAS_R9.pose(.999)');page.locator('#dive').click();page.wait_for_function('!ATLAS_R9.playing',timeout=15000)
  # Both stored craft share the vessel descent. No tenders remain at the surface.
  poses=page.evaluate('''()=>{const a=ATLAS_R9,m=a.model;const pos=n=>{let o=m.getObjectByName(n),v=o.position.clone();o.getWorldPosition(v);return v.toArray()};return {depth:-a.vessel.position.y,chase:pos('MOV_Tender_Chase'),utility:pos('MOV_Tender_Utility'),coreScale:m.getObjectByName('ENG_Pressure').scale.toArray()}}''')
  assert abs(poses['depth']-26)<1e-4 and poses['chase'][1]<-24 and poses['utility'][1]<-24;assert poses['coreScale']==[1,1,1];record['submerged_poses']=poses
  page.locator('#reset').click();assert page.evaluate('ATLAS_R9.progress')==0
  assert not errors and not failed,[errors,failed];record.update(passed=True,errors=errors,asset_failures=failed,controls=['inspection tabs','previous/new carrier overlay','above-water stop','timeline','full dive','fixed dry-room layout','gross-buoyancy sensitivity'])
  result['tests'].append(record);ctx.close()
 browser.close()
result['passed']=all(x['passed'] for x in result['tests']);(OUT/'validation.json').write_text(json.dumps(result,indent=2));print('Passed',URL)
