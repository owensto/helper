/* Page interface. All game mutations go through the shared career rules. */
(() => {
 'use strict';
 const C=window.CastwardCareer,G=window.CastwardGame,$=id=>document.getElementById(id),data=JSON.parse($('career-data').textContent),places=data.places,key='castward-career-v2';
 let s,storage=true;try{s=C.restore(JSON.parse(localStorage.getItem(key)||'null'),places);}catch{s=C.restore(null,places);storage=false;}
 const today=()=>new Date().toISOString().slice(0,10);C.visit(s,today());
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(s));storage=true;}catch{storage=false;}$('career-save-note').textContent=storage?'Saved on this device.':'Storage is unavailable. Export your save before you leave.';};
 let api,selected=s.place||places[0].id,tab='map',tutorialTime=0,mapRegion=null,mapObserver;
 const current=()=>places.find(p=>p.id===s.place);
 function render(){
  $('career-level').textContent='LV '+C.level(s);$('career-coins').textContent=s.coins.toLocaleString();$('career-xp').textContent=s.xp+' XP';$('career-xp-bar').value=s.xp%180;$('career-streak').textContent=s.streak+' day'+(s.streak===1?'':'s');
  const p=current();$('expedition-name').textContent=p?p.name:'A world worth a cast.';$('expedition-meta').textContent=p?`${p.country} / ${p.water.toUpperCase()}`:'25 REAL PLACES / SIX CONTINENTS';$('expedition-link').href=p?.canonicalPath||'/atlas/';$('expedition-link').textContent=p?'Plan this trip for real ↗':'Explore the real atlas ↗';
  const ts=p?C.targets(p):[],objectives=p?s.objectives[p.id]||[]:[];$('expedition-objectives').innerHTML=p?[
   'Catch '+ts[0].name,'Land a trophy · top 30% of its size range','Land a fish after 3 twitches or a clean jump bow'
  ].map((t,i)=>`<li class="${objectives[i]?'done':''}"><span>${objectives[i]?'✓':String(i+1).padStart(2,'0')}</span>${esc(t)}</li>`).join(''):'<li><span>↗</span>Start a career. Choose a place and buy its game licence.</li>';
  const goal=C.nextGoal(s,p);$('game-next-goal').textContent=goal.text;
  $('weekly-water').textContent=C.weekly(today(),places).name;
  if($('expedition-dialog').open)renderPanel();
 }
 function mapMarkup(){
  return `<div class="map-section"><div class="map-caption"><span>THE WORLD IS YOUR WATER</span><span>25 destinations</span></div><div class="career-map" aria-label="Fishing destinations on an Equal Earth world map">${$('career-map-art').innerHTML}<svg class="map-leaders" aria-hidden="true"></svg><div class="map-pins"></div></div><div class="map-footer"><button id="map-reset" ${mapRegion?'':'hidden'}>← Whole world</button><span id="map-context">Select a water to explore</span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener">Natural Earth · Equal Earth</a></div></div>`;
 }
 function layoutMap(){
  const host=document.querySelector('.career-map');if(!host||!host.clientWidth)return;
  const width=host.clientWidth,height=host.clientHeight,mobile=width<420;
  const groups=[...new Set(places.map(p=>p.continent))];
  const region=mapRegion&&places.filter(p=>p.continent===mapRegion);
  let bounds=[0,0,960,500];
  if(region){const xs=region.map(p=>p.mapPoint[0]),ys=region.map(p=>p.mapPoint[1]);bounds=[Math.min(...xs)-90,Math.min(...ys)-70,Math.max(...xs)-Math.min(...xs)+180,Math.max(...ys)-Math.min(...ys)+140];}
  const factor=Math.min(width/bounds[2],height/bounds[3]);
  const vx=bounds[0]-(width/factor-bounds[2])/2,vy=bounds[1]-(height/factor-bounds[3])/2;
  host.querySelector('.world-geography').setAttribute('viewBox',`${vx} ${vy} ${width/factor} ${height/factor}`);
  const cluster=mobile&&!mapRegion;
  const pins=cluster?groups.map(name=>{const members=places.filter(p=>p.continent===name);return {id:name,name:name.replaceAll('-',' '),members,mapPoint:[members.reduce((n,p)=>n+p.mapPoint[0],0)/members.length,members.reduce((n,p)=>n+p.mapPoint[1],0)/members.length]};}):(region||places);
  const positioned=[],diameter=mobile?48:30,gap=diameter+5;
  // Search in screen pixels so target separation survives resizing and zoom.
  for(const p of pins){
   const anchor={x:(p.mapPoint[0]-vx)*factor,y:(p.mapPoint[1]-vy)*factor};
   let point;
   for(let ring=0;ring<100&&!point;ring++){const radius=ring*7,steps=ring?Math.max(12,ring*8):1;for(let j=0;j<steps;j++){const angle=j/steps*Math.PI*2-Math.PI/2,x=anchor.x+Math.cos(angle)*radius,y=anchor.y+Math.sin(angle)*radius;if(x<diameter/2+4||x>width-diameter/2-4||y<diameter/2+4||y>height-diameter/2-4)continue;if(positioned.every(q=>Math.hypot(q.x-x,q.y-y)>=gap)){point={x,y};break;}}}
   if(point)positioned.push({...p,...point,anchor});
  }
  const lines=host.querySelector('.map-leaders');lines.setAttribute('viewBox',`0 0 ${width} ${height}`);
  lines.innerHTML=positioned.map(p=>`<path d="M${p.anchor.x},${p.anchor.y} L${p.x},${p.y}"/><circle cx="${p.anchor.x}" cy="${p.anchor.y}" r="2"/>`).join('');
  host.querySelector('.map-pins').innerHTML=positioned.map(p=>{const locked=!cluster&&p.level>C.level(s),name=cluster?`${p.name} · ${p.members.length} waters`:`${p.name}${locked?' · Requires level '+p.level:''}`;return `<button class="map-pin ${cluster?'map-cluster':''} ${locked?'locked':''} ${p.id===selected?'selected':''}" ${cluster?'data-region':'data-place'}="${esc(p.id)}" style="left:${p.x}px;top:${p.y}px;--pin-size:${diameter}px" aria-label="${esc(name)}" ${!cluster?'aria-pressed="'+(p.id===selected)+'"':''}><span>${cluster?p.members.length:locked?'L'+p.level:String(places.findIndex(place=>place.id===p.id)+1).padStart(2,'0')}</span><span class="pin-tooltip ${p.x>width*.6?'tooltip-left':p.x<width*.4?'tooltip-right':''}">${esc(name)}</span></button>`;}).join('');
  host.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{mapRegion=b.dataset.region;layoutMap();host.querySelector('.map-pin')?.focus({preventScroll:true});});
  host.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{selected=b.dataset.place;if(mobile)mapRegion=places.find(p=>p.id===selected).continent;renderPanel();document.querySelector(`[data-place="${selected}"]`)?.focus({preventScroll:true});});
  $('map-reset').hidden=!mapRegion;$('map-reset').onclick=()=>{mapRegion=null;layoutMap();};
  $('map-context').textContent=mapRegion?mapRegion.replaceAll('-',' '):mobile?'Tap a region to explore':'Choose your next expedition';
 }
 function placeMarkup(){const p=places.find(p=>p.id===selected),locked=p.level>C.level(s),owned=s.permits.includes(p.licence),ts=C.targets(p);return `<div class="place-detail"><span class="eyebrow">${esc(p.country)} / LEVEL ${p.level}</span><h3>${esc(p.name)}</h3><p class="place-target">${ts.map(f=>esc(f.name)).join(' · ')}</p><p class="season-note">${esc(p.season)}</p><div class="permit-card"><span class="eyebrow">${owned?'LICENCE IN YOUR PACK':'YOUR GAME LICENCE'} / ${esc(p.permit.name)}</span><p>${esc(p.permit.summary)}</p><small>${esc(p.permit.price)}<br>Source checked ${esc(p.permit.checked)}. This is a game purchase.</small><a href="${p.permit.path}">Read the real licence guide ↗</a></div><button class="expedition-primary" id="career-travel" ${locked||(!owned&&s.coins<p.permit.coins)?'disabled':''}>${locked?'Unlock at level '+p.level:owned?'Travel here ↗':'Buy licence & travel · '+p.permit.coins+' coins'}</button><a href="${p.canonicalPath}">Plan this trip for real ↗</a></div>`;}
 function renderPanel(){
  $('expedition-panel').dataset.tab=tab;$('expedition-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.panel===tab)));
  let html='';if(tab==='map')html=mapMarkup()+`<label class="place-picker">Choose a destination<select id="career-destination">${places.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · level ${p.level}</option>`).join('')}</select></label>`+placeMarkup();
  if(tab==='shop')html=`<p class="panel-intro">Pack for the water. Equip one item per category. All prices use game coins.</p><div class="shop-grid">${C.gear.map(g=>`<article><span class="gear-symbol" aria-hidden="true">${{lure:'⌁',rod:'↗',line:'∞',reel:'◎',waders:'♧',boat:'◡'}[g.slot]}</span><span class="eyebrow">${g.slot}</span><h3>${g.name}</h3><p>${g.effect}</p><button data-buy="${g.id}" ${s.equipped[g.slot]===g.id||(!s.owned.includes(g.id)&&s.coins<g.cost)?'disabled':''}>${s.equipped[g.slot]===g.id?'Equipped':s.owned.includes(g.id)?'Equip':g.cost+' coins · Buy'}</button><a href="/guides/${g.guide}/">See the real gear ↗</a></article>`).join('')}</div>`;
  if(tab==='trophies')html=`<p class="panel-intro">The best of every species. Select a mount to see it in 3D on the water.</p><div class="trophy-grid">${Object.values(s.records).map(r=>`<button data-mount="${r.id}"><span aria-hidden="true">◇</span><strong>${esc(r.species)}</strong><small>${r.length} cm / ${r.weight.toFixed(2)} kg</small><em>View 3D mount ↗</em></button>`).join('')||'<p>Your first catch earns the first mount. All fish swim away.</p>'}</div><h3>Field honours</h3><div class="achievement-list">${Object.entries({first:'First light · land a fish',traveller:'Across borders · 3 licences',collector:'Field collector · 5 species',trophy:'A fine specimen · a trophy fish',master:'Water master · 3 complete places'}).map(([k,v])=>`<p class="${s.achievements.includes(k)?'earned':''}">${s.achievements.includes(k)?'✦':'◇'} ${v}</p>`).join('')}</div>`;
  if(tab==='save')html=`<p class="panel-intro">Keep your career and Fish Log in one file. Import replaces this device’s progress after validation.</p><button id="career-export" class="expedition-primary">Export save ↓</button><label class="save-import">Import a save<input id="career-import" type="file" accept="application/json,.json"></label><p id="import-status" role="status"></p><p class="game-small">Version 2 · no account required · no real money</p>`;
  mapObserver?.disconnect();$('expedition-panel').innerHTML=html;
  if(tab==='map'){mapObserver=new ResizeObserver(layoutMap);mapObserver.observe(document.querySelector('.career-map'));layoutMap();}
  if($('career-destination'))$('career-destination').onchange=e=>{selected=e.target.value;if(matchMedia('(max-width:700px)').matches)mapRegion=places.find(p=>p.id===selected).continent;renderPanel();$('career-destination').focus({preventScroll:true});};
  if($('career-travel'))$('career-travel').onclick=()=>{const p=places.find(p=>p.id===selected);if(!api?.idle()||!C.travel(s,p))return;save();api.travel(p,C.targets(p),C.effects(s));render();$('expedition-dialog').close();$('fishing-canvas').focus({preventScroll:true});};
  $('expedition-panel').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(C.buy(s,b.dataset.buy)){api.equip(C.effects(s),s.equipped.lure);save();render();}});
  $('expedition-panel').querySelectorAll('[data-mount]').forEach(b=>b.onclick=()=>{api.mount(G.species.find(f=>f.id===b.dataset.mount));$('expedition-dialog').close();$('mount-exit').hidden=false;$('fishing-canvas').scrollIntoView({block:'center',behavior:'instant'});});
  if($('career-export'))$('career-export').onclick=()=>{const file={format:'castward-save',version:2,career:s,fishLog:api.log()};download(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}),'castward-career.json');};
  if($('career-import'))$('career-import').onchange=async e=>{try{const file=e.target.files[0];if(!file||file.size>1000000)throw Error('Choose a save file smaller than 1 MB.');const raw=JSON.parse(await file.text());if(raw.format!=='castward-save'||raw.version!==2||!raw.career||typeof raw.career!=='object'||Array.isArray(raw.career)||raw.career.version!==2||!Number.isSafeInteger(raw.career.xp)||!Number.isSafeInteger(raw.career.coins))throw Error('This is not a Castward version 2 save.');s=C.restore(raw.career,places);api.restoreLog(G.restore(raw.fishLog));save();const p=current();if(p)api.travel(p,C.targets(p),C.effects(s));else api.free();api.equip(C.effects(s),s.equipped.lure);applySettings();render();$('import-status').textContent='Save imported.';}catch(error){$('import-status').textContent=error.message;}};
 }
 function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function open(panel){if(!api||!api.idle())return;tab=panel;api.pause(true);renderPanel();$('expedition-dialog').showModal();if(tab==='map')layoutMap();}
 function applySettings(){$('game-quality').value=s.settings.quality;$('game-reduced').checked=s.settings.motion;api?.settings(s.settings);}
 $('expedition-open').onclick=()=>open('map');$('shop-open').onclick=()=>open('shop');$('trophy-open').onclick=()=>open('trophies');$('save-open').onclick=()=>open('save');$('expedition-close').onclick=()=>$('expedition-dialog').close();$('expedition-dialog').addEventListener('close',()=>api?.pause(false));$('expedition-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.panel;renderPanel();});
 $('game-quality').onchange=e=>{s.settings.quality=e.target.value;save();applySettings();};$('game-reduced').onchange=e=>{s.settings.motion=e.target.checked;save();applySettings();};$('mount-exit').onclick=()=>{api.mount(null);$('mount-exit').hidden=true;};
 $('tutorial-skip').onclick=()=>{s.tutorial=true;save();$('game-tutorial').hidden=true;};$('tutorial-replay').onclick=()=>{s.tutorial=false;tutorialTime=0;$('game-tutorial').hidden=false;};
 window.CastwardExpedition={
  attach(bridge){api=bridge;const p=current();if(p)api.travel(p,C.targets(p),C.effects(s));api.equip(C.effects(s),s.equipped.lure);applySettings();$('game-tutorial').hidden=s.tutorial;render();save();},
  selectLure(id){if(id!=='spoon'&&!s.owned.includes(id)){const lure=G.lures.find(l=>l.id===id);if(!lure||api.log().total<lure.need)return;s.owned.push(id);}if(id==='spoon')delete s.equipped.lure;else s.equipped.lure=id;api.equip(C.effects(s),id);save();render();},
  firstCast(){const first=C.firstCast(s);save();return first;},
  nextGoal:()=>C.nextGoal(s,current()),
  current, effects:()=>C.effects(s),settings:()=>s.settings,
  free(){s.place=null;save();render();},
  weekly:()=>C.weekly(today(),places),
  caught(entry,technique,challenge){const reward=C.land(s,current(),entry,technique,today(),challenge);save();render();$('career-reward').textContent=`+${reward.xp} XP · +${reward.coins} coins${reward.trophy?' · TROPHY':''}`;return reward;},
  tick(dt,state){if(s.tutorial)return;tutorialTime+=dt;const texts={ready:'01 / Pull down and release to cast. Or press Space twice.',aim:'01 / Flick up and release. The arc shows your cast.',wait:'02 / Tap to twitch. Drag slowly to guide the lure.',bite:'03 / Swipe up now to set the hook. Or press Space.',reel:'04 / Hold the reel. Slide against the run. Ease off at high tension.',net:'05 / Tap the ring around the fish. Or press N.',caught:'Your first fish. Now choose a real place on the world map.'};const text=texts[state]||'Try one more cast.';if($('tutorial-text').textContent!==text)$('tutorial-text').textContent=text;const progress=Math.min(15,Math.floor(tutorialTime*4)/4);if($('tutorial-progress').value!==progress)$('tutorial-progress').value=progress;if(state==='caught'){s.tutorial=true;save();setTimeout(()=>$('game-tutorial').hidden=true,2500);}if(tutorialTime>=15&&$('tutorial-skip').textContent!=='Got it ×')$('tutorial-skip').textContent='Got it ×';},
  state:()=>structuredClone(s)
 };
 render();
})();
