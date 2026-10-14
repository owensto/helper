"""Final UX and data-integrity pass on the recovered Sea Lab app."""
from pathlib import Path
import os,json
R=Path(os.environ['COMMAND_ROOT']);S=R/'site'
def edit(name,a,b):
 p=S/name;t=p.read_text();assert a in t,(name,a[:80]);p.write_text(t.replace(a,b))
edit('command.js',"const ref=$('cfg-physics').value==='reference';for(const id of ['cfg-dry','cfg-mass','cfg-load','cfg-fuel'])$(id).disabled=ref;","const ref=$('cfg-physics').value==='reference';if(ref){$('cfg-count').value='1';$('cfg-hp').value='300';$('cfg-location').value='basin';$('custom-hp-label').hidden=true;}for(const id of ['cfg-count','cfg-hp','cfg-custom-hp','cfg-location','cfg-conditions','cfg-tide','cfg-dry','cfg-mass','cfg-load','cfg-fuel'])$(id).disabled=ref;")
edit('command-motion.js',"next.split=clamp(next.split,-1,1);if(!['seamanship'","next.split=clamp(next.split,-1,1);next.tide=clamp(next.tide,-2,3);if(!['basin','beaufort'].includes(next.location))throw Error('Unknown location');if(!['seamanship'")
edit('command.js',"function setWorkspace(w){if(window.CMD_LAB.active","function setWorkspace(w){document.getElementById('cmd-sidebar').scrollTop=0;if(window.CMD_LAB.active")
edit('command.js',"if(w==='configure'){A.setMode('inspect');collapse(false);","if(w==='configure'){A.setMode('inspect');A.setPaused(false);collapse(false);")
edit('command-tests.js',"active=null;window.BAYPLAY.setPaused(true);$('test-progress').textContent='Aborted.","active=null;persist();window.BAYPLAY.setPaused(true);$('test-progress').textContent='Aborted.")
edit('command-tests.js',"configuration:{...s.config},totalMassKg:s.totalMassKg(),requestedLocation:cfg.location,conditions:'calm'","configuration:{...s.config,conditions:'calm',split:0},totalMassKg:s.totalMassKg(),requestedLocation:cfg.location,conditions:'calm'")
edit('command-motion.js',"super.step(dt,obstacles);this.airborne=false;return;","super.step(dt,obstacles);this.portRpm=this.rpm;this.starboardRpm=0;this.airborne=false;return;")
edit('workspace.js',"$('cfg-mass').value=hp<=200?230:hp<=350?277:437;}","$('cfg-mass').value=hp<=200?230:hp<=350?277:437;$('cfg-mass').dispatchEvent(new Event('change',{bubbles:true}));}")
edit('instruments.js',"heading(s){return ((90+s.heading*180/Math.PI)%360+360)%360;}","heading(s){return ((90+s.heading*180/Math.PI)%360+360)%360;},course(s){return s.speedOverGround>.15?((90+Math.atan2(s.vz,s.vx)*180/Math.PI)%360+360)%360:null;}")
edit('instruments.js','SIM SOUNDER + ENGINE','SIM SOUNDER / CHART ESTIMATE')
edit('instruments.js','ENC INTERPOLATED + ASSUMED TIDE − SENSOR OFFSET','CHART ESTIMATE · ASSUMED TIDE · NOT LIVE SONAR')
p=S/'index.html';t=p.read_text().replace('BAY / SEA LAB 04','BAY / SEA LAB 04.2').replace('ATLAS Bay Sea Lab 04','ATLAS Bay Sea Lab 04.2')
t=t.replace('Load &amp; balance assumptions','Load assumptions').replace('Each engine + rigging (kg)','Engine + rigging / each (kg)')
t=t.replace('<button class="active" data-workspace="configure">Boat setup</button>','<button data-workspace="configure" class="active">Configure</button>').replace('SIM BELOW SENSOR / FT','EST. BELOW SENSOR / FT')
t=t.replace('<script defer="" src="workspace.js"></script>','<script defer="" src="workspace.js"></script><script defer src="delivery.js"></script>');assert 'delivery.js' in t
t=t.replace('</head>','<link rel="stylesheet" href="delivery.css"></head>');p.write_text(t)
(S/'delivery.css').write_text('''
/* Sea Lab 04.2: same boat, task-based layouts, no centered driving form. */
#toast{top:auto!important;bottom:52px!important;left:50%!important;max-width:min(650px,82vw)!important;pointer-events:none;font-size:11px!important;box-shadow:none!important}
#command-app #configuration-actions{position:sticky;bottom:-19px;background:#112e3bef;border-top:1px solid #89b2b449;padding:8px 0 16px;margin-top:12px;z-index:5;backdrop-filter:blur(12px)}
#command-app #configuration-actions button{min-height:42px}
#command-app #cfg-share{white-space:normal}
#command-app .workspace-tabs{min-width:330px}
#command-app .workspace-tabs button{flex:1}
#command-app #instrument-quality{font-size:9px;color:#c9b993;letter-spacing:.4px;margin:3px 0 9px}
#command-app .panel-heading{position:sticky;top:-19px;background:#112e3bf5;z-index:3;padding-top:10px}
#command-app[data-workspace=test] #cmd-sidebar{width:420px}
#command-app[data-workspace=test] .cmd-status{left:460px}
#command-app #test-graph{height:215px}
#command-app .test-result strong{letter-spacing:.3px}
#command-app #layout-toggle{margin-left:3px;min-width:31px;font-size:16px}
#command-app .layout-switch.folded [data-layout],#command-app .layout-switch.folded>span{display:none}
#command-app .layout-switch.folded #layout-toggle{font-size:11px;width:auto;min-width:92px}
#command-app #test-match{margin-top:10px;color:#cfe7e1}
#command-app #test-options summary{font-size:11px}
#command-app #touch-engine{font-size:12px;min-width:68px}
#command-app #touch-forward{font-size:17px}
#command-app #touch-helm .touch-status{position:fixed;bottom:96px;left:14px;color:#dbeee5;font-size:10px;background:#153a45ac;padding:5px 8px;border-radius:5px}
#command-app.immersive #touch-helm .touch-status{bottom:84px}
#command-app #cmd-operator.collapsed{padding-top:7px;padding-bottom:5px}
#command-app #cmd-operator.collapsed .cmd-metrics{margin-bottom:4px}
#command-app #cmd-operator.collapsed #instrument-quality{display:none}
@media(max-width:900px){#command-app.immersive[data-workspace=drive] #touch-helm,#command-app.compact-controls[data-workspace=drive] #touch-helm{display:block}}
@media(max-width:700px){
 #command-app .workspace-tabs{min-width:0;flex:1}
 #command-app .cmd-header{gap:6px;padding-left:10px;padding-right:10px}
 #command-app #cmd-sidebar,#command-app[data-workspace=test] #cmd-sidebar{width:auto;left:8px;right:8px}
 #command-app .panel-heading{top:-16px}
 #command-app #configuration-actions{bottom:-16px}
 #command-app #cmd-operator.collapsed{bottom:118px!important;background:#112e3bd4}
 #command-app #cmd-operator.collapsed .operator-heading>span:first-child{font-size:8px}
 #command-app #cmd-operator.collapsed .cmd-metrics strong{font-size:18px}
 #command-app .layout-switch{gap:2px}
 #command-app .layout-switch.folded{left:auto;right:9px;top:69px;width:auto}
 #command-app #layout-toggle{font-size:13px;flex:0 0 25px}
 #command-app .cmd-status,#command-app[data-workspace=drive] .cmd-status{font-size:7px;max-width:100%;top:154px}
 #command-app .touch-steer{left:10px;bottom:45px;gap:5px}
 #command-app .touch-steer button{min-width:38px;width:38px;height:44px;font-size:16px;border-radius:10px}
 #command-app #touch-engine{min-width:58px;width:58px;font-size:10px}
 #command-app .touch-power{right:12px;bottom:44px;width:112px}
 #command-app .touch-power input{height:34px}
 #command-app.immersive .touch-power{bottom:22px}
 #command-app.immersive .touch-steer{bottom:22px}
 #command-app #touch-helm .touch-status{bottom:98px;font-size:9px}
 #command-app #test-graph{height:200px}
 #toast{bottom:auto!important;top:188px!important;max-width:87vw!important;font-size:10px!important}
}
''')
(S/'delivery.js').write_text(r'''
/* User control improvements. This file does not claim marine calibration. */
(()=>{'use strict';const $=id=>document.getElementById(id);function init(){if(!window.ATLAS_WORKSPACE?.ready)return setTimeout(init,100);
 const C=CMD,A=BAYPLAY,S=A.state,app=$('command-app');
 const actions=document.createElement('div');actions.id='configuration-actions';$('config-body').append(actions);actions.append($('cfg-apply'),$('cfg-drive'));
 const row=document.createElement('p');row.className='muted';row.textContent='Mass values and engine size classes are editable scenario assumptions, not manufacturer installation dimensions.';$('mass-summary').after(row);
 const toggle=document.createElement('button');toggle.id='layout-toggle';toggle.textContent='−';toggle.setAttribute('aria-label','Minimize view selector');toggle.title='Minimize view selector';document.querySelector('.layout-switch').append(toggle);
 toggle.onclick=()=>{const folded=document.querySelector('.layout-switch').classList.toggle('folded');toggle.textContent=folded?'Views ▾':'−';toggle.setAttribute('aria-expanded',String(!folded));};
 const quality=document.createElement('div');quality.id='instrument-quality';document.querySelector('.cmd-metrics').after(quality);
 const touch=document.querySelector('#touch-helm .touch-steer');const eng=document.createElement('button');eng.id='touch-engine';eng.textContent='Start';eng.setAttribute('aria-label','Start or stop engine');eng.onclick=()=>{if(!CMD_LAB.active)A.engineToggle();};touch.prepend(eng);
 const fwd=document.createElement('button');fwd.id='touch-forward';fwd.textContent='F';fwd.title='Forward';fwd.onclick=()=>{if(!CMD_LAB.active)A.chooseGear(1);};touch.append(fwd);
 const stat=document.createElement('div');stat.className='touch-status';$('touch-helm').append(stat);
 document.querySelectorAll('#touch-helm [data-steer]').forEach(b=>b.addEventListener('lostpointercapture',()=>{window.ATLAS_TOUCH_STEERING=false;S.steer=0;}));
 const compact=v=>{ $('operator-controls').hidden=v;$('operator-collapse').textContent=v?'+':'−';$('operator-collapse').setAttribute('aria-expanded',String(!v));app.classList.toggle('compact-controls',v); };
 $('operator-collapse').addEventListener('click',()=>app.classList.toggle('compact-controls',$('operator-controls').hidden));
 if(innerWidth<=700)compact(true);
 const wp=C.setWorkspace;C.setWorkspace=function(w){wp(w);if(w==='drive'&&innerWidth<=700)compact(true);};
 document.querySelectorAll('.workspace-tabs button').forEach(b=>b.onclick=()=>C.setWorkspace(b.dataset.workspace));
 const opts=document.createElement('details');opts.id='test-options';opts.innerHTML='<summary>Test configuration</summary><p class="muted">Tests use the applied engine and load setup. All four runs take place in the controlled basin with calm conditions and fixed trim. The complete setup accompanies every result.</p><button id="test-configure">Change engine / load →</button>';$('test-kind').closest('label').before(opts);$('test-configure').onclick=()=>C.setWorkspace('configure');
 const mr=document.createElement('div');mr.id='test-match';$('test-progress').before(mr);
 setInterval(()=>{const cog=CMD_INSTRUMENTS.course(S);quality.textContent=(S.location==='beaufort'?(Number.isFinite(S.depth)?'Chart depth estimate':'No depth coverage'):'Fictional test basin')+' · COG '+(cog===null?'—':cog.toFixed(0)+'°T');
 eng.textContent=S.engine?'Off':'Start';eng.disabled=!!CMD_LAB.active;fwd.disabled=!!CMD_LAB.active;stat.textContent=`${S.gear===1?'F':S.gear===-1?'R':'N'} · ${(S.speedOverGround*1.943844).toFixed(1)} kn · ${Math.round(S.throttle*100)}%`;
 mr.textContent=`Applied: ${S.config.count} × ${S.config.hp} HP · ${Math.round(S.totalMassKg()).toLocaleString()} kg · ${S.config.physics==='reference'?'F300 reference':'modeled '+S.config.physics}`;
 },220);
 window.ATLAS_DELIVERY={ready:true,version:'04.2',compact,inspectedPublic:false};
}init();})();
''')
p=S/'command_report.json';d=json.loads(p.read_text());d.update(revision='ATLAS Bay Sea Lab 04.2',portrait_compact_controls=True,collapsible_view_selector=True,sticky_configuration_actions=True,real_google_map_tested=False,marine_validated=False,google_maps_status='Adapter implemented; authorized API key still required',source_review_run=38593856163,source_review_artifact=11909727470);p.write_text(json.dumps(d,indent=2))
edit('command-tests.js',"heading_rad,rpm'];","heading_rad,rpm,engine_mass_kg,dry_boat_mass_kg,payload_kg,fuel_start_us_gal,conditions,location,evidence'];")
edit('command-tests.js',"...p.slice(0,6)].join(','));","...p.slice(0,6),r.configuration.engineKg,r.configuration.dryKg,r.configuration.loadKg,r.configuration.fuelGal,r.conditions,r.configuration.location,JSON.stringify(r.evidence)].join(','));")
edit('command-tests.js',"c.fillText(maxT.toFixed(0)+' s',w-40,h-7);","c.fillText(maxT.toFixed(0)+' s',w-40,h-7);for(let j=0;j<=4;j++){const xx=30+(w-40)*j/4,yy=h-25-(h-42)*j/4;c.fillText((maxT*j/4).toFixed(0),xx,h-7);if(j)c.fillText((maxV*j/4).toFixed(0),3,yy+4);}")
# Expand the reviewed acceptance suite; do not drop earlier assertions.
p=R/'verify04.py';v=p.read_text().replace("'google_authorized_map_tested':False,","'google_authorized_map_tested':False,'release':'04.2',")
v=v.replace('window.ATLAS_WORKSPACE?.ready && BayGeo.ready','window.ATLAS_WORKSPACE?.ready && window.ATLAS_DELIVERY?.ready && BayGeo.ready')
v=v.replace('# Rendered player input, not only a standalone function call.',"""if device=='phone':
    assert page.locator('#operator-controls').is_hidden()
    assert page.locator('#touch-engine').is_visible() and page.locator('#touch-forward').is_visible()
    r['portrait_compact_controls']=True
    page.locator('#operator-collapse').click()
   page.locator('#layout-toggle').click();assert page.locator('[data-layout=helm]').is_hidden()
   page.locator('#layout-toggle').click();assert page.locator('[data-layout=helm]').is_visible()
   r['view_selector_minimize_restore']=True
   # Rendered player input, not only a standalone function call.""")
v=v.replace("assert page.locator('#cmd-jump').is_visible();r['sport_profile']=True","\n   if page.locator('#operator-controls').is_hidden():page.locator('#operator-collapse').click()\n   assert page.locator('#cmd-jump').is_visible();r['sport_profile']=True")
v=v.replace("r['chart_features']=page.evaluate","""assert page.locator('#cfg-count').is_disabled() and page.locator('#cfg-hp').is_disabled();r['reference_fields_locked']=True
   assert page.evaluate('BayGeo.sample(999999,999999).depth===null');r['outside_chart_no_depth']=True
   assert page.evaluate('CMD_INSTRUMENTS.course({speedOverGround:0,vx:0,vz:0})===null')
   assert page.evaluate('Math.abs(CMD_INSTRUMENTS.course({speedOverGround:1,vx:0,vz:1})-180)<1e-9');r['course_not_heading']=True
   r['chart_features']=page.evaluate""")
v=v.replace("print(json.dumps(report,indent=2));assert report['passed']","print(json.dumps({'passed':report['passed'],'tests':[{'device':r['device'],'passed':r['passed'],'exception':r.get('exception')} for r in report['tests']]},indent=2));assert report['passed']")
(R/'verify_release.py').write_text(v)
print('Sea Lab 04.2 delivery polish and expanded acceptance suite prepared')
