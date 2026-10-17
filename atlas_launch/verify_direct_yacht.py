"""Public first-view regression. Native inputs only; no replacement asset responses."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,os,time,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=Path(os.environ.get('REVIEW_DIR','/tmp/atlas-direct-yacht-review'));OUT.mkdir(parents=True,exist_ok=True)
PIN='f0fa3d5543e497d31df9feaaaf4335bf89641137'
BASE='https://rawcdn.githack.com/owensto/helper/'+PIN+'/atlas_launch/'
OLD='https://rawcdn.githack.com/owensto/helper/006644dae913c9bc6f874cdaaaba31986dbc519b/atlas_d_simulator_01/contact/y11/preview.html'
BAY='https://rawcdn.githack.com/owensto/helper/491fbb0133fde085c03e4ee93db34f4e630a3c42/atlas_sealab_13/live/index.html'
r={'passed':False,'publicSource':PIN,'testSource':os.environ.get('GITHUB_SHA'),'launcher':BASE+'index.html','yacht':BASE+'yacht.html','responseSubstitution':False,'testStepUsed':False,'geometryChanged':False,'layouts':[],'baseline':{},'scope':'Public entry/model-identity and native operation; existing Y11 model, not a realism rebuild, full regression, physical-device or FPS certification.'}
def save():(OUT/'direct-yacht.json').write_text(json.dumps(r,indent=2))
def notice(p,row):
 n=p.get_by_text('Open the page',exact=True)
 if n.count() and n.first.is_visible():n.first.click();row['normalHostingNotice']=True

def open_url(p,url,row):
 p.goto(url,wait_until='domcontentloaded',timeout=120000);notice(p,row)

def tap(p,selector,frame=None):
 loc=(frame or p).locator(selector);loc.scroll_into_view_if_needed(timeout=30000)
 assert loc.evaluate('e=>{const r=e.getBoundingClientRect(),n=e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.disabled&&(n===e||e.contains(n));}'),selector
 q=loc.bounding_box();assert q
 p.touchscreen.tap(q['x']+q['width']/2,q['y']+q['height']/2);p.wait_for_timeout(200)

def same_bytes(p,name,row):
 q=p.request.get(BASE+name,timeout=60000);assert q.status==200
 actual=q.body();assert actual==(ROOT/name).read_bytes(),'PUBLIC_SOURCE_MISMATCH:'+name
 row.setdefault('sourceHashes',{})[name]=hashlib.sha256(actual).hexdigest()

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);r['browser']=b.version
 try:
  # Reproduce the original confusing first view; no boarding in this context.
  c=b.new_context(viewport={'width':1440,'height':960},has_touch=True);p=c.new_page()
  try:
   open_url(p,OLD,r['baseline']);p.wait_for_function('window.Y4?.ready && window.Y9?.ready',timeout=180000)
   h=next(f for f in p.frames if '/y11/host/index.html' in f.url)
   q=h.evaluate('({active:ATLAS_D_SIM.active,ready:ATLAS_D_SIM.ready,boardVisible:!document.getElementById("ad-board").hidden,query:location.search})')
   assert q['ready'] and not q['active'] and q['boardVisible'] and 'vessel=bay' in q['query'];r['baseline'].update(q);r['baseline']['reproducedBayFirst']=True
   p.screenshot(path=str(OUT/'baseline-bay-first.png'),timeout=60000)
  finally:c.close();save()
  for name,w,hh in [('desktop',1440,960),('portrait',390,844),('landscape',844,390)]:
   row={'name':name,'passed':False,'errors':[],'boardActions':0};r['layouts'].append(row)
   c=b.new_context(viewport={'width':w,'height':hh},has_touch=True,is_mobile=name!='desktop',device_scale_factor=1);p=c.new_page();p.set_default_timeout(60000)
   p.on('pageerror',lambda e,row=row:row['errors'].append(str(e)))
   try:
    open_url(p,BASE+'index.html',row);p.locator('#atlas-launch').wait_for();same_bytes(p,'index.html',row)
    assert p.locator('#launch-bay').get_attribute('href')==BAY
    assert p.locator('#launch-yacht').get_attribute('href')=='yacht.html'
    tap(p,'#launch-yacht');p.wait_for_load_state('domcontentloaded');notice(p,row)
    p.wait_for_function('window.ATLAS_YACHT_ENTRY?.ready || window.ATLAS_YACHT_ENTRY?.error',timeout=210000)
    row['entry']=p.evaluate('ATLAS_YACHT_ENTRY');assert row['entry']['ready'],row['entry']
    same_bytes(p,'yacht.html',row)
    first=row['entry']['firstReveal'];assert first['active'] and first['hullVisible'] and first['groupVisible'] and first['hullName']=='FIXED_Hull'
    assert first['sourceRevision']==7 and first['physicsModel']=='atlas-d-y11-3dof-1' and first['view']=='overview' and not first['engine']
    assert p.locator('#entry-gate').is_hidden() and p.locator('#host').evaluate('e=>getComputedStyle(e).visibility')=='visible'
    h=next(f for f in p.frames if '/y11/host/index.html' in f.url);fr=p.frame_locator('#host');state=lambda:h.evaluate('ATLAS_D_SIM.state.snapshot()')
    assert 'vessel=yacht' in h.url and h.evaluate('ATLAS_D_SIM.active')
    assert fr.locator('#ad-board').is_hidden()
    row['firstViewIsSelectedYacht']=True
    p.screenshot(path=str(OUT/(name+'-yacht-first-view.png')),timeout=60000)
    if state()['paused']:row['nativeStartupResumeReason']=h.evaluate('ATLAS_D_SIM.state.message');tap(p,'#ad-pause',fr)
    tap(p,'#ad-engine',fr);tap(p,'[data-ad-gear="1"]',fr)
    slider=fr.locator('#ad-throttle');slider.scroll_into_view_if_needed();q=slider.bounding_box();assert q;p.touchscreen.tap(q['x']+.72*q['width'],q['y']+q['height']/2)
    before=state();end=time.monotonic()+60
    while time.monotonic()<end:
     after=state()
     if after['elapsed']>before['elapsed']+2 and after['speedMps']>.03 and not after['paused']:break
     if after['paused']:raise AssertionError('Natural motion observation stalled')
     p.wait_for_timeout(500)
    else:raise AssertionError('No powered yacht motion')
    row['motion']={'before':before,'after':after,'testStepUsed':False}
    tap(p,'#ad-pause',fr);frozen=state();assert frozen['paused'];p.wait_for_timeout(600);assert state()['elapsed']==frozen['elapsed']
    tap(p,'#ad-pause',fr);h.wait_for_function('(t)=>ATLAS_D_SIM.state.elapsed>t&&!ATLAS_D_SIM.state.paused',arg=frozen['elapsed'],timeout=60000);row['nativePauseResume']=True
    assert p.evaluate('Y4.latest.mapped.attachment===null')
    assert p.evaluate('document.documentElement.scrollWidth')<=w+1
    p.screenshot(path=str(OUT/(name+'-yacht-operating.png')),timeout=60000)
    tap(p,'#ad-exit',fr);p.wait_for_load_state('domcontentloaded');notice(p,row);p.locator('#atlas-launch').wait_for();row['chooseVesselReturnsToLauncher']=True
    assert not row['errors'],row['errors'];row['passed']=True
   except Exception as e:
    row['error']=str(e);row['traceback']=traceback.format_exc()
    try:row['entryAtFailure']=p.evaluate('window.ATLAS_YACHT_ENTRY');p.screenshot(path=str(OUT/(name+'-FAIL.png')),timeout=30000)
    except Exception:pass
   finally:c.close();save()
  r['passed']=r['baseline'].get('reproducedBayFirst') and all(q['passed'] for q in r['layouts'])
 finally:b.close();save()
print(json.dumps({'passed':r['passed'],'baseline':r['baseline'],'layouts':[(q['name'],q['passed'],q.get('error')) for q in r['layouts']]}));raise SystemExit(0 if r['passed'] else 1)
