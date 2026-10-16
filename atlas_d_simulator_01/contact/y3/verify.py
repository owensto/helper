"""Authorized-CI browser evidence of real owner controls and moving physical faces."""
from pathlib import Path
import json,os,time,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8917/atlas_d_simulator_01/contact/y3/preview.html')
report={'passed':False,'source':'ce92886ac58f431e4e67d6fe71f269ad399a5c66','url':URL,'sharedWiring':False,'humanCreated':False,'productionEnabled':False,'errors':[],'shaderErrors':[],'scenarios':[]}
def valid(row):
 assert row['sourceUnchanged']
 p=row['physical'];assert p['available'],p['reason'];assert row['mapped']['available'] and row['mapped']['valid'] is False
 assert row['mapped']['attachment'] is None
 assert p['articulation']['source']=='AtlasDCore.Vessel.rudder'
 assert p['articulation']['controlNormalized']==row['state']['rudder']==row['frame']['controls']['rudder']
 assert abs(p['articulation']['wheelAngleRad']-row['state']['rudder']*1.0471975511965976)<1e-12
 assert len(row['rays'])==5
 for ray in row['rays']:assert ray['hit'] and ray['errorM']<1e-5 and ray['normalError']<1e-6,ray
 assert len(p['mounts']['probes'])==36 and all(x['available'] and x['errorM']<1e-5 for x in p['mounts']['probes'])
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1,record_video_dir=str(E/'video'),record_video_size={'width':1440,'height':1000})
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(s in m.text.lower() for s in ['shader error','validate_status','program info log']) else None)
 try:
  page.goto(URL,wait_until='domcontentloaded',timeout=90000);page.wait_for_function('window.Y3?.ready || window.Y3?.error',timeout=180000);assert not page.evaluate('Y3.error')
  h=page.frame_locator('#host');f=page.frames[1];f.evaluate('BAYPLAY.setPaused(true)')
  bay=f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,t:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
  h.locator('#ad-board').click();page.wait_for_function('Y3.latest?.physical.available',timeout=60000)
  f.evaluate('ATLAS_D_SIM.holdFrameLoop=true;ATLAS_D_SIM.state.paused=false;ATLAS_D_SIM.testStep(0)')
  def shot(name,expected=True):
   row=page.evaluate('Y3.refresh()')
   if expected:valid(row)
   else:assert not row['physical']['available'] and not row['visible'],row
   report['scenarios'].append({'name':name,**row})
   f.evaluate('document.getElementById("ad-root").style.visibility="hidden"');page.screenshot(path=str(E/(name+'.png')),timeout=60000);f.evaluate('document.getElementById("ad-root").style.visibility=""')
   return row
  neutral=shot('01-neutral-existing-y2-faces')
  def down(which):h.locator(which).hover();page.mouse.down()
  down('#ad-left');left=shot('02-left-owner-rudder-minus-one');assert left['state']['rudder']==-1;page.mouse.up()
  down('#ad-right');right=shot('03-right-owner-rudder-plus-one');assert right['state']['rudder']==1;page.mouse.up()
  centered=shot('04-neutral-return-same-physical-faces')
  for id in ['helm.seat','helm.hand.left','helm.hand.right','helm.foot.left','helm.foot.right']:
   a=neutral['physical']['contacts'][id]['pointStationM'];b=centered['physical']['contacts'][id]['pointStationM'];assert max(abs(x-y) for x,y in zip(a,b))<1e-10
  for id in ['helm.hand.left','helm.hand.right']:
   a=left['physical']['contacts'][id]['pointStationM'];b=right['physical']['contacts'][id]['pointStationM'];assert sum((x-y)**2 for x,y in zip(a,b))**.5>.4
  page.locator('#overview').click();shot('05-original-yacht-source-link');page.locator('#station-view').click()
  (E/'moving-contact-handoff.json').write_text(json.dumps(right['mapped'],indent=2))
  # Same paused rendered pose, compare guarded-cache against all36 original queries.
  report['probeBenchmarkMs']=page.evaluate('Y3.benchmark(50)')
  assert report['probeBenchmarkMs']['maxMountPointErrorM']<1e-5
  assert report['probeBenchmarkMs']['optimized']['median']<report['probeBenchmarkMs']['exhaustive']['median'],report['probeBenchmarkMs']
  # Prep uses existing test helper. Measured interval below uses ONLY normal owner RAF + actual UI input.
  h.locator('#ad-weather').select_option('swell');h.locator('#ad-engine').click();h.locator('[data-ad-gear="1"]').click()
  h.locator('#ad-throttle').evaluate('(e)=>{e.value=45;e.dispatchEvent(new Event("input",{bubbles:true}))}')
  f.evaluate('ATLAS_D_SIM.testStep(30)');before=page.evaluate('Y3.latest')
  f.evaluate('ATLAS_D_SIM.holdFrameLoop=false;ATLAS_D_SIM.state.paused=false');start=time.monotonic()
  down('#ad-right');page.wait_for_timeout(4500);page.mouse.up();page.wait_for_timeout(1500)
  down('#ad-left');page.wait_for_timeout(4500);page.mouse.up();down('#ad-right');page.wait_for_timeout(1500)
  after=page.evaluate('Y3.latest');wall=time.monotonic()-start;f.evaluate('ATLAS_D_SIM.holdFrameLoop=true')
  rows=page.evaluate('(n)=>Y3.history.filter(x=>x.frame.frameId>n)',before['frame']['frameId'])
  for row in rows:valid(row)
  seen=set(x['state']['rudder'] for x in rows)
  rt={'wallSeconds':wall,'simSeconds':after['state']['elapsed']-before['state']['elapsed'],'frames':len(rows),'headingRangeRad':max(x['state']['heading'] for x in rows)-min(x['state']['heading'] for x in rows),'heaveRangeM':max(x['state']['heaveM'] for x in rows)-min(x['state']['heaveM'] for x in rows),'ownerControlsObserved':sorted(seen),'paused':after['state']['paused'],'independentVesselClock':False,'deterministicStepDuringMeasuredInterval':False,'hardwareBenchmark':False}
  assert not rt['paused'] and rt['simSeconds']>7 and rt['frames']>=6 and rt['headingRangeRad']>.005 and rt['heaveRangeM']>.001,rt
  assert -1 in seen and 1 in seen,rt
  report['realTime']=rt;report['motionFrames']=rows;shot('06-normal-turning-bobbing-moving-grips');page.mouse.up()
  # Exhaustive oracle retained at moved pose, not replaced with the cached values.
  report['movedPoseProbeBenchmarkMs']=page.evaluate('Y3.benchmark(30)');assert report['movedPoseProbeBenchmarkMs']['maxMountPointErrorM']<1e-5
  h.locator('#ad-pause').click();saved=f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())');page.evaluate('Y3.refresh()');assert saved==f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())')
  down('#ad-left');paused=shot('07-paused-control-change-no-vessel-clock');assert paused['state']['paused'] and paused['state']['elapsed']==json.loads(saved)['elapsed'];page.mouse.up();h.locator('#ad-pause').click()
  epoch=page.evaluate('Y3.simulationEpoch');activation=page.evaluate('Y3.activationEpoch');h.locator('#ad-reset').click();page.evaluate('Y3.refresh()');assert page.evaluate('Y3.simulationEpoch')==epoch+1 and page.evaluate('Y3.activationEpoch')==activation
  h.locator('#ad-secure').click();f.evaluate('ATLAS_D_SIM.testStep(15)');shot('08-transforming-station-hidden',False)
  f.evaluate('ATLAS_D_SIM.testStep(25)');shot('09-packed-station-unavailable',False)
  h.locator('#ad-dive').click();entry=page.evaluate('Y3.refresh()');assert not entry['physical']['available'] and entry['state']['depthM']==0
  f.evaluate('ATLAS_D_SIM.testStep(150)');under=shot('10-submerged-no-exterior-contacts',False);assert under['state']['mode']=='submerged' and abs(under['state']['depthM']-18)<.1
  assert not f.evaluate('ATLAS_D_SIM.command("deploy")')
  old=page.evaluate('Y3.latest');epoch=page.evaluate('Y3.activationEpoch');h.locator('#ad-exit').click();page.wait_for_function('Y3.latest?.physical.reason === "VESSEL_NOT_ACTIVE"',timeout=60000)
  shot('11-bay-switch-invalidates-yacht',False);assert bay==f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,t:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
  h.locator('#ad-board').click();page.evaluate('Y3.refresh()');assert page.evaluate('Y3.activationEpoch')==epoch+2
  assert not page.evaluate('(old)=>Y3.station.sample(old.frame,Y3.current()).available',old)
  h.locator('#ad-surface').click();f.evaluate('ATLAS_D_SIM.testStep(150)');h.locator('#ad-deploy').click();f.evaluate('ATLAS_D_SIM.testStep(40)');shot('12-surface-new-lifecycle-recovery')
  report['lifecycle']={'bayRestored':True,'staleFrameRejected':True,'clockEpochDistinct':True,'positiveRecovery':True,'zeroDepthDiveRejected':True}
  # Same original commands / seconds, no observer effect on original movement.
  action='''()=>{ATLAS_D_SIM.state.reset();ATLAS_D_SIM.state.observe(AtlasDCore.provingSample);ATLAS_D_SIM.command('engine');ATLAS_D_SIM.command('gear',1);ATLAS_D_SIM.command('throttle',.4);for(const value of [-1,0,1]){ATLAS_D_SIM.command('rudder',value);ATLAS_D_SIM.testStep(15);}return ATLAS_D_SIM.state.snapshot();}'''
  page.evaluate('Y3.enabled=false');a=f.evaluate(action);page.evaluate('Y3.enabled=true;Y3.exhaustiveMounts=false');b=f.evaluate(action);page.evaluate('Y3.exhaustiveMounts=true');c=f.evaluate(action);page.evaluate('Y3.exhaustiveMounts=false');assert a==b==c
  report['movementRegression']={'exactStateEquality':True,'seconds':45,'modes':['observer-off','optimized-observer','exhaustive-observer'],'deterministic':True}
  f.evaluate('ATLAS_D_SIM.state.reset();ATLAS_D_SIM.command("secure");ATLAS_D_SIM.testStep(40)');assert f.evaluate('ATLAS_D_SIM.state.command("dive",undefined,()=>({known:false,bed:null}))') is False;report['unknownDepthInterlock']=True
  costs=sorted(page.evaluate('Y3.costMs'));report['observerCostMs']={'samples':len(costs),'median':costs[len(costs)//2],'p95':costs[int(.95*len(costs))],'includesFrameCapturePhysicalSamplingFiveRays':True,'includesRenderer':False,'hardwareBenchmark':False}
  assert not report['errors'] and not report['shaderErrors'],report
  report['passed']=True
 except Exception as e:
  report['error']=str(e);report['traceback']=traceback.format_exc()
  try:page.screenshot(path=str(E/'FAILURE.png'),timeout=60000)
  except Exception:pass
  raise
 finally:
  (E/'browser.json').write_text(json.dumps(report,indent=2));context.close();browser.close()
print(json.dumps({'passed':report['passed'],'scenarios':len(report['scenarios']),'realTime':report.get('realTime'),'probeBenchmarkMs':report.get('probeBenchmarkMs')},indent=2))
