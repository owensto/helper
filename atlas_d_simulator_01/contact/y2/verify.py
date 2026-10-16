"""Actual isolated R7 geometry/motion capture; no human or shared-host wiring."""
from pathlib import Path
import hashlib,json,os,time,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8916/atlas_d_simulator_01/contact/y2/preview.html')
report={'passed':False,'source':'48b9bef038ab2e422b6677d7ca9db4879419a3f9','humanReceiver':'347e52ebc4cdb38b7647bb54b37405fbe59b57cf','url':URL,'sharedWiring':False,'humanCreated':False,'productionEnabled':False,'errors':[],'shaderErrors':[],'scenarios':[]}
def valid(row):
 assert row['sourceUnchanged']
 assert row['physical']['available'],row['physical']['reason']
 assert row['mapped']['available'] and row['mapped']['valid'] is False
 assert row['mapped']['attachment'] is None
 assert len(row['rays'])==5
 for ray in row['rays']:assert ray['hit'] and ray['errorM']<1e-5 and ray['normalError']<1e-6,ray
 assert len(row['physical']['mounts']['probes'])==36
 assert all(x['available'] and x['errorM']<1e-5 for x in row['physical']['mounts']['probes'])
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1,record_video_dir=str(E/'video'),record_video_size={'width':1440,'height':1000})
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(s in m.text.lower() for s in ['shader error','validate_status','program info log']) else None)
 try:
  page.goto(URL,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('Y2.ready || Y2.error',timeout=180000);assert not page.evaluate('Y2.error')
  h=page.frame_locator('#host');f=page.frames[1]
  f.evaluate('BAYPLAY.setPaused(true)')
  bay=f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,t:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
  h.locator('#ad-board').click();page.wait_for_function('Y2.latest?.physical.available',timeout=60000)
  f.evaluate('ATLAS_D_SIM.holdFrameLoop=true;ATLAS_D_SIM.state.paused=false;ATLAS_D_SIM.testStep(0)')
  def shot(name,expected=True):
   row=page.evaluate('Y2.refresh()')
   if expected:valid(row)
   else:assert not row['physical']['available'] and not row['visible'],row
   report['scenarios'].append({'name':name,**row})
   f.evaluate('document.getElementById("ad-root").style.visibility="hidden"')
   page.screenshot(path=str(E/(name+'.png')),timeout=60000)
   f.evaluate('document.getElementById("ad-root").style.visibility=""')
   return row
  first=shot('01-surface-authored-helm',True)
  # Evidence of the same exact new station in its original source context.
  page.locator('#overview').click();shot('02-source-linked-yacht-overview',True);page.locator('#station-view').click()
  # Pin a finite rig-neutral handoff, not a pelvis/wrist/ankle attachment.
  (E/'positive-contact-handoff.json').write_text(json.dumps(first['mapped'],indent=2))
  # Real helm operations accelerate, then actual pointer steering during normal RAF.
  h.locator('#ad-weather').select_option('swell');h.locator('#ad-engine').click();h.locator('[data-ad-gear="1"]').click()
  h.locator('#ad-throttle').evaluate('(e)=>{e.value=45;e.dispatchEvent(new Event("input",{bubbles:true}))}')
  f.evaluate('ATLAS_D_SIM.testStep(30)')
  f.evaluate('ATLAS_D_SIM.holdFrameLoop=false;ATLAS_D_SIM.state.paused=false')
  h.locator('#ad-right').hover();page.mouse.down();before=page.evaluate('Y2.latest');start=time.monotonic()
  page.wait_for_timeout(12000);page.mouse.up();after=page.evaluate('Y2.latest');wall=time.monotonic()-start
  f.evaluate('ATLAS_D_SIM.holdFrameLoop=true')
  rows=page.evaluate('(n)=>Y2.history.filter(x=>x.frame.frameId>n)',before['frame']['frameId'])
  for row in rows:valid(row)
  rt={'wallSeconds':wall,'simSeconds':after['state']['elapsed']-before['state']['elapsed'],'frames':len(rows),'headingChangeRad':after['state']['heading']-before['state']['heading'],'heaveRangeM':max(x['state']['heaveM'] for x in rows)-min(x['state']['heaveM'] for x in rows),'paused':after['state']['paused'],'independentVesselClock':False,'deterministicStepDuringMeasuredInterval':False}
  assert not rt['paused'] and rt['simSeconds']>7 and rt['frames']>=6 and rt['headingChangeRad']>.005 and rt['heaveRangeM']>.001,rt
  report['realTime']=rt;shot('03-turning-bobbing-physical-contacts',True)
  # Paused time may acquire a fresh render stamp, never advance simulation.
  h.locator('#ad-pause').click();state_before=f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())');page.evaluate('Y2.refresh()');assert state_before==f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())');h.locator('#ad-pause').click()
  # Reset epoch is observed by the test owner, not copied from attachment activation.
  epoch_before=page.evaluate('Y2.simulationEpoch');activation=page.evaluate('Y2.activationEpoch')
  h.locator('#ad-reset').click();page.evaluate('Y2.refresh()');assert page.evaluate('Y2.simulationEpoch')==epoch_before+1;assert page.evaluate('Y2.activationEpoch')==activation
  shot('04-reset-explicit-clock-epoch',True)
  h.locator('#ad-secure').click();f.evaluate('ATLAS_D_SIM.testStep(15)');shot('05-transformation-no-occupancy',False)
  f.evaluate('ATLAS_D_SIM.testStep(25)');shot('06-secured-station-unavailable',False)
  h.locator('#ad-dive').click();f.evaluate('ATLAS_D_SIM.testStep(150)');under=shot('07-submerged-no-dry-station',False)
  assert under['state']['mode']=='submerged' and abs(under['state']['depthM']-18)<.1
  assert not f.evaluate('ATLAS_D_SIM.command("deploy")')
  old=page.evaluate('Y2.latest');epoch=page.evaluate('Y2.activationEpoch')
  h.locator('#ad-exit').click();page.wait_for_function('Y2.latest?.physical.reason === "VESSEL_NOT_ACTIVE"',timeout=60000)
  shot('08-switch-bay-invalidates-station',False)
  assert bay==f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,t:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
  h.locator('#ad-board').click();page.evaluate('Y2.refresh()');assert page.evaluate('Y2.activationEpoch')==epoch+2
  assert not page.evaluate('(old)=>Y2.station.sample(old.frame,Y2.current()).available',old)
  h.locator('#ad-surface').click();f.evaluate('ATLAS_D_SIM.testStep(150)');h.locator('#ad-deploy').click();f.evaluate('ATLAS_D_SIM.testStep(40)')
  shot('09-surface-recovery-new-lifecycle',True)
  report['lifecycle']={'bayRestored':True,'staleFrameRejected':True,'clockEpochDistinct':True,'positiveRecovery':True}
  # Existing controller regression with observer enabled/disabled, identical source simulation.
  action='''() => {ATLAS_D_SIM.state.reset();ATLAS_D_SIM.state.observe(AtlasDCore.provingSample);ATLAS_D_SIM.command('engine');ATLAS_D_SIM.command('gear',1);ATLAS_D_SIM.command('throttle',.4);ATLAS_D_SIM.command('rudder',.8);return ATLAS_D_SIM.testStep(45).state;}'''
  page.evaluate('Y2.enabled=false');a=f.evaluate(action);page.evaluate('Y2.enabled=true');b=f.evaluate(action);assert a==b
  report['movementRegression']={'exactStateEquality':True,'seconds':45,'deterministic':True}
  f.evaluate('ATLAS_D_SIM.state.reset();ATLAS_D_SIM.command("secure");ATLAS_D_SIM.testStep(40)')
  assert f.evaluate('ATLAS_D_SIM.state.command("dive",undefined,()=>({known:false,bed:null}))') is False
  report['unknownDepthInterlock']=True
  costs=sorted(page.evaluate('Y2.costMs'));report['observerCostMs']={'samples':len(costs),'median':costs[len(costs)//2],'p95':costs[int(.95*len(costs))],'includesMountProbesAndRays':True,'consumerHardwareBenchmark':False}
  report['assetSHA256']=page.evaluate('Y2.station.spec.sourceAssetSHA256')
  assert not report['errors'] and not report['shaderErrors'],report
  report['passed']=True
 except Exception as e:
  report['error']=str(e);report['traceback']=traceback.format_exc()
  try:page.screenshot(path=str(E/'FAILURE.png'),timeout=60000)
  except Exception:pass
  raise
 finally:
  (E/'browser.json').write_text(json.dumps(report,indent=2));context.close();browser.close()
print(json.dumps({'passed':report['passed'],'scenarios':len(report['scenarios']),'realTime':report.get('realTime')},indent=2))
