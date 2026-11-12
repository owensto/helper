/* Full atlas only. Catalog coordinates are [longitude, latitude]. */
(() => {
  'use strict';
  const root = document.querySelector('[data-atlas-gl]');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const form = $('.atlas-filters'), panel = $('.atlas-trip-panel'), message = $('.atlas-map-message');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fields = ['search', 'environment', 'species', 'month', 'style'];
  let area=null, preview, sheetObserver, sheetTouched=false, initialTrip=new URLSearchParams(location.search).get('trip');
  let trips = [], matches = [], water = '', page = 0, map, ready = false, selected, returnFocus, hover;
  const size = 24;
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const value = name => form.elements.namedItem(name).value;
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const color = t => t.ice ? 'Ice' : t.waters.length > 1 ? 'Mixed' : t.waters[0];
  const geojson = () => ({type:'FeatureCollection', features:matches.map(t => ({type:'Feature', id:t.id, geometry:{type:'Point', coordinates:t.coordinates}, properties:{id:t.id, water:color(t)}}))});
  function highlight(t) {
    if(ready)map.getSource('active-trip').setData({type:'FeatureCollection',features:t?[{type:'Feature',geometry:{type:'Point',coordinates:t.coordinates},properties:{}}]:[]});
  }
  function closeCard(focus = true) {
    panel.hidden = true;
    if (selected && ready) map.setFeatureState({source:'trips', id:selected}, {selected:false});
    selected = null;highlight(null);
    const params=new URLSearchParams(location.search);params.delete('trip');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
    if (focus && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function closeButton() {
    const button = node('button', '×', 'atlas-close');
    button.type = 'button'; button.setAttribute('aria-label', 'Close trip card');
    button.onclick = () => closeCard();
    return button;
  }
  function fly(center, zoom = 8) {
    if (map) map.flyTo({center, zoom, duration:reduced.matches ? 0 : 1000});
  }
  function showTrip(t, move = false, opener = null) {
    preview?.remove();closeCard(false); returnFocus = opener || map?.getCanvas(); selected = t.id;
    const params=new URLSearchParams(location.search);params.set('trip',t.id);history.replaceState(null,'',location.pathname+'?'+params);
    const img = node('img'); img.src = t.image; img.alt = 'Illustration of the trip environment'; img.width = 640; img.height = 400;
    img.onerror = () => img.remove();
    const copy = node('div', null, 'atlas-card-copy');
    copy.append(node('small', t.country), node('h2', t.name), node('p', t.environments.join(' · ')), node('p', t.waters.join(' / ') + (t.ice ? ' · Ice fishing' : '')));
    const link = node('a', 'View trip ↗'); link.href = t.path; copy.append(link);
    panel.replaceChildren(closeButton(), img, copy); panel.hidden = false;
    if (ready) {map.setFeatureState({source:'trips', id:t.id}, {selected:true});highlight(t);}
    if (move) {
      root.classList.remove('atlas-list-mode');$('[data-view-toggle]').textContent='List view';$('[data-view-toggle]').setAttribute('aria-pressed','false');map?.resize();fly(t.coordinates);
      $('.atlas-gl-stage').scrollIntoView({block:'center', behavior:'instant'});
    }
    panel.querySelector('button').focus({preventScroll:true});
  }
  function renderList() {
    const container = $('.atlas-list-content'), list = node('ul');
    matches.slice(page * size, (page + 1) * size).forEach(t => {
      const li = node('li'), a = node('a', t.name); a.href = t.path;
      const button = node('button', 'Show on map ↗'); button.type = 'button';
      button.onclick = () => showTrip(t, true, button);
      const image=node('img');image.src=t.image;image.alt='';image.loading='lazy';image.width=640;image.height=400;
      const season=t.months.length?t.months.map(m=>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]).join(' · '):'Season: ask locally';
      li.append(image,a, node('span', t.region),node('small',t.waters.join(' / ')+' · '+season), button); list.append(li);
    });
    container.replaceChildren(list);renderSheet();
    if (!matches.length) container.append(node('p', 'No matching trips. Try another place or clear the filters.'));
    if (matches.length > size) {
      const nav = node('div', null, 'atlas-pagination');
      nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Trip list pages');
      const previous = node('button', 'Previous'), next = node('button', 'Next');
      previous.type = next.type = 'button'; previous.disabled = page === 0; next.disabled = (page + 1) * size >= matches.length;
      const turn = step => {page += step; renderList(); const summary = $('.atlas-trip-list summary'); summary.focus({preventScroll:true});};
      previous.onclick = () => turn(-1); next.onclick = () => turn(1);
      nav.append(previous, node('span', `Page ${page + 1} of ${Math.ceil(matches.length / size)}`), next); container.append(nav);
    }
  }
  function renderSheet() {
    sheetTouched=false;const strip=$('.atlas-swipe-cards');['pointerdown','wheel','keydown'].forEach(event=>strip.addEventListener(event,()=>sheetTouched=true,{once:true,passive:true}));sheetObserver?.disconnect();strip.replaceChildren();
    $('[data-sheet-count]').textContent=matches.length+' trips';
    const rows=matches.slice(page*size,(page+1)*size);
    rows.forEach(t=>{const card=node('article',null,'atlas-swipe-card');card.dataset.trip=t.id;const image=node('img');image.src=t.image;image.alt='';image.loading='lazy';image.width=640;image.height=400;const copy=node('div');const a=node('a',t.name);a.href=t.path;const b=node('button','Show on map ↗');b.type='button';b.onclick=()=>showTrip(t,true,b);copy.append(node('small',t.region),a,node('span',t.waters.join(' / ')),b);card.append(image,copy);strip.append(card);});
    if(!rows.length)strip.append(node('p','No trips here yet. Move the map or clear a filter.'));
    if((page+1)*size<matches.length){const next=node('button','More trips →');next.type='button';next.onclick=()=>{page++;renderList();};strip.append(next);}
    sheetObserver=new IntersectionObserver(entries=>{if(!ready||!sheetTouched||!matchMedia('(max-width: 700px)').matches||root.classList.contains('atlas-list-mode'))return;for(const entry of entries){if(entry.intersectionRatio<.65)continue;const t=trips.find(t=>t.id===entry.target.dataset.trip);if(!t)continue;if(hover)map.setFeatureState({source:'trips',id:hover},{hover:false});strip.querySelectorAll('[data-trip]').forEach(card=>card.setAttribute('aria-current',String(card.dataset.trip===t.id)));hover=t.id;highlight(t);map.setFeatureState({source:'trips',id:t.id},{hover:true});map.easeTo({center:t.coordinates,zoom:Math.max(map.getZoom(),5),duration:reduced.matches?0:650});}}, {root:strip,threshold:.65});
    strip.querySelectorAll('[data-trip]').forEach(c=>sheetObserver.observe(c));
  }
  function filter() {
    const query = normalize(value('search')).trim();
    const eligible = trips.filter(t => (!area || area.contains(t.coordinates)) &&
      (!value('environment') || t.environments.includes(value('environment'))) && (!value('species') || t.species.includes(value('species'))) && (!value('month') || value('month').split(',').some(m=>t.months.includes(Number(m)))) && (!value('style') || t.styles.includes(value('style'))) && (!query || normalize([t.name,t.region,t.locationLabel,...t.species,t.candidateTargets,...t.classicNames].join(' ')).includes(query)));
    root.querySelectorAll('[data-water]').forEach(b=>{b.dataset.label ||= b.textContent;b.textContent=b.dataset.label+' '+eligible.filter(t=>!b.dataset.water||(b.dataset.water==='Ice'?t.ice:t.waters.includes(b.dataset.water))).length;});
    matches = trips.filter(t => (!area || area.contains(t.coordinates)) && (!water || (water === 'Ice' ? t.ice : t.waters.includes(water))) &&
      (!value('environment') || t.environments.includes(value('environment'))) &&
      (!value('species') || t.species.includes(value('species'))) &&
      (!value('month') || value('month').split(',').some(m => t.months.includes(Number(m)))) &&
      (!value('style') || t.styles.includes(value('style'))) &&
      (!query || normalize([t.name, t.region, t.locationLabel, ...t.species, t.candidateTargets, ...t.classicNames].join(' ')).includes(query)));
    page = 0; closeCard(false); renderList();
    $('.atlas-result-count').textContent = `${matches.length} ${matches.length === 1 ? 'trip' : 'trips'}`;
    root.dataset.matches = matches.length;
    if (ready) map.getSource('trips').setData(geojson());
    const params = new URLSearchParams();
    fields.forEach(name => {if (value(name)) params.set(name, value(name));});
    if (water) params.set('water', water);
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
  }
  function setWater(next) {
    water = next;
    root.querySelectorAll('[data-water]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.water === water)));
  }
  function fit() {
    if (!map || !matches.length) return;
    const bounds = new maplibregl.LngLatBounds(); matches.forEach(t => bounds.extend(t.coordinates));
    map.fitBounds(bounds, {padding:55, maxZoom:9, duration:reduced.matches ? 0 : 900});
  }
  async function initMap() {
    if (!window.maplibregl) throw new Error('Map library unavailable');
    const response = await fetch('https://tiles.openfreemap.org/styles/positron');
    if (!response.ok) throw new Error('Map style unavailable');
    const style = await response.json();
    style.layers.forEach(layer => {
      layer.paint ||= {};
      if (layer.type === 'background') layer.paint['background-color'] = '#eeeadd';
      if (layer.id === 'water') layer.paint['fill-color'] = '#9fc1c6';
      if(layer.id.includes('boundary')&&layer.type==='line'){layer.paint['line-color']='#9aab95';layer.paint['line-opacity']=.5;}
      if(layer.type==='symbol'&&layer.layout?.['text-field'])layer.paint['text-halo-color']='#f3f0e3';
      if (layer.id === 'waterway') layer.paint['line-color'] = '#91b7c7';
      if (['park', 'landcover_wood'].includes(layer.id)) layer.paint['fill-color'] = '#c1cfb5';
      if (layer.id === 'landuse_residential') layer.paint['fill-color'] = '#e5e3d7';
      if (layer.type === 'symbol' && layer.layout?.['text-field']) layer.paint['text-color'] = '#193a2c';
    });
    map = new maplibregl.Map({container:'atlas-map', style, center:[-25, 28], zoom:1.5, maxZoom:17, cooperativeGestures:true, dragRotate:false, pitchWithRotate:false, attributionControl:false});
    map.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');
    map.on('error', () => {message.textContent = 'Some map detail could not load. You can still use the trip list.';});
    map.on('load', () => {
      map.addSource('trips', {type:'geojson', data:geojson(), promoteId:'id', cluster:true, clusterMaxZoom:14, clusterRadius:44});
      map.addLayer({id:'clusters', type:'circle', source:'trips', filter:['has', 'point_count'], paint:{'circle-color':'#234a3b', 'circle-radius':['step', ['get','point_count'], 20, 20, 25, 100, 31], 'circle-stroke-width':5, 'circle-stroke-color':'#f4f0df', 'circle-stroke-opacity':.8}});
      map.addLayer({id:'cluster-count', type:'symbol', source:'trips', filter:['has','point_count'], layout:{'text-field':['get','point_count_abbreviated'], 'text-font':['Noto Sans Regular'], 'text-size':13}, paint:{'text-color':'#ffffff'}});
      map.addLayer({id:'pins', type:'circle', source:'trips', filter:['!', ['has','point_count']], paint:{'circle-color':['match', ['get','water'], 'Freshwater','#193a2c', 'Saltwater','#256e91', 'Ice','#785bab', '#94723e'], 'circle-radius':['case', ['any', ['boolean',['feature-state','hover'],false], ['boolean',['feature-state','selected'],false]], 12, 8], 'circle-stroke-width':3, 'circle-stroke-color':'#ffffff'}});
      map.addSource('active-trip',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'active-trip-ring',type:'circle',source:'active-trip',paint:{'circle-radius':18,'circle-color':'#b97941','circle-opacity':.15,'circle-stroke-width':3,'circle-stroke-color':'#b97941'}});
      ready = true; root.dataset.ready = 'true';
      map.on('moveend',()=>{$('[data-search-area]').hidden=false;});
      if(initialTrip){const t=trips.find(t=>t.id===initialTrip);if(t)showTrip(t,true);initialTrip=null;}
      message.textContent = 'Use two fingers to move the map on touch screens. Hold Ctrl or ⌘ to zoom with the wheel.';
      map.on('click', 'clusters', async event => {
        try {
          const f = event.features[0], source = map.getSource('trips');
          const zoom = await source.getClusterExpansionZoom(f.properties.cluster_id);
          if (zoom <= 14) fly(f.geometry.coordinates, zoom);
          else {
            const leaves = await source.getClusterLeaves(f.properties.cluster_id, f.properties.point_count, 0);
            closeCard(false); returnFocus = map.getCanvas();
            const list = node('div', null, 'atlas-cluster-choices');
            list.append(node('p', 'Trips at this location'));
            leaves.forEach(leaf => {
              const t = trips.find(t => t.id === leaf.properties.id), button = node('button', t.name);
              button.onclick = () => showTrip(t); list.append(button);
            });
            panel.replaceChildren(closeButton(), list); panel.hidden = false; panel.querySelector('button').focus({preventScroll:true});
          }
        } catch { message.textContent = 'The map changed. Select a cluster again, or use the list.'; }
      });
      map.on('click', 'pins', event => showTrip(trips.find(t => t.id === event.features[0].properties.id),true));
      for (const layer of ['clusters', 'pins']) {
        map.on('mouseenter', layer, () => {map.getCanvas().style.cursor = 'pointer';});
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
          if (hover) map.setFeatureState({source:'trips', id:hover}, {hover:false});
          hover = null;preview?.remove();
        });
      }
      map.on('mousemove', 'pins', event => {
        if (!matchMedia('(hover: hover)').matches) return;
        if(hover===event.features[0].properties.id && preview?.isOpen())return;
        if (hover) map.setFeatureState({source:'trips', id:hover}, {hover:false});
        hover = event.features[0].properties.id; map.setFeatureState({source:'trips', id:hover}, {hover:true});
        const t=trips.find(t=>t.id===hover);if(!t)return;
        const card=node('div',null,'atlas-hover-card'),img=node('img');img.src=t.image;img.alt='';card.append(img,node('small',t.region),node('strong',t.name),node('span',t.waters.join(' / ')+' · Select to explore'));
        preview?.remove();preview=new maplibregl.Popup({closeButton:false,closeOnClick:true,offset:18,className:'atlas-hover',maxWidth:'240px'}).setLngLat(t.coordinates).setDOMContent(card).addTo(map);
      });
    });
  }
  async function start() {
    try {
      const response = await fetch(root.dataset.catalog);
      if (!response.ok) throw new Error('Catalog unavailable');
      trips = (await response.json()).trips;
      const params = new URLSearchParams(location.search);
      fields.forEach(name => {if (params.has(name)) form.elements.namedItem(name).value = params.get(name);});
      setWater(['Freshwater','Saltwater','Ice','Brackish'].includes(params.get('water')) ? params.get('water') : '');
      form.addEventListener('input', filter);
      form.addEventListener('submit', event => {
        event.preventDefault(); filter();
        if (matches.length === 1) showTrip(matches[0], true, form.querySelector('button'));
        else { fit(); message.textContent = matches.length ? 'The map shows the matching trips. Select a pin or use the list.' : 'No matching place or trip. Try another search.'; }
      });
      root.querySelectorAll('[data-water]').forEach(button => {button.onclick = () => {setWater(button.dataset.water); filter();};});
      $('[data-clear]').onclick = () => {area=null;form.reset(); setWater(''); filter();};
      $('[data-fit]').onclick = fit;
      $('[data-refine]').onclick=()=>{const open=root.classList.toggle('atlas-filters-open');$('[data-refine]').setAttribute('aria-expanded',String(open));$('[data-refine]').textContent=open?'Fewer filters −':'Refine the results +';};
      $('[data-search-area]').onclick=()=>{if(!map)return;area=map.getBounds();filter();$('[data-search-area]').hidden=true;message.textContent=matches.length+' trips in this area. Clear filters to explore everywhere.';};
      $('[data-view-toggle]').onclick=()=>{const list=root.classList.toggle('atlas-list-mode');$('[data-view-toggle]').textContent=list?'Map view':'List view';$('[data-view-toggle]').setAttribute('aria-pressed',String(list));$('.atlas-trip-list').open=true;if(!list)map?.resize();};
      $('[data-near]').onclick = () => {
        if (!navigator.geolocation) {message.textContent = 'Location is unavailable in this browser. Search for a place instead.'; return;}
        const button = $('[data-near]'); button.disabled = true; message.textContent = 'Waiting for your location permission…';
        navigator.geolocation.getCurrentPosition(position => {
          button.disabled = false;
          fly([position.coords.longitude, position.coords.latitude], 7);
          message.textContent = 'Map centered on your approximate location. Your location is not stored.';
        }, () => {button.disabled = false; message.textContent = 'Location is unavailable or permission was denied. Search for a place instead.';}, {timeout:10000, maximumAge:60000});
      };
      root.addEventListener('keydown', event => {if (event.key === 'Escape') closeCard();});
      filter();
      await initMap();
    } catch {
      message.textContent = 'The map is unavailable. Browse the trip list below, or reload to try again.';
    }
  }
  start();
})();
