const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(root+'/src/guides.json'));
const shopping=JSON.parse(fs.readFileSync(root+'/src/shopping-lists.json'));
const rich=data.articles.filter(g=>g.rich);
const read=p=>fs.readFileSync(root+p,'utf8');
const schemas=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));

test('Rich guides preserve sources, navigation, images, and structured content through the build',()=>{
 assert.ok(rich.length>=12);
 const stems=new Set();
 for(const g of rich){
  const html=read('/dist/guides/'+g.slug+'/index.html');
  assert.match(html,/guide-rich.css/);
  assert.match(html,/aria-label="On this page"/);
  assert.ok(g.quickAnswer&&g.facts.length===3);
  const structured=schemas(html);
  const article=structured.find(s=>s['@type']==='Article');
  assert.equal(article.image,'https://castward.app/media/guides/'+g.hero.name+'-1200.webp');
  assert.equal(article.dateModified,g.updated);
  assert.ok(structured.find(s=>s['@type']==='FAQPage'));
  const images=[g.hero];
  for(const s of g.sections){
   assert.ok(html.includes('id="'+s.id+'"'),g.slug+' missing section '+s.id);
   for(const id of s.sources||[])assert.ok(data.sources[id]?.url.startsWith('https://'),id);
   if(s.image)images.push(s.image);
   images.push(...(s.cards||[]).filter(c=>c.image).map(c=>c.image));
   images.push(...(s.steps||[]).filter(step=>step.image).map(step=>step.image));
   if(s.howTo){
    assert.ok(s.steps.length>=8&&s.steps.length<=14);
    assert.ok(s.steps.every(step=>step.image?.alt&&step.text));
    assert.equal(new Set(s.steps.map(step=>step.image.name)).size,s.steps.length);
    const howto=structured.find(schema=>schema['@type']==='HowTo');
    assert.equal(howto.step.length,s.steps.length);
    for(const step of howto.step)assert.ok(html.includes('id="'+step.url.split('#')[1]+'"'));
   }
  }
  for(const img of images){
   assert.ok(img.alt.trim().length>8);
   stems.add(img.name);
   for(const width of [640,1200,1600])assert.ok(fs.existsSync(root+'/public/media/guides/'+img.name+'-'+width+'.webp'));
  }
  if(shopping['/guides/'+g.slug+'/']){
   assert.match(html,/Check price on Amazon/);
   assert.match(html,/tag=mediaatlas08-20/);
   for(const item of shopping['/guides/'+g.slug+'/'].items){
    assert.ok(item.sources.length>0&&item.specs.length>=2&&item.specs.length<=3);
    for(const id of item.sources)assert.ok(data.sources[id],id);
   }
  }
 }
 const files=fs.readdirSync(root+'/public/media/guides');
 assert.equal(files.filter(f=>/\.png$/i.test(f)).length,0);
 const bytes=[...stems].reduce((n,stem)=>n+[640,1200,1600].reduce((sum,w)=>sum+fs.statSync(root+'/public/media/guides/'+stem+'-'+w+'.webp').size,0),0);
 assert.ok(bytes<60*1024*1024,'New guide media exceeds 60 MB');
});

test('Every authored guide has one compact source list with complete citation targets',()=>{
 const world=JSON.parse(read('/src/world.json'));
 const routes=[...data.articles.map(g=>['/guides/'+g.slug+'/',g]),...Object.entries(data.trips).map(([id,g])=>[world.trips.find(t=>t.id===id).canonicalPath,g])];
 for(const [route,g] of routes){
  const html=read('/dist'+route+'index.html');
  const block=html.match(/<section class="guide-sources" id="sources">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(block,route);
  assert.match(block,/^<details><summary>Sources \(\d+\)<\/summary>/);
  assert.equal((block.match(/Checked November 2026/g)||[]).length,1,route);
  assert.doesNotMatch(block,/scopeNote|reference-row|\d{4}-\d{2}-\d{2}/);
  const ids=[...html.matchAll(/id="(source-\d+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,route);
  assert.equal(Number(block.match(/Sources \((\d+)\)/)[1]),ids.length,route);
  const sourceURLs=[...block.matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(sourceURLs).size,sourceURLs.length,route+' duplicate references');
  for(const m of html.matchAll(/<sup class="guide-citations">([\s\S]*?)<\/sup>/g)){
   assert.doesNotMatch(m[1],/https?:/);
   for(const link of m[1].matchAll(/href="#(source-\d+)"/g))assert.ok(ids.includes(link[1]),route+' '+link[1]);
  }
  const used=new Set([...(g.quickSources||[]),...g.sections.flatMap(s=>s.sources||[]),...(shopping[route]?.items||[]).flatMap(i=>i.sources||[])]);
  for(const id of used){
   const source=data.sources[id];
   assert.ok(['Manufacturer','Government/agency','Independent'].includes(source.group),id);
   assert.ok(source.publisher&&source.shortTitle,id);
   assert.ok(block.includes(source.url.replaceAll('&','&amp;')),id);
   if(source.scopeNote)assert.ok(!block.includes(source.scopeNote),id);
  }
 }
});

test('Named product cards use one exact product search and one explicit price button',()=>{
 for(const [route,entry] of Object.entries(shopping).filter(([,entry])=>entry.rich)){
  const html=read('/dist'+route+'index.html');
  const cards=[...html.matchAll(/<article class="gr-product[^\"]*">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length,entry.items.length,route);
  entry.items.forEach((item,index)=>{
   assert.ok(!item.query.includes('tag='));
   const card=cards[index][1];
   const buys=[...card.matchAll(/<a class="gr-buy" href="([^"]+)"[^>]*>Check price <span/g)];
   assert.equal(buys.length,1,item.name);
   const url=new URL(buys[0][1].replaceAll('&amp;','&'));
   assert.equal(url.hostname,'www.amazon.com');
   assert.equal(url.searchParams.get('k'),item.query,item.name);
   assert.ok(url.searchParams.get('tag'));
   assert.equal(card.includes('>My pick</span>'),!!item.pick,item.name);
  });
 }
 assert.match(read('/dist/guides/merino-wool-fishing-base-layers/index.html'),/Smartwool is my pick for the best 100% merino wool brand\./);
});
