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
# The unchanged yacht reports its identity as model.model, not model.identity.
p=R/'verify.py';s=p.read_text();assert s.count("y['model']['identity']")==1 and s.count("back['model']['identity']")==1
s=s.replace("y['model']['identity']","y['model']['model']").replace("back['model']['identity']","back['model']['model']")
a="tap('.brand');ck('native vessel chooser visible',p.locator('#fleet-dialog').is_visible())"
assert s.count(a)==1
s=s.replace(a,a+";ck('chooser pauses actual voyage',read()['state']['paused'])")
p.write_text(s)
# Read authoritative paused state; stale text must never resume a vessel.
p=R/'fleet.js';s=p.read_text();a="document.getElementById('pause').textContent==='Pause'"
assert s.count(a)==1
s=s.replace(a,"!window.ATLAS83_APP.inspect().state.paused");p.write_text(s)
with (R/'test.cjs').open('a') as f:f.write(r'''
const vm=require('node:vm');
function chooserProbe(paused,label){
 const nodes={};const element=()=>({textContent:'',setAttribute(){},onclick:null,showModal(){this.open=true;},close(){this.open=false;}});
 for(const k of ['brand','scene','helm','fleet-dialog','fleet-close','pause'])nodes[k]=element();
 nodes.pause.textContent=label;let clicks=0;nodes.pause.click=()=>{clicks++;paused=!paused;};
 const document={body:{dataset:{}},querySelector:s=>nodes[s==='.brand'?'brand':s.slice(1)],querySelectorAll:()=>[],getElementById:k=>nodes[k]};
 const window={ATLAS83_APP:{inspect:()=>({state:{paused}})}};
 vm.runInNewContext(fs.readFileSync('./site/fleet.js','utf8'),{window,document,URL,location:{href:'https://example.test/index.html?vessel=yacht'}});
 window.AtlasFleet.mount();nodes.brand.onclick({preventDefault(){}});return {paused,clicks,open:nodes['fleet-dialog'].open};
}
test('chooser never resumes an already paused vessel despite stale label',()=>assert.deepEqual(chooserProbe(true,'Pause'),{paused:true,clicks:0,open:true}));
test('chooser pauses running vessel despite stale Resume label',()=>assert.deepEqual(chooserProbe(false,'Resume'),{paused:true,clicks:1,open:true}));
''')
# Existing decorative header is pointer-events:none. Its new interactive brand must opt in.
p=R/'build.py';s=p.read_text();a='.brand{white-space:nowrap;';assert s.count(a)==1
s=s.replace(a,'.brand{pointer-events:auto;white-space:nowrap;');p.write_text(s)
print('Fleet DOM, identity, authoritative pause and native selector hit target corrected.')

# Original warship defaults to the existing Mobile preset, still user-selectable.
p=R/'build.py';s=p.read_text();a="(site/'app.js').write_text(s)";assert s.count(a)==1
old='$("quality").value=mobileMedia.matches?"mobile":"balanced";'
new='$("quality").value=(mobileMedia.matches||AtlasFleet.config.id==="warship")?"mobile":"balanced";'
s=s.replace(a,'s=once(s,'+repr(old)+','+repr(new)+')\n'+a);p.write_text(s)
p=R/'verify.py';s=p.read_text();a="ck('warship distinct scale and parameters',s['parameters']['length']==125 and s['model']['bounds']['max'][0]>60 and s['model']['bounds']['min'][0]<-60)";assert s.count(a)==1
s=s.replace(a,a+"\n    ck('warship starts lighter graphics without physics substitution',s['render']['quality']=='mobile' and not s['render']['shadows'])");p.write_text(s)
