const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../public/assets/game-engine.js');
test('every water has discoverable fish and all three rarity tiers',()=>{
 assert.equal(new Set(G.species.map(s=>s.id)).size,34);
 for(const id of Object.keys(G.waters)){
  const pool=G.species.filter(s=>s.water===id);assert.ok(pool.length>=3);
  assert.deepEqual(new Set(pool.map(s=>s.rarity)),new Set(['common','rare','legendary']));
  const rng=G.random(42),seen=new Set();for(let i=0;i<1000;i++)seen.add(G.choose(id,.8,'spoon',rng).id);
  assert.deepEqual(seen,new Set(pool.map(s=>s.id)));
 }
});
test('daily challenges and fish sequences are stable for one UTC date',()=>{
 const a=G.daily('2026-11-11'),b=G.daily('2026-11-11');assert.deepEqual(a,b);
 const x=G.random(a.seed),y=G.random(b.seed);for(let i=0;i<20;i++)assert.equal(G.choose(a.water,.7,'spoon',x).id,G.choose(b.water,.7,'spoon',y).id);
 assert.notEqual(a.seed,G.daily('2026-11-12').seed);assert.ok(G.waters[a.water]);
});
test('streak scoring is capped and rare fish earn more',()=>{
 assert.ok(G.points('common',1,2)>G.points('common',1,1));assert.equal(G.points('common',1,100),G.points('common',1,9));assert.ok(G.points('legendary',.5,1)>G.points('rare',1,1));
});
test('old catch books migrate; corrupt records cannot create unlocks or scores',()=>{
 const c={species:'Rainbow trout',length:40,weight:.8,water:'River'};
 const old=G.restore({log:[c],best:c});assert.equal(old.total,1);assert.equal(old.collected['rainbow-trout'].species,c.species);
 const bad=G.restore({total:'999',log:[{...c,weight:Infinity}],scores:[{score:'999',date:'today'},null],daily:{'garbage':3}});assert.equal(bad.total,0);assert.deepEqual(bad.log,[]);assert.deepEqual(bad.daily,{});assert.deepEqual(bad.scores,[]);
});
