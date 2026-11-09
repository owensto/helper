"""Document-level browser QA; no live retailer, payment, email or booking tests.
The sandbox harness supplies a localStorage shim; actual hosted persistence remains
an integration test for deployment.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent
TEXT=(OUT/'Fishing-Atlas-World-Preview.html').read_text()
manifest=json.loads((ROOT/'dist/route-manifest.json').read_text())
checks=[];errors=[]
def goto(page,route):
    page.evaluate('(r)=>{location.hash=r;window.dispatchEvent(new Event("hashchange"));}',route)
    page.wait_for_timeout(35)
def mount(page,route='/',storage=None):
    page.evaluate('''(initial)=>{window.__store={...initial};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]??null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});}''',storage or {})
    page.set_content(TEXT,wait_until='load');goto(page,route)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    c=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));mount(page)
    assert 'Different waters.' in page.locator('h1').inner_text()
    page.screenshot(path=str(OUT/'Fishing-Atlas-World-Preview.png'),full_page=False)
    page.locator('#home-world-search').fill('glacier');page.get_by_role('button',name='Explore the atlas').click();page.wait_for_timeout(70)
    assert page.locator('#trip-count').inner_text().startswith('1 of 29')
    checks.append('Homepage search routes to the real glacier-influenced river guide')
    page.get_by_role('button',name='Clear filters').click()
    assert page.locator('#trip-grid [data-trip-card]:visible').count()==29
    page.locator('#filter-habitat').select_option('Saltwater flats')
    flats=page.locator('#trip-grid [data-trip-card]:visible').count();assert flats>=4,flats
    page.locator('#filter-region').select_option('Africa')
    assert page.locator('#trip-grid [data-trip-card]:visible').count()==1
    assert 'Cosmoledo' in page.locator('#trip-grid [data-trip-card]:visible').inner_text()
    checks.append('Environment and regional filters combine correctly')
    page.get_by_role('button',name='Clear filters').click();page.locator('#filter-method').select_option('Ice jigging')
    assert page.locator('#trip-grid [data-trip-card]:visible').count()==1
    page.get_by_role('button',name='Clear filters').click();page.locator('#filter-month').select_option('1')
    assert page.locator('#season-filter-note').is_visible()
    assert page.locator('#trip-grid [data-trip-card]:visible').count()>=3
    page.locator('#trip-search').fill('unknownfishery');assert page.locator('#trip-empty').is_visible()
    checks.append('Method, qualified seasonal filter and empty coverage states pass')
    goto(page,'/trips/cosmoledo-gt/')
    assert page.locator('.kit-decision').count()==4
    page.get_by_role('link',name='Customize this trip').click();page.wait_for_timeout(60)
    assert page.locator('#plan-destination').input_value()=='cosmoledo-gt'
    assert page.locator('[id^="gear-status-cosmoledo-gt-kit-"]').count()==4
    assert page.locator('#gear-status-rod').count()==0
    page.locator('#gear-status-shell').select_option('owned');page.locator('[data-packed="shell"]').check()
    saved=page.evaluate('window.__store')
    reload=c.new_page();mount(reload,'/plan/',saved)
    assert reload.locator('#gear-status-shell').input_value()=='owned'
    assert reload.locator('[data-packed="shell"]').is_checked()
    checks.append('Trip guide opens its own four equipment decisions; ownership persists in storage serialization')
    goto(page,'/plan/?destination=lower-zambezi-tiger&style=river')
    assert page.locator('#plan-style').input_value()=='guidedboat'
    assert page.locator('#gear-status-waders').count()==0
    assert page.locator('#gear-status-sunshirt').count()==1
    assert page.locator('#gear-status-midlayer').count()==0
    goto(page,'/plan/?destination=finland-ice-fishing&date=2027-07-15')
    assert page.locator('#gear-status-midlayer').count()==1
    assert page.locator('#gear-status-waders').count()==0
    assert 'not established' in page.locator('.trip-profile-note').inner_text()
    checks.append('Tropical boat and ice profiles exclude automatic wading; uncertain dates stay qualified')
    goto(page,'/research/')
    assert page.locator('.register-entry').count()==37
    assert page.locator('.issue-card').count()==7
    checks.append('Research register and excluded/qualified claim log render')
    # Every route gets a document-level render and overflow check on desktop and mobile.
    for route in manifest:
        goto(page,route);assert page.locator('h1').count()==1,route
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),('desktop overflow',route)
    checks.append(f'All {len(manifest)} routes render on desktop without horizontal overflow')
    mc=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    m=mc.new_page();m.on('pageerror',lambda e:errors.append(str(e)));mount(m)
    m.screenshot(path=str(OUT/'Fishing-Atlas-World-Mobile.png'),full_page=False)
    for route in manifest:
        goto(m,route);assert m.locator('h1').count()==1,route
        assert m.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),('mobile overflow',route)
    goto(m,'/trips/');m.screenshot(path=str(OUT/'Fishing-Atlas-World-Library-Mobile.png'),full_page=False)
    goto(page,'/trips/');page.screenshot(path=str(OUT/'Fishing-Atlas-World-Library.png'),full_page=False)
    goto(page,'/trips/cosmoledo-gt/');page.screenshot(path=str(OUT/'Fishing-Atlas-World-Guide.png'),full_page=True)
    m.get_by_role('button',name='Toggle navigation').click();assert m.locator('#site-nav').is_visible()
    checks.append(f'All {len(manifest)} routes render at 390px without horizontal overflow; mobile menu works')
    assert not errors,errors
    checks.append('No JavaScript exceptions in tested flows')
    browser.close()
(ROOT/'tests/world-browser-results.json').write_text(json.dumps({'passed':True,'environment':'In-memory HTML; localStorage shim; no external transaction or live hosting verification','checks':checks},indent=2))
print('\n'.join(checks))
