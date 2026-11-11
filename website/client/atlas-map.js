import {geoNaturalEarth1, geoPath, geoGraticule10} from 'd3-geo';
import {select} from 'd3-selection';
import {zoom, zoomIdentity} from 'd3-zoom';
import 'd3-transition';
import {feature} from 'topojson-client';

const regions = {World:null,Alaska:[-150,63,5],Florida:[-82,28,9],Norway:[12,65,6],Australia:[134,-26,3]};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalized = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const tierLabel = trip => ({'preparation-brief':'Research pending','trip-brief':'Source-linked brief','detailed-guide':'Source-checked guide'}[trip.tier]);
export async function mount(root) {
  const [catalog, topology] = await Promise.all([root.dataset.catalog,'/media/atlas/countries-110m.json'].map(async url=>{
    const response=await fetch(url); if(!response.ok)throw Error('Map data unavailable'); return response.json();
  }));
  if(root.dataset.ready)return;
  const trips=catalog.trips, styles=new Map(catalog.styles.map(s=>[s.slug,s.name]));
  for(const t of trips)t.search=normalized([t.name,t.region,...t.species,t.candidateTargets,...t.classicNames,...t.styles.map(s=>styles.get(s))].join(' '));
  const surface=root.querySelector('.atlas-map'), stage=root.querySelector('.atlas-map-stage');
  const preview=root.querySelector('.atlas-preview'), status=root.querySelector('.atlas-status');
  const list=root.querySelector('.atlas-list-content'), details=root.querySelector('.atlas-list');
  const fields=Object.fromEntries(['search','water','style','month'].map(key=>[key,root.querySelector(`[name="${key}"]`)]));
  const toggle=root.querySelector('[data-filter-toggle]');
  toggle.onclick=()=>{const open=root.classList.toggle('atlas-filters-open');toggle.setAttribute('aria-expanded',String(open));};
  const query=new URLSearchParams(location.search);
  for(const key of Object.keys(fields))if(query.has(key))fields[key].value=query.get(key);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=surface.clientWidth, height=surface.clientHeight, transform=zoomIdentity, matches=trips, page=0, frame=0, selected=null;
  const projection=geoNaturalEarth1(), path=geoPath(projection);
  const svg=select(surface).append('svg').attr('aria-hidden','true').attr('focusable','false');
  const geography=svg.append('g').attr('class','atlas-geography');
  const ocean=geography.append('path').attr('class','atlas-sphere');
  const grid=geography.append('path').attr('class','atlas-gridlines');
  const land=geography.append('path').attr('class','atlas-coastline');
  const countries=feature(topology,topology.objects.countries);
  const countryShapes=geography.append('path').attr('class','atlas-borders');
  const intro=geography.append('path').attr('class','atlas-route-intro').attr('pathLength',1);
  const markers=document.createElement('div');markers.className='atlas-markers';surface.append(markers);
  const closePreview=()=>{preview.hidden=true;selected=null;};
  function card(trip){
    selected=trip.id;preview.hidden=false;
    preview.innerHTML=`<button type="button" class="atlas-close" aria-label="Close destination card">×</button>${trip.imageHtml}<div class="atlas-preview-copy"><span class="eyebrow">${esc(trip.region)}</span><h3>${esc(trip.name)}</h3><p>${esc(trip.species.length?trip.species.slice(0,4).join(' · '):'Species not yet verified')}</p><small>${esc(tierLabel(trip))} · ${trip.precision==='country'?'Country reference only':('Approximate '+(trip.precision==='region'?'region':'place'))}: ${esc(trip.locationLabel)}</small><a class="link" href="${esc(trip.path)}">Open trip ↗</a></div>`;
    preview.querySelector('button').onclick=closePreview;
  }
  function clusterCard(group){
    selected=null;preview.hidden=false;
    preview.innerHTML=`<button type="button" class="atlas-close" aria-label="Close destination card">×</button><div class="atlas-preview-copy"><span class="eyebrow">SHARED MAP AREA</span><h3>${group.length} destinations</h3><p>Choose a trip at this location.</p><ul class="atlas-cluster-list">${group.map(t=>`<li><button type="button" data-pick="${esc(t.id)}">${esc(t.name)}</button></li>`).join('')}</ul></div>`;
    preview.querySelector('.atlas-close').onclick=closePreview;
    preview.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>card(group.find(t=>t.id===b.dataset.pick)));
  }
  function fly(coordinate,scale){
    const xy=projection(coordinate), target=zoomIdentity.translate(width/2-scale*xy[0],height/2-scale*xy[1]).scale(scale);
    select(surface).interrupt();
    if(reduced.matches)select(surface).call(behavior.transform,target);
    else select(surface).transition().duration(750).call(behavior.transform,target);
  }
  function clusterClick(group){
    if(group.length===1){card(group[0]);return;}
    const coords=group.map(t=>projection(t.coordinates));
    const minX=Math.min(...coords.map(p=>p[0])),maxX=Math.max(...coords.map(p=>p[0]));
    const minY=Math.min(...coords.map(p=>p[1])),maxY=Math.max(...coords.map(p=>p[1]));
    if(transform.k>=40 || (maxX-minX<.1 && maxY-minY<.1)){clusterCard(group);return;}
    const scale=Math.min(48,Math.max(transform.k*2,Math.min(width*.6/Math.max(1,maxX-minX),height*.6/Math.max(1,maxY-minY))));
    fly(projection.invert([(minX+maxX)/2,(minY+maxY)/2]),scale);
  }
  function viewGroups(){
    const buckets=new Map();
    for(const t of matches){
      if(!t.coordinates)continue;
      const [x,y]=transform.apply(projection(t.coordinates));
      if(x<0||x>width||y<0||y>height)continue;
      const cell=transform.k>32?30:48, key=`${Math.floor(x/cell)}:${Math.floor(y/cell)}`;
      if(!buckets.has(key))buckets.set(key,{trips:[],x:0,y:0});
      const group=buckets.get(key);group.trips.push(t);group.x+=x;group.y+=y;
    }
    const groups=[...buckets.values()].map(g=>({...g,x:g.x/g.trips.length,y:g.y/g.trips.length}));
    // Merge neighbouring grid cells too, so clusters never obscure one another.
    let merged=true;
    while(merged){
      merged=false;
      outer: for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
        const a=groups[i],b=groups[j];
        if((a.x-b.x)**2+(a.y-b.y)**2<48**2){
          const n=a.trips.length+b.trips.length;
          a.x=(a.x*a.trips.length+b.x*b.trips.length)/n;a.y=(a.y*a.trips.length+b.y*b.trips.length)/n;
          a.trips.push(...b.trips);groups.splice(j,1);merged=true;break outer;
        }
      }
    }
    return groups;
  }
  function render(){
    frame=0;geography.attr('transform',transform.toString());
    const groups=viewGroups();
    // Reuse buttons during a gesture. Screen-reader users can also use the stable list below.
    const nodes=select(markers).selectAll('button').data(groups,g=>g.trips.map(t=>t.id).join('|'));
    nodes.exit().remove();
    nodes.enter().append('button').attr('type','button').merge(nodes)
      .attr('class',g=>'atlas-marker '+(g.trips.length>1?'atlas-cluster':'atlas-single'))
      .attr('aria-label',g=>g.trips.length>1?`${g.trips.length} destinations. Zoom or choose a trip.`:g.trips[0].name+'. Show trip card.')
      .attr('title',g=>g.trips.length>1?`${g.trips.length} destinations`:g.trips[0].name)
      .style('left',g=>g.x+'px').style('top',g=>g.y+'px')
      .text(g=>g.trips.length>1?g.trips.length:'')
      .on('pointerdown',event=>event.stopPropagation())
      .on('click',(event,g)=>{event.stopPropagation();clusterClick(g.trips);})
      .on('pointerenter',(event,g)=>{if(event.pointerType==='mouse' && g.trips.length===1)card(g.trips[0]);})
      .on('focus',(event,g)=>{if(g.trips.length===1)card(g.trips[0]);});
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  function updateStatus(){
    const inView=viewGroups().reduce((n,g)=>n+g.trips.length,0);
    status.textContent=`${matches.length} of ${trips.length} destinations · ${inView} in view`;
    root.dataset.matches=matches.length;
  }
  const behavior=zoom().scaleExtent([1,48]).extent(()=>[[0,0],[width,height]])
    .filter(event=>!event.target.closest('button') && (!event.ctrlKey||event.type==='wheel') && !event.button)
    .on('start',event=>{if(event.sourceEvent){intro.style('display','none');}})
    .on('zoom',event=>{transform=event.transform;root.dataset.zoom=transform.k.toFixed(3);schedule();})
    .on('end',updateStatus);
  select(surface).call(behavior).on('dblclick.zoom',null);
  surface.addEventListener('keydown',event=>{
    if(event.target!==surface)return;
    const moves={ArrowLeft:[90,0],ArrowRight:[-90,0],ArrowUp:[0,90],ArrowDown:[0,-90]};
    if(moves[event.key]){event.preventDefault();const [x,y]=moves[event.key];select(surface).call(behavior.translateBy,x/transform.k,y/transform.k);}
    if(event.key==='+'||event.key==='='){event.preventDefault();zoomBy(1.6);}
    if(event.key==='-'){event.preventDefault();zoomBy(1/1.6);}
    if(event.key==='Home'){event.preventDefault();reset();}
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!preview.hidden){closePreview();surface.focus({preventScroll:true});}});
  function zoomBy(factor){
    select(surface).interrupt();const target=reduced.matches?select(surface):select(surface).transition().duration(300);target.call(behavior.scaleBy,factor);
  }
  function reset(){
    closePreview();select(surface).interrupt();const target=reduced.matches?select(surface):select(surface).transition().duration(600);target.call(behavior.transform,zoomIdentity);
    root.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region==='World')));
  }
  root.querySelector('[data-zoom="in"]').onclick=()=>zoomBy(1.6);
  root.querySelector('[data-zoom="out"]').onclick=()=>zoomBy(1/1.6);
  root.querySelector('[data-reset]').onclick=reset;
  root.querySelectorAll('[data-region]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.region==='World'));
    button.onclick=()=>{
      root.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      closePreview();const r=regions[button.dataset.region];if(r)fly(r.slice(0,2),r[2]);else reset();
    };
  });
  root.querySelector('a[href="#atlas-list"]').onclick=()=>{details.open=true;};
  const pageSize=24;
  function renderList(focus=false){
    const slice=matches.slice(page*pageSize,(page+1)*pageSize);
    list.innerHTML=`<p>${matches.length?'Destinations '+(page*pageSize+1)+'–'+Math.min((page+1)*pageSize,matches.length)+' of '+matches.length:'No matching destinations. Try another filter.'}</p><ul>${slice.map(t=>`<li><a href="${esc(t.path)}">${esc(t.name)}</a><span>${esc(t.region)} · ${esc(tierLabel(t))}</span>${t.coordinates?`<button type="button" data-show="${esc(t.id)}">Show on map</button>`:'<small>Map location not established</small>'}</li>`).join('')}</ul><div class="atlas-pagination"><button type="button" data-page="previous" ${page===0?'disabled':''}>Previous</button><button type="button" data-page="next" ${(page+1)*pageSize>=matches.length?'disabled':''}>Next</button></div>`;
    list.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{page+=button.dataset.page==='next'?1:-1;renderList(true);});
    list.querySelectorAll('[data-show]').forEach(button=>button.onclick=()=>{const trip=trips.find(t=>t.id===button.dataset.show);fly(trip.coordinates,12);card(trip);stage.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});preview.querySelector('a').focus({preventScroll:true});});
    if(focus){list.tabIndex=-1;list.focus({preventScroll:true});}
  }
  function filter(){
    const tokens=normalized(fields.search.value.trim()).split(/\s+/).filter(Boolean);
    const months=fields.month.value.split(',').map(Number).filter(Boolean);
    matches=trips.filter(t=>tokens.every(token=>t.search.includes(token)) && (!fields.water.value || (fields.water.value==='Ice'?t.ice:t.waters.includes(fields.water.value))) && (!fields.style.value||t.styles.includes(fields.style.value)) && (!months.length||months.some(m=>t.months.includes(m))));
    page=0;closePreview();renderList();schedule();updateStatus();
    details.querySelector('summary').textContent=`Browse ${matches.length} matching destinations as a list`;
    root.querySelector('.atlas-season-note').hidden=!months.length;
    if(location.pathname==='/atlas/'){
      const params=new URLSearchParams();for(const key of Object.keys(fields))if(fields[key].value)params.set(key,fields[key].value);
      history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
    }
  }
  for(const [key,field] of Object.entries(fields))field.addEventListener(key==='search'?'input':'change',filter);
  root.querySelector('[data-clear]').onclick=()=>{for(const f of Object.values(fields))f.value='';filter();reset();};
  function resize(){
    const oldWidth=width,oldHeight=height;
    const center=projection.invert(transform.invert([oldWidth/2,oldHeight/2]));
    width=surface.clientWidth;height=surface.clientHeight;
    projection.fitExtent([[18,22],[width-18,height-22]],{type:'Sphere'});
    svg.attr('viewBox',`0 0 ${width} ${height}`);
    ocean.attr('d',path({type:'Sphere'}));grid.attr('d',path(geoGraticule10()));
    land.attr('d',path(feature(topology,topology.objects.land)));countryShapes.attr('d',path(countries));
    intro.attr('d',path({type:'LineString',coordinates:[[-150,63],[-82,28],[12,65],[134,-26]]}));
    if(transform.k===1)select(surface).call(behavior.transform,zoomIdentity);
    else {const xy=projection(center);select(surface).call(behavior.transform,zoomIdentity.translate(width/2-transform.k*xy[0],height/2-transform.k*xy[1]).scale(transform.k));}
    render();updateStatus();
  }
  resize();new ResizeObserver(resize).observe(surface);
  filter();root.querySelector('.atlas-loading').hidden=true;root.dataset.ready='true';
  if(reduced.matches)intro.style('display','none');
}
