"""Actual new-yacht browser checks; no substituted responses or accelerated simulation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlsplit
import os,json,time,hashlib,traceback
ROOT=Path(__file__).resolve().parent; OUT=Path(os.environ.get('REVIEW_DIR',str(ROOT/'evidence')));OUT.mkdir(exist_ok=True,parents=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8928/index.html');public=URL.startswith('https:');report={'url':URL,'source':os.environ.get('GITHUB_SHA'),'public':public,'passed':False,'physicalDevice':False,'seaTrial':False,'layouts':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['browser']=b.version
 for name,w,h in [('desktop',1440,960),('portrait',390,844),('landscape',844,390)]:
  c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=name!='desktop');p=c.new_page();p.set_default_timeout(45000)
  row={'layout':name,'passed':False,'checks':[],'errors':[],'consoleErrors':[],'bindings':{}};report['layouts'].append(row)
  p.on('pageerror',lambda e:row['errors'].append(str(e)))
  p.on('console',lambda m:row['consoleErrors'].append(m.text) if m.type=='error' else None)
  def bind(r):
   rel='vendor/runtime.js' if r.url.endswith('/vendor/runtime.js') else urlsplit(r.url).path.rsplit('/',1)[-1]
   if rel in ['index.html','style.css','physics.js','model.js','app.js','vendor/runtime.js'] and r.status==200:
    try:
     raw=r.body();expected=(ROOT/'site'/rel).read_bytes()
     if raw==expected:row['bindings'][rel]=hashlib.sha256(raw).hexdigest()
    except Exception as e:row.setdefault('responseReadErrors',[]).append(str(e))
  p.on('response',bind)
  def state():return p.evaluate('ATLAS83_APP.inspect()')
  def check(n,ok,detail=None):
   row['checks'].append({'name':n,'passed':bool(ok),'detail':detail});assert ok,n
  def resume():
   if state()['state']['paused']:
    row.setdefault('visibleResumeActions',0);row['visibleResumeActions']+=1;p.locator('#resume').click();p.wait_for_function('!ATLAS83_APP.inspect().state.paused')
  def shot(label):
   if not state()['state']['paused']:p.locator('#pause').click()
   p.screenshot(path=str(OUT/(name+'-'+label+'.png')),timeout=60000)
  try:
   p.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if p.get_by_text('Open the page',exact=True).count():p.get_by_text('Open the page',exact=True).click()
   p.wait_for_function('window.ATLAS83_APP?.ready || !document.getElementById("retry").hidden',timeout=120000)
   check('new yacht scene ready',p.evaluate('!!window.ATLAS83_APP?.ready'),p.locator('#loading').inner_text())
   initial=state();row['initial']=initial
   check('new model, no Bay or iframe or old human',initial['model']['model']=='atlas83-rebuilt-v1' and not initial['model']['priorModelUsed'] and p.locator('iframe').count()==0 and not p.evaluate('!!window.BAYPLAY'))
   check('first view exterior with engines off',initial['view']=='exterior' and initial['state']['engine'] is False)
   check('substantial original geometry',initial['model']['meshes']>150 and initial['model']['triangles']>15000,initial['model'])
   check('no overflow',p.evaluate('document.documentElement.scrollWidth')<=w+1)
   check('six delivered app files match source',len(row['bindings'])==6,sorted(row['bindings']))
   check('engine and pause controls hittable',p.locator('#engine').evaluate('e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")===e;}') and p.locator('#pause').is_visible())
   shot('exterior');resume()
   p.locator('#engine').click();p.locator('[data-gear="1"]').click();power=p.locator('#power').bounding_box();p.mouse.click(power['x']+power['width']*.79,power['y']+power['height']/2)
   check('native engine, gear and power applied',state()['state']['engine'] and state()['state']['gear']==1 and state()['state']['port']>.5)
   before=state()['state'];begin=time.monotonic();p.wait_for_function('ATLAS83_APP.inspect().state.time>'+str(before['time']+2)+' && ATLAS83_APP.inspect().state.speedKnots>.02',timeout=60000);after=state()['state'];row['motion']={'before':before,'after':after,'wallSeconds':time.monotonic()-begin,'acceleratedSteps':False}
   check('ordinary-loop powered movement',after['x']>before['x'] and after['time']>before['time'])
   helm=p.locator('#helm-input').bounding_box();p.mouse.click(helm['x']+helm['width']*.86,helm['y']+helm['height']/2);p.wait_for_function('ATLAS83_APP.inspect().state.rudder>.01');check('rate-limited rudder responds',state()['state']['helm']>.1 and state()['state']['rudder']>0)
   p.locator('#pause').click();paused=state()['state'];p.wait_for_timeout(900);check('pause freezes numerical vessel state',state()['state']==paused);p.locator('#resume').click();p.wait_for_function('ATLAS83_APP.inspect().state.time>'+str(paused['time']));check('native resume advances',not state()['state']['paused'])
   p.locator('#chart-toggle').click();t=state()['state']['time'];p.wait_for_function('ATLAS83_APP.inspect().state.time>'+str(t));check('chart does not pause',not state()['state']['paused']);p.locator('[data-close="chart"]').click()
   for view in ['bridge','stern','foredeck','top']:
    p.locator('[data-camera="'+view+'"]').click();check('camera '+view,state()['view']==view);shot(view)
   p.locator('[data-camera="exterior"]').click();p.locator('#settings-toggle').click();p.locator('#sea').select_option('2');p.locator('#light').select_option('sunset');p.locator('[data-close="settings"]').click();shot('evening');
   p.locator('#hide-ui').click();check('clean-view toggle',p.locator('#show-ui').is_visible());p.locator('#show-ui').click();check('controls restored',p.locator('#engine').is_visible())
   p.locator('#settings-toggle').click();p.locator('#reset').click();check('reset stops propulsion and returns origin',state()['state']['engine'] is False and state()['state']['epoch']==1 and state()['state']['x']==0)
   check('no page or shader errors',not row['errors'] and not row['consoleErrors'],row['consoleErrors'])
   row['final']=state();row['passed']=True
  except Exception as e:
   row['error']=str(e);row['traceback']=traceback.format_exc()
   try:p.screenshot(path=str(OUT/(name+'-FAILURE.png')),timeout=30000)
   except Exception:pass
  finally:c.close();(OUT/'browser.json').write_text(json.dumps(report,indent=2))
 b.close()
report['passed']=all(x['passed'] for x in report['layouts']);(OUT/'browser.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert report['passed'],'Rebuild browser checks failed'
