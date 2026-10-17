"""Read-only public launch/navigation smoke. No response substitution or host writes."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib, json, os, time, traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = Path(os.environ.get('REVIEW_DIR', '/tmp/atlas-launch-review'))
OUT.mkdir(parents=True, exist_ok=True)
LAUNCH = 'https://rawcdn.githack.com/owensto/helper/458ef79ac512a70468a4c134ddf0596449a3ccf1/atlas_launch/index.html'
LINKS = {
    'launch-bay': 'https://rawcdn.githack.com/owensto/helper/491fbb0133fde085c03e4ee93db34f4e630a3c42/atlas_sealab_13/live/index.html',
    'launch-yacht': 'https://rawcdn.githack.com/owensto/helper/006644dae913c9bc6f874cdaaaba31986dbc519b/atlas_d_simulator_01/contact/y11/preview.html',
    'physics-report': 'https://rawcdn.githack.com/owensto/helper/006644dae913c9bc6f874cdaaaba31986dbc519b/atlas_d_simulator_01/contact/y11/report.html',
}
report = {'passed': False, 'launcher': LAUNCH, 'testSource': os.environ.get('GITHUB_SHA'),
          'scope': 'Actual public launcher and linked solo-demo smoke; not full regression, engineering, optical, physical-device or multiplayer validation.',
          'noResponseSubstitution': True, 'layouts': [], 'apps': []}

def save():
    (OUT / 'public-smoke.json').write_text(json.dumps(report, indent=2))

def notice(p, row):
    link = p.get_by_text('Open the page', exact=True)
    if link.count() and link.first.is_visible():
        link.first.click(timeout=30000)
        row.setdefault('normalHostingNotice', []).append(p.url)

def open_launch(p, row):
    p.goto(LAUNCH, wait_until='domcontentloaded', timeout=120000)
    notice(p, row)
    p.locator('#atlas-launch').wait_for(timeout=60000)
    # The normal browser context has handled any host notice before this GET.
    response = p.request.get(LAUNCH, timeout=60000)
    data = response.body()
    assert response.status == 200, response.status
    assert data == (ROOT / 'index.html').read_bytes(), 'Public launcher differs from committed file'
    row['launcherSHA256'] = hashlib.sha256(data).hexdigest()
    for key, expected in LINKS.items():
        assert p.locator('#' + key).get_attribute('href') == expected, key

def tap(p, selector, frame=None):
    loc = frame.locator(selector) if frame else p.locator(selector)
    loc.scroll_into_view_if_needed(timeout=30000)
    assert loc.evaluate('e=>{const r=e.getBoundingClientRect();const n=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled && (n===e||e.contains(n));}'), selector
    box = loc.bounding_box()
    assert box, selector
    p.touchscreen.tap(box['x'] + box['width']/2, box['y'] + box['height']/2)
    p.wait_for_timeout(200)

def wait_bay(p, expression, row):
    for _ in range(3):
        p.wait_for_function('BAYPLAY.pauseReason==="render-stall" || (' + expression + ')', timeout=60000)
        if p.evaluate(expression):
            return
        row.setdefault('visibleStallRecoveries', 0)
        row['visibleStallRecoveries'] += 1
        tap(p, '#sea10-resume')
    raise AssertionError('Repeated render stall prevented smoke check')

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    report['browser'] = b.version
    try:
        for name, width, height in [('desktop',1440,960), ('phone',390,844), ('small-phone',375,812), ('landscape',844,390)]:
            row = {'name':name,'passed':False,'errors':[]}
            report['layouts'].append(row)
            ctx = b.new_context(viewport={'width':width,'height':height},has_touch=True,device_scale_factor=1)
            p = ctx.new_page(); p.on('pageerror',lambda e,r=row:r['errors'].append(str(e)))
            try:
                open_launch(p,row)
                assert p.evaluate('document.documentElement.scrollWidth') <= width + 1
                for selector in ['#launch-bay','#launch-yacht']:
                    loc=p.locator(selector);loc.scroll_into_view_if_needed()
                    q=loc.bounding_box();assert q and q['height']>=44 and q['x']>=0 and q['x']+q['width']<=width+1
                    assert loc.evaluate('e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}')
                p.evaluate('window.scrollTo(0,0)')
                p.screenshot(path=str(OUT/(name+'-launcher.png')),full_page=True,timeout=60000)
                assert not row['errors'];row['passed']=True
            except Exception as e:
                row['error']=str(e);row['traceback']=traceback.format_exc()
            finally:ctx.close();save()
        # Real link clicks lead directly to the owners' immutable public builds.
        for kind in ['bay','yacht']:
            row={'name':kind,'passed':False,'errors':[],'publicURL':LINKS['launch-'+kind]}
            report['apps'].append(row)
            ctx=b.new_context(viewport={'width':1440,'height':960},has_touch=True,device_scale_factor=1)
            p=ctx.new_page();p.set_default_timeout(60000)
            p.on('pageerror',lambda e,r=row:r['errors'].append(str(e)))
            try:
                open_launch(p,row);tap(p,'#launch-'+kind);p.wait_for_load_state('domcontentloaded');notice(p,row)
                assert urlsplit(p.url).path == urlsplit(row['publicURL']).path, p.url
                if kind=='bay':
                    p.wait_for_function('window.SEA13?.ready && BAYPLAY.ready',timeout=180000)
                    row['initial']=p.evaluate('SEA13.inspect()')
                    assert row['initial']['location']=='beaufort' and not row['initial']['multiplayer'] and not row['initial']['experimentalHuman']
                    tap(p,'#helm09-key')
                    wait_bay(p,'BAYPLAY.state.engine && BAYPLAY.state.startTimer===0',row)
                    tap(p,'[data-gear09="1"]');tap(p,'#s12-wot')
                    wait_bay(p,'BAYPLAY.state.speedOverGround>.3 && !BAYPLAY.inspect().paused',row)
                    row['motion']=p.evaluate('({elapsed:BAYPLAY.state.elapsed,speed:BAYPLAY.state.speedOverGround,engine:BAYPLAY.state.engine,gear:BAYPLAY.state.gear})')
                    tap(p,'#helm09-pause');assert p.evaluate('BAYPLAY.inspect().paused')
                    t=p.evaluate('BAYPLAY.state.elapsed');p.wait_for_timeout(600);assert p.evaluate('BAYPLAY.state.elapsed')==t
                    resume=p.locator('#sea10-resume')
                    tap(p,'#sea10-resume' if resume.count() and resume.is_visible() else '#helm09-pause')
                    wait_bay(p,f'BAYPLAY.state.elapsed>{t!r} && !BAYPLAY.inspect().paused',row)
                    row['nativePauseResume']=True
                else:
                    p.wait_for_function('window.Y11_PUBLIC && window.Y4?.ready && window.Y9?.ready',timeout=180000)
                    host=next(f for f in p.frames if '/y11/host/index.html' in f.url)
                    frame=p.frame_locator('#host')
                    state=lambda:host.evaluate('ATLAS_D_SIM.state.snapshot()')
                    assert frame.locator('#ad-board').inner_text()=='Board original ATLAS D'
                    tap(p,'#ad-board',frame);p.wait_for_function('Y4.latest?.physical.available',timeout=90000)
                    if state()['paused']:
                        row['startupRecoveryReason']=host.evaluate('ATLAS_D_SIM.state.message');tap(p,'#ad-pause',frame)
                    assert state()['physicsModel']=='atlas-d-y11-3dof-1'
                    tap(p,'#ad-engine',frame);tap(p,'[data-ad-gear="1"]',frame)
                    slider=frame.locator('#ad-throttle');slider.scroll_into_view_if_needed();box=slider.bounding_box();assert box
                    p.touchscreen.tap(box['x']+.72*box['width'],box['y']+box['height']/2)
                    before=state();deadline=time.monotonic()+60
                    while time.monotonic()<deadline:
                        current=state()
                        if current['elapsed']>before['elapsed']+2 and current['speedMps']>.03 and not current['paused']:break
                        if current['paused']:raise AssertionError('Yacht stalled during ordinary-motion observation')
                        p.wait_for_timeout(500)
                    else:raise AssertionError('Yacht did not advance under native power')
                    row['motion']={'before':before,'after':current,'testStepUsed':False}
                    tap(p,'#ad-pause',frame);frozen=state();assert frozen['paused'];p.wait_for_timeout(600);assert state()['elapsed']==frozen['elapsed']
                    tap(p,'#ad-pause',frame);host.wait_for_function(f'ATLAS_D_SIM.state.elapsed>{frozen["elapsed"]!r} && !ATLAS_D_SIM.state.paused',timeout=60000)
                    row['nativePauseResume']=True
                    assert p.evaluate('Y4.latest.mapped.attachment===null')
                p.screenshot(path=str(OUT/(kind+'-public.png')),timeout=60000)
                assert not row['errors'],row['errors'];row['passed']=True
            except Exception as e:
                row['error']=str(e);row['traceback']=traceback.format_exc()
                try:p.screenshot(path=str(OUT/(kind+'-failure.png')),timeout=10000)
                except Exception:pass
            finally:ctx.close();save()
        report['passed']=all(r['passed'] for r in report['layouts']+report['apps'])
    finally:b.close();save()
print(json.dumps({'passed':report['passed'],'launcher':LAUNCH,'layouts':[(r['name'],r['passed']) for r in report['layouts']],'apps':[(r['name'],r['passed']) for r in report['apps']]},indent=2))
raise SystemExit(0 if report['passed'] else 1)
