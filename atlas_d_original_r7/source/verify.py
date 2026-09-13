"""Browser/pose verification is not engineering validation."""
from pathlib import Path
import os,json,time
from playwright.sync_api import sync_playwright
BASE=os.getenv('BASE_URL','http://127.0.0.1:8787/index.html');OUT=Path(os.getenv('REVIEW_DIR','/tmp/atlas7/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':False,'engineering_validated':False,'physical_iPhone_test':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for label,width,height in [('desktop',1600,1000),('phone',430,932)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1);errors=[];bad=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:bad.append({'url':r.url,'error':r.failure}))
  res=page.goto(BASE,wait_until='domcontentloaded',timeout=60000);host=False
  if page.get_by_role('button',name='Open the page',exact=True).count():host=True;page.get_by_role('button',name='Open the page',exact=True).click()
  page.wait_for_function('window.ATLAS_R7?.ready === true',timeout=100000);page.wait_for_timeout(900);snapshots=[]
  def shot(name,p,view=None):
   page.evaluate('(p)=>{ATLAS_R7.pose(p)}',p)
   if view:page.evaluate('(v)=>ATLAS_R7.setView(v)',view)
   page.wait_for_timeout(240);page.screenshot(path=str(OUT/f'{label}_{name}.png'),timeout=25000);d=page.evaluate('ATLAS_R7.inspect()');snapshots.append(d);return d
  a=shot('surface',0,'hero');b=shot('ready',.8)
  assert b['depth']==0 and b['skyDrop']>6.2 and b['bridgeDrop']>4.6
  for k in ['tenderChase','tenderUtility']:assert -41<b[k][0]<-28 and abs(b[k][2])<4.5 and b[k][1]>1.25
  assert b['scaleTracks']==0 and b['mainHullVisible']
  shot('halfway',.53,'hero');shot('profile_surface',0,'profile');shot('profile_ready',.8);shot('recovery',.195,'recovery');shot('roofs',.565,'roofs');d=shot('submerged',1,'underwater')
  assert abs(d['depth']-26)<1e-5 and all(v<-24 for v in [d['tenderChase'][1],d['tenderUtility'][1]])
  assert d['mainHullScale']==[1,1,1] and d['pressureCoreScale']==[1,1,1]
  page.evaluate('ATLAS_R7.pose(.8)');page.locator('#core').click();page.wait_for_timeout(300);page.screenshot(path=str(OUT/f'{label}_bays.png'));page.locator('#core').click();page.locator('#reset').click();page.locator('#compare').click();assert abs(page.evaluate('ATLAS_R7.progress')-.8)<1e-5
  page.locator('#compare').click();assert page.evaluate('ATLAS_R7.progress')==0
  page.evaluate('ATLAS_R7.pose(.796)');page.locator('#play').click();page.wait_for_function('!ATLAS_R7.playing',timeout=15000);assert abs(page.evaluate('ATLAS_R7.progress')-.8)<1e-5
  page.locator('#timeline').fill('530');page.locator('#timeline').dispatch_event('input');assert abs(page.evaluate('ATLAS_R7.progress')-.53)<1e-5
  page.locator('#basis').click();assert page.locator('#notes').is_visible();page.locator('#close-notes').click();assert not errors,errors
  assetbad=[x for x in bad if any(n in x['url'] for n in ['ATLAS_D_Original.glb','runtime.js','viewer.js','style.css'])];assert not assetbad,assetbad
  report['tests'].append({'label':label,'viewport':[width,height],'http_status':res.status,'host_confirmation_required':host,'poses':snapshots,'errors':errors,'asset_failures':assetbad,'controls':['surface/ready fixed camera','conversion stop above water','timeline','recovery camera','shells camera','x-ray bays','design limits'],'passed':True});(OUT/'validation.json').write_text(json.dumps(report,indent=2));page.close()
 browser.close()
report['passed']=True;(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':True,'url':BASE,'tests':len(report['tests'])}))
