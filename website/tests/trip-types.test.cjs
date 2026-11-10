const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../public/assets/engine.js');
const D=require('../src/compiled-data.json');
const W=require('../src/world.json');
const T=require('../src/trip-types.json').types;
const M=require('../dist/route-manifest.json');
const read=route=>fs.readFileSync(path.join(__dirname,'../dist',route,'index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(__dirname,'../dist/sitemap.xml'),'utf8');

test('all 40 research priorities publish, with one scoped glossary addition',()=>{
  assert.equal(T.filter(t=>t.priority!==null).length,40);
  assert.deepEqual(T.filter(t=>t.priority!==null).map(t=>t.priority).sort((a,b)=>a-b),Array.from({length:40},(_,i)=>i+1));
  assert.equal(T.length,41);
  assert.equal(new Set(T.map(t=>t.slug)).size,T.length);
});

test('every hub has substantive authored sections, matching FAQ schema, sources, and an empty guide slot',()=>{
  for(const t of T){
    const route='/trip-types/'+t.slug+'/';const html=read(route);
    assert.equal(M[route].noindex,false,t.slug);
    assert.ok(sitemap.includes('https://castward.app'+route),t.slug);
    for(const id of ['meaning','species','where','season','method','kit','guide','local-terms','faq','book-a-guide','sources'])assert.ok(html.includes('id="'+id+'"'),t.slug+': '+id);
    assert.ok(t.definition.length>150&&t.fishingNotes.length>200,t.slug);
    assert.ok(t.regulations.length&&t.season.source_urls.length,t.slug);
    assert.ok(html.includes('data-guide-slot="empty"'),t.slug);
    const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    const faq=schemas.find(s=>s['@type']==='FAQPage');assert.equal(faq.mainEntity.length,t.faq.length,t.slug);
    assert.deepEqual(faq.mainEntity.map(q=>[q.name,q.acceptedAnswer.text]),t.faq.map(f=>[f.question,f.answer]));
    assert.ok(!schemas.some(s=>['Offer','Product','Review','AggregateRating'].includes(s['@type'])),t.slug);
    for(const id of t.profileIds){const p=W.trips.find(p=>p.id===id);assert.ok(p,t.slug);assert.ok(html.includes(p.canonicalPath),t.slug);assert.ok(read(p.canonicalPath).includes(route),id);}
  }
  assert.equal(new Set(T.map(t=>t.definition)).size,T.length);
  assert.equal(new Set(T.map(t=>t.fishingNotes)).size,T.length);
});

test('name and alias membership survives every catalog transformation',()=>{
  for(const t of T)for(const id of t.profileIds){
    const w=W.trips.find(p=>p.id===id),d=D.world.trips.find(p=>p.id===id);
    assert.ok(w.tripTypeIds.includes(t.slug),id);assert.ok(d.tripTypeIds.includes(t.slug),id);
    for(const name of [t.name,...t.aliases])assert.ok(d.tripTypeNames.includes(name),name);
  }
});

test('presets survive serialization and use their own kit without another type or generic destination kit',()=>{
  for(const t of T)for(const id of t.profileIds){
    const key='type-'+t.slug+'-1';
    const p=E.normalize({destination:id,tripType:t.slug,statuses:{[key]:'provided'},packed:{[key]:true}},D);
    assert.equal(p.tripType,t.slug);assert.equal(p.style,t.plannerStyle);
    assert.deepEqual(E.normalize(JSON.parse(JSON.stringify(p)),D),p);
    const items=E.requirements(p,D),kit=items.filter(g=>g.scope==='tripType');
    assert.equal(kit.length,6,t.slug);assert.ok(kit.every(g=>g.tripTypeId===t.slug));
    assert.ok(!items.some(g=>g.scope==='trip'));
    assert.equal(kit[0].status,'provided');assert.equal(kit[0].packed,true);
  }
});

test('changing destination or using an invalid type clears incompatible type data',()=>{
  const t=T.find(t=>t.slug==='texas-slam');
  assert.equal(E.normalize({destination:'quepos-offshore',tripType:t.slug},D).tripType,'');
  assert.equal(E.normalize({destination:t.profileIds[0],tripType:'invented'},D).tripType,'');
  const base=E.requirements({destination:t.profileIds[0]},D);
  assert.equal(base.filter(g=>g.scope==='trip').length,4);
  assert.equal(base.filter(g=>g.scope==='tripType').length,0);
});

test('research-pending stays noindex and only the two named gaps add destination profiles',()=>{
  const additions=W.trips.filter(t=>t.catalogOrigin==='local-lingo-research-gap');
  assert.deepEqual(additions.map(t=>t.id).sort(),['cairns-heavy-tackle-marlin','kabinakagami-lake-fly-in']);
  for(const t of W.trips.filter(t=>t.review.status==='research-pending')){
    assert.equal(M[t.canonicalPath].noindex,true,t.id);
    assert.ok(!sitemap.includes('https://castward.app'+t.canonicalPath+'</loc>'),t.id);
  }
  const glossary=read('/glossary/');
  for(const term of ['bull-reds','specks','tailing','slam','drum-run','albie-blitz'])assert.ok(glossary.includes('id="'+term+'"'),term);
});
