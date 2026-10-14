/* Explicit view states: cockpit is usable without an obstructing setup panel. */
(()=>{'use strict';const $=id=>document.getElementById(id);let A,C,S;function init(){if(!window.CMD?.ready)return setTimeout(init,100);A=BAYPLAY;C=CMD;S=A.state;
 const app=$('command-app');
 const touch=document.createElement('div');touch.id='touch-helm';touch.innerHTML='<div class="touch-steer"><button data-steer="-1" aria-label="Steer port">◀</button><button id="touch-neutral" aria-label="Neutral and coast">N</button><button data-steer="1" aria-label="Steer starboard">▶</button></div><label class="touch-power">THROTTLE<input id="touch-throttle" type="range" min="0" max="100" value="0" aria-label="Immersive throttle"/></label>';app.append(touch);
 touch.querySelectorAll('[data-steer]').forEach(b=>{b.onpointerdown=e=>{if(CMD_LAB.active)return;e.preventDefault();b.setPointerCapture(e.pointerId);window.ATLAS_TOUCH_STEERING=true;S.steer=Number(b.dataset.steer);A.refresh();};b.onpointerup=b.onpointercancel=()=>{window.ATLAS_TOUCH_STEERING=false;S.steer=0;A.refresh();};});
 $('touch-throttle').oninput=e=>{if(!CMD_LAB.active){S.throttle=Number(e.target.value)/100;A.refresh();}};$('touch-neutral').onclick=()=>{S.neutral();A.refresh();};
 addEventListener('blur',()=>{window.ATLAS_TOUCH_STEERING=false;S.steer=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){window.ATLAS_TOUCH_STEERING=false;S.steer=0;}});
 let mapHidden=true;const updateMap=()=>{const nav=C.layout==='split';$('cmd-chart-panel').hidden=mapHidden&&!nav;$('map-open').hidden=nav||!mapHidden;};
 $('map-hide').onclick=()=>{mapHidden=true;if(C.layout==='split')C.setLayout('helm');updateMap()};$('map-open').onclick=()=>{mapHidden=false;updateMap()};
 $('map-sonar').onclick=()=>{const on=$('cmd-sonar').hidden;$('cmd-sonar').hidden=!on;$('cmd-map').hidden=on;$('map-sonar').textContent=on?'Chart':'Sonar';};
 const oldLayout=C.setLayout;C.setLayout=function(v){oldLayout(v);updateMap()};document.querySelectorAll('.layout-switch button').forEach(b=>b.onclick=()=>C.setLayout(b.dataset.layout));
 const oldWorkspace=C.setWorkspace;C.setWorkspace=function(w){oldWorkspace(w);if(w==='drive'){try{const v=localStorage.getItem('atlas-view-drive');if(v)C.setLayout(v)}catch{}}updateMap()};document.querySelectorAll('.workspace-tabs button').forEach(b=>b.onclick=()=>C.setWorkspace(b.dataset.workspace));
 for(const [id,mode]of [['plot-speed','speed'],['plot-path','path']])$(id).onclick=()=>{CMD_LAB.setPlotMode(mode);$('plot-speed').classList.toggle('active',mode==='speed');$('plot-path').classList.toggle('active',mode==='path');};
 $('test-repeat').onclick=()=>{const r=CMD_LAB.results.at(-1);if(!r)return;C.fill(r.configuration);C.apply(false);C.setWorkspace('test');$('test-kind').value=r.kind;CMD_LAB.run(r.kind);C.setLayout('follow');};
 $('test-clear').onclick=()=>{if(CMD_LAB.active)CMD_LAB.abort();CMD_LAB.clear();$('test-progress').textContent='Test history cleared.';};
 $('cfg-hp').addEventListener('change',()=>{if($('cfg-hp').value!=='custom'){const hp=Number($('cfg-hp').value);$('cfg-mass').value=hp<=200?230:hp<=350?277:437;$('cfg-mass').dispatchEvent(new Event('change',{bubbles:true}));} });
 const enabledKeys=['KeyE','KeyF','KeyN','KeyR','KeyW','KeyS','KeyA','KeyD','KeyQ','KeyZ','Space','KeyJ'];addEventListener('keydown',e=>{if(CMD_LAB.active&&enabledKeys.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}},true);
 $('cmd-steer').addEventListener('pointerup',()=>{if(!CMD_LAB.active){S.steer=0;$('cmd-steer').blur();A.refresh();}});
 $('cmd-steer').addEventListener('pointercancel',()=>{S.steer=0;A.refresh()});
 let running=false;setInterval(()=>{updateMap();const on=!!CMD_LAB.active;if(on!==running){running=on;for(const id of ['cmd-engine','cmd-steer','cmd-throttle','cmd-split','cmd-trim','cmd-jump','cfg-apply','cfg-drive'])$(id).disabled=on||id==='cmd-trim'&&S.performanceMode==='reference';}
 if(document.activeElement!==$('touch-throttle'))$('touch-throttle').value=S.throttle*100;$('live-gear').textContent=S.gear===1?'F':S.gear===-1?'R':'N';$('live-gear').classList.toggle('in-gear',S.gear!==0);
 const a=CMD_LAB.active;$('test-live').textContent=a?`${a.phase.toUpperCase()} · ${a.time.toFixed(1)} s · ${(S.speedOverGround/.44704).toFixed(1)} mph`:'Latest three traces overlaid below.';
 const panel=$('cmd-operator');panel.classList.toggle('collapsed',$('operator-controls').hidden);
 },200);updateMap();
 // Escape/H always retain a restore button, including on touch devices.
 // Installation metadata is included; app-store packaging is a separate deliverable.
 window.ATLAS_WORKSPACE={ready:true,version:'04.1',get chartHidden(){return $('cmd-chart-panel').hidden;}};
}init();})();
