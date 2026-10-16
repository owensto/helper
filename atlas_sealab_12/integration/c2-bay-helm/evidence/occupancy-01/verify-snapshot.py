"""Actual current-host state inventory, not human calibration or full-body clearance acceptance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,hashlib,traceback
ROOT=Path(os.environ['C2_OUT']);OUT=ROOT/'occupancy';OUT.mkdir(parents=True,exist_ok=True)
DEV=os.environ['TEST_DEVICE'];w,h=(1440,960) if DEV=='desktop' else (430,932);URL='http://127.0.0.1:8937/index.html'
report={'revision':'core-bay-occupancy-capture/1','device':DEV,'sourceSHA':os.environ['GITHUB_SHA'],'runtimeBaseSHA':'f641b5f2eaf2305e9c86b851843304260a811078','passed':False,'snapshotTests':[],'snapshots':[],'errors':[],'fullBodyAccepted':False,'publicActivation':False,'H7Adopted':False}
sha=lambda b:hashlib.sha256(b).hexdigest()
def test(name,result=True):
 assert result is not False,name
 report['snapshotTests'].append({'name':name,'passed':True,'result':result})
def snap(p,label):
 before=p.evaluate('(label)=>C2Occupancy.request(label)',label)
 p.wait_for_function('(n)=>C2Occupancy.read().count>n || C2Occupancy.read().errors.length>0',arg=before,timeout=120000)
 data=p.evaluate('C2Occupancy.read()');assert not data['errors'],data['errors'];s=data['snapshots'][-1]
 assert s['label']==label and len(s['sources'])==61 and all(x['geometryVerified'] for x in s['sources'])
 assert s['snapshotContext']['hostUnchangedBySourceScan'] and s['snapshotContext']['registeredVesselInstanceId']
 payload=(json.dumps(s,indent=2)+'\n').encode();path=OUT/(DEV+'_'+label+'.json');path.write_bytes(payload)
 report['snapshots'].append({'label':label,'file':path.name,'sha256':sha(payload),'frame':s['snapshotContext']['committedFrameId'],'clock':s['snapshotContext']['clock'],'activation':s['snapshotContext']['activationEpoch'],'receiverAccepted':s['snapshotContext']['currentReceiverAccepted'],'reason':s['snapshotContext']['reason'],'avatar':s['avatar'],'witness':s['knownH6WitnessCurrentH4'],'bolsters':{'aggregate':s['bolsters']['aggregate'],'pivots':[{k:r[k] for k in ['name','uuid','angleZRad']} for r in s['bolsters']['pivots']]},'originalRestMatches':sum(r['matrices']['matchesOriginalRest'] for r in s['sources'])})
 p.screenshot(path=str(OUT/(DEV+'_'+label+'.png')),timeout=60000)
 return s
defaults={}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for flag in [False,True]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=DEV=='phone',record_video_dir=str(OUT/'video'),record_video_size={'width':min(w,960),'height':min(h,720)})
   p=c.new_page();p.set_default_timeout(60000);p.on('pageerror',lambda e:report['errors'].append(str(e)))
   try:
    p.goto(URL+('?bayHuman=1' if flag else ''),wait_until='domcontentloaded',timeout=120000)
    p.wait_for_function('window.C2_READY||window.C2_ERROR',timeout=120000);assert p.evaluate('window.C2_READY'),p.evaluate('C2_ERROR')
    p.evaluate('BAYPLAY.setPaused(true);SEA09.view("captain")');p.wait_for_function('C2.read()?.physicalAvailable===true')
    if flag:p.wait_for_function('C2.read()?.receiverAccepted===true')
    label='h4' if flag else 'procedural';first=snap(p,label+'_down')
    test(label+' complete 61-source identity/geometry capture')
    if flag:
     test('Actual pinned H4 captain, not procedural substitution',first['avatar']['evaluatedSkin'] and first['avatar']['indexedVertexCount']==4687 and first['avatar']['nominalHeightM']==1.93)
     test('H4 87 selected contact probes distinct from body clearance',first['selectedContactCheck']['valid'] and first['fullBodyAccepted'] is False)
     p.evaluate('SEA09.view("helm")');hidden=snap(p,'h4_camera_hidden');test('Camera concealment is not collision exclusion',not hidden['avatar']['ownVisible'] and all(s['collisionPolicy']['collisionParticipation'] for s in hidden['sources']))
     p.evaluate('SEA09.view("captain")')
    seconds=p.evaluate('BAYPLAY.state.elapsed');p.evaluate('BAYPLAY.action("bolsters")');p.wait_for_function('BAYPLAY.inspect().bolsters.value>0 && BAYPLAY.inspect().bolsters.value<.99');middle=snap(p,label+'_bolster_transition')
    test(label+' fittings move while physics seconds are paused',middle['snapshotContext']['clock']['seconds']==seconds and middle['bolsters']['aggregate']['target']==1 and middle['snapshotContext']['reason']=='BOLSTER_TRANSITION_UNAVAILABLE')
    p.wait_for_function('BAYPLAY.inspect().bolsters.value>.9999',timeout=120000);up=snap(p,label+'_bolsters_up')
    test(label+' both evaluated bolster angles captured',all(x['angleZRad']>1.48 for x in up['bolsters']['pivots']))
    original={s['originalNodeIndex']:s for s in first['sources']};later={s['originalNodeIndex']:s for s in up['sources']}
    report.setdefault('articulationComparisons',[]).append({'mode':label,'nodes':[{'node':i,'originalParents':[p['name'] for p in original[i]['parentChain']],'upParents':[p['name'] for p in later[i]['parentChain']],'maxVesselMatrixDelta':max(abs(a-b) for a,b in zip(original[i]['matrices']['currentVessel'],later[i]['matrices']['currentVessel']))} for i in [138,148,137,147,81,139]]})
    p.evaluate('BAYPLAY.action("bolsters")');p.wait_for_function('BAYPLAY.inspect().bolsters.value<.0001');p.wait_for_function('C2.read()?.physicalAvailable===true')
    if flag:p.wait_for_function('C2.read()?.receiverAccepted===true')
    down=snap(p,label+'_returned_down');test(label+' unchanged single-captain identity after articulation',first['avatar']['uuid']==down['avatar']['uuid'])
    if flag:
     old=down['snapshotContext']['clock']['epoch'];p.evaluate('SEA10.recover();BAYPLAY.setPaused(true);SEA09.view("captain")');p.wait_for_function('C2.read()?.receiverAccepted===true');reset=snap(p,'h4_reset')
     test('Simulation epoch reset distinct from private instance and activation',reset['snapshotContext']['clock']['epoch']>old and reset['snapshotContext']['registeredVesselInstanceId']==first['snapshotContext']['registeredVesselInstanceId'] and reset['avatar']['uuid']==first['avatar']['uuid'])
    test(label+' no body gameplay approval inferred',up['decision']['gameplayOccupancyAvailable'] is False)
   finally:c.close()
  test('No unhandled page errors',not report['errors']);report['passed']=True
 except Exception as e:
  report['exception']=str(e);report['traceback']=traceback.format_exc()
 finally:b.close()
(OUT/'snapshot-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['snapshots']},indent=2));assert report['passed'],'Current-host occupancy capture incomplete'
