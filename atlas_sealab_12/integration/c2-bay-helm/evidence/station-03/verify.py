"""Actual current-host empty station inspection. No human fitting or acceptance."""
from pathlib import Path
import os,json,traceback,hashlib
from playwright.sync_api import sync_playwright
OUT=Path(os.environ['S03_OUT'])/'browser';OUT.mkdir(exist_ok=True,parents=True);dev=os.environ['TEST_DEVICE'];w,h=(1440,960) if dev=='desktop' else (430,932);URL=os.environ.get('S03_URL','http://127.0.0.1:8920/index.html?station03=1')
report={'sourceSHA':os.environ['GITHUB_SHA'],'device':dev,'passed':False,'tests':[],'errors':[],'shaderErrors':[],'assetErrors':[],'humanRequests':[],'fullBodyAccepted':False,'publicActivation':False,'physicalDeviceTested':False}
def check(name,condition,detail=None):
 report['tests'].append({'name':name,'passed':bool(condition),'detail':detail});assert condition,name

def shot(p,label,view='side'):
 p.evaluate('(v)=>{BAYPLAY.capturePaused=true;STATION03.view(v);SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera)}',view)
 try:p.screenshot(path=str(OUT/(dev+'_'+label+'.png')),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')

def snap(p,label):
 d=p.evaluate('STATION03.exportPackage()');(OUT/(dev+'_'+label+'.json')).write_text(json.dumps(d,indent=2));return d

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone',record_video_dir=str(OUT/'video'),record_video_size={'width':w,'height':h});p=c.new_page();p.set_default_timeout(60000)
 p.on('pageerror',lambda e:report['errors'].append(str(e)))
 p.on('response',lambda r:report['assetErrors'].append([r.status,r.url]) if r.status>=400 and 'favicon' not in r.url else None)
 p.on('request',lambda r:report['humanRequests'].append(r.url) if '/human/' in r.url else None)
 p.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader','validate_status','program info log']) else None)
 try:
  p.goto(URL,wait_until='domcontentloaded');p.wait_for_function('window.S03_READY||window.S03_ERROR',timeout=120000);check('attested empty candidate installed',p.evaluate('!!window.S03_READY'),p.evaluate('window.S03_ERROR||null'))
  check('no human construction, same single lifecycle holder',p.evaluate('S03_EMPTY_HOLDERS===1 && BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").children.length===0 && !window.C2_READY && !window.C2_FACTORY_BUILDS'))
  p.wait_for_function('STATION03.inspect().supportGeometryReady');d=snap(p,'down');shot(p,'chair_and_helm');shot(p,'plan','top')
  check('25 authored closed parts and four finite supports',len(d['parts'])==25 and len(d['surfaces'])==4)
  check('immutable source and manifest identity',d['snapshot']['sourceSHA']==os.environ['GITHUB_SHA'] and len(d['snapshot']['manifestSHA256'])==64)
  check('exact SETTLE02 down predicate retained',d['snapshot']['settlement']['downStable'] and not d['snapshot']['settlement']['transitioning'])
  ids={s['id']:s for s in d['surfaces']};check('seat and BOTH foot heights match proposed geometry',abs(ids['seat']['contactToVessel'][13]-.98)<1e-6 and all(abs(ids[k]['contactToVessel'][13]-.51)<1e-6 for k in ['leftFoot','rightFoot']))
  check('new wheel parent identity and explicit revised transform',p.evaluate('(()=>{const o=BAYPLAY.model.getObjectByName("PLAY_STEERING");return o.position.toArray().every((v,i)=>v===[-1.34,1.32,.18][i]) && !!o.getObjectByName("S03_wheel-rim")})()'))
  check('all whole replacements retired, partial survivors retained',p.evaluate('async()=>{const l=await(await fetch("s03-sources.json")).json();return l.replacements.every(r=>{const n=BAYPLAY.model.getObjectByName(r.runtimeName);return r.retainedTriangleCount===0?!n:n.geometry.index.count===r.retainedTriangleCount*3;})}'))
  check('retired drawers unavailable, not invisible storage',p.evaluate('BAYPLAY.action("drawer1").reason==="DRAWER_ASSEMBLY_REPLACED_STATION03"'))
  p.evaluate('STATION03.clearTrace()');t=p.evaluate('BAYPLAY.state.elapsed');p.locator('#s03-fold').click();p.wait_for_function('STATION03.inspect().settlement.transitioning');check('target departure invalidates support',not p.evaluate('STATION03.inspect().supportGeometryReady'))
  p.wait_for_function('STATION03.inspect().settlement.phase==="up-settled"');u=snap(p,'up');shot(p,'footrests_stowed')
  check('actual linked foot geometry rotates85deg',all(abs(x['angle']-85*3.141592653589793/180)<1e-10 for x in u['snapshot']['hinges']) and not u['snapshot']['supportGeometryReady'])
  check('paused physics does not freeze fittings',p.evaluate('BAYPLAY.inspect().paused && BAYPLAY.state.elapsed')==t)
  p.locator('#s03-fold').click();p.wait_for_function('STATION03.inspect().settlement.transitioning');p.wait_for_function('STATION03.inspect().supportGeometryReady');returned=snap(p,'returned');shot(p,'returned','close')
  trace=p.evaluate('STATION03.trace()');(OUT/(dev+'_trace.json')).write_text(json.dumps(trace,indent=2));check('no accepted transition in committed trace',len(trace)>5 and any(x['settlement']=='transition' for x in trace) and not any(x['supportGeometryReady'] and x['settlement']!='down-settled' for x in trace),{'rows':len(trace),'transitionRows':sum(x['settlement']=='transition' for x in trace)})
  p.evaluate('BAYPLAY.model.getObjectByName("S03_foot-left").position.x+=.02');p.wait_for_function('!STATION03.inspect().geometryIntact');check('changed new support source is rejected',not p.evaluate('STATION03.inspect().supportGeometryReady'));p.evaluate('BAYPLAY.model.getObjectByName("S03_foot-left").position.x=.17');p.wait_for_function('STATION03.inspect().supportGeometryReady')
  p.evaluate('BAYPLAY.model.getObjectByName("PLAY_BOLSTER_1").rotation.z=.01;SEA06.beforeRender()');check('nonzero original evaluated pivot behind zero aggregate rejects',not p.evaluate('STATION03.inspect().supportGeometryReady'));p.evaluate('BAYPLAY.refresh();SEA06.beforeRender()');p.wait_for_function('STATION03.inspect().supportGeometryReady')
  p.evaluate('BAYPLAY.setPaused(false)');p.locator('#helm09-map').click();t0=p.evaluate('BAYPLAY.state.elapsed');p.wait_for_timeout(1000);check('map does not pause actual host',p.evaluate('!BAYPLAY.inspect().paused && BAYPLAY.state.elapsed')>t0);p.locator('#helm09-map').click();p.evaluate('BAYPLAY.setPaused(true)')
  p.evaluate('BAYPLAY.testStep(.2,{steer:.7,rudder:.7});SEA06.beforeRender()');check('original steering drives new wheel',abs(p.evaluate('STATION03.inspect().wheelAngle'))>.1)
  p.locator('#helm09-throttle').evaluate('(e)=>{e.value=65;e.dispatchEvent(new Event("input",{bubbles:true}))}');p.evaluate('BAYPLAY.refresh();SEA06.beforeRender()');check('original power control drives new closed lever',abs(p.evaluate('STATION03.inspect().throttleAngle'))>.01)
  p.evaluate('BAYPLAY.testStep(.2,{steer:0,rudder:0,throttle:0});BAYPLAY.setPaused(true);SEA06.beforeRender()');shot(p,'operator_view','front')
  check('empty station remains activation-off throughout',not report['humanRequests'] and all(x['humanFactoryEnabled'] is False for x in trace) and p.evaluate('BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").children.length===0'))
  check('no horizontal viewport overflow',p.evaluate('document.documentElement.scrollWidth')<=w+2)
  p.evaluate('window.__s03holder=STATION03.originalHolder;STATION03.dispose()');check('dispose restores original source assemblies without spawning a human',p.evaluate('!!BAYPLAY.model.getObjectByName("P02_grouped_detail_161_54") && BAYPLAY.model.getObjectByName("PLAY_STEERING").position.x===-1.065000057220459 && BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").uuid===__s03holder && BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").children.length===0'))
  check('no application shader or asset errors',not report['errors'] and not report['shaderErrors'] and not report['assetErrors'])
  report['passed']=True
 except Exception as e:
  report['exception']=str(e);report['traceback']=traceback.format_exc()
  try:
   report['failureState']=p.evaluate('window.STATION03?.inspect()||window.S03_ERROR');p.screenshot(path=str(OUT/(dev+'_ERROR.png')),timeout=30000)
  except Exception:pass
 finally:
  c.close();b.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));assert report['passed'],'Empty station geometry inspection failed'
