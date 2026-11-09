"""Browser QA on the generated standalone artifact, using an in-memory document and storage shim.
No live inventory, email, hosting, retailer or payment integration is tested.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT.parent
PREVIEW=OUT/'Fishing-Atlas-World-Preview.html'
W=json.loads((ROOT/'src/world.json').read_text());routes=json.loads((ROOT/'dist/route-manifest.json').read_text())
errors=[];checks=[];overflows=[]
def goto(p,route):
 p.evaluate('(r)=>{location.hash=r;window.dispatchEvent(new Event("hashchange"));}',route)
 p.wait_for_timeout(12)
def expect(x,label):
 if not x:raise AssertionError(label)
 checks.append(label)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate("""()=>{window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]??null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});} """);p.set_content(PREVIEW.read_text(),wait_until='load');p.wait_for_timeout(60)
 expect('309' in p.locator('.world-metrics').inner_text(),'Homepage shows current global counts')
 p.screenshot(path=str(OUT/'Fishing-Atlas-Global-Desktop.png'),full_page=False)
 p.locator('#home-world-search').fill('Japan');p.get_by_role('button',name='Explore the atlas').click();p.wait_for_timeout(80)
 expect(p.locator('#trip-grid [data-trip-card]:visible').count()==5,'Search Japan returns its five real profiles')
 p.get_by_role('button',name='Clear filters').click()
 expect(p.locator('#trip-grid [data-trip-card]:visible').count()==24,'Initial library page shows 24 matching profiles')
 p.get_by_role('button',name='Show more trips').click()
 expect(p.locator('#trip-grid [data-trip-card]:visible').count()==48,'Load more reveals another 24 profiles')
 p.locator('#filter-country').select_option('Kiribati')
 expect(p.locator('#trip-grid [data-trip-card]:visible').count()==3,'Country filter finds three Kiribati trip scenarios')
 p.locator('#filter-water').select_option('Saltwater');p.locator('#filter-habitat').select_option('Saltwater flats')
 expect(p.locator('#trip-grid [data-trip-card]:visible').count()==2,'Country, water and habitat filters combine')
 p.get_by_role('button',name='Clear filters').click();p.locator('#filter-depth').select_option('detailed-guide')
 expect('29 of 309' in p.locator('#trip-count').inner_text(),'Research-depth filter identifies the retained 29 guides')
 p.get_by_role('button',name='Clear filters').click();p.locator('#filter-month').select_option('1')
 expect(p.locator('#season-filter-note').is_visible(),'Season filtering explains missing evidence')
 p.locator('#trip-search').fill('not-a-real-fishery-xyz')
 expect(p.locator('#trip-empty').is_visible(),'Unknown searches show a coverage gap, not a invented trip')
 goto(p,'/countries/')
 expect(p.locator('.country-card').count()==118,'All 118 country/jurisdiction collections are linked')
 p.locator('.country-jump a').filter(has_text='Oceania').click();p.wait_for_timeout(100)
 expect(p.locator('h1').inner_text().startswith('118'),'In-page region anchors do not reset the preview router')
 p.screenshot(path=str(OUT/'Fishing-Atlas-Global-Countries.png'),full_page=False)
 goto(p,'/countries/japan/')
 expect(p.locator('[data-trip-card]').count()==5,'Country page renders the exact matching profiles')
 sample=next(t for t in W['trips'] if t['place']=='Papatura — nearby rivers')
 goto(p,'/trips/'+sample['id']+'/')
 expect(p.locator('.brief-note').count()==1,'New trip brief has an explicit research-depth notice')
 expect(p.locator('.kit-decision').count()==4,'New trip brief has four equipment decisions')
 p.screenshot(path=str(OUT/'Fishing-Atlas-Global-Trip.png'),full_page=False)
 p.get_by_role('link',name='Customize this trip').click();p.wait_for_timeout(75)
 expect(p.locator('#plan-destination').input_value()==sample['id'],'New trip opens its own planner profile')
 expect(p.locator('[id^="gear-status-'+sample['id']+'-kit-"]').count()==4,'Planner loads the chosen brief’s four requirements')
 expect(p.locator('#gear-status-waders').count()==0,'Tropical river boat profile does not imply independent wading')
 p.locator('#gear-status-shell').select_option('owned');p.locator('[data-packed="shell"]').check()
 p.set_content(PREVIEW.read_text(),wait_until='load');goto(p,'/plan/');p.wait_for_timeout(40)
 expect(p.locator('#gear-status-shell').input_value()=='owned' and p.locator('[data-packed="shell"]').is_checked(),'Gear state survives document remount using the storage shim')
 goto(p,'/research/')
 expect(p.locator('.register-entry').count()==202,'Research desk shows all 202 source records')
 # Document-level smoke checks for every route, at desktop and mobile widths.
 for width,height in [(1440,1000),(390,844)]:
  p.set_viewport_size({'width':width,'height':height})
  for route in routes:
   goto(p,route)
   if p.locator('h1').count()!=1:raise AssertionError(f'{width}px {route}: H1 count')
   if not p.title().strip():raise AssertionError(f'{width}px {route}: empty title')
   if p.evaluate('document.documentElement.scrollWidth>innerWidth+2'):overflows.append({'width':width,'route':route})
  checks.append(f'All {len(routes)} routes render one H1 and a title at {width}px')
 goto(p,'/trips/?country=Kiribati');p.screenshot(path=str(OUT/'Fishing-Atlas-Global-Mobile.png'),full_page=False)
 expect(not errors,'No JavaScript runtime errors during browser tests')
 browser.close()
report={'passed':not errors and not overflows,'routeCount':len(routes),'viewportChecks':len(routes)*2,'checks':checks,'javascriptErrors':errors,'horizontalOverflows':overflows,'scope':'Standalone preview in an in-memory document with a localStorage shim. File-origin navigation is blocked by the browser environment; hosted persistence and live integrations were not tested.'}
(ROOT/'tests/global-browser-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
