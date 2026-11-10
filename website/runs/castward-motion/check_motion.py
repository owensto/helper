from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765'
out=Path('runs/castward-motion');errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [1440,390]:
  context=b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,record_video_dir=str(out/'video'),record_video_size={'width':width,'height':900})
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='networkidle');page.wait_for_timeout(1300)
  assert page.evaluate('typeof gsap')==('object' if width==1440 else 'undefined')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(out/f'home-{width}.png'))
  # A 12-second continuous scroll through the photo stories and film strip.
  page.evaluate('''async()=>{const end=document.querySelector('.region-band').getBoundingClientRect().top+scrollY;const start=performance.now();await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/12000);scrollTo(0,end*t);if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)})}''')
  page.screenshot(path=str(out/f'films-{width}.png'))
  checks.append({'width':width,'triggers':page.evaluate('typeof ScrollTrigger==="undefined"?0:ScrollTrigger.getAll().length'),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
  video=page.video;context.close();video.save_as(str(out/f'home-scroll-{width}.webm'))
 # Interactive checks outside recording.
 page=b.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle')
 page.wait_for_function('typeof ScrollTrigger !== \"undefined\"');page.wait_for_timeout(800)
 page.evaluate("scrollTo(0,ScrollTrigger.getAll().find(t=>t.vars.pin).start+400)");page.wait_for_timeout(1200)
 assert page.locator('.watch-section').evaluate('el=>el.classList.contains("is-pinned")')
 page.screenshot(path=str(out/'films-pinned-1440.png'))
 page.get_by_role('button',name='Next film',exact=True).click();page.wait_for_timeout(1500)
 checks.append({'filmCount':page.locator('.film-count').inner_text(),'playing':page.locator('video').evaluate_all('(vs)=>vs.filter(v=>!v.paused).length')})
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(500)
 assert page.evaluate('typeof ScrollTrigger==="undefined"?0:ScrollTrigger.getAll().length')==0
 assert page.locator('video').evaluate_all('(vs)=>vs.every(v=>v.paused)')
 assert not page.locator('.motion-cursor').count()
 page.set_viewport_size({'width':390,'height':900});page.evaluate('scrollTo(0,0)');page.locator('[data-action=menu]').click()
 assert page.locator('main').evaluate('el=>el.inert')
 page.screenshot(path=str(out/'menu-390.png'));page.keyboard.press('Escape');assert not page.locator('main').evaluate('el=>el.inert')
 page.goto(base+'/404/',wait_until='networkidle');page.screenshot(path=str(out/'404-390.png'))
 b.close()
assert not errors,errors
(out/'motion-checks.json').write_text(json.dumps({'base':base,'checks':checks,'errors':errors,'reducedMotion':True,'menuInert':True},indent=2))
print(checks)
