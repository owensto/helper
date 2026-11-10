from playwright.sync_api import sync_playwright
from pathlib import Path
import sys,json
base,phase=sys.argv[1:]
out=Path('runs/castward-redesign')/phase;out.mkdir(parents=True,exist_ok=True)
routes={'home':'/','trips':'/trips/','plan':'/plan/','guide':'/north-america/united-states/texas/lake-fork-lake-and-reservoir-bass/','videos':'/videos/'}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 for width in [390,1440]:
  page=b.new_page(viewport={'width':width,'height':1000},device_scale_factor=1,reduced_motion='reduce')
  for name,path in routes.items():
   page.goto(base+path,wait_until='networkidle');page.evaluate('document.fonts.ready');page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
   print(phase,name,width,page.title(), 'overflow',page.evaluate('document.documentElement.scrollWidth>innerWidth'),flush=True)
  page.close()
 b.close()
