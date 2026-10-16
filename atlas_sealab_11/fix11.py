"""Fix demonstrated mobile overlap and paused fitting interaction regressions."""
from pathlib import Path
r=Path(__file__).parent

def patch(name,old,new,count=1):
 p=r/name;s=p.read_text();assert s.count(old)==count,(name,old[:90],s.count(old));p.write_text(s.replace(old,new))
# Directions use the actual vessel input convention. Hold must suppress the
# legacy auto-center loop; release/cancel restores center without sticky input.
patch('site/access11.js',"[['s11-left',1],['s11-right',-1]]","[['s11-left',-1],['s11-right',1]]")
patch('site/access11.js','steeringHeld=true;B.dispatch','steeringHeld=true;window.ATLAS_TOUCH_STEERING=true;B.dispatch',2)
patch('site/access11.js','steeringHeld=false;B.dispatch','steeringHeld=false;window.ATLAS_TOUCH_STEERING=false;B.dispatch',2)
patch('site/access11.js',"(S.steer>0?'left':'right')","(S.steer<0?'left':'right')")
patch('site/access11.js','doAction(f[0]);A.testStep(.7);','doAction(f[0]);')
patch('site/access11.js',"$('s11-tour').onclick=()=>{A.setPaused(true);", "$('s11-tour').onclick=()=>{toolWasRunning=false;A.setPaused(true);")
# One unit/label convention in both UI timers prevents alternating m/ft.
patch('site/helm09.js',"kn=S.speedOverGround*3600/1852;","kn=S.speedOverGround*3600/1852,unit11=window.SEA11?.options.feet?'ft':'m',mul11=unit11==='ft'?3.280839895:1;")
patch('site/helm09.js',"q.waterDepth.toFixed(1)+' m'","(q.waterDepth*mul11).toFixed(1)+' '+unit11")
patch('site/helm09.js',"Math.max(0,clear).toFixed(2)+' m'","Math.max(0,clear*mul11).toFixed(1)+' '+unit11")
patch('site/helm09.js',"Math.max(0,clear).toFixed(2)+' m under '","Math.max(0,clear*mul11).toFixed(1)+' '+unit11+' under '")
patch('site/helm09.js',"paused?'▶':'Ⅱ'","paused?'Resume':'Pause'")
patch('site/helm09.js',"S.startTimer>0?'Starting<small>KEY HELD AT START</small>':S.engine?'Engine on<small>TURN KEY TO STOP · E</small>':'Turn key<small>START ENGINE · E</small>'","S.startTimer>0?'Starting…':S.engine?'Engine on<small>Tap to stop</small>':'Turn key<small>Start engine</small>'")
# Fitting animations use render time while paused, not a hidden physics step.
# Hull pose and propeller rotation still use simulation time.
patch('site/app.js','function updateBoat(dt){','function updateBoat(dt,fittingDt=dt){')
for a,b,n in [('Math.exp(-3.8*dt)','Math.exp(-3.8*fittingDt)',1),('Math.exp(-3.4*dt)','Math.exp(-3.4*fittingDt)',1),('Math.exp(-4*dt)','Math.exp(-4*fittingDt)',1),('Math.exp(-3*dt)','Math.exp(-3*fittingDt)',2)]:
 p=r/'site/app.js';s=p.read_text();lo=s.index('function updateBoat(');hi=s.index('\nfunction ',lo+1);section=s[lo:hi];assert section.count(a)==n;p.write_text(s[:lo]+section.replace(a,b)+s[hi:])
patch('site/app.js','updateBoat(simDt);','updateBoat(simDt,gamePaused&&window.SEA11?.ready?Math.min(.10,dt):simDt);')
# A blurred parent creates a containing block for fixed-position children.
# Only that parent's mobile blur is removed, keeping navigation at screen bottom.
css='''
@media(max-width:900px){
#helm09.coastal11 .h09-top{backdrop-filter:none;-webkit-backdrop-filter:none;transform:none;filter:none}
#helm09.coastal11 .h09-views button.active{background:var(--accent);color:#143c37}
#helm09.coastal11 .h09-dock{box-sizing:border-box}
}
@media(max-height:560px) and (max-width:1000px){
#helm09.coastal11 .h09-top{backdrop-filter:none;-webkit-backdrop-filter:none}
#helm09.coastal11 .h09-dock{width:300px;top:70px;grid-template-columns:1fr;padding:9px;gap:6px}
#helm09.coastal11 .h09-dock .h09-key{grid-column:1;min-height:48px;height:48px;padding:6px 10px}
#helm09.coastal11 .h09-gears,#helm09.coastal11 .h09-throttle,#helm09.coastal11 .h09-steering{grid-column:1;min-width:0}
#helm09.coastal11 .s11-steer-row button{font-size:13px;min-width:0;min-height:44px;height:44px}
#helm09.coastal11 .s11-throttle-row button{min-width:44px}
#helm09.coastal11 .h09-top .h09-tools{right:320px}
#helm09.coastal11 #helm09-readouts{right:320px}
}
'''
p=r/'site/access11.css';p.write_text(p.read_text()+css)
patch('verify11.py',"assert page.evaluate('BAYPLAY.state.steer>.6');","page.wait_for_timeout(400);assert page.evaluate('BAYPLAY.state.steer<-.6 && window.ATLAS_TOUCH_STEERING');")
patch('verify11.py',"page.evaluate('BAYPLAY.testStep(.8)');assert page.evaluate('BAYPLAY.inspect().hardware.fishbox.value>.5');", "before_fitting=page.evaluate('({time:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');page.wait_for_function('BAYPLAY.inspect().hardware.fishbox.value>.5');assert before_fitting==page.evaluate('({time:BAYPLAY.state.elapsed,x:BAYPLAY.state.x,z:BAYPLAY.state.z})');r['pausedFittingWithoutPhysicsAdvance']=True;")
print('Fixed physical steering direction/hold, paused fittings, stable labels and responsive control overlap')
