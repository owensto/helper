const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../public/assets/game-engine.js'),C=require('../public/assets/game-career.js');
const places=[{id:'river-trip',level:1,licence:'us-montana',permit:{coins:60},speciesIds:['rainbow-trout']},{id:'ice-trip',level:2,licence:'ca-manitoba',permit:{coins:70},speciesIds:['walleye']}];
const catchEntry={id:'rainbow-trout',species:'Rainbow trout',length:58,weight:2.2,water:'River'};
test('licence purchase, catch objectives, level unlock and travel form a full career loop',()=>{const s=C.restore(null,places);assert.equal(C.travel(s,places[1]),false);assert.ok(C.travel(s,places[0]));assert.equal(s.coins,240);C.land(s,places[0],catchEntry,true,'2026-11-11');assert.deepEqual(s.objectives['river-trip'],[true,true,true]);assert.equal(C.level(s),2);assert.ok(C.travel(s,places[1]));assert.equal(s.place,'ice-trip');const coins=s.coins;assert.ok(C.travel(s,places[1]));assert.equal(s.coins,coins);});
test('objectives award once; species records retain their largest catch',()=>{const s=C.restore(null,places);const a=C.land(s,places[0],catchEntry,true,'2026-11-11'),b=C.land(s,places[0],{...catchEntry,length:30},true,'2026-11-11');assert.ok(a.xp>b.xp);assert.equal(s.records['rainbow-trout'].length,58);});
test('gear has measurable effects; repeat purchases equip without charging twice',()=>{const s=C.restore(null,places);assert.ok(C.buy(s,'rod'));assert.equal(C.effects(s).cast,1.2);const coins=s.coins;assert.ok(C.buy(s,'rod'));assert.equal(s.coins,coins);assert.equal(C.buy(s,'boat'),false);});
test('streak uses UTC dates and cannot award twice on one date',()=>{const s=C.restore(null,places);C.visit(s,'2026-11-11');const coins=s.coins;C.visit(s,'2026-11-11');assert.equal(s.coins,coins);C.visit(s,'2026-11-12');assert.equal(s.streak,2);C.visit(s,'2026-11-15');assert.equal(s.streak,1);});
test('daily challenge caps its reward and weekly water is deterministic',()=>{const s=C.restore(null,places);for(let i=0;i<3;i++)C.land(s,null,catchEntry,false,'2026-11-11',true);const coins=s.coins;C.land(s,null,catchEntry,false,'2026-11-11',true);assert.equal(s.coins-coins,70);assert.equal(s.daily.count,3);assert.equal(C.weekly('2026-11-11',places),C.weekly('2026-11-12',places));});
test('save validation rejects corrupt fields, impossible records and unowned equipment',()=>{const s=C.restore({xp:Infinity,coins:-8,owned:['unknown','rod','rod'],equipped:{boat:'boat',rod:'rod'},permits:['bad'],place:'ice-trip',records:{'rainbow-trout':{...catchEntry,length:900}},objectives:{'river-trip':['true',true,1]},lastDay:'bad'},places);assert.equal(s.xp,0);assert.equal(s.coins,0);assert.deepEqual(s.owned,['rod']);assert.deepEqual(s.equipped,{rod:'rod'});assert.deepEqual(s.records,{});assert.equal(s.place,null);assert.deepEqual(s.objectives['river-trip'],[false,true,false]);assert.equal(s.lastDay,null);});
test('boat depth adds to the lure depth regardless of purchase order',()=>{const s=C.restore(null,places);s.coins=1000;C.buy(s,'boat');C.buy(s,'jig');assert.equal(C.effects(s).depth,12);});
test('the built map preserves trip identity, real target IDs, human trip summaries and licence links',()=>{const fs=require('node:fs'),html=fs.readFileSync(require('node:path').join(__dirname,'../dist/play/index.html'),'utf8');const data=JSON.parse(html.match(/<script id="career-data" type="application\/json">([^<]+)<\/script>/)[1]);const world=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../src/world.json'),'utf8'));assert.equal(data.places.length,25);assert.equal(new Set(data.places.map(p=>p.continent)).size,6);assert.equal(new Set(data.places.map(p=>p.water)).size,6);for(const p of data.places){const source=world.trips.find(t=>t.id===p.id);assert.equal(p.canonicalPath,source.canonicalPath);assert.equal(p.season,source.summary);assert.deepEqual(p.speciesIds,source.speciesIds);assert.deepEqual(p.habitats,source.habitats);assert.ok(C.targets(p).length>0,p.id);assert.equal(p.permit.path,`/fishing-licenses/${p.licence}/`);}});

test('tropical river trips retain a tropical biome instead of an alpine or flats scene',()=>{const fs=require('node:fs'),html=fs.readFileSync(require('node:path').join(__dirname,'../dist/play/index.html'),'utf8'),data=JSON.parse(html.match(/<script id="career-data" type="application\/json">([^<]+)<\/script>/)[1]);for(const id of ['rio-negro-peacock','costa-caribbean-canals','top-end-barramundi','lower-zambezi-tiger']){const p=data.places.find(p=>p.id===id);assert.equal(p.water,'river');assert.equal(p.biome,'tropical');}});

test('the first-cast aid is consumed once and survives reload, import, and older careers',()=>{
 const s=C.restore(null,places);assert.equal(C.firstCast(s),true);assert.equal(C.firstCast(s),false);
 assert.equal(C.firstCast(C.restore(JSON.parse(JSON.stringify(s)),places)),false);
 assert.equal(C.firstCast(C.restore({total:1},places)),false);
 assert.equal(C.firstCast(C.restore({firstCastUsed:'true'},places)),true);
});
test('the next goal follows the current catch and unfinished place objectives',()=>{
 const s=C.restore(null,places);assert.equal(C.nextGoal(s,null).action,'cast');
 C.land(s,null,catchEntry,false,'2026-11-11');assert.equal(C.nextGoal(s,null).action,'map');
 C.travel(s,places[0]);assert.match(C.nextGoal(s,places[0]).text,/Rainbow trout/);
 C.land(s,places[0],catchEntry,true,'2026-11-11');assert.equal(C.nextGoal(s,places[0]).action,'map');
});
test('all map pins use the same Equal Earth projection as the offline Natural Earth SVG',()=>{
 const fs=require('node:fs'),{execFileSync}=require('node:child_process');
 const result=JSON.parse(execFileSync('python3',['-c',"import sys,json;sys.path.insert(0,'scripts');from game_career import map_point,PROJECTION;print(json.dumps([{'actual':map_point(*c['point']),'expected':c['xy']} for c in PROJECTION['checks']]))"],{cwd:require('node:path').resolve(__dirname,'..')}));
 for(const check of result)for(let i=0;i<2;i++)assert.ok(Math.abs(check.actual[i]-check.expected[i])<.001);
 const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/play/index.html'),'utf8');
 assert.match(html,/<template id="career-map-art"><svg/);assert.match(html,/class="map-land"/);
 const data=JSON.parse(html.match(/<script id="career-data" type="application\/json">([^<]+)<\/script>/)[1]);
 for(const p of data.places){assert.equal(p.mapPoint.length,2);assert.ok(p.mapPoint[0]>0&&p.mapPoint[0]<960);assert.ok(p.mapPoint[1]>0&&p.mapPoint[1]<500);}
});
