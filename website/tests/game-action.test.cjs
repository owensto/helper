const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../public/assets/game-engine.js'),{Water,castGesture,preference}=require('../public/assets/game-action.js');
function tick(w,seconds,input={},conditions={}){for(let i=0;i<seconds*50;i++)w.step(.02,input,conditions);}
function strike(w){w.cast({x:.55,y:.64});for(let i=0;i<800&&w.phase!=='bite';i++){if(i%25===0)w.twitch();w.step(.02,{},{});}assert.equal(w.phase,'bite');}
function hooked(){const w=new Water('river',G.random(3));strike(w);assert.ok(w.hook());return w;}
test('flick direction, speed, load, and wind change the landing point',()=>{
 const start={x:.5,y:.5},back={x:.5,y:.7};
 const left=castGesture(start,back,{x:.35,y:.4},{x:-.5,y:-.5}),right=castGesture(start,back,{x:.65,y:.4},{x:.5,y:-.5});assert.ok(left.x<right.x);
 const slow=castGesture(start,back,{x:.5,y:.4},{x:0,y:-.4}),fast=castGesture(start,back,{x:.5,y:.4},{x:0,y:-2});assert.ok(fast.y<slow.y);
 assert.ok(castGesture(start,back,{x:.5,y:.4},{x:0,y:-1},.04).x>castGesture(start,back,{x:.5,y:.4},{x:0,y:-1},-.04).x);
});
test('a passive cast cannot catch; twitch and location drive visible fish AI',()=>{
 const w=new Water();w.cast({x:.55,y:.64});let spooked=false;for(let i=0;i<600;i++){w.step(.02);spooked ||= w.fish.some(f=>f.stage==='spooked');}assert.equal(w.phase,'retrieve');assert.ok(spooked);
 const seen=new Set();w.cast({x:.55,y:.64});for(let i=0;i<800&&w.phase!=='bite';i++){if(i%25===0)w.twitch();w.step(.02);for(const f of w.fish)seen.add(f.stage);}assert.equal(w.phase,'bite');for(const stage of ['curious','follow','nip','commit'])assert.ok(seen.has(stage),stage);
});
test('steering changes the lure position and excessive speed scares nearby fish',()=>{
 const w=new Water();w.cast({x:.55,y:.64});tick(w,.8);const x=w.lure.x;w.steer(.85,.64);tick(w,.5);assert.ok(w.lure.x>x);assert.ok(w.fish.some(f=>f.fear>0));
});
test('each species in a water has a distinct retrieve preference',()=>{assert.equal(new Set(G.species.filter(s=>s.water==='lake').map(s=>preference(s).name)).size,5);});
test('the strike must receive a hook set within the bite window',()=>{const w=new Water();assert.equal(w.hook(),false);strike(w);tick(w,1.7);assert.equal(w.phase,'lost');assert.equal(w.hook(),false);});
test('continuous reeling snaps a line; counter-steering eases tension',()=>{
 const a=hooked(),b=hooked();tick(a,1,{held:true,rod:a.run});tick(b,1,{held:true,rod:-b.run});assert.ok(b.tension<a.tension);tick(a,3,{held:true});assert.equal(a.phase,'lost');assert.match(a.reason,/snapped/);
});
test('drag adjustment changes both tension and progress',()=>{const a=hooked(),b=hooked();tick(a,1,{held:true,drag:.2});tick(b,1,{held:true,drag:.8});assert.ok(a.tension<b.tension);assert.ok(a.progress<b.progress);});
test('a bow during a jump reduces tension and adds a combo only once',()=>{const w=hooked();w.nextJump=.01;w.step(.02,{held:true});assert.ok(w.jump>0);const t=w.tension;w.bow();assert.ok(w.tension<t);const c=w.combo;w.bow();assert.equal(w.combo,c);});
test('a controlled fight reaches a net moment and needs an accurate scoop',()=>{
 const w=hooked();let held=true;for(let i=0;i<2000&&w.phase==='fight';i++){if(w.tension>.65)held=false;if(w.tension<.3)held=true;if(w.jump>0)w.bow();w.step(.02,{held,rod:-w.run});}
 assert.equal(w.phase,'net');assert.equal(w.net(.05,.05),false);assert.equal(w.phase,'net');assert.equal(w.net(w.lure.x,w.lure.y),true);assert.equal(w.phase,'landed');
});
test('fish runs into cover can snag; prolonged slack can lose the hook',()=>{
 const w=hooked();w.lure.x=.83;w.runTime=10;tick(w,4,{held:false,rod:1});assert.equal(w.phase,'lost');assert.match(w.reason,/snag/);
 const slack=hooked();tick(slack,5,{held:false});assert.equal(slack.phase,'lost');assert.match(slack.reason,/loose/);
});
test('spots move the boat; seeded simulations are repeatable',()=>{
 const a=new Water('lake',G.random(17)),b=new Water('lake',G.random(17));a.moveSpot(2);tick(a,2);assert.ok(a.boat>.7);assert.equal(b.boat,.5);
 const c=new Water('river',G.random(1)),d=new Water('river',G.random(1));strike(c);strike(d);assert.equal(JSON.stringify(c),JSON.stringify(d));
});
test('species profiles distinguish depth, structure, light, lure and weather',()=>{const trout=preference(G.species.find(s=>s.id==='rainbow-trout')),walleye=preference(G.species.find(s=>s.id==='walleye'));assert.notEqual(trout.depth,walleye.depth);assert.notEqual(trout.structure,walleye.structure);assert.notEqual(trout.light,walleye.light);assert.notEqual(trout.lure,walleye.lure);assert.notEqual(trout.weather,walleye.weather);});

test('the first cast gets a prompt bite at any legal landing point without a twitch',()=>{
 for(const target of [{x:.16,y:.5},{x:.87,y:.82},{x:.55,y:.64}]){
  const w=new Water('river',()=>.5);w.cast(target,{firstCast:true});
  let elapsed=0;while(w.phase!=='bite'&&elapsed<2){w.step(.016,{},{});elapsed+=.016;}
  assert.equal(w.phase,'bite');assert.ok(elapsed<1.15);assert.equal(w.hooked,w.fish[0]);
  for(let i=0;i<100;i++)w.step(.016,{},{});assert.equal(w.phase,'bite','the first hook window remains forgiving');
  assert.ok(w.hook());
 }
});
test('a normal cast still needs lure technique and does not inherit the first-cast aid',()=>{
 const w=new Water('river',()=>.5);w.cast({x:.55,y:.64},{firstCast:true});
 w.cast({x:.55,y:.64});for(let i=0;i<100;i++)w.step(.016,{},{});
 assert.equal(w.firstCast,false);assert.equal(w.phase,'retrieve');
});
