"""Mobile-only product pass on immutable ATLAS83 release. No dynamics/model rewrite."""
from pathlib import Path
import hashlib, json, shutil
R=Path(__file__).resolve().parent.parent; S=R/'site'; M=R/'mobile'
BASE_HASHES = {'index.html': 'aeac1c6348006e01af1d7615d1390d7a9f925b8af73feb87778402888cd42481', 'app.js': '0c99f313fddd4d374a132df0475ae456b57539e16278cc206076e2cbb65faf59', 'style.css': '44ad5ddc89119cc89e51fab4237a641b8894edf3ce8cc20bba5f8c5b7f889750', 'physics.js': 'a60b52e0771d294e773d6fc4e5a509677d14b1fc26a519dc0f6348f415707627', 'model.js': '858057b31d2076f623458dfe704bf338ea7e313d6f81e4a4e95e84f0350cd5b8', 'vendor/runtime.js': '50a297fabc59ff592031fa916d3fc17511d55747fd11fcdfbd7119bc6148b7f4'}
def replace(s,a,b):
 assert s.count(a)==1,(a[:100],s.count(a))
 return s.replace(a,b)
if 'ATLAS83_MOBILE_PASS_1' in (S/'app.js').read_text():
 raise RuntimeError('Already generated: start from the immutable baseline, do not stack patches')
for p,d in BASE_HASHES.items():
 assert hashlib.sha256((S/p).read_bytes()).hexdigest()==d,p
h=(S/'index.html').read_text()
h=replace(h,'<title>ATLAS 83 — Open Water</title>','<title>ATLAS 83 — Mobile Helm</title>')
h=replace(h,'href="style.css"></head>','href="style.css"><link rel="stylesheet" href="mobile.css"></head>')
h=replace(h,'<div class="header-right">','<div class="header-right"><button class="mobile-only" id="views-toggle" aria-label="Choose camera view" aria-controls="camera-views" aria-expanded="false">Views</button>')
h=h.replace('>Environment</button>','>More</button>')
h=replace(h,'<aside class="camera-nav" aria-label="Camera views">','<aside class="camera-nav" id="camera-views" aria-label="Camera views"><div class="camera-top"><strong>Choose your view</strong><button id="views-close" aria-label="Close views">×</button></div>')
h=replace(h,'<div class="view-label">','<div id="mobile-readouts" class="mobile-only" aria-label="Current navigation readings"><span><b id="m-speed">0.0</b> kn</span><span><small>HDG</small><b id="m-heading">090°</b></span><span><small>DEPTH</small><b id="m-depth">80 m</b></span></div><div class="view-label">')
h=replace(h,'<div class="ends"><span>IDLE</span>','<div class="m-power-steps mobile-only"><button id="m-less" aria-label="Decrease power five percent">−5</button><button id="m-idle" aria-label="Idle both engines">Idle</button><button id="m-more" aria-label="Increase power five percent">+5</button></div><div class="ends"><span>IDLE</span>')
# Add a mobile trigger for the same docking sheet; retain the desktop trigger.
h=replace(h,'</small></div></section>','</small></div><div class="mobile-helm-tools"><button id="m-docking" aria-controls="docking" aria-expanded="false">Docking / split power</button><button id="m-collapse" class="mobile-only" aria-expanded="true" aria-controls="helm">Hide controls</button></div></section>')
h=replace(h,'<section class="panel" id="settings"','<button id="mobile-backdrop" tabindex="-1" aria-label="Close panel"></button><button id="m-open-controls" class="mobile-only" hidden aria-controls="helm">Show controls</button><section class="panel" id="settings"')
h=replace(h,'<select id="quality">','<select id="quality"><option value="mobile">Mobile · lower GPU load</option>')
h=replace(h,'<script src="app.js"></script>','<script src="mobile.js"></script><script src="app.js"></script>')
(S/'index.html').write_text(h)
s=(S/'app.js').read_text()
s=replace(s,'const $=id=>document.getElementById(id),T=window.ATLASRuntime;','const $=id=>document.getElementById(id),T=window.ATLASRuntime;\nlet mobileUI=null; const mobileMedia=matchMedia("(max-width:680px), (max-height:600px) and (pointer:coarse)"); $("quality").value=mobileMedia.matches?"mobile":"balanced";')
s=replace(s,'renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));','renderer.setPixelRatio($("quality").value==="mobile"?1:Math.min(devicePixelRatio,1.5));')
s=replace(s,'renderer.shadowMap.enabled=true;','renderer.shadowMap.enabled=$("quality").value!=="mobile";')
s=replace(s,'reflectionCount=0,frames=0;','reflectionCount=0,frames=0,lastReflect=-Infinity;')
s=replace(s,"if(frames%($('quality').value==='high'?1:3)===0||reflectionCount===0){reflection(r,s,c,...rest);reflectionCount++;}","const q=$('quality').value,interval=q==='mobile'?6:q==='high'?1:3;if(reflectionCount===0||(frames%interval===0&&(q!=='mobile'||performance.now()-lastReflect>=250))){reflection(r,s,c,...rest);reflectionCount++;lastReflect=performance.now();}")
s=replace(s,"function chooseView(name){","function mobileFrame(){if(!mobileMedia.matches){camera.clearViewOffset();return;}const w=innerWidth,h=innerHeight,hr=$('helm').getBoundingClientRect(),tr=$('mobile-readouts').getBoundingClientRect();document.body.style.setProperty('--mobile-helm',Math.ceil(hr.height)+'px');const open=hr.width>0&&hr.height>0,land=w>h;const ox=land&&open?Math.max(0,w-hr.left)/2:0,oy=land?0:((open?h-hr.top:60)-tr.bottom)/2;if(view==='bridge'){camera.clearViewOffset();}else camera.setViewOffset(w,h,ox,oy,w,h);}\nfunction chooseView(name){")
s=replace(s,'camera.updateProjectionMatrix();controls.update();','camera.updateProjectionMatrix();mobileFrame();controls.update();')
s=replace(s,"if(!$('chart').hidden)drawChart();","mobileUI?.sync(s);if(!$('chart').hidden)drawChart();")
s=replace(s,"$('pause').onclick=()=>{vessel.command('pause');","$('pause').onclick=()=>{clearInputs();vessel.command('pause');")
s=replace(s,"$('midships').onclick=()=>{vessel.command('helm',0);","$('midships').onclick=()=>{channels.helm.clear();vessel.command('helm',0);")
a=s.index('function holdButton(');b=s.index("$('light').onchange",a)
s=s[:a]+'''const channels={helm:AtlasMobile.holdChannel(v=>vessel.command('helm',v)),bow:AtlasMobile.holdChannel(v=>vessel.command('bow',v))};
for(const [id,key,v]of [['port-hold','helm',-1],['starboard-hold','helm',1],['bow-port','bow',-1],['bow-starboard','bow',1]])AtlasMobile.bindHold($(id),channels[key],v);
'''+s[b:]
s=replace(s,"$('quality').onchange=()=>renderer.setPixelRatio(Math.min(devicePixelRatio,$('quality').value==='high'?2:1.5));","$('quality').onchange=()=>{const q=$('quality').value;renderer.setPixelRatio(q==='mobile'?1:Math.min(devicePixelRatio,q==='high'?2:1.5));renderer.shadowMap.enabled=q!=='mobile';};")
s=replace(s,"$('reset').onclick=()=>{vessel.reset();","$('reset').onclick=()=>{clearInputs();vessel.reset();")
s=replace(s,"$('hide-ui').onclick=()=>{document.body", "$('hide-ui').onclick=()=>{clearInputs();document.body")
s=replace(s,"function clearInputs(){keys.clear();held.clear();vessel.command('helm',0);vessel.command('bow',0);}","function clearInputs(){keys.clear();held.clear();channels.helm.clear();channels.bow.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}")
s=replace(s,"if(elapsed>1.5&&!vessel.paused){vessel.paused=true;","if(elapsed>1.5&&!vessel.paused){clearInputs();vessel.paused=true;")
s=replace(s,"render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frames,reflectionCount}","render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frames,reflectionCount,pixelRatio:renderer.getPixelRatio(),quality:$('quality').value,shadows:renderer.shadowMap.enabled}")
s=replace(s,"clock=performance.now();requestAnimationFrame(loop);","mobileUI=AtlasMobile.mount({read:()=>vessel.read(),setPower:v=>{setBoth(v);sync();},clearInputs,layout:mobileFrame});sync();mobileFrame();clock=performance.now();requestAnimationFrame(loop);")
s=replace(s,"if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;","if(e.target.closest?.('button,input,select,textarea,a,summary,[contenteditable]'))return;")
s+='\n// ATLAS83_MOBILE_PASS_1\n'
(S/'app.js').write_text(s)
for n in ['mobile.js','mobile.css']:shutil.copy2(M/n,S/n)
print(json.dumps({'baseline':'8c503549c43b35864f1aad1cd5196c235c4e2930','modelUnchanged':True,'physicsUnchanged':True,'mobileUI':True}))
