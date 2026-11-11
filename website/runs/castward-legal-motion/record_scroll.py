from playwright.sync_api import sync_playwright
from pathlib import Path
import sys,json
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8777'
out=Path('runs/castward-legal-motion');captures=out/'recordings';captures.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch()
 for width in [1440,390]:
  ctx=b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,record_video_dir=str(captures),record_video_size={'width':width,'height':900})
  ctx.add_init_script("localStorage.setItem('castward.analytics-consent.v1',JSON.stringify({choice:'reject',at:Date.now()}))")
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='networkidle');page.wait_for_timeout(800)
  page.screenshot(path=str(out/f'home-{width}.png'))
  page.evaluate('''async()=>{const end=document.documentElement.scrollHeight-innerHeight;const start=performance.now();await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/20000);scrollTo({top:end*t,behavior:"instant"});if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)})}''')
  page.wait_for_timeout(700);video=page.video;ctx.close();video.save_as(str(out/f'home-scroll-{width}.webm'));video.delete()
 b.close()
assert not errors,errors
(out/'recordings.json').write_text(json.dumps({'base':base,'widths':[1440,390],'scrollSeconds':20,'pageErrors':errors},indent=2))
print('Recorded home scrolls at 1440 and 390 pixels.')
