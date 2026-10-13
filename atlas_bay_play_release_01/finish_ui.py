from pathlib import Path
import os,json
r=Path(os.environ['BAY_ROOT']);p=r/'site/app.js';s=p.read_text()
s=s.replace("lookYaw=0;lookPitch=0;orbit.enabled", "lookYaw=0;lookPitch=next==='helm'?-.35:0;orbit.enabled")
s=s.replace("world([-1.35,1.98,.18])", "world([-1.85,1.65,.18])")
needle="qualityButton.onclick=()=>setQuality(!reduced);"
assert needle in s
s=s.replace(needle,needle+"\nconst clearButton=document.createElement('button');clearButton.id='clearview';clearButton.textContent='Hide panels';clearButton.setAttribute('aria-label','Toggle clear view');document.body.append(clearButton);function clearPanels(v){document.body.classList.toggle('clearview',v);clearButton.textContent=v?'Show controls':'Hide panels'}clearButton.onclick=()=>clearPanels(!document.body.classList.contains('clearview'));addEventListener('keydown',e=>{if(e.key==='Escape')clearPanels(false)});\n")
p.write_text(s);(r/'src/app.js').write_text(s)
p=r/'site/app.css';s=p.read_text()+"\n#clearview{position:fixed;right:18px;bottom:20px;z-index:8;padding:8px 12px;font-size:11px;background:#eaf2efd9}.clearview header,.clearview .intro,.clearview .chart-panel,.clearview .bottom,.clearview footer{display:none!important}@media(max-width:900px){#clearview{right:14px;bottom:auto;top:112px;padding:6px 10px;font-size:9px}}\n"
p.write_text(s);(r/'src/app.css').write_text(s)
p=r/'site/index.html';s=p.read_text().replace('<p><b>Graphics:</b>', '<p><b>Clear view:</b> Hide panels removes the menus while the boat remains controllable with the keyboard. Show controls or Escape restores them.</p><p><b>Graphics:</b>');p.write_text(s);(r/'src/index.html').write_text(s)
p=r/'verify.py';s=p.read_text();needle="page.wait_for_timeout(250);shot(page,OUT/f'{device}_drive_helm.png')";assert needle in s
s=s.replace(needle,needle+"\n   page.click('#clearview');assert page.evaluate('document.body.classList.contains(\"clearview\")')\n   shot(page,OUT/f'{device}_helm_clear.png');page.click('#clearview');assert not page.evaluate('document.body.classList.contains(\"clearview\")')")
p.write_text(s)
p=r/'site/build_report.json';j=json.loads(p.read_text());j['camera_review']=['Lower, downward-facing helm viewpoint shows the cockpit instruments','Hide panels / Show controls provides an unobstructed view'];p.write_text(json.dumps(j,indent=2))
