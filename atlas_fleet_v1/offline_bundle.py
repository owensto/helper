"""Bundle exact reviewed fleet assets and test local-file operation with networking disabled."""
from pathlib import Path
import base64, hashlib, json, re, os, time, traceback
from playwright.sync_api import sync_playwright
SITE=Path('atlas_fleet_v1/live')
OUT=Path(os.environ.get('OFFLINE_OUT','/tmp/atlas-fleet-offline'));OUT.mkdir(parents=True,exist_ok=True)
HTML=OUT/'ATLAS_Fleet_01_Offline_Viewer.html'
assets={};manifest={}
for p in sorted((SITE/'assets').glob('*.glb')):
 b=p.read_bytes();assert b[:4]==b'glTF'
 assets['assets/'+p.name]=base64.b64encode(b).decode('ascii')
 manifest[p.name]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
release=json.loads((SITE/'release_report.json').read_text())
boot=r'''(function(){
'use strict';
const el=document.getElementById('fleet-packed-assets');
const encoded=JSON.parse(el.textContent);el.remove();const urls=new Map();
window.ATLAS_EMBEDDED_URL=function(path){
 if(urls.has(path))return urls.get(path);if(!(path in encoded))return path;
 const binary=atob(encoded[path]),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
 urls.set(path,url);delete encoded[path];return url;
};
const load=window.ATLASRuntime.GLTFLoader.prototype.load;
window.ATLASRuntime.GLTFLoader.prototype.load=function(url,...args){return load.call(this,window.ATLAS_EMBEDDED_URL(url),...args);};
window.addEventListener('beforeunload',()=>{for(const u of urls.values())URL.revokeObjectURL(u)});
window.ATLAS_OFFLINE=true;
})();'''
boot+='\nwindow.ATLAS_EMBEDDED_REPORT='+json.dumps(release,separators=(',',':'))+';\n'
boot+="document.querySelector('#notes a').href=URL.createObjectURL(new Blob([JSON.stringify(window.ATLAS_EMBEDDED_REPORT,null,2)],{type:'application/json'}));"
viewer=(SITE/'viewer.js').read_text()
needle="$('#download').href='assets/'+a.file;";assert needle in viewer
viewer=viewer.replace(needle,"$('#download').href=window.ATLAS_EMBEDDED_URL('assets/'+a.file);$('#download').download=a.file;")
needle="fetch('release_report.json').then(r=>r.json())";assert needle in viewer
viewer=viewer.replace(needle,'Promise.resolve(window.ATLAS_EMBEDDED_REPORT)')
html=(SITE/'index.html').read_text().replace('<title>ATLAS — Fleet Studio</title>','<title>ATLAS — Five-Model Offline Review</title>')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(SITE/'style.css').read_text()+'</style>')
html=re.sub(r'<script defer src="(?:runtime|viewer)\.js"></script>','',html)
html=html.replace('FLEET REVIEW / 01','OFFLINE REVIEW / 01')
html=html.replace('<h2>Five assets.<br>Three distinct vessels.</h2>','<h2>Five assets.<br>Three distinct vessels.</h2><p>This self-contained review runs locally without a server or internet connection. Models, textures, and viewer code are embedded. Use a desktop browser with WebGL enabled.</p>')
def script(text):return '<script>'+re.sub(r'</script',r'<\\/script',text,flags=re.I)+'</script>'
payload='<script type="application/json" id="fleet-packed-assets">'+json.dumps(assets,separators=(',',':'))+'</script>'
payload+=script((SITE/'runtime.js').read_text())+script(boot)+script(viewer)
HTML.write_text(html.replace('</body>',payload+'</body>'))
(OUT/'asset_manifest.json').write_text(json.dumps(manifest,indent=2))
report={'file':HTML.name,'viewer_bytes':HTML.stat().st_size,'self_contained':True,'network_disabled':True,'local_file_url_tested':True,'physical_phone_test':False,'engineering_validated':False,'complete_production_plan_finished':False,'passed':False,'tests':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for device,size in [('desktop',(1600,1000)),('phone',(430,932))]:
  ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},device_scale_factor=1,offline=True)
  page=ctx.new_page();errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:external.append(r.url) if r.url.startswith(('https:','http:')) else None)
  try:
   page.goto(HTML.resolve().as_uri()+'?v=bay',wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('window.FLEET?.ready || window.FLEET_ERROR',timeout=90000)
   assert page.evaluate('window.FLEET_ERROR') is None,page.evaluate('window.FLEET_ERROR')
   for asset in ['bay','d','n','w','chase']:
    start=time.time();test={'device':device,'asset':asset,'passed':False}
    page.locator('[data-asset="'+asset+'"]').click()
    page.wait_for_function('(id)=>FLEET.ready&&FLEET.id===id',arg=asset,timeout=90000)
    assert page.evaluate('window.FLEET_ERROR') is None
    page.wait_for_timeout(200);test['initial']=page.evaluate('FLEET.inspect()')
    page.screenshot(path=str(OUT/f'{device}_{asset}_hero.png'))
    for v in {'bay':['Helm','T-top'],'d':['Fishing bay','Garage'],'n':['Sail','Control room'],'w':['Hangar','Interior'],'chase':['Seating']}[asset]:
     page.locator('[data-view="'+v+'"]').click()
     if v in ['Interior','Control room']:page.wait_for_function('FLEET.interiorReady',timeout=60000)
     page.wait_for_timeout(200)
    if asset!='chase':
     page.locator('#reset').click();page.evaluate('FLEET.pose(.3)');test['intermediate']=page.evaluate('FLEET.inspect()')
     page.evaluate('FLEET.pose(1);FLEET.setView("Hero")');test['final']=page.evaluate('FLEET.inspect()')
     page.wait_for_timeout(200);page.screenshot(path=str(OUT/f'{device}_{asset}_final.png'))
     if asset=='d':assert test['final']['bay'][1]<-20 and test['final']['chase'][1]<-20 and test['final']['top'] is not None
     if asset=='bay':assert test['final']['top']==test['initial']['top']
     if asset=='w':assert abs(test['final']['rootPosition'][1])<1e-4
     if asset in ['bay','w']:assert page.locator('#full').is_hidden()
     page.locator('#reset').click();page.locator('#play').click();page.wait_for_timeout(750)
     assert page.evaluate('FLEET.progress')>0
     page.locator('#play').click();assert not page.evaluate('FLEET.playing')
    else:assert page.locator('#play').is_disabled()
    page.locator('#gray').click();page.locator('#sunset').click();page.locator('#info').click()
    assert page.locator('#notes').is_visible();page.locator('#close').click();assert not page.locator('#notes').is_visible()
    assert not errors,errors;assert not external,external
    assert page.locator('#download').get_attribute('href').startswith('blob:')
    test.update(passed=True,elapsed_seconds=round(time.time()-start,2),errors=list(errors),external_requests=list(external))
    report['tests'].append(test);(OUT/'offline_validation.json').write_text(json.dumps(report,indent=2))
    print(device,asset,'PASS',test['elapsed_seconds'],flush=True)
  except Exception as e:
   report['error']={'device':device,'message':str(e),'errors':errors,'traceback':traceback.format_exc()}
   try:page.screenshot(path=str(OUT/f'{device}_ERROR.png'))
   except Exception:pass
   (OUT/'offline_validation.json').write_text(json.dumps(report,indent=2));raise
  finally:ctx.close()
 browser.close()
report['passed']=len(report['tests'])==10 and all(t['passed'] for t in report['tests'])
(OUT/'offline_validation.json').write_text(json.dumps(report,indent=2))
print('SELF-CONTAINED LOCAL-FILE VERIFICATION',report['passed'],flush=True)
