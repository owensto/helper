/* Additive Easy Helm review module for exact public Beaufort13.
 * Preserves native ignition/gears/steering/physics/water/captain and provider player.
 * Installs explicitly; does not pretend to be a shared-world or multiplayer adapter.
 */
(function (root) {
  'use strict';
  root.installAtlasEasyHelm = function (host) {
    const P = root.AtlasEasyPolicy, D = host?.document || root.document;
    if (!P || !D || typeof host?.isLocal !== 'function' || host.isLocal() !== true)
      throw Error('Easy Helm requires its local-only, explicit host adapter.');
    if (root.ATLAS_EASY_HELM) throw Error('Easy Helm already installed.');
    const $ = id => D.getElementById(id), app = $('helm09');
    if (!app || !host.panelOwner || typeof host.panelOwner.renderPanel !== 'function') throw Error('Compatible helm is not ready.');
    const top=app.querySelector('.h09-top'); if(!top)throw Error('Compatible header not found.');
    for(const name of ['mobile','options','depth','setInterval','clearInterval'])if(typeof host[name]!=='function')throw Error('Missing host method: '+name);
    const nativeIds = ['helm09-key','helm09-pause','helm09-throttle','s11-left','s11-right','s11-center','helm09-map','helm09-radio','helm09-boat','helm09-settings'];
    const native = nativeIds.map(id => { const node = $(id); if (!node) throw Error('Missing native control: ' + id); return [id,node,node.onclick,node.onpointerdown]; });
    const abort = new AbortController(), signal = abort.signal, actions = P.createActions(host);
    const owned = [], enhancements = new Map(), prefKey='atlas-easy-helm-v1', favKey='atlas-country-links-v1';
    let disposed=false, pref=P.preferences(read(prefKey),host.mobile()), saved=P.favorites(read(favKey)), lastDepth='', lastHint='';
    function read(key) { try { return host.storage?.getItem(key); } catch (_) { return null; } }
    function write(key,value) { try { host.storage?.setItem(key,JSON.stringify(value)); return true; } catch (_) { return false; } }
    function el(tag,text,cls) { const n=D.createElement(tag); if (text) n.textContent=text; if(cls) n.className=cls; return n; }
    function on(node,type,fn) { node.addEventListener(type,fn,{signal}); return node; }
    function button(text,fn,id) { const n=el('button',text); n.type='button'; if(id)n.id=id; return on(n,'click',()=>{try { if(!localReady())throw Error('This add-on is for the local boat only.');fn(); } catch(e) { announce(e.message); }}); }
    function announce(text) { notice.textContent=text; }
    function own(node,parent) { owned.push(node);parent.append(node);return node; }
    const notice=el('div','','eh-announcement'); notice.id='eh-announcement'; notice.setAttribute('role','status'); notice.setAttribute('aria-live','polite'); own(notice,app);
    const switcher=button('',()=>setPrefs({easy:!pref.easy}),'eh-toggle');switcher.setAttribute('aria-label','Toggle Easy Helm layout');own(switcher,top);
    const help=button('Help',()=>actions.pauseHelp(),'eh-help');help.setAttribute('aria-label','Pause boat and show driving help');own(help,top);
    const status=el('section','','eh-bottom-status');status.id='eh-bottom-status';status.setAttribute('aria-label','Bottom clearance');
    const head=el('strong'),sub=el('span');status.append(head,sub);own(status,app);
    const hint=el('div','','eh-next-step');hint.id='eh-next-step';own(hint,app);
    function setPrefs(change) { pref=P.preferences({...pref,...change},host.mobile());write(prefKey,pref);apply();measure(); }
    function apply() { app.classList.toggle('eh-easy',pref.easy);app.classList.toggle('eh-large',pref.largeText);switcher.textContent=pref.easy?'Easy Helm':'Full controls';switcher.setAttribute('aria-pressed',String(pref.easy)); }
    function choice(label,key) {
      const row=el('label','','eh-choice'),span=el('span',label),box=el('input');box.type='checkbox';box.checked=!!host.options()[key];
      on(box,'change',()=>{try{actions.option(key,box.checked);}catch(e){box.checked=!!host.options()[key];announce(e.message);}});
      row.append(span,box);return row;
    }
    function enhanceSettings(body) {
      if(body.querySelector('[data-eh-settings]'))return;
      const advanced=el('details','','eh-advanced'),summary=el('summary','Advanced boat settings');advanced.append(summary);
      while(body.firstChild)advanced.append(body.firstChild);
      const section=el('section','','eh-settings');section.dataset.ehSettings='true';section.append(el('h3','A simpler day on the water'));
      const layout=el('label','','eh-choice'),check=el('input');check.type='checkbox';check.checked=pref.easy;on(check,'change',()=>setPrefs({easy:check.checked}));layout.append(el('span','Easy Helm · fewer controls'),check);section.append(layout);
      const large=el('label','','eh-choice'),largeCheck=el('input');largeCheck.type='checkbox';largeCheck.checked=pref.largeText;on(largeCheck,'change',()=>setPrefs({largeText:largeCheck.checked}));large.append(el('span','Larger reading text'),largeCheck);section.append(large);
      section.append(choice('Show labels on interactive fittings','hotspots'),choice('Steadier camera · boat physics unchanged','steadyCamera'),choice('Docking assist · limits power, not a brake','docking'),choice('Highlight known shallows','shallowAssist'),choice('Speak shallow-water warnings','spokenAlerts'));
      const views=el('div','','eh-grid');views.append(button('Driver view',()=>actions.view('helm')),button('Behind boat',()=>actions.view('follow')),button('Look around',()=>actions.view('orbit')),button('Explore fittings',()=>host.panel('boat')),button('Take a boat tour',()=>{host.panel('boat');const tour=$('s11-tour');if(tour)tour.click();else throw Error('Guided tour is unavailable in this host.');}),button('Pause & show me how',()=>actions.pauseHelp()),button('Idle & coast',()=>{actions.coast();announce('Power is at idle. The boat still has momentum.');}));
      section.append(views,el('p','Easy Helm changes the layout only. Assistance switches are separate; graphics, waves and collision options are preserved.','eh-note'));
      body.append(section,advanced);enhancements.set(body,{section,advanced});
    }
    function enhanceRadio(body) {
      if(body.querySelector('[data-eh-music]') || !$('helm09-mediaurl') || !$('helm09-addmedia'))return;
      const section=el('section','','eh-music');section.dataset.ehMusic='true';section.append(el('h3','Country on the water'));
      section.append(el('p','Your own music files use the boat speakers. YouTube uses its visible player. Spotify opens in its own app.','eh-note'));
      const shortcuts=el('div','','eh-grid');
      function link(text,url) { const a=el('a',text,'eh-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a; }
      shortcuts.append(link('Zach Bryan · choose a service','https://zachbryan.lnk.to/SomethingInTheOrangeZE'),link('Find country on YouTube','https://www.youtube.com/results?search_query=country+music+official'));
      shortcuts.append(button('Choose my music files',()=>{const n=$('helm09-localfiles');if(n)n.click();}),button('Show YouTube link box',()=>{$('helm09-mediaurl').focus();$('helm09-mediaurl').scrollIntoView({block:'center'});}));section.append(shortcuts);
      const label=el('label','Favorite name','eh-label'),name=el('input');name.type='text';name.maxLength=64;name.placeholder='For example: My country playlist';name.id='eh-favorite-name';label.append(name);section.append(label);
      const save=button('Save the link below',()=>{saved=P.addFavorite(saved,$('helm09-mediaurl').value,name.value);const persisted=write(favKey,saved);renderFavorites();announce(persisted?'Favorite saved on this device.':'Favorite saved for this session; device storage is unavailable.');},'eh-save-link');section.append(save);
      const list=el('div','','eh-favorites');list.setAttribute('aria-label','Saved music links');section.append(list);
      function renderFavorites(){list.replaceChildren();if(!saved.length){list.append(el('p','Save up to five video or playlist links. No music files are uploaded.','eh-note'));return;}
        saved.forEach(row=>{const item=el('div','','eh-favorite-row');
          if(row.provider==='spotify')item.append(link(row.label+' · Spotify ↗',row.url));
          else item.append(button(row.label+' · YouTube',()=>{const n=$('helm09-mediaurl');n.value=row.url;$('helm09-addmedia').click();}));
          const remove=button('Remove',()=>{saved=saved.filter(x=>x.url!==row.url);write(favKey,saved);renderFavorites();});remove.setAttribute('aria-label','Remove favorite '+row.label);item.append(remove);list.append(item);});}
      renderFavorites();body.prepend(section);enhancements.set(body,{section});
    }
    const priorPanel=host.panelOwner.renderPanel;
    function panelHook(kind,body){enhancements.delete(body);const result=priorPanel.call(this,kind,body);queueMicrotask(()=>{if(disposed||!body.isConnected||!localReady())return;if(kind==='settings')enhanceSettings(body);if(kind==='radio')enhanceRadio(body);});return result;}
    host.panelOwner.renderPanel=panelHook;
    function localReady(){try{return host.isLocal()===true;}catch(_){return false;}}
    function measure(){if(disposed||!pref.easy)return;const dock=app.querySelector('.h09-dock'),hud=$('helm09-readouts');
      const h=root.innerHeight||D.documentElement?.clientHeight||0;
      if(dock){const b=dock.getBoundingClientRect();if(b.height>0&&h>0)app.style.setProperty('--eh-control-reserve',Math.max(0,h-b.top)+'px');}
      if(hud){const b=hud.getBoundingClientRect();if(b.height>0)app.style.setProperty('--eh-status-top',(b.bottom+8)+'px');}
    }
    function update(){if(disposed||D.hidden)return;
      if(!localReady()){status.hidden=hint.hidden=true;switcher.disabled=help.disabled=true;return;}
      status.hidden=hint.hidden=false;switcher.disabled=help.disabled=false;
      const d=P.depthStatus(host.depth(),host.options().feet!==false),text=JSON.stringify(d);
      if(text!==lastDepth){head.textContent=d.headline;sub.textContent=d.detail;status.dataset.tone=d.tone;lastDepth=text;}
      const step=P.nextInstruction(host.read());if(step!==lastHint){hint.textContent=step;lastHint=step;}
    }
    const timer=host.setInterval(update,250);on(root,'pagehide',()=>api.dispose());on(root,'resize',measure);
    let observer=null;if(typeof root.ResizeObserver==='function'){observer=new root.ResizeObserver(measure);for(const n of [app.querySelector('.h09-dock'),$('helm09-readouts')])if(n)observer.observe(n);}
    apply();update();measure();
    const api={preferences:()=>({...pref}),setPrefs,inspect:()=>({installed:!disposed,baseline:'Beaufort13',nativeControlsUnchanged:native.every(([id,node,click,down])=>$(id)===node&&node.onclick===click&&node.onpointerdown===down),favorites:saved.length,physicsModified:false,waterModified:false,multiplayer:false}),dispose(){if(disposed)return;disposed=true;host.clearInterval(timer);abort.abort();if(observer)observer.disconnect();if(host.panelOwner.renderPanel===panelHook)host.panelOwner.renderPanel=priorPanel;for(const [body,record]of enhancements){if(record.section.parentNode===body)record.section.remove();const a=record.advanced;if(a?.parentNode===body){for(const child of Array.from(a.childNodes).slice(1))body.insertBefore(child,a);a.remove();}}enhancements.clear();owned.forEach(n=>n.remove());app.style.removeProperty('--eh-control-reserve');app.style.removeProperty('--eh-status-top');app.classList.remove('eh-easy','eh-large');if(root.ATLAS_EASY_HELM===api)delete root.ATLAS_EASY_HELM;}};
    root.ATLAS_EASY_HELM=api;return api;
  };
})(typeof window!=='undefined'?window:globalThis);
