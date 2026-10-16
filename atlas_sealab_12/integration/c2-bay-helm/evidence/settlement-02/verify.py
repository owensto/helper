"""Actual-host endstop approach/return/paused motion, with unchanged H4 contact probes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,traceback,hashlib
ROOT=Path(os.environ['C2_OUT']);OUT=ROOT/'settlement';OUT.mkdir(exist_ok=True)
DEV=os.environ['TEST_DEVICE'];W,H=(1440,960) if DEV=='desktop' else (430,932)
URL=os.environ.get('SETTLEMENT_URL','http://127.0.0.1:8938/index.html')
r={'sourceSHA':os.environ['GITHUB_SHA'],'device':DEV,'passed':False,'scope':'actual host fitting motion and H4 diagnostic lifecycle; not full-body feasibility','tests':[],'errors':[],'shaderErrors':[],'assetErrors':[],'publicActivation':False,'fullBodyAccepted':False,'snapshots':[]}
def check(name,result=True):
 assert result is not False,name
 r['tests'].append({'name':name,'passed':True,'result':result})
def fresh(p):
 n=p.evaluate('C2.inspect().frameId')
 p.wait_for_function('(n)=>C2.read()?.receiverAccepted===true&&C2.read().context.frameId>n&&C2.read().context.bolsterState.downStable',arg=n,timeout=60000)
def snapshot(p,label):
 n=p.evaluate('(label)=>C2Occupancy.request(label)',label)
 p.wait_for_function('(n)=>C2Occupancy.read().count>n||C2Occupancy.read().errors.length',arg=n,timeout=120000)
 d=p.evaluate('C2Occupancy.read()');assert not d['errors'],d['errors'];s=d['snapshots'][-1]
 assert len(s['sources'])==61 and all(x['geometryVerified'] for x in s['sources'])
 raw=(json.dumps(s,indent=2)+'\n').encode();f=OUT/(DEV+'_'+label+'.json');f.write_bytes(raw)
 r['snapshots'].append({'file':f.name,'sha256':hashlib.sha256(raw).hexdigest(),'frame':s['snapshotContext']['committedFrameId'],'accepted':s['snapshotContext']['currentReceiverAccepted']})
 p.screenshot(path=str(OUT/(DEV+'_'+label+'.png')),timeout=60000)
 return s
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':W,'height':H},has_touch=DEV=='phone',record_video_dir=str(OUT/'video'),record_video_size={'width':min(W,960),'height':min(H,720)})
 p=c.new_page();p.set_default_timeout(60000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)))
 p.on('response',lambda q:r['assetErrors'].append([q.status,q.url]) if q.status>=400 and '127.0.0.1' in q.url and 'favicon' not in q.url else None)
 p.on('console',lambda m:r['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader','validate_status','program info log']) else None)
 try:
  p.goto(URL+'?bayHuman=1',wait_until='domcontentloaded',timeout=120000)
  p.wait_for_function('window.C2_READY||window.C2_ERROR',timeout=120000);assert p.evaluate('window.C2_READY'),p.evaluate('C2_ERROR')
  p.evaluate('BAYPLAY.setPaused(true);SEA09.view("captain")');fresh(p)
  check('Same existing captain, single factory, unchanged vessel step',p.evaluate('C2_FACTORY_BUILDS===1&&BAYPLAY.state.step===C2_ORIGINAL_STEP&&C2.inspect().existingCaptainUUID===C2_ORIGINAL_CAPTAIN'))
  s0=snapshot(p,'h4_down');check('Actual down is exact endpoint and accepted 87 selected probes',s0['bolsters']['settlement']['downStable'] and s0['selectedContactCheck']['valid'] and s0['selectedContactCheck']['probeCount']==87)
  # Trigger the unchanged owner action synchronously, then commit without time
  # advancement. The command itself invalidates, even before physical movement.
  p.evaluate('C3SettlementTrace.clear();BAYPLAY.action("bolsters");SEA06.beforeRender()')
  start=p.evaluate('C3SettlementTrace.read().at(-1)');r['departure']=start
  check('Target departure invalid before moving',not start['receiverAccepted'] and start['settlement']['transitioning'] and start['raw']['target']==1)
  seconds=start['hostSeconds']
  p.wait_for_function('BAYPLAY.inspect().bolsters.value>0&&BAYPLAY.inspect().bolsters.value<1');snapshot(p,'h4_approach')
  p.wait_for_function('BAYPLAY.inspect().bolsters.value===1',timeout=120000)
  up=snapshot(p,'h4_up');check('Approach seats actual geometry at exact 85 degrees; up remains unavailable',up['bolsters']['settlement']['phase']=='up-settled' and not up['snapshotContext']['currentReceiverAccepted'] and all(x['angleZRad']==3.141592653589793*85/180 for x in up['bolsters']['pivots']))
  p.evaluate('BAYPLAY.action("bolsters");SEA06.beforeRender()');p.wait_for_function('BAYPLAY.inspect().bolsters.value>0&&BAYPLAY.inspect().bolsters.value<1')
  snapshot(p,'h4_returning');p.wait_for_function('BAYPLAY.inspect().bolsters.value===0',timeout=120000);fresh(p)
  down=snapshot(p,'h4_returned_down');check('Return reacquires only actual zero and stable physical pivots',down['snapshotContext']['currentReceiverAccepted'] and down['bolsters']['aggregate']=={'value':0,'target':0} and not down['bolsters']['transitioning'] and all(x['angleZRad']==0 for x in down['bolsters']['pivots']))
  trace=p.evaluate('C3SettlementTrace.read()');r['trace']=trace
  check('Real fitting motion with frozen physics seconds',len(trace)>8 and all(x['hostSeconds']==seconds for x in trace) and any(0<x['raw']['value']<1 for x in trace))
  check('No accepted current receiver while moving, up or incoherent',all(not x['receiverAccepted'] or (x['settlement']['downStable'] and x['raw']=={'value':0,'target':0} and x['skinValid']) for x in trace))
  check('Telemetry uses exactly the validity predicate',all(x['settlement']['transitioning']==(not x['settlement']['settled']) for x in trace if x['settlement']['phase']!='invalid'))
  check('Finite near-threshold values remain unavailable on actual approach and return',any(1e-5<x['raw']['value']<.01 and x['raw']['target']==0 and not x['receiverAccepted'] for x in trace) and any(1e-5<1-x['raw']['value']<.01 and x['raw']['target']==1 and not x['receiverAccepted'] for x in trace))
  ev=p.evaluate('CoreBayBolsterState.snapEvents()');r['snapEvents']=ev
  check('Both actual fitting snap events lie inside 1e-5; geometry reaches endpoint',len(ev)>=2 and {x['target'] for x in ev}=={0,1} and all(abs(x['target']-x['raw'])<=1e-5 and x['next']==x['target'] and x['fittingDt']>0 for x in ev))
  # Physical tamper: no hand/pose change or invented successful skin contact.
  p.evaluate('BAYPLAY.capturePaused=true;window.c3pivot=BAYPLAY.model.getObjectByName("PLAY_BOLSTER_2");c3pivot.rotation.z=.00001;SEA06.beforeRender()')
  bad=p.evaluate('C3SettlementTrace.read().at(-1)');r['tamperedPivot']=bad
  check('Actual nonzero pivot cannot be accepted behind zero aggregate',not bad['receiverAccepted'] and bad['settlement']['phase']=='invalid')
  p.evaluate('c3pivot.rotation.z=0;SEA06.beforeRender();BAYPLAY.capturePaused=false');fresh(p)
  check('Exact pivot restoration needs and receives fresh frame',p.evaluate('C2.read().skin.valid&&C2.read().context.bolsterState.downStable'))
  # Same controls/thresholds after recovery, no new captain.
  old=down['snapshotContext']['clock']['epoch']
  p.evaluate('SEA10.recover();BAYPLAY.setPaused(true);SEA09.view("captain")');fresh(p);reset=snapshot(p,'h4_reset')
  check('Reset retains identity and exact down with advancing epoch',reset['avatar']['uuid']==s0['avatar']['uuid'] and reset['snapshotContext']['clock']['epoch']>old and reset['bolsters']['settlement']['downStable'])
  check('Known fixed-source deep witness is retained, not converted to clearance pass',s0['knownH6WitnessCurrentH4']['threeOddParity'] and s0['knownH6WitnessCurrentH4']['nearestSurfaceDistanceM']>.05 and not s0['fullBodyAccepted'])
  check('H4 pin, no H5/H7 adoption or gameplay activation',not reset['H7Adopted'] and not reset['H5RegionAdopted'] and not reset['decision']['gameplayOccupancyAvailable'])
  check('No page/shader/application-asset errors',not r['errors'] and not r['shaderErrors'] and not r['assetErrors']);r['passed']=True
 except Exception as e:
  r['exception']=str(e);r['traceback']=traceback.format_exc()
  try:r['failureState']=p.evaluate('({inspect:C2.inspect(),current:C2.read(),trace:C3SettlementTrace.read(),raw:BAYPLAY.inspect().bolsters})');p.screenshot(path=str(OUT/(DEV+'_ERROR.png')),timeout=60000)
  except Exception:pass
 finally:c.close();b.close()
(OUT/'validation.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['trace','failureState']},indent=2));assert r['passed'],'Settlement actual-host gate failed'
