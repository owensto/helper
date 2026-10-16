"""Actual Y9/Y10 browser boarding, controlled loading/error, and native pause.
Network delay/failure is test-induced, never substituted owner state or assets.
No runtime stepping, DOM-event dispatch, automatic recovery, or publication.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,hashlib,traceback,platform,base64,struct
R=Path(__file__).resolve().parent; E=R/'evidence'; E.mkdir(exist_ok=True); REPO=R.parents[2]
ORIGIN='http://127.0.0.1:8924'; LAYOUT=os.environ.get('LAYOUT','portrait'); W,H=(390,844) if LAYOUT=='portrait' else (844,390)
report={'passed':False,'sourceSHA':os.environ.get('GITHUB_SHA'),'baseline':'d659b10e65c83fb671244f036c3d5fbab1d8f3bc','layout':LAYOUT,'scenarios':[],'physicalDevice':False,'browser':'Chromium, not user Brave','publicDeployment':False,'fullRecertification':False,'naturalLoadErrorObserved':False}
TRACE="""(()=>{window.__boardingTrace={events:[],states:[]};let last='';function read(){const b=document.getElementById('ad-board'),p=window.ATLAS_D_SIM;if(!b||!p)return;const s={label:b.textContent,disabled:b.disabled,hidden:b.hidden,ready:p.ready,active:p.active,error:p.error,handler:b.onclick?Function.prototype.toString.call(b.onclick):null};const k=JSON.stringify(s);if(k!==last){__boardingTrace.states.push({wall:Date.now(),...s});last=k;}};addEventListener('DOMContentLoaded',()=>{new MutationObserver(read).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden'],characterData:true});read();},{once:true});for(const name of ['pointerdown','pointerup','click'])document.addEventListener(name,e=>{const b=e.target.closest?.('#ad-board,#ad-pause');if(b)__boardingTrace.events.push({event:name,target:b.id,trusted:e.isTrusted,label:b.textContent,wall:Date.now()});},true);})();"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 report['environment']={'version':browser.version,'os':platform.platform(),'runner':os.environ.get('ImageVersion'),'softwareRendering':True,'touchEmulated':True,'viewport':[W,H]}
 try:
  for entry,mode in [('y9','baseline'),('y10','held-loading'),('y10','fail-once-retry')]:
   ctx=browser.new_context(viewport={'width':W,'height':H},has_touch=True,is_mobile=True,device_scale_factor=1)
   ctx.add_init_script(script=TRACE); page=ctx.new_page(); cdp=ctx.new_cdp_session(page); f=None; routes=[]; requests=[]
   row={'entry':entry,'mode':mode,'passed':False,'snapshots':[],'screenshots':[],'errors':[],'requestFailures':[],'binding':{}}; report['scenarios'].append(row)
   page.on('pageerror',lambda e:row['errors'].append(str(e)))
   page.on('requestfailed',lambda req:row['requestFailures'].append({'url':req.url,'failure':req.failure}))
   asset_path='**/assets/ATLAS_D_Original.glb'
   def asset_route(route):
    requests.append(route.request.url)
    if mode=='held-loading' and len(requests)==1: routes.append(route)
    elif mode=='fail-once-retry' and len(requests)==1: route.abort('failed')
    else: route.continue_()
   if mode!='baseline':page.route(asset_path,asset_route)
   def bind(response):
    prefix=ORIGIN+'/atlas_d_simulator_01/'
    if not response.url.startswith(prefix) or response.status!=200:return
    rel=response.url.split('?',1)[0][len(prefix):]
    wanted=['live/atlas-d.js','contact/y4/preview.js','contact/y9/preview.css','contact/y9/pause-recovery.js',f'contact/{entry}/preview.html','contact/y10/boarding-label.js']
    if rel in wanted:
     body=response.body();local=(REPO/'atlas_d_simulator_01'/rel).read_bytes();assert body==local,rel
     row['binding'][rel]=hashlib.sha256(body).hexdigest()
   page.on('response',bind)
   def host():return next(x for x in page.frames if '/live/index.html' in x.url)
   def snap(name):
    x=host().evaluate('''()=>{const b=document.getElementById('ad-board'),p=ATLAS_D_SIM,r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {ready:p.ready,active:p.active,error:p.error,label:b.textContent,disabled:b.disabled,hidden:b.hidden,handler:b.onclick?Function.prototype.toString.call(b.onclick):null,count:document.querySelectorAll('#ad-board').length,rect:{x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:hit===b||b.contains(hit)},paused:p.state?.paused??null,seconds:p.state?.elapsed??null};}''')
    x['name']=name;row['snapshots'].append(x);assert x['count']==1;return x
   def tap(sel,allow_disabled=False):
    loc=page.frame_locator('#host').locator(sel);b=loc.bounding_box();q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),w=e.ownerDocument.defaultView,h=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {disabled:e.disabled,hit:h===e||e.contains(h),inside:r.x>=0&&r.y>=0&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1};}''')
    assert b and q['hit'] and q['inside'],(sel,b,q);assert allow_disabled or not q['disabled'],(sel,q)
    page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);page.wait_for_timeout(400)
   def shot(name):
    data=base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False,'fromSurface':True})['data']);assert list(struct.unpack('>II',data[16:24]))==[W,H]
    fn=f'{entry}-{mode}-{name}.png';(E/fn).write_bytes(data);row['screenshots'].append(fn)
   try:
    page.goto(ORIGIN+f'/atlas_d_simulator_01/contact/{entry}/preview.html',wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function("document.getElementById('host').contentDocument?.getElementById('ad-board')",timeout=180000)
    if mode=='held-loading':
     page.wait_for_function("document.getElementById('host').contentDocument.getElementById('ad-board').textContent.startsWith('Loading')",timeout=30000)
     loading=snap('loading-request-held');assert not loading['ready'] and not loading['active'] and loading['disabled'] and loading['handler'] is None
     shot('loading-disabled');tap('#ad-board',allow_disabled=True);gated=snap('disabled-touch-no-boarding');assert not gated['active'] and not gated['ready'] and gated['disabled']
     assert len(routes)==1;routes.pop().continue_()
    if mode=='fail-once-retry':
     page.wait_for_function("document.getElementById('host').contentWindow.ATLAS_D_SIM?.error && document.getElementById('host').contentDocument.getElementById('ad-board').textContent==='Retry ATLAS D — load error'",timeout=90000)
     error=snap('actual-loader-error-test-induced');assert not error['ready'] and not error['active'] and not error['disabled'] and error['handler']=='()=>location.reload()'
     shot('error-retry');row['failedDocumentTrace']=host().evaluate('__boardingTrace');tap('#ad-board')
    page.wait_for_function("document.getElementById('host').contentWindow.ATLAS_D_SIM?.ready && window.Y4?.ready && window.Y9?.ready",timeout=180000)
    if entry=='y10':page.wait_for_function("document.getElementById('host').contentDocument.getElementById('ad-board').textContent==='Board original ATLAS D'",timeout=30000)
    ready=snap('ready-before-boarding');assert ready['ready'] and not ready['active'] and not ready['disabled'] and ready['handler'].startswith('function enter()')
    if mode=='baseline':assert ready['label'].startswith('Loading'),ready
    else:assert ready['label']=='Board original ATLAS D',ready
    owner_source=(REPO/'atlas_d_simulator_01/live/atlas-d.js').read_text();native=owner_source[owner_source.index('function enter(){'):owner_source.index('\nfunction exit(){')];assert ready['handler']==native
    row['nativeEnterSourceExact']=True;shot('ready-label');f=host();f.evaluate("window.__nativeBoardReference=document.getElementById('ad-board').onclick")
    tap('#ad-board');page.wait_for_function('Y4.latest?.physical.available',timeout=90000);entered=snap('boarded-native-handler');assert entered['active'] and entered['hidden']
    assert f.evaluate("document.getElementById('ad-board').onclick===window.__nativeBoardReference")
    x=page.evaluate('Y4.latest');assert x['sourceUnchanged'] and x['mapped']['attachment'] is None and x['mapped']['valid'] is False and len(x['rays'])==5
    assert all(r['hit'] and r['errorM']<1e-5 and r['normalError']<1e-6 for r in x['rays']);row['physicalChecks']=x['rays']
    if entered['paused']:row['startupPauseReason']=f.evaluate('ATLAS_D_SIM.state.message');tap('#ad-pause')
    assert not f.evaluate('ATLAS_D_SIM.state.paused');tap('#ad-pause');page.wait_for_function("Y9.latest?.reason==='manual' && Y9.latest.visible")
    frozen=f.evaluate('ATLAS_D_SIM.state.elapsed');page.wait_for_timeout(700);assert f.evaluate('ATLAS_D_SIM.state.elapsed')==frozen
    p=page.evaluate('Y9.inspect()');assert p['nativeNodeSame'] and p['nativeHandlerSame'] and p['nativeButtonCount']==1
    row['pausePresentation']=p;shot('manual-pause');n=f.evaluate("__boardingTrace.events.filter(e=>e.event==='click'&&e.target==='ad-pause').length")
    tap('#ad-pause');assert not f.evaluate('ATLAS_D_SIM.state.paused');page.wait_for_function('!Y9.latest.visible');page.wait_for_timeout(900)
    assert f.evaluate('ATLAS_D_SIM.state.elapsed')>frozen;row['resumeActions']=f.evaluate("__boardingTrace.events.filter(e=>e.event==='click'&&e.target==='ad-pause').length")-n;assert row['resumeActions']==1
    row['instrumentsRestored']=page.frame_locator('#host').locator('#ad-depth').is_visible();assert row['instrumentsRestored'];shot('resumed')
    row['requiredBindings']=['live/atlas-d.js','contact/y4/preview.js','contact/y9/preview.css','contact/y9/pause-recovery.js',f'contact/{entry}/preview.html']+(['contact/y10/boarding-label.js'] if entry=='y10' else [])
    assert all(p in row['binding'] for p in row['requiredBindings']),row['binding']
    assert not row['errors'],row['errors'];row['requestCount']=len(requests)
    if mode=='fail-once-retry':assert len(requests)==2 and len(row['requestFailures'])==1
    row['passed']=True
   except Exception as exc:
    row['error']=str(exc);row['traceback']=traceback.format_exc()
    try:row['failureSnapshot']=snap('FAILURE');shot('FAILURE')
    except Exception:pass
    raise
   finally:
    try:row['trace']=host().evaluate('__boardingTrace')
    except Exception:pass
    (E/'browser.json').write_text(json.dumps(report,indent=2));ctx.close()
  report['passed']=all(x['passed'] for x in report['scenarios'])
 finally:
  (E/'browser.json').write_text(json.dumps(report,indent=2));browser.close()
print(json.dumps({'passed':report['passed'],'layout':LAYOUT,'scenarios':len(report['scenarios']),'runtimeOwnerChanged':False,'errorCoverage':'Browser-native failure handler after test-induced one-request abort; retry succeeds'},indent=2))
