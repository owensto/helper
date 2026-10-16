"""Y5: trusted touch with same-session browser orientation changes; CI only."""
from pathlib import Path
import json,os,time,traceback,math,base64,struct
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
ORIGIN=os.environ.get('ORIGIN','http://127.0.0.1:8919');NAME=os.environ.get('LAYOUT','portrait')
ENTRY=os.environ.get('ENTRY','y4');API='Y4';VIEWPORTS={'portrait':(390,844),'landscape':(844,390)}
report={'passed':False,'baseline':'e30edc8e33b863f3fafb303be0050cc86b7900f0','entry':ENTRY,'startOrientation':NAME,'physicalDevice':False,'safari':False,'rigEnabled':False,'sharedWiring':False,'testStep':False,'directOwnerWrites':False,'cases':[],'touchActions':[],'errors':[],'shaderErrors':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 w,h=VIEWPORTS[NAME];context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=True,is_mobile=True,record_video_dir=str(E/'video'),record_video_size={'width':844,'height':844})
 page=context.new_page();cdp=context.new_cdp_session(page);orientation=NAME;count=0
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader error','validate_status','program info log']) else None)
 def touch(kind,x=None,y=None):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y,'radiusX':3,'radiusY':3,'id':1}]})
 def drag(x1,y1,x2,y2):
  touch('touchStart',x1,y1)
  for i in range(1,9):touch('touchMove',x1+(x2-x1)*i/8,y1+(y2-y1)*i/8);page.wait_for_timeout(55)
  touch('touchEnd');page.wait_for_timeout(450)
 def wait(expr,timeout=60000):page.wait_for_function(expr,timeout=timeout)
 try:
  cdp.send('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':True,'screenWidth':w,'screenHeight':h,'screenOrientation':{'type':'landscapePrimary' if orientation=='landscape' else 'portraitPrimary','angle':90 if orientation=='landscape' else 0}})
  page.goto(ORIGIN+'/atlas_d_simulator_01/contact/'+ENTRY+'/preview.html',wait_until='domcontentloaded',timeout=90000);wait('window.Y4?.ready || window.Y4?.error',180000);assert not page.evaluate('Y4.error')
  f=page.frames[1];fl=page.frame_locator('#host')
  f.evaluate("""() => {window.__y5Events=[];for(const event of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture'])document.addEventListener(event,e=>{window.__y5Events.push({type:event,id:e.target.id,pointerId:e.pointerId,pointerType:e.pointerType,trusted:e.isTrusted,seconds:ATLAS_D_SIM.state.elapsed,rudder:ATLAS_D_SIM.state.rudder,captured:e.target.hasPointerCapture?.(e.pointerId)});},true);} """)
  f.evaluate('''() => {window.__y5Focus=[];for(const type of ['blur','focus','visibilitychange'])window.addEventListener(type,e=>__y5Focus.push({type,windowTarget:e.target===window,trusted:e.isTrusted,hasFocus:document.hasFocus(),hidden:document.hidden,seconds:ATLAS_D_SIM.state.elapsed,throttle:ATLAS_D_SIM.state.throttle,rudder:ATLAS_D_SIM.state.rudder,target:e.target.id||e.target.nodeName||'window'}),true);}''')
  session=page.evaluate('({top:performance.timeOrigin,host:document.getElementById("host").contentWindow.performance.timeOrigin})');report['session']=session
  def target(sel,outer=False):
   loc=page.locator(sel) if outer else fl.locator(sel)
   for attempt in range(6):
    q=loc.evaluate('''e=>{const r=e.getBoundingClientRect(),v=e.ownerDocument.defaultView,p=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,w:r.width,h:r.height,inside:r.x>=0&&r.y>=0&&r.right<=v.innerWidth+1&&r.bottom<=v.innerHeight+1,hit:p===e||e.contains(p),disabled:e.disabled===true};}''')
    if q['inside'] and q['hit']:
     box=loc.bounding_box();assert box and not q['disabled'],(sel,q);assert q['w']>=32 and q['h']>=44,(sel,q);return box,q
    assert not outer,('Outer target unreachable',sel,q)
    dock=fl.locator('#y4-dock').bounding_box();assert dock,(sel,q)
    direction=-1 if q['y']>100 else 1;x=dock['x']+dock['width']-5;low=dock['y']+dock['height']-25;high=dock['y']+65
    drag(x,low if direction==-1 else high,x,high if direction==-1 else low)
   raise AssertionError(('Unreachable after trusted touch scrolling',sel,q))
  def tap(sel,outer=False):
   b,q=target(sel,outer);page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2);report['touchActions'].append({'type':'tap','selector':sel,'outer':outer,'target':q});page.wait_for_timeout(450)
  def hold(sel):
   b,q=target(sel);touch('touchStart',b['x']+b['width']/2,b['y']+b['height']/2);report['touchActions'].append({'type':'hold','selector':sel,'target':q});page.wait_for_timeout(1600)
  def sample():
   row=page.evaluate('Y4.latest');assert row and row['sourceUnchanged'];p=row['physical'];assert p['available'],p['reason'];assert row['mapped']['attachment'] is None and not row['mapped']['valid'];assert not page.evaluate('Y4.rigEnabled')
   assert p['articulation']['controlNormalized']==row['frame']['controls']['rudder']==row['state']['rudder'];assert len(row['rays'])==5
   for r in row['rays']:assert r['hit'] and r['errorM']<1e-5 and r['normalError']<1e-6,r
   current=page.evaluate('Y4.current()');assert current['instanceId']==row['frame']['instanceId'];assert page.evaluate('Y4.physicalAgain().available')
   return row
  def compact(row):return {**{k:row.get(k) for k in ['state','frame','screenContacts','viewport','rays','sourceUnchanged','visible']},'frameToken':row['physical'].get('frameToken'),'controlPoseToken':row['physical']['articulation'].get('controlPoseToken'),'mappedIdentity':row['mapped']['identity'],'mappedFrame':row['mapped']['frame'],'physicalAvailable':row['physical']['available'],'rigAttachment':row['mapped']['attachment'],'rigValid':row['mapped']['valid']}
  def scene_gate(row):
   if page.evaluate('Y4.view')!='station':assert row['viewport']['ownerProjectionClone'];return
   rect=row['viewport']['scene'];assert rect['available'] and len(row.get('screenContacts',[]))==5
   for p in row['screenContacts']:
    assert p['inFront'] and rect['x']<=p['x']<=rect['x']+rect['width'] and rect['y']<=p['y']<=rect['y']+rect['height'],(rect,p)
    assert f.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.id',p)=='scene',p
  def screenshot(name):
   global count
   count+=1;path=f'{count:02d}-{name}.png'
   expected=page.evaluate('({w:innerWidth,h:innerHeight})')
   raw=base64.b64decode(cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False,'fromSurface':True})['data'])
   actual=struct.unpack('>II',raw[16:24]);assert actual==(expected['w'],expected['h']),(actual,expected)
   assert page.evaluate('({w:innerWidth,h:innerHeight})')==expected,'Screenshot mutated viewport'
   (E/path).write_bytes(raw);report.setdefault('screenshots',[]).append({'file':path,'width':actual[0],'height':actual[1],'orientation':orientation,'currentBrowserSurface':True});return path
  def rotate(label,checkScene=True):
   global orientation
   before=sample();beforeSize=page.evaluate('({w:innerWidth,h:innerHeight})');assert (beforeSize['w'],beforeSize['h'])==VIEWPORTS[orientation],'Previous rotation did not persist'
   orientation='landscape' if orientation=='portrait' else 'portrait';w,h=VIEWPORTS[orientation]
   cdp.send('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':True,'screenWidth':w,'screenHeight':h,'screenOrientation':{'type':'landscapePrimary' if orientation=='landscape' else 'portraitPrimary','angle':90 if orientation=='landscape' else 0}})
   wait(f'innerWidth==={w} && innerHeight==={h}');wait(f'Y4.latest?.viewport?.width==={w} && Y4.latest?.viewport?.height==={h-56}');page.wait_for_timeout(1100);after=sample()
   assert page.evaluate('({top:performance.timeOrigin,host:document.getElementById("host").contentWindow.performance.timeOrigin})')==session,'Session reloaded'
   for key in ['instanceId','activationEpoch','simulationEpoch','hostSessionId','worldRevision']:assert before['frame'][key]==after['frame'][key],key
   assert after['frame']['frameId']>before['frame']['frameId'];stale=page.evaluate('(old)=>{const s=Y4.station.sample(old,Y4.current());return {available:s.available,reason:s.reason};}',before['frame']);assert not stale['available']
   assert after['state']['paused']==before['state']['paused']
   if before['state']['paused']:assert after['state']['elapsed']==before['state']['elapsed'],'Paused time advanced during rotation'
   if checkScene:scene_gate(after)
   bounds={'outer':page.evaluate('({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,angle:screen.orientation.angle,type:screen.orientation.type})'),'iframe':page.locator('#host').bounding_box(),'host':f.evaluate('({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth})')}
   assert bounds['host']['scrollWidth']<=w+1 and bounds['iframe']['width']==w,bounds
   result={'name':label,'orientation':orientation,'before':compact(before),'after':compact(after),'beforeSize':beforeSize,'bounds':bounds,'oldFrameRejection':stale,'screenshot':screenshot(label),'passed':True};report['cases'].append(result);return result
  tap('#ad-board');wait('Y4.latest?.physical.available');page.wait_for_timeout(1600)
  if f.evaluate('ATLAS_D_SIM.state.paused'):tap('#ad-pause');report['startupResumeViaTouch']=True
  screenshot('initial-unchanged-y4-station');scene_gate(sample())
  tap('#ad-engine');tap('[data-ad-gear="1"]');b,q=target('#ad-throttle');drag(b['x']+8,b['y']+b['height']/2,b['x']+b['width']*.40,b['y']+b['height']/2);wait('Y4.latest.state.throttle>.25');page.wait_for_timeout(1400)
  start=sample();wall=time.monotonic()
  def power_touch():
   b,q=target('#ad-throttle');drag(b['x']+8,b['y']+b['height']/2,b['x']+b['width']*.40,b['y']+b['height']/2);wait('Y4.latest.state.throttle>.25')
  def release_outcome(power,index):
   row=sample();events=f.evaluate('(i)=>__y5Focus.slice(i)',index);blur=any(e['type']=='blur' and e['windowTarget'] and e['trusted'] for e in events)
   assert row['state']['rudder']==0 and row['state']['engine'] and row['state']['gear']==1
   # The immutable owner intentionally idles on Window blur. Never suppress it,
   # restore thrust numerically, or call that safety response a preview fix.
   same=row['state']['throttle']==power;idle=not same and row['state']['throttle']==0 and blur
   assert same or idle,{'beforePower':power,'after':row['state'],'focusEvents':events}
   return {'released':compact(row),'focusLossIdle':idle,'focusEvents':events}
  for sel,value,label,insideRelease in [('#ad-left',-1,'active-left-held-rotation',False),('#ad-right',1,'active-right-held-return',True)]:
   if sample()['state']['throttle']<=.25:power_touch();report.setdefault('safetyRearmsViaTouch',0);report['safetyRearmsViaTouch']+=1
   focusIndex=f.evaluate('__y5Focus.length');hold(sel);wait(f'Y4.latest.state.rudder==={value}');power=sample()['state']['throttle'];assert power>.25
   screenshot(label+'-before');case=rotate(label);assert case['after']['state']['throttle']==power,'Power changed before release'
   if insideRelease:
    rect=sample()['viewport']['scene'];touch('touchMove',rect['x']+rect['width']/2,56+rect['y']+rect['height']/2);page.wait_for_timeout(450)
   touch('touchEnd');wait('Y4.latest.state.rudder===0');page.wait_for_timeout(500);case.update(release_outcome(power,focusIndex));case['releaseGesture']='trusted move inside current iframe, then lift' if insideRelease else 'lift at original screen point after rotation; no coordinate remap'
   assert not case['released']['state']['paused']
   if insideRelease:assert not case['focusLossIdle'],'Inside-iframe release unexpectedly lost power'
   tap('#ad-center')
  end=sample();rows=page.evaluate('(id)=>Y4.history.filter(x=>x.frame.frameId>id).map(x=>({state:x.state,frame:x.frame,rays:x.rays,sourceUnchanged:x.sourceUnchanged,visible:x.visible}))',start['frame']['frameId'])
  report['motion']={'wallSeconds':time.monotonic()-wall,'simulationSeconds':end['state']['elapsed']-start['state']['elapsed'],'frames':len(rows),'distanceM':math.hypot(end['state']['x']-start['state']['x'],end['state']['z']-start['state']['z']),'controls':sorted(set(r['state']['rudder'] for r in rows)),'testStep':False};report['motionTrace']=rows
  assert report['motion']['distanceM']>1 and report['motion']['simulationSeconds']>3 and {-1,0,1}<=set(report['motion']['controls'])
  for row in rows:
   assert row['sourceUnchanged'] and len(row['rays'])==5
   for r in row['rays']:assert r['hit'] and r['errorM']<1e-5 and r['normalError']<1e-6
  tap('#ad-pause');wait('Y4.latest.state.paused');paused=sample()['state']['elapsed'];power=sample()['state']['throttle']
  focusIndex=f.evaluate('__y5Focus.length');hold('#ad-right');wait('Y4.latest.state.rudder===1');rotate('paused-held-steering');touch('touchEnd');wait('Y4.latest.state.rudder===0');page.wait_for_timeout(500);report['pausedRelease']=release_outcome(power,focusIndex);rotate('paused-neutral-return');assert sample()['state']['elapsed']==paused
  for sel in ['#ad-left','#ad-center','#ad-right','#ad-engine','#ad-throttle','#ad-pause']:target(sel)
  tap('#y4-dive-tab');rotate('paused-dive-dock');target('#ad-target');target('#ad-reset');rotate('paused-dive-dock-return');target('#ad-reset');assert sample()['state']['elapsed']==paused
  tap('#info',True);assert page.locator('#review').is_visible();rotate('details-open-rotation',False);target('#close-info',True);assert page.locator('#review').is_visible();rotate('details-open-return',False);tap('#close-info',True);assert not page.locator('#review').is_visible();scene_gate(sample());assert sample()['state']['elapsed']==paused
  tap('#y4-helm-tab');tap('[data-ad-view="follow"]');wait('Y4.view==="overview"');rotate('native-follow-rotation');assert f.evaluate('ATLAS_D_SIM.inspect().camera')=='follow';tap('#station-view',True);rotate('station-camera-return');scene_gate(sample());assert sample()['state']['elapsed']==paused
  tap('#ad-pause');wait('!Y4.latest.state.paused');page.wait_for_timeout(1300);assert sample()['state']['elapsed']>paused;assert sample()['state']['rudder']==0;tap('#ad-neutral');screenshot('final-released-and-recovered')
  report['touchEvents']=page.evaluate('Y4.inputEvents');report['focusEvents']=f.evaluate('__y5Focus');report['pointerEvents']=f.evaluate('__y5Events');downs=[r for r in report['pointerEvents'] if r['type']=='pointerdown'];assert downs and all(r['trusted'] and r['pointerType']=='touch' for r in downs)
  outstanding=set()
  for r in report['pointerEvents']:
   if r['type']=='pointerdown':outstanding.add(r['pointerId'])
   elif r['type'] in ['pointerup','pointercancel']:outstanding.discard(r['pointerId'])
  assert not outstanding,outstanding
  heldIds=[r['pointerId'] for r in report['pointerEvents'] if r['type']=='pointerdown' and r['id'] in ['ad-left','ad-right']]
  stillCaptured=f.evaluate('(ids)=>ids.some(id=>["ad-left","ad-right"].some(name=>document.getElementById(name).hasPointerCapture(id)))',heldIds)
  assert not stillCaptured;report['heldPointerIds']=heldIds;report['stillCaptured']=stillCaptured
  report['pointerReleased']=True;report['sameSession']=True;report['final']=compact(sample());assert not report['errors'] and not report['shaderErrors'];report['passed']=True
 except Exception as e:
  report['error']=str(e);report['traceback']=traceback.format_exc()
  try:report['latest']=page.evaluate('window.Y4?.latest');report['touchEvents']=page.evaluate('window.Y4?.inputEvents');report['pointerEvents']=page.frames[1].evaluate('window.__y5Events');report['focusEvents']=page.frames[1].evaluate('window.__y5Focus');screenshot('FAILURE')
  except Exception:pass
  raise
 finally:
  (E/'rotation.json').write_text(json.dumps(report,indent=2));context.close();browser.close()
print(json.dumps({'passed':report['passed'],'entry':ENTRY,'start':NAME,'cases':len(report['cases']),'motion':report.get('motion')},indent=2))
