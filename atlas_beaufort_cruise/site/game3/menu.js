/* Compact dashboard and settings. Explicit native host commands only. */
(function(G){'use strict';G.installBeaufortMenu3=function(H){
 const D=H.document,$=id=>D.getElementById(id),app=$('helm09'),prior=H.panels.renderPanel;
 if(!app||!H.local()||typeof prior!=='function')throw Error('Local Beaufort menu host required.');
 let stopped=false,scope=null;const off=new AbortController();
 function el(tag,text,cls){const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function b(text,fn,id){const n=el('button',text);n.type='button';if(id)n.id=id;n.addEventListener('click',()=>{if(stopped||!n.isConnected||!H.local())return;fn();},{signal:scope.signal});return n;}
 function open(k){H.clearKeys();H.open(k);}
 function back(body){const row=el('div','','g3-back');row.append(b('‹ Menu',()=>open('d2-menu')),b('Return to driving',()=>H.close(),'g3-drive'));body.append(row);}
 function card(body,mark,title,desc,fn,id){const n=b('',fn,id);n.className='g3-card';n.append(el('span',mark,'g3-icon'),el('strong',title),el('small',desc));body.append(n);}
 function select(body,title,values,current,action){const l=el('label',title,'g3-field'),s=el('select');s.setAttribute('aria-label',title);for(const [v,t] of values){const n=el('option',t);n.value=v;s.append(n);}s.value=current;s.addEventListener('change',()=>{if(s.isConnected&&H.local())action(s.value);},{signal:scope.signal});l.append(s);body.append(l);}
 function panel(kind,body){scope?.abort();scope=new AbortController();app.dataset.menu3=kind;
  if(!['d2-menu','d2-refresh','g3-play','g3-boat','g3-view','g3-help','g3-roadmap'].includes(kind))return prior.call(this,kind,body);
  $('helm09-title').textContent=kind==='d2-menu'||kind==='d2-refresh'?'Beaufort River':kind==='g3-play'?'Choose an outing':kind==='g3-boat'?'Your boat':kind==='g3-view'?'View & graphics':kind==='g3-roadmap'?'The game we are building':'How to drive';
  if(kind==='d2-menu'||kind==='d2-refresh'){
   const hero=el('div','','g3-hero');hero.append(el('span','ATLAS / BEAUFORT','g3-kicker'),el('p','Your river. Your pace.'),b('Return to driving',()=>H.close(),'g3-return'));body.append(hero);
   const grid=el('div','','g3-grid');
   card(grid,'↗','Explore & play','Waterfront cruise and harbor practice',()=>open('g3-play'),'g3-play');
   card(grid,'♫','Country music','Zach Bryan · Country Cruise · your files',()=>open('radio'),'g3-music');
   card(grid,'⌁','Weather & water','Waves, wind, tide and time of day',()=>open('weather'),'g3-weather');
   card(grid,'⚓','Boat controls','Trim, engine setup, fittings and assists',()=>open('g3-boat'),'g3-boat');
   card(grid,'◉','View & graphics','Camera and device performance',()=>open('g3-view'),'g3-view');
   card(grid,'?','How to drive','WASD, touch controls and key guide',()=>open('g3-help'),'g3-help');body.append(grid);
   const row=el('div','','g3-foot');row.append(b('Open map',()=>{H.close();H.map();}),b('Game roadmap',()=>open('g3-roadmap')));body.append(row);return true;
  }
  back(body);
  if(kind==='g3-play'){body.append(el('p','Choose where to start. The existing cruise and practice modes are playable; the career below is planned.','g3-intro'));
   const grid=el('div','','g3-grid');card(grid,'↗','Beaufort outings','Cruise stops, practice and scenic places',()=>open('more14'));card(grid,'✓','Trip progress','Continue your current sightseeing trip',()=>open('d2-trip'));card(grid,'⌖','Explore freely','Keep your boat exactly where it is',()=>H.close());card(grid,'☆','What comes next','Docking medals, deliveries and progression',()=>open('g3-roadmap'));body.append(grid);
  }
  if(kind==='g3-boat'){const grid=el('div','','g3-grid');card(grid,'↕','Motor trim','Raise or lower the running trim',()=>{H.close();$('d2-trim').click();});card(grid,'⚙','Engine setup','Single 300, single 450 or twin 300s',()=>open('d2-engine'));card(grid,'□','Boat fittings','Open lockers, lights and other fittings',()=>open('boat'));card(grid,'≈',H.docking()?'Docking assist: ON':'Docking assist: OFF','22% power limit when enabled',()=>{H.setDocking(!H.docking());H.close();open('g3-boat');});body.append(grid,b('Advanced boat settings',()=>open('settings')));}
  if(kind==='g3-view'){const grid=el('div','','g3-grid');for(const [name,v,desc]of [['At the helm','helm','Driver’s view'],['Follow the boat','follow','See turns and wakes'],['Look around','orbit','Explore the waterfront']])card(grid,'◉',name,desc,()=>{H.view(v);H.close();});body.append(grid);select(body,'Graphics quality',[['auto','Auto — balanced for this device'],['smooth','Performance — lighter rendering'],['detailed','Detailed — stronger shadows']],H.graphics(),v=>H.setGraphics(v));body.append(el('p','Graphics quality changes rendering, not the depth or collision world.','g3-note'));}
  if(kind==='g3-help'){body.append(el('p','Start the engine with E, select Forward with F, then hold W to add power. Release W to keep that throttle setting.','g3-intro'));
   const table=el('div','','g3-keys');for(const [keys,label]of [['W / S','Increase / decrease power'],['A / D','Steer left / right; release to center'],['E','Ignition on / off'],['F / N / R','Forward / Neutral / Reverse'],['Q / Z','Trim up / down'],['Space','Idle power + Neutral (not a brake)'],['P / M','Pause / Map']]){table.append(el('kbd',keys),el('span',label));}body.append(table,el('p','On touchscreens, drag the steering pad and use the power slider. Keyboard driving stops accepting held inputs in menus or text fields. After using a video player, click the water or Return to driving to give the game keyboard focus.','g3-note'));}
  if(kind==='g3-roadmap'){body.append(el('p','Beaufort Harbor Life — a relaxed boating game built around learning your boat, exploring and earning better outings. Planned, not active gameplay.','g3-intro'));
   for(const [n,t]of [['01 · First trip','A guided departure, cruise and return. Clear goals, optional hints, no penalties while learning.'],['02 · Docking school','Bronze / silver / gold for approach speed, alignment, contact and a controlled stop. No countdown in relaxed mode.'],['03 · Harbor jobs','Short deliveries and passenger sightseeing routes with a simple payout and fuel costs.'],['04 · Your boat','Saved progress, cosmetic upgrades and meaningful setup choices. Realism and assistance remain separate.']]){const c=el('div','','g3-plan');c.append(el('h3',n),el('p',t));body.append(c);}body.append(el('p','The current app has sightseeing and practice only. No career payouts, save account, fishing simulation or multiplayer is being claimed here.','g3-note'));}
  return true;
 }
 const hook=function(k,body){if(k==='g3-boat-refresh')k='g3-boat';return panel.call(this,k,body);};H.panels.renderPanel=hook;app.classList.add('game3');
 const p=$('helm09-panel');p.setAttribute('role','dialog');p.setAttribute('aria-labelledby','helm09-title');
 return {dispose(){if(stopped)return;stopped=true;scope?.abort();off.abort();if(H.panels.renderPanel===hook)H.panels.renderPanel=prior;app.classList.remove('game3');delete app.dataset.menu3;}};
};})(typeof window==='undefined'?globalThis:window);
