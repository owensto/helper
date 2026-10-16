"""Validate immutable public delivery using actual browser-loaded response bytes.
The public host can display an 'Open the page' confirmation. Follow its ordinary
visible link, then compare what the browser really loads against this release.
No local substitution, response rewriting, auth bypass, or source overrides.
"""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib, json, os, runpy, time, traceback
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'review';OUT.mkdir(exist_ok=True)
URL=os.environ['PUBLIC_URL']
PREFIX=URL.rsplit('/',1)[0]+'/'
FILES=['index.html','atlas-d-core.js','atlas-d.js','atlas-d.css','assets/ATLAS_D_Original.glb']
EXPECTED={name:hashlib.sha256((ROOT/'live'/name).read_bytes()).hexdigest() for name in FILES}
report={'passed':False,'url':URL,'commit':os.environ.get('PUBLIC_COMMIT'),
        'localAssetsSubstituted':False,'files':{},'hostConfirmation':False,
        'errors':[],'shaderErrors':[],'responses':[]}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page=context.new_page()
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['shaderErrors'].append(m.text) if m.type=='error' and any(s in m.text.lower() for s in ['shader','validate_status','program info log']) else None)
    def response(r):
        if not r.url.startswith(PREFIX):return
        name=urlsplit(r.url).path.removeprefix(urlsplit(PREFIX).path)
        if name not in EXPECTED:return
        item={'path':name,'status':r.status,'url':r.url}
        try:
            raw=r.body();item['sha256']=hashlib.sha256(raw).hexdigest()
            item['exact']=item['sha256']==EXPECTED[name]
            if r.status==200 and item['exact']:report['files'][name]=item
        except Exception as e:item['readError']=str(e)
        report['responses'].append(item)
    page.on('response',response)
    try:
        page.goto(URL,wait_until='domcontentloaded',timeout=120000)
        report['initialTitle']=page.title()
        confirm=page.get_by_text('Open the page',exact=True)
        if confirm.count():
            report['hostConfirmation']=True
            confirm.click(timeout=30000)
        page.wait_for_function('window.ATLAS_D_SIM?.ready && ATLAS_D_SIM.active',timeout=180000)
        page.wait_for_function('ATLAS_D_SIM.inspect().frameCount > 4',timeout=60000)
        # First shader compilation may trigger the deliberately bounded stall
        # pause. Recover once, then test the normal animation-frame motion loop.
        if page.evaluate('ATLAS_D_SIM.state.paused'):
            report['initialStallRecovered']=True
            page.locator('#ad-pause').click()
        page.locator('#ad-engine').click()
        page.locator('[data-ad-gear="1"]').click()
        page.locator('#ad-throttle').evaluate('(e)=>{e.value="35";e.dispatchEvent(new Event("input",{bubbles:true}));}')
        before=page.evaluate('ATLAS_D_SIM.inspect()');start=time.monotonic()
        page.wait_for_timeout(10000)
        after=page.evaluate('ATLAS_D_SIM.inspect()');wall=time.monotonic()-start
        report['realTime']={'wallSeconds':wall,'simulationSeconds':after['state']['elapsed']-before['state']['elapsed'],
          'frames':after['frameCount']-before['frameCount'],'distanceM':((after['state']['x']-before['state']['x'])**2+(after['state']['z']-before['state']['z'])**2)**0.5,
          'speedMps':after['state']['speedMps'],'paused':after['state']['paused'],
          'deterministicTestStepUsed':False,'physicalHardwareBenchmark':False}
        assert not after['state']['paused'],report['realTime']
        assert report['realTime']['simulationSeconds']>=6,report['realTime']
        assert report['realTime']['frames']>=8,report['realTime']
        assert report['realTime']['distanceM']>0.5,report['realTime']
        page.locator('#ad-neutral').click();page.locator('#ad-pause').click()
        page.evaluate('ATLAS_D_SIM.holdFrameLoop=true')
        page.screenshot(path=str(OUT/'public-realtime-surface.png'),timeout=60000)
        assert set(report['files'])==set(FILES),report
        assert not report['errors'] and not report['shaderErrors'],report
        report['passed']=True
    except Exception as e:
        report['error']=str(e);report['traceback']=traceback.format_exc()
        try:
            report['pageURL']=page.url;report['pageText']=page.locator('body').inner_text(timeout=5000)[:6000]
            page.screenshot(path=str(OUT/'public-delivery-failure.png'),timeout=60000)
        except Exception:pass
        raise
    finally:
        (OUT/'public-assets.json').write_text(json.dumps(report,indent=2))
        context.close();browser.close()

# The exact same operation assertions as the local pass; add only the hosting
# service's ordinary visible confirmation handling for a new browser context.
script=(ROOT/'verify.py').read_text()
line="                page.wait_for_function('window.ATLAS_D_SIM?.ready === true',timeout=180000)"
assert script.count(line)==1
script=script.replace(line,"                if page.get_by_text('Open the page',exact=True).count():page.get_by_text('Open the page',exact=True).click()\n"+line)
os.environ['BASE_URL']=URL;os.environ['PUBLIC_CHECK']='1'
exec(compile(script,str(ROOT/'verify.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'verify.py')})
checks=json.loads((OUT/'public-browser.json').read_text());assert checks['passed']
release={'status':'Public assets, real-time motion and desktop/phone browser operation passed',
 'url':URL,'publishedCommit':os.environ.get('PUBLIC_COMMIT'),
 'vesselId':'atlas-d-original-r7','originalAssetBytes':9043328,
 'coreTests':22,'publicExactAssets':True,'publicRealTimeMotionTested':True,
 'hostConfirmationObserved':report['hostConfirmation'],
 'multiplayer':False,'sharedSeaLab12Merged':False,'physicalDeviceTested':False,'engineeringValidated':False}
(ROOT/'RELEASE.json').write_text(json.dumps(release,indent=2))
print(json.dumps(release,indent=2))
