from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,base64,traceback
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8885/index.html');OUT=Path(os.environ.get('REVIEW_DIR','/tmp/sea05/review'));OUT.mkdir(parents=True,exist_ok=True)
report={'url':BASE,'passed':True,'release':'08','local_assets_injected':False,'physical_device_test':False,'acoustic_fidelity_validated':False,'marine_validated':False,'long_runs':'Fixed-step runtime advancement, not wall-clock or FPS measurements','tests':[]}
def driving_wait(page,expression,result,timeout=60000):
 # A software renderer may trip the app's intentional foreground-stall pause.
 # Resume via the visible user control, never bypass the pause in runtime state.
 import time
 end=time.monotonic()+timeout/1000;resumes=0
 while time.monotonic()<end:
  if page.evaluate(expression):return
  if page.evaluate('BAYPLAY.inspect().paused && (window.SEA_TIMING?.stalls||0)>0'):
   assert resumes<3,'Repeated foreground stalls prevent usable driving in this renderer'
   page.locator('#sea08-pause').click();resumes+=1;result['foreground_stall_resumes']=result.get('foreground_stall_resumes',0)+1
  page.wait_for_timeout(250)
 raise AssertionError('Rendered control did not reach '+expression)
def shot(page,name):
 page.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true');page.wait_for_timeout(250)
 try:page.screenshot(path=str(OUT/name),timeout=60000)
 finally:page.evaluate('BAYPLAY.capturePaused=false')
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROME_PATH'):opts['executable_path']=os.environ['CHROME_PATH']
 browser=p.chromium.launch(**opts)
 for dev,w,h in [('desktop',1600,1000),('phone',430,932)]:
  if os.environ.get('TEST_DEVICE') and os.environ['TEST_DEVICE']!=dev:continue
  ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=dev=='phone');page=ctx.new_page();errs=[];fails=[];shader_errors=[]
  page.on('console',lambda m:shader_errors.append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log','webgl']) else None)
  page.on('pageerror',lambda e:errs.append(str(e)));page.on('response',lambda r:fails.append([r.status,r.url]) if r.status>=400 and 'favicon' not in r.url else None)
  result={'device':dev,'passed':False,'errors':errs,'asset_failures':fails,'shader_errors':shader_errors};report['tests'].append(result)
  try:
   page.goto(BASE,wait_until='domcontentloaded',timeout=120000)
   if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()
   page.wait_for_function('window.SEA08?.ready && window.SEA07?.ready && window.SEA06?.ready && SEA06.inspect().waterMask && BayGeo.ready',timeout=120000)
   page.wait_for_timeout(1200)
   assert page.locator('#sea08-pause').is_visible();result['realism08']=page.evaluate('SEA08.inspect()');assert result['realism08']['physicalMaterials']>=3
   assert page.locator('#cmd-sidebar').is_hidden();assert page.locator('#mfd-panel').is_hidden();assert not page.evaluate('BAYPLAY.audio.enabled')
   assert page.evaluate('BAYPLAY.inspect().instrumentResolution[0]===1024');result['opt_in_and_resolution']=True
   assert page.evaluate('SEA51.inspect().mockScreenOverlayHidden');result['retired_static_screen_overlay']=True
   result['repair_report']=page.evaluate('SEA06.inspect()');assert len(result['repair_report']['repairMeshes'])==12
   assert result['repair_report']['terrainMerged'] and result['repair_report']['terrainDrawGroupsAfter']==2
   result['repair_raycast_hits']=page.evaluate("""() => {const A=BAYPLAY,T=ATLASRuntime,ray=new T.Raycaster();A.boat.updateWorldMatrix(true,true);let ok=0;A.model.traverse(o=>{if(!o.isMesh||!o.name.includes('CastingDeck_ClosedPatch'))return;const p=new T.Box3().setFromObject(o).getCenter(new T.Vector3());const start=p.clone();start.y+=2;ray.set(start,new T.Vector3(0,-1,0));if(ray.intersectObject(o,true).length)ok++;});return ok;}""");assert result['repair_raycast_hits']==8
   assert page.evaluate("!!BAYPLAY.model.getObjectByName('REPAIR07_CastingDeck_RiserBacking')")
   result['riser_wing_hits']=page.evaluate("""() => {const T=ATLASRuntime,A=BAYPLAY,o=A.model.getObjectByName('REPAIR07_CastingDeck_RiserBacking'),ray=new T.Raycaster();A.boat.updateWorldMatrix(true,true);let n=0;for(const z of [-1.08,1.08]){const p=A.boat.localToWorld(new T.Vector3(.55,.55,z));const d=new T.Vector3(1,0,0).applyQuaternion(A.boat.quaternion);ray.set(p,d);if(ray.intersectObject(o,true).length)n++;}return n;}""");assert result['riser_wing_hits']==2
   assert page.evaluate("ATLAS_RADIO.inspect().contextState==='not-created'&&!ATLAS_RADIO.wanted")
   page.locator('#radio-open').click();page.locator('#radio-play').click()
   page.wait_for_function("ATLAS_RADIO.inspect().playing&&ATLAS_RADIO.audio.currentTime>.5&&ATLAS_RADIO.peak>.0001",timeout=45000)
   result['radio_playback']=page.evaluate('ATLAS_RADIO.inspect()');assert result['radio_playback']['sourceKind']=='original'
   assert page.evaluate('!!ATLAS_RADIO.stereo08');page.locator('#radio-seek').evaluate('(e)=>{e.value=500;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   page.wait_for_function('ATLAS_RADIO.audio.currentTime>25');result['radio_seek_and_stereo']=True
   shot(page,f'{dev}_radio.png')
   page.locator('#radio-next').click();page.wait_for_function("ATLAS_RADIO.track.title==='Tidal Run'&&!ATLAS_RADIO.audio.paused&&ATLAS_RADIO.audio.currentTime>.2",timeout=45000)
   page.locator('#radio-volume').evaluate('(e)=>{e.value=25;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   assert page.evaluate('ATLAS_RADIO.volume===.25');page.locator('#radio-output').select_option('direct');assert page.evaluate("ATLAS_RADIO.outputMode==='direct'")
   audio_file=Path(os.environ.get('RADIO_TEST_FILE',Path(__file__).parent/'site/assets/audio/lowcountry_drift.ogg'))
   page.locator('#radio-files').set_input_files(str(audio_file))
   page.wait_for_function("ATLAS_RADIO.track.kind==='local'&&!ATLAS_RADIO.audio.paused",timeout=45000)
   assert page.evaluate("ATLAS_RADIO.audio.src.startsWith('blob:')");result['local_music_playback']=True
   page.locator('#radio-tracks').select_option('0');page.wait_for_function("ATLAS_RADIO.track.kind==='original'&&!ATLAS_RADIO.audio.paused",timeout=45000)
   page.locator('#radio-panel summary').click();page.locator('#radio-url').fill('javascript:alert(1)');page.locator('#radio-load-stream').click()
   assert 'HTTPS' in page.locator('#radio-status').inner_text() or page.evaluate("ATLAS_RADIO.error.includes('HTTPS')");result['unsafe_stream_input_rejected']=True
   page.locator('#radio-tracks').select_option('0');page.wait_for_function("!ATLAS_RADIO.error&&!ATLAS_RADIO.audio.paused",timeout=45000)
   page.locator('#radio-screen').click();assert page.locator('#radio-panel').is_hidden();assert page.evaluate("CMD_INSTRUMENTS.screenPage==='radio'")
   page.wait_for_timeout(400);shot(page,f'{dev}_radio_cockpit.png')
   # Music follows a visible pause control; audio resumes only after it is released.
   if not page.evaluate('BAYPLAY.inspect().paused'):page.locator('#sea08-pause').click()
   page.wait_for_function('ATLAS_RADIO.held&&ATLAS_RADIO.audio.paused');result['radio_pause_link']=True
   page.locator('#sea08-pause').click();page.wait_for_function('!ATLAS_RADIO.held&&!ATLAS_RADIO.audio.paused',timeout=45000)
   page.locator('#radio-open').click();page.locator('#radio-play').click();assert page.evaluate('!ATLAS_RADIO.wanted');page.locator('#radio-close').click()
   page.evaluate("CMD_INSTRUMENTS.screenPage='sonar';CMD.setLayout('helm');BAYPLAY.refresh()")
   result['radio_controls_completed']=True
   shot(page,f'{dev}_helm.png')
   if dev=='desktop':
    page.locator('#console-focus').click();shot(page,'desktop_console.png');page.locator('#cmd-panels').click();shot(page,'desktop_console_clean.png');page.locator('#cmd-show').click();page.locator('#return-helm').click()
   # Prove rendered user controls work before any accelerated run.
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   page.locator('#cmd-engine').click();driving_wait(page,'BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',result)
   page.locator('[data-cmd-gear="1"]').click();page.locator('#quick-throttle [data-power="1"]').click()
   driving_wait(page,'BAYPLAY.state.speedOverGround>1',result);result['rendered_forward']=True
   page.locator('#cmd-sound').click();page.wait_for_function('BAYPLAY.audio.sampleStatus==="Recorded texture ready"',timeout=30000)
   driving_wait(page,'BAYPLAY.audio.metrics.rms>0.00005&&!BAYPLAY.audio.held',result);result['audio']=page.evaluate('BAYPLAY.audio.inspect()')
   result['frame_timing']=page.evaluate('JSON.parse(JSON.stringify(SEA_TIMING))')
   assert result['audio']['metrics']['activeEngines']==1;assert result['audio']['metrics']['engineLoads'][0]['recorded']
   page.locator('#cmd-neutral').click();page.wait_for_timeout(500);assert page.evaluate('BAYPLAY.state.gear===0&&BAYPLAY.state.speedOverGround>0');result['coasting']=True
   
   if not page.evaluate('BAYPLAY.inspect().paused'):page.locator('#sea08-pause').click()
   page.wait_for_function('BAYPLAY.inspect().paused&&BAYPLAY.audio.held');result['pause_mutes']=True
   page.locator('#mfd-open').click();page.evaluate('BAYPLAY.refresh()');assert page.locator('#mfd-panel').is_visible()
   page.locator('#mfd-theme').click();assert page.evaluate('CMD_INSTRUMENTS.theme==="night"');page.locator('#mfd-theme').click()
   page.locator('#mfd-orient').click();assert page.evaluate('CMD_INSTRUMENTS.headingUp');page.locator('#mfd-orient').click()
   page.locator('#mfd-gain').evaluate('(e)=>{e.value=75;e.dispatchEvent(new Event("input",{bubbles:true}));}');assert page.evaluate('CMD_INSTRUMENTS.gain===.75')
   page.locator('#mfd-range').select_option('60');assert page.evaluate('CMD_INSTRUMENTS.depthRange===60')
   if dev=='phone':page.locator('#mfd-echo-only').click()
   shot(page,f'{dev}_instruments.png');result['mfd_controls']=True
   page.locator('#mfd-scroll').select_option('2');assert page.evaluate('CMD_INSTRUMENTS.scrollRate===2')
   page.locator('#mfd-engine-page').click();page.evaluate('BAYPLAY.refresh()');assert page.evaluate('CMD_INSTRUMENTS.screenPage==="engines"');shot(page,f'{dev}_engine_monitor.png')
   page.locator('#mfd-chart-only').click();page.locator('#mfd-target').click()
   bb=page.locator('#mfd-chart').bounding_box();page.mouse.click(bb['x']+bb['width']*.63,bb['y']+bb['height']*.57)
   assert page.evaluate('CMD_INSTRUMENTS.navigation(BAYPLAY.state).distanceNM>0');result['waypoint']=page.evaluate('CMD_INSTRUMENTS.navigation(BAYPLAY.state)');page.evaluate('BAYPLAY.refresh()');shot(page,f'{dev}_chart_target.png')
   page.locator('#mfd-clear-target').click();assert page.evaluate('CMD_INSTRUMENTS.waypoint===null')
   page.locator('#mfd-both').click();page.locator('#mfd-scroll').select_option('1')
   page.locator('#mfd-close').click();assert page.locator('#mfd-panel').is_hidden()
   page.locator('#mix-open').click();page.locator('#mix-master').evaluate('(e)=>{e.value=35;e.dispatchEvent(new Event("input",{bubbles:true}));}')
   assert page.evaluate('BAYPLAY.audio.settings.master===.35');shot(page,f'{dev}_audio_mix.png');page.locator('#mix-close').click();result['mixer']=True
   # Apply rigs through actual configuration; long tests run the shipped integrator.
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="single300"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-apply').click()
   page.locator('.workspace-tabs [data-workspace="test"]').click();page.locator('#test-kind').select_option('top');page.locator('#test-run').click();page.evaluate('BAYPLAY.testStep(70)')
   page.wait_for_function('!CMD_LAB.active&&CMD_LAB.results.length>0');r=page.evaluate('({...CMD_LAB.results.at(-1),trace:undefined})');result['single300_test']=r;assert 48<r['peakMph']<53
   result['history_during_fixed_steps']=page.evaluate('CMD_INSTRUMENTS.history.length');assert result['history_during_fixed_steps']>=300
   # A large, persistent knot speed indicator must agree with simulated state.
   page.evaluate('CMD.setWorkspace("drive");CMD.setLayout("helm");BAYPLAY.setPaused(true)');page.wait_for_timeout(350)
   kn=page.evaluate('BAYPLAY.state.speedOverGround*3600/1852');display=float(page.locator('#speed-knots').inner_text());assert abs(kn-display)<.11;result['knots']=display
   page.locator('#cmd-panels').click();assert page.locator('#speed-hud').is_visible();assert page.locator('#cmd-restore').is_visible();assert page.locator('#sea08-pause').is_visible();shot(page,f'{dev}_cruise_clear.png');page.locator('#cmd-show').click()
   page.locator('#sea08-pause').click();driving_wait(page,'SEA08.inspect().sprayEmissions>0',result);page.locator('#sea08-pause').click()
   result['water_effects']=page.evaluate('SEA08.inspect()');assert result['water_effects']['wakeEmissions']>0
   page.evaluate('BAYPLAY.setCamera("follow");BAYPLAY.refresh()');page.wait_for_timeout(600);shot(page,f'{dev}_underway_exterior.png');page.evaluate('BAYPLAY.setCamera("helm");BAYPLAY.refresh()')
   page.locator('#pure-cockpit').click();assert page.locator('#speed-hud').is_hidden();page.locator('#pure-cockpit').click();assert page.locator('#speed-hud').is_visible();result['pure_cockpit']=True
   # Show actual two-engine audio and visible engine configuration.
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('[data-rig="twin300"]').click();page.locator('#cfg-location').select_option('basin');page.locator('#cfg-drive').click();page.wait_for_function('CMD.motorCount===2')
   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()
   page.locator('#cmd-engine').click();driving_wait(page,'BAYPLAY.state.startTimer===0&&BAYPLAY.state.engine',result);page.locator('[data-cmd-gear="1"]').click();page.locator('#quick-throttle [data-power="0.55"]').click();driving_wait(page,'BAYPLAY.audio.metrics.activeEngines===2&&BAYPLAY.audio.metrics.engineLoads[1].gain>0',result);result['twin_audio']=page.evaluate('BAYPLAY.audio.inspect()')
   if dev=='desktop':
    # Record actual graph output under running controls, not a third-party audio substitute.
    page.evaluate('''() => {const a=BAYPLAY.audio;const chunks=[];window.__recorded=null;const rec=new MediaRecorder(a.recordOutput.stream);rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const f=new FileReader();f.onload=()=>window.__recorded=f.result.split(',')[1];f.readAsDataURL(new Blob(chunks,{type:rec.mimeType}));};rec.start();setTimeout(()=>rec.stop(),8000);}''')
    page.wait_for_function('window.__recorded!==null',timeout=25000)
    (OUT/'App_Sound_Preview.webm').write_bytes(base64.b64decode(page.evaluate('window.__recorded')))
   # Read sensor no-data state rather than showing a false depth.
   assert page.evaluate('CMD_INSTRUMENTS.depth({depth:null,airborne:false})===null && CMD_INSTRUMENTS.depth({depth:5,airborne:true})===null')
   assert page.evaluate('CMD_INSTRUMENTS.course({speedOverGround:0})===null');result['no_false_sensors']=True
   assert page.evaluate('CMD_INSTRUMENTS.sensorOffset===.45')
   page.locator('#cmd-neutral').click();
   if not page.evaluate('BAYPLAY.inspect().paused'):page.locator('#sea08-pause').click()
   page.locator('#mfd-open').click();page.evaluate('BAYPLAY.refresh()')
   if dev=='desktop':page.locator('#mfd-both').click()
   shot(page,f'{dev}_twin_displays.png');page.locator('#mfd-close').click()
   page.locator('.workspace-tabs [data-workspace="configure"]').click();page.locator('#cfg-physics').select_option('reference');page.locator('#cfg-apply').click();assert page.evaluate('BAYPLAY.state.performanceMode==="reference" && CMD.motorCount===1')
   page.evaluate('BAYPLAY.state.armReferenceTest(5800);BAYPLAY.testStep(69)');v=page.evaluate('BAYPLAY.state.u/.44704');assert abs(v-50.9)<.06;result['reference_mph']=v
   page.evaluate('CMD.setWorkspace("configure");BAYPLAY.setPaused(false)')
   page.evaluate('BAYPLAY.setMode("inspect");BAYPLAY.setCamera("deck");BAYPLAY.action("fishbox")')
   page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.96',timeout=45000);shot(page,f'{dev}_fishbox_open.png')
   page.evaluate('BAYPLAY.action("fishbox");BAYPLAY.action("drawer1");BAYPLAY.setCamera("tackle")')
   page.wait_for_function('BAYPLAY.inspect().drawers[0].value>.95',timeout=45000);shot(page,f'{dev}_tackle.png')
   result['retained_lid_and_drawer_motion']=True
   page.evaluate('BAYPLAY.action("drawer1");BAYPLAY.setCamera("orbit");BAYPLAY.refresh()');page.wait_for_timeout(700);shot(page,f'{dev}_boat_finish.png')
   if dev=='desktop':
    page.evaluate('BAYPLAY.setPaused(true);BAYPLAY.setQuality(false);BAYPLAY.setCamera("orbit");BAYPLAY.refresh()');page.wait_for_timeout(1200)
    page.locator('#cmd-panels').click();shot(page,'desktop_boat_high_detail.png');page.locator('#cmd-show').click();page.evaluate('BAYPLAY.setQuality(true)')
   result['document_width']=page.evaluate('document.documentElement.scrollWidth');assert result['document_width']<=w+2
   assert not shader_errors,shader_errors;assert not errs,errs;assert not fails,fails;result['passed']=True
  except Exception as e:
   report['passed']=False;result['exception']=str(e);result['traceback']=traceback.format_exc()
   try:result['failure_state']=page.evaluate('({timing:window.SEA_TIMING,s:window.SEA05?.inspect(),cmd:window.CMD?.inspect(),app:window.BAYPLAY?.inspect()})');shot(page,f'{dev}_ERROR.png')
   except Exception as s:result['screenshot_error']=str(s)
  finally:ctx.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
 browser.close()
print(json.dumps({'passed':report['passed'],'tests':[{'device':r['device'],'passed':r['passed'],'exception':r.get('exception')} for r in report['tests']]},indent=2))
assert report['passed'],'Sea Lab 08 checks failed'
