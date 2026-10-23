"""Native mobile gunnery + fleet regression; actual served bytes, no response substitution."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import os,json,hashlib,time,traceback,re
R=Path(__file__).resolve().parent;OUT=Path(os.environ.get('REVIEW_DIR','/tmp/gunnery-review'));OUT.mkdir(exist_ok=True,parents=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8933/index.html');base=urlsplit(URL);root=base.path.rsplit('/',1)[0]+'/'
expected=json.loads((R/'site/BUILD.json').read_text())['files'];report={'url':URL,'sourceSHA':os.environ.get('GITHUB_SHA'),'public':URL.startswith('https:'),'passed':False,'physicalDevice':False,'layouts':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);report['browser']=browser.version
 try:
  for name,w,h in [('portrait',390,844),('small-phone',375,667),('landscape',844,390),('desktop',1440,960)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=True,is_mobile=name!='desktop');p=ctx.new_page();p.set_default_timeout(45000);cdp=ctx.new_cdp_session(p)
   row={'name':name,'checks':[],'pageErrors':[],'consoleErrors':[],'bindings':{},'appErrors':[],'responses':[],'recoveries':[],'passed':False};report['layouts'].append(row)
   p.on('pageerror',lambda e:row['pageErrors'].append(str(e)))
   p.on('console',lambda m:row['consoleErrors'].append(m.text) if m.type=='error' else None)
   def received(response):
    chain=[];req=response.request
    while req:chain.append(req.url);req=req.redirected_from
    found=None
    for u in chain:
     q=urlsplit(u)
     if q.netloc==base.netloc and q.path.startswith(root) and q.path[len(root):] in expected:found=q.path[len(root):];break
    main=response.request.is_navigation_request() and response.frame==p.main_frame
    if not found and not main:return
    e={'url':response.url,'chain':chain,'resource':found,'main':main,'status':response.status};row['responses'].append(e)
    if response.status!=200:
     if found and response.status>=400:row['appErrors'].append(e.copy())
     return
    try:
     data=response.body();e.update(sha256=hashlib.sha256(data).hexdigest(),bytes=len(data))
     if main:(OUT/(name+'-document-'+str(len(row['responses']))+'.html')).write_bytes(data)
     if found and e['sha256']==expected[found]:row['bindings'][found]=e['sha256'];e['classification']='exact-app'
     elif main and b'Open the page' in data:e['classification']='hosting-notice'
     elif found:row['appErrors'].append(e.copy())
    except Exception as ex:
     if found:row['appErrors'].append({'error':str(ex),'resource':found})
   p.on('response',received)
   def ck(label,value,data=None):row['checks'].append({'label':label,'pass':bool(value),'data':data});assert value,label
   def state():return p.evaluate('ATLAS83_APP.inspect().state')
   def g():return p.evaluate('ATLAS_GUNNERY.inspect()')
   def ready(warship=True):
    for _ in range(2):
     n=p.get_by_text('Open the page',exact=True)
     if not n.count():break
     assert n.is_visible();row.setdefault('hostingNotices',[]).append(p.url)
     with p.expect_navigation(wait_until='domcontentloaded',timeout=120000):n.click()
    p.wait_for_function('(window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE) || (document.getElementById("retry") && !document.getElementById("retry").hidden)',timeout=180000)
    assert p.locator('#loading').is_hidden(),p.locator('#loading').inner_text()
    if warship:p.wait_for_function('!!window.ATLAS_GUNNERY',timeout=15000)
    ck('active document exact bytes',any(e['url']==p.url and e.get('sha256')==expected['index.html'] for e in row['responses']))
   def tap(selector):
    e=p.locator(selector);e.scroll_into_view_if_needed();b=e.bounding_box();assert b,selector
    ck('reachable '+selector,e.evaluate('e=>{const r=e.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled&&(t===e||e.contains(t));}'))
    p.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);p.wait_for_timeout(100)
   def resume():
    if state()['paused']:
     row['recoveries'].append(p.evaluate('ATLAS83_APP.inspect().pauseReason'))
     tap('#g-resume' if g()['mode'] else '#pause')
   def motion(t):
    resume();start=state()['time'];deadline=time.monotonic()+100;n=0
    while state()['time']<start+t and time.monotonic()<deadline:
     if state()['paused']:
      assert 'interruption' in p.evaluate('ATLAS83_APP.inspect().pauseReason');n+=1;assert n<=3;resume()
     p.wait_for_timeout(150)
    ck('ordinary simulation advances',state()['time']>=start+t)
   def startHold(selector,ident=11):
    b=p.locator(selector).bounding_box();assert b
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':ident}]})
   def release(cancel=False):cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]});p.wait_for_timeout(80)
   def shootOnce():
    resume();startHold('#g-fire');p.wait_for_timeout(50);release()
   try:
    p.goto(URL+'?vessel=warship',wait_until='domcontentloaded',timeout=120000);ready()
    ck('correct warship and three gun mounts',p.evaluate('ATLAS83_APP.inspect().vesselId')=='warship' and g()['gunMeshes']==3 and g()['sourceMountHidden'])
    tap('#guns-toggle');ck('range is live and helm hidden',g()['mode'] and p.locator('#helm').is_hidden())
    ck('five floating targets',len(g()['targets'])==5);ck('no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    resume();tap('#g-center');shootOnce();ck('one tap fires one shot',g()['shots']==1 and not g()['holding']);motion(.9)
    ck('cannon shot resolves as real target hit',g()['hits']==1 and g()['destroyed']==1 and g()['targets'][0]['hp']==0,g())
    # Native aim drag downwards produces a sea miss rather than an unconditional hit.
    b=p.locator('#g-aim').bounding_box();x=b['x']+b['width']/2;y=b['y']+b['height']/2
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':12}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+32,'id':12}]});release()
    ck('native drag changes elevation',g()['elevation']<-5);shootOnce();motion(.9)
    ck('off-target shot splashes, does not inflate score',g()['hits']==1 and any(e['type']=='impact' and e['kind']=='splash' for e in g()['events']))
    if not state()['paused']:tap('#pause')
    frozen=state();before=g()['shots'];startHold('#g-fire');release();p.wait_for_timeout(400)
    ck('paused fire blocked and host exactly frozen',g()['shots']==before and state()==frozen and not g()['holding']);tap('#g-resume');motion(.2);ck('resume does not auto-fire',g()['shots']==before)
    tap('[data-gun="1"]');tap('#g-center');resume();before=g()['shots'];startHold('#g-fire');motion(1.6);release(True)
    ck('port gun repeats while held',g()['shots']>=before+2);ck('touchcancel cancels held trigger',not g()['holding'] and g()['firePointer'] is None)
    stopped=g()['shots'];motion(.8);ck('no shots after cancellation',g()['shots']==stopped);ck('port hits accounted',g()['targets'][3]['hp']<100)
    tap('[data-gun="2"]');tap('#g-center');prior=g()['hits'];shootOnce();motion(.9);ck('starboard gun hits its own target',g()['hits']>prior and g()['targets'][4]['hp']<100)
    row['rangeAfterFire']=g();row['shipAfterFire']=state();p.screenshot(path=str(OUT/(name+'-gunnery.png')),timeout=60000)
    # Capture release outside and rotation do not latch a trigger.
    resume();startHold('#g-fire');cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':10,'y':15,'id':11}]});release();ck('drag-off release clears fire',not g()['holding'])
    if name=='portrait':
     startHold('#g-fire');p.set_viewport_size({'width':844,'height':390});p.wait_for_timeout(500);release();ck('rotation cancels fire without leaving mode',g()['mode'] and not g()['holding']);p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(300)
    tap('#g-reset');ck('range reset clears score and restores target health',g()['shots']==0 and g()['hits']==0 and all(t['hp']==100 for t in g()['targets']))
    tap('#g-exit');ck('return to sailing controls',not g()['mode'] and p.locator('#helm').is_visible());resume();tap('#engine');tap('[data-gear="1"]')
    if name!='desktop':
     for _ in range(4):tap('#m-more')
    else:p.locator('#power').fill('30');p.locator('#power').dispatch_event('input')
    motion(.5);ck('warship still sails after gunnery',state()['engine'] and state()['forwardMps']>0)
    tap('.brand')
    with p.expect_navigation(wait_until='domcontentloaded',timeout=120000):tap('#select-yacht')
    ready(False);ck('yacht remains unarmed and clean',p.evaluate('ATLAS83_APP.inspect().vesselId==="yacht" && !window.ATLAS_GUNNERY') and not p.locator('#guns-toggle').count() and not state()['engine'])
    needed=[n for n in expected if n!='README.md'];ck('all app assets match served source',all(n in row['bindings'] for n in needed),list(row['bindings']))
    ck('no application or shader errors',not row['pageErrors'] and not row['appErrors'] and not [e for e in row['consoleErrors'] if 'Shader' in e],{'page':row['pageErrors'],'bytes':row['appErrors'],'console':row['consoleErrors']})
    row['passed']=True
   except Exception as ex:
    row['error']=str(ex);row['traceback']=traceback.format_exc()
    try:row['failure']=p.evaluate('({host:window.ATLAS83_APP?.inspect?.(),guns:window.ATLAS_GUNNERY?.inspect?.(),loading:document.getElementById("loading")?.innerText})');p.screenshot(path=str(OUT/(name+'-FAILURE.png')),timeout=60000)
    except Exception:pass
    raise
   finally:(OUT/'browser.json').write_text(json.dumps(report,indent=2));ctx.close()
  report['passed']=all(x['passed'] for x in report['layouts'])
 finally:(OUT/'browser.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'layouts':[x['name'] for x in report['layouts']]}))
