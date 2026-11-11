from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,re
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8777'
out=Path('runs/castward-legal-motion');out.mkdir(exist_ok=True)
legal=['privacy','terms','cookies','disclaimer','affiliate-disclosure','accessibility']
trip='/north-america/united-states/texas/lake-fork-lake-and-reservoir-bass/'
results=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [1440,390]:
  context=b.new_context(viewport={'width':width,'height':900})
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.locator('[data-consent=reject]').click();page.wait_for_timeout(800)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==1440:
   page.wait_for_function('typeof ScrollTrigger!=="undefined"')
   triggers=page.evaluate('ScrollTrigger.getAll().filter(t=>t.vars.pin).map(t=>({start:t.start,end:t.end,cls:t.trigger.className}))')
   assert len(triggers)==3,triggers
   for a,z in zip(triggers,triggers[1:]):assert a['end']<z['start'],triggers
   for step in range(4):
    page.evaluate('(i)=>{const t=ScrollTrigger.getAll().find(t=>t.trigger.classList.contains("water-sequence"));scrollTo(0,t.start+(i/3)*(t.end-t.start));}',step)
    page.wait_for_timeout(500)
    active=page.locator('.water-story[aria-hidden=false]');assert active.count()==1
    assert active.locator('h2').inner_text().lower() in ['inshore','offshore','rivers & streams','ice'][step],step
   page.evaluate('scrollTo(0,0)');page.wait_for_timeout(250);page.locator('.motion-toggle').click();assert page.evaluate('ScrollTrigger.getAll().length')==0
   assert page.locator('.water-story[inert]').count()==0
   page.locator('.motion-toggle').click();page.wait_for_timeout(600)
   assert page.locator('.sequence-pinned').count()==1
   page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(250)
   assert page.evaluate('ScrollTrigger.getAll().length')==0
   assert page.locator('.sequence-pinned').count()==0
   assert page.locator('video').evaluate_all('(vs)=>vs.every(v=>v.paused)')
   page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(400)
  else:
   assert page.evaluate('typeof gsap')=='undefined'
   page.locator('[data-action=menu]').click();assert page.locator('main').evaluate('(el)=>el.inert')
   page.keyboard.press('Escape');assert not page.locator('main').evaluate('(el)=>el.inert')
  for slug in legal:
   page.goto(base+'/'+slug+'/');assert 'Last updated: November 10, 2026' in page.locator('main').inner_text()
   assert not re.search(r'owner to confirm|legal entity name|mailing address',page.locator('main').inner_text(),re.I)
   links=page.locator('.legal-toc a').evaluate_all('(els)=>els.map(e=>e.hash)');assert len(links)>=6
   for link in links:assert page.locator(link).count()==1,(slug,link)
   assert page.locator('footer a[href="/'+slug+'/"]').count()==1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,slug)
   results.append({'width':width,'route':'/'+slug+'/','sections':len(links),'passed':True})
  page.goto(base+'/cookies/');button=page.locator('.legal-article [data-cookie-settings]');button.click();assert page.locator('#cookie-banner').is_visible()
  page.locator('[data-consent=reject]').click();assert not page.locator('#cookie-banner').is_visible();assert button.evaluate('(el)=>document.activeElement===el')
  page.goto(base+'/trips/');page.locator('#trip-search').fill('Alaska');page.locator('#trip-sort').select_option('az');page.wait_for_timeout(300)
  titles=page.locator('#trip-grid .world-card:not([hidden]) h3').all_text_contents();assert len(titles)>0
  assert page.evaluate('[...document.querySelectorAll("#trip-grid .world-card:not([hidden]) h3")].every((e,i,a)=>!i||a[i-1].textContent.localeCompare(e.textContent)<=0)')
  assert page.locator('#trip-count').inner_text().startswith('20 of ')
  page.goto(base+trip);assert page.locator('.trip-reading-chips').count()==1
  season_link=page.locator('.trip-reading-chips a[href^="#"]');anchor=season_link.get_attribute('href')
  season_link.click();page.wait_for_timeout(550)
  assert page.locator(anchor).bounding_box()['y']>=100
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'trip-season-{width}.png'))
  context.close()
 # Real analytics can be inspected without submitting a form or sending a message.
 context=b.new_context();page=context.new_page();page.goto(base+'/cookies/')
 assert not page.locator('script[src*="googletagmanager"]').count()
 page.locator('[data-consent=accept]').click();page.wait_for_timeout(1800)
 assert page.locator('script[src*="googletagmanager"]').count()==1
 observed=[c['name'] for c in context.cookies() if c['name'].startswith('_ga')]
 page.locator('.legal-article [data-cookie-settings]').click();page.locator('[data-consent=reject]').click()
 assert not [c for c in context.cookies() if c['name'].startswith('_ga')]
 page.reload();assert not page.locator('script[src*="googletagmanager"]').count();context.close()
 context=b.new_context();context.add_init_script('Object.defineProperty(navigator,"globalPrivacyControl",{get:()=>true})');page=context.new_page();page.goto(base+'/cookies/');page.locator('.legal-article [data-cookie-settings]').click();page.locator('[data-consent=accept]').click();assert not page.locator('script[src*="googletagmanager"]').count();context.close()
 context=b.new_context(java_script_enabled=False);page=context.new_page();page.goto(base);assert page.locator('.water-story').count()==4;assert page.locator('.water-story').evaluate_all('(els)=>els.every(e=>e.getBoundingClientRect().height>0)');page.goto(base+'/privacy/');assert page.locator('.legal-article section').count()==17;context.close()
 b.close()
assert not errors,errors
(out/('browser-live.json' if 'https:' in base else 'browser-local.json')).write_text(json.dumps({'base':base,'checks':results,'pageErrors':errors,'analyticsCookiesObserved':observed,'consentAndGPC':True,'reducedMotionAndPause':True,'noJavaScriptContent':True,'sortAndFilter':True},indent=2))
print('Passed legal routes at two widths, pins, pause, reduced motion, menu, filters, sort, consent, GPC, and no-JS content. Cookies:',observed)
