
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
