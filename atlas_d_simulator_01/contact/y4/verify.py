"""Y4 real touch in authorized CI: unchanged-Y3 before and presentation-only after.
No forced clicks, dispatched DOM events or owner stepping in the after scenarios.
"""
from pathlib import Path
import os,json,time,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
ORIGIN=os.environ.get('ORIGIN','http://127.0.0.1:8918');NAME=os.environ.get('LAYOUT','portrait');W,H=(390,844) if NAME=='portrait' else (844,390)
report={'passed':False,'layout':NAME,'viewport':[W,H],'baseline':'306525892bb35620184dd52d5679adf578b8f76a','physicalDevice':False,'safari':False,'rigEnabled':False,'sharedWiring':False,'testStepDuringAfterScenarios':False,'touchActions':[],'scenarios':[],'errors':[],'shaderErrors':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 def context(video=False):return b.new_context(viewport={'width':W,'height':H},device_scale_factor=1,has_touch=True,is_mobile=True,**({'record_video_dir':str(E/'video'),'record_video_size':{'width':W,'height':H}} if video else {}))
 c=context();page=c.new_page()
 try:
  page.goto(ORIGIN+'/atlas_d_simulator_01/contact/y3/preview.html',wait_until='domcontentloaded',timeout=90000);page.wait_for_function('window.Y3?.ready || window.Y3?.error',timeout=180000);assert not page.evaluate('Y3.error')
  f=page.frames[1];before={'iframe':page.locator('#host').bounding_box(),'board':page.frame_locator('#host').locator('#ad-board').bounding_box(),'setup':'Diagnostic enter() to expose unchanged layout; not touch acceptance'}
  page.screenshot(path=str(E/'00-before-board.png'),timeout=60000);f.evaluate('ATLAS_D_SIM.enter()');page.wait_for_function('Y3.latest?.physical.available',timeout=60000)
  before['controls']=f.evaluate('''() => ['ad-engine','ad-left','ad-right','ad-pause','ad-dive','ad-surface'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})''')
  before['innerViewport']=f.evaluate('({width:innerWidth,height:innerHeight})');report['before']=before;page.screenshot(path=str(E/'01-before-station.png'),timeout=60000)
 finally:c.close()
 c=context(True);page=c.new_page();cdp=c.new_cdp_session(page)
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader error','validate_status','program info log']) else None)
 def touch(kind,x=None,y=None):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'radiusX':3,'radiusY':3,'id':1}]})
 def drag(x1,y1,x2,y2):
  touch('touchStart',x1,y1)
  for i in range(1,9):touch('touchMove',x1+(x2-x1)*i/8,y1+(y2-y1)*i/8);page.wait_for_timeout(50)
  touch('touchEnd');page.wait_for_timeout(350)
 try:
  page.goto(ORIGIN+'/atlas_d_simulator_01/contact/y4/preview.html',wait_until='domcontentloaded',timeout=90000);page.wait_for_function('window.Y4?.ready || window.Y4?.error',timeout=180000);assert not page.evaluate('Y4.error')
  f=page.frames[1];fl=page.frame_locator('#host')
  def locator(sel,outer=False):return page.locator(sel) if outer else fl.locator(sel)
  def target(sel,outer=False):
   loc=locator(sel,outer)
   for attempt in range(5):
    q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),v=e.ownerDocument.defaultView,p=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=0&&r.y>=0&&r.right<=v.innerWidth+1&&r.bottom<=v.innerHeight+1,hit:p===e||e.contains(p),disabled:e.disabled===true};}''')
    if q['inside'] and q['hit']:
     box=loc.bounding_box();assert box and not q['disabled'],(sel,q);assert q['w']>=32 and q['h']>=44,(sel,q);return box,q
    assert not outer,('Outer control unreachable',sel,q)
    dock=fl.locator('#y4-dock').bounding_box();assert dock,('No reachable control/dock',sel,q)
    direction=-1 if q['y']>100 else 1
    x=dock['x']+dock['width']-5;y1=dock['y']+dock['height']-35 if direction==-1 else dock['y']+65;y2=dock['y']+65 if direction==-1 else dock['y']+dock['height']-35
    drag(x,y1,x,y2)
   raise AssertionError(('Unreachable after real touch scroll',sel,q))
  def tap(sel,outer=False):
   box,q=target(sel,outer);page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2);report['touchActions'].append({'action':'tap','selector':sel,'outer':outer,'target':q});page.wait_for_timeout(350)
  def hold(sel,milliseconds):
   box,q=target(sel);touch('touchStart',box['x']+box['width']/2,box['y']+box['height']/2);report['touchActions'].append({'action':'hold','selector':sel,'milliseconds':milliseconds,'target':q});page.wait_for_timeout(milliseconds)
  def wait(expr,timeout=180000):page.wait_for_function(expr,timeout=timeout)
  def compact(row):return {k:row.get(k) for k in ['state','frame','visible','screenContacts','viewport','rays','sourceUnchanged']}
  def valid(row):
   assert row['sourceUnchanged'];assert row['physical']['available'],row['physical']['reason'];assert row['mapped']['available'] and row['mapped']['valid'] is False and row['mapped']['attachment'] is None
   assert row['physical']['articulation']['controlNormalized']==row['state']['rudder']==row['frame']['controls']['rudder']
   assert len(row['rays'])==5
   for r in row['rays']:assert r['hit'] and r['errorM']<1e-5 and r['normalError']<1e-6,r
  def shot(name,positive=True,station=True):
   wait('Y4.latest && Y4.latest.frame.frameId === Y4.frames');row=page.evaluate('Y4.latest')
   if positive:valid(row)
   else:assert not row['physical']['available'] and not row['visible'],row['physical']['reason']
   if positive and station:
    rect=row['viewport']['scene'];assert rect['available'],rect;assert len(row['screenContacts'])==5
    for p in row['screenContacts']:
     assert p['inFront'] and rect['x']<=p['x']<=rect['x']+rect['width'] and rect['y']<=p['y']<=rect['y']+rect['height'],(rect,p)
     assert f.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.id',p)=='scene',p
   page.screenshot(path=str(E/(name+'.png')),timeout=60000);report['scenarios'].append({'name':name,'physicalReason':row['physical']['reason'],'physicalAvailable':row['physical']['available'],**compact(row)});return row
  tap('#ad-board');wait('Y4.latest?.physical.available');page.wait_for_timeout(1800)
  if f.evaluate('ATLAS_D_SIM.state.paused'):tap('#ad-pause');report['startupResumeViaTouch']=True
  shot('02-after-station-controls-visible')
  report['afterViewport']={'iframe':page.locator('#host').bounding_box(),'inner':f.evaluate('({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth})')}
  assert report['afterViewport']['iframe']['width']==W and report['afterViewport']['inner']['scrollWidth']<=W+1
  hold('#ad-left',1600);left=shot('03-touch-left-minus60');assert left['state']['rudder']==-1;touch('touchEnd');tap('#ad-center');wait('Y4.latest.state.rudder===0');shot('04-touch-neutral')
  hold('#ad-right',1600);right=shot('05-touch-right-plus60');assert right['state']['rudder']==1;touch('touchEnd');tap('#ad-center')
  tap('#ad-pause');wait('Y4.latest.state.paused');paused=page.evaluate('Y4.latest.state.elapsed');page.wait_for_timeout(1200);assert page.evaluate('Y4.latest.state.elapsed')==paused
  tap('#overview',True);wait('Y4.view==="overview"');shot('06-overview-paused',station=False)
  tap('[data-ad-view="follow"]');assert page.evaluate('Y4.view')=='overview';assert f.evaluate('ATLAS_D_SIM.inspect().camera')=='follow'
  tap('#station-view',True);wait('Y4.latest.screenContacts?.length===5');tap('#y4-hide');shot('07-hide-controls-station');tap('#y4-hide')
  tap('#info',True);assert page.locator('#review').is_visible();page.screenshot(path=str(E/'08-details-open.png'));tap('#close-info',True);assert not page.locator('#review').is_visible();assert page.evaluate('Y4.latest.state.elapsed')==paused
  tap('#ad-pause');wait('!Y4.latest.state.paused');report['pauseCameraDetailsNoStepping']=True
  tap('#ad-engine');tap('[data-ad-gear="1"]');box,q=target('#ad-throttle');drag(box['x']+8,box['y']+box['height']/2,box['x']+box['width']*.42,box['y']+box['height']/2);wait('Y4.latest.state.throttle>.25');assert f.evaluate('ATLAS_D_SIM.state.engine')
  start=page.evaluate('Y4.latest');wall=time.monotonic();hold('#ad-right',5500);touch('touchEnd');page.wait_for_timeout(1500);hold('#ad-left',5500);touch('touchEnd');page.wait_for_timeout(1500);end=page.evaluate('Y4.latest');elapsed=time.monotonic()-wall
  rows=page.evaluate('(id)=>Y4.history.filter(x=>x.frame.frameId>id).map(x=>({state:x.state,frame:x.frame,physical:x.physical,mapped:x.mapped,rays:x.rays,sourceUnchanged:x.sourceUnchanged,visible:x.visible,viewport:x.viewport,screenContacts:x.screenContacts}))',start['frame']['frameId'])
  for row in rows:valid(row)
  rt={'wallSeconds':elapsed,'simulationSeconds':end['state']['elapsed']-start['state']['elapsed'],'frames':len(rows),'distanceM':((end['state']['x']-start['state']['x'])**2+(end['state']['z']-start['state']['z'])**2)**.5,'headingRangeRad':max(r['state']['heading'] for r in rows)-min(r['state']['heading'] for r in rows),'heaveRangeM':max(r['state']['heaveM'] for r in rows)-min(r['state']['heaveM'] for r in rows),'ownerControls':sorted(set(r['state']['rudder'] for r in rows)),'paused':end['state']['paused'],'testStepUsed':False,'physicalHardwareBenchmark':False}
  assert rt['frames']>=6 and rt['simulationSeconds']>7 and rt['distanceM']>1 and rt['headingRangeRad']>.003 and rt['heaveRangeM']>.0001 and not rt['paused'],rt
  assert -1 in rt['ownerControls'] and 1 in rt['ownerControls'],rt;report['motion']=rt;report['motionTrace']=[compact(r) for r in rows];shot('09-owner-loop-motion-contacts')
  tap('#ad-neutral');tap('#y4-dive-tab');epoch=page.evaluate('Y4.simulationEpoch');tap('#ad-reset');wait('Y4.latest.state.mode==="surface" && Y4.latest.state.speedMps===0');assert page.evaluate('Y4.simulationEpoch')==epoch+1
  # Commands and every transition below use native touch and the ordinary owner loop.
  operationStart=time.monotonic();tap('#ad-secure');wait('Y4.latest.state.mode==="securing"');shot('10-touch-securing-hidden',False);wait('Y4.latest.state.mode==="secured"',90000);shot('11-secured-dive-controls',False)
  tap('#ad-dive');wait('Y4.latest.state.mode==="diving"');shot('12-touch-diving-hidden',False);wait('Y4.latest.state.mode==="submerged"',180000);under=shot('13-submerged-surface-control',False);assert abs(under['state']['depthM']-18)<.1
  assert fl.locator('#ad-deploy').is_disabled();tap('#ad-surface');wait('Y4.latest.state.mode==="surfacing"');shot('14-touch-surfacing-hidden',False);wait('Y4.latest.state.mode==="secured" && Y4.latest.state.depthM===0',180000)
  tap('#ad-deploy');wait('Y4.latest.state.mode==="deploying"');shot('15-touch-deploying-hidden',False);wait('Y4.latest.state.mode==="surface" && Y4.latest.physical.available',90000);tap('#y4-helm-tab');shot('16-surface-station-recovered')
  report['fullOwnerLoopLifecycle']={'wallSeconds':time.monotonic()-operationStart,'targetM':18,'secureDiveSurfaceDeploy':True,'noTestStep':True}
  # Touch switching verifies old physical frames cannot survive exit/reboard.
  old=page.evaluate('Y4.latest');activation=page.evaluate('Y4.activationEpoch');tap('#ad-exit');wait('Y4.latest.physical.reason==="VESSEL_NOT_ACTIVE"');page.screenshot(path=str(E/'17-return-to-bay.png'));tap('#ad-board');wait('Y4.latest.physical.available');assert page.evaluate('Y4.activationEpoch')==activation+2
  assert not page.evaluate('(old)=>Y4.station.sample(old.frame,Y4.current()).available',old);shot('18-reboard-new-lifecycle')
  report['touchEvents']=page.evaluate('Y4.inputEvents');trusted=[x for x in report['touchEvents'] if x['event']=='pointerdown' and x['type']=='touch' and x['trusted']]
  ids={x['id'] for x in trusted};assert {'ad-left','ad-right','ad-center','ad-engine','ad-throttle','ad-pause','ad-secure','ad-dive','ad-surface','ad-deploy','ad-reset','ad-exit'}<=ids,ids
  report['trustedTouchPointerDowns']=len(trusted);assert not report['errors'] and not report['shaderErrors'],report
  report['passed']=True
 except Exception as e:
  report['error']=str(e);report['traceback']=traceback.format_exc()
  try:touch('touchEnd');report['latest']=page.evaluate('window.Y4?.latest');report['touchEvents']=page.evaluate('window.Y4?.inputEvents');page.screenshot(path=str(E/'FAILURE.png'),timeout=60000)
  except Exception:pass
  raise
 finally:
  (E/'browser.json').write_text(json.dumps(report,indent=2));c.close();b.close()
print(json.dumps({'passed':report['passed'],'layout':NAME,'motion':report.get('motion'),'lifecycle':report.get('fullOwnerLoopLifecycle')},indent=2))
