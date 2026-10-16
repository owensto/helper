"""Isolated real-browser transport diagnostics, not integrated Sea Lab acceptance.

Requires existing Python Playwright and Chromium; no network downloads/permissions.
Run from atlas_multiplayer. Evidence never logs invitation/session credentials.
"""
from __future__ import annotations
import asyncio, hashlib, json, os, subprocess, re, shutil
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence' / 'm2'
BUNDLE = os.environ.get('ATLAS_DIAGNOSTIC_BUNDLE')
SOURCE = (ROOT.parent/'SOURCE_SHA').read_text().strip() if (ROOT.parent/'SOURCE_SHA').exists() else subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
REPORT = {'suite':'two-independent-browser-fixture', 'status':'RUNNING',
          'source_checkout_sha':SOURCE,
          'fixture_only':True, 'requested_browser_processes':2, 'independent_browser_motion_verified':False,
          'pinned_transport_certified':False,
          'integrated_Sea_Lab_12_regression':'NOT_RUN', 'public_multiplayer':'NOT_LIVE',
          'checks':[], 'screenshots':[], 'page_errors':[]}

def redact(value):
    return re.sub(r'(?i)(key|resumeToken)([\"\s:=]+)[A-Za-z0-9_-]{16,}', r'\1\2[REDACTED]', str(value))

async def until(page, condition, timeout=6000):
    await page.wait_for_function(condition, timeout=timeout)

async def inspect(page):
    return await page.evaluate('fixture.inspect()')

def check(name, **detail):
    REPORT['checks'].append({'name':name,'passed':True,**detail})
    print('PASS', name, flush=True)

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if BUNDLE:
        REPORT['transport']='diagnostic-preinstalled-bundle'
        REPORT['diagnostic_bundle_sha256']=hashlib.sha256(Path(BUNDLE).read_bytes()).hexdigest()
    else:
        subprocess.run(['node','scripts/verify-dependency.mjs'],cwd=ROOT,check=True)
        REPORT['transport']='installed-ws-8.22.0'
        REPORT['pinned_metadata_gate']=True
    command=['node']+(['--import','./tests/diagnostic-register.mjs'] if BUNDLE else [])
    errlog=(OUT/'browser-server.stderr.txt').open('w')
    proc=await asyncio.create_subprocess_exec(*command,'tests/fixtures/server.mjs', cwd=ROOT, env=os.environ.copy(),
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=errlog)
    browsers=[]
    try:
        settings=json.loads(await asyncio.wait_for(proc.stdout.readline(), timeout=8))
        base=settings['url']
        async with async_playwright() as p:
            # Separate browser launches, not merely two pages or contexts.
            executable=os.environ.get('ATLAS_CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path
            if not Path(executable).exists():
                raise RuntimeError('Existing Chromium executable required; browser downloads are not performed')
            for _ in range(2):
                browsers.append(await p.chromium.launch(executable_path=executable, headless=True,
                    args=['--no-sandbox','--disable-dev-shm-usage']))
            REPORT['chromium_versions']=[b.version for b in browsers]
            REPORT['launched_browser_processes']=len(browsers)
            contexts=[await browsers[0].new_context(viewport={'width':1440,'height':900}),
                      await browsers[1].new_context(viewport={'width':390,'height':844})]
            request_urls=[]
            for i,ctx in enumerate(contexts):
                await ctx.add_init_script('''window.__wsCreated=0;
                  const NativeWS=window.WebSocket;
                  window.WebSocket=class extends NativeWS {constructor(...args){super(...args);window.__wsCreated++;}};''')
                ctx.on('request', lambda r: request_urls.append(r.url))
                ctx.on('page',lambda page,i=i: page.on('pageerror',lambda e: REPORT['page_errors'].append({'client':i,'error':redact(e)})))
            a,b=[await c.new_page() for c in contexts]

            # Fixture single-player regression: compare feature absent and disabled.
            await a.goto(base+'?noimport=1');await until(a,'window.fixture?.ready')
            baseline=await a.evaluate('fixture.regression()')
            absent=await inspect(a)
            assert await a.evaluate('__wsCreated')==0
            await b.goto(base+'?network=off');await until(b,'window.fixture?.ready')
            disabled=await b.evaluate('fixture.regression()')
            disabled_info=await inspect(b)
            assert baseline==disabled
            assert await b.evaluate('__wsCreated')==0
            assert all(v==0 for v in disabled_info['hooks'].values())
            assert disabled_info['info']['state']=='disabled'
            check('feature-absent versus feature-disabled fixture regression', steps=600,
                  identical_final_state=True,websockets_opened=0,host_hooks_called=0,
                  scope='fixture only, NOT actual Sea Lab 12')
            REPORT['fixture_regression_state']=baseline

            await a.goto(base);await until(a,'window.fixture?.ready')
            assert await a.evaluate('__wsCreated')==0
            await a.locator('.mp-name').fill('Owen')
            await a.locator('.mp-create').click()
            await until(a,"fixture.inspect().info.state==='connected'")
            ai=await inspect(a); original_id=ai['info']['playerId']
            invite=await a.locator('.mp-share').input_value()
            parsed=urlparse(invite); fragment=parse_qs(parsed.fragment)
            assert parsed.query=='' and set(fragment)=={'room','key','world'}
            assert len(fragment['key'][0])==32 and 'resumeToken' not in invite
            # URL fragment reaches only the browser, not the HTTP request.
            await b.goto(invite);await until(b,'window.fixture?.ready')
            assert await b.evaluate('__wsCreated')==0
            await b.locator('.mp-name').fill('Crew')
            await b.locator('.mp-join').click()
            await until(b,"fixture.inspect().info.state==='connected'")
            await until(a,'fixture.inspect().remotes.length===1')
            await until(b,'fixture.inspect().remotes.length===1')
            ai,bi=await inspect(a),await inspect(b)
            assert ai['info']['playerId']!=bi['info']['playerId']
            assert ai['info']['entityId']!=bi['info']['entityId']
            assert ai['remotes'][0]['entityId']==bi['info']['entityId']
            assert bi['remotes'][0]['entityId']==ai['info']['entityId']
            assert abs(ai['local']['p'][0]-bi['local']['p'][0])>=39
            check('explicit create/invite/join across independently launched browsers',
                  unique_identity=True,distinct_spawn_slots=True,no_auto_connect=True)
            assert all('#' not in url and 'key=' not in url and 'resumeToken' not in url for url in request_urls)
            assert all(urlparse(url).hostname=='127.0.0.1' for url in request_urls)
            check('invitation credentials remain in fragment; no external HTTP requests')

            # Continuous bidirectional native-WebSocket motion and rendering.
            start_a=ai['local']['p'][0];start_b=bi['local']['p'][0]
            await a.evaluate('fixture.setVelocity(8,0)');await b.evaluate('fixture.setVelocity(-5,0)')
            await until(b,f'fixture.inspect().remotes[0].pose.p[0]>{start_a+4}')
            await until(a,f'fixture.inspect().remotes[0].pose.p[0]<{start_b-2.5}')
            await asyncio.sleep(.25)
            ai,bi=await inspect(a),await inspect(b)
            assert ai['stats']['sent']>8 and bi['stats']['sent']>8
            assert ai['hooks']['render']>ai['stats']['snapshots']
            assert bi['hooks']['render']>bi['stats']['snapshots']
            assert not ai['remotes'][0]['stale'] and not bi['remotes'][0]['stale']
            check('two-way motion transmitted and interpolated between snapshots',
                  client_a_sent=ai['stats']['sent'],client_b_sent=bi['stats']['sent'],
                  a_render_samples=ai['hooks']['render'],b_render_samples=bi['hooks']['render'])

            before=await inspect(a)
            await a.locator('#map').click();await asyncio.sleep(.45)
            after=await inspect(a); other=await inspect(b)
            assert after['mapOpen'] and after['local']['p'][0]>before['local']['p'][0]+2
            assert after['transportRoomAgeSeconds']>before['transportRoomAgeSeconds']+.3
            assert after['info']['state']==other['info']['state']=='connected'
            assert abs(after['transportRoomAgeSeconds']-other['transportRoomAgeSeconds'])<.2
            check('local map does not pause room or other player',clock_difference_seconds=round(abs(after['transportRoomAgeSeconds']-other['transportRoomAgeSeconds']),4))
            for page,name in [(a,'desktop-connected.png'),(b,'phone-connected.png')]:
                await page.screenshot(path=str(OUT/name),full_page=True,mask=[page.locator('[data-private]')])
                REPORT['screenshots'].append(name)

            # Abruptly destroy A's real TCP socket from the local test driver.
            before_reconnect=await inspect(a)
            proc.stdin.write(b'{"type":"drop","index":0}\n');await proc.stdin.drain()
            await until(a,"fixture.inspect().statuses.includes('reconnecting')")
            await until(b,'fixture.inspect().remotes.some(p=>p.stale)',timeout=2500)
            stale=await inspect(b)
            check('abrupt TCP loss produces visible reconnect and stale remote state',
                  stale_remote_count=sum(bool(x['stale']) for x in stale['remotes']))
            await b.screenshot(path=str(OUT/'phone-disconnected.png'),full_page=True,mask=[b.locator('[data-private]')])
            REPORT['screenshots'].append('phone-disconnected.png')
            await until(a,"fixture.inspect().info.state==='connected' && fixture.inspect().stats.reconnects===1")
            await until(b,'fixture.inspect().remotes.length===1 && !fixture.inspect().remotes[0].stale')
            ai=await inspect(a)
            assert ai['info']['playerId']==original_id and ai['hooks']['restore']==1
            assert len((await inspect(b))['remotes'])==1
            assert ai['transportRoomAgeSeconds']>=before_reconnect['transportRoomAgeSeconds']
            assert ai['local']['velocity']==[0,0]  # fixture's explicit safe restore hook
            await a.evaluate('fixture.setVelocity(6,0)')
            anchor=ai['local']['p'][0]
            await until(b,f'fixture.inspect().remotes[0].pose.p[0]>{anchor+2}')
            check('resume retains identity, sequence and room time; one remote entity',
                  restore_hook_calls=ai['hooks']['restore'],duplicate_remote_entities=0)

            await b.locator('.mp-leave').click()
            await until(a,'fixture.inspect().remotes.length===0')
            assert (await inspect(b))['info']['state']=='idle'
            assert (await inspect(b))['hooks']['exit']==1
            check('explicit leave removes remote entity and restores fixture single-player')

            # Rejected invitation must not create a socket or touch the host.
            ws_count=await b.evaluate('__wsCreated')
            await b.locator('.mp-join-link').fill('https://attacker.invalid/tests/fixtures/index.html#room=fake')
            await b.locator('.mp-join').click()
            await until(b,"document.querySelector('.mp-error').textContent.length>0")
            assert await b.evaluate('__wsCreated')==ws_count
            check('invalid invite origin rejected before connecting')

            # Joining cancelled while the asynchronous host prepare hook is pending.
            await b.evaluate('fixture.setPrepareDelay(450)')
            await b.locator('.mp-create').click()
            await until(b,"fixture.inspect().info.state==='joining'")
            await b.locator('.mp-leave').click();await asyncio.sleep(.7)
            bi=await inspect(b)
            assert bi['info']['state']=='idle' and bi['remotes']==[]
            assert bi['hooks']['exit']==2
            check('cancelled async preparation cannot reconnect or mutate host later')
            await b.evaluate('fixture.setPrepareDelay(0)')
            await b.locator('.mp-create').click();await until(b,"fixture.inspect().info.state==='connected'")
            assert (await inspect(b))['transportRoomAgeSeconds']<1
            check('new room resets old room clock instead of reusing previous origin')
            await b.locator('.mp-leave').click()

            # No coercion of a new vessel onto the old controller/footprint identity.
            await a.evaluate("fixture.forceVessel('atlas-d-original-r7')")
            await until(a,"fixture.inspect().info.error==='VESSEL_SWITCH_REQUIRES_REJOIN'")
            assert (await inspect(a))['info']['state']=='error'
            check('vessel switch refused instead of reusing fixture controller as yacht',
                  scope='identity guard only; NOT yacht controller/footprint certification')

            # Use a fresh B connection to demonstrate backend shutdown honestly goes offline.
            await b.locator('.mp-create').click();await until(b,"fixture.inspect().info.state==='connected'")
            proc.stdin.write(b'{"type":"stop"}\n');await proc.stdin.drain()
            await asyncio.wait_for(proc.wait(),timeout=3)
            await until(b,"fixture.inspect().info.state!=='connected'")
            check('backend shutdown removes connected status')
            await b.locator('.mp-leave').click()
            assert not REPORT['page_errors'],REPORT['page_errors']
            check('no uncaught JavaScript errors in either browser')
            REPORT['status']='PASS_DIAGNOSTIC_FIXTURE_ONLY'
            REPORT['independent_browser_motion_verified']=True
            for browser in browsers:await browser.close()
            browsers=[]
    except Exception as e:
        REPORT['status']='BLOCKED_BROWSER_POLICY' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) else 'FAIL'
        REPORT['failure']={'type':type(e).__name__,'message':redact(e)[:1800]}
        print('BLOCKED/FAIL',REPORT['failure']['message'],flush=True)
    finally:
        for browser in browsers:
            try:await browser.close()
            except Exception:pass
        if proc.returncode is None:
            proc.terminate()
            try:await asyncio.wait_for(proc.wait(),timeout=3)
            except asyncio.TimeoutError:proc.kill();await proc.wait()
        errlog.close()
        (OUT/'browser-report.json').write_text(json.dumps(REPORT,indent=2)+'\n')

if __name__=='__main__':
    asyncio.run(main())
    if REPORT['status']!='PASS_DIAGNOSTIC_FIXTURE_ONLY':
        raise SystemExit(1)
