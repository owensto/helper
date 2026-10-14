"""Interaction fixes found during final source audit. Reapplied from clean input."""
import os
from pathlib import Path
r=Path(os.environ.get('COMMAND_ROOT','/mnt/data/atlas_command_work/release'));s=r/'site'
p=s/'workspace.js';t=p.read_text();t=t.replace("S.steer=Number(b.dataset.steer);A.refresh();", "window.ATLAS_TOUCH_STEERING=true;S.steer=Number(b.dataset.steer);A.refresh();")
t=t.replace("S.steer=0;A.refresh();};});", "window.ATLAS_TOUCH_STEERING=false;S.steer=0;A.refresh();};});")
t=t.replace(" let mapHidden=true;", " addEventListener('blur',()=>{window.ATLAS_TOUCH_STEERING=false;S.steer=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){window.ATLAS_TOUCH_STEERING=false;S.steer=0;}});\n let mapHidden=true;")
p.write_text(t)
p=s/'app.js';t=p.read_text().replace("document.activeElement!==$('#steering')&&document.activeElement!==document.getElementById('cmd-steer')", "!window.ATLAS_TOUCH_STEERING&&document.activeElement!==$('#steering')&&document.activeElement!==document.getElementById('cmd-steer')");p.write_text(t)
p=s/'index.html';t=p.read_text();t=t.replace('Engine mass each, kg', 'Assumed engine mass each, kg');p.write_text(t)
print('Touch steering retains input until release; scenario masses remain labeled.')
p=s/'index.html';t=p.read_text();anchor='<canvas height="220" id="test-graph" width="600"></canvas>'
if anchor not in t:
 import re
 m=re.search(r'<canvas[^>]*id="test-graph"[^>]*></canvas>',t);assert m,'Missing test plot';anchor=m.group(0)
t=t.replace(anchor,'<div class="row-actions"><button id="plot-speed" class="active">Speed / time</button><button id="plot-path">Turn path</button></div>'+anchor+'<div id="test-legend" aria-label="Comparison trace legend"></div>');p.write_text(t)
p=s/'command-tests.js';t=p.read_text();t=t.replace('let active=null;',"let active=null;let plotMode='speed';")
t=t.replace("const small=document.createElement('small');", "if(r.coastSeconds!==undefined){const coast=document.createElement('p');coast.textContent=`Coast: ${r.coastSeconds.toFixed(2)} s · ${r.coastMeters.toFixed(1)} m (20 to 2 mph)`;e.append(coast);}const small=document.createElement('small');")
t=t.replace("const maxT=Math.max", "const legend=$('test-legend');if(legend){legend.replaceChildren();const colors=['#77ccb1','#f0bd79','#89b8da','#e3e9e0'];rs.forEach((r,k)=>{const item=document.createElement('div');item.textContent=`${r.configuration.count}×${r.configuration.hp} HP · ${r.kind} · ${r.configuration.physics}`;item.style.borderLeft='3px solid '+colors[k%4];item.style.paddingLeft='7px';item.style.margin='5px 0';legend.append(item);});}if(plotMode==='path'){const traces=rs.map(r=>{const arr=r.trace.filter(p=>r.kind!=='turn'||p[0]>=15);const first=arr[0];return first?arr.map(p=>[p[2]-first[2],p[3]-first[3]]):[];});const pts=traces.flat(),xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);const minX=Math.min(0,...xs),maxX=Math.max(1,...xs),minZ=Math.min(0,...zs),maxZ=Math.max(1,...zs),scale=Math.min((w-50)/(maxX-minX),(h-45)/(maxZ-minZ));const colors=['#77ccb1','#f0bd79','#89b8da','#e3e9e0'];traces.forEach((tr,k)=>{c.strokeStyle=colors[k%4];c.lineWidth=2;c.beginPath();tr.forEach(([x,z],i)=>{const px=30+(x-minX)*scale,py=h-25-(z-minZ)*scale;i?c.lineTo(px,py):c.moveTo(px,py)});c.stroke();});c.fillStyle='#b4c8cc';c.font='12px sans-serif';c.fillText('Relative track / equal meter scale',8,15);return;}const maxT=Math.max")
t=t.replace('const L=window.CMD_LAB={results,', "const L=window.CMD_LAB={results,setPlotMode(v){plotMode=v==='path'?'path':'speed';plot()},")
p.write_text(t)
p=s/'workspace.js';t=p.read_text().replace(" $('test-repeat').onclick=", " for(const [id,mode]of [['plot-speed','speed'],['plot-path','path']])$(id).onclick=()=>{CMD_LAB.setPlotMode(mode);$('plot-speed').classList.toggle('active',mode==='speed');$('plot-path').classList.toggle('active',mode==='path');};\n $('test-repeat').onclick=")
p.write_text(t)
p=s/'workspace.css';p.write_text(p.read_text()+'\n#test-legend{font-size:10px;color:#c0d4d5;margin:7px 0 12px}#command-app .header-right>span{max-width:175px}\n')
print('Added labeled comparison curves, equal-scale maneuver tracks and coast-down results.')
# Reopen Custom after a standard 350 HP apply; test fixed-position touch children.
p=r/'verify04.py';t=p.read_text().replace("page.locator('#cfg-custom-hp').fill('999');", "page.locator('#cfg-hp').select_option('custom');page.locator('#cfg-custom-hp').fill('999');")
t=t.replace("assert page.locator('#touch-helm').is_visible()", "assert page.locator('#touch-neutral').is_visible() and page.locator('#touch-throttle').is_visible()")
t=t.replace("page.locator('#test-kind').select_option('coast');", "page.locator('#plot-path').click();shot(page,f'{device}_turn_path.png');page.locator('#plot-speed').click();page.locator('#test-kind').select_option('coast');")
t=t.replace("page.wait_for_timeout(500);r['initial']", "page.wait_for_timeout(3400);r['initial']")
p.write_text(t)
p=s/'app.js';t=p.read_text().replace("camera.fov=next==='helm'?63:42", "camera.fov=next==='helm'?(innerWidth<700?84:63):42")
t=t.replace("world([-1.85,1.65,.18])", "world(innerWidth<700?[-2.12,1.71,0]:[-1.85,1.65,.18])")
p.write_text(t)
p=s/'command.js';t=p.read_text().replace("c.fillStyle='#183644';c.fillRect(0,0,256,128);", "c.clearRect(0,0,256,128);")
t=t.replace("c.fillStyle='#f2f3e9';c.font='bold 54px sans-serif'", "c.fillStyle='#233d4b';c.font='600 54px sans-serif'")
t=t.replace("new T.MeshBasicMaterial({map:tx,side:T.DoubleSide})", "new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:true,alphaTest:.03,depthWrite:false})")
t=t.replace("badge.position.set(-.36,.50,.277)", "badge.position.set(-.36,.50,.28)")
p.write_text(t)
print('Preserved validation requirements; improved narrow-screen helm and clean engine badges.')
