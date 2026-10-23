"""Real browser receipt, native vessel selection, mobile power/steer and safe restart."""
from pathlib import Path
import os,json,time,hashlib,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;OUT=Path(os.environ.get('REVIEW_DIR','/tmp/fleet-review'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8931/index.html');PUBLIC=URL.startswith('https:')
report={'url':URL,'public':PUBLIC,'sourceSHA':os.environ.get('GITHUB_SHA'),'passed':False,'physicalDevice':False,'layouts':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['browser']=browser.version
 try:
  for name,w,h in [('portrait',390,844),('landscape',844,390),('desktop',1440,960)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=True,is_mobile=name!='desktop');p=ctx.new_page();p.set_default_timeout(45000)
   row={'name':name,'passed':False,'checks':[],'pageErrors':[],'appErrors':[],'bindings':{}};report['layouts'].append(row)
   p.on('pageerror',lambda e:row['pageErrors'].append(str(e)))
   expected=json.loads((R/'site/BUILD.json').read_text())['files'];expected['index.html']=hashlib.sha256((R/'site/index.html').read_bytes()).hexdigest()
   def received(response):
    if response.status!=200:return
    req=response.request;found=None
    while req:
     path=req.url.split('?',1)[0]
     for rel in expected:
      if path.endswith('/'+rel):found=rel;break
     if found:break
     req=req.redirected_from
    if found and found!='README.md':
     try:
      b=response.body();got=hashlib.sha256(b).hexdigest()
      if got==expected[found]:row['bindings'][found]=got
      else:row['appErrors'].append({'resource':found,'sha256':got})
     except Exception as e:row['appErrors'].append(str(e))
   p.on('response',received)
   def ck(label,ok,data=None):
    row['checks'].append({'label':label,'pass':bool(ok),'data':data});assert ok,label
   def read():return p.evaluate('ATLAS83_APP.inspect()')
   def tap(sel):
    e=p.locator(sel);e.scroll_into_view_if_needed();b=e.bounding_box();assert b,sel
    ck('hittable '+sel,e.evaluate('e=>{const r=e.getBoundingClientRect(),x=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled&&(x===e||e.contains(x));}'))
    p.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);p.wait_for_timeout(180)
   def ready():
    if p.get_by_text('Open the page',exact=True).count():p.get_by_text('Open the page',exact=True).click();row['hostingNotice']=True
    p.wait_for_function('window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE',timeout=180000)
   def resume():
    if read()['state']['paused']:row.setdefault('resumeReasons',[]).append(read()['pauseReason']);tap('#pause')
   def motion(seconds):
    resume();start=read()['state']['time'];deadline=time.monotonic()+90;n=0
    while read()['state']['time']<start+seconds and time.monotonic()<deadline:
     if read()['state']['paused']:
      assert 'interruption' in read()['pauseReason'];n+=1;assert n<=4;resume()
     p.wait_for_timeout(250)
    ck('ordinary host time advances',read()['state']['time']>=start+seconds)
   def choose(v):tap('.brand');ck('native vessel chooser visible',p.locator('#fleet-dialog').is_visible());tap('#select-'+v);ready()
   try:
    p.goto(URL+'?vessel=yacht',wait_until='domcontentloaded',timeout=120000);ready()
    y=read();ck('first view is actual yacht',y['vesselId']=='yacht' and y['model']['identity']=='atlas83-rebuilt-v1',y['model'])
    ck('yacht engine off and neutral',not y['state']['engine'] and y['state']['gear']==0)
    choose('warship');s=read();row['warshipInitial']=s
    ck('actual ATLAS-W not renamed yacht',s['vesselId']=='warship' and s['model']['identity']=='atlas-w-original-surface-v1' and s['model']['sourceGitBlob']=='826f70bfaae812538aca710ab9f10a09fae70a24')
    ck('warship distinct scale and parameters',s['parameters']['length']==125 and s['model']['bounds']['max'][0]>60 and s['model']['bounds']['min'][0]<-60)
    ck('no inherited engine/power/hold',not s['state']['engine'] and s['state']['port']==0 and not s['headingHold'])
    ck('no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.screenshot(path=str(OUT/(name+'-warship.png')),timeout=60000);resume()
    tap('#engine');tap('[data-gear="1"]')
    if name!='desktop':
     for _ in range(6):tap('#m-more')
    else:
     e=p.locator('#power');b=e.bounding_box();p.touchscreen.tap(b['x']+b['width']*.6,b['y']+b['height']/2)
    motion(2);before=read()['state'];ck('warship propulsion moves',before['engine'] and before['forwardMps']>.01 and before['x']>0)
    e=p.locator('#starboard-hold');b=e.bounding_box();cdp=ctx.new_cdp_session(p)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':1}]});p.wait_for_timeout(700)
    ck('held touch steering accepted',read()['state']['helm']==1)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(200);ck('release clears steering',read()['state']['helm']==0)
    if not read()['state']['paused']:tap('#pause')
    frozen=read()['state'];p.wait_for_timeout(500);ck('exact pause freeze',read()['state']==frozen);tap('#pause');motion(.3)
    if name!='desktop':tap('#views-toggle')
    tap('[data-camera="bridge"]');ck('bridge wing camera selected',read()['view']=='bridge');p.screenshot(path=str(OUT/(name+'-bridge-wing.png')),timeout=60000);resume()
    if name!='desktop':tap('#views-toggle')
    tap('[data-camera="stern"]');ck('flight deck camera selected',read()['view']=='stern');p.screenshot(path=str(OUT/(name+'-flight-deck.png')),timeout=60000);resume()
    choose('yacht');back=read();ck('switch back restores actual yacht',back['vesselId']=='yacht' and back['model']['identity']=='atlas83-rebuilt-v1');ck('switch resets all transient controls',not back['state']['engine'] and back['state']['gear']==0 and back['state']['port']==0 and back['state']['helm']==0 and not back['headingHold'])
    if name!='desktop':tap('#m-collapse');ck('mobile helm hides',p.locator('#m-open-controls').is_visible());tap('#m-open-controls')
    ck('all required received resources match',all(x in row['bindings'] for x in ['index.html','app.js','model.js','physics.js','mobile.js','mobile.css','fleet.js','warship-physics.js','warship-asset.json','assets/ATLAS_W.glb','vendor/runtime.js']),list(row['bindings']))
    ck('no page/resource errors',not row['pageErrors'] and not row['appErrors'])
    row['passed']=True
   except Exception as e:
    row['exception']=str(e);row['traceback']=traceback.format_exc()
    try:row['failureState']=read();p.screenshot(path=str(OUT/(name+'-FAILURE.png')),timeout=60000)
    except Exception:pass
    raise
   finally:(OUT/'browser.json').write_text(json.dumps(report,indent=2));ctx.close()
  report['passed']=all(r['passed'] for r in report['layouts'])
 finally:(OUT/'browser.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'public':PUBLIC,'layouts':[x['name'] for x in report['layouts']]}))
