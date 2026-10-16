"""Y4 first pass: unchanged Y3 viewport audit, no acceptance claims."""
from pathlib import Path
import os,json,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;E=R/'evidence';E.mkdir(exist_ok=True)
BASE=os.environ.get('ORIGIN','http://127.0.0.1:8918')
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for name,w,h in [('portrait',390,844),('landscape',844,390)]:
  c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=True,is_mobile=True)
  page=c.new_page();r={'layout':name,'viewport':[w,h],'phase':'unchanged-Y3-before','physicalDevice':False,'functionalAcceptance':False};rows.append(r)
  try:
   page.goto(BASE+'/atlas_d_simulator_01/contact/y3/preview.html',wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('window.Y3?.ready || window.Y3?.error',timeout=180000);assert not page.evaluate('Y3.error')
   f=page.frames[1]
   r['iframe']=page.locator('#host').bounding_box();r['board']=page.frame_locator('#host').locator('#ad-board').bounding_box()
   page.screenshot(path=str(E/(name+'-before-board.png')),timeout=60000)
   # Diagnostic setup only: expose the unchanged layout when its Board control is unreachable.
   f.evaluate('ATLAS_D_SIM.enter()');page.wait_for_function('Y3.latest?.physical.available',timeout=60000)
   r['setup']='enter() for layout inspection only, not a successful touch action'
   r['controls']=f.evaluate('''() => ['ad-engine','ad-left','ad-right','ad-pause','ad-dive','ad-surface'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})''')
   r['innerViewport']=f.evaluate('({width:innerWidth,height:innerHeight})')
   page.screenshot(path=str(E/(name+'-before-station.png')),timeout=60000)
  except Exception as e:r['error']=str(e);r['traceback']=traceback.format_exc();raise
  finally:c.close();(E/'before.json').write_text(json.dumps(rows,indent=2))
 b.close()
print(json.dumps(rows,indent=2))
