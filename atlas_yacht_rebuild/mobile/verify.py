"""Native touch/mobile product checks; public responses are never substituted."""
from pathlib import Path
import os,json,time,hashlib,traceback
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent.parent;OUT=Path(os.environ.get('REVIEW_DIR','/tmp/atlas-mobile-review'));OUT.mkdir(exist_ok=True,parents=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8931/index.html');PUBLIC=URL.startswith('https:')
report={'source':os.environ.get('GITHUB_SHA'),'url':URL,'public':PUBLIC,'passed':False,'physicalDevice':False,'SafariVerified':False,'FPSClaim':False,'layouts':[]}
files=['index.html','style.css','app.js','physics.js','model.js','mobile.js','mobile.css','vendor/runtime.js']
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['browser']=b.version
 for name,w,h in [('portrait',390,844),('small-phone',375,667),('landscape',844,390),('desktop',1440,960)]:
  mobile=name!='desktop';ctx=b.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,device_scale_factor=3 if mobile else 1)
  p=ctx.new_page();p.set_default_timeout(45000);row={'name':name,'viewport':[w,h],'touch':mobile,'passed':False,'checks':[],'pageErrors':[],'bindings':{},'networkFailures':[]};report['layouts'].append(row)
  p.on('pageerror',lambda e:row['pageErrors'].append(str(e)));p.on('requestfailed',lambda req:row['networkFailures'].append({'url':req.url,'failure':req.failure}))
  def bind(res):
   if res.status!=200:return
   rel=None;req=res.request
   while req:
    for f in files:
     if urlsplit(req.url).path.endswith('/'+f):rel=f;break
    if rel:break
    req=req.redirected_from
   if rel:
    try:
     data=res.body();digest=hashlib.sha256(data).hexdigest();expected=hashlib.sha256((R/'site'/rel).read_bytes()).hexdigest()
     if digest==expected:row['bindings'][rel]=digest
     else:row.setdefault('mismatches',[]).append({'file':rel,'actual':digest,'expected':expected})
    except Exception as e:row.setdefault('responseReadErrors',[]).append(str(e))
  p.on('response',bind)
  def ck(label,condition,detail=None):
   row['checks'].append({'name':label,'passed':bool(condition),'detail':detail});assert condition,(label,detail)
  def state():return p.evaluate('ATLAS83_APP.inspect().state')
  def point(sel):
   loc=p.locator(sel);loc.scroll_into_view_if_needed();box=loc.bounding_box();assert box,sel
   ck('hittable '+sel,loc.evaluate('e=>{let r=e.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled&&(t===e||e.contains(t))}'))
   return {'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}
  def tap(sel):
   q=point(sel)
   if mobile:p.touchscreen.tap(q['x'],q['y'])
   else:p.mouse.click(q['x'],q['y'])
   p.wait_for_timeout(120)
  def pause(value):
   if state()['paused']!=value:tap('#pause')
   ck('pause state '+str(value),state()['paused']==value)
  def shot(label):
   fn=name+'-'+label+'.png';p.screenshot(path=str(OUT/fn),timeout=60000);row.setdefault('screenshots',[]).append(fn)
  def motion(seconds=1):
   start=state();wall=time.monotonic();recoveries=[]
   while state()['time']<start['time']+seconds and time.monotonic()-wall<100:
    if state()['paused']:
     notice=p.locator('#notice').inner_text();assert 'long interruption' in notice,notice
     recoveries.append(notice);assert len(recoveries)<=3;tap('#resume')
    p.wait_for_timeout(250)
   after=state();ck('ordinary host time advances',after['time']>=start['time']+seconds,{'simSeconds':after['time']-start['time'],'wallSeconds':time.monotonic()-wall,'recoveries':recoveries,'before':start,'after':after})
   return after
  try:
   p.goto(URL,wait_until='domcontentloaded',timeout=120000)
   if p.get_by_text('Open the page',exact=True).count():p.get_by_text('Open the page',exact=True).click()
   p.wait_for_function('window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE',timeout=180000)
   p.evaluate("window.__touchRows=[];for(const event of ['pointerdown','pointerup','pointercancel','input','click'])document.addEventListener(event,e=>{if(e.target.closest?.('button,input'))__touchRows.push({event,id:e.target.closest('button,input').id,trusted:e.isTrusted,pointerType:e.pointerType||null})},true)")
   init=p.evaluate('ATLAS83_APP.inspect()');row['initial']=init;ck('new yacht, engine off, original dynamics',not init['state']['engine'] and init['state']['gear']==0 and init['model']['model']=='atlas83-rebuilt-v1')
   if mobile:
    ck('mobile renderer preset is explicit lower resource configuration',init['render']['pixelRatio']==1 and init['render']['quality']=='mobile' and init['render']['shadows']==False,init['render'])
    ck('mobile UI active; camera choices tucked away',p.evaluate('ATLAS83_MOBILE.inspect().enabled && getComputedStyle(document.querySelector(".camera-nav")).display==="none"'))
    ids=['views-toggle','chart-toggle','settings-toggle','pause','engine','m-more','m-less','m-idle','port-hold','starboard-hold','midships','m-collapse','m-docking']
    targets=p.evaluate("ids=>ids.map(id=>{let e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height}})",ids);row['touchTargets']=targets
    ck('primary mobile targets at least44px and in viewport',all(t['w']>=43.9 and t['h']>=43.9 and t['x']>=-1 and t['y']>=-1 and t['x']+t['w']<=w+1 and t['y']+t['h']<=h+1 for t in targets),targets)
    for sel in ['#power','#port-hold','#starboard-hold']:ck('gesture ownership '+sel,p.locator(sel).evaluate('e=>getComputedStyle(e).touchAction')=='none')
   ck('no horizontal page overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   pause(True);shot('helm')
   if mobile:
    tap('#views-toggle');tap('[data-camera="bridge"]');ck('view selection closes sheet, actual bridge',p.evaluate('ATLAS83_APP.inspect().view==="bridge" && ATLAS83_MOBILE.inspect().sheet===null'))
    shot('bridge');tap('#views-toggle');tap('[data-camera="exterior"]')
   else:
    tap('[data-camera="bridge"]');ck('desktop bridge remains usable',p.evaluate('ATLAS83_APP.inspect().view')=='bridge');tap('[data-camera="exterior"]')
   tap('#engine');tap('[data-gear="1"]')
   if mobile:
    tap('#m-more');tap('#m-more');ck('precise power increments',abs(state()['port']-.1)<1e-8 and abs(state()['starboard']-.1)<1e-8)
    tap('#m-less');ck('precise power decrement',abs(state()['port']-.05)<1e-8);tap('#m-idle');ck('idle preserves engine',state()['port']==0 and state()['starboard']==0 and state()['engine'])
    cdp=ctx.new_cdp_session(p)
    def touches(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points});p.wait_for_timeout(90)
    a=point('#port-hold');power=p.locator('#power').bounding_box();q={'x':power['x']+power['width']*.2,'y':power['y']+power['height']/2,'id':2};one={**a,'id':1}
    touches('touchStart',[one]);ck('real touch hold turns port',state()['helm']==-1)
    touches('touchStart',[one,q]);q['x']=power['x']+power['width']*.8;touches('touchMove',[one,q]);ck('two-finger power drag preserves held steering',state()['helm']==-1 and state()['port']>.45,state())
    touches('touchCancel',[]);ck('trusted touch cancel clears helm',state()['helm']==0)
    a=point('#starboard-hold');touches('touchStart',[{**a,'id':3}]);touches('touchMove',[{'x':30,'y':h*.45,'id':3}]);ck('drag outside uses pointer capture',state()['helm']==1);touches('touchEnd',[]);ck('release outside centers helm',state()['helm']==0)
    tap('#m-docking');ck('dock sheet opens without page zoom/overflow',p.evaluate('ATLAS83_MOBILE.inspect().sheet')=='docking');tap('[data-close="docking"]')
   else:
    power=p.locator('#power').bounding_box();p.mouse.click(power['x']+power['width']*.7,power['y']+power['height']/2)
   pause(False);after=motion(1.2);ck('actual propulsion produces movement',after['forwardMps']>.01)
   tap('#chart-toggle');ck('live chart remains unpaused',not state()['paused']);motion(.25);tap('[data-close="chart"]')
   pause(True);frozen=state();p.wait_for_timeout(400);ck('pause freezes full dynamics',state()==frozen)
   if mobile:
    tap('#m-collapse');ck('hide controls retains navigation and resume',p.evaluate('ATLAS83_MOBILE.inspect().collapsed && getComputedStyle(document.getElementById("helm")).display==="none"'));shot('clear-view');tap('#m-open-controls');ck('restore helm does not resume',state()['paused'] and not p.evaluate('ATLAS83_MOBILE.inspect().collapsed'))
   tap('#settings-toggle');p.locator('#quality').select_option('balanced');ck('quality changes only renderer configuration',p.evaluate('ATLAS83_APP.inspect().render.shadows') and state()==frozen)
   p.locator('#quality').select_option('mobile' if mobile else 'balanced');tap('[data-close="settings"]')
   if name=='portrait':
    before=state();p.set_viewport_size({'width':844,'height':390});p.wait_for_timeout(350);ck('rotation preserves epoch, power, time and clears steering',state()['epoch']==before['epoch'] and state()['time']==before['time'] and state()['port']==before['port'] and state()['helm']==0);ck('rotated helm in bounds',p.locator('#helm').evaluate('e=>{let r=e.getBoundingClientRect();return r.right<=innerWidth+1&&r.bottom<=innerHeight+1}'));shot('rotated');p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(250)
   tap('#resume');motion(.35);pause(True)
   tap('#settings-toggle');tap('#reset');ck('reset retains model and safe engine state',not state()['engine'] and state()['port']==0 and state()['helm']==0);tap('[data-close="settings"]')
   events=p.evaluate('__touchRows');row['events']=events
   if mobile:ck('trusted touchscreen input actually observed',sum(e.get('pointerType')=='touch' and e['trusted'] for e in events)>20)
   ck('eight served resources exactly match candidate',all(f in row['bindings'] for f in files),[f for f in files if f not in row['bindings']])
   ck('no application page errors',not row['pageErrors'],row['pageErrors']);row['final']=p.evaluate('ATLAS83_APP.inspect()');row['passed']=True
  except Exception as e:
   row['error']=str(e);row['traceback']=traceback.format_exc()
   try:row['failureState']=p.evaluate('({app:window.ATLAS83_APP?.inspect(),ui:window.ATLAS83_MOBILE?.inspect()})');shot('FAILURE')
   except Exception:pass
  finally:ctx.close();(OUT/'browser.json').write_text(json.dumps(report,indent=2))
 b.close()
report['passed']=all(x['passed'] for x in report['layouts']);(OUT/'browser.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'layouts':[{k:x.get(k) for k in ['name','passed','error']} for x in report['layouts']]},indent=2));assert report['passed'],'Mobile operation gate failed'
