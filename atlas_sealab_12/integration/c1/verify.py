"""Actual Sea Lab 12 host + C1 overlay. No worker fixtures or old preview host."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, traceback
ROOT=Path(os.environ.get('C1_OUT','/tmp/core12-c1'))
OUT=ROOT/'review';OUT.mkdir(parents=True,exist_ok=True)
DEV=os.environ.get('TEST_DEVICE','desktop');W,H=(1440,960) if DEV=='desktop' else (430,932)
URL=os.environ.get('BASE_URL','http://127.0.0.1:8913/index.html')
report={'passed':False,'scope':'CORE_C1_REAL_HOST_CANDIDATE_ONLY','publicBaselineSHA':'a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff',
 'candidateSourceSHA':os.environ.get('GITHUB_SHA','LOCAL_UNPUBLISHED'),'url':URL,'device':DEV,'combinedAcceptance':False,
 'physicalDeviceTested':False,'foreignWorkersLoaded':False,'tests':[],'errors':[],'shaderErrors':[],'assetErrors':[]}
def shot(p,name):
 p.evaluate('BAYPLAY.refresh();SEA06.beforeRender();BAYPLAY.renderer.render(BAYPLAY.scene,BAYPLAY.camera);BAYPLAY.capturePaused=true')
 try:p.screenshot(path=str(OUT/(DEV+'_'+name+'.png')),timeout=60000)
 finally:p.evaluate('BAYPLAY.capturePaused=false')
def check(p,name,script):
 result=p.evaluate(script);assert result is not False,(name,result);report['tests'].append({'name':name,'passed':True,'result':result})
def drive_wait(p,expr):
 for _ in range(3):
  p.wait_for_function('BAYPLAY.pauseReason==="render-stall" || ('+expr+')',timeout=60000)
  if p.evaluate('BAYPLAY.pauseReason!=="render-stall"'):return
  report.setdefault('stallRecoveries',[]).append(p.evaluate('({...SEA_TIMING})'));p.locator('#sea10-resume').click()
 raise AssertionError('Repeated render stalls')
with sync_playwright() as pw:
 args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 kwargs={'headless':True,'args':args}
 if os.environ.get('CHROMIUM_PATH'):kwargs['executable_path']=os.environ['CHROMIUM_PATH']
 b=pw.chromium.launch(**kwargs)
 c=b.new_context(viewport={'width':W,'height':H},has_touch=DEV=='phone',record_video_dir=str(OUT/'video'),record_video_size={'width':min(W,960),'height':min(H,720)})
 p=c.new_page();p.set_default_timeout(45000)
 p.on('pageerror',lambda e:report['errors'].append(str(e)))
 p.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader','validate_status','program info log']) else None)
 p.on('response',lambda e:report['assetErrors'].append([e.status,e.url]) if e.status>=400 and URL.rsplit('/',1)[0] in e.url and 'favicon' not in e.url else None)
 try:
  p.goto(URL,wait_until='domcontentloaded',timeout=120000)
  p.wait_for_function('window.CORE12_READY || window.CORE12_ERROR',timeout=120000)
  assert p.evaluate('window.CORE12_READY'),p.evaluate('window.CORE12_ERROR')
  p.locator('#helm09-key').click();drive_wait(p,'BAYPLAY.state.engine && BAYPLAY.state.startTimer===0')
  p.locator('[data-gear09="1"]').click();p.locator('#s12-wot').click()
  drive_wait(p,'BAYPLAY.state.speedOverGround>1')
  p.evaluate('async()=>{window.d=await CORE12.reader.describe()}')
  check(p,'Existing map remains live with usable controls', '''async()=>{
   const start=BAYPLAY.state.elapsed;document.getElementById('helm09-map').click();
   if(BAYPLAY.inspect().paused||document.getElementById('helm09-mapcard').hidden)throw Error('map paused/hidden');
   return {start,paused:false,shown:true};}''')
  t=p.evaluate('BAYPLAY.state.elapsed');p.wait_for_function('(BAYPLAY.state.elapsed>'+str(t+.12)+') && !BAYPLAY.inspect().paused',timeout=60000)
  check(p,'Map does not intercept driving controls', '''()=>['helm09-key','s11-more'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id})''')
  shot(p,'map_no_pause');p.locator('#helm09-mapclose').click();p.evaluate('BAYPLAY.setPaused(true)')
  p.evaluate('async()=>{window.d=await CORE12.reader.describe()}')
  check(p,'Immutable snapshots and reads never advance host physics/time', '''()=>{
   const t=BAYPLAY.state.elapsed,step=BAYPLAY.state.step,packet=JSON.stringify(Sea12Waves.packets);
   const a=CORE12.reader.readPose('atlas-bay-25-sealab12',d.worldRevision);
   let trapped=false;try{(function(){'use strict';a.transform.position[0]=999;})()}catch{trapped=true;}
   for(let i=0;i<100;i++)CORE12.reader.readPose('atlas-bay-25-sealab12',d.worldRevision);
   const b=CORE12.reader.readPose('atlas-bay-25-sealab12',d.worldRevision);
   if(!trapped||!Object.isFrozen(a.transform.quaternionXYZW)||JSON.stringify(a)!==JSON.stringify(b))throw Error('snapshot mutation');
   if(t!==BAYPLAY.state.elapsed||step!==__C1_STEP_BEFORE||packet!==JSON.stringify(Sea12Waves.packets))throw Error('read changed physics');
   return {reads:102,timeUnchanged:true,stepFunctionUnchanged:true,frozen:true};}''')
  check(p,'Exact cardinal/tilted YXZ, XYZW and inverse matrix mapping', '''()=>{
   const S=BAYPLAY.state,T=ATLASRuntime,out=[];
   for(const [h,r,p] of [[0,0,0],[Math.PI/2,0,0],[Math.PI,0,0],[-Math.PI/2,0,0],[.8,.2,-.12]]){
    Object.assign(S,{heading:h,roll:r,pitch:p});BAYPLAY.refresh();
    const v=CORE12.reader.readPose('atlas-bay-25-sealab12',d.worldRevision).transform;
    const m=new T.Matrix4().fromArray(v.localToWorld),mi=new T.Matrix4().fromArray(v.worldToLocal);
    const q=new T.Quaternion().setFromEuler(new T.Euler(r,-h,p,'YXZ'));
    const got=new T.Quaternion().fromArray(v.quaternionXYZW);
    if(Math.abs(q.dot(got))<1-1e-10)throw Error('quaternion sign/order mismatch');
    const ident=m.clone().multiply(mi),expected=new T.Matrix4();
    const error=Math.max(...ident.elements.map((x,i)=>Math.abs(x-expected.elements[i])));
    if(error>1e-8)throw Error('matrix inverse mismatch');out.push({heading:h,roll:r,pitch:p,inverseError:error});
   }return out;}''')
  check(p,'Same captain instance and actual semantic pivot matrices retained', '''()=>{
   const A=BAYPLAY,cap=A.boat.getObjectByName('SEA12_CAPTAIN');let n=0;A.scene.traverse(o=>{if(o.name==='SEA12_CAPTAIN')n++;});
   const a=CORE12.reader.readAnchors('atlas-bay-25-sealab12',d.worldRevision);
   if(n!==1||cap.uuid!==__C1_CAPTAIN_BEFORE||a.captainRoot.uuid!==cap.uuid)throw Error('duplicate/replaced captain');
   const pos=a.captainRoot.localToVessel.slice(12,15);
   if(Math.hypot(pos[0]+1.6,pos[1]-1.06,pos[2]-.18)>1e-8)throw Error('old captain anchor');
   if(a.leftSole.available||a.rightGrip.available||a.transitionOccupancy.available)throw Error('fabricated contact');
   return {count:n,uuid:cap.uuid,captainLocal:pos,steering:a.steeringPivot,throttle:a.throttlePivot};}''')
  p.evaluate('SEA09.view("captain");BAYPLAY.refresh()');shot(p,'captain_unchanged')
  check(p,'Water/depth sample uses current host field and time', '''()=>{
   const S=BAYPLAY.state,q=CORE12.reader.sampleWater('atlas-bay-25-sealab12',d.worldRevision,-200,-300),b=Sea09World.sample(-200,-300,S.location);
   if(q.clock.seconds!==S.elapsed||q.bed!==b.bed||q.surfaceYM!==BayMotion.surface(-200,-300,S.elapsed,S.environment))throw Error('separate water/time');
   return q;}''')
  check(p,'World revision stable for pose/time; changes for config/weather', '''async()=>{
   const rev=d.worldRevision;BAYPLAY.testStep(.05);BAYPLAY.refresh();
   if((await CORE12.reader.describe()).worldRevision!==rev)throw Error('pose/time in fingerprint');
   const hp=BAYPLAY.state.config.hp;BAYPLAY.state.config.hp=hp+1;let rejects=false;
   try{CORE12.reader.readPose('atlas-bay-25-sealab12',rev)}catch(e){rejects=/STALE_WORLD/.test(e.message)}
   if(!rejects)throw Error('stale config accepted');const changed=(await CORE12.reader.describe()).worldRevision;
   if(changed===rev)throw Error('unbound config');BAYPLAY.state.config.hp=hp;
   window.d=await CORE12.reader.describe();SEA10.chooseWeather('rain');
   let rejectsWeather=false;try{CORE12.reader.readPose('atlas-bay-25-sealab12',d.worldRevision)}catch(e){rejectsWeather=/STALE_WORLD/.test(e.message)}
   if(!rejectsWeather)throw Error('stale weather accepted');SEA10.chooseWeather('breeze');window.d=await CORE12.reader.describe();
   return {poseTimeStable:true,configRejected:true,weatherRejected:true};}''')
  check(p,'Eight Bay-only spawn slots checked; unknown yacht and occupancy fail closed', '''()=>{
   const id='atlas-bay-25-sealab12',out=[];
   for(let slot=0;slot<8;slot++){const q=CORE12.local.prepareSpawn(id,d.worldRevision,slot,[]);if(!q.available)throw Error(q.reason);out.push(q);}
   const blocked=CORE12.local.prepareSpawn(id,d.worldRevision,0,[{x:-240,z:-300,radiusM:5.4}]);
   if(blocked.available||blocked.reason!=='SPAWN_OCCUPIED')throw Error('overlap');
   if(CORE12.local.prepareSpawn(id,d.worldRevision,0).available)throw Error('missing occupancy');
   if(CORE12.local.validatePlacement(id,d.worldRevision,{positionXZ:[85,-40],headingRad:0},[]).available)throw Error('sandbar spawn');
   let bad=false;try{CORE12.local.prepareSpawn('atlas-d-original-r7',d.worldRevision,0,[])}catch(e){bad=/YACHT_ADAPTER_UNAVAILABLE/.test(e.message)}
   if(!bad||CORE12.reader.capabilities('atlas-d-original-r7').available)throw Error('yacht Bay fallback');
   return {slots:out,occupiedRejected:true,yachtUnavailable:true};}''')
  check(p,'Local stopped restoration preserves clock/fuel; serialized tokens rejected', '''()=>{
   const S=BAYPLAY.state,id='atlas-bay-25-sealab12';let t=S.elapsed;
   const spawn=CORE12.local.spawnLocal(id,d.worldRevision,0,[]);if(!spawn.available||S.elapsed!==t)throw Error('spawn advanced/reset time');
   const token=CORE12.local.captureRestorePoint(id,d.worldRevision),fuel=S.fuelUsedGal;
   if(CORE12.local.restoreLocal({...token},[]).available)throw Error('remote/serialized token');
   S.x+=10;S.vx=2;S.engine=true;S.throttle=.5;BAYPLAY.refresh();
   const restored=CORE12.local.restoreLocal(token,[]);
   if(!restored.available||S.x!==-240||S.z!==-300||S.engine||S.throttle||S.vx||!BAYPLAY.inspect().paused||S.elapsed!==t||S.fuelUsedGal!==fuel)throw Error('unsafe restoration');
   const token2=CORE12.local.captureRestorePoint(id,d.worldRevision),ep=CORE12.reader.readPose(id,d.worldRevision).clock.epoch;S.reset();BAYPLAY.refresh();
   if(CORE12.local.restoreLocal(token2,[]).available)throw Error('reset token survived');
   if(CORE12.reader.readPose(id,d.worldRevision).clock.epoch<=ep)throw Error('reset epoch missed');
   return {spawn,restored,timeAndFuelPreserved:true,remoteRejected:true,resetInvalidatesTokens:true};}''')
  check(p,'Geographic scene/tide revisions and unknown depth remain explicit', '''async()=>{
   const old=d.worldRevision;SEA09.relocate('beaufort');BAYPLAY.setPaused(true);let invalid=false;
   try{CORE12.reader.readPose('atlas-bay-25-sealab12',old)}catch(e){invalid=/STALE_WORLD/.test(e.message)}
   if(!invalid)throw Error('scene mismatch');window.d=await CORE12.reader.describe();
   const q=CORE12.reader.sampleWater('atlas-bay-25-sealab12',d.worldRevision,1000000,1000000);
   if(q.known||q.bed!==null||q.depth!==null)throw Error('unknown depth fabricated');
   if(CORE12.local.prepareSpawn('atlas-bay-25-sealab12',d.worldRevision,0,[]).available)throw Error('Beaufort spawn assumed');
   const rev=d.worldRevision;BAYPLAY.state.config.tide+=.1;let tideBad=false;
   try{CORE12.reader.readPose('atlas-bay-25-sealab12',rev)}catch(e){tideBad=/STALE_WORLD/.test(e.message)}
   if(!tideBad)throw Error('tide mismatch');window.d=await CORE12.reader.describe();
   return {sceneRejected:true,tideRejected:true,unknown:q};}''')
  check(p,'Disposal removes only its reset wrapper; no host step replacement', '''()=>{
   const step=BAYPLAY.state.step;CORE12.dispose();let rejected=false;
   try{CORE12.reader.capabilities('atlas-bay-25-sealab12')}catch(e){rejected=/DISPOSED/.test(e.message)}
   return rejected&&BAYPLAY.state.step===step&&step===__C1_STEP_BEFORE;}''')
  assert not report['errors'] and not report['shaderErrors'] and not report['assetErrors'],report
  report['passed']=True
 except Exception as e:
  report['exception']=str(e);report['traceback']=traceback.format_exc()
  try:shot(p,'ERROR')
  except Exception:pass
 finally:
  c.close();b.close();(OUT/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));assert report['passed'],'C1 boundary did not pass'
