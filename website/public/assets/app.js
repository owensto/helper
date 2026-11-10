/* Fishing Atlas v0.1 — progressive enhancement, local plans, share snapshots and distribution hooks. */
(function(){
  'use strict';
  const D=window.ATLAS_DATA,C=window.ATLAS_CONFIG||{},E=window.AtlasEngine;
  if(!D||!E)return;
  const PREVIEW=window.ATLAS_PREVIEW===true;
  const K={plan:'fishing-atlas.plan.v1',events:'fishing-atlas.events.v1',attribution:'fishing-atlas.attribution.v1'};
  const labels={river:'River / wade',boat:'Boat / offshore',flats:'Flats / skiff',float:'River float',...(D.styleLabels||{})};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}};
  const set=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  let plan=E.normalize(get(K.plan,{}),D),activeFilter='all',toastTimer;
  function current(){return PREVIEW?new URL(location.hash.startsWith('#/')?location.hash.slice(1):'/', 'https://atlas.preview'):new URL(location.href);}
  function track(name,props={}){
    const event={event:name,properties:props};
    window.dispatchEvent(new CustomEvent('atlas:event',{detail:event}));
  }
  function captureAttribution(){}
  function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
  function save(){const saved=set(K.plan,plan);if(!saved){toast('Browser storage is unavailable. Export your plan to keep a copy.');return false;}try{if(document.body.dataset.page==='planner')history.replaceState(null,'',PREVIEW?'#/plan/':'/plan/');}catch{}track('plan_saved');return true;}
  function navigate(path){if(PREVIEW){if(location.hash==='#'+path){renderPreview();}else{location.hash=path;}}else{location.assign(path);}}
  function renderPreview(){
    const r=current(),path=r.pathname.endsWith('/')?r.pathname:r.pathname+'/';
    const p=window.ATLAS_PREVIEW_PAGES[path]||window.ATLAS_PREVIEW_PAGES['/404/'];
    if(p.redirectTo){navigate(p.redirectTo+r.search);return;}
    document.getElementById('main').innerHTML=p.body;document.body.dataset.page=p.kind;document.title=p.title;
    document.getElementById('site-nav').classList.remove('open');document.querySelector('[data-action="menu"]').setAttribute('aria-expanded','false');
    initialize();window.scrollTo(0,0);
  }
  function encodeSnapshot(p){const bytes=new TextEncoder().encode(JSON.stringify(p));return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decodeSnapshot(s){if(typeof s!=='string'||s.length>16000||!/^[A-Za-z0-9_-]+$/.test(s))throw new Error('Invalid snapshot');const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));}
  function hydratePlan(){
    const u=current();let shared=u.searchParams.get('snapshot');if(!PREVIEW&&u.hash.startsWith('#p='))shared=u.hash.slice(3);
    if(shared){try{plan=E.normalize(decodeSnapshot(shared),D);track('shared_plan_opened',{destination:plan.destination});}catch{plan=E.normalize(get(K.plan,{}),D);toast('That shared plan is invalid. Your saved plan is unchanged.');}}
    else{
      const input={...E.normalize(get(K.plan,{}),D)};
      for(const key of ['destination','tripType','style','date','days','party'])if(u.searchParams.has(key))input[key]=u.searchParams.get(key);
      if(u.searchParams.has('destination')&&!u.searchParams.has('tripType'))input.tripType='';
      plan=E.normalize(input,D);
    }
    syncForm();drawPlan();
  }
  function fillTripTypes(destination,selected){const sel=document.getElementById('plan-trip-type');if(!sel)return;const types=(D.tripTypes||[]).filter(t=>t.profileIds.includes(destination));sel.innerHTML='<option value="">General destination plan</option>'+types.map(t=>`<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('');sel.value=types.some(t=>t.slug===selected)?selected:'';}
  function fillStyles(destination,selected,tripType=''){const sel=document.getElementById('plan-style');if(!sel)return;const d=D.destinations.find(x=>x.id===destination)||D.destinations[0];const kind=(D.tripTypes||[]).find(t=>t.slug===tripType&&t.profileIds.includes(destination));const styles=kind?[kind.plannerStyle]:d.styles;sel.innerHTML=styles.map(s=>`<option value="${s}">${labels[s]}</option>`).join('');sel.value=styles.includes(selected)?selected:styles[0];}
  function syncForm(){
    const f=document.querySelector('[data-form="planner"]');if(!f)return;
    f.elements.destination.value=plan.destination;fillTripTypes(plan.destination,plan.tripType);fillStyles(plan.destination,plan.style,plan.tripType);f.elements.date.value=plan.date;f.elements.days.value=plan.days;f.elements.party.value=plan.party;f.elements.laundry.value=String(plan.laundry);
  }
  function dateLabel(){if(!plan.date)return'Dates to confirm';return new Date(plan.date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});}
  function selectedType(){return (D.tripTypes||[]).find(t=>t.slug===plan.tripType);}
  function inquiry(){const d=D.destinations.find(x=>x.id===plan.destination);return `Hello,\n\n${selectedType()?'Our local trip type is '+selectedType().name+'.\n\n':''}We’re planning a ${plan.days}-day visit to ${d.name}${plan.date?' starting '+dateLabel():', with dates still to confirm'}, with ${plan.party} angler${plan.party===1?'':'s'}. We’re interested in ${labels[plan.style].toLowerCase()} fishing. Our visit duration is not a request for ${plan.days} guided days.\n\nCould you help confirm:\n${selectedType()?selectedType().guideChecklist.map(q=>'• '+q).join('\n')+'\n':''}• Which trip lengths, targets and dates are suitable?\n• What is the full price, payment schedule and equipment included?\n• Are suitable rods, tackle, footwear or waders provided or available to rent?\n• Where and when do we meet, and what personal items should we bring?\n• What happens if the conditions change?\n\nWe’ll finalize our shopping list after confirming what’s supplied. Thank you.`;}
  function planText(){const d=D.destinations.find(x=>x.id===plan.destination);const items=E.requirements({...plan,essentialOnly:false},D);return `FISHING ATLAS — MY TRIP\n${d.name} | ${dateLabel()} | ${plan.days} days | ${plan.party} anglers\nStyle: ${labels[plan.style]}\n${selectedType()?'Local trip type: '+selectedType().name+'\n':''}Quantities below are PER ANGLER, not group totals.\n\n`+items.map(g=>`${g.packed?'[x]':'[ ]'} ${g.name} × ${g.quantity} — ${g.status==='owned'?'I own it':g.status==='provided'?'Guide provision confirmed':'Need / not confirmed'}\n    ${g.why}`).join('\n\n')+`\n\nOPERATOR INQUIRY (not sent)\n${inquiry()}\n\nPreparation suggestions only. Confirm technical setup, suitability and actual trip details locally. No retailer links are included in this offline export.\n` ;}
  function drawPlan(){
    const output=document.getElementById('plan-output');if(!output)return;
    const d=D.destinations.find(x=>x.id===plan.destination),items=E.requirements(plan,D),stats=E.summarize(items);
    const groups=[...new Set(items.map(g=>g.group))];
    const month=plan.date?Number(plan.date.slice(5,7)):0;
    const documented=(d.seasonWindows||[]).some(w=>w.months.includes(month));
    const kind=selectedType();
    const typeNote=kind?`<div class="note type-preset-note"><b>${esc(kind.name)} · local trip preset</b><p>${esc(kind.season)}</p><a href="/trip-types/${esc(kind.slug)}/">Read the trip-type guide ↗</a></div>`:'';
    const profileNote=d.tripProfile&&!kind?`<div class="note trip-profile-note"><b>Trip-specific preparation, not a catch forecast.</b> ${esc(d.seasonNote)} ${month&&!documented?'A documented seasonal match for your selected month is not established here. ':''}Clothing weights still need a current forecast. <a class="link" href="${esc(d.guideUrl)}">Read the trip research ↗</a></div>`:'';
    const needsExtra=plan.destination==='yakutat'&&plan.date&&[1,2,3,11,12].includes(Number(plan.date.slice(5,7)));
    output.innerHTML=`<div class="plan-banner"><span class="eyebrow">YOUR PERSONAL FIELD NOTES</span><h2>${esc(d.name)}. Your way.</h2><p>${esc(dateLabel())} · ${plan.days} days · ${plan.party} anglers · ${esc(labels[plan.style])}</p><div class="plan-toolbar"><button class="btn lime" type="button" data-action="share">Share this plan ↗</button><button class="btn white" type="button" data-action="print">Print checklist</button><button class="btn white" type="button" data-action="export-plan">Export text ↓</button></div></div>${typeNote}${profileNote}${needsExtra?'<div class="note">The starter sources do not establish a suitable fishery for your selected month. Confirm the target and dates locally; this checklist is preparation guidance, not a catch forecast.</div>':''}<div class="plan-stats"><div class="stat"><b>${stats.covered}</b><span>owned / confirmed provided</span></div><div class="stat"><b>${stats.toShop}</b><span>shopping requirements</span></div><div class="stat"><b>${stats.toConfirm}</b><span>local checks still needed</span></div></div><div class="check-controls"><label><input type="checkbox" id="essentials-only" ${plan.essentialOnly?'checked':''}> Essentials only</label><span>${stats.packed} / ${stats.total} items packed · quantities per angler</span></div><div id="gear-list">${groups.map(group=>`<section class="gear-group"><h3>${esc(group)}</h3>${items.filter(g=>g.group===group).map(gearRow).join('')}</section>`).join('')}</div><div class="note">“I own it” records inventory, not guaranteed suitability. “Guide provides” means you have confirmed it. Review size, fit, technical compatibility and safety equipment before departure.</div>`;
    document.getElementById('inquiry-text').textContent=inquiry();
    document.getElementById('plan-operator').innerHTML=`<div class="operator-card"><div><span class="eyebrow">INDEPENDENT RESOURCE</span><h3>${esc(d.operator.name)}</h3><p>${esc(d.operator.note)}</p></div><a class="btn outline small" href="${esc(d.operator.url)}" target="_blank" rel="noopener noreferrer" data-outbound="operator" data-item="${esc(d.id)}">Visit website ↗</a></div>`;
  }
  function gearRow(g){
    const url=E.shoppingUrl(g,C.amazonTag);const showShop=url&&g.status==='need'&&!g.packed;
    return `<div class="gear-item ${g.packed?'done':''}"><input type="checkbox" aria-label="Packed: ${esc(g.name)}" data-packed="${esc(g.id)}" ${g.packed?'checked':''}><div><div class="gear-name">${esc(g.name)} <span class="qty">× ${g.quantity}</span></div><p class="gear-why">${esc(g.why)}</p>${g.confirm&&g.status!=='provided'?'<span class="confirm-tag">Confirm suitability locally</span>':''}</div><div><label class="sr-only" for="gear-status-${g.id}">Status for ${esc(g.name)}</label><select id="gear-status-${g.id}" data-gear-status="${g.id}"><option value="need" ${g.status==='need'?'selected':''}>Need / confirm</option><option value="owned" ${g.status==='owned'?'selected':''}>I own it</option><option value="provided" ${g.status==='provided'?'selected':''}>Guide provides</option></select>${showShop?`<a class="shop-link" href="${esc(url)}" target="_blank" rel="${C.amazonTag?'sponsored ':''}noopener noreferrer" data-outbound="shopping" data-item="${g.id}">Search Amazon ↗</a>`:''}</div></div>`;
  }
  function download(name,text,type='text/plain'){const blob=new Blob([text],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  async function copy(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.left='-10000px';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Clipboard unavailable');}toast('Copied to clipboard.');return true;}catch{toast('Clipboard access is unavailable. Use the text export instead.');return false;}}
  async function share(){
    const snapshot=encodeSnapshot(plan);const origin=C.siteUrl||location.origin;
    const url=PREVIEW?location.href.split('#')[0]+'#/plan/?snapshot='+snapshot:origin+'/plan/#p='+snapshot;
    if(PREVIEW){await copy(url);toast('Preview link copied. It works only for someone who has this same HTML file. Use Export text to share now.');}
    else if(navigator.share){try{await navigator.share({title:'My Fishing Atlas trip plan',text:'Here’s our fishing checklist. This is a snapshot, not a live shared document.',url});track('plan_shared',{destination:plan.destination,method:'native'});}catch(e){if(e.name!=='AbortError'){if(await copy(url))track('plan_shared',{destination:plan.destination,method:'clipboard'});}}}
    else if(await copy(url))track('plan_shared',{destination:plan.destination,method:'clipboard'});
  }
  function filterDestinations(){const query=(document.getElementById('destination-search')?.value||'').toLowerCase().trim();let shown=0;document.querySelectorAll('[data-destination-card]').forEach(el=>{const matches=(activeFilter==='all'||el.dataset.styles.split(' ').includes(activeFilter))&&el.dataset.search.includes(query);el.hidden=!matches;if(matches)shown++;});const empty=document.getElementById('destination-empty');if(empty)empty.hidden=shown>0;}

  let libraryLimit=24;
  function initWorldLibrary(){
    const grid=document.getElementById('trip-grid');if(!grid)return;
    const params=current().searchParams;
    const search=document.getElementById('trip-search');if(search)search.value=params.get('q')||'';
    document.querySelectorAll('[data-library-select]').forEach(el=>{const v=params.get(el.dataset.librarySelect)||'';el.value=[...el.options].some(o=>o.value===v)?v:'';});
    filterWorldLibrary();
  }
  function filterWorldLibrary(keepLimit=false){
    if(!keepLimit)libraryLimit=24;
    if(!document.getElementById('trip-grid'))return;
    const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q=norm(document.getElementById('trip-search')?.value).trim();
    const active=[...document.querySelectorAll('[data-library-select]')].filter(e=>e.value).map(e=>[e.dataset.librarySelect,e.value]);
    let shown=0,total=0;
    document.querySelectorAll('#trip-grid [data-trip-card]').forEach(card=>{
      total++;const text=norm(card.dataset.search);
      const visible=q.split(/\s+/).filter(Boolean).every(term=>text.includes(term))&&active.every(([key,v])=>key==='month'?card.dataset.month.split(',').includes(v):['habitat','method','type'].includes(key)?card.dataset[key].split('|').includes(v):card.dataset[key]===v);
      if(visible)shown++;card.hidden=!visible||shown>libraryLimit;
    });
    document.getElementById('trip-count').textContent=`${shown} of ${total} trip profiles`;
    document.getElementById('trip-empty').hidden=shown>0;
    const more=document.getElementById('load-more-trips');if(more)more.hidden=shown<=libraryLimit;
    const pageStatus=document.getElementById('trip-page-status');if(pageStatus)pageStatus.textContent=`Showing ${Math.min(shown,libraryLimit)} of ${shown} matches`;
    document.getElementById('season-filter-note').hidden=!active.some(([k])=>k==='month');
  }

  function configureForms(){
    const enabled=!PREVIEW&&C.formsEnabled===true&&/^https?:$/.test(location.protocol)&&!['localhost','127.0.0.1'].includes(location.hostname);
    document.querySelectorAll('[data-forms-status]').forEach(n=>{n.textContent=enabled?'Pilot interest form: your submission goes to the site owner.':'Preview: form collection is not connected. Nothing will be sent.';});
    document.querySelectorAll('input[name="attribution"]').forEach(i=>i.value=JSON.stringify(get(K.attribution,{})));
  }
  function initialize(){captureAttribution();initWorldLibrary();activeFilter='all';if(document.body.dataset.page==='planner')hydratePlan();configureForms();const dom=document.getElementById('campaign-domain');if(dom&&C.siteUrl)dom.value=C.siteUrl;else if(dom&&!PREVIEW&&location.protocol.startsWith('http'))dom.value=location.origin;track('page_view',{page:document.body.dataset.page});}
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement)||!form.dataset.form)return;event.preventDefault();
    if(!form.reportValidity())return;const fd=new FormData(form),type=form.dataset.form;
    if(type==='world-search'){
      const q=String(fd.get('q')||'').trim();track('atlas_search',{query:q});navigate('/trips/'+(q?'?q='+encodeURIComponent(q):''));
    }else if(type==='quick-plan'){
      const p=new URLSearchParams();for(const k of ['destination','date','days'])if(fd.get(k))p.set(k,fd.get(k));track('planner_started',{destination:fd.get('destination'),entry:'homepage'});navigate('/plan/?'+p.toString());
    }else if(type==='planner'){
      plan=E.normalize({...plan,...Object.fromEntries(fd),laundry:fd.get('laundry')==='true'},D);const saved=save();syncForm();drawPlan();track('plan_updated',{destination:plan.destination,days:plan.days,style:plan.style});toast(saved?'Plan updated and saved on this browser.':'Plan updated on this page. Export it to keep a copy.');
    }else if(type==='campaign'){
      let base;try{base=new URL(fd.get('domain'));if(!['https:','http:'].includes(base.protocol)||base.username||base.password)throw new Error('Invalid origin');}catch{toast('Enter a valid HTTP or HTTPS site origin.');return;}
      const url=new URL('/plan/',base.origin);url.searchParams.set('destination',fd.get('destination'));url.searchParams.set('utm_source',fd.get('source'));url.searchParams.set('utm_medium',fd.get('medium'));url.searchParams.set('utm_campaign',fd.get('campaign'));
      const out=document.getElementById('campaign-output');out.textContent=url.href;out.hidden=false;document.querySelector('[data-action="copy-campaign"]').hidden=false;track('campaign_link_created',{destination:fd.get('destination'),medium:fd.get('medium')});
    }else if(type==='lead'){
      const status=form.querySelector('.result-message');
      if(PREVIEW||C.formsEnabled!==true||!/^https?:$/.test(location.protocol)||['localhost','127.0.0.1'].includes(location.hostname)){status.textContent='Not sent. This preview has no connected form collection. You can still create and export a client checklist.';track('lead_preview_blocked',{form:form.name});return;}
      if(fd.get('company-fax')){status.textContent='Unable to process this submission.';return;}
      const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Submitting…';
      try{const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams([...fd.entries()].map(([k,v])=>[k,String(v)])).toString()});if(!response.ok)throw new Error('Submission failed');track('lead_submitted',{form:form.name});status.textContent='Interest submitted. No booking has been created.';form.reset();configureForms();}
      catch{status.textContent='Your submission did not complete. Please try again later; no booking was created.';track('lead_error',{form:form.name});}finally{button.disabled=false;}
    }
  });
  document.addEventListener('click',event=>{
    const a=event.target.closest('a');
    if(a?.dataset.outbound)track(a.dataset.outbound==='shopping'?'shopping_clicked':'operator_clicked',{item:a.dataset.item||'',destination:plan.destination});
    if(a&&PREVIEW&&a.hasAttribute('download')){event.preventDefault();const path=a.getAttribute('href');const text=window.ATLAS_EXPORTS?.[path];if(typeof text==='string'){const blob=new Blob([text],{type:path.endsWith('.csv')?'text/csv;charset=utf-8':'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=path.split('/').pop();link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else toast('This file is available in the website source package.');return;}
    if(a&&PREVIEW&&a.getAttribute('href')?.startsWith('#')&&!a.getAttribute('href').startsWith('#/')){const target=document.getElementById(a.getAttribute('href').slice(1));if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth'});return;}}
    if(a&&PREVIEW&&a.getAttribute('href')?.startsWith('/')&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();navigate(a.getAttribute('href'));return;}
    const chip=event.target.closest('[data-filter]');if(chip){activeFilter=chip.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===chip);b.setAttribute('aria-pressed',String(b===chip));});filterDestinations();return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action;
    if(action==='more-trips'){libraryLimit+=24;filterWorldLibrary(true);}
    if(action==='clear-library'){const search=document.getElementById('trip-search');if(search)search.value='';document.querySelectorAll('[data-library-select]').forEach(e=>e.value='');filterWorldLibrary();}
    else if(action==='menu'){const open=document.getElementById('site-nav').classList.toggle('open');button.setAttribute('aria-expanded',String(open));}
    else if(action==='share')share();
    else if(action==='print'){track('plan_printed',{destination:plan.destination});window.print();}
    else if(action==='export-plan'){download('fishing-atlas-'+plan.destination+'-checklist.txt',planText());track('plan_exported',{destination:plan.destination});}
    else if(action==='copy-inquiry'){copy(inquiry()).then(ok=>{if(ok)track('inquiry_copied',{destination:plan.destination});});}
    else if(action==='copy-campaign')copy(document.getElementById('campaign-output').textContent);
    else if(action==='copy-outreach')copy(document.getElementById('outreach-copy').textContent);
    else if(action==='export-events'){download('fishing-atlas-browser-events.json',JSON.stringify(get(K.events,[]),null,2),'application/json');}
    else if(action==='reset'){if(window.confirm('Start a new plan? Export your current checklist first to keep it.')){plan=E.normalize({},D);save();navigate('/plan/');}}
  });
  document.addEventListener('change',event=>{
    const t=event.target;
    if(t.dataset.librarySelect)filterWorldLibrary();
    if(t.id==='plan-destination'){fillTripTypes(t.value,'');fillStyles(t.value,'');}
    if(t.id==='plan-trip-type')fillStyles(document.getElementById('plan-destination').value,'',t.value);
    if(t.dataset.gearStatus){plan.statuses[t.dataset.gearStatus]=t.value;save();drawPlan();track('gear_status_changed',{item:t.dataset.gearStatus,status:t.value});}
    if(t.dataset.packed){plan.packed[t.dataset.packed]=t.checked;save();drawPlan();track('gear_packed',{item:t.dataset.packed,packed:t.checked});}
    if(t.id==='essentials-only'){plan.essentialOnly=t.checked;save();drawPlan();track('checklist_filter_changed',{essentialOnly:t.checked});}
  });
  document.addEventListener('input',event=>{if(event.target.id==='destination-search')filterDestinations();if(event.target.id==='trip-search')filterWorldLibrary();});
  if(PREVIEW){window.addEventListener('hashchange',renderPreview);renderPreview();}else{initialize();}
})();
