const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('src/local-lingo.json','utf8'));
const ids=new Set(data.regions.map(r=>r.id));
test('lingo records have sources, concise meanings, examples, and valid region groups',()=>{
 const groups=new Set(['North America','Latin America & Caribbean','Europe','Africa','Asia-Pacific','Worldwide']);
 const anchors=new Set();
 for(const r of data.regions){assert.ok(groups.has(r.continent));for(const t of r.terms){
  assert.ok(t.example?.length>10,t.term);assert.ok(t.meaning.length<250,t.term);assert.ok(t.sources.length>0);assert.ok(t.sources.every(s=>data.sources[s]?.url.startsWith('https://')));
  for(const id of t.also_in||[])assert.ok(ids.has(id));
  for(const id of t.alternate_anchors||[]){assert.ok(!anchors.has(id),'duplicate legacy anchor');anchors.add(id);}
 }}
});
test('shared terms merge records while different local meanings remain distinct',()=>{
 const all=data.regions.flatMap(r=>r.terms);
 assert.equal(all.filter(t=>t.term==='King').length,1);assert.ok(all.find(t=>t.term==='King').also_in.includes('alaska'));
 assert.equal(all.filter(t=>t.term==='Dorado').length,1);
 assert.equal(all.filter(t=>t.term==='Springer').length,2);
 assert.ok(all.some(t=>t.alternate_anchors?.includes('caribbean-flats-grand-slam')));
});
