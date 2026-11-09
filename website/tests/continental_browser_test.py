"""Browser QA on actual standalone HTML, with a storage shim; no hosted integrations."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
R=Path(__file__).resolve().parents[1];OUT=R.parent;PREVIEW=OUT/'Fishing-Atlas-World-Preview.html'
W=json.loads((R/'src/world.json').read_text());M=json.loads((R/'dist/route-manifest.json').read_text())
errors=[];checks=[];overflow=[]
def ok(v,label):
 assert v,label
 checks.append(label)
def goto(p,path):
 p.evaluate('(s)=>{location.hash=s;window.dispatchEvent(new Event("hashchange"));}',path);p.wait_for_timeout(40)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 p.evaluate("""()=>{window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]??null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});} """)
 p.set_content(PREVIEW.read_text(),wait_until='domcontentloaded');p.wait_for_timeout(80)
 ok('796' in p.locator('.world-metrics').inner_text(),'Homepage shows 796 merged profiles, not double-counted 816')
 p.screenshot(path=str(OUT/'Fishing-Atlas-Continental-Desktop.png'))
 p.locator('#home-world-search').fill('Japan');p.get_by_role('button',name='Find my trip').click();p.wait_for_timeout(60)
 ok(p.locator('#trip-grid [data-trip-card]:visible').count()==5,'Retained global text search works')
 p.get_by_role('button',name='Clear filters').click();ok(p.locator('#trip-grid [data-trip-card]:visible').count()==24,'Library starts with 24 results')
 p.get_by_role('button',name='Show more trips').click();ok(p.locator('#trip-grid [data-trip-card]:visible').count()==48,'Pagination reveals 24 more')
 p.locator('#filter-state').select_option('Texas');ok(p.locator('#trip-grid [data-trip-card]:visible').count()==14,'Exact Texas state filter returns 14 production profiles')
 p.locator('#filter-depth').select_option('detailed-guide');ok(p.locator('#trip-grid [data-trip-card]:visible').count()==2,'State plus depth returns two checked Texas guides')
 p.get_by_role('button',name='Clear filters').click();p.locator('#filter-depth').select_option('preparation-brief');ok('479 of 796' in p.locator('#trip-count').inner_text(),'Research-pending frameworks have their own tier')
 p.get_by_role('button',name='Clear filters').click();p.locator('#filter-subregion').select_option('Nordic & Baltic')
 expected=sum(t.get('subregion')=='Nordic & Baltic' for t in W['trips']);ok(str(expected)+' of 796' in p.locator('#trip-count').inner_text(),'Other-continent editorial-region filter works')
 p.get_by_role('button',name='Clear filters').click();p.locator('#filter-month').select_option('1');ok(p.locator('#season-filter-note').is_visible(),'Season evidence qualification is visible')
 p.locator('#trip-search').fill('not-a-real-trip-xyzzz');ok(p.locator('#trip-empty').is_visible(),'Unknown query shows a coverage gap')
 for slug,count in [('united-states',50),('canada',13),('mexico',15)]:
  goto(p,'/north-america/'+slug+'/');ok(p.locator('.country-card').count()==count,f'{slug}: {count} subnational landing pages')
 goto(p,'/continents/');ok(p.locator('.country-card').count()==6,'Six populated continents; no invented Antarctic inventory')
 sample=next(t for t in W['trips'] if t.get('planId')=='US-GA-002')
 goto(p,'/trips/'+sample['id']+'/');p.wait_for_timeout(80)
 ok(p.evaluate('location.hash')=='#'+sample['canonicalPath'],'Legacy trip links resolve to canonical state route')
 ok(p.locator('.evidence-item').count()==3,'Chattahoochee guide renders three attributed source claims')
 ok(p.locator('.kit-decision').count()==4,'Source-checked guide renders four scoped requirements')
 p.screenshot(path=str(OUT/'Fishing-Atlas-Continental-Guide.png'))
 p.get_by_role('link',name='Customize this trip').click();p.wait_for_timeout(60)
 ok(p.locator('#plan-destination').input_value()==sample['id'],'New guide opens the matching planner')
 ok(p.locator('[id^="gear-status-'+sample['id']+'-kit-"]').count()==4,'Planner uses this trip’s four technical decisions')
 ok(p.locator('#gear-status-waders').count()==0,'Bank/boat scenario does not assume wading')
 p.locator('#gear-status-shell').select_option('owned');p.locator('[data-packed="shell"]').check()
 p.set_content(PREVIEW.read_text(),wait_until='domcontentloaded');goto(p,'/plan/')
 ok(p.locator('#gear-status-shell').input_value()=='owned' and p.locator('[data-packed="shell"]').is_checked(),'Owned/packed state survives remount using storage shim')
 prep=next(t for t in W['trips'] if t['contentTier']=='preparation-brief');goto(p,prep['canonicalPath'])
 ok('local research is not complete' in p.locator('.brief-note').inner_text(),'Unverified profile discloses incomplete local research')
 ok('Target candidates:' in p.locator('.brief-note').inner_text(),'Candidate targets are visibly distinguished from confirmed species')
 goto(p,'/production/europe/');ok(p.locator('.queue-record').count()==102,'Europe workbench contains 102 real records')
 p.locator('.queue-record summary').first.click();ok('Equipment:' in p.locator('.queue-detail').first.inner_text(),'Queue record exposes equipment and distribution decisions')
 with p.expect_download(timeout=5000) as dl:p.get_by_role('link',name='Download CSV queue').click()
 download=dl.value;ok(download.suggested_filename=='europe-queue.csv','Standalone exports a real CSV rather than routing to 404')
 download.save_as(str(OUT/'qa-europe-download.csv'));ok(len((OUT/'qa-europe-download.csv').read_text().splitlines())==103,'Export has 102 records plus header')
 print('Interaction checks passed',flush=True)
 for width,height in [(1440,1000),(390,844)]:
  p.set_viewport_size({'width':width,'height':height})
  # Render in browser rather than remote round-trips per assertion. Retain async redirect behavior.
  result=p.evaluate('''async(routes)=>{const bad=[],over=[];for(const route of routes){history.replaceState(null,'','#'+route);window.dispatchEvent(new Event('hashchange'));await new Promise(r=>setTimeout(r,12));if(document.querySelectorAll('h1').length!==1||!document.title.trim())bad.push(route);if(document.documentElement.scrollWidth>innerWidth+2)over.push(route);}return {bad,over};}''',list(M))
  ok(not result['bad'],f'All {len(M)} routes render one H1 and title at {width}px')
  overflow.extend({'width':width,'route':x} for x in result['over'])
  print('Completed route checks',width,flush=True)
 goto(p,'/north-america/united-states/texas/');p.screenshot(path=str(OUT/'Fishing-Atlas-Continental-Mobile.png'))
 p.set_viewport_size({'width':1440,'height':1000});goto(p,'/north-america/');p.screenshot(path=str(OUT/'Fishing-Atlas-North-America.png'))
 ok(not overflow,'No horizontal overflow across all route/viewport checks')
 ok(not errors,'No runtime errors in interactive preview and routing')
 # Test generated article's small bootstrap, preserving defer execution order.
 static=ctx.new_page();static.on('pageerror',lambda e:errors.append(str(e)))
 static.evaluate("""()=>Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}})""")
 text=(R/'dist'/sample['canonicalPath'].strip('/')/'index.html').read_text();inline=[]
 for asset in ['boot.js','engine.js','app.js']:
  text=text.replace(f'<script src="/assets/{asset}" defer></script>','');inline.append((R/'dist/assets'/asset).read_text().replace('</script','<\\/script'))
 text=text.replace('<link rel="stylesheet" href="/assets/style.css">','<style>'+re.sub(r'@import url\([^)]*\);','',(R/'dist/assets/style.css').read_text())+'</style>')
 text=text.replace('</body>',''.join('<script>'+s+'</script>' for s in inline)+'</body>')
 static.set_content(text,wait_until='domcontentloaded');static.wait_for_timeout(30)
 ok(static.locator('h1').count()==1 and not errors,'Lightweight article bootstrap works with actual generated HTML')
 b.close()
report={'passed':True,'routeViewportChecks':len(M)*2,'widths':[1440,390],'interactionChecks':checks,'javascriptErrors':errors,'horizontalOverflows':overflow,'harness':'Actual standalone artifact in an in-memory document and localStorage shim. Lightweight article scripts tested with defer order preserved. File/localhost navigation is blocked by administrator. No live hosting, retailer, payment or email integration tested.'}
(R/'tests/continental-browser-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='interactionChecks'},indent=2))
