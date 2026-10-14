from pathlib import Path
import os,json,hashlib
r=Path(os.environ['BAY_ROOT']);p=r/'site/performance-ui.js';s=p.read_text()
s=s.replace("$('#perf-range').textContent=ref?n(p.range?.nauticalMiles):'—';", "$('#perf-range').textContent=ref?(p.range&&p.balanceIsUpperBound?'≤ ':'')+n(p.range?.nauticalMiles):'—';")
s=s.replace("e.fillText(n(p.range?.nauticalMiles),275,174);", "e.fillText((p.range&&p.balanceIsUpperBound?'≤ ':'')+n(p.range?.nauticalMiles),275,174);")
s=s.replace("It is a one-way constant-condition estimate, not safe round-trip range.","It is a one-way constant-condition estimate, not safe round-trip range. Fuel changes adjust this bookkeeping scenario only; they do not recalculate the tested hull weight or its performance curve.")
s=s.replace("${n(p.unmeteredSeconds,0)} s idle/reverse unmetered`", "${n(p.unmeteredSeconds,0)} s unmetered${p.balanceIsUpperBound?' · balance/range upper bounds':''}`")
s=s.replace("if(!Number.isFinite(a)||!Number.isFinite(r)||a<0", "if(!$('#perf-fuel-input').value.trim()||!$('#perf-reserve-input').value.trim()||!Number.isFinite(a)||!Number.isFinite(r)||a<0")
s=s.replace('<p id="fuel-coverage">','<p id="perf-fuel-error" role="alert" style="color:#9b3327"></p><p id="fuel-coverage">')
s=s.replace("$('#fuel-coverage').textContent='Enter finite values: fuel 0–65 gal and hold-back no greater than fuel.';return}B.state.fuelStartGal", "$('#perf-fuel-error').textContent='Enter finite values: fuel 0–65 gal and hold-back no greater than fuel.';return}$('#perf-fuel-error').textContent='';B.state.fuelStartGal")
p.write_text(s)
p=r/'site/app.js';s=p.read_text()
s=s.replace("function engineToggle(){if(mode!=='drive')return;", "function engineToggle(){if(mode!=='drive'||(state.referenceTrial&&!state.referenceTrial.complete))return;")
s=s.replace("function chooseGear(g){if(state.startTimer>0)", "function chooseGear(g){if(state.referenceTrial&&!state.referenceTrial.complete)return;if(state.startTimer>0)")
needle="function drawMap(ctx,w,h,instrument=false){"
assert needle in s
insert="""if(state.referenceTrial){ctx.fillStyle=instrument?'#16363e':'#d2e6e6';ctx.fillRect(0,0,w,h);ctx.strokeStyle=instrument?'#36636a':'#a7c8c7';ctx.lineWidth=1;for(let y=0;y<h;y+=h/6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const yy=h*.54;ctx.strokeStyle=instrument?'#9ac0b7':'#557d7e';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(w*.08,yy);ctx.lineTo(w*.92,yy);ctx.stroke();ctx.setLineDash([]);const px=w*.08+clamp((state.x+700)/1400,0,1)*w*.84;ctx.fillStyle=instrument?'#f3deac':'#193e4c';ctx.beginPath();ctx.moveTo(px+8,yy);ctx.lineTo(px-5,yy-5);ctx.lineTo(px-2,yy);ctx.lineTo(px-5,yy+5);ctx.closePath();ctx.fill();ctx.fillStyle=instrument?'#b9d3ce':'#355d68';ctx.font=(instrument?'15':'10')+'px sans-serif';ctx.fillText('FICTIONAL REFERENCE LANE',12,22);ctx.fillText(Math.round(state.x+700)+' m from start',12,h-14);return;}"""
s=s.replace(needle,needle+insert)
p.write_text(s)
report=r/'site/performance_build_report.json'
j=json.loads(report.read_text());j['review_polish']=['Range upper-bound symbols on both displays','Fuel bookkeeping does not alter reference test weight','Dedicated fictional lane chart','Automated-trial engine and gear keyboard guards']
j['final_source_sha256']={n:hashlib.sha256((r/'site'/n).read_bytes()).hexdigest() for n in ['app.js','physics.js','performance-ui.js','performance.js','performance_data.json']};report.write_text(json.dumps(j,indent=2))
