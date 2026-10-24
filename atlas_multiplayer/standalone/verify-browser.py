"""Explicit local acceptance on an ALREADY permitted Playwright/Chromium installation.
No installs, policy changes, CI dispatch or alternative navigation paths.
Creates two separate browser processes and drives real visible controls.
NOT RUN in the managed blocked browser environment that authored this script.
"""
import json, os, pathlib, subprocess, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence' / 's1' / 'browser'
OUT.mkdir(parents=True, exist_ok=True)
report = {'scope': 'standalone browser acceptance', 'checks': [], 'errors': [], 'status': 'NOT_RUN'}
log = open(OUT / 'server.stderr', 'w')
server = subprocess.Popen(['node', 'standalone/tests/browser-driver.mjs'], cwd=ROOT,
                          stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True)
browsers = []
def check(name, ok):
    report['checks'].append({'name': name, 'passed': bool(ok)})
    if not ok:
        raise AssertionError(name)
def wait(page, expression):
    page.wait_for_function(expression, timeout=18000)
def read(page):
    return page.evaluate('window.ATLAS_OPEN_WATER.inspect()')
try:
    # Driver readiness is bounded, including a missing genuine ws dependency.
    import select
    ready, _, _ = select.select([server.stdout], [], [], 15)
    if not ready:
        raise RuntimeError('LOCAL_SERVER_NOT_READY')
    line = server.stdout.readline()
    if not line:
        raise RuntimeError('LOCAL_SERVER_FAILED; see server.stderr')
    origin = json.loads(line)['origin']
    with sync_playwright() as p:
        launch = {'headless': True}
        if os.environ.get('CHROMIUM_EXECUTABLE'):
            launch['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
        # Never reuse one browser context and label it two independent browsers.
        a_browser = p.chromium.launch(**launch); browsers.append(a_browser)
        b_browser = p.chromium.launch(**launch); browsers.append(b_browser)
        a = a_browser.new_page(viewport={'width': 1440, 'height': 960})
        b = b_browser.new_page(viewport={'width': 430, 'height': 932}, has_touch=True, is_mobile=True)
        for page in (a, b):
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.goto(origin, wait_until='networkidle', timeout=30000)
            wait(page, 'Boolean(window.ATLAS_OPEN_WATER)')
        # Solo uses the same controller and renderer before any room exists.
        a.keyboard.press('KeyE'); a.keyboard.down('KeyW'); time.sleep(1); a.keyboard.up('KeyW')
        wait(a, 'window.ATLAS_OPEN_WATER.inspect().pose.rpm > 1000')
        check('solo-before-room', read(a)['network']['state'] == 'idle')
        a.keyboard.press('Space')
        a.locator('#roomsToggle').click(); a.locator('.mp-name').fill('Desktop skipper')
        a.locator('.mp-create').click(); wait(a, 'window.ATLAS_OPEN_WATER.inspect().network.state === "connected"')
        invite = a.locator('.mp-share').input_value()
        b.locator('#roomsToggle').tap(); b.locator('.mp-name').fill('Phone skipper')
        b.locator('.mp-join-link').fill(invite); b.locator('.mp-join').tap()
        wait(b, 'window.ATLAS_OPEN_WATER.inspect().network.state === "connected"')
        wait(a, 'window.ATLAS_OPEN_WATER.inspect().remotes.length === 1')
        wait(b, 'window.ATLAS_OPEN_WATER.inspect().remotes.length === 1')
        check('distinct-player-identities', read(a)['network']['playerId'] != read(b)['network']['playerId'])
        a.locator('#closeRooms').click(); b.locator('#closeRooms').tap()
        start_a = read(a)['pose']['p'][0]; start_b = read(b)['pose']['p'][0]
        # Focus the scene before keyboard helm input, not a still-focused button.
        a.locator('#sea').click(position={'x': 700, 'y': 400}); a.keyboard.down('KeyW'); time.sleep(1.2); a.keyboard.up('KeyW')
        # Real touch events on the phone throttle; no direct controller mutation.
        box = b.locator('[data-hold="up"]').bounding_box()
        cdp = b.context.new_cdp_session(b)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2}]})
        time.sleep(1.2)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        wait(b, f'window.ATLAS_OPEN_WATER.inspect().remotes[0].pose.p[0] > {start_a + 1}')
        wait(a, f'window.ATLAS_OPEN_WATER.inspect().remotes[0].pose.p[0] > {start_b + 1}')
        check('two-process-bidirectional-motion', True)
        check('phone-throttle-input', read(b)['pose']['rpm'] > 1000)
        for page, name in ((a, 'desktop-motion'), (b, 'phone-motion')):
            page.screenshot(path=str(OUT / (name+'.png')), mask=[page.locator('[data-private]')])
        identity = read(a)['network']['playerId']
        server.stdin.write('{"drop":0}\n'); server.stdin.flush()
        wait(a, 'window.ATLAS_OPEN_WATER.inspect().stats.reconnects >= 1')
        check('reconnect-same-identity', read(a)['network']['playerId'] == identity)
        wait(b, 'window.ATLAS_OPEN_WATER.inspect().remotes.length === 1 && !window.ATLAS_OPEN_WATER.inspect().remotes[0].stale')
        b.locator('#roomsToggle').tap(); b.locator('.mp-leave').tap()
        wait(a, 'window.ATLAS_OPEN_WATER.inspect().remotes.length === 0')
        check('leave-restores-solo', read(b)['network']['state'] == 'idle')
        b.locator('.mp-create').tap(); wait(b, 'window.ATLAS_OPEN_WATER.inspect().network.state === "connected"')
        time.sleep(.4)
        check('room-isolation', read(b)['network']['roomId'] != read(a)['network']['roomId'] and not read(b)['remotes'] and not read(a)['remotes'])
        b.locator('#closeRooms').tap()
        b.set_viewport_size({'width': 932, 'height': 430})
        for selector in ('#roomsToggle', '#power', '#coast', '#camera', '[data-hold="up"]', '[data-hold="left"]'):
            box = b.locator(selector).bounding_box()
            check('landscape-reachable-'+selector, box and box['x'] >= 0 and box['y'] >= 0 and box['x']+box['width'] <= 933 and box['y']+box['height'] <= 431)
        b.screenshot(path=str(OUT/'phone-landscape.png'), mask=[b.locator('[data-private]')])
        check('no-page-errors', not report['errors'])
        report['status'] = 'PASS'
except Exception as exc:
    report['status'] = 'BLOCKED' if any(s in str(exc) for s in ('ERR_BLOCKED_BY_ADMINISTRATOR','Executable doesn\'t exist','LOCAL_SERVER')) else 'FAIL'
    report['failure'] = str(exc)
finally:
    for browser in browsers:
        try:
            browser.close()
        except Exception:
            pass
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill(); server.wait()
    log.close()
    (OUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['status'] == 'PASS' else 2 if report['status'] == 'BLOCKED' else 1)
