/* Sea Lab 05.1 — optional instrument workflows, cockpit framing, readable telemetry. */
(()=>{'use strict';const $=id=>document.getElementById(id);
function init(){if(!window.SEA05?.ready)return setTimeout(init,100);const A=BAYPLAY,S=A.state,I=CMD_INSTRUMENTS,app=$('command-app');
 document.title='ATLAS Sea Lab 05.1 — Cockpit, Sound & Performance';
 document.querySelectorAll('.cmd-brand small,.brand small').forEach(e=>e.textContent=e.textContent.replace(/05(?:\.1)?/,'05.1'));
 $('speed-basis').textContent='05.1 • custom physics are modeled; the F300 reference is a separate boat-test curve';
 const toolbar=document.querySelector('.mfd-toolbar');
 const add=(id,text,handler)=>{const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=handler;toolbar.append(b);return b;};
 add('mfd-engine-page','Engine data',()=>{I.screenPage='engines';$('mfd-panel').dataset.page='echo';I.engines($('mfd-echo'),S);A.refresh();});
 $('mfd-echo-only').addEventListener('click',()=>{I.screenPage='sonar';A.refresh();});$('mfd-both').addEventListener('click',()=>{I.screenPage='sonar';A.refresh();});
 add('mfd-target','Set chart target',()=>{I.pickTarget=!I.pickTarget;$('mfd-target').classList.toggle('active',I.pickTarget);$('mfd-target').textContent=I.pickTarget?'Tap chart for target':'Set chart target';$('mfd-panel').dataset.page='chart';});
 add('mfd-clear-target','Clear target',()=>{I.waypoint=null;I.pickTarget=false;$('mfd-target').classList.remove('active');$('mfd-target').textContent='Set chart target';A.refresh();});
 $('mfd-chart').addEventListener('pointerup',e=>{if(!I.pickTarget)return;if(I.pick($('mfd-chart'),e.clientX,e.clientY,S)){I.pickTarget=false;$('mfd-target').classList.remove('active');$('mfd-target').textContent='Set chart target';A.refresh();}});
 const scroll=document.createElement('label');scroll.innerHTML='Scroll <select id="mfd-scroll" aria-label="Sounder scroll rate"><option value=".5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select>';toolbar.append(scroll);$('mfd-scroll').onchange=e=>{I.scrollRate=Number(e.target.value);A.refresh();};
 const focus=document.createElement('button');focus.id='console-focus';focus.textContent='Console close-up';focus.title='Look at the physical instrument screens, without a covering panel';focus.onclick=()=>{SEA05.instruments(false);A.setCamera('instruments');};$('mfd-open').after(focus);
 const resumeHelm=document.createElement('button');resumeHelm.id='return-helm';resumeHelm.textContent='Back to helm';resumeHelm.onclick=()=>CMD.setLayout('helm');focus.after(resumeHelm);
 const hint=document.createElement('small');hint.id='mfd-route-note';hint.textContent='Target line is a simulator bearing, NOT a safe route. Chart soundings are sparse estimates; no live fish returns.';document.querySelector('#mfd-panel footer').append(hint);
 const clear=document.createElement('button');clear.id='pure-cockpit';clear.textContent='Hide speed card';clear.title='Toggle the separate speed card; the physical cockpit screens remain';$('cmd-sound').before(clear);
 clear.onclick=()=>{app.classList.toggle('pure-cockpit');clear.textContent=app.classList.contains('pure-cockpit')?'Show speed card':'Hide speed card';};
 const status=document.createElement('button');status.id='runtime-status';status.textContent='Timing';status.title='Inspect rendering rate and simulation time';document.querySelector('.cmd-bottom').append(status);
 let timingOn=false;status.onclick=()=>{timingOn=!timingOn;};
 const testData=document.createElement('details');testData.id='speed-explainer';testData.innerHTML='<summary>What changed in speed?</summary><p>The older custom drag curve fought the engine too strongly. The new resistance scaffold is shaped using the published F300 speed curve, with assumed propulsion efficiency and load scaling. Custom configurations remain simulation estimates—not Atlas sea trials.</p><p>1 knot = 1 nautical mile per hour. Ground speed includes current; speed through water excludes it. The reference mode retains the original Sportsman/Yamaha source curve.</p>';$('drive-basis').after(testData);
 const sounds=document.createElement('p');sounds.className='muted';sounds.innerHTML='Recorded layer: <a href="https://freesound.org/people/nomadas/sounds/690160/" target="_blank" rel="noopener noreferrer">nomadas / Freesound, CC0</a>. Mixed with original synthesized combustion, intake, wake, wind and controls. Not a Yamaha-specific recording.';$('sound-mixer').append(sounds);
 const showSound=document.createElement('button');showSound.id='sound-quick';showSound.textContent='Enable sound';showSound.title='Sound is opt-in';showSound.onclick=()=>{$('cmd-sound').click();};document.querySelector('.header-right').prepend(showSound);
 // UI status never fabricates measured current engine or real-world sonar performance.
 setInterval(()=>{const t=window.SEA_TIMING;status.textContent=timingOn&&t?`${(1000/Math.max(1,t.emaFrameMs)).toFixed(0)} fps · ${t.stalls?'stall pauses '+t.stalls:'60 Hz physics'}`:'Timing';showSound.textContent=A.audio.enabled?'Sound on':'Enable sound';showSound.classList.toggle('active',A.audio.enabled);
 $('return-helm').hidden=A.cameraMode()!=='instruments';const nav=I.navigation(S);$('mfd-route-note').textContent=(nav?`Target ${nav.distanceNM.toFixed(2)} NM · ${nav.bearing.toFixed(0)}°T. `:'')+'Direct simulator line only, NOT a safe route. Estimated chart soundings—not live sonar.';},400);
 window.SEA51={ready:true,version:'05.1',inspect(){return {timing:window.SEA_TIMING,pureCockpit:app.classList.contains('pure-cockpit'),mockScreenOverlayHidden:A.model.getObjectByName('EX_Console__top_underside')?.visible===false,waypoint:I.navigation(S),screen:I.screenPage,sound:A.audio.inspect()}}};
}init();})();
