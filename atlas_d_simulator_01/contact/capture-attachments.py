"""Exercise the real isolated host with a read-only diagnostic adapter.
Never replaces host source or controller time. Deterministic scenario stepping is
explicitly separate from the normal requestAnimationFrame turning/bobbing check.
"""
from pathlib import Path
import hashlib,json,os,time,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'evidence';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8915/atlas_d_simulator_01/contact/preview.html')
report={'passed':False,'sourceCommit':'48b9bef038ab2e422b6677d7ca9db4879419a3f9','url':BASE,'sharedHostWiring':False,'humansImplemented':False,'physicalDeviceTested':False,'errors':[],'shaderErrors':[],'scenarios':[]}

def check_rows(row,expected_count):
    assert row['sourceStateUnchanged'],row
    assert row['sample']['available'],row['sample']
    assert len([p for p in row['probes'] if p['available']])==expected_count,row['probes']
    for p in row['probes']:
        if p['available']:
            assert p.get('rayErrorM') is not None and p['rayErrorM']<1e-5,p
            assert p['normalError']<1e-6,p
            assert p['deckRoundTripErrorM']<1e-5,p
    assert all(not a['available'] and a['positionWorldM'] is None for a in row['sample']['helmAnchors'].values())

with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH')
    b=pw.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}),args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    context=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
    p=context.new_page();p.on('pageerror',lambda e:report['errors'].append(str(e)))
    p.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(x in m.text.lower() for x in ['shader error','validate_status','program info log']) else None)
    asset_hashes={}
    def response(r):
        if r.status==200 and r.url.endswith('ATLAS_D_Original.glb'):
            asset_hashes['originalGLB']=hashlib.sha256(r.body()).hexdigest()
    p.on('response',response)
    try:
        p.goto(BASE,wait_until='domcontentloaded',timeout=90000)
        p.wait_for_function('Y1.ready || Y1.error',timeout=180000);assert not p.evaluate('Y1.error')
        h=p.frame_locator('#host');f=p.frames[1]
        f.evaluate('BAYPLAY.setPaused(true)')
        bay_before=f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,elapsed:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
        h.locator('#ad-board').click();p.wait_for_function('Y1.latest?.sample?.available',timeout=60000)
        f.evaluate('ATLAS_D_SIM.holdFrameLoop=true;ATLAS_D_SIM.state.paused=false;ATLAS_D_SIM.testStep(0)')
        assert asset_hashes['originalGLB']=='b2966e8265edbd6d52ac2fa7aa1aaa764683df5ff1548a21c8cc1a024fdb3d48'
        report['assetHashes']=asset_hashes
        def record(name,count=None):
            row=p.evaluate('Y1.latest');
            if count is not None:check_rows(row,count)
            report['scenarios'].append({'name':name,**row})
            p.screenshot(path=str(OUT/(name+'.png')),timeout=60000)
            return row
        record('01-surface-source-contacts',3)
        # Deterministic movement with the adapter observer bypassed vs enabled.
        action='''() => {ATLAS_D_SIM.state.reset();ATLAS_D_SIM.state.observe(AtlasDCore.provingSample);ATLAS_D_SIM.command('engine');ATLAS_D_SIM.command('gear',1);ATLAS_D_SIM.command('throttle',0.4);ATLAS_D_SIM.command('rudder',0.8);return ATLAS_D_SIM.testStep(45).state;}'''
        p.evaluate('Y1.enabled=false');without=f.evaluate(action)
        p.evaluate('Y1.enabled=true');with_adapter=f.evaluate(action)
        assert without==with_adapter,{'without':without,'with':with_adapter}
        report['movementRegression']={'exactStateMatch':True,'durationSeconds':45,'deterministicHostTestStep':True,'state':with_adapter}
        h.locator('#ad-weather').select_option('swell')
        f.evaluate('ATLAS_D_SIM.testStep(1)')
        turned=record('02-turned-bobbing-source-contacts',3)
        assert turned['state']['heading']>0.1 and abs(turned['state']['heaveM'])>1e-5
        # Normal rendered motion: host's existing helm hold, no adapter time/step.
        f.evaluate('ATLAS_D_SIM.state.paused=false;ATLAS_D_SIM.holdFrameLoop=false')
        h.locator('#ad-right').hover();p.mouse.down();start=time.monotonic();before=p.evaluate('Y1.latest');history_start=before['observedFrames']
        p.wait_for_timeout(12000);p.mouse.up();after=p.evaluate('Y1.latest');wall=time.monotonic()-start
        f.evaluate('ATLAS_D_SIM.holdFrameLoop=true')
        hist=p.evaluate('(n)=>Y1.history.filter(r=>r.observedFrames>n)',history_start)
        live={'wallSeconds':wall,'simSeconds':after['state']['elapsed']-before['state']['elapsed'],'frames':after['observedFrames']-history_start,'headingChangeRad':after['state']['heading']-before['state']['heading'],
          'heaveRangeM':max(r['state']['heaveM'] for r in hist)-min(r['state']['heaveM'] for r in hist),'noAdapterTimeStep':True,'paused':after['state']['paused']}
        assert not live['paused'] and live['simSeconds']>7 and live['frames']>=6 and live['headingChangeRad']>0.005 and live['heaveRangeM']>1e-4,live
        for row in hist:check_rows(row,3)
        report['realTimeTurningBobbing']=live
        record('03-live-turning-bobbing',3)
        # Reset uses the original UI, so its source timer/state/pose remain coupled.
        h.locator('#ad-reset').click();f.evaluate('ATLAS_D_SIM.testStep(0)')
        h.locator('#ad-secure').click();f.evaluate('ATLAS_D_SIM.testStep(28)')
        transforming=record('04-transforming-contact-disabled',0)
        assert transforming['state']['mode']=='securing'
        assert all(r['reason']=='TRANSFORMING_OCCUPANCY_UNSUPPORTED' for r in transforming['sample']['regions'])
        assert abs(transforming['sample']['decks']['bridge-deck']['vesselFromDeck'][13])>0.2
        h.locator('#ad-pause').click();paused=f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())')
        f.evaluate('ATLAS_D_SIM.testStep(20)');assert paused==f.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())')
        h.locator('#ad-pause').click();f.evaluate('ATLAS_D_SIM.testStep(12)')
        record('05-secured-fixed-patches-only',2)
        h.locator('#ad-dive').click();f.evaluate('ATLAS_D_SIM.testStep(150)')
        submerged=record('06-submerged-transforms-no-dry-contact',0)
        assert submerged['state']['mode']=='submerged'
        assert abs(submerged['state']['depthM']-18)<.1
        assert all(r['reason']=='SUBMERGED_EXTERIOR_UNSUPPORTED' for r in submerged['sample']['regions'])
        assert not f.evaluate("ATLAS_D_SIM.command('deploy')")
        # Actual vessel switch invalidates the captured attachment token.
        old=p.evaluate('Y1.latest.sample.frameToken');epoch=p.evaluate('Y1.epoch')
        h.locator('#ad-exit').click();p.wait_for_function('Y1.latest?.sample.reason === "VESSEL_NOT_ACTIVE"',timeout=60000)
        assert not p.evaluate('(t)=>Y1.tokenValid(t)',old)
        record('07-switch-bay-invalidates-yacht')
        bay_after=f.evaluate('({x:BAYPLAY.state.x,z:BAYPLAY.state.z,elapsed:BAYPLAY.state.elapsed,location:BAYPLAY.state.location})')
        assert bay_before==bay_after,{'before':bay_before,'after':bay_after}
        h.locator('#ad-board').click();p.wait_for_function('Y1.latest?.sample.available',timeout=60000)
        f.evaluate('ATLAS_D_SIM.testStep(0)')
        assert p.evaluate('Y1.epoch')==epoch+2
        assert not p.evaluate('(t)=>Y1.tokenValid(t)',old)
        record('08-reboard-new-activation-epoch',0)
        report['switching']={'bayStateRestored':True,'oldTokenRejectedOnExit':True,'oldTokenRejectedOnReboard':True,'epochAdvance':2}
        h.locator('#ad-surface').click();f.evaluate('ATLAS_D_SIM.testStep(150)')
        record('09-surfaced-fixed-contact-restored',2)
        h.locator('#ad-deploy').click();f.evaluate('ATLAS_D_SIM.testStep(12)')
        record('10-deploying-contact-disabled',0)
        f.evaluate('ATLAS_D_SIM.testStep(30)');record('11-surface-contact-restored',3)
        # Falsifying bottom knowledge is not used for walking/dive tests; this
        # existing controller API receives an unknown sample and must refuse dive.
        f.evaluate('ATLAS_D_SIM.state.reset();ATLAS_D_SIM.command("secure");ATLAS_D_SIM.testStep(40)')
        blocked=f.evaluate('ATLAS_D_SIM.state.command("dive",undefined,()=>({known:false,bed:null}))');assert blocked is False
        report['unknownDepthDiveInterlock']=True
        costs=p.evaluate('Y1.costMs');costs.sort();report['adapterDiagnosticCostMs']={'samples':len(costs),'median':costs[len(costs)//2],'p95':costs[int(len(costs)*.95)],'includesRayChecksAndSVG':True,'consumerHardwareBenchmark':False}
        assert not report['errors'] and not report['shaderErrors'],report
        report['passed']=True
    except Exception as e:
        report['error']=str(e);report['traceback']=traceback.format_exc()
        try:p.screenshot(path=str(OUT/'FAILURE.png'),timeout=60000)
        except Exception:pass
        raise
    finally:
        (OUT/'browser-contacts.json').write_text(json.dumps(report,indent=2));context.close();b.close()
print(json.dumps({'passed':report['passed'],'scenarios':len(report['scenarios']),'realTimeTurningBobbing':report.get('realTimeTurningBobbing')},indent=2))
