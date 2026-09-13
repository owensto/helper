from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'site/viewer.js';s=p.read_text()
def replace(a,b):
 global s
 assert a in s, a[:100]
 s=s.replace(a,b)
replace("function fills(){const f=smooth(.52,.70,p),depth=-vessel.position.y;", "function fills(){const f=recovery?.kind==='normal'?recovery.fill:smooth(.52,.70,p),depth=-vessel.position.y;")
replace("$('#mode-badge').textContent=recovery?'RECOVERY'", "$('#mode-badge').textContent=recovery?(recovery.kind==='normal'?'ASCENT':'RECOVERY')")
replace("recovery.done?'Surface · closures retained':'Recovery concept demonstration'", "recovery.done?'Surface · closures retained':recovery.kind==='normal'?'Close ballast vents · blow · ascend':'Recovery concept demonstration'")
replace("$('#detail').textContent=recovery?'Illustrative release and ascent only. Recovery mass and buoyancy margins are NOT verified.'", "$('#detail').textContent=recovery?(recovery.kind==='normal'?'Main-ballast vents close before the blow illustration; exterior equalizers stay open. Ascent is prescribed, not dynamically solved.':'Illustrative release and ascent only. Recovery mass and buoyancy margins are NOT verified.')")
replace("Math.round(smooth(.52,.70,p)*100)+'%'", "Math.round((recovery?.kind==='normal'?recovery.fill:smooth(.52,.70,p))*100)+'%'")
replace("$('#reverse').onclick=()=>play(-1);", "$('#reverse').onclick=()=>surface();")
function="""function surface(){if(!ready)return;if(-vessel.position.y<.1){if(recovery)reset();else play(-1);return;}playing=false;recovery={kind:'normal',started:performance.now(),startY:vessel.position.y,initialFill:smooth(.52,.70,p),fill:smooth(.52,.70,p),done:false};$('#notice').hidden=false;$('#notice').textContent='NORMAL ASCENT STUDY: main-ballast top vents close, then an air-blow illustration displaces water. Exterior pavilions drain as they emerge. Gas inventory and buoyancy are unverified.';ui()}
"""
replace("function emergency(){",function+"function emergency(){")
replace("setSystem,setFault,emergency,pressureAtDepth", "setSystem,setFault,emergency,surface,pressureAtDepth")
replace("ballastFill:smooth(.52,.70,p)", "ballastFill:recovery?.kind==='normal'?recovery.fill:smooth(.52,.70,p),mainBallastVentClosed:recovery?.kind==='normal'")
old="const t=clamp((now-recovery.started)/18000,0,1);vessel.position.y=recovery.startY*(1-smooth(.16,1,t));for(const m of meshes)if(m.name.startsWith('Emergency_drop_weight'))"
new="const t=clamp((now-recovery.started)/18000,0,1);if(recovery.kind==='normal'){recovery.fill=recovery.initialFill*(1-.78*smooth(.14,.76,t));for(const m of meshes)if(m.name.startsWith('MBT_top_vent_lift'))m.position.y=5.33-.21*smooth(0,.12,t);}vessel.position.y=recovery.startY*(1-smooth(recovery.kind==='normal'?.26:.16,1,t));for(const m of meshes)if(recovery.kind!=='normal'&&m.name.startsWith('Emergency_drop_weight'))"
replace(old,new);p.write_text(s)
p=root/'source/verify.mjs';s=p.read_text()
a="await page.evaluate(()=>{ATLAS_D.emergency();ATLAS_D.recovery.started-=19000});"
b="""await page.locator('#reverse').click();await page.evaluate(()=>{ATLAS_D.recovery.started-=19000});await page.waitForFunction(()=>Math.abs(ATLAS_D.depth)<.01);const normalAscent=await page.evaluate(()=>ATLAS_D.diagnostics());if(!normalAscent.mainBallastVentClosed||normalAscent.ballastFill>.23||!normalAscent.pressureHatchesClosed)throw Error('Normal ascent sequencing failed');await page.evaluate(()=>{ATLAS_D.reset();ATLAS_D.seek(1)});
 await page.evaluate(()=>{ATLAS_D.emergency();ATLAS_D.recovery.started-=19000});"""
assert a in s;s=s.replace(a,b).replace('hatchFault:stopped,recovery,errors','hatchFault:stopped,normalAscent,recovery,errors');p.write_text(s)
p=root/'site/design.html';s=p.read_text();s=s.replace('Normal sequence reverses only after the vessel has surfaced. Recovery demo retains closed hatches.','Normal ascent closes main-ballast vents before an air-blow illustration. Exterior pavilions drain as they emerge. Pressure hatches remain closed throughout the ascent and recovery demonstrations.');p.write_text(s)
print('Applied normal-ascent refinement and corresponding browser checks.')
