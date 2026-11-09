/* One clean helm. Reuses native ignition, pause, gears and trim; no new simulation loop. */
(function(G){'use strict';
G.installAtlasDeviceHelm=function(H){
 const D=H.document,W=H.window,C=G.AtlasDeviceCore,$=id=>D.getElementById(id),app=$('helm09');
 if(!app||!C||!H.isLocal()||G.ATLAS_DEVICE_HELM)throw Error('Device helm unavailable or already installed.');
 for(const n of [$('helm09-pause'),$('helm09-key'),app.querySelector('.h09-gears'),$('eh-trim-controls'),$('helm09-panel'),$('helm09-panelbody')])if(!n)throw Error('Compatible helm is not ready.');
 const abort=new AbortController(),originals=[],owned=[];let binding=abort,panelAbort=null;let disposed=false,uiStamp='',noticeAt=0,expanded=false;
 const E=(tag,text,cls)=>{const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const on=(n,t,fn)=>n.addEventListener(t,fn,{signal:binding.signal});
 const say=t=>{message.textContent=t;message.hidden=!t;noticeAt=H.now();};
 const B=(text,fn,id)=>{const b=E('button',text);b.type='button';if(id)b.id=id;on(b,'click',()=>{if(disposed||!b.isConnected||!H.isLocal())return;try{fn();}catch(e){say(e.message);}});return b;};
 function own(n,p=app){owned.push(n);p.append(n);return n;}
 function move(n,p){if(!n)throw Error('Missing native helm control.');const marker=E('span');n.parentNode.insertBefore(marker,n);originals.push([n,marker]);p.append(n);return n;}
 const steering=new C.Steering(H);
 const header=E('section','','d2-header');header.id='d2-header';header.setAttribute('aria-label','Essential boat instruments');
 const speed=E('strong','0.0'),unit=E('small','knots'),speedbox=E('div','','d2-speed');speedbox.append(speed,unit);
 const depth=E('span','Depth unknown','d2-depth');depth.id='d2-depth';
 const menu=B('Menu',()=>open('d2-menu'),'d2-menu');menu.setAttribute('aria-haspopup','dialog');header.append(speedbox,depth);move($('helm09-pause'),header);header.append(menu);own(header);
 const driving=E('section','','d2-driving');driving.id='d2-driving';driving.setAttribute('aria-label','Boat controls');
 const steerBox=E('div','','d2-card d2-steer');steerBox.append(E('span','STEER · release to center','d2-label'));
 const pad=E('div','','d2-pad');pad.id='d2-steering';pad.tabIndex=0;pad.setAttribute('role','slider');pad.setAttribute('aria-label','Steer boat. Drag left or right; release to center. Arrow keys make small turns, Home centers.');pad.setAttribute('aria-valuemin','-100');pad.setAttribute('aria-valuemax','100');
 const left=E('span','‹','d2-arrow'),knob=E('span','○','d2-knob'),right=E('span','›','d2-arrow');pad.append(left,knob,right);steerBox.append(pad);
 on(pad,'pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;if(steering.start(e.pointerId,e.clientX,pad.getBoundingClientRect())){e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(_){steering.reset();}paintSteer();}});
 on(pad,'pointermove',e=>{if(steering.move(e.pointerId,e.clientX,pad.getBoundingClientRect())){e.preventDefault();paintSteer();}});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])on(pad,name,e=>{steering.release(e.pointerId);paintSteer();});
 on(pad,'keydown',e=>{let v;if(e.key==='ArrowLeft')v=steering.value-.1;if(e.key==='ArrowRight')v=steering.value+.1;if(e.key==='Home'||e.key==='Escape')v=0;if(v!==undefined){e.preventDefault();e.stopPropagation();steering.key(v);paintSteer();}});
 on(pad,'keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.stopPropagation();steering.reset();paintSteer();}});
 on(pad,'blur',()=>{steering.reset();paintSteer();});on(W,'blur',()=>{steering.reset();paintSteer();});on(D,'visibilitychange',()=>{if(D.hidden)steering.reset();});
 const powerBox=E('div','','d2-card d2-power'),powerLabel=E('label','','d2-label');powerLabel.setAttribute('for','d2-power');powerLabel.append(E('span','POWER'));const powerValue=E('b','0%');powerLabel.append(powerValue);
 const power=E('input');power.id='d2-power';power.type='range';power.min='0';power.max='100';power.step='1';power.value='0';power.setAttribute('aria-label','Engine power');
 const powerEnds=E('div','','d2-power-ends');const idle=B('Idle',()=>{C.changePower(H,0);sync();}),full=B('Full',()=>{C.fullPower(H);say('Full power selected; docking limit off. Gear and engine remain under your control.');sync();},'d2-full');
 powerEnds.append(idle,full);powerBox.append(powerLabel,power,powerEnds);on(power,'input',()=>{C.changePower(H,Number(power.value)/100);sync();});
 const gearbox=E('div','','d2-gearbox');move($('helm09-key'),gearbox);move(app.querySelector('.h09-gears'),gearbox);for(const b of gearbox.querySelectorAll('[data-gear09]')){const v=Number(b.dataset.gear09);b.textContent=v<0?'Reverse':v>0?'Forward':'Neutral';}
 const trimButton=B('Trim',()=>{expanded=!expanded;trimPanel.hidden=!expanded;trimButton.setAttribute('aria-expanded',String(expanded));},'d2-trim');trimButton.setAttribute('aria-expanded','false');gearbox.append(trimButton);
 driving.append(steerBox,gearbox,powerBox);own(driving);
 const trimPanel=E('section','','d2-trim-panel');trimPanel.id='d2-trim-panel';trimPanel.hidden=true;trimPanel.setAttribute('aria-label','Motor trim');move($('eh-trim-controls'),trimPanel);trimPanel.append(B('Done',()=>{expanded=false;trimPanel.hidden=true;trimButton.setAttribute('aria-expanded','false');}));own(trimPanel);
 const message=E('div','','d2-message');message.id='d2-message';message.hidden=true;message.setAttribute('role','status');message.setAttribute('aria-live','polite');own(message);
 const music=E('section','','d2-now');music.id='d2-now';music.hidden=true;const musicTitle=B('Music',()=>open('radio'));const musicPause=B('Pause music',()=>$('eh-cruise-play')?.click(),'d2-music-pause');music.append(musicTitle,musicPause);own(music);
 const trip=B('Trip',()=>open('d2-trip'),'d2-trip');trip.hidden=true;own(trip);
 function paintSteer(){const v=steering.value;knob.style.setProperty('--steer',String(v));pad.setAttribute('aria-valuenow',String(Math.round(v*100)));pad.setAttribute('aria-valuetext',Math.abs(v)<.01?'Centered':Math.round(Math.abs(v)*100)+'% '+(v<0?'left':'right'));}
 function closeTrim(){expanded=false;trimPanel.hidden=true;trimButton.setAttribute('aria-expanded','false');}
 function open(kind){steering.reset();paintSteer();closeTrim();H.openPanel(kind);sync();}
 on($('helm09-pause'),'click',()=>{steering.reset();paintSteer();sync();});
 const priorPanel=H.panels.renderPanel;
 function section(body,title){const n=E('div','','d2-menu-section');n.append(E('h3',title));body.append(n);return n;}
 function choices(parent,rows){const g=E('div','','d2-menu-grid');for(const [text,fn,id]of rows)g.append(B(text,fn,id));parent.append(g);return g;}
 function select(parent,label,rows,value,fn){const wrap=E('label',label,'d2-select'),s=E('select');s.setAttribute('aria-label',label);rows.forEach(([v,t])=>{const o=E('option',t);o.value=v;s.append(o);});s.value=value;on(s,'change',()=>{if(disposed||!s.isConnected||!H.isLocal())return;try{fn(s.value);}catch(e){say(e.message);}});wrap.append(s);parent.append(wrap);return s;}
 const menuContent=(body)=>{
  $('helm09-title').textContent='Your boat';
  choices(body,[['Map',()=>{H.closePanel();H.toggleMap();}],['Music',()=>open('radio')],['Weather & tide',()=>open('weather')],['Boat & places',()=>open('more14')]]);
  const view=section(body,'View');choices(view,[['Driver',()=>{H.view('helm');H.closePanel();}],['Behind boat',()=>{H.view('follow');H.closePanel();}],['Look around',()=>{H.view('orbit');H.closePanel();}]]);
  const drive=section(body,'Driving');choices(drive,[['Engine setup',()=>open('d2-engine'),'d2-engine-open'],[H.docking()?'Docking: ON · 22% limit':'Docking assist: OFF',()=>{H.setDocking(!H.docking());H.openPanel('d2-refresh');}],['Motor trim',()=>{H.closePanel();expanded=true;trimPanel.hidden=false;trimButton.setAttribute('aria-expanded','true');}],['How to drive',()=>open('d2-help')]]);
  const graphics=section(body,'Display');select(graphics,'Graphics',[['auto','Auto · adapt to this device'],['smooth','Performance · lighter rendering'],['detailed','Detailed · more GPU work']],H.graphics(),v=>H.setGraphics(v));
  choices(graphics,[['Advanced settings',()=>open('settings')],['Trip progress',()=>open('d2-trip')]]);
  const a=H.telemetry();body.append(E('p','Beaufort preview · '+H.rigLabel()+' · '+(a.fps?Math.round(a.fps)+' displayed frames/s':'frame timing pending')+'. Frame timing is diagnostic, not a certified device benchmark.','d2-note'));
 };
 function renderPanel(kind,body){
  if(kind==='d2-menu'||kind==='d2-refresh'){menuContent(body);return true;}
  if(kind==='d2-help'){$('helm09-title').textContent='Drive without the clutter';body.append(E('p','Turn the key → Forward → slide Power. Drag the steering pad left or right and release to center. Trim opens beside the controls. Pause is always at the top.'),E('p','Keyboard: E engine, F/N/R direction, W/S power, A/D steering, Q/Z trim, P pause, M map. Neutral removes thrust after clutch release; it is not an instant brake.'),B('Back to boat',()=>H.closePanel()));return true;}
  if(kind==='d2-trip'){$('helm09-title').textContent='Your cruise';const card=$('bc-voyage');if(card&&!card.hidden){body.append(E('h3',card.querySelector('strong')?.textContent),E('p',card.querySelector('span')?.textContent),E('p',card.querySelector('small')?.textContent));for(const b of card.querySelectorAll('button'))if(!b.hidden)body.append(B(b.textContent,()=>{b.click();H.closePanel();}));}else body.append(E('p','No sightseeing trip is active.'),B('Choose a Beaufort trip',()=>open('more14')));return true;}
  if(kind==='d2-engine'){$('helm09-title').textContent='More engine power';body.append(E('p','Current: '+H.rigLabel()+'. Stop the engine, select Neutral and idle power, and slow below 1 knot to change setup. Your position, weather and trip stay unchanged.'));
   for(const [key,r]of Object.entries(C.RIGS))body.append(B(r.label,()=>{const result=C.applyRig(H,key);say(result.label+' selected. Turn the key when ready.');H.closePanel();},'d2-rig-'+key));body.append(E('p','These are modeled performance options, not a rating that the real hull can accept these engines. There is no fake speed multiplier.','d2-note'));return true;}
  return priorPanel.call(this,kind,body);
 }
 function panel(kind,body){panelAbort?.abort();panelAbort=new AbortController();const scope=panelAbort;binding=scope;try{
  if(kind==='radio')queueMicrotask(()=>{if(disposed||scope.signal.aborted||!body.isConnected)return;const was=binding;binding=scope;try{const box=section(body,'Music output');select(box,'Listening mode',[['computer','Computer speakers'],['boat','Boat speakers']],H.musicPrefs().output,v=>H.setMusicOutput(v));select(box,'When the boat pauses',[['keep','Keep music playing'],['follow','Pause music too']],H.musicPrefs().keep?'keep':'follow',v=>H.setMusicKeep(v==='keep'));box.append(E('p','These settings affect your audio files and the included tracks. YouTube keeps its own visible player.','d2-note'));}finally{binding=was;}});
  return renderPanel.call(this,kind,body);
 }finally{binding=abort;}}
 H.panels.renderPanel=panel;
 function sync(){if(disposed||D.hidden)return;if(!H.isLocal()){steering.release();header.hidden=driving.hidden=true;return;}
  const s=H.read(),paused=H.paused(),panelOpen=!$('helm09-panel').hidden,photo=H.photo();app.classList.toggle('d2-panel-open',panelOpen);app.classList.toggle('d2-photo',photo);header.hidden=photo;driving.hidden=photo||panelOpen;
  if((paused||photo||panelOpen)&&(steering.pointer!==null||steering.value!==0)){steering.reset();paintSteer();}
  const d=C.clearance(s,H.feet()),stamp=JSON.stringify([s.speedOverGround,d,s.throttle,s.engine,H.docking(),s.trim,s.trimActual,paused,panelOpen]);
  if(stamp!==uiStamp){speed.textContent=Number.isFinite(s.speedOverGround)?(s.speedOverGround*3600/1852).toFixed(1):'—';depth.textContent=d.text;depth.dataset.tone=d.tone;power.max=H.docking()?'22':'100';powerValue.textContent=Math.round(s.throttle*100)+'%'+(H.docking()?' · docking':'');if(D.activeElement!==power)power.value=String(Math.round(s.throttle*100));trimButton.textContent=C.trimText(s);menu.setAttribute('aria-expanded',String(panelOpen));uiStamp=stamp;}
  const r=H.radio();music.hidden=photo||panelOpen||H.providerActive()||!r.wanted&&!r.playing;if(!music.hidden){musicTitle.textContent=r.title||'Music';musicPause.textContent=r.wanted?'Pause music':'Play music';}
  trip.hidden=photo||panelOpen||!$('bc-voyage')||$('bc-voyage').hidden;
  if(!message.hidden&&H.now()-noticeAt>6000)message.hidden=true;
 }
 app.classList.add('device2');paintSteer();sync();const timer=H.setInterval(sync,100);
 const api={ready:true,inspect:()=>({version:2,steering:steering.value,pointerHeld:steering.pointer!==null,disposed,layout:C.layout(W.innerWidth,W.innerHeight),nativeControlsMoved:originals.length,browserVerified:false}),dispose(){if(disposed)return;steering.dispose();disposed=true;H.clearInterval(timer);abort.abort();panelAbort?.abort();if(H.panels.renderPanel===panel)H.panels.renderPanel=priorPanel;for(const[n,m]of originals){if(m.parentNode)m.parentNode.insertBefore(n,m);m.remove();}owned.forEach(n=>n.remove());app.classList.remove('device2','d2-photo','d2-panel-open');if(G.ATLAS_DEVICE_HELM===api)delete G.ATLAS_DEVICE_HELM;}};
 G.ATLAS_DEVICE_HELM=api;on(W,'pagehide',()=>api.dispose());return api;
};
})(typeof window==='undefined'?globalThis:window);
