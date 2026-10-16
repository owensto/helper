"""C2 physical/clock boundary on the exact current host. Positive human checks remain separately gated."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,time,traceback
ROOT=Path(os.environ.get('C2_OUT','/tmp/atlas-c2-bay-helm'));OUT=ROOT/'review';OUT.mkdir(parents=True,exist_ok=True)
DEV=os.environ.get('TEST_DEVICE','desktop');W,H=(1440,960) if DEV=='desktop' else (430,932);URL=os.environ.get('BASE_URL','http://127.0.0.1:8936/index.html')
r={'task':'C2-BAY-HELM-01','device':DEV,'url':URL,'candidateSourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'passed':False,'scope':'actual Bay host physical-contact and clock bridge; existing procedural captain retained; HUMAN FACTORY NOT ACTIVATED','combinedAcceptance':False,'positiveHumanAcceptance':False,'tests':[],'errors':[],'shaderErrors':[],'assetErrors':[]}
def test(name,value=True):
 assert value is not False,name
 r['tests'].append({'name':name,'passed':True,'result':value})
def shot(p,name):
 state=p.evaluate('''()=>{const q={paused:BAYPLAY.inspect().paused,reason:BAYPLAY.pauseReason||null,time:BAYPLAY.state.elapsed};BAYPLAY.capturePaused=true;BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);return q}''');r.setdefault('captures',{})[name]=state
 try:p.screenshot(path=str(OUT/f'{DEV}_{name}.png'),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
def wait(p,expr):
 for _ in range(4):
  p.wait_for_function('BAYPLAY.pauseReason==="render-stall" || ('+expr+')',timeout=60000)
  if p.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  r.setdefault('stallRecoveries',[]).append(p.evaluate('({...SEA_TIMING})'));p.locator('#sea10-resume').click()
 raise AssertionError('REPEATED_RENDER_STALLS')
def physical_ready(p):p.wait_for_function('C2.read()?.physicalAvailable===true',timeout=45000)
with sync_playwright() as pw:
 kw={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('CHROMIUM_PATH'):kw['executable_path']=os.environ['CHROMIUM_PATH']
 b=pw.chromium.launch(**kw);c=b.new_context(viewport={'width':W,'height':H},has_touch=DEV=='phone',record_video_dir=str(OUT/'video'),record_video_size={'width':min(W,960),'height':min(H,720)});p=c.new_page();p.set_default_timeout(45000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(t in m.text.lower() for t in ['shader','validate_status','program info log']) else None);p.on('response',lambda q:r['assetErrors'].append([q.status,q.url]) if q.status>=400 and URL.rsplit('/',1)[0] in q.url and 'favicon' not in q.url else None)
 try:
  p.goto(URL,wait_until='domcontentloaded',timeout=120000);p.wait_for_function('window.C2_READY || window.C2_ERROR',timeout=120000);assert p.evaluate('window.C2_READY'),p.evaluate('window.C2_ERROR')
  p.evaluate('BAYPLAY.setPaused(true)');physical_ready(p)
  test('Exact source, current existing captain and no human activation',p.evaluate('BAYPLAY.state.step===C2_ORIGINAL_STEP && BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").uuid===C2_ORIGINAL_CAPTAIN && !C2.inspect().positiveFactoryEnabled'))
  test('Actual finite source patches bound',p.evaluate('C2.inspect().physicalAudit'))
  p.evaluate('C2.showContacts(true);SEA09.view("captain")');shot(p,'source_contacts')
  test('No remote yacht or multiplayer scope',p.evaluate('!C2.inspect().yachtAvailable&&!C2.inspect().multiplayer'))
  p.evaluate('SEA09.view("helm")');p.locator('#helm09-pause').click();p.locator('#helm09-map').click();t=p.evaluate('BAYPLAY.state.elapsed');wait(p,f'BAYPLAY.state.elapsed>{t+.12}&&!BAYPLAY.inspect().paused');test('Map continues real host clock',{'start':t,'end':p.evaluate('BAYPLAY.state.elapsed')});test('Map drive controls remain reachable',p.evaluate('''()=>['helm09-key','s11-more'].every(id=>{const e=document.getElementById(id),q=e.getBoundingClientRect();return document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)?.closest('button')?.id===id})'''));shot(p,'map_no_pause');assert not r['captures']['map_no_pause']['paused'];p.locator('#helm09-mapclose').click()
  p.locator('#helm09-key').click();wait(p,'BAYPLAY.state.engine&&BAYPLAY.state.startTimer===0');p.locator('[data-gear09="1"]').click();p.locator('#s12-wot').click();wait(p,'BAYPLAY.state.speedOverGround>1');test('Existing ignition and WOT still operate',p.evaluate('({speed:BAYPLAY.state.speedOverGround,rpm:BAYPLAY.state.rpm})'))
  p.evaluate('SEA09.view("captain")');physical_ready(p)
  before=p.evaluate('C2.inspect().samples.at(-1)?.frameId||0');p.wait_for_timeout(2500)
  q=p.locator('#s11-left').bounding_box();p.mouse.move(q['x']+q['width']/2,q['y']+q['height']/2);p.mouse.down();p.wait_for_timeout(1500);p.mouse.up();p.locator('[data-gear09="-1"]').click();p.wait_for_timeout(1500)
  r['motion']=p.evaluate('(start)=>({samples:C2.inspect().samples.filter(s=>s.frameId>start),events:C2.inspect().events,host:{x:BAYPLAY.state.x,z:BAYPLAY.state.z,heading:BAYPLAY.state.heading,gear:BAYPLAY.state.gear,seconds:BAYPLAY.state.elapsed,timing:{...SEA_TIMING}}})',before)
  assert len(r['motion']['samples'])>=2
  test('Continuous actual source contact linkage during real host motion',{'samples':len(r['motion']['samples']),'maxSourceContactErrorM':max(s['physicalErrorM'] for s in r['motion']['samples']),'humanJointChecks':False});assert all(s['physicalErrorM']<1e-6 and not s['receiverUpdated'] for s in r['motion']['samples']);shot(p,'maneuver_contacts')
  p.evaluate('BAYPLAY.setPaused(true)');physical_ready(p)
  test('Reads do not advance clock or physics',p.evaluate('''()=>{const t=BAYPLAY.state.elapsed,fn=BAYPLAY.state.step;for(let i=0;i<100;i++)C2.read();return t===BAYPLAY.state.elapsed&&fn===BAYPLAY.state.step}'''))
  old=p.evaluate('C2.inspect().frameId');p.wait_for_timeout(400);physical_ready(p);test('Paused new frames consume zero host delta',p.evaluate('(start)=>C2.inspect().samples.filter(s=>s.frameId>start).every(s=>s.dt===0)',old))
  # Deliberate negative scenarios change the actual host, not a fake acceptance fixture.
  p.evaluate('BAYPLAY.state.airborne=true');p.wait_for_function('C2.inspect().reason==="AIRBORNE_OCCUPANCY_UNSUPPORTED"');test('Airborne actual occupancy fails closed');p.evaluate('BAYPLAY.state.airborne=false');physical_ready(p)
  p.evaluate('BAYPLAY.action("bolsters")');p.wait_for_function('C2.inspect().reason==="BOLSTER_TRANSITION_UNAVAILABLE"');test('Opening actual bolsters invalidates contact');p.evaluate('BAYPLAY.action("bolsters")');physical_ready(p)
  p.evaluate('window.c2Captain=BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN");BAYPLAY.scene.attach(c2Captain)');p.wait_for_function('C2.inspect().reason==="CAPTAIN_DETACHED"');test('Detached actual captain invalidates support');p.evaluate('BAYPLAY.boat.add(c2Captain);c2Captain.position.set(-1.6,1.06,.18);c2Captain.rotation.set(0,0,0);c2Captain.scale.set(1,1,1)');physical_ready(p)
  p.evaluate('BAYPLAY.state.destroyed10=true');p.wait_for_function('C2.inspect().reason==="VESSEL_DESTROYED"');test('Destroyed actual host invalidates support');p.evaluate('BAYPLAY.state.destroyed10=false;BAYPLAY.model.visible=true');physical_ready(p)
  oldEpoch=p.evaluate('C2.read().frame.epoch');p.evaluate('SEA10.recover();BAYPLAY.setPaused(true)');physical_ready(p);test('Actual recovery/reset has fresh clock epoch and same captain',p.evaluate('(old)=>C2.read().frame.epoch!==old && BAYPLAY.boat.getObjectByName("SEA12_CAPTAIN").uuid===C2_ORIGINAL_CAPTAIN',oldEpoch))
  p.evaluate('SEA10.chooseWeather("swell")');physical_ready(p);p.evaluate('BAYPLAY.setPaused(false)');t=p.evaluate('BAYPLAY.state.elapsed');wait(p,f'BAYPLAY.state.elapsed>{t+2}');p.evaluate('BAYPLAY.setPaused(true)');physical_ready(p);shot(p,'rough_contacts');test('Weather revision reacquires physical observation',p.evaluate('C2.read().physicalAvailable'))
  test('Global observations do not expose raw private registration',p.evaluate('!JSON.stringify(C2.inspect()).includes("runtimeScopeId") && !JSON.stringify(C2.read()).includes("vesselInstanceId")'))
  p.evaluate('C2.showContacts(false);SEA09.view("captain")');shot(p,'captain_unchanged')
  r['final']=p.evaluate('C2.inspect()');assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'];test('No page, shader or owned asset failures');assert p.evaluate('document.documentElement.scrollWidth')<=W+2;r['passed']=True
 except Exception as e:
  r['exception']=str(e);r['traceback']=traceback.format_exc()
  try:r['state']=p.evaluate('({c2:window.C2?.inspect(),error:window.C2_ERROR,host:window.BAYPLAY?.inspect()})');shot(p,'ERROR')
  except Exception:pass
 finally:
  c.close();b.close();(OUT/'validation.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
assert r['passed'],'C2 actual-host boundary review failed'
