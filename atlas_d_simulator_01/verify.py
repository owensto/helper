"""Browser operation of the exact candidate or immutable public preview.
Headless viewport tests are not physical-device, engineering or multiplayer tests.
"""
import json, os, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'review'
OUT.mkdir(exist_ok=True)
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8914/index.html')
PUBLIC=os.environ.get('PUBLIC_CHECK')=='1'
results=[]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
    try:
        for name,viewport in [('desktop',{'width':1440,'height':1000}),('phone',{'width':390,'height':844})]:
            context=browser.new_context(viewport=viewport,device_scale_factor=1)
            page=context.new_page();errors=[];failed=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
            row={'device':name,'viewport':viewport,'passed':False,'public':PUBLIC}
            results.append(row)
            try:
                page.goto(BASE+('&' if '?' in BASE else '?')+'vessel=bay',wait_until='domcontentloaded',timeout=90000)
                page.wait_for_function('window.ATLAS_D_SIM?.ready === true',timeout=180000)
                page.evaluate('BAYPLAY.setPaused(true)')
                before=page.evaluate('({location:BAYPLAY.state.location,x:BAYPLAY.state.x,z:BAYPLAY.state.z,elapsed:BAYPLAY.state.elapsed,basin:Sea09World.sample(0,0,"basin").bed})')
                page.locator('#ad-board').click()
                page.wait_for_function('ATLAS_D_SIM.active && ATLAS_D_SIM.inspect().frameCount > 0',timeout=60000)
                page.evaluate('ATLAS_D_SIM.holdFrameLoop=true')
                if page.evaluate('ATLAS_D_SIM.state.paused'):page.locator('#ad-pause').click()
                first=page.evaluate('ATLAS_D_SIM.inspect()');row['initial']=first
                assert first['originalRootY']==0,first
                assert first['sourceScaleTracks']==0,first
                assert first['originalHullScale']==[1,1,1],first
                assert first['waterLocation']=='atlasd-proving'
                assert first['hostSuspended']
                assert first['state']['depthM']==0
                assert first['state']['clearanceM']>35
                assert page.locator('#ad-root').is_visible()
                assert page.locator('#ad-dive').is_disabled()
                dims=page.evaluate('''() => ['ad-engine','ad-neutral','ad-left','ad-right','ad-secure','ad-reset','ad-exit'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};})''')
                assert all(d['w']>=32 and d['h']>=40 and d['x']>=0 and d['y']>=0 and d['x']+d['w']<=viewport['width']+1 and d['y']+d['h']<=viewport['height']+1 for d in dims),dims
                row['primaryControls']=dims
                page.screenshot(path=str(OUT/f'{"public-" if PUBLIC else ""}{name}-surface.png'))
                page.locator('#ad-engine').click()
                page.locator('[data-ad-gear="1"]').click()
                page.locator('#ad-throttle').evaluate('(e)=>{e.value="40";e.dispatchEvent(new Event("input",{bubbles:true}));}')
                driven=page.evaluate('ATLAS_D_SIM.testStep(6)');assert driven['state']['speedMps']>0.5,driven
                page.locator('[data-ad-gear="-1"]').click()
                assert page.evaluate('ATLAS_D_SIM.state.gear')==-1
                assert page.evaluate('ATLAS_D_SIM.state.speedMps')>0
                page.locator('#ad-neutral').click();page.evaluate('ATLAS_D_SIM.testStep(60)')
                page.locator('#ad-secure').click();progress=page.evaluate('ATLAS_D_SIM.testStep(10)')
                assert progress['state']['mode']=='securing',progress
                assert progress['state']['depthM']==0 and progress['originalRootY']==0
                page.locator('#ad-pause').click();paused=page.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())')
                page.evaluate('ATLAS_D_SIM.testStep(20)')
                assert page.evaluate('JSON.stringify(ATLAS_D_SIM.state.snapshot())')==paused
                page.locator('#ad-pause').click();secured=page.evaluate('ATLAS_D_SIM.testStep(30)')
                assert secured['state']['mode']=='secured',secured
                assert secured['originalRootY']==0
                assert secured['originalHullScale']==[1,1,1]
                assert not page.locator('#ad-dive').is_disabled()
                row['secured']=secured
                page.screenshot(path=str(OUT/f'{"public-" if PUBLIC else ""}{name}-secured.png'))
                page.locator('#ad-dive').click();under=page.evaluate('ATLAS_D_SIM.testStep(150)')
                assert under['state']['mode']=='submerged',under
                assert abs(under['state']['depthM']-18)<0.1,under
                assert under['state']['clearanceM']>20,under
                assert under['originalRootY']==0,under
                assert under['originalHullScale']==[1,1,1]
                assert under['camera']=='subsea',under
                assert page.locator('#ad-deploy').is_disabled()
                row['submerged']=under
                page.screenshot(path=str(OUT/f'{"public-" if PUBLIC else ""}{name}-submerged.png'))
                page.locator('#ad-map-toggle').click();assert page.locator('#ad-map').is_visible()
                page.locator('#ad-map-toggle').click()
                page.locator('#ad-surface').click();surfaced=page.evaluate('ATLAS_D_SIM.testStep(150)')
                assert surfaced['state']['depthM']==0,surfaced
                assert surfaced['state']['mode']=='secured',surfaced
                page.locator('#ad-deploy').click();deployed=page.evaluate('ATLAS_D_SIM.testStep(40)')
                assert deployed['state']['mode']=='surface',deployed
                assert deployed['state']['conversion']==0
                page.locator('#ad-exit').click()
                assert not page.evaluate('ATLAS_D_SIM.active')
                assert page.locator('#ad-board').is_visible()
                after=page.evaluate('({location:BAYPLAY.state.location,x:BAYPLAY.state.x,z:BAYPLAY.state.z,elapsed:BAYPLAY.state.elapsed,basin:Sea09World.sample(0,0,"basin").bed})')
                assert before==after,{'before':before,'after':after}
                assert not errors,errors
                row.update(passed=True,originalBayRestored=True,errors=errors,failedRequests=failed)
            except Exception as e:
                row.update(error=str(e),traceback=traceback.format_exc(),errors=errors,failedRequests=failed)
                try:
                    row['runtime']=page.evaluate('({d:window.ATLAS_D_SIM&&{ready:ATLAS_D_SIM.ready,error:ATLAS_D_SIM.error},bay:window.BAYPLAY?.ready,water:window.SEA09_WATER?.ready,access:window.SEA11?.ready})')
                    page.screenshot(path=str(OUT/f'{name}-failure.png'))
                except Exception:pass
                raise
            finally:
                report={'passed':all(r['passed'] for r in results),'public':PUBLIC,'baseURL':BASE,'physicalDeviceTested':False,'multiplayerTested':False,'devices':results}
                (OUT/('public-browser.json' if PUBLIC else 'browser.json')).write_text(json.dumps(report,indent=2))
                context.close()
    finally:browser.close()
print(json.dumps({'passed':True,'public':PUBLIC,'devices':[r['device'] for r in results]},indent=2))
