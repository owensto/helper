"""Exact, readable corrections to the new fleet sources; no upstream owner edits."""
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parent

def patch(name,before,after,pairs):
 p=R/name;s=p.read_text();h=hashlib.sha256(s.encode()).hexdigest()
 if h==after:return
 assert h==before,('PATCH_BASE_MISMATCH',name)
 for old,new in pairs:
  assert s.count(old)==1,(name,old[:70],s.count(old))
  s=s.replace(old,new)
 assert hashlib.sha256(s.encode()).hexdigest()==after,('PATCH_RESULT_MISMATCH',name)
 p.write_text(s)

patch('build.py','3a970247a18b95f2197586092cc84c65d14217b569934b072fbf5c714f5d5b6b','0e4c08228140850743dcb0c5fd0821dbe55991cba55e2057b30c36e0066201b7',[
 ("h=once(h,'</body>', '''", "h=once(h,'<script src=\"vendor/runtime.js\"></script>', '''"),
 ("</dialog></body>''')", "</dialog><script src=\"vendor/runtime.js\"></script>''')"),
 ('[-63,-45,-25,0,25,45,63]','[-64,-45,-25,0,25,45,64]'),
 ('[-9.5,0,9.5]','[-11.5,0,11.5]'),
 ('126m x19m','128m x23m')
])
patch('fleet.js','923a67d582f3adc5020419b7a5a975bda943a44143e613315b099e5c6e0e28c6','e32eece178ed09a757c2222b340f53c52060060f3340730833c68d1ae2f4c463',[
 ('if(size.x<124||size.x>140||size.z<17||size.z>35||box.min.y>0||box.max.y<20)', 'if(size.x<124||size.x>128||size.z<17||size.z>23||box.min.x < -64||box.max.x > 64||box.min.z < -11.5||box.max.z > 11.5||box.min.y>0||box.max.y<20)')
])
patch('test.cjs','2c2ddafd9afdabb978247b5112ae8a92645e383a4099064a946ab7b9b1d4d76d','60c3527312a67461368c8b9ac557017c2bf6e454be9c3f838a73deb5b09d077c',[
 ('[-63,-45,-25,0,25,45,63]','[-64,-45,-25,0,25,45,64]'),
 ('[-9.5,0,9.5]','[-11.5,0,11.5]')
])
patch('verify.py','2be8d526628dc476a39058048952addc92f02450ea7fd114615f494b3ca78984','fbbfb1994938282cb190a459452f2c2a1a6258b3185679d39d81ade6c0534116',[
 ("p.wait_for_function('window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE',timeout=180000)", "p.wait_for_function('(window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE) || !document.getElementById(\"retry\").hidden',timeout=180000)\n    assert p.evaluate('!!(window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE)'),p.locator('#loading').inner_text()"),
 ("def choose(v):tap('.brand');ck('native vessel chooser visible',p.locator('#fleet-dialog').is_visible());tap('#select-'+v);ready()", "def choose(v):\n    tap('.brand');ck('native vessel chooser visible',p.locator('#fleet-dialog').is_visible())\n    with p.expect_navigation(wait_until='domcontentloaded',timeout=120000):tap('#select-'+v)\n    ready()"),
 ("try:row['failureState']=read();p.screenshot(path=str(OUT/(name+'-FAILURE.png')),timeout=60000)", "try:row['failureState']=p.evaluate('window.ATLAS83_APP?.inspect?.() || {message:document.getElementById(\"loading\")?.innerText}');p.screenshot(path=str(OUT/(name+'-FAILURE.png')),timeout=60000)")
])
print('DOM order fixed; larger source-bounded sample envelope; explicit navigation and startup-error capture.')
