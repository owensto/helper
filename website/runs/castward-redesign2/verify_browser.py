from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,runpy
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765'
out=Path('runs/castward-redesign2/after');out.mkdir(parents=True,exist_ok=True)
routes={'home':'/','trips':'/trips/','guide':'/north-america/united-states/texas/lake-fork-lake-and-reservoir-bass/','videos':'/videos/'}
checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for width in [390,1440]:
  page=b.new_page(viewport={'width':width,'height':900},device_scale_factor=1,reduced_motion='reduce')
  page.on('pageerror',lambda e:errors.append(str(e)))
  for name,path in routes.items():
   page.goto(base+path,wait_until='networkidle');page.evaluate('document.fonts.ready')
   if name=='home':page.screenshot(path=str(out/f'home-{width}-viewport.png'))
   # Visit the full document so lazy-loaded photos appear in the full-page record.
   page.evaluate('''async()=>{for(let y=0;y<document.body.scrollHeight;y+=650){scrollTo(0,y);await new Promise(r=>setTimeout(r,90))}scrollTo(0,0)}''')
   page.wait_for_timeout(800)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width,'overflow')
   assert page.locator('img:visible').evaluate_all('(imgs)=>imgs.every(i=>i.complete && i.naturalWidth>0)'),(name,width,'image')
   page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
   checks.append({'page':name,'width':width,'overflow':False,'images':'loaded','title':page.title()})
  page.goto(base+'/',wait_until='networkidle')
  page.get_by_role('button',name='Search trips',exact=True).click();assert page.locator('#search-dialog').is_visible()
  page.locator('#header-search').fill('Lake Fork');page.locator('#search-dialog').get_by_role('button',name='Search',exact=True).click();page.wait_for_load_state('networkidle');assert page.locator('[data-trip-card]:visible').count()>0
  if width==390:
   page.locator('[data-action=menu]').click();assert page.locator('#site-nav').is_visible();page.keyboard.press('Escape');assert not page.locator('#site-nav').is_visible()
  page.goto(base+'/trips/?habitat=Ice+fishing',wait_until='networkidle');assert page.locator('[data-trip-card]:visible').count()>0
  assert page.locator('[data-trip-card]:visible').evaluate_all('(cards)=>cards.every(c=>c.dataset.habitat.includes("Ice fishing"))')
  page.goto(base+'/plan/',wait_until='networkidle');page.locator('#gear-status-shell').select_option('owned');page.locator('[data-packed="shell"]').check();page.reload(wait_until='networkidle');assert page.locator('#gear-status-shell').input_value()=='owned';assert page.locator('[data-packed="shell"]').is_checked()
  page.close()
 assert not errors,errors
 b.close()
Path('runs/castward-redesign2/browser-checks.json').write_text(json.dumps({'base':base,'screens':checks,'search':True,'menuEscape':True,'habitatFilter':True,'plannerPersistence':True,'pageErrors':errors},indent=2))
print('PASS: all screenshots, loaded images, no overflow, search, menu, filter, saved planner, no JS errors')
